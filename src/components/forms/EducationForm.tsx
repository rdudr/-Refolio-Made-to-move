import React, { useState, useEffect } from 'react';
import { EducationEntry } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import GlassmorphicContainer from '../ui/GlassmorphicContainer';

interface EducationFormProps {
  initialData?: Partial<EducationEntry>;
  onSave: (data: EducationEntry) => void;
  onCancel?: () => void;
  autoSave?: boolean; // Enable automatic saving to user profile
}

const EducationForm: React.FC<EducationFormProps> = ({
  initialData = {},
  onSave,
  onCancel,
  autoSave = false
}) => {
  const { updateUserProfile, userProfile } = useAuth();

  const [formData, setFormData] = useState<Partial<EducationEntry>>({
    title: '',
    organization: '',
    location: '',
    degree: '',
    fieldOfStudy: '',
    gpa: undefined,
    startDate: undefined,
    endDate: undefined,
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Program/Course title is required';
    }

    if (!formData.organization?.trim()) {
      newErrors.organization = 'Institution name is required';
    }

    if (!formData.degree?.trim()) {
      newErrors.degree = 'Degree/Certificate type is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (formData.gpa && (formData.gpa < 0 || formData.gpa > 4.0)) {
      newErrors.gpa = 'GPA must be between 0.0 and 4.0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof EducationEntry, value: any) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const educationData: EducationEntry = {
        id: formData.id || `edu-${Date.now()}-${Math.random()}`,
        title: formData.title!,
        organization: formData.organization!,
        location: formData.location,
        degree: formData.degree!,
        fieldOfStudy: formData.fieldOfStudy,
        gpa: formData.gpa,
        startDate: formData.startDate!,
        endDate: formData.endDate || null,
        createdAt: formData.createdAt || new Date(),
        updatedAt: new Date()
      };
      
      // Call the provided onSave callback
      onSave(educationData);

      // If autoSave is enabled and user is logged in, update profile automatically
      if (autoSave && userProfile) {
        const updatedEducation = [...(userProfile.education || [])];
        const existingIndex = updatedEducation.findIndex(edu => edu.id === educationData.id);
        
        if (existingIndex >= 0) {
          // Update existing education
          updatedEducation[existingIndex] = educationData;
        } else {
          // Add new education
          updatedEducation.push(educationData);
        }

        // Update profile with new education data (triggers automatic gap recalculation)
        updateUserProfile({
          education: updatedEducation
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
        Education
      </h2>
      
      <form onSubmit={handleSubmit} style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Program/Course Title *
          </label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) => handleInputChange('title', e.target.value)}
            style={errors.title ? errorInputStyle : inputStyle}
            placeholder="e.g., Computer Science Program"
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
              Institution *
            </label>
            <input
              type="text"
              value={formData.organization || ''}
              onChange={(e) => handleInputChange('organization', e.target.value)}
              style={errors.organization ? errorInputStyle : inputStyle}
              placeholder="e.g., Stanford University"
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
              Degree/Certificate *
            </label>
            <input
              type="text"
              value={formData.degree || ''}
              onChange={(e) => handleInputChange('degree', e.target.value)}
              style={errors.degree ? errorInputStyle : inputStyle}
              placeholder="e.g., Bachelor of Science"
              required
            />
            {errors.degree && (
              <div style={{ color: '#ff6b6b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {errors.degree}
              </div>
            )}
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Field of Study
            </label>
            <input
              type="text"
              value={formData.fieldOfStudy || ''}
              onChange={(e) => handleInputChange('fieldOfStudy', e.target.value)}
              style={inputStyle}
              placeholder="e.g., Computer Science"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
              Leave empty if ongoing
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              GPA (Optional)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="4.0"
              value={formData.gpa || ''}
              onChange={(e) => handleInputChange('gpa', e.target.value ? parseFloat(e.target.value) : undefined)}
              style={errors.gpa ? errorInputStyle : inputStyle}
              placeholder="3.75"
            />
            {errors.gpa && (
              <div style={{ color: '#ff6b6b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {errors.gpa}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
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
            Save Education
          </button>
        </div>
      </form>
    </GlassmorphicContainer>
  );
};

export default EducationForm;