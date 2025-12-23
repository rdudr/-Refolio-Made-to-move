"""
Portfolio URL Configuration
API endpoints for resume processing and portfolio generation
Requirements: 1.1, 1.4, 7.1
"""

from django.urls import path
from .views import (
    GenerateLayoutView,
    GenerateLayoutSSEView,
    ProcessingStatusView,
)

app_name = 'portfolio'

urlpatterns = [
    # Main endpoint for layout generation
    path(
        'generate-layout',
        GenerateLayoutView.as_view(),
        name='generate-layout'
    ),
    
    # SSE endpoint for real-time progress streaming
    path(
        'generate-layout/stream',
        GenerateLayoutSSEView.as_view(),
        name='generate-layout-stream'
    ),
    
    # Processing status check endpoint
    path(
        'processing-status/<uuid:processing_id>',
        ProcessingStatusView.as_view(),
        name='processing-status'
    ),
]
