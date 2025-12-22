import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ProfileData, ExperienceEntry, EducationEntry, CareerGap } from '../types';
import ExperienceForm from './forms/ExperienceForm';
import EducationForm from './forms/EducationForm';
import GapNotificationContainer from './ui/GapNotificationContainer';
import GlassmorphicContainer from './ui/GlassmorphicContainer';

interface ProfileManagerProps {
  className?: string;
}

const ProfileManager: React.FC<ProfileManagerProps> = ({ className = '' }) => {
  const { userProfile, updateUserProfile, currentUser } = useAuth();
  const [activeSection, setActiveSection] = useState<'experience' | 'education' | 'gaps'>('experience');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Handle gap updates
  const handleUpdateGap = async (gapId: string, updates: Partial<CareerGap>) => {
    if (!userProfile) return;

    const updatedGaps = userProfile.careerGaps?.map(gap => 
      gap.id === gapId ? { ...gap, ...updates } : gap
    ) || [];

    await updateUserProfile({
      careerGaps: updatedGaps
    });
  };

  // Handle gap dismissal
  const handleDismissGap = async (gapId: string) => {
    if (!userProfile) return;

    const updatedGaps = userProfile.careerGaps?.filter(gap => gap.id !== gapId) || [];

    await updateUserProfile({
      careerGaps: updatedGaps
    });
  };

  // Handle experience save
  const handleExperienceSave = (data: ExperienceEntry) => {
    setEditingItem(null);
    setShowAddForm(false);
  };

  // Handle education save
  const handleEducationSave = (data: EducationEntry) => {
    setEditingItem(null);
    setShowAddForm(false);
  };

  // Handle item deletion
  const handleDeleteItem = async (type: 'experience' | 'education', itemId: string) => {
    if (!userProfile) return;

    if (type === 'experience') {
      const updatedExperience = userProfile.experience?.filter(exp => exp.id !== itemId) || [];
      await updateUserProfile({ experience: updatedExperience });
    } else {
      const updatedEducation = userProfile.education?.filter(edu => edu.id !== itemId) || [];
      await updateUserProfile({ education: updatedEducation });
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Present';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const renderExperienceList = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Work Experience ({userProfile?.experience?.length || 0})</h3>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#667eea',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Add Experience
        </button>
      </div>

      {showAddForm && activeSection === 'experience' && (
        <div style={{ marginBottom: '2rem' }}>
          <ExperienceForm
            onSave={handleExperienceSave}
            onCancel={() => setShowAddForm(false)}
            autoSave={true}
          />
        </div>
      )}

      {userProfile?.experience?.map(exp => (
        <div
          key={exp.id}
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: editingItem === exp.id ? '2px solid #667eea' : '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {editingItem === exp.id ? (
            <ExperienceForm
              initialData={exp}
              onSave={handleExperienceSave}
              onCancel={() => setEditingItem(null)}
              autoSave={true}
            />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{exp.title}</h4>
                  <p style={{ margin: '0 0 0.5rem 0', opacity: 0.8 }}>{exp.organization}</p>
                  <p style={{ margin: '0', fontSize: '0.9rem', opacity: 0.7 }}>
                    {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setEditingItem(exp.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'rgba(102, 126, 234, 0.2)',
                      border: '1px solid rgba(102, 126, 234, 0.3)',
                      borderRadius: '4px',
                      color: '#667eea',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteItem('experience', exp.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'rgba(255, 107, 107, 0.2)',
                      border: '1px solid rgba(255, 107, 107, 0.3)',
                      borderRadius: '4px',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {exp.description && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                  {exp.description}
                </p>
              )}
            </>
          )}
        </div>
      ))}

      {(!userProfile?.experience || userProfile.experience.length === 0) && !showAddForm && (
        <p style={{ textAlign: 'center', opacity: 0.7, padding: '2rem' }}>
          No work experience added yet. Click "Add Experience" to get started.
        </p>
      )}
    </div>
  );

  const renderEducationList = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Education ({userProfile?.education?.length || 0})</h3>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#667eea',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Add Education
        </button>
      </div>

      {showAddForm && activeSection === 'education' && (
        <div style={{ marginBottom: '2rem' }}>
          <EducationForm
            onSave={handleEducationSave}
            onCancel={() => setShowAddForm(false)}
            autoSave={true}
          />
        </div>
      )}

      {userProfile?.education?.map(edu => (
        <div
          key={edu.id}
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: editingItem === edu.id ? '2px solid #667eea' : '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {editingItem === edu.id ? (
            <EducationForm
              initialData={edu}
              onSave={handleEducationSave}
              onCancel={() => setEditingItem(null)}
              autoSave={true}
            />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{edu.degree}</h4>
                  <p style={{ margin: '0 0 0.5rem 0', opacity: 0.8 }}>{edu.organization}</p>
                  <p style={{ margin: '0', fontSize: '0.9rem', opacity: 0.7 }}>
                    {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                  </p>
                  {edu.fieldOfStudy && (
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', opacity: 0.7 }}>
                      Field: {edu.fieldOfStudy}
                    </p>
                  )}
                  {edu.gpa && (
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', opacity: 0.7 }}>
                      GPA: {edu.gpa}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setEditingItem(edu.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'rgba(102, 126, 234, 0.2)',
                      border: '1px solid rgba(102, 126, 234, 0.3)',
                      borderRadius: '4px',
                      color: '#667eea',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteItem('education', edu.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'rgba(255, 107, 107, 0.2)',
                      border: '1px solid rgba(255, 107, 107, 0.3)',
                      borderRadius: '4px',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ))}

      {(!userProfile?.education || userProfile.education.length === 0) && !showAddForm && (
        <p style={{ textAlign: 'center', opacity: 0.7, padding: '2rem' }}>
          No education added yet. Click "Add Education" to get started.
        </p>
      )}
    </div>
  );

  const renderGapAnalysis = () => (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h3>Career Gap Analysis</h3>
        <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
          Automatic gap detection runs when you update your timeline data.
          {userProfile?.lastAnalyzed && (
            <span> Last analyzed: {new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }).format(userProfile.lastAnalyzed)}</span>
          )}
        </p>
      </div>

      {userProfile?.careerGaps && userProfile.careerGaps.length > 0 ? (
        <GapNotificationContainer
          gaps={userProfile.careerGaps}
          onUpdateGap={handleUpdateGap}
          onDismissGap={handleDismissGap}
        />
      ) : (
        <GlassmorphicContainer intensity="low">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h4 style={{ color: '#4ade80', marginBottom: '0.5rem' }}>✅ No Career Gaps Detected</h4>
            <p style={{ opacity: 0.7 }}>
              Your timeline appears continuous with no gaps exceeding 90 days.
            </p>
          </div>
        </GlassmorphicContainer>
      )}
    </div>
  );

  if (!currentUser) {
    return (
      <GlassmorphicContainer intensity="medium">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h3>Please log in to manage your profile</h3>
          <p style={{ opacity: 0.7 }}>
            Profile management and automatic gap detection require authentication.
          </p>
        </div>
      </GlassmorphicContainer>
    );
  }

  return (
    <div className={className}>
      <GlassmorphicContainer intensity="medium">
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          Profile Manager
        </h2>

        {/* Section Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          justifyContent: 'center'
        }}>
          {[
            { id: 'experience', label: 'Experience' },
            { id: 'education', label: 'Education' },
            { id: 'gaps', label: 'Gap Analysis' }
          ].map(section => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id as any);
                setShowAddForm(false);
                setEditingItem(null);
              }}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: activeSection === section.id 
                  ? '#667eea' 
                  : 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.3s ease'
              }}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Section Content */}
        <div style={{ minHeight: '400px' }}>
          {activeSection === 'experience' && renderExperienceList()}
          {activeSection === 'education' && renderEducationList()}
          {activeSection === 'gaps' && renderGapAnalysis()}
        </div>
      </GlassmorphicContainer>
    </div>
  );
};

export default ProfileManager;