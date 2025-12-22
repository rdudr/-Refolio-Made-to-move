import React, { useState, useEffect } from 'react';
import { ExperienceEntry } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import GlassmorphicContainer from '../ui/GlassmorphicContainer';

interface ExperienceFormProps {
  initialData?: Partial<ExperienceEntry>;
  onSave: (data: ExperienceEntry) => void;
  onCancel?: () => void;
  autoSave?: boolean; // Enable automatic saving to user profile
}

const ExperienceForm: React.FC<ExperienceFormProps> = ({
  initialData = {},
  onSave,
  onCancel,
  autoSave = false
}) => {
  const { updateUserProfile, userProfile } = useAuth();
  const [formData, setFormData] = useState<Partial<ExperienceEntry>>({
    title: '',
    organization: '',
    location: '',
    description: '',
    achievements: [],
    startDate: undefined,
    endDate: undefined,
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [achievementInput, setAchievementInput] = useState('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Job title is required';
    }

    if (!formData.organization?.trim()) {
      newErrors.organization = 'Company/Organization is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ExperienceEntry, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    if (value) {
      handleInputChange(field, new Date(value));
    } else {
      handleInputChange(field, field === 'endDate' ? null : undefined);
    }
  };

  const addAchievement = () => {
    if (achievementInput.trim()) {
      const currentAchievements = formData.achievements || [];
      setFormData(prev => ({
        ...prev,
        achievements: [...currentAchievements, achievementInput.trim()]
      }));
      setAchievementInput('');
    }
  };

  const removeAchievement = (index: number) => {
    const currentAchievements = formData.achievements || [];
    setFormData(prev => ({
      ...prev,
      achievements: currentAchievements.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const experienceData: ExperienceEntry = {
        id: formData.id || `exp-${Date.now()}-${Math.random()}`,
        title: formData.title!,
        organization: formData.organization!,
        location: formData.location,
        description: formData.description,
        achievements: formData.achievements || [],
        startDate: formData.startDate!,
        endDate: formData.endDate || null,
        createdAt: formData.createdAt || new Date(),
        updatedAt: new Date()
      };
      
      // Call the provided onSave callback
      onSave(experienceData);

      // If autoSave is enabled and user is logged in, update profile automatically
      if (autoSave && userProfile) {
        const updatedExperience = [...(userProfile.experience || [])];
        const existingIndex = updatedExperience.findIndex(exp => exp.id === experienceData.id);
        
        if (existingIndex >= 0) {
          // Update existing experience
          updatedExperience[existingIndex] = experienceData;
        } else {
          // Add new experience
          updatedExperience.push(experienceData);
        }

        // Update profile with new experience data (triggers automatic gap recalculation)
        updateUserProfile({
          experience: updatedExperience
        });
      }
    }
  };

  const formatDateForInput = (date: Date | null | undefined) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.3s ease'
  };

  const errorInputStyle = {
    ...inputStyle,
    borderColor: '#ff6b6b',
    backgroundColor: 'rgba(255, 107, 107, 0.1)'
  };

  return (
    <GlassmorphicContainer intensity="medium">
      <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        Work Experience
      </h2>
      
      <form onSubmit={handleSubmit} style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Job Title *
          </label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) => handleInputChange('title', e.target.value)}
            style={errors.title ? errorInputStyle : inputStyle}
            placeholder="e.g., Senior Software Engineer"
            required
          />
          {errors.title && (
            <div style={{ color: '#ff6b6b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.title}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Company/Organization *
            </label>
            <input
              type="text"
              value={formData.organization || ''}
              onChange={(e) => handleInputChange('organization', e.target.value)}
              style={errors.organization ? errorInputStyle : inputStyle}
              placeholder="e.g., Google Inc."
              required
            />
            {errors.organization && (
              <div style={{ color: '#ff6b6b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {errors.organization}
              </div>
            )}
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Location
            </label>
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => handleInputChange('location', e.target.value)}
              style={inputStyle}
              placeholder="City, State"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Start Date *
            </label>
            <input
              type="date"
              value={formatDateForInput(formData.startDate)}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              style={errors.startDate ? errorInputStyle : inputStyle}
              required
            />
            {errors.startDate && (
              <div style={{ color: '#ff6b6b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {errors.startDate}
              </div>
            )}
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              End Date
            </label>
            <input
              type="date"
              value={formatDateForInput(formData.endDate)}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              style={errors.endDate ? errorInputStyle : inputStyle}
            />
            {errors.endDate && (
              <div style={{ color: '#ff6b6b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {errors.endDate}
              </div>
            )}
            <div style={{ fontSize: '0.875rem', opacity: 0.7, marginTop: '0.25rem' }}>
              Leave empty if current position
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Job Description
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            style={{
              ...inputStyle,
              minHeight: '120px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
            placeholder="Describe your role, responsibilities, and key contributions..."
          />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Key Achievements
          </label>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              value={achievementInput}
              onChange={(e) => setAchievementInput(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Add a key achievement or accomplishment"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addAchievement();
                }
              }}
            />
            <button
              type="button"
              onClick={addAchievement}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#667eea',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Add
            </button>
          </div>

          {formData.achievements && formData.achievements.length > 0 && (
            <div>
              {formData.achievements.map((achievement, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                    padding: '0.5rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px'
                  }}
                >
                  <span style={{ flex: 1 }}>• {achievement}</span>
                  <button
                    type="button"
                    onClick={() => removeAchievement(index)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'rgba(255, 107, 107, 0.2)',
                      border: '1px solid rgba(255, 107, 107, 0.3)',
                      borderRadius: '4px',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.3s ease'
              }}
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#667eea',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.3s ease'
            }}
          >
            Save Experience
          </button>
        </div>
      </form>
    </GlassmorphicContainer>
  );
};

export default ExperienceForm;