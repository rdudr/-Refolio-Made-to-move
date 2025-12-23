"""
Portfolio Serializers
DRF serializers for API request/response handling
Requirements: 1.1, 1.4, 7.1
"""

from rest_framework import serializers
from .models import (
    Resume,
    ProcessingResult,
    ComponentSelection,
    ProfessionalCategory,
    ComponentType,
    ThemePalette,
    ProcessingStatus,
)


class GenerateLayoutOptionsSerializer(serializers.Serializer):
    """Serializer for layout generation options"""
    theme_preference = serializers.ChoiceField(
        choices=[('auto', 'Auto')] + list(ThemePalette.choices),
        default='auto',
        required=False
    )
    component_style = serializers.ChoiceField(
        choices=[
            ('modern', 'Modern'),
            ('classic', 'Classic'),
            ('minimal', 'Minimal'),
        ],
        default='modern',
        required=False
    )


class FileUploadSerializer(serializers.Serializer):
    """Serializer for file upload validation"""
    file = serializers.FileField(required=True)
    options = GenerateLayoutOptionsSerializer(required=False)
    
    def validate_file(self, value):
        """Validate uploaded file"""
        # Check file size (10MB max)
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                f'File size exceeds maximum of 10MB. Current size: {value.size / (1024*1024):.1f}MB'
            )
        
        # Check file extension
        allowed_extensions = {'pdf', 'png', 'jpg', 'jpeg'}
        ext = value.name.rsplit('.', 1)[-1].lower() if '.' in value.name else ''
        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                f'Unsupported file format: .{ext}. Supported: PDF, PNG, JPG, JPEG'
            )
        
        return value


class SkillSerializer(serializers.Serializer):
    """Serializer for skill data"""
    name = serializers.CharField(max_length=100)
    level = serializers.IntegerField(min_value=1, max_value=100)
    category = serializers.CharField(max_length=50, required=False, allow_blank=True)


class ExperienceSerializer(serializers.Serializer):
    """Serializer for experience data"""
    id = serializers.CharField(max_length=100)
    title = serializers.CharField(max_length=200)
    company = serializers.CharField(max_length=200)
    location = serializers.CharField(max_length=100, required=False, allow_blank=True)
    startDate = serializers.CharField(max_length=50)
    endDate = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField(max_length=2000)
    highlights = serializers.ListField(
        child=serializers.CharField(max_length=500),
        required=False,
        default=list
    )


class EducationSerializer(serializers.Serializer):
    """Serializer for education data"""
    id = serializers.CharField(max_length=100)
    degree = serializers.CharField(max_length=200)
    institution = serializers.CharField(max_length=200)
    location = serializers.CharField(max_length=100, required=False, allow_blank=True)
    graduationDate = serializers.CharField(max_length=50)
    gpa = serializers.CharField(max_length=20, required=False, allow_blank=True)
    honors = serializers.ListField(
        child=serializers.CharField(max_length=200),
        required=False,
        default=list
    )


class ProjectSerializer(serializers.Serializer):
    """Serializer for project data"""
    id = serializers.CharField(max_length=100)
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(max_length=2000)
    technologies = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        default=list
    )
    url = serializers.URLField(required=False, allow_blank=True)
    highlights = serializers.ListField(
        child=serializers.CharField(max_length=500),
        required=False,
        default=list
    )


class ContactInfoSerializer(serializers.Serializer):
    """Serializer for contact information"""
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    linkedin = serializers.URLField(required=False, allow_blank=True)
    github = serializers.URLField(required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)
    location = serializers.CharField(max_length=100, required=False, allow_blank=True)


class AchievementSerializer(serializers.Serializer):
    """Serializer for achievement/statistic data"""
    id = serializers.CharField(max_length=100)
    label = serializers.CharField(max_length=100)
    value = serializers.CharField(max_length=50)
    icon = serializers.CharField(max_length=50, required=False, allow_blank=True)
    description = serializers.CharField(max_length=500, required=False, allow_blank=True)


class CandidateProfileSerializer(serializers.Serializer):
    """Serializer for candidate profile data"""
    id = serializers.CharField(max_length=100)
    name = serializers.CharField(max_length=200)
    title = serializers.CharField(max_length=200)
    professionalCategory = serializers.ChoiceField(choices=ProfessionalCategory.choices)
    skills = SkillSerializer(many=True)
    experience = ExperienceSerializer(many=True)
    education = EducationSerializer(many=True)
    projects = ProjectSerializer(many=True)
    contact = ContactInfoSerializer()
    extractedText = serializers.CharField()
    confidence = serializers.FloatField(min_value=0.0, max_value=1.0)
    summary = serializers.CharField(required=False, allow_blank=True)
    achievements = AchievementSerializer(many=True, required=False, default=list)


class ComponentConfigSerializer(serializers.Serializer):
    """Serializer for component configuration"""
    type = serializers.ChoiceField(choices=ComponentType.choices)
    props = serializers.DictField()
    order = serializers.IntegerField(min_value=0)
    theme = serializers.CharField(max_length=50, required=False, allow_blank=True)


class LayoutMetadataSerializer(serializers.Serializer):
    """Serializer for layout metadata"""
    professionalCategory = serializers.ChoiceField(choices=ProfessionalCategory.choices)
    confidence = serializers.FloatField(min_value=0.0, max_value=1.0)
    processingTimeMs = serializers.IntegerField(min_value=0)


class GenerateLayoutResponseSerializer(serializers.Serializer):
    """Serializer for layout generation response"""
    components = ComponentConfigSerializer(many=True)
    theme = serializers.ChoiceField(choices=ThemePalette.choices)
    metadata = LayoutMetadataSerializer()
    candidateProfile = CandidateProfileSerializer()


class ProcessingProgressSerializer(serializers.Serializer):
    """Serializer for processing progress events"""
    stage = serializers.ChoiceField(choices=ProcessingStatus.choices)
    progress = serializers.IntegerField(min_value=0, max_value=100)
    message = serializers.CharField(max_length=255)
    timestamp = serializers.DateTimeField()


class ApiErrorSerializer(serializers.Serializer):
    """Serializer for API error responses"""
    error = serializers.CharField()
    code = serializers.CharField()
    details = serializers.DictField(required=False)


class ResumeSerializer(serializers.ModelSerializer):
    """Serializer for Resume model"""
    class Meta:
        model = Resume
        fields = [
            'id', 'original_filename', 'file_type', 'file_size',
            'extracted_text', 'ocr_confidence', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ComponentSelectionSerializer(serializers.ModelSerializer):
    """Serializer for ComponentSelection model"""
    class Meta:
        model = ComponentSelection
        fields = ['id', 'component_type', 'order', 'props', 'theme', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProcessingResultSerializer(serializers.ModelSerializer):
    """Serializer for ProcessingResult model"""
    component_selections = ComponentSelectionSerializer(many=True, read_only=True)
    
    class Meta:
        model = ProcessingResult
        fields = [
            'id', 'status', 'progress', 'status_message',
            'candidate_name', 'candidate_title', 'professional_category',
            'ai_confidence', 'skills', 'experience', 'education',
            'projects', 'contact_info', 'achievements', 'summary',
            'selected_theme', 'processing_time_ms', 'error_message',
            'created_at', 'updated_at', 'completed_at',
            'component_selections'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'completed_at']
