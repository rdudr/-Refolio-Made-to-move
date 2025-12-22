import React, { useState, useEffect } from 'react';
import './App.css';
import MainLayout from './components/layouts/MainLayout';
import GlassmorphicContainer from './components/ui/GlassmorphicContainer';
import PillNav from './components/ui/PillNav';
import CardSwap from './components/ui/CardSwap';
import FileUpload from './components/ui/FileUpload';
import OCRCorrectionForm from './components/forms/OCRCorrectionForm';
import PDFPreview from './components/ui/PDFPreview';
import SkillRendererDemo from './components/ui/SkillRendererDemo';
import GapNotificationDemo from './components/ui/GapNotificationDemo';
import ProfileManager from './components/ProfileManager';
import AuthGuard from './components/auth/AuthGuard';
import LoginForm from './components/auth/LoginForm';
import { ParsedResumeData, ProfileData, PersonalInfo, ExperienceEntry, EducationEntry, Skill, Project } from './types';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { authService } from './services/authService';

// Helper to convert data types
const convertToProfileData = (parsed: ParsedResumeData | null, currentProfile: ProfileData | null): ProfileData => {
  if (currentProfile) return currentProfile;

  const baseData: ProfileData = {
    id: 'preview',
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      ...(parsed?.personalInfo || {})
    } as PersonalInfo,
    experience: (parsed?.experience || []) as ExperienceEntry[],
    education: (parsed?.education || []) as EducationEntry[],
    skills: (parsed?.skills || []) as Skill[],
    projects: (parsed?.projects || []) as Project[],
    careerGaps: [],
    version: 1,
    isComplete: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  return baseData;
};

// Main Content Component
const RefolioApp = () => {
  const { currentUser, userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState('upload');
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);
  const [localProfileData, setLocalProfileData] = useState<Partial<ProfileData> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Effect: When userProfile loads from Firestore, sync it
  useEffect(() => {
    if (userProfile) {
      setLocalProfileData(userProfile);
    }
  }, [userProfile]);

  const tabs = [
    { id: 'upload', label: 'Upload Resume' },
    { id: 'correct', label: 'Review & Correct' },
    { id: 'profile', label: 'Profile Manager' },
    { id: 'results', label: 'Profile Data' },
    { id: 'preview', label: 'PDF Preview' },
    { id: 'skills', label: 'Skills Demo' },
    { id: 'gaps', label: 'Gap Notifications' },
  ];

  const handleUploadComplete = (data: ParsedResumeData) => {
    setParsedData(data);
    setError(null);
    setActiveTab('correct');
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setParsedData(null);
  };

  const handleProfileSave = (data: Partial<ProfileData>) => {
    setLocalProfileData(data);
    setActiveTab('results');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'upload':
        return (
          <GlassmorphicContainer intensity="medium">
            <h2 style={{ marginBottom: '1rem' }}>Resume & Profile</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <h3>Upload New Resume (OCR)</h3>
                <p style={{ opacity: 0.7, marginBottom: '1rem' }}>Extract data from PDF/Image</p>
                <FileUpload
                  onUploadComplete={handleUploadComplete}
                  onError={handleError}
                />
              </div>

              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '2rem' }}>
                <h3>Account Access</h3>
                <p style={{ opacity: 0.7, marginBottom: '1rem' }}>
                  {currentUser ? `Logged in as ${currentUser.email}` : 'Sign in to access your saved profile'}
                </p>
                {!currentUser ? (
                  <LoginForm />
                ) : (
                  <div>
                    <p>Welcome back! Your data is automatically saved.</p>
                    <button
                      onClick={() => authService.logout()}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(255,100,100,0.2)',
                        border: '1px solid rgba(255,100,100,0.3)',
                        color: '#ffaaaa',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginTop: '1rem'
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                border: '1px solid rgba(255, 0, 0, 0.3)',
                borderRadius: '8px',
                color: '#ff6b6b'
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}
          </GlassmorphicContainer>
        );

      case 'correct':
        return parsedData ? (
          <OCRCorrectionForm
            parsedData={parsedData}
            onSave={handleProfileSave}
            onCancel={() => setActiveTab('upload')}
          />
        ) : (
          <GlassmorphicContainer intensity="medium">
            <h2 style={{ marginBottom: '1rem' }}>No Data to Correct</h2>
            <p>Please upload a resume first to begin the correction process.</p>
            <button
              onClick={() => setActiveTab('upload')}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#667eea',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Go to Upload
            </button>
          </GlassmorphicContainer>
        );

      case 'profile':
        return (
          <AuthGuard>
            <ProfileManager />
          </AuthGuard>
        );

      case 'results':
        return (
          <AuthGuard fallback={
            localProfileData ? null : undefined
          }>
            <GlassmorphicContainer intensity="medium">
              <h2 style={{ marginBottom: '1rem' }}>User Profile Data</h2>

              {localProfileData ? (
                <div style={{ textAlign: 'left' }}>
                  <div style={{ marginBottom: '2rem' }}>
                    <h3>Profile Summary</h3>
                    <div style={{
                      padding: '1rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      marginBottom: '1rem'
                    }}>
                      <p><strong>Name:</strong> {localProfileData.personalInfo?.firstName} {localProfileData.personalInfo?.lastName}</p>
                      <p><strong>Email:</strong> {localProfileData.personalInfo?.email}</p>
                      <p><strong>Experience Entries:</strong> {localProfileData.experience?.length || 0}</p>
                      <p><strong>Skills:</strong> {localProfileData.skills?.length || 0}</p>
                      <p><strong>Source:</strong> {userProfile ? 'Cloud Firestore' : 'Local OCR Session'}</p>
                    </div>
                  </div>

                  <div style={{ marginBottom: '2rem' }}>
                    <h3>Data Structure (JSON)</h3>
                    <pre style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      padding: '1rem',
                      borderRadius: '8px',
                      overflow: 'auto',
                      fontSize: '0.8rem',
                      maxHeight: '400px'
                    }}>
                      {JSON.stringify(localProfileData, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <p>No profile data loaded. Usage logic: Upload a resume (OCR) OR Login to view saved data.</p>
              )}
            </GlassmorphicContainer>
          </AuthGuard>
        );

      case 'preview':
        return (
          <div style={{ height: '70vh' }}>
            {localProfileData || parsedData ? (
              <PDFPreview data={convertToProfileData(parsedData, localProfileData as ProfileData)} />
            ) : (
              <GlassmorphicContainer intensity="medium">
                <p>Please upload a resume or login to generate a preview.</p>
              </GlassmorphicContainer>
            )}
          </div>
        );

      case 'skills':
        return <SkillRendererDemo />;

      case 'gaps':
        return <GapNotificationDemo />;

      default:
        return (
          <GlassmorphicContainer intensity="medium">
            <h2 style={{ marginBottom: '1rem' }}>
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <p>
              This is the {activeTab} section. The OCR processing system is now integrated!
            </p>
          </GlassmorphicContainer>
        );
    }
  };

  return (
    <MainLayout>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem'
      }}>
        <GlassmorphicContainer intensity="high" className="text-glow">
          <h1 style={{
            fontSize: '3rem',
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Refolio
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>Made to move</p>
        </GlassmorphicContainer>

        <div style={{ marginTop: '3rem', width: '100%', maxWidth: '1200px' }}>
          <PillNav activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />

          <div style={{ marginTop: '2rem' }}>
            <CardSwap activeCardKey={activeTab}>
              {renderTabContent()}
            </CardSwap>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

// Root App Component
function App() {
  return (
    <AuthProvider>
      <RefolioApp />
    </AuthProvider>
  );
}

export default App;
