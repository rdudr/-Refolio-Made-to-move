"""
OCR Service - Google Cloud Vision Integration
Handles text extraction from PDF and image files with coordinate mapping
Requirements: 1.1, 6.1, 6.2
"""

import io
import logging
from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path

from PIL import Image

# Optional import for Google Cloud Vision
try:
    from google.cloud import vision
    VISION_AVAILABLE = True
except ImportError:
    vision = None
    VISION_AVAILABLE = False

logger = logging.getLogger(__name__)


@dataclass
class BoundingBox:
    """Represents a bounding box for text location"""
    x: int
    y: int
    width: int
    height: int
    
    def to_dict(self) -> dict:
        return {
            'x': self.x,
            'y': self.y,
            'width': self.width,
            'height': self.height
        }


@dataclass
class TextBlock:
    """Represents a block of extracted text with position information"""
    text: str
    confidence: float
    bounding_box: Optional[BoundingBox] = None
    block_type: str = 'text'  # text, paragraph, word
    
    def to_dict(self) -> dict:
        return {
            'text': self.text,
            'confidence': self.confidence,
            'bounding_box': self.bounding_box.to_dict() if self.bounding_box else None,
            'block_type': self.block_type
        }


@dataclass
class OCRResult:
    """Result of OCR processing"""
    success: bool
    full_text: str
    blocks: list[TextBlock] = field(default_factory=list)
    confidence: float = 0.0
    page_count: int = 1
    error_message: str = ''
    
    def to_dict(self) -> dict:
        return {
            'success': self.success,
            'full_text': self.full_text,
            'blocks': [b.to_dict() for b in self.blocks],
            'confidence': self.confidence,
            'page_count': self.page_count,
            'error_message': self.error_message
        }


