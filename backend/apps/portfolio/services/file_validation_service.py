"""
File Upload and Validation Service
Handles file type validation, size limits, and corruption detection
Requirements: 6.1, 6.2, 6.4
"""

import io
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Optional, BinaryIO

from PIL import Image

logger = logging.getLogger(__name__)


class FileValidationError(Enum):
    """Enumeration of possible file validation errors"""
    NONE = 'none'
    EMPTY_FILE = 'empty_file'
    FILE_TOO_LARGE = 'file_too_large'
    UNSUPPORTED_FORMAT = 'unsupported_format'
    CORRUPTED_FILE = 'corrupted_file'
    INVALID_PDF = 'invalid_pdf'
    INVALID_IMAGE = 'invalid_image'
    MISSING_FILENAME = 'missing_filename'


@dataclass
class FileValidationResult:
    """Result of file validation"""
    is_valid: bool
    error: FileValidationError
    error_message: str
    file_type: str
    file_size: int
    detected_mime_type: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            'is_valid': self.is_valid,
            'error': self.error.value,
            'error_message': self.error_message,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'detected_mime_type': self.detected_mime_type
        }


class FileValidationService:
    """
    Service for validating uploaded resume files
    
    Validates:
    - File type (PDF, PNG, JPG, JPEG)
    - File size (max 10MB)
    - File integrity (not corrupted)
    
    Requirements: 6.1, 6.2, 6.4
    """
    
    # Supported file formats
    SUPPORTED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}
    SUPPORTED_MIME_TYPES = {
        'application/pdf': 'pdf',
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
    }
    
    # File size limits
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes
    MIN_FILE_SIZE = 100  # Minimum 100 bytes to be a valid file
    
    # Magic bytes for file type detection
    FILE_SIGNATURES = {
        b'%PDF': 'pdf',
        b'\x89PNG': 'png',
        b'\xff\xd8\xff': 'jpg',
    }

    def validate_file(
        self,
        content: bytes,
        filename: str,
        declared_content_type: Optional[str] = None
    ) -> FileValidationResult:
        """
        Validate an uploaded file
        
        Args:
            content: File content as bytes
            filename: Original filename
            declared_content_type: MIME type declared by the client (optional)
            
        Returns:
            FileValidationResult with validation status and details
        """
        # Check for missing filename
        if not filename or not filename.strip():
            return FileValidationResult(
                is_valid=False,
                error=FileValidationError.MISSING_FILENAME,
                error_message='Filename is required',
                file_type='',
                file_size=len(content) if content else 0
            )
        
        # Check for empty file
        if not content or len(content) == 0:
            return FileValidationResult(
                is_valid=False,
                error=FileValidationError.EMPTY_FILE,
                error_message='File is empty',
                file_type='',
                file_size=0
            )
        
        file_size = len(content)
        
        # Check minimum file size
        if file_size < self.MIN_FILE_SIZE:
            return FileValidationResult(
                is_valid=False,
                error=FileValidationError.EMPTY_FILE,
                error_message=f'File is too small ({file_size} bytes). Minimum size is {self.MIN_FILE_SIZE} bytes',
                file_type='',
                file_size=file_size
            )
        
        # Check maximum file size
        if file_size > self.MAX_FILE_SIZE:
            return FileValidationResult(
                is_valid=False,
                error=FileValidationError.FILE_TOO_LARGE,
                error_message=f'File exceeds maximum size of 10MB. Current size: {self._format_size(file_size)}',
                file_type='',
                file_size=file_size
            )
        
        # Extract file extension
        file_extension = self._get_file_extension(filename)
        
        # Check if extension is supported
        if file_extension not in self.SUPPORTED_EXTENSIONS:
            return FileValidationResult(
                is_valid=False,
                error=FileValidationError.UNSUPPORTED_FORMAT,
                error_message=f'Unsupported file format: .{file_extension}. Supported formats: PDF, PNG, JPG, JPEG',
                file_type=file_extension,
                file_size=file_size
            )
        
        # Detect actual file type from content
        detected_type = self._detect_file_type(content)
        
        # Verify file type matches extension
        if detected_type and detected_type != file_extension:
            # Allow jpg/jpeg mismatch
            if not (detected_type in ('jpg', 'jpeg') and file_extension in ('jpg', 'jpeg')):
                return FileValidationResult(
                    is_valid=False,
                    error=FileValidationError.CORRUPTED_FILE,
                    error_message=f'File content does not match extension. Expected {file_extension}, detected {detected_type}',
                    file_type=file_extension,
                    file_size=file_size,
                    detected_mime_type=detected_type
                )
        
        # Validate file integrity based on type
        if file_extension == 'pdf':
            integrity_result = self._validate_pdf_integrity(content)
        else:
            integrity_result = self._validate_image_integrity(content)
        
        if not integrity_result['is_valid']:
            return FileValidationResult(
                is_valid=False,
                error=integrity_result['error'],
                error_message=integrity_result['message'],
                file_type=file_extension,
                file_size=file_size
            )
        
        # All validations passed
        return FileValidationResult(
            is_valid=True,
            error=FileValidationError.NONE,
            error_message='',
            file_type=file_extension,
            file_size=file_size,
            detected_mime_type=detected_type
        )

    def validate_file_stream(
        self,
        file_stream: BinaryIO,
        filename: str,
        declared_content_type: Optional[str] = None
    ) -> FileValidationResult:
        """
        Validate a file from a stream (e.g., Django UploadedFile)
        
        Args:
            file_stream: File-like object with read() method
            filename: Original filename
            declared_content_type: MIME type declared by the client (optional)
            
        Returns:
            FileValidationResult with validation status and details
        """
        try:
            # Read content from stream
            file_stream.seek(0)
            content = file_stream.read()
            file_stream.seek(0)  # Reset for later use
            
            return self.validate_file(content, filename, declared_content_type)
        except Exception as e:
            logger.exception(f'Error reading file stream: {e}')
            return FileValidationResult(
                is_valid=False,
                error=FileValidationError.CORRUPTED_FILE,
                error_message=f'Error reading file: {str(e)}',
                file_type='',
                file_size=0
            )
    
    def _get_file_extension(self, filename: str) -> str:
        """Extract and normalize file extension from filename"""
        if '.' not in filename:
            return ''
        extension = filename.rsplit('.', 1)[-1].lower()
        return extension
    
    def _detect_file_type(self, content: bytes) -> Optional[str]:
        """Detect file type from magic bytes"""
        for signature, file_type in self.FILE_SIGNATURES.items():
            if content.startswith(signature):
                return file_type
        return None
    
    def _format_size(self, size_bytes: int) -> str:
        """Format file size for human-readable display"""
        if size_bytes < 1024:
            return f'{size_bytes} bytes'
        elif size_bytes < 1024 * 1024:
            return f'{size_bytes / 1024:.1f} KB'
        else:
            return f'{size_bytes / (1024 * 1024):.1f} MB'
    
    def _validate_pdf_integrity(self, content: bytes) -> dict:
        """
        Validate PDF file integrity
        
        Checks:
        - PDF header signature
        - Basic PDF structure markers
        """
        try:
            # Check PDF header
            if not content.startswith(b'%PDF'):
                return {
                    'is_valid': False,
                    'error': FileValidationError.INVALID_PDF,
                    'message': 'Invalid PDF: Missing PDF header signature'
                }
            
            # Check for PDF EOF marker (should contain %%EOF somewhere)
            if b'%%EOF' not in content:
                return {
                    'is_valid': False,
                    'error': FileValidationError.INVALID_PDF,
                    'message': 'Invalid PDF: Missing EOF marker. File may be truncated or corrupted'
                }
            
            # Check for basic PDF structure elements
            has_obj = b'obj' in content
            has_endobj = b'endobj' in content
            
            if not (has_obj and has_endobj):
                return {
                    'is_valid': False,
                    'error': FileValidationError.INVALID_PDF,
                    'message': 'Invalid PDF: Missing required PDF structure elements'
                }
            
            return {'is_valid': True, 'error': None, 'message': ''}
            
        except Exception as e:
            logger.exception(f'PDF validation error: {e}')
            return {
                'is_valid': False,
                'error': FileValidationError.CORRUPTED_FILE,
                'message': f'Error validating PDF: {str(e)}'
            }

    def _validate_image_integrity(self, content: bytes) -> dict:
        """
        Validate image file integrity using PIL
        
        Checks:
        - Image can be opened and parsed
        - Image has valid dimensions
        - Image format matches expected type
        """
        try:
            # Try to open and verify the image
            image = Image.open(io.BytesIO(content))
            
            # Verify the image (loads and validates)
            image.verify()
            
            # Re-open after verify (verify() can only be called once)
            image = Image.open(io.BytesIO(content))
            
            # Check for valid dimensions
            width, height = image.size
            if width <= 0 or height <= 0:
                return {
                    'is_valid': False,
                    'error': FileValidationError.INVALID_IMAGE,
                    'message': 'Invalid image: Image has zero or negative dimensions'
                }
            
            # Check for reasonable dimensions (max 50000x50000)
            max_dimension = 50000
            if width > max_dimension or height > max_dimension:
                return {
                    'is_valid': False,
                    'error': FileValidationError.INVALID_IMAGE,
                    'message': f'Invalid image: Dimensions too large ({width}x{height}). Maximum is {max_dimension}x{max_dimension}'
                }
            
            return {'is_valid': True, 'error': None, 'message': ''}
            
        except Image.UnidentifiedImageError:
            return {
                'is_valid': False,
                'error': FileValidationError.INVALID_IMAGE,
                'message': 'Invalid image: Cannot identify image format. File may be corrupted'
            }
        except Image.DecompressionBombError:
            return {
                'is_valid': False,
                'error': FileValidationError.INVALID_IMAGE,
                'message': 'Invalid image: Image is too large (potential decompression bomb)'
            }
        except Exception as e:
            logger.exception(f'Image validation error: {e}')
            return {
                'is_valid': False,
                'error': FileValidationError.CORRUPTED_FILE,
                'message': f'Error validating image: {str(e)}'
            }
    
    def get_supported_extensions(self) -> list[str]:
        """Return list of supported file extensions"""
        return list(self.SUPPORTED_EXTENSIONS)
    
    def get_supported_mime_types(self) -> list[str]:
        """Return list of supported MIME types"""
        return list(self.SUPPORTED_MIME_TYPES.keys())
    
    def get_max_file_size(self) -> int:
        """Return maximum file size in bytes"""
        return self.MAX_FILE_SIZE
    
    def get_max_file_size_mb(self) -> float:
        """Return maximum file size in megabytes"""
        return self.MAX_FILE_SIZE / (1024 * 1024)
