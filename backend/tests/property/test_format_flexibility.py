"""
Property-Based Tests for Format Flexibility Handling

**Feature: generative-ui-portfolio, Property 9: Format Flexibility Handling**
**Validates: Requirements 6.3**

Tests that the system handles varying resume formats and section structures,
extracting relevant information and generating appropriate components regardless
of the input format.
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck, assume
import asyncio
import re

from apps.portfolio.services.pipeline_service import (
    PipelineService,
    PipelineResult,
)
from apps.portfolio.services.input_sanitization_service import (
    InputSanitizationService,
    get_sanitization_service,
)
from apps.portfolio.models import (
    ProfessionalCategory,
    ComponentType,
)


# Custom strategies for generating varied resume formats


@st.composite
def standard_resume_text(draw):
    """Generate resume text with standard section ordering"""
    name = draw(st.from_regex(r'[A-Z][a-z]+ [A-Z][a-z]+', fullmatch=True))
    title = draw(st.sampled_from([
        'Software Engineer', 'Product Manager', 'Designer',
        'Data Scientist', 'Marketing Manager', 'Sales Executive'
    ]))
    
    sections = [
        f"Name: {name}",
        f"Title: {title}",
        "",
        "EXPERIENCE",
        "- Senior Developer at Tech Corp (2020-2023)",
        "- Junior Developer at Startup Inc (2018-2020)",
        "",
        "EDUCATION",
        "- BS Computer Science, University (2018)",
        "",
        "SKILLS",
        "- Python, JavaScript, React",
        "- Communication, Leadership",
    ]
    
    return '\n'.join(sections)


@st.composite
def reversed_section_resume(draw):
    """Generate resume with reversed section ordering"""
    name = draw(st.from_regex(r'[A-Z][a-z]+ [A-Z][a-z]+', fullmatch=True))
    title = draw(st.sampled_from([
        'Software Engineer', 'Product Manager', 'Designer',
        'Data Scientist', 'Marketing Manager', 'Sales Executive'
    ]))
    
    # Reversed order: Skills -> Education -> Experience -> Name
    sections = [
        "SKILLS",
        "- Python, JavaScript, React",
        "- Communication, Leadership",
        "",
        "EDUCATION",
        "- BS Computer Science, University (2018)",
        "",
        "EXPERIENCE",
        "- Senior Developer at Tech Corp (2020-2023)",
        "- Junior Developer at Startup Inc (2018-2020)",
        "",
        f"Name: {name}",
        f"Title: {title}",
    ]
    
    return '\n'.join(sections)


@st.composite
def minimal_resume_text(draw):
    """Generate minimal resume with only essential information"""
    name = draw(st.from_regex(r'[A-Z][a-z]+ [A-Z][a-z]+', fullmatch=True))
    title = draw(st.sampled_from([
        'Engineer', 'Manager', 'Designer', 'Analyst', 'Developer'
    ]))
    
    return f"{name}\n{title}"


@st.composite
def verbose_resume_text(draw):
    """Generate verbose resume with lots of content"""
    name = draw(st.from_regex(r'[A-Z][a-z]+ [A-Z][a-z]+', fullmatch=True))
    
    # Generate multiple paragraphs of content
    paragraphs = []
    for _ in range(draw(st.integers(min_value=3, max_value=8))):
        words = draw(st.lists(
            st.from_regex(r'[a-z]{3,10}', fullmatch=True),
            min_size=10,
            max_size=30
        ))
        paragraphs.append(' '.join(words))
    
    return f"{name}\n\n" + '\n\n'.join(paragraphs)


@st.composite
def mixed_format_resume(draw):
    """Generate resume with mixed formatting styles"""
    name = draw(st.from_regex(r'[A-Z][a-z]+ [A-Z][a-z]+', fullmatch=True))
    
    # Mix of bullet points, numbered lists, and plain text
    sections = [
        f"== {name} ==",
        "",
        "*** PROFESSIONAL EXPERIENCE ***",
        "1. Company A - Role A",
        "   * Achievement 1",
        "   * Achievement 2",
        "2. Company B - Role B",
        "",
        "--- SKILLS ---",
        "• Technical: Python, Java",
        "• Soft: Communication",
        "",
        "[EDUCATION]",
        "- University Name, Degree",
    ]
    
    return '\n'.join(sections)


@st.composite
def non_standard_section_names(draw):
    """Generate resume with non-standard section names"""
    name = draw(st.from_regex(r'[A-Z][a-z]+ [A-Z][a-z]+', fullmatch=True))
    
    # Use non-standard section names
    sections = [
        f"{name}",
        "",
        "WHAT I'VE DONE",  # Instead of "Experience"
        "- Built software at Company X",
        "",
        "WHAT I KNOW",  # Instead of "Skills"
        "- Programming languages",
        "",
        "WHERE I LEARNED",  # Instead of "Education"
        "- University degree",
    ]
    
    return '\n'.join(sections)


@st.composite
def shuffled_resume_sections(draw):
    """Generate resume with randomly shuffled sections"""
    name = draw(st.from_regex(r'[A-Z][a-z]+ [A-Z][a-z]+', fullmatch=True))
    
    sections = [
        ("HEADER", f"{name}\nProfessional"),
        ("EXPERIENCE", "EXPERIENCE\n- Job 1\n- Job 2"),
        ("SKILLS", "SKILLS\n- Skill 1\n- Skill 2"),
        ("EDUCATION", "EDUCATION\n- Degree"),
        ("PROJECTS", "PROJECTS\n- Project 1"),
    ]
    
    # Shuffle the sections
    shuffled = draw(st.permutations(sections))
    
    return '\n\n'.join(content for _, content in shuffled)


@st.composite
def resume_with_special_characters(draw):
    """Generate resume with special characters and unicode"""
    name = draw(st.from_regex(r'[A-Z][a-z]+ [A-Z][a-z]+', fullmatch=True))
    
    sections = [
        f"👤 {name}",
        "📧 email@example.com",
        "",
        "💼 EXPERIENCE",
        "• Company → Role (2020–2023)",
        "  ✓ Achievement with special quotes",
        "",
        "🎓 EDUCATION",
        "• University — Degree",
        "",
        "⚡ SKILLS",
        "• Python • JavaScript • React",
    ]
    
    return '\n'.join(sections)


class TestFormatFlexibilityHandling:
    """
    **Feature: generative-ui-portfolio, Property 9: Format Flexibility Handling**
    
    Property: For any resume with non-standard section ordering or structure,
    the system should extract relevant information and generate appropriate components.
    
    **Validates: Requirements 6.3**
    """
    
    @given(resume_text=standard_resume_text())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_standard_format_produces_components(self, resume_text):
        """
        **Feature: generative-ui-portfolio, Property 9: Format Flexibility Handling**
        **Validates: Requirements 6.3**
        
        Property: Standard resume format should produce valid components.
        """
        pipeline = PipelineService()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            candidate_profile = loop.run_until_complete(
                pipeline._analyze_resume(resume_text, {})
            )
            components = loop.run_until_complete(
                pipeline._select_components(candidate_profile, {})
            )
        finally:
            loop.close()
        
        # Verify components are generated
        assert components is not None
        assert isinstance(components, list)
        assert len(components) > 0
        
        # Verify each component has required fields
        for comp in components:
            assert 'type' in comp
            assert 'props' in comp
            assert 'order' in comp
    
    @given(resume_text=reversed_section_resume())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_reversed_sections_produce_components(self, resume_text):
        """
        **Feature: generative-ui-portfolio, Property 9: Format Flexibility Handling**
        **Validates: Requirements 6.3**
        
        Property: Resume with reversed section ordering should still
        produce valid components.
        """
        pipeline = PipelineService()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            candidate_profile = loop.run_until_complete(
                pipeline._analyze_resume(resume_text, {})
            )
            components = loop.run_until_complete(
                pipeline._select_components(candidate_profile, {})
            )
        finally:
            loop.close()
        
        # Verify components are generated regardless of section order
        assert components is not None
        assert len(components) > 0
        
        # Verify component types are valid
        valid_types = [ct.value for ct in ComponentType]
        for comp in components:
            assert comp['type'] in valid_types
    
    @given(resume_text=minimal_resume_text())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_minimal_resume_produces_components(self, resume_text):
        """
        **Feature: generative-ui-portfolio, Property 9: Format Flexibility Handling**
        **Validates: Requirements 6.3**
        
        Property: Minimal resume with only name and title should still
        produce valid components using fallback defaults.
        """
        pipeline = PipelineService()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            candidate_profile = loop.run_until_complete(
                pipeline._analyze_resume(resume_text, {})
            )
            components = loop.run_until_complete(
                pipeline._select_components(candidate_profile, {})
            )
        finally:
            loop.close()
        
        # Even minimal resumes should produce components
        assert components is not None
        assert len(components) > 0
        
        # Should have at least a hero component
        hero_types = [ComponentType.HERO_PRISM.value, ComponentType.HERO_TERMINAL.value]
        has_hero = any(c['type'] in hero_types for c in components)
        assert has_hero, "Should have at least one hero component"
    
    @given(resume_text=verbose_resume_text())
    @settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
    def test_verbose_resume_produces_components(self, resume_text):
        """
        **Feature: generative-ui-portfolio, Property 9: Format Flexibility Handling**
        **Validates: Requirements 6.3**
        
        Property: Verbose resume with lots of content should still
        produce valid components without errors.
        """
        pipeline = PipelineService()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            candidate_profile = loop.run_until_complete(
                pipeline._analyze_resume(resume_text, {})
            )
            components = loop.run_until_complete(
                pipeline._select_components(candidate_profile, {})
            )
        finally:
            loop.close()
        
        # Verbose resumes should produce components
        assert components is not None
        assert len(components) > 0
    
    @given(resume_text=mixed_format_resume())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_mixed_format_produces_components(self, resume_text):
        """
        **Feature: generative-ui-portfolio, Property 9: Format Flexibility Handling**
        **Validates: Requirements 6.3**
        
        Property: Resume with mixed formatting (bullets, numbers, plain text)
        should produce valid components.
        """
        pipeline = PipelineService()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            candidate_profile = loop.run_until_complete(
                pipeline._analyze_resume(resume_text, {})
            )
            components = loop.run_until_complete(
                pipeline._select_components(candidate_profile, {})
            )
        finally:
            loop.close()
        
        assert components is not None
        assert len(components) > 0
        
        # Verify component order is sequential
        orders = [c['order'] for c in components]
        assert orders == sorted(orders)
    
    @given(resume_text=non_standard_section_names())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_non_standard_sections_produce_components(self, resume_text):
        """
        **Feature: generative-ui-portfolio, Property 9: Format Flexibility Handling**
        **Validates: Requirements 6.3**
        
        Property: Resume with non-standard section names should still
        produce valid components.
        """
        pipeline = PipelineService()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            candidate_profile = loop.run_until_complete(
                pipeline._analyze_resume(resume_text, {})
            )
            components = loop.run_until_complete(
                pipeline._select_components(candidate_profile, {})
            )
        finally:
            loop.close()
        
        assert components is not None
        assert len(components) > 0
    
    @given(resume_text=shuffled_resume_sections())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_shuffled_sections_produce_components(self, resume_text):
        """
        **Feature: generative-ui-portfolio, Property 9: Format Flexibility Handling**
        **Validates: Requirements 6.3**
        
        Property: Resume with randomly shuffled sections should produce
        valid components regardless of section order.
        """
        pipeline = PipelineService()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            candidate_profile = loop.run_until_complete(
                pipeline._analyze_resume(resume_text, {})
            )
            components = loop.run_until_complete(
                pipeline._select_components(candidate_profile, {})
            )
        finally:
            loop.close()
        
        assert components is not None
        assert len(components) > 0
        
        # All components should have valid types
        valid_types = [ct.value for ct in ComponentType]
        for comp in components:
            assert comp['type'] in valid_types
    
    @given(resume_text=resume_with_special_characters())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_special_characters_handled(self, resume_text):
        """
        **Feature: generative-ui-portfolio, Property 9: Format Flexibility Handling**
        **Validates: Requirements 6.3**
        
        Property: Resume with special characters and unicode should be
        handled without errors.
        """
        pipeline = PipelineService()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            candidate_profile = loop.run_until_complete(
                pipeline._analyze_resume(resume_text, {})
            )
            components = loop.run_until_complete(
                pipeline._select_components(candidate_profile, {})
            )
        finally:
            loop.close()
        
        # Should handle special characters without crashing
        assert components is not None
        assert len(components) > 0


class TestInputSanitizationFormatFlexibility:
    """
    Tests for input sanitization handling of various formats.
    
    **Feature: generative-ui-portfolio, Property 9: Format Flexibility Handling**
    **Validates: Requirements 6.3**
    """
    
    @given(
        text=st.text(
            alphabet=st.characters(
                whitelist_categories=('L', 'N', 'P', 'S', 'Z'),
                blacklist_characters='\x00'
            ),
            min_size=0,
            max_size=1000
        )
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_text_sanitization_preserves_content(self, text):
        """
        **Feature: generative-ui-portfolio, Property 9: Format Flexibility Handling**
        **Validates: Requirements 6.3**
        
        Property: Text sanitization should preserve meaningful content
        while removing dangerous patterns.
        """
        service = get_sanitization_service()
        
        result = service.sanitize_text(text)
        
        # Sanitization should always succeed
        assert result.is_safe
        
        # Sanitized value should be a string
        assert isinstance(result.sanitized_value, str)
        
        # If original had no suspicious patterns, content should be mostly preserved
        # (allowing for null byte removal)
        if not service._suspicious_regex.search(text):
            # Remove null bytes for comparison
            clean_text = text.replace('\x00', '')
            assert result.sanitized_value == clean_text
    
    @given(
        filename=st.from_regex(r'[a-zA-Z0-9_-]{1,50}\.(pdf|png|jpg|jpeg)', fullmatch=True)
    )
    @settings(max_examples=100)
    def test_valid_filenames_accepted(self, filename):
        """
        **Feature: generative-ui-portfolio, Property 9: Format Flexibility Handling**
        **Validates: Requirements 6.3**
        
        Property: Valid filenames with supported extensions should be accepted.
        """
        service = get_sanitization_service()
        
        result = service.sanitize_filename(filename)
        
        assert result.is_safe
        assert result.sanitized_value is not None
        # Extension should be preserved
        assert result.sanitized_value.split('.')[-1] == filename.split('.')[-1]
    
    @given(
        options=st.fixed_dictionaries({
            'theme_preference': st.sampled_from(['auto', 'neon_blue', 'emerald_green', 'cyber_pink', 'invalid']),
            'component_style': st.sampled_from(['modern', 'classic', 'minimal', 'invalid']),
        })
    )
    @settings(max_examples=100)
    def test_options_validation_handles_invalid_values(self, options):
        """
        **Feature: generative-ui-portfolio, Property 9: Format Flexibility Handling**
        **Validates: Requirements 6.3**
        
        Property: Options validation should handle invalid values gracefully
        by falling back to defaults.
        """
        service = get_sanitization_service()
        
        result = service.validate_options(options)
        
        # Should always return a safe result
        assert result.is_safe
        
        # Sanitized options should have valid values
        sanitized = result.sanitized_value
        assert sanitized['theme_preference'] in service.VALID_THEMES
        assert sanitized['component_style'] in service.VALID_COMPONENT_STYLES


class TestComponentGenerationConsistency:
    """
    Tests for consistent component generation across formats.
    
    **Feature: generative-ui-portfolio, Property 9: Format Flexibility Handling**
    **Validates: Requirements 6.3**
    """
    
    @given(
        category=st.sampled_from(list(ProfessionalCategory)),
        has_skills=st.booleans(),
        has_experience=st.booleans(),
    )
    @settings(max_examples=100)
    def test_components_generated_for_all_profile_variations(
        self, category, has_skills, has_experience
    ):
        """
        **Feature: generative-ui-portfolio, Property 9: Format Flexibility Handling**
        **Validates: Requirements 6.3**
        
        Property: Components should be generated for all variations of
        profile data, regardless of which fields are populated.
        """
        pipeline = PipelineService()
        
        # Create profile with varying data
        profile = {
            'id': 'test-id',
            'name': 'Test User',
            'title': 'Professional',
            'professionalCategory': category.value,
            'skills': [
                {'name': 'Skill 1', 'level': 3, 'category': 'Technical'}
            ] if has_skills else [],
            'experience': [
                {'company': 'Company', 'role': 'Role', 'duration': '2020-2023'}
            ] if has_experience else [],
            'education': [],
            'projects': [],
            'contact': {},
            'extractedText': '',
            'confidence': 0.5,
            'summary': '',
            'achievements': []
        }
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            components = loop.run_until_complete(
                pipeline._select_components(profile, {})
            )
        finally:
            loop.close()
        
        # Should always produce components
        assert components is not None
        assert len(components) > 0
        
        # Should have a hero component
        hero_types = [ComponentType.HERO_PRISM.value, ComponentType.HERO_TERMINAL.value]
        has_hero = any(c['type'] in hero_types for c in components)
        assert has_hero
    
    @given(
        text_length=st.integers(min_value=0, max_value=10000)
    )
    @settings(max_examples=50)
    def test_varying_text_lengths_handled(self, text_length):
        """
        **Feature: generative-ui-portfolio, Property 9: Format Flexibility Handling**
        **Validates: Requirements 6.3**
        
        Property: Resume text of varying lengths should be handled
        without errors.
        """
        pipeline = PipelineService()
        
        # Generate text of specified length
        resume_text = 'a' * text_length
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            candidate_profile = loop.run_until_complete(
                pipeline._analyze_resume(resume_text, {})
            )
            components = loop.run_until_complete(
                pipeline._select_components(candidate_profile, {})
            )
        finally:
            loop.close()
        
        # Should handle any text length
        assert candidate_profile is not None
        assert components is not None
        assert len(components) > 0
