import React from 'react';
import '../../styles/glassmorphic.css';

interface GlassmorphicContainerProps {
    children: React.ReactNode;
    className?: string;
    intensity?: 'low' | 'medium' | 'high';
}

const GlassmorphicContainer: React.FC<GlassmorphicContainerProps> = ({
    children,
    className = '',
    intensity = 'medium'
}) => {
    const getIntensityClass = () => {
        switch (intensity) {
            case 'low': return 'glass';
            case 'high': return 'glass-high-contrast';
            default: return 'glass-panel';
        }
    };

    return (
        <div className={`${getIntensityClass()} ${className}`} style={{ padding: '2rem' }}>
            {children}
        </div>
    );
};

export default GlassmorphicContainer;
