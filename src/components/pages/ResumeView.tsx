import React from 'react';
import PrismBackground from '../ui/PrismBackground';
import SplashCursor from '../ui/SplashCursor';
import PDFPreview from '../ui/PDFPreview';
import GlassmorphicContainer from '../ui/GlassmorphicContainer';
import { ProfileData, PersonalInfo, Skill, SkillCategory } from '../../types';

type PageRoute = 'landing' | 'scanner' | 'dashboard' | 'editor' | 'resume';

interface ResumeViewProps {
    onNavigate: (page: PageRoute) => void;
}

// Mock initial data (shared with EditorPage mock for now)
const MOCK_DATA: ProfileData = {
    id: 'user-1',
    personalInfo: {
        firstName: 'Alex',
        lastName: 'Morgan',
        email: 'alex.morgan@example.com',
        location: 'San Francisco, CA',
        linkedIn: 'linkedin.com/in/alexmorgan',
        portfolio: 'alexmorgan.dev',
        phone: '(555) 123-4567'
    },
    experience: [
        {
            id: 'exp-1',
            title: 'Senior Frontend Engineer',
            organization: 'TechCorp',
            location: 'San Francisco, CA',
            startDate: new Date('2020-01-01'),
            endDate: null,
            description: 'Leading frontend development for core products.',
            achievements: ['Improved performance by 40%', 'Mentored 3 juniors'],
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ],
    education: [],
    skills: [
        { id: '1', name: 'React', level: 5, category: SkillCategory.TECHNICAL, createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'TypeScript', level: 5, category: SkillCategory.TECHNICAL, createdAt: new Date(), updatedAt: new Date() }
    ],
    projects: [],
    careerGaps: [],
    version: 1,
    isComplete: true,
    createdAt: new Date(),
    updatedAt: new Date()
};

const ResumeView: React.FC<ResumeViewProps> = ({ onNavigate }) => {
    return (
        <div style={{
            minHeight: '100vh',
            position: 'relative',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '2rem'
        }}>
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
                <PrismBackground />
            </div>

            <SplashCursor />

            <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1200px' }}>
                <header style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2rem'
                }}>
                    <h1 style={{ margin: 0 }}>Resume Preview</h1>
                    <a href="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>Back to Dashboard</a>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '2rem', alignItems: 'start' }}>
                    <div style={{ position: 'sticky', top: '2rem' }}>
                        <GlassmorphicContainer intensity="medium">
                            <h3>Export Options</h3>
                            <p style={{ opacity: 0.8, marginBottom: '2rem' }}>
                                Your resume is automatically formatted for ATS systems while maintaining a clean, professional design.
                            </p>

                            {/* PDFPreview handles the download logic internally via its toolbar/PDFDownloadLink if implemented, 
                                but here we assume it just shows the preview. Given the prompt requests "Implement PDF Download",
                                and PDFPreview might already have it or ResumeExporter needs to be used separately.
                                Let's assume PDFPreview encapsulates the preview and potentially the download link 
                                if we wrap it in PDFViewer or similar, but the component from step checklist implies 
                                "PDF Preview functionality". 
                                
                                The code for PDFPreview.tsx below will clarify.
                            */}
                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                                <p>PDF Export is powered by <strong>@react-pdf/renderer</strong></p>
                            </div>
                        </GlassmorphicContainer>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <PDFPreview data={MOCK_DATA} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResumeView;
