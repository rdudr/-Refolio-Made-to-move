import React, { useState, useEffect } from 'react';
import { Skill, SkillCategory, SKILL_LEVEL_MIN, SKILL_LEVEL_MAX } from '../../types';
import SkillRenderer from './SkillRenderer';
import GlassmorphicContainer from './GlassmorphicContainer';

interface SkillManagerProps {
  initialSkills?: Skill[];
  onSkillsChange?: (skills: Skill[]) => void;
  mode?: 'web' | 'pdf';
  allowEditing?: boolean;
}

const SkillManager: React.FC<SkillManagerProps> = ({
  initialSkills = [],
  onSkillsChange,
  mode = 'web',
  allowEditing = true
}) => {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSkill, setNewSkill] = useState<Partial<Skill>>({
    name: '',
    level: 3,
    category: SkillCategory.TECHNICAL
  });

  // Notify parent component when skills change
  useEffect(() => {
    if (onSkillsChange) {
      onSkillsChange(skills);
    }
  }, [skills, onSkillsChange]);

  const addSkill = () => {
    if (newSkill.name?.trim()) {
      const skill: Skill = {
        id: `skill-${Date.now()}-${Math.random()}`,
        name: newSkill.name.trim(),
        level: newSkill.level || 3,
        category: newSkill.category || SkillCategory.TECHNICAL,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setSkills(prev => [...prev, skill]);
      setNewSkill({
        name: '',
        level: 3,
        category: SkillCategory.TECHNICAL
      });
      setShowAddForm(false);
    }
  };

  const updateSkill = (updatedSkill: Skill) => {
    setSkills(prev => prev.map(skill => 
      skill.id === updatedSkill.id 
        ? { ...updatedSkill, updatedAt: new Date() }
        : skill
    ));
    setEditingSkill(null);
  };

  const deleteSkill = (skillId: string) => {
    setSkills(prev => prev.filter(skill => skill.id !== skillId));
  };

  const handleSkillClick = (skill: Skill) => {
    if (allowEditing && mode === 'web') {
      setEditingSkill(skill);
    }
  };

  const adjustSkillLevel = (skillId: string, delta: number) => {
    setSkills(prev => prev.map(skill => {
      if (skill.id === skillId) {
        const newLevel = Math.max(SKILL_LEVEL_MIN, Math.min(SKILL_LEVEL_MAX, skill.level + delta));
        return { ...skill, level: newLevel, updatedAt: new Date() };
      }
      return skill;
    }));
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.3s ease'
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    backgroundColor: '#667eea',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.3s ease'
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#ff6b6b'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)'
  };

  return (
    <div>
      {/* Skill Display */}
      <SkillRenderer
        skills={skills}
        mode={mode}
        showCategories={true}
        onSkillClick={handleSkillClick}
      />

      {/* Management Controls (only in web mode with editing enabled) */}
      {allowEditing && mode === 'web' && (
        <div style={{ marginTop: '2rem' }}>
          {/* Quick Level Adjustment */}
          {skills.length > 0 && (
            <GlassmorphicContainer intensity="low">
              <h3 style={{ marginBottom: '1rem' }}>Quick Level Adjustment</h3>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {skills.map(skill => (
                  <div
                    key={skill.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '6px'
                    }}
                  >
                    <span style={{ flex: 1 }}>{skill.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => adjustSkillLevel(skill.id, -1)}
                        disabled={skill.level <= SKILL_LEVEL_MIN}
                        style={{
                          ...secondaryButtonStyle,
                          opacity: skill.level <= SKILL_LEVEL_MIN ? 0.5 : 1,
                          cursor: skill.level <= SKILL_LEVEL_MIN ? 'not-allowed' : 'pointer'
                        }}
                      >
                        -
                      </button>
                      <span style={{ 
                        minWidth: '60px', 
                        textAlign: 'center',
                        fontWeight: 'bold'
                      }}>
                        Level {skill.level}
                      </span>
                      <button
                        onClick={() => adjustSkillLevel(skill.id, 1)}
                        disabled={skill.level >= SKILL_LEVEL_MAX}
                        style={{
                          ...secondaryButtonStyle,
                          opacity: skill.level >= SKILL_LEVEL_MAX ? 0.5 : 1,
                          cursor: skill.level >= SKILL_LEVEL_MAX ? 'not-allowed' : 'pointer'
                        }}
                      >
                        +
                      </button>
                      <button
                        onClick={() => deleteSkill(skill.id)}
                        style={dangerButtonStyle}
                        title="Delete skill"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassmorphicContainer>
          )}

          {/* Add New Skill */}
          <div style={{ marginTop: '1rem' }}>
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                style={{
                  ...buttonStyle,
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1rem'
                }}
              >
                + Add New Skill
              </button>
            ) : (
              <GlassmorphicContainer intensity="low">
                <h3 style={{ marginBottom: '1rem' }}>Add New Skill</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <input
                    type="text"
                    value={newSkill.name || ''}
                    onChange={(e) => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Skill name (e.g., JavaScript, Project Management)"
                    style={inputStyle}
                  />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <select
                      value={newSkill.category || SkillCategory.TECHNICAL}
                      onChange={(e) => setNewSkill(prev => ({ ...prev, category: e.target.value as SkillCategory }))}
                      style={inputStyle}
                    >
                      {Object.values(SkillCategory).map(category => (
                        <option key={category} value={category} style={{ backgroundColor: '#1a1a2e', color: 'white' }}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                    
                    <select
                      value={newSkill.level || 3}
                      onChange={(e) => setNewSkill(prev => ({ ...prev, level: parseInt(e.target.value) }))}
                      style={inputStyle}
                    >
                      {[1, 2, 3, 4, 5].map(level => (
                        <option key={level} value={level} style={{ backgroundColor: '#1a1a2e', color: 'white' }}>
                          Level {level} - {['Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'][level - 1]}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      onClick={() => setShowAddForm(false)}
                      style={secondaryButtonStyle}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addSkill}
                      disabled={!newSkill.name?.trim()}
                      style={{
                        ...buttonStyle,
                        flex: 1,
                        opacity: newSkill.name?.trim() ? 1 : 0.5,
                        cursor: newSkill.name?.trim() ? 'pointer' : 'not-allowed'
                      }}
                    >
                      Add Skill
                    </button>
                  </div>
                </div>
              </GlassmorphicContainer>
            )}
          </div>
        </div>
      )}

      {/* Edit Skill Modal */}
      {editingSkill && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <GlassmorphicContainer intensity="high">
            <h3 style={{ marginBottom: '1rem' }}>Edit Skill</h3>
            <div style={{ display: 'grid', gap: '1rem', minWidth: '400px' }}>
              <input
                type="text"
                value={editingSkill.name}
                onChange={(e) => setEditingSkill(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="Skill name"
                style={inputStyle}
              />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <select
                  value={editingSkill.category}
                  onChange={(e) => setEditingSkill(prev => prev ? { ...prev, category: e.target.value as SkillCategory } : null)}
                  style={inputStyle}
                >
                  {Object.values(SkillCategory).map(category => (
                    <option key={category} value={category} style={{ backgroundColor: '#1a1a2e', color: 'white' }}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
                
                <select
                  value={editingSkill.level}
                  onChange={(e) => setEditingSkill(prev => prev ? { ...prev, level: parseInt(e.target.value) } : null)}
                  style={inputStyle}
                >
                  {[1, 2, 3, 4, 5].map(level => (
                    <option key={level} value={level} style={{ backgroundColor: '#1a1a2e', color: 'white' }}>
                      Level {level} - {['Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'][level - 1]}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={() => setEditingSkill(null)}
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>
                <button
                  onClick={() => editingSkill && updateSkill(editingSkill)}
                  disabled={!editingSkill?.name?.trim()}
                  style={{
                    ...buttonStyle,
                    flex: 1,
                    opacity: editingSkill?.name?.trim() ? 1 : 0.5,
                    cursor: editingSkill?.name?.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  Update Skill
                </button>
                <button
                  onClick={() => {
                    if (editingSkill) {
                      deleteSkill(editingSkill.id);
                      setEditingSkill(null);
                    }
                  }}
                  style={dangerButtonStyle}
                >
                  Delete
                </button>
              </div>
            </div>
          </GlassmorphicContainer>
        </div>
      )}

      {/* Summary */}
      {mode === 'web' && (
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '8px',
          fontSize: '0.9rem',
          opacity: 0.8,
          textAlign: 'center'
        }}>
          <p>
            <strong>{skills.length}</strong> skills total • 
            Average level: <strong>{skills.length > 0 ? (skills.reduce((sum, skill) => sum + skill.level, 0) / skills.length).toFixed(1) : 0}</strong>
            {allowEditing && ' • Click skills to edit, use quick controls to adjust levels'}
          </p>
        </div>
      )}
    </div>
  );
};

export default SkillManager;