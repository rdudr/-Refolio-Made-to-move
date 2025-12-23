"""
Gemini-based Document Extraction Service
Uses Google Gemini 2.5 Flash for OCR and structured data extraction from resumes.

This replaces Google Cloud Vision OCR with a more powerful solution that:
1. Extracts text from PDFs and images
2. Understands document structure
3. Returns structured candidate profile data
4. Classifies professional category (creative, technical, corporate, hybrid)

Requirements: 1.1, 1.2, 4.1, 4.2
"""

import base64
import io
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

from PIL import Image

logger = logging.getLogger(__name__)


class ExtractionError(Enum):
    """Error codes for extraction failures"""
    NONE = "none"
    INVALID_FILE = "invalid_file"
    PDF_CONVERSION_FAILED = "pdf_conversion_failed"
    API_ERROR = "api_error"
    QUOTA_EXCEEDED = "quota_exceeded"
    PARSE_ERROR = "parse_error"
    TIMEOUT = "timeout"
    NO_API_KEY = "no_api_key"


@dataclass
class ExtractionResult:
    """Result of document extraction"""
    success: bool
    extracted_text: str = ""
    candidate_profile: dict = field(default_factory=dict)
    professional_category: str = "hybrid"
    confidence: float = 0.0
    error: ExtractionError = ExtractionError.NONE
    error_message: str = ""
    processing_time_ms: int = 0
    
    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "extracted_text": self.extracted_text,
            "candidate_profile": self.candidate_profile,
            "professional_category": self.professional_category,
            "confidence": self.confidence,
            "error": self.error.value,
            "error_message": self.error_message,
            "processing_time_ms": self.processing_time_ms,
        }


