import React from 'react';
import PrismBackground from '../ui/PrismBackground';
import SplashCursor from '../ui/SplashCursor';
import PillNav from '../ui/PillNav';

interface DashboardLayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeTab, onTabChange }) => {
    const tabs = [
        { id: 'portfolio', label: 'Portfolio' },
        { id: 'resume', label: 'Resume' },
        { id: 'contact', label: 'Contact' },
    ];

    return (
        <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }}>
            <PrismBackground />
            <SplashCursor />

            <main style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                height: '100%',
                paddingBottom: '100px' // Space for floating nav
            }}>
                {children}
            </main>

            <PillNav activeTab={activeTab} onTabChange={onTabChange} tabs={tabs} />
        </div>
    );
};

export default DashboardLayout;
