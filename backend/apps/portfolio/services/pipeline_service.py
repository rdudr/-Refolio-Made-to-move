"""
Pipeline Orchestration Service
Unified processing pipeline connecting OCR, AI analysis, and component selection
Requirements: 1.1, 1.2, 1.3, 1.4
"""

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Callable, Any

from asgiref.sync import sync_to_async

from ..models import (
    Resume,
    ProcessingResult,
    ComponentSelection,
    ProcessingStatus,
    ProfessionalCategory,
    ThemePalette,
    ComponentType,
)
from .ocr_service import OCRService, OCRResult
from .file_validation_service import FileValidationService, FileValidationResult
from .input_sanitization_service import (
    InputSanitizationService,
    get_sanitization_service
)
from .error_recovery_service import (
    ErrorRecoveryService,
    RetryHandler,
    RetryConfig,
    FallbackConfig,
    RetryStrategy,
    get_error_recovery_service
)

logger = logging.getLogger(__name__)


class PipelineStage(Enum):
    """Pipeline processing stages"""
    VALIDATION = 'validation'
    OCR = 'ocr'
    AI_ANALYSIS = 'ai_analysis'
    COMPONENT_SELECTION = 'component_selection'
    LAYOUT_GENERATION = 'layout_generation'
    COMPLETE = 'complete'
    ERROR = 'error'


@dataclass
class PipelineProgress:
    """Progress information for pipeline processing"""
    stage: PipelineStage
    progress: int  # 0-100
    message: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def __post_init__(self):
        """Clamp progress to valid range [0, 100]"""
        self.progress = max(0, min(100, self.progress))
    
    def to_dict(self) -> dict:
        return {
            'stage': self.stage.value,
            'progress': self.progress,
            'message': self.message,
            'timestamp': self.timestamp.isoformat() + 'Z'
        }


@dataclass
class PipelineResult:
    """Result of pipeline processing"""
    success: bool
    resume: Optional[Resume] = None
    processing_result: Optional[ProcessingResult] = None
    candidate_profile: dict = field(default_factory=dict)
    components: list = field(default_factory=list)
    theme: str = ThemePalette.NEON_BLUE.value
    processing_time_ms: int = 0
    error_message: str = ''
    
    def to_dict(self) -> dict:
        return {
            'success': self.success,
            'candidateProfile': self.candidate_profile,
            'components': self.components,
            'theme': self.theme,
            'processingTimeMs': self.processing_time_ms,
            'errorMessage': self.error_message,
        }


