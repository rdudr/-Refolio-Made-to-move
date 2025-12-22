import React, { useState } from 'react';
import { Skill, SkillCategory, RenderMode } from '../../types';
import SkillRenderer from './SkillRenderer';
import SkillManager from './SkillManager';
import GlassmorphicContainer from './GlassmorphicContainer';

const SkillRendererDemo: React.FC = () => {
  const [renderMode, setRenderMode] = useState<RenderMode>('web');
  const [showCategories, setShowCategories] = useState(true);
  const [demoMode, setDemoMode] = useState<'renderer' | 'manager'>('renderer');
  const [managedSkills, setManagedSkills] = useState<Skill[]>([]);

  // Sample skills data for demonstration
  const sampleSkills: Skill[] = [
    {
      id: 'skill-1',
      name: 'JavaScript',
      level: 5,
      category: SkillCategory.TECHNICAL,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'skill-2',
      name: 'React',
      level: 4,
      category: SkillCategory.FRAMEWORK,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'skill-3',
      name: 'TypeScript',
      level: 4,
      category: SkillCategory.TECHNICAL,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'skill-4',
      name: 'Node.js',
      level: 3,
      category: SkillCategory.FRAMEWORK,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'skill-5',
      name: 'Docker',
      level: 3,
      category: SkillCategory.TOOL,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'skill-6',
      name: 'Git',
      level: 4,
      category: SkillCategory.TOOL,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'skill-7',
      name: 'Project Management',
      level: 3,
      category: SkillCategory.SOFT,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'skill-8',
      name: 'Spanish',
      level: 2,
      category: SkillCategory.LANGUAGE,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const handleSkillClick = (skill: Skill) => {
    alert(`Clicked on ${skill.name} (Level ${skill.level})`);
  };

  const handleSkillsChange = (skills: Skill[]) => {
    setManagedSkills(skills);
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    margin: '0.25rem',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.3s ease'
  };

  const activeButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#667eea',
    borderColor: '#667eea'
  };

  return (
    <GlassmorphicContainer intensity="medium">
      <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        Skill System Demo
      </h2>
      
      {/* Mode Selection */}
      <div style={{ 
        marginBottom: '2rem', 
        textAlign: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ marginRight: '1rem', fontWeight: 'bold' }}>Demo Mode:</label>
          <button
            style={demoMode === 'renderer' ? activeButtonStyle : buttonStyle}
            onClick={() => setDemoMode('renderer')}
          >
            Skill Renderer
          </button>
          <button
            style={demoMode === 'manager' ? activeButtonStyle : buttonStyle}
            onClick={() => setDemoMode('manager')}
          >
            Skill Manager
          </button>
        </div>

        {demoMode === 'renderer' && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ marginRight: '1rem', fontWeight: 'bold' }}>Render Mode:</label>
              <button
                style={renderMode === 'web' ? activeButtonStyle : buttonStyle}
                onClick={() => setRenderMode('web')}
              >
                Web Mode (Glowing Blue)
              </button>
              <button
                style={renderMode === 'pdf' ? activeButtonStyle : buttonStyle}
                onClick={() => setRenderMode('pdf')}
              >
                PDF Mode (Solid Black)
              </button>
            </div>
            
            <div>
              <label style={{ marginRight: '1rem', fontWeight: 'bold' }}>Display:</label>
              <button
                style={showCategories ? activeButtonStyle : buttonStyle}
                onClick={() => setShowCategories(true)}
              >
                Show Categories
              </button>
              <button
                style={!showCategories ? activeButtonStyle : buttonStyle}
                onClick={() => setShowCategories(false)}
              >
                Flat List
              </button>
            </div>
          </>
        )}
      </div>

      {/* Demo Content */}
      {demoMode === 'renderer' ? (
        <div style={{
          ...(renderMode === 'pdf' ? {
            backgroundColor: 'white',
            color: 'black',
            padding: '2rem',
            borderRadius: '8px',
            minHeight: '400px'
          } : {})
        }}>
          <SkillRenderer
            skills={sampleSkills}
            mode={renderMode}
            showCategories={showCategories}
            onSkillClick={renderMode === 'web' ? handleSkillClick : undefined}
          />
        </div>
      ) : (
        <div>
          <SkillManager
            initialSkills={managedSkills.length > 0 ? managedSkills : sampleSkills.slice(0, 4)}
            onSkillsChange={handleSkillsChange}
            mode="web"
            allowEditing={true}
          />
        </div>
      )}

      {/* Info Panel */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '8px',
        fontSize: '0.9rem',
        opacity: 0.8
      }}>
        <h4>Features Demonstrated:</h4>
        {demoMode === 'renderer' ? (
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
            <li><strong>Web Mode:</strong> Glowing blue dots with hover effects and click interactions</li>
            <li><strong>PDF Mode:</strong> Solid black dots optimized for print and ATS systems</li>
            <li><strong>Skill Levels:</strong> 1-5 dot visualization with proper validation</li>
            <li><strong>Categories:</strong> Automatic grouping by skill category</li>
            <li><strong>Responsive:</strong> Adapts to different container sizes</li>
            <li><strong>Accessibility:</strong> Proper tooltips and semantic markup</li>
          </ul>
        ) : (
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
            <li><strong>Interactive Management:</strong> Click skills to edit, quick level adjustment</li>
            <li><strong>Add/Edit/Delete:</strong> Full CRUD operations for skills</li>
            <li><strong>Category Management:</strong> Organize skills by type</li>
            <li><strong>Level Controls:</strong> Easy +/- buttons for quick adjustments</li>
            <li><strong>Real-time Updates:</strong> Changes reflected immediately</li>
            <li><strong>Statistics:</strong> Shows total count and average skill level</li>
          </ul>
        )}
      </div>
    </GlassmorphicContainer>
  );
};

export default SkillRendererDemo;