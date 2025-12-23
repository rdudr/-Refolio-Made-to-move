"""
Input Sanitization Service
Handles input validation, sanitization, and abuse prevention
Requirements: 6.4
"""

import hashlib
import logging
import re
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from threading import Lock
from typing import Optional, Dict, Any, List, Tuple

logger = logging.getLogger(__name__)


# Content validation constants
MAX_CONTENT_SIZE = 10 * 1024 * 1024  # 10MB
MIN_CONTENT_SIZE = 100  # 100 bytes minimum
ALLOWED_MIME_TYPES = {
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
}
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}


class SanitizationError(Enum):
    """Enumeration of sanitization errors"""
    NONE = 'none'
    RATE_LIMITED = 'rate_limited'
    SUSPICIOUS_CONTENT = 'suspicious_content'
    INVALID_CHARACTERS = 'invalid_characters'
    CONTENT_TOO_LONG = 'content_too_long'
    CONTENT_TOO_SHORT = 'content_too_short'
    MALICIOUS_PATTERN = 'malicious_pattern'
    INVALID_MIME_TYPE = 'invalid_mime_type'
    INVALID_EXTENSION = 'invalid_extension'
    DUPLICATE_SUBMISSION = 'duplicate_submission'


@dataclass
class SanitizationResult:
    """Result of input sanitization"""
    is_safe: bool
    error: SanitizationError
    error_message: str
    sanitized_value: Optional[str] = None
    warnings: list = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            'is_safe': self.is_safe,
            'error': self.error.value,
            'error_message': self.error_message,
            'sanitized_value': self.sanitized_value,
            'warnings': self.warnings
        }


@dataclass
class RateLimitResult:
    """Result of rate limit check"""
    allowed: bool
    remaining_requests: int
    reset_time: datetime
    retry_after_seconds: int = 0
    
    def to_dict(self) -> dict:
        return {
            'allowed': self.allowed,
            'remaining_requests': self.remaining_requests,
            'reset_time': self.reset_time.isoformat() + 'Z',
            'retry_after_seconds': self.retry_after_seconds
        }


@dataclass
class ContentValidationResult:
    """Result of content validation before processing"""
    is_valid: bool
    error: SanitizationError
    error_message: str
    content_hash: str = ''
    content_size: int = 0
    detected_type: str = ''
    warnings: list = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            'is_valid': self.is_valid,
            'error': self.error.value,
            'error_message': self.error_message,
            'content_hash': self.content_hash,
            'content_size': self.content_size,
            'detected_type': self.detected_type,
            'warnings': self.warnings
        }


