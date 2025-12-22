import React from 'react';
import { CareerGap } from '../../types';
import './GapNotification.css';

interface GapNotificationProps {
  gap: CareerGap;
  onDismiss: (gapId: string) => void;
  onResolve: (gapId: string) => void;
  onAddExplanation: (gapId: string) => void;
}

const GapNotification: React.FC<GapNotificationProps> = ({
  gap,
  onDismiss,
  onResolve,
  onAddExplanation
}) => {
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const formatDuration = (days: number): string => {
    if (days < 30) {
      return `${days} days`;
    } else if (days < 365) {
      const months = Math.floor(days / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(days / 365);
      const remainingMonths = Math.floor((days % 365) / 30);
      if (remainingMonths === 0) {
        return `${years} year${years > 1 ? 's' : ''}`;
      }
      return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    }
  };

  const getSeverityClass = (): string => {
    switch (gap.severity) {
      case 'minor': return 'gap-notification--minor';
      case 'moderate': return 'gap-notification--moderate';
      case 'major': return 'gap-notification--major';
      default: return 'gap-notification--moderate';
    }
  };

  const getSeverityIcon = (): string => {
    switch (gap.severity) {
      case 'minor': return '⚠️';
      case 'moderate': return '🔶';
      case 'major': return '🚨';
      default: return '⚠️';
    }
  };

  return (
    <div className={`gap-notification ${getSeverityClass()}`}>
      <div className="gap-notification__pulse-ring"></div>
      
      <div className="gap-notification__content">
        <div className="gap-notification__header">
          <span className="gap-notification__icon">{getSeverityIcon()}</span>
          <h3 className="gap-notification__title">
            Career Gap Detected
          </h3>
          <button 
            className="gap-notification__close"
            onClick={() => onDismiss(gap.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>

        <div className="gap-notification__details">
          <div className="gap-notification__period">
            <span className="gap-notification__label">Period:</span>
            <span className="gap-notification__value">
              {formatDate(gap.startDate)} - {formatDate(gap.endDate)}
            </span>
          </div>
          
          <div className="gap-notification__duration">
            <span className="gap-notification__label">Duration:</span>
            <span className="gap-notification__value">
              {formatDuration(gap.durationDays)}
            </span>
          </div>
          
          <div className="gap-notification__type">
            <span className="gap-notification__label">Type:</span>
            <span className="gap-notification__value gap-notification__type-badge">
              {gap.type === 'employment' ? 'Employment' : 'Education'}
            </span>
          </div>
        </div>

        <div className="gap-notification__actions">
          <button 
            className="gap-notification__action gap-notification__action--primary"
            onClick={() => onAddExplanation(gap.id)}
          >
            Add Explanation
          </button>
          <button 
            className="gap-notification__action gap-notification__action--secondary"
            onClick={() => onResolve(gap.id)}
          >
            Mark as Resolved
          </button>
        </div>

        {gap.notes && (
          <div className="gap-notification__notes">
            <span className="gap-notification__label">Notes:</span>
            <p className="gap-notification__notes-text">{gap.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GapNotification;