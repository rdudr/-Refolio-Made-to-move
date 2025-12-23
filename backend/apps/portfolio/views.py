"""
Portfolio Views
Async API endpoints for resume processing and portfolio generation
Requirements: 1.1, 1.4, 7.1
"""

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime
from typing import AsyncGenerator, Optional

from django.http import StreamingHttpResponse, JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from asgiref.sync import sync_to_async

from .models import (
    Resume,
    ProcessingResult,
    ComponentSelection,
    ProcessingStatus,
    ProfessionalCategory,
    ThemePalette,
    ComponentType,
)
from .serializers import (
    FileUploadSerializer,
    GenerateLayoutResponseSerializer,
    ProcessingProgressSerializer,
    ApiErrorSerializer,
)
from .services.file_validation_service import FileValidationService
from .services.ocr_service import OCRService
from .services.gemini_extraction_service import (
    GeminiExtractionService,
    get_extraction_service,
    ExtractionError,
)
from .services.input_sanitization_service import (
    InputSanitizationService,
    get_sanitization_service,
    SanitizationError,
)

logger = logging.getLogger(__name__)


class ProgressEmitter:
    """
    Utility class for emitting progress events during processing.
    Supports both callback-based and SSE-based progress reporting.
    
    Requirements: 7.1
    """
    
    def __init__(self, processing_result: Optional[ProcessingResult] = None):
        self.processing_result = processing_result
        self.events: list[dict] = []
        self._callbacks: list[callable] = []
    
    def add_callback(self, callback: callable):
        """Add a callback to be called on progress updates"""
        self._callbacks.append(callback)
    
    async def emit(
        self,
        stage: ProcessingStatus,
        progress: int,
        message: str
    ) -> dict:
        """
        Emit a progress event.
        
        Args:
            stage: Current processing stage
            progress: Progress percentage (0-100)
            message: Human-readable status message
            
        Returns:
            The emitted event dict
        """
        event = {
            'stage': stage.value if hasattr(stage, 'value') else stage,
            'progress': min(100, max(0, progress)),
            'message': message,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
        
        self.events.append(event)
        
        # Update processing result if available
        if self.processing_result:
            await self._update_processing_result(stage, progress, message)
        
        # Call registered callbacks
        for callback in self._callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(event)
                else:
                    callback(event)
            except Exception as e:
                logger.warning(f"Progress callback error: {e}")
        
        return event
    
    @sync_to_async
    def _update_processing_result(
        self,
        stage: ProcessingStatus,
        progress: int,
        message: str
    ):
        """Update the ProcessingResult model with current progress"""
        if self.processing_result and self.processing_result.pk:
            self.processing_result.status = stage
            self.processing_result.progress = progress
            self.processing_result.status_message = message
            self.processing_result.save(
                update_fields=['status', 'progress', 'status_message', 'updated_at']
            )
    
    def get_events(self) -> list[dict]:
        """Get all emitted events"""
        return self.events.copy()
    
    def format_sse(self, event: dict) -> str:
        """Format an event for Server-Sent Events"""
        return f"data: {json.dumps(event)}\n\n"


class GenerateLayoutView(APIView):
    """
    Async endpoint for generating portfolio layout from resume.
    
    POST /api/generate-layout
    
    Accepts multipart form data with:
    - file: Resume file (PDF, PNG, JPG, JPEG)
    - options: Optional JSON with theme_preference and component_style
    
    Returns:
    - components: List of selected UI components with props
    - theme: Selected theme palette
    - metadata: Processing metadata
    - candidateProfile: Extracted candidate information
    
    Requirements: 1.1, 1.4, 7.1, 6.4
    """
    
    parser_classes = [MultiPartParser, FormParser]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.sanitization_service = get_sanitization_service()
    
    async def post(self, request):
        """Handle resume upload and generate portfolio layout"""
        start_time = time.time()
        
        # Get client identifier for rate limiting
        client_id = self.sanitization_service.get_client_identifier(request)
        
        # Check rate limit
        rate_limit_result = self.sanitization_service.check_rate_limit(client_id)
        if not rate_limit_result.allowed:
            return Response(
                {
                    'success': False,
                    'error': {
                        'error': 'Rate limit exceeded',
                        'code': 'RATE_LIMITED',
                        'details': {
                            'retry_after_seconds': rate_limit_result.retry_after_seconds,
                            'reset_time': rate_limit_result.reset_time.isoformat() + 'Z'
                        }
                    }
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={
                    'Retry-After': str(rate_limit_result.retry_after_seconds),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': rate_limit_result.reset_time.isoformat() + 'Z'
                }
            )
        
        # Validate request headers
        headers_valid, headers_error = self.sanitization_service.validate_request_headers(request)
        if not headers_valid:
            # Block suspicious clients
            self.sanitization_service.block_identifier(client_id, duration_seconds=600)
            return Response(
                {
                    'success': False,
                    'error': {
                        'error': headers_error,
                        'code': 'SUSPICIOUS_REQUEST',
                        'details': {}
                    }
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate request
        serializer = FileUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    'success': False,
                    'error': {
                        'error': 'Validation failed',
                        'code': 'VALIDATION_ERROR',
                        'details': serializer.errors
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        uploaded_file = serializer.validated_data['file']
        options = serializer.validated_data.get('options', {})
        
        try:
            # Read file content
            file_content = uploaded_file.read()
            uploaded_file.seek(0)
            
            # Comprehensive content validation
            content_validation = self.sanitization_service.validate_content(
                content=file_content,
                filename=uploaded_file.name,
                declared_content_type=uploaded_file.content_type,
                identifier=client_id
            )
            
            if not content_validation.is_valid:
                return Response(
                    {
                        'success': False,
                        'error': {
                            'error': content_validation.error_message,
                            'code': content_validation.error.value,
                            'details': content_validation.to_dict()
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Sanitize options
            options_result = self.sanitization_service.validate_options(options)
            sanitized_options = options_result.sanitized_value if options_result.is_safe else {}
            
            # Validate file content structure
            file_validator = FileValidationService()
            validation_result = file_validator.validate_file(
                content=file_content,
                filename=uploaded_file.name,
                declared_content_type=uploaded_file.content_type
            )
            
            if not validation_result.is_valid:
                return Response(
                    {
                        'success': False,
                        'error': {
                            'error': validation_result.error_message,
                            'code': validation_result.error.value,
                            'details': validation_result.to_dict()
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create Resume record
            resume = await self._create_resume(
                file_content=file_content,
                filename=uploaded_file.name,
                file_type=validation_result.file_type,
                file_size=validation_result.file_size
            )
            
            # Create ProcessingResult record
            processing_result = await self._create_processing_result(resume)
            
            # Initialize progress emitter
            emitter = ProgressEmitter(processing_result)
            
            # Run the processing pipeline
            result = await self._process_resume(
                resume=resume,
                processing_result=processing_result,
                file_content=file_content,
                file_type=validation_result.file_type,
                options=options,
                emitter=emitter
            )
            
            # Calculate processing time
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            # Update processing result with completion
            await self._complete_processing(
                processing_result=processing_result,
                processing_time_ms=processing_time_ms
            )
            
            # Build response
            response_data = self._build_response(
                processing_result=processing_result,
                result=result,
                processing_time_ms=processing_time_ms
            )
            
            return Response({
                'success': True,
                'data': response_data
            })
            
        except Exception as e:
            logger.exception(f"Error processing resume: {e}")
            return Response(
                {
                    'success': False,
                    'error': {
                        'error': str(e),
                        'code': 'PROCESSING_ERROR',
                        'details': {}
                    }
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @sync_to_async
    def _create_resume(
        self,
        file_content: bytes,
        filename: str,
        file_type: str,
        file_size: int
    ) -> Resume:
        """Create a Resume record in the database"""
        resume = Resume(
            original_filename=filename,
            file_type=file_type,
            file_size=file_size
        )
        # Note: We're not saving the file to disk for now
        # In production, you'd save to cloud storage
        resume.save()
        return resume
    
    @sync_to_async
    def _create_processing_result(self, resume: Resume) -> ProcessingResult:
        """Create a ProcessingResult record"""
        result = ProcessingResult(
            resume=resume,
            status=ProcessingStatus.PENDING,
            progress=0,
            status_message='Processing started'
        )
        result.save()
        return result
    
    async def _process_resume(
        self,
        resume: Resume,
        processing_result: ProcessingResult,
        file_content: bytes,
        file_type: str,
        options: dict,
        emitter: ProgressEmitter
    ) -> dict:
        """
        Main processing pipeline for resume analysis.
        
        Requirements: 1.1, 1.2, 1.3, 1.4
        """
        result = {
            'extracted_text': '',
            'candidate_profile': {},
            'components': [],
            'theme': ThemePalette.NEON_BLUE.value
        }
        
        # Stage 1: OCR Processing
        await emitter.emit(
            ProcessingStatus.OCR_PROCESSING,
            10,
            'Extracting text from resume...'
        )
        
        ocr_result = await self._run_ocr(file_content, file_type)
        
        if not ocr_result.success:
            # Fallback: Use empty text and continue with defaults
            await emitter.emit(
                ProcessingStatus.OCR_PROCESSING,
                20,
                f'OCR warning: {ocr_result.error_message}. Using fallback.'
            )
            result['extracted_text'] = ''
        else:
            result['extracted_text'] = ocr_result.full_text
            await self._update_resume_text(resume, ocr_result)
        
        await emitter.emit(
            ProcessingStatus.OCR_PROCESSING,
            30,
            'Text extraction complete'
        )
        
        # Stage 2: AI Analysis (placeholder - will be implemented in task 4)
        await emitter.emit(
            ProcessingStatus.AI_ANALYSIS,
            40,
            'Analyzing professional profile...'
        )
        
        # For now, use fallback analysis
        candidate_profile = await self._analyze_resume_fallback(
            result['extracted_text'],
            options
        )
        result['candidate_profile'] = candidate_profile
        
        await emitter.emit(
            ProcessingStatus.AI_ANALYSIS,
            60,
            'Profile analysis complete'
        )
        
        # Stage 3: Component Selection (placeholder - will be implemented in task 4)
        await emitter.emit(
            ProcessingStatus.COMPONENT_SELECTION,
            70,
            'Selecting UI components...'
        )
        
        components = await self._select_components_fallback(
            candidate_profile,
            options
        )
        result['components'] = components
        
        await emitter.emit(
            ProcessingStatus.COMPONENT_SELECTION,
            80,
            'Component selection complete'
        )
        
        # Stage 4: Theme Selection
        await emitter.emit(
            ProcessingStatus.LAYOUT_GENERATION,
            90,
            'Generating layout...'
        )
        
        theme = self._select_theme(candidate_profile, options)
        result['theme'] = theme
        
        # Save components to database
        await self._save_components(processing_result, components)
        
        # Update processing result with profile data
        await self._update_processing_result_profile(
            processing_result,
            candidate_profile,
            theme
        )
        
        await emitter.emit(
            ProcessingStatus.COMPLETE,
            100,
            'Portfolio generation complete'
        )
        
        return result
    
    @sync_to_async
    def _run_ocr(self, file_content: bytes, file_type: str):
        """Run OCR on the file content"""
        ocr_service = OCRService()
        return ocr_service.extract_text_from_bytes(
            content=file_content,
            file_type=file_type,
            filename='upload'
        )
    
    @sync_to_async
    def _update_resume_text(self, resume: Resume, ocr_result):
        """Update resume with extracted text"""
        resume.extracted_text = ocr_result.full_text
        resume.ocr_confidence = ocr_result.confidence
        resume.save(update_fields=['extracted_text', 'ocr_confidence', 'updated_at'])
    
    async def _analyze_resume_fallback(
        self,
        extracted_text: str,
        options: dict
    ) -> dict:
        """
        Fallback resume analysis when AI is not available.
        Returns a default candidate profile.
        
        Requirements: 4.4, 6.4
        """
        # Default fallback profile
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
    
    async def _select_components_fallback(
        self,
        candidate_profile: dict,
        options: dict
    ) -> list[dict]:
        """
        Fallback component selection when AI is not available.
        Returns a default set of components based on professional category.
        
        Requirements: 4.4, 6.4
        """
        category = candidate_profile.get(
            'professionalCategory',
            ProfessionalCategory.HYBRID.value
        )
        
        # Default component selections based on category
        if category == ProfessionalCategory.CREATIVE.value:
            return [
                {
                    'type': ComponentType.HERO_PRISM.value,
                    'props': {
                        'theme': 'ocean',
                        'title': candidate_profile.get('title', 'Creative Professional'),
                        'name': candidate_profile.get('name', 'Portfolio User'),
                        'subtitle': candidate_profile.get('summary', ''),
                    },
                    'order': 0,
                    'theme': 'ocean'
                },
                {
                    'type': ComponentType.EXP_MASONRY.value,
                    'props': {
                        'experiences': candidate_profile.get('experience', []),
                        'projects': candidate_profile.get('projects', []),
                    },
                    'order': 1,
                    'theme': ''
                },
                {
                    'type': ComponentType.SKILLS_DOTS.value,
                    'props': {
                        'skills': candidate_profile.get('skills', []),
                        'maxLevel': 5,
                    },
                    'order': 2,
                    'theme': ''
                },
                {
                    'type': ComponentType.STATS_BENTO.value,
                    'props': {
                        'achievements': candidate_profile.get('achievements', []),
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
                            f'whoami -> {candidate_profile.get("name", "developer")}',
                            f'cat title.txt -> {candidate_profile.get("title", "Software Engineer")}',
                            'ls skills/ -> [loading...]',
                        ],
                        'name': candidate_profile.get('name', 'Developer'),
                        'title': candidate_profile.get('title', 'Software Engineer'),
                    },
                    'order': 0,
                    'theme': 'matrix'
                },
                {
                    'type': ComponentType.EXP_TIMELINE.value,
                    'props': {
                        'experiences': candidate_profile.get('experience', []),
                    },
                    'order': 1,
                    'theme': ''
                },
                {
                    'type': ComponentType.SKILLS_RADAR.value,
                    'props': {
                        'skills': candidate_profile.get('skills', []),
                    },
                    'order': 2,
                    'theme': ''
                },
                {
                    'type': ComponentType.STATS_BENTO.value,
                    'props': {
                        'achievements': candidate_profile.get('achievements', []),
                    },
                    'order': 3,
                    'theme': ''
                },
            ]
        else:
            # Hybrid/Corporate default
            return [
                {
                    'type': ComponentType.HERO_PRISM.value,
                    'props': {
                        'theme': 'ocean',
                        'title': candidate_profile.get('title', 'Professional'),
                        'name': candidate_profile.get('name', 'Portfolio User'),
                        'subtitle': candidate_profile.get('summary', ''),
                    },
                    'order': 0,
                    'theme': 'ocean'
                },
                {
                    'type': ComponentType.EXP_TIMELINE.value,
                    'props': {
                        'experiences': candidate_profile.get('experience', []),
                    },
                    'order': 1,
                    'theme': ''
                },
                {
                    'type': ComponentType.SKILLS_RADAR.value,
                    'props': {
                        'skills': candidate_profile.get('skills', []),
                    },
                    'order': 2,
                    'theme': ''
                },
                {
                    'type': ComponentType.STATS_BENTO.value,
                    'props': {
                        'achievements': candidate_profile.get('achievements', []),
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
        
        # Auto-select based on professional category
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
        """Update processing result with candidate profile data"""
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
    
    def _build_response(
        self,
        processing_result: ProcessingResult,
        result: dict,
        processing_time_ms: int
    ) -> dict:
        """Build the API response"""
        return {
            'components': result['components'],
            'theme': result['theme'],
            'metadata': {
                'professionalCategory': result['candidate_profile'].get(
                    'professionalCategory',
                    ProfessionalCategory.HYBRID.value
                ),
                'confidence': result['candidate_profile'].get('confidence', 0.5),
                'processingTimeMs': processing_time_ms,
            },
            'candidateProfile': result['candidate_profile']
        }



@method_decorator(csrf_exempt, name='dispatch')
class GenerateLayoutSSEView(View):
    """
    Server-Sent Events endpoint for real-time progress tracking.
    
    POST /api/generate-layout/stream
    
    Returns a stream of progress events during processing.
    
    Requirements: 7.1
    """
    
    def post(self, request):
        """Handle resume upload with SSE progress streaming"""
        
        # Parse multipart form data
        if not request.content_type or 'multipart/form-data' not in request.content_type:
            return JsonResponse(
                {
                    'success': False,
                    'error': {
                        'error': 'Content-Type must be multipart/form-data',
                        'code': 'INVALID_CONTENT_TYPE'
                    }
                },
                status=400
            )
        
        # Get file from request
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return JsonResponse(
                {
                    'success': False,
                    'error': {
                        'error': 'No file provided',
                        'code': 'MISSING_FILE'
                    }
                },
                status=400
            )
        
        # Parse options from form data
        options_str = request.POST.get('options', '{}')
        try:
            options = json.loads(options_str) if options_str else {}
        except json.JSONDecodeError:
            options = {}
        
        # Create streaming response with synchronous generator
        response = StreamingHttpResponse(
            self._process_with_progress_sync(uploaded_file, options),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response
    
    def _process_with_progress_sync(self, uploaded_file, options: dict):
        """
        Process resume and yield SSE events (synchronous version).
        Uses Gemini for OCR and structured data extraction.
        
        Requirements: 7.1
        """
        start_time = time.time()
        
        def format_sse(event: dict) -> str:
            return f"data: {json.dumps(event)}\n\n"
        
        def emit_event(stage, progress, message):
            return {
                'stage': stage.value if hasattr(stage, 'value') else stage,
                'progress': min(100, max(0, progress)),
                'message': message,
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
        
        try:
            # Validate file
            file_validator = FileValidationService()
            file_content = uploaded_file.read()
            
            validation_result = file_validator.validate_file(
                content=file_content,
                filename=uploaded_file.name,
                declared_content_type=uploaded_file.content_type
            )
            
            if not validation_result.is_valid:
                error_event = {
                    'stage': ProcessingStatus.ERROR.value,
                    'progress': 0,
                    'message': validation_result.error_message,
                    'timestamp': datetime.utcnow().isoformat() + 'Z',
                    'error': {
                        'code': validation_result.error.value,
                        'details': validation_result.to_dict()
                    }
                }
                yield format_sse(error_event)
                return
            
            # Emit upload complete
            yield format_sse(emit_event(ProcessingStatus.UPLOADING, 5, 'File uploaded successfully'))
            
            # Create database records
            resume = self._create_resume_sync(
                file_content=file_content,
                filename=uploaded_file.name,
                file_type=validation_result.file_type,
                file_size=validation_result.file_size
            )
            
            processing_result = self._create_processing_result_sync(resume)
            
            # Gemini Extraction (OCR + AI Analysis combined)
            yield format_sse(emit_event(ProcessingStatus.OCR_PROCESSING, 10, 'Extracting text from resume...'))
            
            extraction_service = get_extraction_service()
            extraction_result = extraction_service.extract_from_file(
                file_content=file_content,
                filename=uploaded_file.name,
                file_type=validation_result.file_type
            )
            
            if extraction_result.success:
                # Use Gemini-extracted data
                candidate_profile = extraction_result.candidate_profile
                extracted_text = extraction_result.extracted_text
                
                # Log extracted data for debugging
                logger.info("=" * 60)
                logger.info("EXTRACTED TEXT:")
                logger.info("=" * 60)
                logger.info(extracted_text[:2000] if extracted_text else "No text extracted")
                logger.info("=" * 60)
                logger.info("CANDIDATE PROFILE:")
                logger.info(f"Name: {candidate_profile.get('name')}")
                logger.info(f"Title: {candidate_profile.get('title')}")
                logger.info(f"Category: {candidate_profile.get('professionalCategory')}")
                logger.info(f"Skills: {candidate_profile.get('skills')}")
                logger.info(f"Experience: {candidate_profile.get('experience')}")
                logger.info(f"Confidence: {candidate_profile.get('confidence')}")
                logger.info("=" * 60)
                
                # Update resume with extracted text
                resume.extracted_text = extracted_text
                resume.ocr_confidence = extraction_result.confidence
                resume.save(update_fields=['extracted_text', 'ocr_confidence', 'updated_at'])
                
                yield format_sse(emit_event(ProcessingStatus.OCR_PROCESSING, 30, 'Text extraction complete'))
                yield format_sse(emit_event(ProcessingStatus.AI_ANALYSIS, 40, 'Analyzing professional profile...'))
                yield format_sse(emit_event(ProcessingStatus.AI_ANALYSIS, 60, f'Profile analyzed: {candidate_profile.get("professionalCategory", "hybrid")} professional'))
            else:
                # Fallback to basic analysis
                logger.warning(f"Extraction failed: {extraction_result.error_message}")
                yield format_sse(emit_event(ProcessingStatus.OCR_PROCESSING, 30, f'Extraction warning: {extraction_result.error_message}. Using fallback.'))
                yield format_sse(emit_event(ProcessingStatus.AI_ANALYSIS, 40, 'Analyzing professional profile...'))
                
                candidate_profile = self._analyze_resume_fallback_sync('', options)
                
                yield format_sse(emit_event(ProcessingStatus.AI_ANALYSIS, 60, 'Profile analysis complete'))
            
            # Component Selection
            yield format_sse(emit_event(ProcessingStatus.COMPONENT_SELECTION, 70, 'Selecting UI components...'))
            
            components = self._select_components_fallback_sync(candidate_profile, options)
            
            yield format_sse(emit_event(ProcessingStatus.COMPONENT_SELECTION, 80, 'Component selection complete'))
            
            # Layout Generation
            yield format_sse(emit_event(ProcessingStatus.LAYOUT_GENERATION, 90, 'Generating layout...'))
            
            theme = self._select_theme(candidate_profile, options)
            
            # Save to database
            self._save_components_sync(processing_result, components)
            self._update_processing_result_profile_sync(processing_result, candidate_profile, theme)
            
            processing_time_ms = int((time.time() - start_time) * 1000)
            self._complete_processing_sync(processing_result, processing_time_ms)
            
            # Final completion event with full result
            complete_event = {
                'stage': ProcessingStatus.COMPLETE.value,
                'progress': 100,
                'message': 'Portfolio generation complete',
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'result': {
                    'components': components,
                    'theme': theme,
                    'metadata': {
                        'professionalCategory': candidate_profile.get(
                            'professionalCategory',
                            ProfessionalCategory.HYBRID.value
                        ),
                        'confidence': candidate_profile.get('confidence', 0.5),
                        'processingTimeMs': processing_time_ms,
                    },
                    'candidateProfile': candidate_profile
                }
            }
            yield format_sse(complete_event)
            
        except Exception as e:
            logger.exception(f"SSE processing error: {e}")
            error_event = {
                'stage': ProcessingStatus.ERROR.value,
                'progress': 0,
                'message': str(e),
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'error': {
                    'code': 'PROCESSING_ERROR',
                    'details': {}
                }
            }
            yield format_sse(error_event)
    
    # Synchronous helper methods
    def _create_resume_sync(self, file_content, filename, file_type, file_size):
        resume = Resume(
            original_filename=filename,
            file_type=file_type,
            file_size=file_size
        )
        resume.save()
        return resume
    
    def _create_processing_result_sync(self, resume):
        result = ProcessingResult(
            resume=resume,
            status=ProcessingStatus.PENDING,
            progress=0,
            status_message='Processing started'
        )
        result.save()
        return result
    
    def _run_ocr_sync(self, file_content, file_type):
        ocr_service = OCRService()
        return ocr_service.extract_text_from_bytes(
            content=file_content,
            file_type=file_type,
            filename='upload'
        )
    
    def _update_resume_text_sync(self, resume, ocr_result):
        resume.extracted_text = ocr_result.full_text
        resume.ocr_confidence = ocr_result.confidence
        resume.save(update_fields=['extracted_text', 'ocr_confidence', 'updated_at'])
    
    def _analyze_resume_fallback_sync(self, extracted_text, options):
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
    
    def _select_components_fallback_sync(self, candidate_profile, options):
        category = candidate_profile.get(
            'professionalCategory',
            ProfessionalCategory.HYBRID.value
        )
        
        # Ensure experiences have data (use placeholder if empty)
        experiences = candidate_profile.get('experience', [])
        if not experiences:
            experiences = [
                {
                    'id': '1',
                    'company': 'Your Company',
                    'title': candidate_profile.get('title', 'Professional'),
                    'startDate': '2020-01',
                    'endDate': 'Present',
                    'description': 'Add your experience details here.',
                    'highlights': ['Key achievement or responsibility']
                }
            ]
        
        # Ensure skills have data
        skills = candidate_profile.get('skills', [])
        if not skills:
            skills = [
                {'name': 'Communication', 'level': 4, 'category': 'Soft Skills'},
                {'name': 'Problem Solving', 'level': 4, 'category': 'Soft Skills'},
                {'name': 'Teamwork', 'level': 4, 'category': 'Soft Skills'},
            ]
        
        # Ensure achievements have data
        achievements = candidate_profile.get('achievements', [])
        if not achievements:
            achievements = [
                {'id': '1', 'label': 'Years Experience', 'value': '5+'},
                {'id': '2', 'label': 'Projects', 'value': '10+'},
            ]
        
        if category == ProfessionalCategory.CREATIVE.value:
            return [
                {
                    'type': ComponentType.HERO_PRISM.value,
                    'props': {
                        'theme': 'ocean',
                        'title': candidate_profile.get('title', 'Creative Professional'),
                        'name': candidate_profile.get('name', 'Portfolio User'),
                        'subtitle': candidate_profile.get('summary', ''),
                    },
                    'order': 0,
                    'theme': 'ocean'
                },
                {
                    'type': ComponentType.EXP_MASONRY.value,
                    'props': {
                        'experiences': experiences,
                        'projects': candidate_profile.get('projects', []),
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
                            f'whoami -> {candidate_profile.get("name", "developer")}',
                            f'cat title.txt -> {candidate_profile.get("title", "Software Engineer")}',
                            'ls skills/ -> [loading...]',
                        ],
                        'name': candidate_profile.get('name', 'Developer'),
                        'title': candidate_profile.get('title', 'Software Engineer'),
                    },
                    'order': 0,
                    'theme': 'matrix'
                },
                {
                    'type': ComponentType.EXP_TIMELINE.value,
                    'props': {
                        'experiences': experiences,
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
            return [
                {
                    'type': ComponentType.HERO_PRISM.value,
                    'props': {
                        'theme': 'ocean',
                        'title': candidate_profile.get('title', 'Professional'),
                        'name': candidate_profile.get('name', 'Portfolio User'),
                        'subtitle': candidate_profile.get('summary', ''),
                    },
                    'order': 0,
                    'theme': 'ocean'
                },
                {
                    'type': ComponentType.EXP_TIMELINE.value,
                    'props': {
                        'experiences': experiences,
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
    
    def _select_theme(self, candidate_profile, options):
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
    
    def _save_components_sync(self, processing_result, components):
        for comp in components:
            ComponentSelection.objects.create(
                processing_result=processing_result,
                component_type=comp['type'],
                order=comp['order'],
                props=comp['props'],
                theme=comp.get('theme', '')
            )
    
    def _update_processing_result_profile_sync(self, processing_result, candidate_profile, theme):
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
    
    def _complete_processing_sync(self, processing_result, processing_time_ms):
        from django.utils import timezone
        processing_result.status = ProcessingStatus.COMPLETE
        processing_result.progress = 100
        processing_result.status_message = 'Processing complete'
        processing_result.processing_time_ms = processing_time_ms
        processing_result.completed_at = timezone.now()
        processing_result.save()


class ProcessingStatusView(APIView):
    """
    Endpoint to check processing status by ID.
    
    GET /api/processing-status/<uuid:processing_id>
    
    Requirements: 7.1
    """
    
    async def get(self, request, processing_id):
        """Get processing status"""
        try:
            result = await self._get_processing_result(processing_id)
            
            if not result:
                return Response(
                    {
                        'success': False,
                        'error': {
                            'error': 'Processing result not found',
                            'code': 'NOT_FOUND'
                        }
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
            
            return Response({
                'success': True,
                'data': {
                    'id': str(result.id),
                    'status': result.status,
                    'progress': result.progress,
                    'message': result.status_message,
                    'processingTimeMs': result.processing_time_ms,
                    'completedAt': result.completed_at.isoformat() if result.completed_at else None,
                }
            })
            
        except Exception as e:
            logger.exception(f"Error getting processing status: {e}")
            return Response(
                {
                    'success': False,
                    'error': {
                        'error': str(e),
                        'code': 'SERVER_ERROR'
                    }
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @sync_to_async
    def _get_processing_result(self, processing_id):
        try:
            return ProcessingResult.objects.get(id=processing_id)
        except ProcessingResult.DoesNotExist:
            return None
