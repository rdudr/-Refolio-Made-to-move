import React, { useState } from 'react';
import { Skill, SkillCategory, SKILL_LEVEL_MIN, SKILL_LEVEL_MAX } from '../../types';
import GlassmorphicContainer from '../ui/GlassmorphicContainer';

interface SkillsFormProps {
  initialSkills?: Partial<Skill>[];
  onSave: (skills: Skill[]) => void;
  onCancel?: () => void;
}

const SkillsForm: React.FC<SkillsFormProps> = ({
  initialSkills = [],
  onSave,
  onCancel
}) => {
  const [skills, setSkills] = useState<Partial<Skill>[]>(
    initialSkills.length > 0 ? initialSkills : []
  );
  
  const [newSkill, setNewSkill] = useState<Partial<Skill>>({
    name: '',
    level: 3,
    category: SkillCategory.TECHNICAL
  });

  const addSkill = () => {
    if (newSkill.name?.trim()) {
      const skill: Partial<Skill> = {
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
    }
  };

  const removeSkill = (index: number) => {
    setSkills(prev => prev.filter((_, i) => i !== index));
  };

  const updateSkill = (index: number, field: keyof Skill, value: any) => {
    setSkills(prev => prev.map((skill, i) => 
      i === index 
        ? { ...skill, [field]: value, updatedAt: new Date() }
        : skill
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validSkills = skills.filter(skill => 
      skill.name?.trim() && 
      skill.level && 
      skill.level >= SKILL_LEVEL_MIN && 
      skill.level <= SKILL_LEVEL_MAX
    ) as Skill[];
    
    onSave(validSkills);
  };

  const renderSkillLevel = (level: number) => {
    const dots = [];
    for (let i = 1; i <= 5; i++) {
      dots.push(
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: i <= level ? '#667eea' : 'rgba(255, 255, 255, 0.2)',
            marginRight: '4px',
            boxShadow: i <= level ? '0 0 8px rgba(102, 126, 234, 0.5)' : 'none'
          }}
        />
      );
    }
    return dots;
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

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  };

  return (
    <GlassmorphicContainer intensity="medium">
      <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        Skills & Expertise
      </h2>
      
      <form onSubmit={handleSubmit} style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Add New Skill Section */}
        <div style={{ 
          marginBottom: '2rem', 
          padding: '1.5rem', 
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ marginBottom: '1rem' }}>Add New Skill</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Skill Name
              </label>
              <input
                type="text"
                value={newSkill.name || ''}
                onChange={(e) => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
                style={inputStyle}
                placeholder="e.g., JavaScript, Project Management"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Category
              </label>
              <select
                value={newSkill.category || SkillCategory.TECHNICAL}
                onChange={(e) => setNewSkill(prev => ({ ...prev, category: e.target.value as SkillCategory }))}
                style={selectStyle}
              >
                {Object.values(SkillCategory).map(category => (
                  <option key={category} value={category} style={{ backgroundColor: '#1a1a2e', color: 'white' }}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Level (1-5)
              </label>
              <select
                value={newSkill.level || 3}
                onChange={(e) => setNewSkill(prev => ({ ...prev, level: parseInt(e.target.value) }))}
                style={selectStyle}
              >
                {[1, 2, 3, 4, 5].map(level => (
                  <option key={level} value={level} style={{ backgroundColor: '#1a1a2e', color: 'white' }}>
                    {level} - {['Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'][level - 1]}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              type="button"
              onClick={addSkill}
              disabled={!newSkill.name?.trim()}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: newSkill.name?.trim() ? '#667eea' : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: newSkill.name?.trim() ? 'pointer' : 'not-allowed',
                fontSize: '1rem',
                opacity: newSkill.name?.trim() ? 1 : 0.5
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Current Skills List */}
        {skills.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Current Skills ({skills.length})</h3>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              {skills.map((skill, index) => (
                <div
                  key={skill.id || index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 120px auto',
                    gap: '1rem',
                    alignItems: 'center',
                    padding: '1rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <input
                    type="text"
                    value={skill.name || ''}
                    onChange={(e) => updateSkill(index, 'name', e.target.value)}
                    style={{ ...inputStyle, margin: 0 }}
                    placeholder="Skill name"
                  />
                  
                  <select
                    value={skill.category || SkillCategory.TECHNICAL}
                    onChange={(e) => updateSkill(index, 'category', e.target.value as SkillCategory)}
                    style={{ ...selectStyle, margin: 0 }}
                  >
                    {Object.values(SkillCategory).map(category => (
                      <option key={category} value={category} style={{ backgroundColor: '#1a1a2e', color: 'white' }}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={skill.level || 3}
                    onChange={(e) => updateSkill(index, 'level', parseInt(e.target.value))}
                    style={{ ...selectStyle, margin: 0 }}
                  >
                    {[1, 2, 3, 4, 5].map(level => (
                      <option key={level} value={level} style={{ backgroundColor: '#1a1a2e', color: 'white' }}>
                        {level}
                      </option>
                    ))}
                  </select>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {renderSkillLevel(skill.level || 3)}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => removeSkill(index)}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255, 107, 107, 0.2)',
                      border: '1px solid rgba(255, 107, 107, 0.3)',
                      borderRadius: '6px',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {skills.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem', 
            opacity: 0.7,
            marginBottom: '2rem'
          }}>
            <p>No skills added yet. Use the form above to add your skills and expertise.</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.3s ease'
              }}
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#667eea',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.3s ease'
            }}
          >
            Save Skills ({skills.length})
          </button>
        </div>
      </form>
    </GlassmorphicContainer>
  );
};

export default SkillsForm;