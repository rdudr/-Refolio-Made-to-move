"""
Property-Based Tests for OCR Service Accuracy

**Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
**Validates: Requirements 1.1, 6.1, 6.2**

Tests that the OCR service correctly handles various file formats and
maintains consistency in text extraction results.
"""

import io
import sys
from unittest.mock import MagicMock

import pytest
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from PIL import Image, ImageDraw, ImageFont

# Mock google.cloud.vision before importing OCR service
# This allows testing the service logic without requiring GCP credentials
mock_vision = MagicMock()
sys.modules['google.cloud'] = MagicMock()
sys.modules['google.cloud.vision'] = mock_vision

from apps.portfolio.services.ocr_service import (
    OCRService,
    OCRResult,
    TextBlock,
    BoundingBox,
)
from apps.portfolio.services.file_validation_service import (
    FileValidationService,
    FileValidationResult,
    FileValidationError,
)


# Custom strategies for generating test data
@st.composite
def valid_simple_text(draw):
    """Generate simple ASCII text that can be reliably rendered and OCR'd"""
    # Use only ASCII letters, numbers, and basic punctuation
    text = draw(st.text(
        alphabet=st.characters(
            whitelist_categories=('Lu', 'Ll', 'Nd'),  # Uppercase, lowercase, digits
            whitelist_characters=' .,!?-'
        ),
        min_size=1,
        max_size=100
    ))
    # Ensure text has at least one non-whitespace character
    assume(text.strip())
    return text.strip()


@st.composite
def valid_bounding_box_data(draw):
    """Generate valid bounding box coordinates"""
    x = draw(st.integers(min_value=0, max_value=1000))
    y = draw(st.integers(min_value=0, max_value=1000))
    width = draw(st.integers(min_value=1, max_value=500))
    height = draw(st.integers(min_value=1, max_value=500))
    return {'x': x, 'y': y, 'width': width, 'height': height}


@st.composite
def valid_confidence_score(draw):
    """Generate valid confidence scores between 0 and 1"""
    return draw(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False))


@st.composite
def valid_image_dimensions(draw):
    """Generate valid image dimensions for testing"""
    width = draw(st.integers(min_value=100, max_value=2000))
    height = draw(st.integers(min_value=100, max_value=2000))
    return (width, height)