class RateLimiter:
    """
    Simple in-memory rate limiter using sliding window algorithm.
    
    For production, consider using Redis-based rate limiting.
    """
    
    def __init__(
        self,
        max_requests: int = 10,
        window_seconds: int = 60,
        burst_limit: int = 5,
        burst_window_seconds: int = 10
    ):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.burst_limit = burst_limit
        self.burst_window_seconds = burst_window_seconds
        self._requests: Dict[str, list] = defaultdict(list)
        self._blocked_until: Dict[str, float] = {}
        self._lock = Lock()
    
    def check(self, identifier: str) -> RateLimitResult:
        """
        Check if request is allowed for the given identifier.
        
        Args:
            identifier: Unique identifier (IP address, user ID, etc.)
            
        Returns:
            RateLimitResult with allowed status and metadata
        """
        now = time.time()
        window_start = now - self.window_seconds
        burst_window_start = now - self.burst_window_seconds
        
        with self._lock:
            # Check if identifier is temporarily blocked
            if identifier in self._blocked_until:
                if now < self._blocked_until[identifier]:
                    retry_after = int(self._blocked_until[identifier] - now) + 1
                    return RateLimitResult(
                        allowed=False,
                        remaining_requests=0,
                        reset_time=datetime.utcnow() + timedelta(seconds=retry_after),
                        retry_after_seconds=retry_after
                    )
                else:
                    del self._blocked_until[identifier]
            
            # Clean old requests outside the window
            self._requests[identifier] = [
                ts for ts in self._requests[identifier]
                if ts > window_start
            ]
            
            current_count = len(self._requests[identifier])
            remaining = max(0, self.max_requests - current_count)
            reset_time = datetime.utcnow() + timedelta(seconds=self.window_seconds)
            
            # Check burst limit (requests in short window)
            burst_count = len([
                ts for ts in self._requests[identifier]
                if ts > burst_window_start
            ])
            
            if burst_count >= self.burst_limit:
                # Temporarily block for burst violation
                self._blocked_until[identifier] = now + self.burst_window_seconds
                return RateLimitResult(
                    allowed=False,
                    remaining_requests=0,
                    reset_time=datetime.utcnow() + timedelta(seconds=self.burst_window_seconds),
                    retry_after_seconds=self.burst_window_seconds
                )
            
            if current_count >= self.max_requests:
                # Calculate retry after
                oldest_request = min(self._requests[identifier]) if self._requests[identifier] else now
                retry_after = int(oldest_request + self.window_seconds - now) + 1
                
                return RateLimitResult(
                    allowed=False,
                    remaining_requests=0,
                    reset_time=reset_time,
                    retry_after_seconds=max(1, retry_after)
                )
            
            # Record this request
            self._requests[identifier].append(now)
            
            return RateLimitResult(
                allowed=True,
                remaining_requests=remaining - 1,
                reset_time=reset_time,
                retry_after_seconds=0
            )
    
    def block(self, identifier: str, duration_seconds: int = 300):
        """
        Temporarily block an identifier.
        
        Args:
            identifier: Identifier to block
            duration_seconds: How long to block (default 5 minutes)
        """
        with self._lock:
            self._blocked_until[identifier] = time.time() + duration_seconds
    
    def is_blocked(self, identifier: str) -> bool:
        """Check if an identifier is currently blocked"""
        with self._lock:
            if identifier in self._blocked_until:
                if time.time() < self._blocked_until[identifier]:
                    return True
                else:
                    del self._blocked_until[identifier]
            return False
    
    def reset(self, identifier: str):
        """Reset rate limit for an identifier"""
        with self._lock:
            self._requests.pop(identifier, None)
            self._blocked_until.pop(identifier, None)
    
    def clear_all(self):
        """Clear all rate limit data"""
        with self._lock:
            self._requests.clear()
            self._blocked_until.clear()


