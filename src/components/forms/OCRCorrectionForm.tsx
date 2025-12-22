import React, { useState } from 'react';
import { ParsedResumeData, PersonalInfo, ExperienceEntry, Skill, ProfileData } from '../../types';
import GlassmorphicContainer from '../ui/GlassmorphicContainer';
import PillNav from '../ui/PillNav';
import CardSwap from '../ui/CardSwap';
import PersonalInfoForm from './PersonalInfoForm';
import ExperienceForm from './ExperienceForm';
import SkillsForm from './SkillsForm';

interface OCRCorrectionFormProps {
  parsedData: ParsedResumeData;
  onSave: (profileData: Partial<ProfileData>) => void;
  onCancel?: () => void;
}

const OCRCorrectionForm: React.FC<OCRCorrectionFormProps> = ({
  parsedData,
  onSave,
  onCancel
}) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState<{
    personalInfo?: PersonalInfo;
    experience: ExperienceEntry[];
    skills: Skill[];
  }>({
    personalInfo: undefined,
    experience: [],
    skills: []
  });

  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());

  const tabs = [
    { 
      id: 'personal', 
      label: `Personal Info ${completedSections.has('personal') ? '✓' : ''}` 
    },
    { 
      id: 'experience', 
      label: `Experience (${parsedData.experience?.length || 0}) ${completedSections.has('experience') ? '✓' : ''}` 
    },
    { 
      id: 'skills', 
      label: `Skills (${parsedData.skills?.length || 0}) ${completedSections.has('skills') ? '✓' : ''}` 
    },
    { 
      id: 'review', 
      label: 'Review & Save' 
    }
  ];

  const handlePersonalInfoSave = (data: PersonalInfo) => {
    setFormData(prev => ({ ...prev, personalInfo: data }));
    setCompletedSections(prev => new Set(Array.from(prev).concat(['personal'])));
    setActiveTab('experience');
  };

  const handleExperienceSave = (experiences: ExperienceEntry[]) => {
    setFormData(prev => ({ ...prev, experience: experiences }));
    setCompletedSections(prev => new Set(Array.from(prev).concat(['experience'])));
    setActiveTab('skills');
  };

  const handleSkillsSave = (skills: Skill[]) => {
    setFormData(prev => ({ ...prev, skills }));
    setCompletedSections(prev => new Set(Array.from(prev).concat(['skills'])));
    setActiveTab('review');
  };

  const handleFinalSave = () => {
    const profileData: Partial<ProfileData> = {
      personalInfo: formData.personalInfo,
      experience: formData.experience,
      skills: formData.skills,
      education: [], // TODO: Add education form
      projects: [], // TODO: Add projects form
      careerGaps: [], // Will be calculated later
      version: 1,
      isComplete: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    onSave(profileData);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return (
          <PersonalInfoForm
            initialData={parsedData.personalInfo}
            onSave={handlePersonalInfoSave}
            onCancel={onCancel}
          />
        );

      case 'experience':
        return (
          <div>
            <GlassmorphicContainer intensity="medium">
              <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                Work Experience Review
              </h2>
              
              <div style={{ marginBottom: '2rem' }}>
                <h3>Extracted Experience Entries:</h3>
                {parsedData.experience && parsedData.experience.length > 0 ? (
                  <div style={{ marginBottom: '1.5rem' }}>
                    {parsedData.experience.map((exp, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '1rem',
                          marginBottom: '1rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <h4>{exp.title || 'Unknown Position'} at {exp.organization || 'Unknown Company'}</h4>
                        {exp.location && <p><strong>Location:</strong> {exp.location}</p>}
                        {exp.description && <p><strong>Description:</strong> {exp.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>
                    No experience entries were automatically extracted. You can add them manually below.
                  </p>
                )}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    onClick={() => handleExperienceSave([])}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    Skip Experience for Now
                  </button>
                  
                  <button
                    onClick={() => {
                      // Convert parsed experience to full ExperienceEntry objects
                      const experiences: ExperienceEntry[] = (parsedData.experience || []).map(exp => ({
                        id: exp.id || `exp-${Date.now()}-${Math.random()}`,
                        title: exp.title || 'Unknown Position',
                        organization: exp.organization || 'Unknown Company',
                        location: exp.location,
                        description: exp.description,
                        achievements: exp.achievements || [],
                        startDate: exp.startDate || new Date(),
                        endDate: exp.endDate || null,
                        createdAt: exp.createdAt || new Date(),
                        updatedAt: new Date()
                      }));
                      handleExperienceSave(experiences);
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#667eea',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    Use Extracted Experience
                  </button>
                </div>
              </div>
            </GlassmorphicContainer>
          </div>
        );

      case 'skills':
        return (
          <SkillsForm
            initialSkills={parsedData.skills}
            onSave={handleSkillsSave}
            onCancel={() => setActiveTab('experience')}
          />
        );

      case 'review':
        return (
          <GlassmorphicContainer intensity="medium">
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              Review Your Information
            </h2>
            
            <div style={{ textAlign: 'left', maxWidth: '700px', margin: '0 auto' }}>
              {/* Personal Info Summary */}
              <div style={{ marginBottom: '2rem' }}>
                <h3>Personal Information</h3>
                {formData.personalInfo ? (
                  <div style={{ 
                    padding: '1rem', 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                  }}>
                    <p><strong>Name:</strong> {formData.personalInfo.firstName} {formData.personalInfo.lastName}</p>
                    <p><strong>Email:</strong> {formData.personalInfo.email}</p>
                    {formData.personalInfo.phone && <p><strong>Phone:</strong> {formData.personalInfo.phone}</p>}
                    {formData.personalInfo.location && <p><strong>Location:</strong> {formData.personalInfo.location}</p>}
                  </div>
                ) : (
                  <p style={{ opacity: 0.7 }}>Personal information not completed</p>
                )}
              </div>

              {/* Experience Summary */}
              <div style={{ marginBottom: '2rem' }}>
                <h3>Experience ({formData.experience.length} entries)</h3>
                {formData.experience.length > 0 ? (
                  formData.experience.map((exp, index) => (
                    <div key={exp.id} style={{ 
                      padding: '1rem', 
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      marginBottom: '0.5rem'
                    }}>
                      <p><strong>{exp.title}</strong> at {exp.organization}</p>
                    </div>
                  ))
                ) : (
                  <p style={{ opacity: 0.7 }}>No experience entries added</p>
                )}
              </div>

              {/* Skills Summary */}
              <div style={{ marginBottom: '2rem' }}>
                <h3>Skills ({formData.skills.length} skills)</h3>
                {formData.skills.length > 0 ? (
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '0.5rem',
                    padding: '1rem', 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px'
                  }}>
                    {formData.skills.map((skill, index) => (
                      <span
                        key={skill.id}
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: 'rgba(102, 126, 234, 0.2)',
                          borderRadius: '16px',
                          fontSize: '0.875rem',
                          border: '1px solid rgba(102, 126, 234, 0.3)'
                        }}
                      >
                        {skill.name} (Level {skill.level})
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ opacity: 0.7 }}>No skills added</p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
                {onCancel && (
                  <button
                    onClick={onCancel}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    Cancel
                  </button>
                )}
                
                <button
                  onClick={handleFinalSave}
                  disabled={!formData.personalInfo}
                  style={{
                    padding: '0.75rem 2rem',
                    backgroundColor: formData.personalInfo ? '#667eea' : 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: formData.personalInfo ? 'pointer' : 'not-allowed',
                    fontSize: '1rem',
                    opacity: formData.personalInfo ? 1 : 0.5
                  }}
                >
                  Save Profile Data
                </button>
              </div>
            </div>
          </GlassmorphicContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      <GlassmorphicContainer intensity="high">
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Review & Correct OCR Results
        </h1>
        <p style={{ textAlign: 'center', opacity: 0.8, marginBottom: '2rem' }}>
          Please review and correct the automatically extracted information from your resume
        </p>
      </GlassmorphicContainer>

      <div style={{ marginTop: '2rem' }}>
        <PillNav activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
        
        <div style={{ marginTop: '2rem' }}>
          <CardSwap activeCardKey={activeTab}>
            {renderTabContent()}
          </CardSwap>
        </div>
      </div>
    </div>
  );
};

export default OCRCorrectionForm;