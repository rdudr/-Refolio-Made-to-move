import React, { useCallback, useState } from 'react';
import { ocrService, OCRProgress } from '../../services/ocrService';
import { ParsedResumeData } from '../../types';
import GlassmorphicContainer from './GlassmorphicContainer';

interface FileUploadProps {
  onUploadComplete?: (data: ParsedResumeData) => void;
  onError?: (error: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete, onError }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OCRProgress | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsProcessing(true);
    setProgress({ status: 'Initializing...', progress: 0 });

    try {
      // Process the file with OCR
      const result = await ocrService.processResume(file, (progressData) => {
        setProgress(progressData);
      });

      if (result.success && result.text) {
        // Map the extracted text to structured data
        const parsedData = ocrService.mapTextToProfileData(result.text);
        
        setProgress({ status: 'Processing complete!', progress: 100 });
        
        if (onUploadComplete) {
          onUploadComplete(parsedData);
        }
      } else {
        const errorMessage = result.error || 'Failed to extract text from file';
        if (onError) {
          onError(errorMessage);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(null), 2000);
    }
  }, [onUploadComplete, onError]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  return (
    <GlassmorphicContainer intensity="medium">
      <div
        style={{
          border: `2px dashed ${dragActive ? '#667eea' : 'rgba(255, 255, 255, 0.3)'}`,
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          transition: 'all 0.3s ease',
          backgroundColor: dragActive ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
          cursor: isProcessing ? 'not-allowed' : 'pointer'
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => {
          if (!isProcessing) {
            document.getElementById('file-upload-input')?.click();
          }
        }}
      >
        <input
          id="file-upload-input"
          type="file"
          accept="image/*,.pdf"
          onChange={handleChange}
          style={{ display: 'none' }}
          disabled={isProcessing}
        />
        
        {isProcessing ? (
          <div>
            <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
              {progress?.status || 'Processing...'}
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: `${progress?.progress || 0}%`,
                height: '100%',
                backgroundColor: '#667eea',
                transition: 'width 0.3s ease',
                borderRadius: '4px'
              }} />
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
              {progress?.progress || 0}% complete
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
            <h3 style={{ margin: '0 0 1rem 0' }}>Upload Your Resume</h3>
            <p style={{ margin: '0 0 1rem 0', opacity: 0.8 }}>
              Drag and drop your resume here, or click to browse
            </p>
            <p style={{ fontSize: '0.9rem', opacity: 0.6 }}>
              Supports: JPEG, PNG, GIF, BMP, WebP, PDF (max 10MB)
            </p>
          </div>
        )}
      </div>
    </GlassmorphicContainer>
  );
};

export default FileUpload;