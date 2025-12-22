import React, { useState } from 'react';
import PrismBackground from '../ui/PrismBackground';
import SplashCursor from '../ui/SplashCursor';
import GlassmorphicContainer from '../ui/GlassmorphicContainer';
import FileUpload from '../ui/FileUpload';
import styles from './ScannerPage.module.css';
import { ParsedResumeData } from '../../types';

type PageRoute = 'landing' | 'scanner' | 'dashboard' | 'editor' | 'resume';

interface ScannerPageProps {
    onNavigate: (page: PageRoute) => void;
    onScanComplete?: (data: ParsedResumeData) => void;
}

const ScannerPage: React.FC<ScannerPageProps> = ({ onNavigate, onScanComplete }) => {
    const [error, setError] = useState<string | null>(null);

    const handleUploadComplete = (data: ParsedResumeData) => {
        // Navigate to dashboard or next step with data
        console.log('Scanned Data:', data);
        if (onScanComplete) {
            onScanComplete(data);
        }
        // Navigate to dashboard after successful scan
        onNavigate('dashboard');
    };

    const handleError = (errorMessage: string) => {
        setError(errorMessage);
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.backgroundWrapper}>
                <PrismBackground />
            </div>

            <SplashCursor />

            <div className={styles.contentWrapper}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Resume Scanner</h1>
                    <p className={styles.subtitle}>Upload your resume to instantly generate your Refolio profile</p>
                </header>

                <section className={styles.glassContainer}>
                    <GlassmorphicContainer intensity="high" className={styles.glassContainer}>
                        <FileUpload
                            onUploadComplete={handleUploadComplete}
                            onError={handleError}
                        />
                        {error && (
                            <div style={{ marginTop: '1rem', color: '#ff6b6b', textAlign: 'center' }}>
                                {error}
                            </div>
                        )}
                    </GlassmorphicContainer>
                </section>

                <nav className={styles.navigation}>
                    <a href="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
                        ← Back to Home
                    </a>
                </nav>
            </div>
        </div>
    );
};

export default ScannerPage;
