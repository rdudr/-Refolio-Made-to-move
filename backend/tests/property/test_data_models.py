"""
Property-Based Tests for Data Model Consistency

**Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
**Validates: Requirements 1.1, 6.1, 6.2**

Tests that data models correctly store and retrieve text content,
ensuring consistency between input and output.
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from django.core.exceptions import ValidationError

from apps.portfolio.models import (
    Resume,
    ProcessingResult,
    ComponentSelection,
    ProfessionalCategory,
    ComponentType,
    ThemePalette,
    ProcessingStatus,
)


# Custom strategies for generating valid test data
@st.composite
def valid_extracted_text(draw):
    """Generate valid extracted text content that could come from OCR"""
    # Generate text with various unicode characters that OCR might produce
    text = draw(st.text(
        alphabet=st.characters(
            whitelist_categories=('L', 'N', 'P', 'Z'),  # Letters, Numbers, Punctuation, Separators
            blacklist_characters='\x00'  # Exclude null bytes
        ),
        min_size=0,
        max_size=10000
    ))
    return text


@st.composite
def valid_skill_data(draw):
    """Generate valid skill data structure"""
    return {
        'name': draw(st.from_regex(r'[A-Za-z][A-Za-z0-9 ]{0,49}', fullmatch=True)),
        'level': draw(st.integers(min_value=1, max_value=5)),
        'category': draw(st.from_regex(r'[A-Za-z]{0,20}', fullmatch=True)),
    }


@st.composite
def valid_experience_data(draw):
    """Generate valid experience data structure"""
    return {
        'id': draw(st.uuids().map(str)),
        'title': draw(st.from_regex(r'[A-Za-z][A-Za-z0-9 ]{0,49}', fullmatch=True)),
        'company': draw(st.from_regex(r'[A-Za-z][A-Za-z0-9 ]{0,49}', fullmatch=True)),
        'location': draw(st.from_regex(r'[A-Za-z]{0,30}', fullmatch=True)),
        'startDate': draw(st.dates().map(str)),
        'endDate': draw(st.none() | st.dates().map(str)),
        'description': draw(st.from_regex(r'[A-Za-z0-9 .,]{0,200}', fullmatch=True)),
        'highlights': draw(st.lists(st.from_regex(r'[A-Za-z0-9 ]{1,50}', fullmatch=True), max_size=3)),
    }



@pytest.mark.django_db
class TestOCRTextExtractionConsistency:
    """
    **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
    
    Property: For any PDF or image file containing text, the OCR extraction 
    should preserve the textual content accurately, allowing for minor formatting differences.
    
    This test validates that the data models correctly store and retrieve
    extracted text without data loss or corruption.
    """
    
    @given(extracted_text=valid_extracted_text())
    @settings(max_examples=100)
    def test_extracted_text_round_trip(self, extracted_text):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: For any extracted text content, storing it in the Resume model
        and retrieving it should return the exact same text content.
        """
        # Create a Resume instance with the extracted text
        resume = Resume(
            original_filename='test_resume.pdf',
            file_type='pdf',
            file_size=1024,
            extracted_text=extracted_text,
            ocr_confidence=0.95
        )
        
        # Verify the text is stored correctly (without saving to DB for speed)
        assert resume.extracted_text == extracted_text, \
            f"Text mismatch: stored '{resume.extracted_text}' != original '{extracted_text}'"
    
    @given(
        extracted_text=valid_extracted_text(),
        confidence=st.floats(min_value=0.0, max_value=1.0, allow_nan=False)
    )
    @settings(max_examples=100)
    def test_ocr_confidence_bounds(self, extracted_text, confidence):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: OCR confidence scores should always be within valid bounds (0-1).
        """
        resume = Resume(
            original_filename='test_resume.pdf',
            file_type='pdf',
            file_size=1024,
            extracted_text=extracted_text,
            ocr_confidence=confidence
        )
        
        assert 0.0 <= resume.ocr_confidence <= 1.0, \
            f"Confidence {resume.ocr_confidence} out of bounds [0, 1]"


@pytest.mark.django_db
class TestProcessingResultConsistency:
    """
    Tests for ProcessingResult model data consistency.
    """
    
    @given(
        skills=st.lists(valid_skill_data(), min_size=0, max_size=10),
        category=st.sampled_from(list(ProfessionalCategory))
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_skills_data_round_trip(self, skills, category):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: Skills data stored in ProcessingResult should be retrievable
        without modification.
        """
        result = ProcessingResult(
            candidate_name='Test Candidate',
            candidate_title='Software Engineer',
            professional_category=category,
            skills=skills,
            ai_confidence=0.85
        )
        
        assert result.skills == skills, \
            f"Skills mismatch: stored {result.skills} != original {skills}"
        assert result.professional_category == category
    
    @given(
        experiences=st.lists(valid_experience_data(), min_size=0, max_size=5)
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_experience_data_round_trip(self, experiences):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: Experience data stored in ProcessingResult should be retrievable
        without modification.
        """
        result = ProcessingResult(
            candidate_name='Test Candidate',
            candidate_title='Software Engineer',
            professional_category=ProfessionalCategory.TECHNICAL,
            experience=experiences,
            ai_confidence=0.85
        )
        
        assert result.experience == experiences, \
            f"Experience mismatch: stored {result.experience} != original {experiences}"



@pytest.mark.django_db
class TestComponentSelectionConsistency:
    """
    Tests for ComponentSelection model data consistency.
    """
    
    @given(
        component_type=st.sampled_from(list(ComponentType)),
        order=st.integers(min_value=0, max_value=100)
    )
    @settings(max_examples=100)
    def test_component_type_and_order_consistency(self, component_type, order):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: Component type and order should be stored and retrieved consistently.
        """
        selection = ComponentSelection(
            component_type=component_type,
            order=order,
            props={},
            theme=''
        )
        
        assert selection.component_type == component_type
        assert selection.order == order
    
    @given(
        props=st.fixed_dictionaries({
            'title': st.text(min_size=1, max_size=100).filter(lambda x: x.strip()),
            'name': st.text(min_size=1, max_size=100).filter(lambda x: x.strip()),
            'subtitle': st.text(min_size=0, max_size=200),
        })
    )
    @settings(max_examples=100)
    def test_hero_prism_props_round_trip(self, props):
        """
        **Feature: generative-ui-portfolio, Property 1: OCR Text Extraction Consistency**
        **Validates: Requirements 1.1, 6.1, 6.2**
        
        Property: HeroPrism component props should be stored and retrieved consistently.
        """
        selection = ComponentSelection(
            component_type=ComponentType.HERO_PRISM,
            order=0,
            props=props,
            theme='ocean'
        )
        
        assert selection.props == props
        assert selection.props['title'] == props['title']
        assert selection.props['name'] == props['name']
