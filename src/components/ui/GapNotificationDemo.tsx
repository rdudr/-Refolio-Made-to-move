import React, { useState } from 'react';
import { CareerGap } from '../../types';
import GapNotificationContainer from './GapNotificationContainer';
import GlassmorphicContainer from './GlassmorphicContainer';

const GapNotificationDemo: React.FC = () => {
  const [gaps, setGaps] = useState<CareerGap[]>([
    {
      id: 'gap-2022-01-01-to-2022-06-01',
      startDate: new Date('2022-01-01'),
      endDate: new Date('2022-06-01'),
      durationDays: 151,
      type: 'employment',
      severity: 'moderate',
      isResolved: false,
      createdAt: new Date('2023-01-01')
    },
    {
      id: 'gap-2020-03-15-to-2020-12-01',
      startDate: new Date('2020-03-15'),
      endDate: new Date('2020-12-01'),
      durationDays: 261,
      type: 'employment',
      severity: 'moderate',
      isResolved: false,
      notes: 'Career transition period - pursuing additional certifications',
      createdAt: new Date('2023-01-01')
    },
    {
      id: 'gap-2018-06-01-to-2019-08-01',
      startDate: new Date('2018-06-01'),
      endDate: new Date('2019-08-01'),
      durationDays: 426,
      type: 'education',
      severity: 'major',
      isResolved: true,
      notes: 'Completed Master\'s degree program',
      createdAt: new Date('2023-01-01')
    }
  ]);

  const handleUpdateGap = (gapId: string, updates: Partial<CareerGap>) => {
    setGaps(prevGaps => 
      prevGaps.map(gap => 
        gap.id === gapId 
          ? { ...gap, ...updates }
          : gap
      )
    );
  };

  const handleDismissGap = (gapId: string) => {
    setGaps(prevGaps => prevGaps.filter(gap => gap.id !== gapId));
  };

  const addSampleGap = () => {
    const newGap: CareerGap = {
      id: `gap-${Date.now()}`,
      startDate: new Date('2023-02-01'),
      endDate: new Date('2023-05-15'),
      durationDays: 103,
      type: 'employment',
      severity: 'minor',
      isResolved: false,
      createdAt: new Date()
    };
    setGaps(prevGaps => [...prevGaps, newGap]);
  };

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', background: 'var(--bg-gradient)' }}>
      <GlassmorphicContainer>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Gap Notification Demo
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            This demo shows how career gap notifications appear with pulsing red glass alerts,
            specific date ranges, gap durations, and action buttons for resolution.
          </p>
          <button
            onClick={addSampleGap}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Add Sample Gap
          </button>
        </div>

        <GapNotificationContainer
          gaps={gaps}
          onUpdateGap={handleUpdateGap}
          onDismissGap={handleDismissGap}
        />

        {gaps.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            color: 'var(--text-secondary)' 
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>
              ✅
            </div>
            <p style={{ fontSize: '1.1rem', margin: 0 }}>
              No career gaps detected. Your timeline looks great!
            </p>
          </div>
        )}
      </GlassmorphicContainer>
    </div>
  );
};

export default GapNotificationDemo;