class TestOCRResultConsistency:
    """
    **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
    
    Tests that OCRResult data structures maintain consistency and
    correctly serialize/deserialize data.
    """
    
    @given(
        text=valid_simple_text(),
        confidence=valid_confidence_score(),
        page_count=st.integers(min_value=1, max_value=100)
    )
    @settings(max_examples=100)
    def test_ocr_result_round_trip(self, text, confidence, page_count):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: For any OCRResult, converting to dict and back should preserve all data.
        """
        result = OCRResult(
            success=True,
            full_text=text,
            blocks=[],
            confidence=confidence,
            page_count=page_count,
            error_message=''
        )
        
        result_dict = result.to_dict()
        
        # Verify all fields are preserved in dict
        assert result_dict['success'] == result.success
        assert result_dict['full_text'] == text
        assert result_dict['confidence'] == confidence
        assert result_dict['page_count'] == page_count
        assert result_dict['error_message'] == ''
    
    @given(
        text=valid_simple_text(),
        bbox_data=valid_bounding_box_data(),
        confidence=valid_confidence_score()
    )
    @settings(max_examples=100)
    def test_text_block_round_trip(self, text, bbox_data, confidence):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: For any TextBlock, converting to dict should preserve all data.
        """
        bbox = BoundingBox(**bbox_data)
        block = TextBlock(
            text=text,
            confidence=confidence,
            bounding_box=bbox,
            block_type='paragraph'
        )
        
        block_dict = block.to_dict()
        
        assert block_dict['text'] == text
        assert block_dict['confidence'] == confidence
        assert block_dict['block_type'] == 'paragraph'
        assert block_dict['bounding_box']['x'] == bbox_data['x']
        assert block_dict['bounding_box']['y'] == bbox_data['y']
        assert block_dict['bounding_box']['width'] == bbox_data['width']
        assert block_dict['bounding_box']['height'] == bbox_data['height']
    
    @given(bbox_data=valid_bounding_box_data())
    @settings(max_examples=100)
    def test_bounding_box_invariants(self, bbox_data):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: BoundingBox dimensions should always be non-negative.
        """
        bbox = BoundingBox(**bbox_data)
        
        assert bbox.x >= 0
        assert bbox.y >= 0
        assert bbox.width >= 0
        assert bbox.height >= 0
        
        # Verify to_dict preserves values
        bbox_dict = bbox.to_dict()
        assert bbox_dict['x'] == bbox.x
        assert bbox_dict['y'] == bbox.y
        assert bbox_dict['width'] == bbox.width
        assert bbox_dict['height'] == bbox.height


class TestOCRServiceFileTypeValidation:
    """
    **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
    
    Tests that the OCR service correctly validates and handles different file types.
    """
    
    @given(file_type=st.sampled_from(['pdf', 'png', 'jpg', 'jpeg']))
    @settings(max_examples=100)
    def test_supported_formats_accepted(self, file_type):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: All supported file formats should be recognized as valid.
        """
        service = OCRService()
        
        assert service.validate_file_type(file_type) is True
        assert file_type.lower() in service.get_supported_formats()
    
    @given(file_type=st.text(min_size=1, max_size=10).filter(
        lambda x: x.lower() not in ['pdf', 'png', 'jpg', 'jpeg']
    ))
    @settings(max_examples=100)
    def test_unsupported_formats_rejected(self, file_type):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: Unsupported file formats should be rejected.
        """
        service = OCRService()
        
        assert service.validate_file_type(file_type) is False
    
    @given(size=st.integers(min_value=0, max_value=10 * 1024 * 1024))
    @settings(max_examples=100)
    def test_valid_file_sizes_accepted(self, size):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: Files within size limit should be accepted.
        """
        service = OCRService()
        
        assert service.validate_file_size(size) is True
    
    @given(size=st.integers(min_value=10 * 1024 * 1024 + 1, max_value=100 * 1024 * 1024))
    @settings(max_examples=100)
    def test_oversized_files_rejected(self, size):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: Files exceeding size limit should be rejected.
        """
        service = OCRService()
        
        assert service.validate_file_size(size) is False


class TestImagePreprocessingConsistency:
    """
    **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
    
    Tests that image preprocessing maintains image integrity.
    """
    
    @given(dimensions=valid_image_dimensions())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_image_preprocessing_preserves_content(self, dimensions):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: Image preprocessing should produce valid image output.
        """
        width, height = dimensions
        
        # Create a test image
        image = Image.new('RGB', (width, height), color='white')
        
        # Convert to bytes
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        original_bytes = buffer.getvalue()
        
        # Preprocess
        service = OCRService()
        processed_bytes = service._preprocess_image(original_bytes)
        
        # Verify output is valid image
        processed_image = Image.open(io.BytesIO(processed_bytes))
        
        # Dimensions should be preserved
        assert processed_image.size[0] == width
        assert processed_image.size[1] == height
    
    @given(
        dimensions=valid_image_dimensions(),
        mode=st.sampled_from(['RGB', 'RGBA', 'L', 'P'])
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow], deadline=None)
    def test_image_mode_conversion(self, dimensions, mode):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: Images in various modes should be convertible for OCR processing.
        """
        width, height = dimensions
        
        # Create image in specified mode
        if mode == 'P':
            # Palette mode needs special handling
            image = Image.new('RGB', (width, height), color='white')
            image = image.convert('P')
        else:
            image = Image.new(mode, (width, height))
        
        # Convert to bytes
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        original_bytes = buffer.getvalue()
        
        # Preprocess
        service = OCRService()
        processed_bytes = service._preprocess_image(original_bytes)
        
        # Verify output is valid
        processed_image = Image.open(io.BytesIO(processed_bytes))
        assert processed_image is not None


class TestFileValidationServiceConsistency:
    """
    **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
    
    Tests that file validation service correctly validates files.
    """
    
    @given(dimensions=valid_image_dimensions())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_valid_png_images_accepted(self, dimensions):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: Valid PNG images should pass validation.
        """
        width, height = dimensions
        
        # Create valid PNG image
        image = Image.new('RGB', (width, height), color='white')
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        content = buffer.getvalue()
        
        service = FileValidationService()
        result = service.validate_file(content, 'test.png')
        
        assert result.is_valid is True
        assert result.file_type == 'png'
        assert result.error == FileValidationError.NONE
    
    @given(dimensions=valid_image_dimensions())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_valid_jpeg_images_accepted(self, dimensions):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: Valid JPEG images should pass validation.
        """
        width, height = dimensions
        
        # Create valid JPEG image
        image = Image.new('RGB', (width, height), color='white')
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG')
        content = buffer.getvalue()
        
        service = FileValidationService()
        result = service.validate_file(content, 'test.jpg')
        
        assert result.is_valid is True
        assert result.file_type == 'jpg'
        assert result.error == FileValidationError.NONE
    
    @given(
        filename=st.text(min_size=1, max_size=50).filter(
            lambda x: x.strip() and ('.' not in x or x.rsplit('.', 1)[-1].lower() not in ['pdf', 'png', 'jpg', 'jpeg'])
        )
    )
    @settings(max_examples=100)
    def test_unsupported_extensions_rejected(self, filename):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: Files with unsupported extensions should be rejected.
        """
        # Ensure filename is not whitespace-only and doesn't have supported extension
        assume(filename.strip())  # Skip whitespace-only filenames
        if '.' in filename:
            ext = filename.rsplit('.', 1)[-1].lower()
            assume(ext not in ['pdf', 'png', 'jpg', 'jpeg'])
        
        service = FileValidationService()
        # Create content that meets minimum size requirement (100+ bytes)
        content = b'x' * 150
        
        result = service.validate_file(content, filename)
        
        # Should fail due to unsupported format
        assert result.is_valid is False
        assert result.error == FileValidationError.UNSUPPORTED_FORMAT
    
    @given(size=st.integers(min_value=10 * 1024 * 1024 + 1, max_value=20 * 1024 * 1024))
    @settings(max_examples=10)  # Fewer examples due to memory usage
    def test_oversized_files_rejected(self, size):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: Files exceeding 10MB should be rejected.
        """
        service = FileValidationService()
        
        # Create oversized content
        content = b'x' * size
        
        result = service.validate_file(content, 'test.png')
        
        assert result.is_valid is False
        assert result.error == FileValidationError.FILE_TOO_LARGE


class TestOCRErrorHandling:
    """
    **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
    
    Tests that OCR service handles errors gracefully.
    """
    
    @given(error_msg=st.text(min_size=0, max_size=500))
    @settings(max_examples=100)
    def test_error_result_consistency(self, error_msg):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: Error OCRResults should have consistent structure.
        """
        result = OCRResult(
            success=False,
            full_text='',
            error_message=error_msg
        )
        
        assert result.success is False
        assert result.full_text == ''
        assert result.error_message == error_msg
        assert result.blocks == []
        assert result.confidence == 0.0
        
        # Verify dict conversion
        result_dict = result.to_dict()
        assert result_dict['success'] is False
        assert result_dict['error_message'] == error_msg
    
    def test_nonexistent_file_returns_error(self):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: Non-existent files should return error result.
        """
        service = OCRService()
        
        result = service.extract_text('/nonexistent/path/file.pdf')
        
        assert result.success is False
        assert 'not found' in result.error_message.lower()
    
    @given(file_type=st.text(min_size=1, max_size=10).filter(
        lambda x: x.lower() not in ['pdf', 'png', 'jpg', 'jpeg']
    ))
    @settings(max_examples=100)
    def test_unsupported_format_returns_error(self, file_type):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: Unsupported file formats should return error result.
        """
        service = OCRService()
        
        result = service.extract_text_from_bytes(
            content=b'test content',
            file_type=file_type,
            filename='test.file'
        )
        
        assert result.success is False
        assert 'unsupported' in result.error_message.lower()