class PipelineService:
    """
    Orchestrates the complete resume processing pipeline.
    
    Pipeline stages:
    1. File validation
    2. OCR text extraction
    3. AI analysis (professional categorization)
    4. Component selection
    5. Layout generation
    
    Requirements: 1.1, 1.2, 1.3, 1.4
    """
    
    # Progress percentages for each stage
    STAGE_PROGRESS = {
        PipelineStage.VALIDATION: (0, 10),
        PipelineStage.OCR: (10, 35),
        PipelineStage.AI_ANALYSIS: (35, 65),
        PipelineStage.COMPONENT_SELECTION: (65, 85),
        PipelineStage.LAYOUT_GENERATION: (85, 100),
    }
    
    def __init__(self):
        self.file_validator = FileValidationService()
        self.ocr_service = OCRService()
        self.sanitization_service = get_sanitization_service()
        self.error_recovery_service = get_error_recovery_service()
        self._progress_callbacks: list[Callable] = []
        
        # Configure retry handler for OCR operations
        self.ocr_retry_handler = RetryHandler(RetryConfig(
            max_retries=2,
            base_delay_seconds=1.0,
            strategy=RetryStrategy.EXPONENTIAL,
            retryable_exceptions=(ConnectionError, TimeoutError, asyncio.TimeoutError)
        ))
    
    def add_progress_callback(self, callback: Callable[[PipelineProgress], Any]):
        """Add a callback to receive progress updates"""
        self._progress_callbacks.append(callback)
    
    async def _emit_progress(
        self,
        stage: PipelineStage,
        progress: int,
        message: str,
        processing_result: Optional[ProcessingResult] = None
    ):
        """Emit progress update to all registered callbacks"""
        progress_info = PipelineProgress(
            stage=stage,
            progress=progress,
            message=message
        )
        
        # Update database if processing result exists
        if processing_result:
            await self._update_processing_status(
                processing_result,
                stage,
                progress,
                message
            )
        
        # Call all registered callbacks
        for callback in self._progress_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(progress_info)
                else:
                    callback(progress_info)
            except Exception as e:
                logger.warning(f"Progress callback error: {e}")
        
        return progress_info
    
    @sync_to_async
    def _update_processing_status(
        self,
        processing_result: ProcessingResult,
        stage: PipelineStage,
        progress: int,
        message: str
    ):
        """Update processing result status in database"""
        status_map = {
            PipelineStage.VALIDATION: ProcessingStatus.UPLOADING,
            PipelineStage.OCR: ProcessingStatus.OCR_PROCESSING,
            PipelineStage.AI_ANALYSIS: ProcessingStatus.AI_ANALYSIS,
            PipelineStage.COMPONENT_SELECTION: ProcessingStatus.COMPONENT_SELECTION,
            PipelineStage.LAYOUT_GENERATION: ProcessingStatus.LAYOUT_GENERATION,
            PipelineStage.COMPLETE: ProcessingStatus.COMPLETE,
            PipelineStage.ERROR: ProcessingStatus.ERROR,
        }
        
        processing_result.status = status_map.get(stage, ProcessingStatus.PENDING)
        processing_result.progress = progress
        processing_result.status_message = message
        processing_result.save(
            update_fields=['status', 'progress', 'status_message', 'updated_at']
        )
    
    async def process(
        self,
        file_content: bytes,
        filename: str,
        content_type: Optional[str] = None,
        options: Optional[dict] = None,
        client_identifier: Optional[str] = None
    ) -> PipelineResult:
        """
        Execute the complete processing pipeline.
        
        Args:
            file_content: Raw file bytes
            filename: Original filename
            content_type: MIME type (optional)
            options: Processing options (theme_preference, component_style)
            client_identifier: Client identifier for rate limiting (IP address)
            
        Returns:
            PipelineResult with processing outcome
            
        Requirements: 1.1, 1.2, 1.3, 1.4
        """
        start_time = time.time()
        options = options or {}
        
        try:
            # Rate limiting check
            if client_identifier:
                rate_limit_result = self.sanitization_service.check_rate_limit(client_identifier)
                if not rate_limit_result.allowed:
                    return PipelineResult(
                        success=False,
                        error_message=f'Rate limit exceeded. Please try again in {rate_limit_result.retry_after_seconds} seconds.'
                    )
            
            # Sanitize filename
            filename_result = self.sanitization_service.sanitize_filename(filename)
            if not filename_result.is_safe:
                return PipelineResult(
                    success=False,
                    error_message=filename_result.error_message
                )
            sanitized_filename = filename_result.sanitized_value
            
            # Sanitize options
            options_result = self.sanitization_service.validate_options(options)
            sanitized_options = options_result.sanitized_value if options_result.is_safe else {}
            
            # Stage 1: Validation
            await self._emit_progress(
                PipelineStage.VALIDATION,
                5,
                'Validating file...'
            )
            
            validation_result = self._validate_file(file_content, sanitized_filename, content_type)
            
            if not validation_result.is_valid:
                return PipelineResult(
                    success=False,
                    error_message=validation_result.error_message
                )
            
            await self._emit_progress(
                PipelineStage.VALIDATION,
                10,
                'File validation complete'
            )
            
            # Create database records
            resume = await self._create_resume(
                file_content,
                sanitized_filename,
                validation_result.file_type,
                validation_result.file_size
            )
            
            processing_result = await self._create_processing_result(resume)
            
            # Stage 2: OCR with retry and fallback
            await self._emit_progress(
                PipelineStage.OCR,
                15,
                'Extracting text from resume...',
                processing_result
            )
            
            ocr_result = await self._run_ocr_with_retry(
                file_content,
                validation_result.file_type
            )
            
            extracted_text = ''
            if ocr_result.success:
                extracted_text = ocr_result.full_text
                await self._update_resume_ocr(resume, ocr_result)
                await self._emit_progress(
                    PipelineStage.OCR,
                    35,
                    'Text extraction complete',
                    processing_result
                )
            else:
                logger.warning(f"OCR failed: {ocr_result.error_message}")
                await self._emit_progress(
                    PipelineStage.OCR,
                    35,
                    f'OCR warning: {ocr_result.error_message}. Using fallback.',
                    processing_result
                )
            
            # Stage 3: AI Analysis with fallback
            await self._emit_progress(
                PipelineStage.AI_ANALYSIS,
                40,
                'Analyzing professional profile...',
                processing_result
            )
            
            candidate_profile = await self._analyze_resume_with_fallback(
                extracted_text,
                sanitized_options
            )
            
            await self._emit_progress(
                PipelineStage.AI_ANALYSIS,
                65,
                'Profile analysis complete',
                processing_result
            )
            
            # Stage 4: Component Selection with fallback
            await self._emit_progress(
                PipelineStage.COMPONENT_SELECTION,
                70,
                'Selecting UI components...',
                processing_result
            )
            
            components = await self._select_components_with_fallback(
                candidate_profile,
                sanitized_options
            )
            
            await self._emit_progress(
                PipelineStage.COMPONENT_SELECTION,
                85,
                'Component selection complete',
                processing_result
            )
            
            # Stage 5: Layout Generation
            await self._emit_progress(
                PipelineStage.LAYOUT_GENERATION,
                90,
                'Generating layout...',
                processing_result
            )
            
            theme = self._select_theme(candidate_profile, sanitized_options)
            
            # Save results to database
            await self._save_components(processing_result, components)
            await self._update_processing_result_profile(
                processing_result,
                candidate_profile,
                theme
            )
            
            processing_time_ms = int((time.time() - start_time) * 1000)
            await self._complete_processing(processing_result, processing_time_ms)
            
            await self._emit_progress(
                PipelineStage.COMPLETE,
                100,
                'Portfolio generation complete',
                processing_result
            )
            
            return PipelineResult(
                success=True,
                resume=resume,
                processing_result=processing_result,
                candidate_profile=candidate_profile,
                components=components,
                theme=theme,
                processing_time_ms=processing_time_ms
            )
            
        except Exception as e:
            logger.exception(f"Pipeline error: {e}")
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            return PipelineResult(
                success=False,
                error_message=str(e),
                processing_time_ms=processing_time_ms
            )
    
    def _validate_file(
        self,
        file_content: bytes,
        filename: str,
        content_type: Optional[str]
    ) -> FileValidationResult:
        """Validate the uploaded file"""
        return self.file_validator.validate_file(
            content=file_content,
            filename=filename,
            declared_content_type=content_type
        )
    
    @sync_to_async
    def _create_resume(
        self,
        file_content: bytes,
        filename: str,
        file_type: str,
        file_size: int
    ) -> Resume:
        """Create Resume record in database"""
        resume = Resume(
            original_filename=filename,
            file_type=file_type,
            file_size=file_size
        )
        resume.save()
        return resume
    
    @sync_to_async
    def _create_processing_result(self, resume: Resume) -> ProcessingResult:
        """Create ProcessingResult record in database"""
        result = ProcessingResult(
            resume=resume,
            status=ProcessingStatus.PENDING,
            progress=0,
            status_message='Processing started'
        )
        result.save()
        return result
    
    @sync_to_async
    def _run_ocr(self, file_content: bytes, file_type: str) -> OCRResult:
        """Run OCR on file content"""
        return self.ocr_service.extract_text_from_bytes(
            content=file_content,
            file_type=file_type,
            filename='upload'
        )
    
    async def _run_ocr_with_retry(self, file_content: bytes, file_type: str) -> OCRResult:
        """
        Run OCR with retry logic for transient failures.
        
        Requirements: 6.4
        """
        async def ocr_operation():
            return await self._run_ocr(file_content, file_type)
        
        # Create fallback OCR result
        fallback_result = OCRResult(
            success=False,
            full_text='',
            text_blocks=[],
            confidence=0.0,
            error_message='OCR failed after retries, using empty text fallback'
        )
        
        fallback_config = FallbackConfig(
            enable_fallback=True,
            fallback_value=fallback_result,
            log_fallback=True
        )
        
        result = await self.ocr_retry_handler.execute_with_retry(
            ocr_operation,
            fallback_config
        )
        
        return result.value if result.success else fallback_result
    
    async def _analyze_resume_with_fallback(
        self,
        extracted_text: str,
        options: dict
    ) -> dict:
        """
        Analyze resume with fallback to default profile on failure.
        
        Requirements: 4.4, 6.4
        """
        try:
            return await self._analyze_resume(extracted_text, options)
        except Exception as e:
            logger.warning(f"Resume analysis failed, using fallback: {e}")
            return self.error_recovery_service.get_default_fallback_profile()
    
    async def _select_components_with_fallback(
        self,
        candidate_profile: dict,
        options: dict
    ) -> list[dict]:
        """
        Select components with fallback to default selection on failure.
        
        Requirements: 4.4, 6.4
        """
        try:
            return await self._select_components(candidate_profile, options)
        except Exception as e:
            logger.warning(f"Component selection failed, using fallback: {e}")
            return self.error_recovery_service.get_default_fallback_components()
    
    @sync_to_async
    def _update_resume_ocr(self, resume: Resume, ocr_result: OCRResult):
        """Update resume with OCR results"""
        resume.extracted_text = ocr_result.full_text
        resume.ocr_confidence = ocr_result.confidence
        resume.save(update_fields=['extracted_text', 'ocr_confidence', 'updated_at'])
    
    async def _analyze_resume(
        self,
        extracted_text: str,
        options: dict
    ) -> dict:
        """
        Analyze resume content and extract candidate profile.
        
        This is a fallback implementation. The full AI analysis
        will be implemented in task 4.
        
        Requirements: 1.2, 4.4, 6.4
        """
        # Fallback: Return default profile
        # TODO: Integrate with Gemini Pro AI in task 4
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
            'extractedText': extracted_text,
            'confidence': 0.5,
            'summary': 'Professional portfolio generated from resume.',
            'achievements': [
                {'id': '1', 'label': 'Years Experience', 'value': '5+'},
                {'id': '2', 'label': 'Projects', 'value': '10+'},
            ]
        }
    
    async def _select_components(
        self,
        candidate_profile: dict,
        options: dict
    ) -> list[dict]:
        """
        Select UI components based on candidate profile.
        
        This is a fallback implementation. The full AI-driven
        component selection will be implemented in task 4.
        
        Requirements: 1.3, 4.4, 6.4
        """
        category = candidate_profile.get(
            'professionalCategory',
            ProfessionalCategory.HYBRID.value
        )
        
        # Component selection based on professional category
        if category == ProfessionalCategory.CREATIVE.value:
            return self._get_creative_components(candidate_profile)
        elif category == ProfessionalCategory.TECHNICAL.value:
            return self._get_technical_components(candidate_profile)
        elif category == ProfessionalCategory.CORPORATE.value:
            return self._get_corporate_components(candidate_profile)
        else:
            return self._get_hybrid_components(candidate_profile)
    
    def _get_creative_components(self, profile: dict) -> list[dict]:
        """Get component selection for creative professionals"""
        return [
            {
                'type': ComponentType.HERO_PRISM.value,
                'props': {
                    'theme': 'sunset',
                    'title': profile.get('title', 'Creative Professional'),
                    'name': profile.get('name', 'Portfolio User'),
                    'subtitle': profile.get('summary', ''),
                },
                'order': 0,
                'theme': 'sunset'
            },
            {
                'type': ComponentType.EXP_MASONRY.value,
                'props': {
                    'experiences': profile.get('experience', []),
                    'projects': profile.get('projects', []),
                },
                'order': 1,
                'theme': ''
            },
            {
                'type': ComponentType.SKILLS_DOTS.value,
                'props': {
                    'skills': profile.get('skills', []),
                    'maxLevel': 5,
                },
                'order': 2,
                'theme': ''
            },
            {
                'type': ComponentType.STATS_BENTO.value,
                'props': {
                    'achievements': profile.get('achievements', []),
                },
                'order': 3,
                'theme': ''
            },
        ]
    
    def _get_technical_components(self, profile: dict) -> list[dict]:
        """Get component selection for technical professionals"""
        return [
            {
                'type': ComponentType.HERO_TERMINAL.value,
                'props': {
                    'theme': 'matrix',
                    'commands': [
                        f'whoami -> {profile.get("name", "developer")}',
                        f'cat title.txt -> {profile.get("title", "Software Engineer")}',
                        'ls skills/ -> [loading...]',
                    ],
                    'name': profile.get('name', 'Developer'),
                    'title': profile.get('title', 'Software Engineer'),
                },
                'order': 0,
                'theme': 'matrix'
            },
            {
                'type': ComponentType.EXP_TIMELINE.value,
                'props': {
                    'experiences': profile.get('experience', []),
                },
                'order': 1,
                'theme': ''
            },
            {
                'type': ComponentType.SKILLS_RADAR.value,
                'props': {
                    'skills': profile.get('skills', []),
                },
                'order': 2,
                'theme': ''
            },
            {
                'type': ComponentType.STATS_BENTO.value,
                'props': {
                    'achievements': profile.get('achievements', []),
                },
                'order': 3,
                'theme': ''
            },
        ]
    
    def _get_corporate_components(self, profile: dict) -> list[dict]:
        """Get component selection for corporate professionals"""
        return [
            {
                'type': ComponentType.HERO_PRISM.value,
                'props': {
                    'theme': 'ocean',
                    'title': profile.get('title', 'Professional'),
                    'name': profile.get('name', 'Portfolio User'),
                    'subtitle': profile.get('summary', ''),
                },
                'order': 0,
                'theme': 'ocean'
            },
            {
                'type': ComponentType.EXP_TIMELINE.value,
                'props': {
                    'experiences': profile.get('experience', []),
                },
                'order': 1,
                'theme': ''
            },
            {
                'type': ComponentType.SKILLS_RADAR.value,
                'props': {
                    'skills': profile.get('skills', []),
                },
                'order': 2,
                'theme': ''
            },
            {
                'type': ComponentType.STATS_BENTO.value,
                'props': {
                    'achievements': profile.get('achievements', []),
                },
                'order': 3,
                'theme': ''
            },
        ]
    
    def _get_hybrid_components(self, profile: dict) -> list[dict]:
        """Get component selection for hybrid professionals"""
        return [
            {
                'type': ComponentType.HERO_PRISM.value,
                'props': {
                    'theme': 'ocean',
                    'title': profile.get('title', 'Professional'),
                    'name': profile.get('name', 'Portfolio User'),
                    'subtitle': profile.get('summary', ''),
                },
                'order': 0,
                'theme': 'ocean'
            },
            {
                'type': ComponentType.EXP_TIMELINE.value,
                'props': {
                    'experiences': profile.get('experience', []),
                },
                'order': 1,
                'theme': ''
            },
            {
                'type': ComponentType.SKILLS_RADAR.value,
                'props': {
                    'skills': profile.get('skills', []),
                },
                'order': 2,
                'theme': ''
            },
            {
                'type': ComponentType.STATS_BENTO.value,
                'props': {
                    'achievements': profile.get('achievements', []),
                },
                'order': 3,
                'theme': ''
            },
        ]
    
    def _select_theme(self, candidate_profile: dict, options: dict) -> str:
        """Select theme based on profile and options"""
        theme_pref = options.get('theme_preference', 'auto')
        
        if theme_pref != 'auto':
            return theme_pref
        
        category = candidate_profile.get(
            'professionalCategory',
            ProfessionalCategory.HYBRID.value
        )
        
        theme_map = {
            ProfessionalCategory.CREATIVE.value: ThemePalette.CYBER_PINK.value,
            ProfessionalCategory.TECHNICAL.value: ThemePalette.NEON_BLUE.value,
            ProfessionalCategory.CORPORATE.value: ThemePalette.EMERALD_GREEN.value,
            ProfessionalCategory.HYBRID.value: ThemePalette.NEON_BLUE.value,
        }
        
        return theme_map.get(category, ThemePalette.NEON_BLUE.value)
    
    @sync_to_async
    def _save_components(
        self,
        processing_result: ProcessingResult,
        components: list[dict]
    ):
        """Save component selections to database"""
        for comp in components:
            ComponentSelection.objects.create(
                processing_result=processing_result,
                component_type=comp['type'],
                order=comp['order'],
                props=comp['props'],
                theme=comp.get('theme', '')
            )
    
    @sync_to_async
    def _update_processing_result_profile(
        self,
        processing_result: ProcessingResult,
        candidate_profile: dict,
        theme: str
    ):
        """Update processing result with candidate profile"""
        processing_result.candidate_name = candidate_profile.get('name', '')
        processing_result.candidate_title = candidate_profile.get('title', '')
        processing_result.professional_category = candidate_profile.get(
            'professionalCategory',
            ProfessionalCategory.HYBRID.value
        )
        processing_result.ai_confidence = candidate_profile.get('confidence', 0.5)
        processing_result.skills = candidate_profile.get('skills', [])
        processing_result.experience = candidate_profile.get('experience', [])
        processing_result.education = candidate_profile.get('education', [])
        processing_result.projects = candidate_profile.get('projects', [])
        processing_result.contact_info = candidate_profile.get('contact', {})
        processing_result.achievements = candidate_profile.get('achievements', [])
        processing_result.summary = candidate_profile.get('summary', '')
        processing_result.selected_theme = theme
        processing_result.save()
    
    @sync_to_async
    def _complete_processing(
        self,
        processing_result: ProcessingResult,
        processing_time_ms: int
    ):
        """Mark processing as complete"""
        from django.utils import timezone
        processing_result.status = ProcessingStatus.COMPLETE
        processing_result.progress = 100
        processing_result.status_message = 'Processing complete'
        processing_result.processing_time_ms = processing_time_ms
        processing_result.completed_at = timezone.now()
        processing_result.save()


# Convenience function for simple usage
async def process_resume(
    file_content: bytes,
    filename: str,
    content_type: Optional[str] = None,
    options: Optional[dict] = None,
    progress_callback: Optional[Callable] = None,
    client_identifier: Optional[str] = None
) -> PipelineResult:
    """
    Process a resume file through the complete pipeline.
    
    Args:
        file_content: Raw file bytes
        filename: Original filename
        content_type: MIME type (optional)
        options: Processing options
        progress_callback: Optional callback for progress updates
        client_identifier: Client identifier for rate limiting
        
    Returns:
        PipelineResult with processing outcome
    """
    pipeline = PipelineService()
    
    if progress_callback:
        pipeline.add_progress_callback(progress_callback)
    
    return await pipeline.process(
        file_content=file_content,
        filename=filename,
        content_type=content_type,
        options=options,
        client_identifier=client_identifier
    )
