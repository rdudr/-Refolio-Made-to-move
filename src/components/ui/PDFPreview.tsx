import React, { useState } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { ProfileData } from '../../types';
import { resumeExporter } from '../../services/resumeExporter';
import GlassmorphicContainer from './GlassmorphicContainer';
import styles from './PDFPreview.module.css';

interface PDFPreviewProps {
    data: ProfileData;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ data }) => {
    const [layout, setLayout] = useState<'single' | 'two-column'>('single');

    return (
        <div className={styles.container}>
            <GlassmorphicContainer intensity="low" className={styles.controls}>
                <h3 className={styles.title}>Resume Preview</h3>
                <div className={styles.buttonGroup}>
                    <button
                        className={`${styles.button} ${layout === 'single' ? styles.active : ''}`}
                        onClick={() => setLayout('single')}
                    >
                        Classic
                    </button>
                    <button
                        className={`${styles.button} ${layout === 'two-column' ? styles.active : ''}`}
                        onClick={() => setLayout('two-column')}
                    >
                        Modern (2-Col)
                    </button>
                </div>
            </GlassmorphicContainer>

            <div className={styles.viewerWrapper}>
                <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
                    {resumeExporter.getDocument(data, layout) as any}
                </PDFViewer>
            </div>
        </div>
    );
};

export default PDFPreview;
