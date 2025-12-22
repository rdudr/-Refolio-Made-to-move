import React from 'react';
import PrismBackground from '../ui/PrismBackground';
import SplashCursor from '../ui/SplashCursor';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    return (
        <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }}>
            <PrismBackground />
            <SplashCursor />

            <main style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
                {children}
            </main>
        </div>
    );
};

export default MainLayout;