class GeminiExtractionService:
    """
    Service for extracting structured data from resumes using Google Gemini.
    
    Features:
    - PDF to image conversion using PyMuPDF
    - Image processing with Pillow
    - Structured data extraction with Gemini 2.5 Flash
    - Retry logic with exponential backoff
    - Multiple API key support with failover
    """
    
    # Gemini model to use
    MODEL_NAME = "gemini-2.0-flash"
    
    # Retry configuration
    MAX_RETRIES = 3
    INITIAL_BACKOFF_SECONDS = 1
    MAX_BACKOFF_SECONDS = 30
    
    # PDF conversion settings
    PDF_ZOOM = 2.0  # 2x zoom for better quality
    
    def __init__(self, api_keys: Optional[list[str]] = None):
        """
        Initialize the service with API keys.
        
        Args:
            api_keys: List of Gemini API keys for failover. If None, reads from env.
        """
        self.api_keys = api_keys or self._load_api_keys()
        self.current_key_index = 0
        self._client = None
    
    def _load_api_keys(self) -> list[str]:
        """Load API keys from environment variables"""
        keys = []
        
        # Primary key
        primary_key = os.getenv("GEMINI_API_KEY", "")
        if primary_key:
            keys.append(primary_key)
        
        # Additional keys for failover (GEMINI_API_KEY_2, GEMINI_API_KEY_3, etc.)
        for i in range(2, 10):
            key = os.getenv(f"GEMINI_API_KEY_{i}", "")
            if key:
                keys.append(key)
        
        return keys
    
    def _get_client(self):
        """Get or create Gemini client with current API key"""
        if not self.api_keys:
            raise ValueError("No Gemini API keys configured")
        
        from google import genai
        
        current_key = self.api_keys[self.current_key_index]
        return genai.Client(api_key=current_key)
    
    def _rotate_api_key(self) -> bool:
        """
        Rotate to next API key on quota error.
        
        Returns:
            True if rotated successfully, False if no more keys available
        """
        if self.current_key_index < len(self.api_keys) - 1:
            self.current_key_index += 1
            self._client = None
            logger.info(f"Rotated to API key {self.current_key_index + 1}")
            return True
        return False
    
    def extract_from_file(
        self,
        file_content: bytes,
        filename: str,
        file_type: str
    ) -> ExtractionResult:
        """
        Extract structured data from a resume file.
        
        Args:
            file_content: Raw file bytes
            filename: Original filename
            file_type: File type (pdf, png, jpg, jpeg)
            
        Returns:
            ExtractionResult with extracted data or error
        """
        start_time = time.time()
        
        if not self.api_keys:
            return ExtractionResult(
                success=False,
                error=ExtractionError.NO_API_KEY,
                error_message="No Gemini API key configured. Please set GEMINI_API_KEY in .env"
            )
        
        try:
            # Convert file to PIL Image(s)
            images = self._file_to_images(file_content, file_type)
            
            if not images:
                return ExtractionResult(
                    success=False,
                    error=ExtractionError.INVALID_FILE,
                    error_message="Could not convert file to image"
                )
            
            # Extract data using Gemini
            result = self._extract_with_gemini(images)
            
            result.processing_time_ms = int((time.time() - start_time) * 1000)
            return result
            
        except Exception as e:
            logger.exception(f"Extraction failed: {e}")
            return ExtractionResult(
                success=False,
                error=ExtractionError.API_ERROR,
                error_message=str(e),
                processing_time_ms=int((time.time() - start_time) * 1000)
            )
    
    def _file_to_images(self, file_content: bytes, file_type: str) -> list[Image.Image]:
        """
        Convert file content to PIL Image(s).
        
        For PDFs, converts each page to an image.
        For images, loads directly.
        """
        file_type = file_type.lower()
        
        if file_type == "pdf":
            return self._pdf_to_images(file_content)
        else:
            return self._load_image(file_content)
    
    def _pdf_to_images(self, pdf_content: bytes) -> list[Image.Image]:
        """Convert PDF to list of PIL Images using PyMuPDF"""
        try:
            import fitz  # PyMuPDF
            
            images = []
            pdf_document = fitz.open(stream=pdf_content, filetype="pdf")
            
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                
                # Render at 2x zoom for better quality
                mat = fitz.Matrix(self.PDF_ZOOM, self.PDF_ZOOM)
                pix = page.get_pixmap(matrix=mat)
                
                # Convert to PIL Image
                img_data = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_data))
                
                # Convert to RGB if needed
                if img.mode != "RGB":
                    img = img.convert("RGB")
                
                images.append(img)
            
            pdf_document.close()
            return images
            
        except Exception as e:
            logger.error(f"PDF conversion failed: {e}")
            return []
    
    def _load_image(self, image_content: bytes) -> list[Image.Image]:
        """Load image content as PIL Image"""
        try:
            img = Image.open(io.BytesIO(image_content))
            
            # Convert to RGB if needed
            if img.mode != "RGB":
                img = img.convert("RGB")
            
            return [img]
            
        except Exception as e:
            logger.error(f"Image loading failed: {e}")
            return []
    
    def _extract_with_gemini(self, images: list[Image.Image]) -> ExtractionResult:
        """
        Send images to Gemini and extract structured data.
        
        Uses retry logic with exponential backoff and API key rotation.
        """
        prompt = self._build_extraction_prompt()
        
        for attempt in range(self.MAX_RETRIES):
            try:
                client = self._get_client()
                
                # Prepare image parts
                contents = [prompt]
                for img in images:
                    # Convert PIL Image to bytes
                    img_buffer = io.BytesIO()
                    img.save(img_buffer, format="PNG")
                    img_bytes = img_buffer.getvalue()
                    
                    # Add image to contents
                    from google.genai import types
                    contents.append(types.Part.from_bytes(
                        data=img_bytes,
                        mime_type="image/png"
                    ))
                
                # Call Gemini API
                response = client.models.generate_content(
                    model=self.MODEL_NAME,
                    contents=contents
                )
                
                # Parse response
                return self._parse_response(response.text)
                
            except Exception as e:
                error_str = str(e).lower()
                
                # Check for quota errors
                if "quota" in error_str or "rate" in error_str or "429" in error_str:
                    if self._rotate_api_key():
                        logger.warning(f"Quota exceeded, rotating API key (attempt {attempt + 1})")
                        continue
                    else:
                        return ExtractionResult(
                            success=False,
                            error=ExtractionError.QUOTA_EXCEEDED,
                            error_message="All API keys exhausted quota"
                        )
                
                # Exponential backoff for other errors
                if attempt < self.MAX_RETRIES - 1:
                    backoff = min(
                        self.INITIAL_BACKOFF_SECONDS * (2 ** attempt),
                        self.MAX_BACKOFF_SECONDS
                    )
                    logger.warning(f"API error, retrying in {backoff}s: {e}")
                    time.sleep(backoff)
                else:
                    return ExtractionResult(
                        success=False,
                        error=ExtractionError.API_ERROR,
                        error_message=str(e)
                    )
        
        return ExtractionResult(
            success=False,
            error=ExtractionError.API_ERROR,
            error_message="Max retries exceeded"
        )
    
    def _build_extraction_prompt(self) -> str:
        """Build the extraction prompt for Gemini"""
        return """Analyze this resume image and extract structured information.

Return a JSON object with the following structure:
{
    "extracted_text": "Full text content of the resume",
    "name": "Full name of the candidate",
    "title": "Current or most recent job title",
    "professional_category": "One of: creative, technical, corporate, hybrid",
    "summary": "Brief professional summary (2-3 sentences)",
    "skills": [
        {"name": "Skill name", "level": 1-5, "category": "Category like Programming, Design, etc."}
    ],
    "experience": [
        {
            "id": "unique_id",
            "company": "Company name",
            "title": "Job title",
            "startDate": "Start date",
            "endDate": "End date or Present",
            "description": "Brief description of role",
            "highlights": ["Key achievement 1", "Key achievement 2"]
        }
    ],
    "education": [
        {
            "id": "unique_id",
            "institution": "School/University name",
            "degree": "Degree type",
            "field": "Field of study",
            "graduationDate": "Graduation date"
        }
    ],
    "projects": [
        {
            "id": "unique_id",
            "name": "Project name",
            "description": "Brief description",
            "technologies": ["Tech 1", "Tech 2"],
            "url": "Project URL if available"
        }
    ],
    "contact": {
        "email": "Email address",
        "phone": "Phone number",
        "location": "City, State/Country",
        "linkedin": "LinkedIn URL",
        "github": "GitHub URL",
        "website": "Personal website"
    },
    "achievements": [
        {"id": "1", "label": "Achievement label", "value": "Achievement value"}
    ],
    "confidence": 0.0-1.0
}

Professional category guidelines:
- "creative": Designers, artists, writers, marketers, content creators
- "technical": Software engineers, data scientists, IT professionals, developers
- "corporate": Business analysts, managers, executives, consultants, finance
- "hybrid": Mix of above or unclear categorization

For skills, estimate proficiency level 1-5 based on context:
- 5: Expert/Lead level mentioned
- 4: Senior/Advanced experience
- 3: Intermediate/Regular use
- 2: Basic/Some experience
- 1: Beginner/Mentioned briefly

Return ONLY valid JSON, no markdown formatting or explanation."""
    
    def _parse_response(self, response_text: str) -> ExtractionResult:
        """Parse Gemini response into ExtractionResult"""
        try:
            # Clean response - remove markdown code blocks if present
            cleaned = response_text.strip()
            if cleaned.startswith("```"):
                # Remove markdown code block
                cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
                cleaned = re.sub(r"\n?```$", "", cleaned)
            
            # Parse JSON
            data = json.loads(cleaned)
            
            # Build candidate profile
            candidate_profile = {
                "id": self._generate_id(),
                "name": self._clean_string(data.get("name", "Portfolio User")),
                "title": self._clean_string(data.get("title", "Professional")),
                "professionalCategory": data.get("professional_category", "hybrid"),
                "summary": self._clean_string(data.get("summary", "")),
                "skills": self._validate_skills(data.get("skills", [])),
                "experience": self._validate_experience(data.get("experience", [])),
                "education": data.get("education", []),
                "projects": data.get("projects", []),
                "contact": data.get("contact", {}),
                "achievements": self._validate_achievements(data.get("achievements", [])),
                "extractedText": data.get("extracted_text", ""),
                "confidence": min(1.0, max(0.0, float(data.get("confidence", 0.8)))),
            }
            
            return ExtractionResult(
                success=True,
                extracted_text=data.get("extracted_text", ""),
                candidate_profile=candidate_profile,
                professional_category=data.get("professional_category", "hybrid"),
                confidence=candidate_profile["confidence"],
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            logger.debug(f"Response text: {response_text[:500]}")
            return ExtractionResult(
                success=False,
                error=ExtractionError.PARSE_ERROR,
                error_message=f"Failed to parse Gemini response: {e}"
            )
        except Exception as e:
            logger.error(f"Response processing error: {e}")
            return ExtractionResult(
                success=False,
                error=ExtractionError.PARSE_ERROR,
                error_message=str(e)
            )
    
    def _generate_id(self) -> str:
        """Generate a unique ID"""
        import uuid
        return str(uuid.uuid4())
    
    def _clean_string(self, value: Any) -> str:
        """Clean and validate string value"""
        if value is None:
            return ""
        return str(value).strip()
    
    def _validate_skills(self, skills: list) -> list:
        """Validate and clean skills list"""
        validated = []
        for skill in skills:
            if isinstance(skill, dict) and "name" in skill:
                validated.append({
                    "name": self._clean_string(skill.get("name", "")),
                    "level": min(5, max(1, int(skill.get("level", 3)))),
                    "category": self._clean_string(skill.get("category", "General")),
                })
        
        # Ensure at least some default skills
        if not validated:
            validated = [
                {"name": "Communication", "level": 4, "category": "Soft Skills"},
                {"name": "Problem Solving", "level": 4, "category": "Soft Skills"},
                {"name": "Teamwork", "level": 4, "category": "Soft Skills"},
            ]
        
        return validated
    
    def _validate_experience(self, experience: list) -> list:
        """Validate and clean experience list"""
        validated = []
        for exp in experience:
            if isinstance(exp, dict):
                validated.append({
                    "id": exp.get("id", self._generate_id()),
                    "company": self._clean_string(exp.get("company", "")),
                    "title": self._clean_string(exp.get("title", "")),
                    "startDate": self._clean_string(exp.get("startDate", "")),
                    "endDate": self._clean_string(exp.get("endDate", "")),
                    "description": self._clean_string(exp.get("description", "")),
                    "highlights": exp.get("highlights", []),
                })
        return validated
    
    def _validate_achievements(self, achievements: list) -> list:
        """Validate and ensure achievements list"""
        validated = []
        for ach in achievements:
            if isinstance(ach, dict) and "label" in ach:
                validated.append({
                    "id": ach.get("id", self._generate_id()),
                    "label": self._clean_string(ach.get("label", "")),
                    "value": self._clean_string(ach.get("value", "")),
                })
        
        # Ensure at least some default achievements
        if not validated:
            validated = [
                {"id": "1", "label": "Years Experience", "value": "5+"},
                {"id": "2", "label": "Projects", "value": "10+"},
            ]
        
        return validated


# Singleton instance
_service_instance: Optional[GeminiExtractionService] = None


def get_extraction_service() -> GeminiExtractionService:
    """Get or create the extraction service singleton"""
    global _service_instance
    if _service_instance is None:
        _service_instance = GeminiExtractionService()
    return _service_instance
