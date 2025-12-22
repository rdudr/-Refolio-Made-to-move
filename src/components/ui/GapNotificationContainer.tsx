import React, { useState } from 'react';
import { CareerGap } from '../../types';
import GapNotification from './GapNotification';
import './GapNotificationContainer.css';

interface GapNotificationContainerProps {
  gaps: CareerGap[];
  onUpdateGap: (gapId: string, updates: Partial<CareerGap>) => void;
  onDismissGap: (gapId: string) => void;
  className?: string;
}

const GapNotificationContainer: React.FC<GapNotificationContainerProps> = ({
  gaps,
  onUpdateGap,
  onDismissGap,
  className = ''
}) => {
  const [showResolved, setShowResolved] = useState(false);

  // Filter gaps based on resolution status
  const activeGaps = gaps.filter(gap => !gap.isResolved);
  const resolvedGaps = gaps.filter(gap => gap.isResolved);

  const handleDismiss = (gapId: string) => {
    onDismissGap(gapId);
  };

  const handleResolve = (gapId: string) => {
    onUpdateGap(gapId, { 
      isResolved: true
    });
  };

  const handleAddExplanation = (gapId: string) => {
    // This would typically open a modal or form
    // For now, we'll prompt for a simple explanation
    const explanation = window.prompt('Please provide an explanation for this career gap:');
    if (explanation && explanation.trim()) {
      onUpdateGap(gapId, { 
        notes: explanation.trim()
      });
    }
  };

  if (gaps.length === 0) {
    return null;
  }

  return (
    <div className={`gap-notification-container ${className}`}>
      {activeGaps.length > 0 && (
        <div className="gap-notification-container__section">
          <div className="gap-notification-container__header">
            <h2 className="gap-notification-container__title">
              Career Gap Alerts ({activeGaps.length})
            </h2>
            <div className="gap-notification-container__summary">
              {activeGaps.length === 1 
                ? '1 gap requires attention' 
                : `${activeGaps.length} gaps require attention`
              }
            </div>
          </div>
          
          <div className="gap-notification-container__list">
            {activeGaps.map(gap => (
              <GapNotification
                key={gap.id}
                gap={gap}
                onDismiss={handleDismiss}
                onResolve={handleResolve}
                onAddExplanation={handleAddExplanation}
              />
            ))}
          </div>
        </div>
      )}

      {resolvedGaps.length > 0 && (
        <div className="gap-notification-container__section">
          <button
            className="gap-notification-container__toggle"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? 'Hide' : 'Show'} Resolved Gaps ({resolvedGaps.length})
            <span className={`gap-notification-container__toggle-icon ${showResolved ? 'expanded' : ''}`}>
              ▼
            </span>
          </button>
          
          {showResolved && (
            <div className="gap-notification-container__list gap-notification-container__list--resolved">
              {resolvedGaps.map(gap => (
                <GapNotification
                  key={gap.id}
                  gap={gap}
                  onDismiss={handleDismiss}
                  onResolve={handleResolve}
                  onAddExplanation={handleAddExplanation}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GapNotificationContainer;