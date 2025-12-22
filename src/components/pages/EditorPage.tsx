import React, { useState } from 'react';
import PrismBackground from '../ui/PrismBackground';
import SplashCursor from '../ui/SplashCursor';
import GlassmorphicContainer from '../ui/GlassmorphicContainer';
import SkillManager from '../ui/SkillManager';
import styles from './EditorPage.module.css';
import { ProfileData, PersonalInfo, Skill } from '../../types';

type PageRoute = 'landing' | 'scanner' | 'dashboard' | 'editor' | 'resume';

interface EditorPageProps {
    onNavigate: (page: PageRoute) => void;
}

// Mock initial data
const INITIAL_DATA: ProfileData = {
    id: 'user-1',
    personalInfo: {
        firstName: 'Alex',
        lastName: 'Morgan',
        email: 'alex.morgan@example.com',
        location: 'San Francisco, CA',
        linkedIn: 'linkedin.com/in/alexmorgan',
        portfolio: 'alexmorgan.dev'
    },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    careerGaps: [],
    version: 1,
    isComplete: false,
    createdAt: new Date(),
    updatedAt: new Date()
};

const EditorPage: React.FC<EditorPageProps> = ({ onNavigate }) => {
    const [profileData, setProfileData] = useState<ProfileData>(INITIAL_DATA);
    const [isSaving, setIsSaving] = useState(false);

    const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            personalInfo: {
                ...prev.personalInfo,
                [name]: value
            }
        }));
    };

    const handleSkillsChange = (skills: Skill[]) => {
        setProfileData(prev => ({
            ...prev,
            skills
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSaving(false);
        alert('Profile saved successfully!');
    };

    return (
        <div className={styles.editorContainer}>
            <div className={styles.backgroundWrapper}>
                <PrismBackground />
            </div>

            <SplashCursor />

            <div className={styles.contentWrapper}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Edit Profile</h1>
                        <p style={{ opacity: 0.8 }}>Manage your professional identity</p>
                    </div>
                    <nav>
                        <a href="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>
                            Cancel
                        </a>
                    </nav>
                </header>

                <GlassmorphicContainer intensity="medium">
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Personal Information</h2>
                        <div className={styles.row}>
                            <div className={styles.col}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>First Name</label>
                                    <input
                                        name="firstName"
                                        value={profileData.personalInfo.firstName}
                                        onChange={handlePersonalInfoChange}
                                        className={styles.input}
                                        placeholder="First Name"
                                    />
                                </div>
                            </div>
                            <div className={styles.col}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Last Name</label>
                                    <input
                                        name="lastName"
                                        value={profileData.personalInfo.lastName}
                                        onChange={handlePersonalInfoChange}
                                        className={styles.input}
                                        placeholder="Last Name"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.row}>
                            <div className={styles.col}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Email</label>
                                    <input
                                        name="email"
                                        value={profileData.personalInfo.email}
                                        onChange={handlePersonalInfoChange}
                                        className={styles.input}
                                        placeholder="Email Address"
                                    />
                                </div>
                            </div>
                            <div className={styles.col}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Location</label>
                                    <input
                                        name="location"
                                        value={profileData.personalInfo.location || ''}
                                        onChange={handlePersonalInfoChange}
                                        className={styles.input}
                                        placeholder="City, State"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.row}>
                            <div className={styles.col}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>LinkedIn</label>
                                    <input
                                        name="linkedIn"
                                        value={profileData.personalInfo.linkedIn || ''}
                                        onChange={handlePersonalInfoChange}
                                        className={styles.input}
                                        placeholder="LinkedIn URL"
                                    />
                                </div>
                            </div>
                            <div className={styles.col}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Portfolio</label>
                                    <input
                                        name="portfolio"
                                        value={profileData.personalInfo.portfolio || ''}
                                        onChange={handlePersonalInfoChange}
                                        className={styles.input}
                                        placeholder="Portfolio URL"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Skills & Expertise</h2>
                        <div className={styles.formGroup}>
                            <SkillManager
                                initialSkills={profileData.skills}
                                onSkillsChange={handleSkillsChange}
                                allowEditing={true}
                                mode='web'
                            />
                        </div>
                    </section>
                </GlassmorphicContainer>
            </div>

            <div className={styles.actionPanel}>
                <button
                    className={styles.saveButton}
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default EditorPage;
