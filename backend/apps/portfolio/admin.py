"""
Portfolio Admin Configuration
"""

from django.contrib import admin
from .models import Resume, ProcessingResult, ComponentSelection


class ComponentSelectionInline(admin.TabularInline):
    model = ComponentSelection
    extra = 0
    readonly_fields = ['id', 'created_at']


@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = ['id', 'original_filename', 'file_type', 'file_size', 'created_at']
    list_filter = ['file_type', 'created_at']
    search_fields = ['original_filename', 'extracted_text']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'


@admin.register(ProcessingResult)
class ProcessingResultAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'candidate_name', 'professional_category', 
        'status', 'ai_confidence', 'created_at'
    ]
    list_filter = ['status', 'professional_category', 'selected_theme', 'created_at']
    search_fields = ['candidate_name', 'candidate_title', 'summary']
    readonly_fields = ['id', 'created_at', 'updated_at', 'completed_at']
    inlines = [ComponentSelectionInline]
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Status', {
            'fields': ('resume', 'status', 'progress', 'status_message', 'error_message')
        }),
        ('Candidate Profile', {
            'fields': ('candidate_name', 'candidate_title', 'professional_category', 
                      'ai_confidence', 'summary')
        }),
        ('Structured Data', {
            'fields': ('skills', 'experience', 'education', 'projects', 
                      'contact_info', 'achievements'),
            'classes': ('collapse',)
        }),
        ('Theme & Metrics', {
            'fields': ('selected_theme', 'processing_time_ms')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ComponentSelection)
class ComponentSelectionAdmin(admin.ModelAdmin):
    list_display = ['id', 'processing_result', 'component_type', 'order', 'created_at']
    list_filter = ['component_type', 'created_at']
    readonly_fields = ['id', 'created_at']
