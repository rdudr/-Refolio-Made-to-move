"""
Portfolio Models
Defines data models for resume processing and portfolio generation
Requirements: 1.1, 1.4
"""

import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, FileExtensionValidator


class ProfessionalCategory(models.TextChoices):
    """Professional category classification for candidates"""
    CREATIVE = 'creative', 'Creative'
    TECHNICAL = 'technical', 'Technical'
    CORPORATE = 'corporate', 'Corporate'
    HYBRID = 'hybrid', 'Hybrid'


class ComponentType(models.TextChoices):
    """Available UI component types mapped to AI tool calls"""
    HERO_PRISM = 'tool_hero_prism', 'Hero Prism'
    HERO_TERMINAL = 'tool_hero_terminal', 'Hero Terminal'
    EXP_TIMELINE = 'tool_exp_timeline', 'Experience Timeline'
    EXP_MASONRY = 'tool_exp_masonry', 'Experience Masonry'
    SKILLS_DOTS = 'tool_skills_dots', 'Skills Dots'
    SKILLS_RADAR = 'tool_skills_radar', 'Skills Radar'
    STATS_BENTO = 'tool_stats_bento', 'Stats Bento'


class ThemePalette(models.TextChoices):
    """Available theme palettes for portfolio styling"""
    NEON_BLUE = 'neon_blue', 'Neon Blue'
    EMERALD_GREEN = 'emerald_green', 'Emerald Green'
    CYBER_PINK = 'cyber_pink', 'Cyber Pink'


class ProcessingStatus(models.TextChoices):
    """Status of resume processing"""
    PENDING = 'pending', 'Pending'
    UPLOADING = 'uploading', 'Uploading'
    OCR_PROCESSING = 'ocr_processing', 'OCR Processing'
    AI_ANALYSIS = 'ai_analysis', 'AI Analysis'
    COMPONENT_SELECTION = 'component_selection', 'Component Selection'
    LAYOUT_GENERATION = 'layout_generation', 'Layout Generation'
    COMPLETE = 'complete', 'Complete'
    ERROR = 'error', 'Error'


def resume_upload_path(instance, filename):
    """Generate upload path for resume files"""
    return f'resumes/{instance.id}/{filename}'



class Resume(models.Model):
    """
    Model for storing uploaded resume files and extracted content
    Requirements: 1.1, 6.1, 6.2
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # File storage
    file = models.FileField(
        upload_to=resume_upload_path,
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'png', 'jpg', 'jpeg'])
        ],
        help_text='Resume file (PDF or image)'
    )
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10)  # pdf, png, jpg, jpeg
    file_size = models.PositiveIntegerField(help_text='File size in bytes')
    
    # Extracted content
    extracted_text = models.TextField(blank=True, default='')
    ocr_confidence = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text='OCR confidence score (0-1)'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Resume'
        verbose_name_plural = 'Resumes'
    
    def __str__(self):
        return f"Resume {self.id} - {self.original_filename}"
    
    def clean(self):
        """Validate file size (max 10MB)"""
        from django.core.exceptions import ValidationError
        max_size = 10 * 1024 * 1024  # 10MB
        if self.file and self.file.size > max_size:
            raise ValidationError(f'File size must be under 10MB. Current size: {self.file.size} bytes')


class ProcessingResult(models.Model):
    """
    Model for storing resume analysis and processing results
    Requirements: 1.2, 1.4, 4.1
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resume = models.OneToOneField(
        Resume,
        on_delete=models.CASCADE,
        related_name='processing_result'
    )
    
    # Processing status
    status = models.CharField(
        max_length=20,
        choices=ProcessingStatus.choices,
        default=ProcessingStatus.PENDING
    )
    progress = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text='Processing progress percentage (0-100)'
    )
    status_message = models.CharField(max_length=255, blank=True, default='')
    
    # Candidate profile data
    candidate_name = models.CharField(max_length=255, blank=True, default='')
    candidate_title = models.CharField(max_length=255, blank=True, default='')
    professional_category = models.CharField(
        max_length=20,
        choices=ProfessionalCategory.choices,
        default=ProfessionalCategory.HYBRID
    )
    ai_confidence = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text='AI analysis confidence score (0-1)'
    )
    
    # Structured data (JSON fields)
    skills = models.JSONField(default=list, blank=True)
    experience = models.JSONField(default=list, blank=True)
    education = models.JSONField(default=list, blank=True)
    projects = models.JSONField(default=list, blank=True)
    contact_info = models.JSONField(default=dict, blank=True)
    achievements = models.JSONField(default=list, blank=True)
    summary = models.TextField(blank=True, default='')
    
    # Theme selection
    selected_theme = models.CharField(
        max_length=20,
        choices=ThemePalette.choices,
        default=ThemePalette.NEON_BLUE
    )
    
    # Processing metrics
    processing_time_ms = models.PositiveIntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True, default='')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Processing Result'
        verbose_name_plural = 'Processing Results'
    
    def __str__(self):
        return f"Result {self.id} - {self.candidate_name or 'Unknown'} ({self.status})"



class ComponentSelection(models.Model):
    """
    Model for storing AI-selected UI components for a portfolio
    Requirements: 1.3, 4.2, 5.1
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    processing_result = models.ForeignKey(
        ProcessingResult,
        on_delete=models.CASCADE,
        related_name='component_selections'
    )
    
    # Component configuration
    component_type = models.CharField(
        max_length=30,
        choices=ComponentType.choices
    )
    order = models.PositiveIntegerField(
        default=0,
        help_text='Display order of the component'
    )
    props = models.JSONField(
        default=dict,
        blank=True,
        help_text='Component-specific configuration props'
    )
    theme = models.CharField(
        max_length=50,
        blank=True,
        default='',
        help_text='Component-specific theme override'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order']
        verbose_name = 'Component Selection'
        verbose_name_plural = 'Component Selections'
        unique_together = [['processing_result', 'order']]
    
    def __str__(self):
        return f"{self.get_component_type_display()} (Order: {self.order})"
    
    def clean(self):
        """Validate component props based on component type"""
        from django.core.exceptions import ValidationError
        
        # Basic validation - ensure props is a dict
        if not isinstance(self.props, dict):
            raise ValidationError({'props': 'Props must be a dictionary'})
        
        # Component-specific validation
        required_props = {
            ComponentType.HERO_PRISM: ['title', 'name'],
            ComponentType.HERO_TERMINAL: ['commands', 'name', 'title'],
            ComponentType.EXP_TIMELINE: ['experiences'],
            ComponentType.EXP_MASONRY: ['experiences'],
            ComponentType.SKILLS_DOTS: ['skills'],
            ComponentType.SKILLS_RADAR: ['skills'],
            ComponentType.STATS_BENTO: ['achievements'],
        }
        
        if self.component_type in required_props:
            missing = [p for p in required_props[self.component_type] if p not in self.props]
            if missing:
                raise ValidationError({
                    'props': f'Missing required props for {self.component_type}: {", ".join(missing)}'
                })
