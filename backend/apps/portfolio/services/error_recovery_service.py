"""
Error Recovery and Retry Service
Handles transient failures with retry mechanisms and fallback strategies
Requirements: 4.4, 6.4
"""

import asyncio
import functools
import logging
import random
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import (
    Any,
    Callable,
    Coroutine,
    Dict,
    List,
    Optional,
    Type,
    TypeVar,
    Union,
)

logger = logging.getLogger(__name__)

T = TypeVar('T')


class RetryStrategy(Enum):
    """Retry strategy types"""
    FIXED = 'fixed'           # Fixed delay between retries
    EXPONENTIAL = 'exponential'  # Exponential backoff
    JITTERED = 'jittered'     # Exponential backoff with jitter


class ErrorCategory(Enum):
    """Categories of errors for handling decisions"""
    TRANSIENT = 'transient'       # Temporary, worth retrying
    PERMANENT = 'permanent'       # Won't succeed on retry
    RATE_LIMITED = 'rate_limited' # Rate limited, retry after delay
    UNKNOWN = 'unknown'           # Unknown error type


@dataclass
class RetryConfig:
    """Configuration for retry behavior"""
    max_retries: int = 3
    base_delay_seconds: float = 1.0
    max_delay_seconds: float = 30.0
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL
    jitter_factor: float = 0.1  # 10% jitter
    retryable_exceptions: tuple = (
        ConnectionError,
        TimeoutError,
        asyncio.TimeoutError,
    )


@dataclass
class RetryResult:
    """Result of a retry operation"""
    success: bool
    value: Any = None
    attempts: int = 0
    total_delay_seconds: float = 0.0
    last_error: Optional[Exception] = None
    error_category: ErrorCategory = ErrorCategory.UNKNOWN
    
    def to_dict(self) -> dict:
        return {
            'success': self.success,
            'attempts': self.attempts,
            'total_delay_seconds': self.total_delay_seconds,
            'last_error': str(self.last_error) if self.last_error else None,
            'error_category': self.error_category.value
        }


@dataclass
class FallbackConfig:
    """Configuration for fallback behavior"""
    enable_fallback: bool = True
    fallback_value: Any = None
    fallback_factory: Optional[Callable[[], Any]] = None
    log_fallback: bool = True


class ErrorClassifier:
    """
    Classifies errors into categories for handling decisions.
    """
    
    # Exceptions that are typically transient
    TRANSIENT_EXCEPTIONS = (
        ConnectionError,
        ConnectionResetError,
        ConnectionRefusedError,
        TimeoutError,
        asyncio.TimeoutError,
        BrokenPipeError,
    )
    
    # Error messages that indicate transient issues
    TRANSIENT_MESSAGES = [
        'connection reset',
        'connection refused',
        'timeout',
        'temporarily unavailable',
        'service unavailable',
        'too many connections',
        'network unreachable',
        'host unreachable',
    ]
    
    # Error messages that indicate rate limiting
    RATE_LIMIT_MESSAGES = [
        'rate limit',
        'too many requests',
        'quota exceeded',
        '429',
        'throttl',
    ]
    
    @classmethod
    def classify(cls, error: Exception) -> ErrorCategory:
        """
        Classify an error into a category.
        
        Args:
            error: The exception to classify
            
        Returns:
            ErrorCategory indicating how to handle the error
        """
        # Check exception type
        if isinstance(error, cls.TRANSIENT_EXCEPTIONS):
            return ErrorCategory.TRANSIENT
        
        # Check error message
        error_msg = str(error).lower()
        
        # Check for rate limiting
        for pattern in cls.RATE_LIMIT_MESSAGES:
            if pattern in error_msg:
                return ErrorCategory.RATE_LIMITED
        
        # Check for transient patterns
        for pattern in cls.TRANSIENT_MESSAGES:
            if pattern in error_msg:
                return ErrorCategory.TRANSIENT
        
        # Default to unknown
        return ErrorCategory.UNKNOWN


