import React, { useState, useEffect } from 'react';
import { PersonalInfo, ValidationResult } from '../../types';
import { validatePersonalInfoPartial } from '../../utils/validation';
import GlassmorphicContainer from '../ui/GlassmorphicContainer';

interface PersonalInfoFormProps {
  initialData?: Partial<PersonalInfo>;
  onSave: (data: PersonalInfo) => void;
  onCancel?: () => void;
}

const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({
  initialData = {},
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<PersonalInfo>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    linkedIn: '',
    portfolio: '',
    ...initialData
  });

  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errors: []
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Validate form data whenever it changes
    const result = validatePersonalInfoPartial(formData);
    setValidation(result);
  }, [formData]);

  const handleInputChange = (field: keyof PersonalInfo, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validation.isValid && formData.firstName && formData.lastName && formData.email) {
      onSave(formData as PersonalInfo);
    }
  };

  const getFieldError = (field: string) => {
    return validation.errors.find(error => error.field === field);
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
        Personal Information
      </h2>
      
      <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              First Name *
            </label>
            <input
              type="text"
              value={formData.firstName || ''}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              style={getFieldError('firstName') && touched.firstName ? errorInputStyle : inputStyle}
              placeholder="Enter your first name"
              required
            />
            {getFieldError('firstName') && touched.firstName && (
              <div style={{ color: '#ff6b6b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {getFieldError('firstName')?.message}
              </div>
            )}
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Last Name *
            </label>
            <input
              type="text"
              value={formData.lastName || ''}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              style={getFieldError('lastName') && touched.lastName ? errorInputStyle : inputStyle}
              placeholder="Enter your last name"
              required
            />
            {getFieldError('lastName') && touched.lastName && (
              <div style={{ color: '#ff6b6b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {getFieldError('lastName')?.message}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Email Address *
          </label>
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            style={getFieldError('email') && touched.email ? errorInputStyle : inputStyle}
            placeholder="your.email@example.com"
            required
          />
          {getFieldError('email') && touched.email && (
            <div style={{ color: '#ff6b6b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {getFieldError('email')?.message}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              style={getFieldError('phone') && touched.phone ? errorInputStyle : inputStyle}
              placeholder="(555) 123-4567"
            />
            {getFieldError('phone') && touched.phone && (
              <div style={{ color: '#ff6b6b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {getFieldError('phone')?.message}
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

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            LinkedIn Profile
          </label>
          <input
            type="url"
            value={formData.linkedIn || ''}
            onChange={(e) => handleInputChange('linkedIn', e.target.value)}
            style={getFieldError('linkedIn') && touched.linkedIn ? errorInputStyle : inputStyle}
            placeholder="https://linkedin.com/in/yourprofile"
          />
          {getFieldError('linkedIn') && touched.linkedIn && (
            <div style={{ color: '#ff6b6b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {getFieldError('linkedIn')?.message}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Portfolio Website
          </label>
          <input
            type="url"
            value={formData.portfolio || ''}
            onChange={(e) => handleInputChange('portfolio', e.target.value)}
            style={getFieldError('portfolio') && touched.portfolio ? errorInputStyle : inputStyle}
            placeholder="https://yourportfolio.com"
          />
          {getFieldError('portfolio') && touched.portfolio && (
            <div style={{ color: '#ff6b6b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {getFieldError('portfolio')?.message}
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
            disabled={!validation.isValid}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: validation.isValid ? '#667eea' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              color: 'white',
              cursor: validation.isValid ? 'pointer' : 'not-allowed',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
              opacity: validation.isValid ? 1 : 0.5
            }}
          >
            Save Personal Information
          </button>
        </div>
      </form>
    </GlassmorphicContainer>
  );
};

export default PersonalInfoForm;