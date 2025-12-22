import React, { useState } from 'react';
import PrismBackground from '../ui/PrismBackground';
import SplashCursor from '../ui/SplashCursor';
import PillNav from '../ui/PillNav';
import CardSwap from '../ui/CardSwap';
import GapNotificationContainer from '../ui/GapNotificationContainer';
import GlassmorphicContainer from '../ui/GlassmorphicContainer';
import styles from './Dashboard.module.css';
import { CareerGap } from '../../types';

type PageRoute = 'landing' | 'scanner' | 'dashboard' | 'editor' | 'resume';

interface DashboardProps {
    onNavigate: (page: PageRoute) => void;
}

// Mock data for initial development
const MOCK_GAPS: CareerGap[] = [
    {
        id: 'gap-1',
        startDate: new Date('2022-01-01'),
        endDate: new Date('2022-06-01'),
        durationDays: 151,
        type: 'employment',
        severity: 'minor',
        isResolved: false,
        createdAt: new Date()
    }
];

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState('experience');
    const [gaps, setGaps] = useState<CareerGap[]>(MOCK_GAPS);

    const tabs = [
        { id: 'experience', label: 'Experience' },
        { id: 'education', label: 'Education' },
        { id: 'skills', label: 'Skills' },
        { id: 'projects', label: 'Projects' }
    ];

    const handleGapUpdate = (gapId: string, updates: Partial<CareerGap>) => {
        setGaps(prev => prev.map(gap =>
            gap.id === gapId ? { ...gap, ...updates } : gap
        ));
    };

    const handleGapDismiss = (gapId: string) => {
        setGaps(prev => prev.filter(gap => gap.id !== gapId));
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'experience':
                return (
                    <div className={styles.sectionContent}>
                        {/* Placeholder for Experience List */}
                        <div className={styles.placeholder}>Experience Section Content</div>
                    </div>
                );
            case 'education':
                return (
                    <div className={styles.sectionContent}>
                        <div className={styles.placeholder}>Education Section Content</div>
                    </div>
                );
            case 'skills':
                return (
                    <div className={styles.sectionContent}>
                        <div className={styles.placeholder}>Skills Section Content</div>
                    </div>
                );
            case 'projects':
                return (
                    <div className={styles.sectionContent}>
                        <div className={styles.placeholder}>Projects Section Content</div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.backgroundWrapper}>
                <PrismBackground />
            </div>

            <SplashCursor />

            <div className={styles.contentWrapper}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Dashboard</h1>
                    <nav className={styles.topNav}>
                        <a href="/" style={{ color: 'rgba(255,255,255,0.7)', marginRight: '1rem', textDecoration: 'none' }}>Home</a>
                        <a href="/profile" style={{ color: '#fff', fontWeight: 'bold', textDecoration: 'none' }}>Profile</a>
                    </nav>
                </header>

                <GapNotificationContainer
                    gaps={gaps}
                    onUpdateGap={handleGapUpdate}
                    onDismissGap={handleGapDismiss}
                />

                <div className={styles.navigation}>
                    <PillNav
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        tabs={tabs}
                    />
                </div>

                <main className={styles.mainContent}>
                    <GlassmorphicContainer intensity="low">
                        <CardSwap activeCardKey={activeTab}>
                            {renderContent()}
                        </CardSwap>
                    </GlassmorphicContainer>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
