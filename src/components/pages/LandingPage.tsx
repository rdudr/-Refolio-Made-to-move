import React from 'react';
import SplashCursor from '../ui/SplashCursor';
import PrismBackground from '../ui/PrismBackground';
import GlassmorphicContainer from '../ui/GlassmorphicContainer';
import styles from './LandingPage.module.css';

type PageRoute = 'landing' | 'scanner' | 'dashboard' | 'editor' | 'resume';

interface LandingPageProps {
    onNavigate: (page: PageRoute) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
    return (
        <div className={styles.pageContainer}>
            <div className={styles.backgroundWrapper}>
                <PrismBackground />
            </div>

            <SplashCursor />

            <div className={styles.contentWrapper}>
                <GlassmorphicContainer intensity="high" className={styles.glassContainer}>
                    <section className={styles.heroSection}>
                        <h1 className={styles.title}>Refolio</h1>
                        <p className={styles.tagline}>Made to move</p>
                    </section>

                    <nav className={styles.navigation}>
                        <button 
                            onClick={() => onNavigate('scanner')}
                            className={styles.navButton}
                        >
                            Upload Resume
                        </button>
                        <button 
                            onClick={() => onNavigate('dashboard')}
                            className={styles.navButton}
                        >
                            Dashboard
                        </button>
                        <button 
                            onClick={() => onNavigate('editor')}
                            className={styles.navButton}
                        >
                            Edit Profile
                        </button>
                    </nav>
                </GlassmorphicContainer>
            </div>
        </div>
    );
};

export default LandingPage;