class InputSanitizationService:
    """
    Service for sanitizing and validating user inputs.
    
    Provides:
    - Text sanitization (remove dangerous characters/patterns)
    - Filename sanitization
    - Options validation
    - Rate limiting
    - Content validation
    - Duplicate detection
    
    Requirements: 6.4
    """
    
    # Maximum lengths for various inputs
    MAX_FILENAME_LENGTH = 255
    MAX_TEXT_LENGTH = 100000  # 100KB of text
    MAX_OPTION_VALUE_LENGTH = 100
    
    # File size limits
    MAX_FILE_SIZE = MAX_CONTENT_SIZE
    MIN_FILE_SIZE = MIN_CONTENT_SIZE
    
    # Patterns that might indicate malicious content
    SUSPICIOUS_PATTERNS = [
        r'<script[^>]*>',  # Script tags
        r'javascript:',    # JavaScript URLs
        r'on\w+\s*=',      # Event handlers
        r'data:text/html', # Data URLs with HTML
        r'vbscript:',      # VBScript URLs
        r'expression\s*\(', # CSS expressions
        r'eval\s*\(',      # Eval calls
        r'document\.',     # Document access
        r'window\.',       # Window access
    ]
    
    # Characters to strip from filenames
    UNSAFE_FILENAME_CHARS = r'[<>:"/\\|?*\x00-\x1f]'
    
    # Valid theme values
    VALID_THEMES = {'auto', 'neon_blue', 'emerald_green', 'cyber_pink'}
    
    # Valid component styles
    VALID_COMPONENT_STYLES = {'modern', 'classic', 'minimal'}
    
    # File signatures for type detection
    FILE_SIGNATURES = {
        b'%PDF': 'pdf',
        b'\x89PNG': 'png',
        b'\xff\xd8\xff': 'jpg',
    }
    
    def __init__(self):
        # Rate limiter: 10 requests per minute per IP, with burst limit of 5 in 10 seconds
        self.rate_limiter = RateLimiter(
            max_requests=10,
            window_seconds=60,
            burst_limit=5,
            burst_window_seconds=10
        )
        
        # Compile suspicious patterns for efficiency
        self._suspicious_regex = re.compile(
            '|'.join(self.SUSPICIOUS_PATTERNS),
            re.IGNORECASE
        )
        
        # Recent content hashes for duplicate detection (in-memory, for production use Redis)
        self._recent_hashes: Dict[str, Dict[str, float]] = defaultdict(dict)
        self._hash_lock = Lock()
        self._hash_window_seconds = 300  # 5 minutes
    
    def check_rate_limit(self, identifier: str) -> RateLimitResult:
        """
        Check rate limit for the given identifier.
        
        Args:
            identifier: Unique identifier (typically IP address)
            
        Returns:
            RateLimitResult with allowed status
        """
        return self.rate_limiter.check(identifier)
    
    def block_identifier(self, identifier: str, duration_seconds: int = 300):
        """
        Temporarily block an identifier for abuse prevention.
        
        Args:
            identifier: Identifier to block
            duration_seconds: Block duration (default 5 minutes)
        """
        self.rate_limiter.block(identifier, duration_seconds)
        logger.warning(f"Blocked identifier {identifier[:20]}... for {duration_seconds} seconds")
    
    def validate_content(
        self,
        content: bytes,
        filename: str,
        declared_content_type: Optional[str] = None,
        identifier: Optional[str] = None
    ) -> ContentValidationResult:
        """
        Comprehensive content validation before processing.
        
        Validates:
        - Content size (min/max)
        - File extension
        - Content type detection
        - Duplicate detection
        
        Args:
            content: File content bytes
            filename: Original filename
            declared_content_type: MIME type declared by client
            identifier: Client identifier for duplicate detection
            
        Returns:
            ContentValidationResult with validation status
        """
        warnings = []
        
        # Check content size
        if not content:
            return ContentValidationResult(
                is_valid=False,
                error=SanitizationError.CONTENT_TOO_SHORT,
                error_message='File content is empty'
            )
        
        content_size = len(content)
        
        if content_size < self.MIN_FILE_SIZE:
            return ContentValidationResult(
                is_valid=False,
                error=SanitizationError.CONTENT_TOO_SHORT,
                error_message=f'File is too small ({content_size} bytes). Minimum size is {self.MIN_FILE_SIZE} bytes',
                content_size=content_size
            )
        
        if content_size > self.MAX_FILE_SIZE:
            return ContentValidationResult(
                is_valid=False,
                error=SanitizationError.CONTENT_TOO_LONG,
                error_message=f'File exceeds maximum size of {self.MAX_FILE_SIZE // (1024*1024)}MB',
                content_size=content_size
            )
        
        # Validate filename and extension
        filename_result = self.sanitize_filename(filename)
        if not filename_result.is_safe:
            return ContentValidationResult(
                is_valid=False,
                error=filename_result.error,
                error_message=filename_result.error_message,
                content_size=content_size
            )
        
        sanitized_filename = filename_result.sanitized_value
        extension = self._get_extension(sanitized_filename)
        
        if extension not in ALLOWED_EXTENSIONS:
            return ContentValidationResult(
                is_valid=False,
                error=SanitizationError.INVALID_EXTENSION,
                error_message=f'Unsupported file extension: .{extension}. Allowed: {", ".join(ALLOWED_EXTENSIONS)}',
                content_size=content_size
            )
        
        # Detect actual content type from magic bytes
        detected_type = self._detect_content_type(content)
        
        if detected_type and detected_type != extension:
            # Allow jpg/jpeg mismatch
            if not (detected_type in ('jpg', 'jpeg') and extension in ('jpg', 'jpeg')):
                warnings.append(f'File content type ({detected_type}) differs from extension ({extension})')
        
        # Validate declared MIME type if provided
        if declared_content_type:
            if declared_content_type not in ALLOWED_MIME_TYPES:
                warnings.append(f'Declared MIME type {declared_content_type} is not in allowed list')
        
        # Compute content hash
        content_hash = self.compute_content_hash(content)
        
        # Check for duplicate submission
        if identifier:
            is_duplicate = self._check_duplicate(content_hash, identifier)
            if is_duplicate:
                return ContentValidationResult(
                    is_valid=False,
                    error=SanitizationError.DUPLICATE_SUBMISSION,
                    error_message='This file was recently submitted. Please wait before resubmitting.',
                    content_hash=content_hash,
                    content_size=content_size,
                    detected_type=detected_type or extension
                )
            # Record this submission
            self._record_submission(content_hash, identifier)
        
        return ContentValidationResult(
            is_valid=True,
            error=SanitizationError.NONE,
            error_message='',
            content_hash=content_hash,
            content_size=content_size,
            detected_type=detected_type or extension,
            warnings=warnings
        )
    
    def _get_extension(self, filename: str) -> str:
        """Extract file extension from filename"""
        if '.' not in filename:
            return ''
        return filename.rsplit('.', 1)[-1].lower()
    
    def _detect_content_type(self, content: bytes) -> Optional[str]:
        """Detect file type from magic bytes"""
        for signature, file_type in self.FILE_SIGNATURES.items():
            if content.startswith(signature):
                return file_type
        return None
    
    def _check_duplicate(self, content_hash: str, identifier: str) -> bool:
        """Check if content was recently submitted by this identifier"""
        now = time.time()
        window_start = now - self._hash_window_seconds
        
        with self._hash_lock:
            # Clean old entries
            if identifier in self._recent_hashes:
                self._recent_hashes[identifier] = {
                    h: ts for h, ts in self._recent_hashes[identifier].items()
                    if ts > window_start
                }
            
            # Check for duplicate
            return content_hash in self._recent_hashes.get(identifier, {})
    
    def _record_submission(self, content_hash: str, identifier: str):
        """Record a submission for duplicate detection"""
        with self._hash_lock:
            self._recent_hashes[identifier][content_hash] = time.time()
    
    def check_rate_limit(self, identifier: str) -> RateLimitResult:
        """
        Check rate limit for the given identifier.
        
        Args:
            identifier: Unique identifier (typically IP address)
            
        Returns:
            RateLimitResult with allowed status
        """
        return self.rate_limiter.check(identifier)
    
    def sanitize_filename(self, filename: str) -> SanitizationResult:
        """
        Sanitize a filename to prevent path traversal and other attacks.
        
        Args:
            filename: Original filename
            
        Returns:
            SanitizationResult with sanitized filename
        """
        warnings = []
        
        if not filename:
            return SanitizationResult(
                is_safe=False,
                error=SanitizationError.INVALID_CHARACTERS,
                error_message='Filename is required'
            )
        
        # Strip whitespace
        sanitized = filename.strip()
        
        # Check length
        if len(sanitized) > self.MAX_FILENAME_LENGTH:
            return SanitizationResult(
                is_safe=False,
                error=SanitizationError.CONTENT_TOO_LONG,
                error_message=f'Filename exceeds maximum length of {self.MAX_FILENAME_LENGTH} characters'
            )
        
        # Remove path components (prevent path traversal)
        original_sanitized = sanitized
        sanitized = sanitized.replace('..', '')
        sanitized = sanitized.split('/')[-1]
        sanitized = sanitized.split('\\')[-1]
        
        if sanitized != original_sanitized:
            warnings.append('Path components were removed from filename')
        
        # Remove unsafe characters
        original_sanitized = sanitized
        sanitized = re.sub(self.UNSAFE_FILENAME_CHARS, '_', sanitized)
        
        if sanitized != original_sanitized:
            warnings.append('Unsafe characters were replaced in filename')
        
        # Ensure filename is not empty after sanitization
        if not sanitized or sanitized == '.':
            return SanitizationResult(
                is_safe=False,
                error=SanitizationError.INVALID_CHARACTERS,
                error_message='Filename contains only invalid characters'
            )
        
        # Check for hidden files (starting with .)
        if sanitized.startswith('.'):
            sanitized = '_' + sanitized[1:]
            warnings.append('Leading dot was replaced to prevent hidden file')
        
        return SanitizationResult(
            is_safe=True,
            error=SanitizationError.NONE,
            error_message='',
            sanitized_value=sanitized,
            warnings=warnings
        )
    
    def sanitize_text(self, text: str) -> SanitizationResult:
        """
        Sanitize text content to remove potentially dangerous patterns.
        
        Args:
            text: Text to sanitize
            
        Returns:
            SanitizationResult with sanitized text
        """
        warnings = []
        
        if text is None:
            return SanitizationResult(
                is_safe=True,
                error=SanitizationError.NONE,
                error_message='',
                sanitized_value=''
            )
        
        # Check length
        if len(text) > self.MAX_TEXT_LENGTH:
            return SanitizationResult(
                is_safe=False,
                error=SanitizationError.CONTENT_TOO_LONG,
                error_message=f'Text exceeds maximum length of {self.MAX_TEXT_LENGTH} characters'
            )
        
        # Check for suspicious patterns
        matches = self._suspicious_regex.findall(text)
        if matches:
            warnings.append(f'Suspicious patterns detected and will be removed: {len(matches)} occurrences')
        
        # Remove suspicious patterns
        sanitized = self._suspicious_regex.sub('', text)
        
        # Remove null bytes
        if '\x00' in sanitized:
            sanitized = sanitized.replace('\x00', '')
            warnings.append('Null bytes were removed')
        
        return SanitizationResult(
            is_safe=True,
            error=SanitizationError.NONE,
            error_message='',
            sanitized_value=sanitized,
            warnings=warnings
        )
    
    def validate_options(self, options: Dict[str, Any]) -> SanitizationResult:
        """
        Validate and sanitize processing options.
        
        Args:
            options: Dictionary of processing options
            
        Returns:
            SanitizationResult with validated options
        """
        warnings = []
        sanitized_options = {}
        
        if not isinstance(options, dict):
            return SanitizationResult(
                is_safe=False,
                error=SanitizationError.INVALID_CHARACTERS,
                error_message='Options must be a dictionary'
            )
        
        # Validate theme_preference
        theme_pref = options.get('theme_preference', 'auto')
        if isinstance(theme_pref, str):
            theme_pref = theme_pref.lower().strip()
            if theme_pref not in self.VALID_THEMES:
                warnings.append(f'Invalid theme_preference "{theme_pref}", defaulting to "auto"')
                theme_pref = 'auto'
            sanitized_options['theme_preference'] = theme_pref
        else:
            warnings.append('theme_preference must be a string, defaulting to "auto"')
            sanitized_options['theme_preference'] = 'auto'
        
        # Validate component_style
        comp_style = options.get('component_style', 'modern')
        if isinstance(comp_style, str):
            comp_style = comp_style.lower().strip()
            if comp_style not in self.VALID_COMPONENT_STYLES:
                warnings.append(f'Invalid component_style "{comp_style}", defaulting to "modern"')
                comp_style = 'modern'
            sanitized_options['component_style'] = comp_style
        else:
            warnings.append('component_style must be a string, defaulting to "modern"')
            sanitized_options['component_style'] = 'modern'
        
        return SanitizationResult(
            is_safe=True,
            error=SanitizationError.NONE,
            error_message='',
            sanitized_value=sanitized_options,
            warnings=warnings
        )
    
    def compute_content_hash(self, content: bytes) -> str:
        """
        Compute a hash of file content for deduplication/caching.
        
        Args:
            content: File content bytes
            
        Returns:
            SHA-256 hash of content
        """
        return hashlib.sha256(content).hexdigest()
    
    def detect_duplicate_submission(
        self,
        content_hash: str,
        identifier: str,
        window_seconds: int = 300
    ) -> bool:
        """
        Detect if the same content was submitted recently.
        
        Args:
            content_hash: Hash of the content
            identifier: User/IP identifier
            window_seconds: Time window to check for duplicates
            
        Returns:
            True if duplicate detected, False otherwise
        """
        return self._check_duplicate(content_hash, identifier)
    
    def get_client_identifier(self, request) -> str:
        """
        Extract client identifier from request for rate limiting.
        
        Uses X-Forwarded-For header if behind proxy, otherwise REMOTE_ADDR.
        
        Args:
            request: Django request object
            
        Returns:
            Client identifier string
        """
        # Check for proxy headers
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            # Take the first IP in the chain (original client)
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', 'unknown')
        
        return ip
    
    def validate_request_headers(self, request) -> Tuple[bool, str]:
        """
        Validate request headers for suspicious patterns.
        
        Args:
            request: Django request object
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check Content-Type for file uploads
        content_type = request.content_type
        if content_type and 'multipart/form-data' not in content_type:
            if request.method == 'POST' and request.FILES:
                return False, 'Invalid Content-Type for file upload'
        
        # Check for suspicious User-Agent patterns
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        suspicious_agents = ['sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab']
        for agent in suspicious_agents:
            if agent.lower() in user_agent.lower():
                return False, 'Suspicious User-Agent detected'
        
        return True, ''


# Global instance for convenience
_sanitization_service: Optional[InputSanitizationService] = None


def get_sanitization_service() -> InputSanitizationService:
    """Get or create the global sanitization service instance"""
    global _sanitization_service
    if _sanitization_service is None:
        _sanitization_service = InputSanitizationService()
    return _sanitization_service