class RetryHandler:
    """
    Handles retry logic with configurable strategies.
    """
    
    def __init__(self, config: Optional[RetryConfig] = None):
        self.config = config or RetryConfig()
        self.classifier = ErrorClassifier()
    
    def calculate_delay(self, attempt: int) -> float:
        """
        Calculate delay before next retry attempt.
        
        Args:
            attempt: Current attempt number (0-indexed)
            
        Returns:
            Delay in seconds
        """
        if self.config.strategy == RetryStrategy.FIXED:
            delay = self.config.base_delay_seconds
        elif self.config.strategy == RetryStrategy.EXPONENTIAL:
            delay = self.config.base_delay_seconds * (2 ** attempt)
        else:  # JITTERED
            base_delay = self.config.base_delay_seconds * (2 ** attempt)
            jitter = base_delay * self.config.jitter_factor * random.random()
            delay = base_delay + jitter
        
        return min(delay, self.config.max_delay_seconds)
    
    def should_retry(self, error: Exception, attempt: int) -> bool:
        """
        Determine if an operation should be retried.
        
        Args:
            error: The exception that occurred
            attempt: Current attempt number
            
        Returns:
            True if should retry, False otherwise
        """
        # Check max retries
        if attempt >= self.config.max_retries:
            return False
        
        # Check if exception type is retryable
        if isinstance(error, self.config.retryable_exceptions):
            return True
        
        # Check error category
        category = self.classifier.classify(error)
        return category in (ErrorCategory.TRANSIENT, ErrorCategory.RATE_LIMITED)
    
    async def execute_with_retry(
        self,
        operation: Callable[[], Coroutine[Any, Any, T]],
        fallback: Optional[FallbackConfig] = None
    ) -> RetryResult:
        """
        Execute an async operation with retry logic.
        
        Args:
            operation: Async callable to execute
            fallback: Optional fallback configuration
            
        Returns:
            RetryResult with operation outcome
        """
        attempt = 0
        total_delay = 0.0
        last_error = None
        error_category = ErrorCategory.UNKNOWN
        
        while True:
            try:
                result = await operation()
                return RetryResult(
                    success=True,
                    value=result,
                    attempts=attempt + 1,
                    total_delay_seconds=total_delay
                )
            except Exception as e:
                last_error = e
                error_category = self.classifier.classify(e)
                
                logger.warning(
                    f"Operation failed (attempt {attempt + 1}/{self.config.max_retries + 1}): {e}"
                )
                
                if not self.should_retry(e, attempt):
                    break
                
                delay = self.calculate_delay(attempt)
                total_delay += delay
                
                logger.info(f"Retrying in {delay:.2f} seconds...")
                await asyncio.sleep(delay)
                
                attempt += 1
        
        # All retries exhausted, try fallback
        if fallback and fallback.enable_fallback:
            if fallback.log_fallback:
                logger.warning(
                    f"All retries exhausted, using fallback. Last error: {last_error}"
                )
            
            fallback_value = (
                fallback.fallback_factory()
                if fallback.fallback_factory
                else fallback.fallback_value
            )
            
            return RetryResult(
                success=True,  # Fallback is considered success
                value=fallback_value,
                attempts=attempt + 1,
                total_delay_seconds=total_delay,
                last_error=last_error,
                error_category=error_category
            )
        
        return RetryResult(
            success=False,
            attempts=attempt + 1,
            total_delay_seconds=total_delay,
            last_error=last_error,
            error_category=error_category
        )
    
    def execute_sync_with_retry(
        self,
        operation: Callable[[], T],
        fallback: Optional[FallbackConfig] = None
    ) -> RetryResult:
        """
        Execute a sync operation with retry logic.
        
        Args:
            operation: Callable to execute
            fallback: Optional fallback configuration
            
        Returns:
            RetryResult with operation outcome
        """
        attempt = 0
        total_delay = 0.0
        last_error = None
        error_category = ErrorCategory.UNKNOWN
        
        while True:
            try:
                result = operation()
                return RetryResult(
                    success=True,
                    value=result,
                    attempts=attempt + 1,
                    total_delay_seconds=total_delay
                )
            except Exception as e:
                last_error = e
                error_category = self.classifier.classify(e)
                
                logger.warning(
                    f"Operation failed (attempt {attempt + 1}/{self.config.max_retries + 1}): {e}"
                )
                
                if not self.should_retry(e, attempt):
                    break
                
                delay = self.calculate_delay(attempt)
                total_delay += delay
                
                logger.info(f"Retrying in {delay:.2f} seconds...")
                time.sleep(delay)
                
                attempt += 1
        
        # All retries exhausted, try fallback
        if fallback and fallback.enable_fallback:
            if fallback.log_fallback:
                logger.warning(
                    f"All retries exhausted, using fallback. Last error: {last_error}"
                )
            
            fallback_value = (
                fallback.fallback_factory()
                if fallback.fallback_factory
                else fallback.fallback_value
            )
            
            return RetryResult(
                success=True,
                value=fallback_value,
                attempts=attempt + 1,
                total_delay_seconds=total_delay,
                last_error=last_error,
                error_category=error_category
            )
        
        return RetryResult(
            success=False,
            attempts=attempt + 1,
            total_delay_seconds=total_delay,
            last_error=last_error,
            error_category=error_category
        )


