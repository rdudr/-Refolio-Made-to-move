"""
Unit Tests for File Validation Service

Tests file type validation, size limits, and corruption detection.
Requirements: 6.1, 6.2, 6.4
"""

import io
import pytest
from PIL import Image

from apps.portfolio.services.file_validation_service import (
    FileValidationService,
    FileValidationResult,
    FileValidationError
)


class TestFileValidationService:
    """Unit tests for FileValidationService"""
    
    @pytest.fixture
    def service(self):
        """Create a FileValidationService instance"""
        return FileValidationService()
    
    @pytest.fixture
    def valid_png_content(self):
        """Create valid PNG image content"""
        img = Image.new('RGB', (100, 100), color='red')
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        return buffer.getvalue()
    
    @pytest.fixture
    def valid_jpg_content(self):
        """Create valid JPEG image content"""
        img = Image.new('RGB', (100, 100), color='blue')
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        return buffer.getvalue()
    
    @pytest.fixture
    def valid_pdf_content(self):
        """Create minimal valid PDF content"""
        # Minimal valid PDF structure
        return b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [] /Count 0 >>
endobj
xref
0 3
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
trailer
<< /Size 3 /Root 1 0 R >>
startxref
109
%%EOF"""

    # Test supported formats
    def test_get_supported_extensions(self, service):
        """Test that supported extensions are returned correctly"""
        extensions = service.get_supported_extensions()
        assert 'pdf' in extensions
        assert 'png' in extensions
        assert 'jpg' in extensions
        assert 'jpeg' in extensions
    
    def test_get_max_file_size(self, service):
        """Test that max file size is 10MB"""
        assert service.get_max_file_size() == 10 * 1024 * 1024
        assert service.get_max_file_size_mb() == 10.0
    
    # Test valid files
    def test_valid_png_file(self, service, valid_png_content):
        """Test validation of valid PNG file"""
        result = service.validate_file(valid_png_content, 'resume.png')
        assert result.is_valid is True
        assert result.error == FileValidationError.NONE
        assert result.file_type == 'png'
        assert result.file_size == len(valid_png_content)
    
    def test_valid_jpg_file(self, service, valid_jpg_content):
        """Test validation of valid JPEG file"""
        result = service.validate_file(valid_jpg_content, 'resume.jpg')
        assert result.is_valid is True
        assert result.error == FileValidationError.NONE
        assert result.file_type == 'jpg'
    
    def test_valid_jpeg_extension(self, service, valid_jpg_content):
        """Test validation with .jpeg extension"""
        result = service.validate_file(valid_jpg_content, 'resume.jpeg')
        assert result.is_valid is True
        assert result.file_type == 'jpeg'
    
    def test_valid_pdf_file(self, service, valid_pdf_content):
        """Test validation of valid PDF file"""
        result = service.validate_file(valid_pdf_content, 'resume.pdf')
        assert result.is_valid is True
        assert result.error == FileValidationError.NONE
        assert result.file_type == 'pdf'
    
    # Test empty files
    def test_empty_file(self, service):
        """Test rejection of empty file"""
        result = service.validate_file(b'', 'resume.pdf')
        assert result.is_valid is False
        assert result.error == FileValidationError.EMPTY_FILE
    
    def test_too_small_file(self, service):
        """Test rejection of file smaller than minimum size"""
        result = service.validate_file(b'small', 'resume.pdf')
        assert result.is_valid is False
        assert result.error == FileValidationError.EMPTY_FILE
        assert 'too small' in result.error_message.lower()

    # Test file size limits
    def test_file_too_large(self, service):
        """Test rejection of file exceeding 10MB limit"""
        # Create content just over 10MB
        large_content = b'x' * (10 * 1024 * 1024 + 1)
        result = service.validate_file(large_content, 'resume.pdf')
        assert result.is_valid is False
        assert result.error == FileValidationError.FILE_TOO_LARGE
        assert '10MB' in result.error_message
    
    def test_file_at_max_size(self, service, valid_png_content):
        """Test that file at exactly max size is accepted"""
        # This test uses a valid PNG which is under 10MB
        result = service.validate_file(valid_png_content, 'resume.png')
        assert result.is_valid is True
    
    # Test unsupported formats
    def test_unsupported_extension(self, service):
        """Test rejection of unsupported file extension"""
        # Content must be > 100 bytes to pass size check first
        content = b'some content here ' * 10  # ~170 bytes
        result = service.validate_file(content, 'resume.doc')
        assert result.is_valid is False
        assert result.error == FileValidationError.UNSUPPORTED_FORMAT
        assert 'doc' in result.error_message.lower()
    
    def test_unsupported_txt_extension(self, service):
        """Test rejection of .txt files"""
        content = b'text content ' * 10  # ~130 bytes
        result = service.validate_file(content, 'resume.txt')
        assert result.is_valid is False
        assert result.error == FileValidationError.UNSUPPORTED_FORMAT
    
    def test_no_extension(self, service):
        """Test rejection of file without extension"""
        content = b'some content ' * 10  # ~130 bytes
        result = service.validate_file(content, 'resume')
        assert result.is_valid is False
        assert result.error == FileValidationError.UNSUPPORTED_FORMAT
    
    # Test missing filename
    def test_missing_filename(self, service, valid_png_content):
        """Test rejection when filename is missing"""
        result = service.validate_file(valid_png_content, '')
        assert result.is_valid is False
        assert result.error == FileValidationError.MISSING_FILENAME
    
    def test_whitespace_filename(self, service, valid_png_content):
        """Test rejection when filename is only whitespace"""
        result = service.validate_file(valid_png_content, '   ')
        assert result.is_valid is False
        assert result.error == FileValidationError.MISSING_FILENAME

    # Test corrupted files
    def test_corrupted_image_random_bytes(self, service):
        """Test rejection of corrupted image (random bytes with image extension)"""
        # Random bytes that don't form a valid image
        corrupted = b'not a valid image content at all' * 10
        result = service.validate_file(corrupted, 'resume.png')
        assert result.is_valid is False
        assert result.error in (FileValidationError.CORRUPTED_FILE, FileValidationError.INVALID_IMAGE)
    
    def test_corrupted_pdf_no_eof(self, service):
        """Test rejection of PDF without EOF marker"""
        # PDF header but no proper structure - must be > 100 bytes
        corrupted_pdf = b'%PDF-1.4\n' + b'some content without proper structure ' * 5
        result = service.validate_file(corrupted_pdf, 'resume.pdf')
        assert result.is_valid is False
        assert result.error == FileValidationError.INVALID_PDF
        assert 'EOF' in result.error_message
    
    def test_corrupted_pdf_no_header(self, service):
        """Test rejection of file claiming to be PDF but without header"""
        # Content without PDF header - must be > 100 bytes
        fake_pdf = b'This is not a PDF file at all ' * 5 + b'\n%%EOF'
        result = service.validate_file(fake_pdf, 'resume.pdf')
        assert result.is_valid is False
        assert result.error == FileValidationError.INVALID_PDF
    
    def test_extension_content_mismatch(self, service, valid_png_content):
        """Test rejection when file extension doesn't match content"""
        # PNG content with PDF extension
        result = service.validate_file(valid_png_content, 'resume.pdf')
        assert result.is_valid is False
        assert result.error == FileValidationError.CORRUPTED_FILE
        assert 'does not match' in result.error_message.lower()
    
    # Test file stream validation
    def test_validate_file_stream(self, service, valid_png_content):
        """Test validation from file stream"""
        stream = io.BytesIO(valid_png_content)
        result = service.validate_file_stream(stream, 'resume.png')
        assert result.is_valid is True
        assert result.file_type == 'png'
    
    def test_validate_file_stream_resets_position(self, service, valid_png_content):
        """Test that file stream position is reset after validation"""
        stream = io.BytesIO(valid_png_content)
        service.validate_file_stream(stream, 'resume.png')
        # Stream should be reset to beginning
        assert stream.tell() == 0
    
    # Test result serialization
    def test_result_to_dict(self, service, valid_png_content):
        """Test FileValidationResult.to_dict() method"""
        result = service.validate_file(valid_png_content, 'resume.png')
        result_dict = result.to_dict()
        
        assert 'is_valid' in result_dict
        assert 'error' in result_dict
        assert 'error_message' in result_dict
        assert 'file_type' in result_dict
        assert 'file_size' in result_dict
        assert result_dict['is_valid'] is True
        assert result_dict['error'] == 'none'