class OCRService:
    """
    Service for extracting text from PDF and image files using Google Cloud Vision
    
    Supports:
    - PDF files (single and multi-page)
    - Image files (PNG, JPG, JPEG)
    
    Requirements: 1.1, 6.1, 6.2
    """
    
    SUPPORTED_IMAGE_FORMATS = {'png', 'jpg', 'jpeg'}
    SUPPORTED_PDF_FORMAT = 'pdf'
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    def __init__(self):
        """Initialize the OCR service with Google Cloud Vision client"""
        self._client = None
    
    @property
    def client(self):
        """Lazy initialization of Vision client"""
        if not VISION_AVAILABLE:
            raise RuntimeError(
                "Google Cloud Vision is not available. "
                "Install google-cloud-vision package to use OCR features."
            )
        if self._client is None:
            self._client = vision.ImageAnnotatorClient()
        return self._client
    
    def is_available(self) -> bool:
        """Check if OCR service is available"""
        return VISION_AVAILABLE
    
    def extract_text(self, file_path: str | Path, file_type: Optional[str] = None) -> OCRResult:
        """
        Extract text from a file (PDF or image)
        
        Args:
            file_path: Path to the file
            file_type: Optional file type override (pdf, png, jpg, jpeg)
            
        Returns:
            OCRResult with extracted text and metadata
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            return OCRResult(
                success=False,
                full_text='',
                error_message=f'File not found: {file_path}'
            )
        
        # Determine file type
        if file_type is None:
            file_type = file_path.suffix.lower().lstrip('.')
        file_type = file_type.lower()
        
        # Validate file type
        if not self._is_supported_format(file_type):
            return OCRResult(
                success=False,
                full_text='',
                error_message=f'Unsupported file format: {file_type}'
            )
        
        # Check file size
        file_size = file_path.stat().st_size
        if file_size > self.MAX_FILE_SIZE:
            return OCRResult(
                success=False,
                full_text='',
                error_message=f'File too large: {file_size} bytes (max {self.MAX_FILE_SIZE})'
            )
        
        try:
            if file_type == self.SUPPORTED_PDF_FORMAT:
                return self._process_pdf(file_path)
            else:
                return self._process_image(file_path)
        except Exception as e:
            logger.exception(f'OCR processing failed for {file_path}')
            return OCRResult(
                success=False,
                full_text='',
                error_message=f'OCR processing failed: {str(e)}'
            )

    
    def extract_text_from_bytes(
        self, 
        content: bytes, 
        file_type: str,
        filename: str = 'upload'
    ) -> OCRResult:
        """
        Extract text from file bytes (for uploaded files)
        
        Args:
            content: File content as bytes
            file_type: File type (pdf, png, jpg, jpeg)
            filename: Original filename for logging
            
        Returns:
            OCRResult with extracted text and metadata
        """
        file_type = file_type.lower()
        
        if not self._is_supported_format(file_type):
            return OCRResult(
                success=False,
                full_text='',
                error_message=f'Unsupported file format: {file_type}'
            )
        
        if len(content) > self.MAX_FILE_SIZE:
            return OCRResult(
                success=False,
                full_text='',
                error_message=f'File too large: {len(content)} bytes (max {self.MAX_FILE_SIZE})'
            )
        
        try:
            if file_type == self.SUPPORTED_PDF_FORMAT:
                return self._process_pdf_bytes(content)
            else:
                return self._process_image_bytes(content)
        except Exception as e:
            logger.exception(f'OCR processing failed for {filename}')
            return OCRResult(
                success=False,
                full_text='',
                error_message=f'OCR processing failed: {str(e)}'
            )
    
    def _is_supported_format(self, file_type: str) -> bool:
        """Check if file format is supported"""
        return file_type in self.SUPPORTED_IMAGE_FORMATS or file_type == self.SUPPORTED_PDF_FORMAT
    
    def _process_image(self, file_path: Path) -> OCRResult:
        """Process an image file for text extraction"""
        with open(file_path, 'rb') as f:
            content = f.read()
        return self._process_image_bytes(content)
    
    def _process_image_bytes(self, content: bytes) -> OCRResult:
        """Process image bytes for text extraction using Vision API"""
        if not VISION_AVAILABLE:
            return OCRResult(
                success=False,
                full_text='',
                error_message='Google Cloud Vision is not available'
            )
        
        # Preprocess image if needed
        content = self._preprocess_image(content)
        
        image = vision.Image(content=content)
        
        # Use document_text_detection for better accuracy with documents
        response = self.client.document_text_detection(image=image)
        
        if response.error.message:
            return OCRResult(
                success=False,
                full_text='',
                error_message=response.error.message
            )
        
        return self._parse_vision_response(response)

    
    def _process_pdf(self, file_path: Path) -> OCRResult:
        """Process a PDF file for text extraction"""
        with open(file_path, 'rb') as f:
            content = f.read()
        return self._process_pdf_bytes(content)
    
    def _process_pdf_bytes(self, content: bytes) -> OCRResult:
        """
        Process PDF bytes for text extraction using Vision API
        Uses async document processing for multi-page PDFs
        """
        if not VISION_AVAILABLE:
            return OCRResult(
                success=False,
                full_text='',
                error_message='Google Cloud Vision is not available'
            )
        
        # For single-page or simple PDFs, convert to image first
        # Vision API can handle PDF directly with document_text_detection
        
        input_config = vision.InputConfig(
            content=content,
            mime_type='application/pdf'
        )
        
        # Configure features for document text detection
        features = [vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)]
        
        # Create request for batch annotation
        request = vision.AnnotateFileRequest(
            input_config=input_config,
            features=features
        )
        
        response = self.client.batch_annotate_files(requests=[request])
        
        if not response.responses:
            return OCRResult(
                success=False,
                full_text='',
                error_message='No response from Vision API'
            )
        
        file_response = response.responses[0]
        
        if file_response.error.message:
            return OCRResult(
                success=False,
                full_text='',
                error_message=file_response.error.message
            )
        
        return self._parse_pdf_response(file_response)
    
    def _preprocess_image(self, content: bytes) -> bytes:
        """
        Preprocess image for better OCR accuracy
        - Convert to RGB if needed
        - Enhance contrast if image is too dark/light
        """
        try:
            image = Image.open(io.BytesIO(content))
            
            # Convert to RGB if necessary (handles RGBA, grayscale, etc.)
            if image.mode not in ('RGB', 'L'):
                image = image.convert('RGB')
            
            # Save back to bytes
            output = io.BytesIO()
            image.save(output, format='PNG')
            return output.getvalue()
        except Exception as e:
            logger.warning(f'Image preprocessing failed: {e}, using original')
            return content

    
    def _parse_vision_response(self, response) -> OCRResult:
        """Parse Vision API response for image text detection"""
        if not response.full_text_annotation:
            return OCRResult(
                success=True,
                full_text='',
                confidence=0.0,
                page_count=1
            )
        
        full_text = response.full_text_annotation.text
        blocks = []
        total_confidence = 0.0
        confidence_count = 0
        
        # Extract text blocks with coordinates
        for page in response.full_text_annotation.pages:
            for block in page.blocks:
                block_text = self._extract_block_text(block)
                block_confidence = block.confidence if hasattr(block, 'confidence') else 0.0
                
                # Get bounding box
                bbox = self._extract_bounding_box(block.bounding_box)
                
                blocks.append(TextBlock(
                    text=block_text,
                    confidence=block_confidence,
                    bounding_box=bbox,
                    block_type='paragraph'
                ))
                
                total_confidence += block_confidence
                confidence_count += 1
        
        avg_confidence = total_confidence / confidence_count if confidence_count > 0 else 0.0
        
        return OCRResult(
            success=True,
            full_text=full_text,
            blocks=blocks,
            confidence=avg_confidence,
            page_count=1
        )
    
    def _parse_pdf_response(self, file_response) -> OCRResult:
        """Parse Vision API response for PDF text detection"""
        all_text = []
        all_blocks = []
        total_confidence = 0.0
        confidence_count = 0
        page_count = len(file_response.responses)
        
        for page_response in file_response.responses:
            if not page_response.full_text_annotation:
                continue
            
            all_text.append(page_response.full_text_annotation.text)
            
            for page in page_response.full_text_annotation.pages:
                for block in page.blocks:
                    block_text = self._extract_block_text(block)
                    block_confidence = block.confidence if hasattr(block, 'confidence') else 0.0
                    bbox = self._extract_bounding_box(block.bounding_box)
                    
                    all_blocks.append(TextBlock(
                        text=block_text,
                        confidence=block_confidence,
                        bounding_box=bbox,
                        block_type='paragraph'
                    ))
                    
                    total_confidence += block_confidence
                    confidence_count += 1
        
        full_text = '\n\n'.join(all_text)
        avg_confidence = total_confidence / confidence_count if confidence_count > 0 else 0.0
        
        return OCRResult(
            success=True,
            full_text=full_text,
            blocks=all_blocks,
            confidence=avg_confidence,
            page_count=page_count
        )

    
    def _extract_block_text(self, block) -> str:
        """Extract text from a Vision API block"""
        text_parts = []
        for paragraph in block.paragraphs:
            para_text = []
            for word in paragraph.words:
                word_text = ''.join(
                    symbol.text for symbol in word.symbols
                )
                para_text.append(word_text)
            text_parts.append(' '.join(para_text))
        return '\n'.join(text_parts)
    
    def _extract_bounding_box(self, bounding_poly) -> Optional[BoundingBox]:
        """Extract bounding box from Vision API bounding polygon"""
        if not bounding_poly or not bounding_poly.vertices:
            return None
        
        vertices = bounding_poly.vertices
        if len(vertices) < 4:
            return None
        
        # Calculate bounding box from vertices
        x_coords = [v.x for v in vertices if hasattr(v, 'x')]
        y_coords = [v.y for v in vertices if hasattr(v, 'y')]
        
        if not x_coords or not y_coords:
            return None
        
        min_x = min(x_coords)
        min_y = min(y_coords)
        max_x = max(x_coords)
        max_y = max(y_coords)
        
        return BoundingBox(
            x=min_x,
            y=min_y,
            width=max_x - min_x,
            height=max_y - min_y
        )
    
    def get_supported_formats(self) -> list[str]:
        """Return list of supported file formats"""
        return [self.SUPPORTED_PDF_FORMAT] + list(self.SUPPORTED_IMAGE_FORMATS)
    
    def validate_file_type(self, file_type: str) -> bool:
        """Validate if a file type is supported"""
        return self._is_supported_format(file_type.lower())
    
    def validate_file_size(self, size_bytes: int) -> bool:
        """Validate if file size is within limits"""
        return size_bytes <= self.MAX_FILE_SIZE