def with_retry(
    max_retries: int = 3,
    base_delay: float = 1.0,
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL,
    retryable_exceptions: tuple = (ConnectionError, TimeoutError),
    fallback_value: Any = None
):
    """
    Decorator for adding retry logic to async functions.
    
    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Base delay between retries in seconds
        strategy: Retry strategy to use
        retryable_exceptions: Tuple of exception types to retry
        fallback_value: Value to return if all retries fail
        
    Returns:
        Decorated function with retry logic
    """
    def decorator(func: Callable[..., Coroutine[Any, Any, T]]) -> Callable[..., Coroutine[Any, Any, T]]:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            config = RetryConfig(
                max_retries=max_retries,
                base_delay_seconds=base_delay,
                strategy=strategy,
                retryable_exceptions=retryable_exceptions
            )
            
            fallback = FallbackConfig(
                enable_fallback=fallback_value is not None,
                fallback_value=fallback_value
            ) if fallback_value is not None else None
            
            handler = RetryHandler(config)
            
            async def operation():
                return await func(*args, **kwargs)
            
            result = await handler.execute_with_retry(operation, fallback)
            
            if result.success:
                return result.value
            else:
                raise result.last_error
        
        return wrapper
    return decorator


class ErrorRecoveryService:
    """
    Service for managing error recovery and fallback strategies.
    
    Requirements: 4.4, 6.4
    """
    
    def __init__(self):
        self.retry_handler = RetryHandler()
        self.classifier = ErrorClassifier()
        
        # Configure specialized retry handlers for different operations
        self.ocr_retry_handler = RetryHandler(RetryConfig(
            max_retries=2,
            base_delay_seconds=1.0,
            max_delay_seconds=10.0,
            strategy=RetryStrategy.EXPONENTIAL,
            retryable_exceptions=(ConnectionError, TimeoutError, asyncio.TimeoutError)
        ))
        
        self.ai_retry_handler = RetryHandler(RetryConfig(
            max_retries=3,
            base_delay_seconds=2.0,
            max_delay_seconds=30.0,
            strategy=RetryStrategy.JITTERED,
            retryable_exceptions=(ConnectionError, TimeoutError, asyncio.TimeoutError)
        ))
        
        self.db_retry_handler = RetryHandler(RetryConfig(
            max_retries=2,
            base_delay_seconds=0.5,
            max_delay_seconds=5.0,
            strategy=RetryStrategy.FIXED,
            retryable_exceptions=(ConnectionError,)
        ))
    
    def get_default_fallback_profile(self) -> dict:
        """
        Get default candidate profile for fallback scenarios.
        
        Returns:
            Default candidate profile dictionary
        """
        from ..models import ProfessionalCategory
        import uuid
        
        return {
            'id': str(uuid.uuid4()),
            'name': 'Portfolio User',
            'title': 'Professional',
            'professionalCategory': ProfessionalCategory.HYBRID.value,
            'skills': [
                {'name': 'Communication', 'level': 4, 'category': 'Soft Skills'},
                {'name': 'Problem Solving', 'level': 4, 'category': 'Soft Skills'},
                {'name': 'Teamwork', 'level': 4, 'category': 'Soft Skills'},
            ],
            'experience': [],
            'education': [],
            'projects': [],
            'contact': {},
            'extractedText': '',
            'confidence': 0.3,  # Lower confidence for fallback
            'summary': 'Professional portfolio generated with default settings.',
            'achievements': [
                {'id': '1', 'label': 'Years Experience', 'value': '5+'},
                {'id': '2', 'label': 'Projects', 'value': '10+'},
            ]
        }
    
    def get_default_fallback_components(self) -> list:
        """
        Get default component selection for fallback scenarios.
        
        Returns:
            List of default component configurations
        """
        from ..models import ComponentType
        
        return [
            {
                'type': ComponentType.HERO_PRISM.value,
                'props': {
                    'theme': 'ocean',
                    'title': 'Professional',
                    'name': 'Portfolio User',
                    'subtitle': 'Welcome to my portfolio',
                },
                'order': 0,
                'theme': 'ocean'
            },
            {
                'type': ComponentType.EXP_TIMELINE.value,
                'props': {
                    'experiences': [],
                },
                'order': 1,
                'theme': ''
            },
            {
                'type': ComponentType.SKILLS_RADAR.value,
                'props': {
                    'skills': [
                        {'name': 'Communication', 'level': 4, 'category': 'Soft Skills'},
                        {'name': 'Problem Solving', 'level': 4, 'category': 'Soft Skills'},
                        {'name': 'Teamwork', 'level': 4, 'category': 'Soft Skills'},
                    ],
                },
                'order': 2,
                'theme': ''
            },
            {
                'type': ComponentType.STATS_BENTO.value,
                'props': {
                    'achievements': [
                        {'id': '1', 'label': 'Years Experience', 'value': '5+'},
                        {'id': '2', 'label': 'Projects', 'value': '10+'},
                    ],
                },
                'order': 3,
                'theme': ''
            },
        ]
    
    def get_fallback_components_for_category(self, category: str, profile: dict) -> list:
        """
        Get fallback components tailored to a specific professional category.
        
        Args:
            category: Professional category (creative, technical, corporate, hybrid)
            profile: Partial candidate profile data
            
        Returns:
            List of component configurations
        """
        from ..models import ComponentType, ProfessionalCategory
        
        name = profile.get('name', 'Portfolio User')
        title = profile.get('title', 'Professional')
        skills = profile.get('skills', [
            {'name': 'Communication', 'level': 4, 'category': 'Soft Skills'},
            {'name': 'Problem Solving', 'level': 4, 'category': 'Soft Skills'},
        ])
        experience = profile.get('experience', [])
        achievements = profile.get('achievements', [
            {'id': '1', 'label': 'Years Experience', 'value': '5+'},
            {'id': '2', 'label': 'Projects', 'value': '10+'},
        ])
        
        if category == ProfessionalCategory.CREATIVE.value:
            return [
                {
                    'type': ComponentType.HERO_PRISM.value,
                    'props': {
                        'theme': 'sunset',
                        'title': title,
                        'name': name,
                        'subtitle': profile.get('summary', 'Creative professional'),
                    },
                    'order': 0,
                    'theme': 'sunset'
                },
                {
                    'type': ComponentType.EXP_MASONRY.value,
                    'props': {
                        'experiences': experience,
                        'projects': profile.get('projects', []),
                    },
                    'order': 1,
                    'theme': ''
                },
                {
                    'type': ComponentType.SKILLS_DOTS.value,
                    'props': {
                        'skills': skills,
                        'maxLevel': 5,
                    },
                    'order': 2,
                    'theme': ''
                },
                {
                    'type': ComponentType.STATS_BENTO.value,
                    'props': {
                        'achievements': achievements,
                    },
                    'order': 3,
                    'theme': ''
                },
            ]
        elif category == ProfessionalCategory.TECHNICAL.value:
            return [
                {
                    'type': ComponentType.HERO_TERMINAL.value,
                    'props': {
                        'theme': 'matrix',
                        'commands': [
                            f'whoami -> {name}',
                            f'cat title.txt -> {title}',
                            'ls skills/ -> [loading...]',
                        ],
                        'name': name,
                        'title': title,
                    },
                    'order': 0,
                    'theme': 'matrix'
                },
                {
                    'type': ComponentType.EXP_TIMELINE.value,
                    'props': {
                        'experiences': experience,
                    },
                    'order': 1,
                    'theme': ''
                },
                {
                    'type': ComponentType.SKILLS_RADAR.value,
                    'props': {
                        'skills': skills,
                    },
                    'order': 2,
                    'theme': ''
                },
                {
                    'type': ComponentType.STATS_BENTO.value,
                    'props': {
                        'achievements': achievements,
                    },
                    'order': 3,
                    'theme': ''
                },
            ]
        else:
            # Default/hybrid/corporate
            return [
                {
                    'type': ComponentType.HERO_PRISM.value,
                    'props': {
                        'theme': 'ocean',
                        'title': title,
                        'name': name,
                        'subtitle': profile.get('summary', 'Welcome to my portfolio'),
                    },
                    'order': 0,
                    'theme': 'ocean'
                },
                {
                    'type': ComponentType.EXP_TIMELINE.value,
                    'props': {
                        'experiences': experience,
                    },
                    'order': 1,
                    'theme': ''
                },
                {
                    'type': ComponentType.SKILLS_RADAR.value,
                    'props': {
                        'skills': skills,
                    },
                    'order': 2,
                    'theme': ''
                },
                {
                    'type': ComponentType.STATS_BENTO.value,
                    'props': {
                        'achievements': achievements,
                    },
                    'order': 3,
                    'theme': ''
                },
            ]
    
    def get_fallback_theme(self, category: str) -> str:
        """
        Get fallback theme for a professional category.
        
        Args:
            category: Professional category
            
        Returns:
            Theme palette name
        """
        from ..models import ThemePalette, ProfessionalCategory
        
        theme_map = {
            ProfessionalCategory.CREATIVE.value: ThemePalette.CYBER_PINK.value,
            ProfessionalCategory.TECHNICAL.value: ThemePalette.NEON_BLUE.value,
            ProfessionalCategory.CORPORATE.value: ThemePalette.EMERALD_GREEN.value,
            ProfessionalCategory.HYBRID.value: ThemePalette.NEON_BLUE.value,
        }
        
        return theme_map.get(category, ThemePalette.NEON_BLUE.value)
    
    async def execute_with_fallback(
        self,
        operation: Callable[[], Coroutine[Any, Any, T]],
        fallback_factory: Callable[[], T],
        operation_name: str = 'operation'
    ) -> T:
        """
        Execute an operation with automatic fallback on failure.
        
        Args:
            operation: Async operation to execute
            fallback_factory: Factory function to create fallback value
            operation_name: Name for logging purposes
            
        Returns:
            Operation result or fallback value
        """
        fallback_config = FallbackConfig(
            enable_fallback=True,
            fallback_factory=fallback_factory,
            log_fallback=True
        )
        
        result = await self.retry_handler.execute_with_retry(
            operation,
            fallback_config
        )
        
        if not result.success and result.last_error:
            logger.error(
                f"{operation_name} failed after {result.attempts} attempts: {result.last_error}"
            )
        
        return result.value
    
    async def execute_ocr_with_fallback(
        self,
        operation: Callable[[], Coroutine[Any, Any, T]],
        fallback_value: T,
        operation_name: str = 'OCR'
    ) -> T:
        """
        Execute OCR operation with specialized retry and fallback.
        
        Args:
            operation: Async OCR operation
            fallback_value: Value to return on failure
            operation_name: Name for logging
            
        Returns:
            OCR result or fallback value
        """
        fallback_config = FallbackConfig(
            enable_fallback=True,
            fallback_value=fallback_value,
            log_fallback=True
        )
        
        result = await self.ocr_retry_handler.execute_with_retry(
            operation,
            fallback_config
        )
        
        if result.last_error:
            logger.warning(
                f"{operation_name} completed with fallback after {result.attempts} attempts"
            )
        
        return result.value
    
    async def execute_ai_with_fallback(
        self,
        operation: Callable[[], Coroutine[Any, Any, T]],
        fallback_factory: Callable[[], T],
        operation_name: str = 'AI Analysis'
    ) -> T:
        """
        Execute AI operation with specialized retry and fallback.
        
        Args:
            operation: Async AI operation
            fallback_factory: Factory for fallback value
            operation_name: Name for logging
            
        Returns:
            AI result or fallback value
        """
        fallback_config = FallbackConfig(
            enable_fallback=True,
            fallback_factory=fallback_factory,
            log_fallback=True
        )
        
        result = await self.ai_retry_handler.execute_with_retry(
            operation,
            fallback_config
        )
        
        if result.last_error:
            logger.warning(
                f"{operation_name} completed with fallback after {result.attempts} attempts"
            )
        
        return result.value
    
    def classify_error(self, error: Exception) -> ErrorCategory:
        """
        Classify an error for handling decisions.
        
        Args:
            error: Exception to classify
            
        Returns:
            ErrorCategory
        """
        return self.classifier.classify(error)
    
    def should_use_fallback(self, error: Exception) -> bool:
        """
        Determine if fallback should be used for an error.
        
        Args:
            error: Exception that occurred
            
        Returns:
            True if fallback should be used
        """
        category = self.classify_error(error)
        # Use fallback for permanent errors or after retries exhausted
        return category == ErrorCategory.PERMANENT or category == ErrorCategory.UNKNOWN
    
    def create_error_response(
        self,
        error: Exception,
        operation_name: str,
        include_details: bool = False
    ) -> dict:
        """
        Create a standardized error response.
        
        Args:
            error: The exception that occurred
            operation_name: Name of the failed operation
            include_details: Whether to include detailed error info
            
        Returns:
            Error response dictionary
        """
        category = self.classify_error(error)
        
        # Map error categories to user-friendly messages
        category_messages = {
            ErrorCategory.TRANSIENT: 'A temporary error occurred. Please try again.',
            ErrorCategory.PERMANENT: 'Unable to process your request.',
            ErrorCategory.RATE_LIMITED: 'Too many requests. Please wait and try again.',
            ErrorCategory.UNKNOWN: 'An unexpected error occurred.',
        }
        
        response = {
            'success': False,
            'error': {
                'message': category_messages.get(category, 'An error occurred.'),
                'code': category.value.upper(),
                'operation': operation_name,
            }
        }
        
        if include_details:
            response['error']['details'] = {
                'type': type(error).__name__,
                'message': str(error),
            }
        
        return response


# Global instance
_error_recovery_service: Optional[ErrorRecoveryService] = None


def get_error_recovery_service() -> ErrorRecoveryService:
    """Get or create the global error recovery service instance"""
    global _error_recovery_service
    if _error_recovery_service is None:
        _error_recovery_service = ErrorRecoveryService()
    return _error_recovery_service
