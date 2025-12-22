import React from 'react';
import { Skill, RenderMode, SKILL_LEVEL_MIN, SKILL_LEVEL_MAX } from '../../types';

interface SkillRendererProps {
  skills: Skill[];
  mode?: RenderMode;
  showCategories?: boolean;
  className?: string;
  onSkillClick?: (skill: Skill) => void;
}

interface SkillDotProps {
  level: number;
  mode: RenderMode;
  size?: 'small' | 'medium' | 'large';
}

const SkillDot: React.FC<SkillDotProps> = ({ level, mode, size = 'medium' }) => {
  const dotSizes = {
    small: { width: '8px', height: '8px', gap: '3px' },
    medium: { width: '12px', height: '12px', gap: '4px' },
    large: { width: '16px', height: '16px', gap: '6px' }
  };

  const currentSize = dotSizes[size];

  const renderDots = () => {
    const dots = [];
    
    for (let i = 1; i <= SKILL_LEVEL_MAX; i++) {
      const isFilled = i <= level;
      
      const dotStyle: React.CSSProperties = {
        display: 'inline-block',
        width: currentSize.width,
        height: currentSize.height,
        borderRadius: '50%',
        marginRight: currentSize.gap,
        transition: 'all 0.3s ease',
        ...(mode === 'web' ? {
          // Web mode: glowing blue dots
          backgroundColor: isFilled ? '#667eea' : 'rgba(255, 255, 255, 0.2)',
          boxShadow: isFilled ? '0 0 8px rgba(102, 126, 234, 0.6), 0 0 16px rgba(102, 126, 234, 0.3)' : 'none',
          border: isFilled ? '1px solid rgba(102, 126, 234, 0.8)' : '1px solid rgba(255, 255, 255, 0.3)'
        } : {
          // PDF mode: solid black dots
          backgroundColor: isFilled ? '#000000' : 'transparent',
          border: '1px solid #000000',
          boxShadow: 'none'
        })
      };

      dots.push(
        <span
          key={i}
          style={dotStyle}
          title={`Level ${i}${isFilled ? ' (achieved)' : ''}`}
        />
      );
    }
    
    return dots;
  };

  return (
    <div style={{ 
      display: 'inline-flex', 
      alignItems: 'center',
      marginLeft: '0.5rem'
    }}>
      {renderDots()}
    </div>
  );
};

const SkillRenderer: React.FC<SkillRendererProps> = ({
  skills,
  mode = 'web',
  showCategories = true,
  className = '',
  onSkillClick
}) => {
  // Group skills by category if showCategories is true
  const groupedSkills = showCategories 
    ? skills.reduce((groups, skill) => {
        const category = skill.category || 'Other';
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(skill);
        return groups;
      }, {} as Record<string, Skill[]>)
    : { 'All Skills': skills };

  const containerStyle: React.CSSProperties = {
    ...(mode === 'web' ? {
      color: 'white',
      fontFamily: 'inherit'
    } : {
      color: '#000000',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11pt'
    })
  };

  const categoryHeaderStyle: React.CSSProperties = {
    ...(mode === 'web' ? {
      fontSize: '1.1rem',
      fontWeight: 'bold',
      marginBottom: '0.75rem',
      marginTop: '1.5rem',
      color: '#667eea',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    } : {
      fontSize: '12pt',
      fontWeight: 'bold',
      marginBottom: '8pt',
      marginTop: '16pt',
      color: '#000000',
      textTransform: 'uppercase'
    })
  };

  const skillItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...(mode === 'web' ? {
      padding: '0.5rem 0.75rem',
      marginBottom: '0.5rem',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      cursor: onSkillClick ? 'pointer' : 'default',
      transition: 'all 0.3s ease'
    } : {
      padding: '4pt 0',
      marginBottom: '2pt',
      borderBottom: '0.5pt solid #cccccc'
    })
  };

  const skillNameStyle: React.CSSProperties = {
    ...(mode === 'web' ? {
      fontSize: '1rem',
      fontWeight: '500'
    } : {
      fontSize: '10pt',
      fontWeight: 'normal'
    })
  };

  const handleSkillClick = (skill: Skill) => {
    if (onSkillClick && mode === 'web') {
      onSkillClick(skill);
    }
  };

  const handleSkillHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode === 'web' && onSkillClick) {
      const target = e.currentTarget;
      target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      target.style.transform = 'translateY(-1px)';
    }
  };

  const handleSkillLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode === 'web' && onSkillClick) {
      const target = e.currentTarget;
      target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
      target.style.transform = 'translateY(0)';
    }
  };

  if (skills.length === 0) {
    return (
      <div style={containerStyle} className={className}>
        <p style={{ 
          opacity: mode === 'web' ? 0.7 : 1,
          fontStyle: 'italic',
          textAlign: 'center',
          padding: mode === 'web' ? '2rem' : '16pt'
        }}>
          No skills to display
        </p>
      </div>
    );
  }

  return (
    <div style={containerStyle} className={className}>
      {Object.entries(groupedSkills).map(([category, categorySkills]) => (
        <div key={category}>
          {showCategories && Object.keys(groupedSkills).length > 1 && (
            <h3 style={categoryHeaderStyle}>
              {category} ({categorySkills.length})
            </h3>
          )}
          
          <div>
            {categorySkills.map((skill) => (
              <div
                key={skill.id}
                style={skillItemStyle}
                onClick={() => handleSkillClick(skill)}
                onMouseEnter={handleSkillHover}
                onMouseLeave={handleSkillLeave}
                title={mode === 'web' ? `${skill.name} - Level ${skill.level}/5` : undefined}
              >
                <span style={skillNameStyle}>
                  {skill.name}
                </span>
                
                <SkillDot 
                  level={skill.level} 
                  mode={mode}
                  size={mode === 'web' ? 'medium' : 'small'}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {mode === 'web' && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '6px',
          fontSize: '0.875rem',
          opacity: 0.7,
          textAlign: 'center'
        }}>
          <span>● ● ● ● ● Skill levels: 1 (Beginner) to 5 (Expert)</span>
        </div>
      )}
    </div>
  );
};

export default SkillRenderer;
export { SkillDot };