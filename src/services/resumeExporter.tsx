import React from 'react';
import { pdf, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { ProfileData, ExperienceEntry, EducationEntry, Skill, Project } from '../types';

// Register standard fonts
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT4ttDfA.ttf' },
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT4ttDfA.ttf', fontWeight: 'bold' }
  ]
});

// ATS-Optimized Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40, // Standard margin
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
    color: '#000000'
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  contactInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    fontSize: 9,
    color: '#444444'
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  entryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  entrySubtitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontStyle: 'italic',
    fontSize: 9,
  },
  date: {
    color: '#666666',
  },
  description: {
    marginLeft: 10,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  bullet: {
    width: 10,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  skillTag: {
    backgroundColor: '#f5f5f5',
    padding: '2 6',
    borderRadius: 2,
    fontSize: 9,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 20,
  },
  leftColumn: {
    flex: 2,
  },
  rightColumn: {
    flex: 1,
  }
});

interface ResumeDocumentProps {
  data: ProfileData;
  layout?: 'single' | 'two-column';
}

// Helper to format dates
const formatDate = (date?: Date | null): string => {
  if (!date) return 'Present';
  // Check if it's a valid Date object
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// PDF Document Component
const ResumeDocument: React.FC<ResumeDocumentProps> = ({ data, layout = 'single' }) => {
  const { personalInfo, experience, education, skills, projects } = data;

  const ExperienceSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Experience</Text>
      {experience.map((exp: ExperienceEntry) => (
        <View key={exp.id} style={{ marginBottom: 10 }}>
          <Text style={styles.entryTitle}>{exp.title}</Text>
          <View style={styles.entrySubtitle}>
            <Text>{exp.organization} {exp.location ? `| ${exp.location}` : ''}</Text>
            <Text style={styles.date}>
              {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
            </Text>
          </View>
          {exp.description && (
            <View style={styles.description}>
              {exp.description.split('\n').map((line, i) => (
                <View key={i} style={styles.bulletPoint}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{line.trim()}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );

  const EducationSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Education</Text>
      {education.map((edu: EducationEntry) => (
        <View key={edu.id} style={{ marginBottom: 8 }}>
          <Text style={styles.entryTitle}>{edu.organization}</Text>
          <View style={styles.entrySubtitle}>
            <Text>{edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}</Text>
            <Text style={styles.date}>
              {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  const SkillsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Skills</Text>
      <View style={styles.skillsContainer}>
        {skills.map((skill: Skill) => (
          <Text key={skill.id} style={styles.skillTag}>
            {skill.name}
          </Text>
        ))}
      </View>
    </View>
  );

  const ProjectsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Projects</Text>
      {projects.map((proj: Project, i) => (
        <View key={i} style={{ marginBottom: 8 }}>
          <Text style={styles.entryTitle}>{proj.name}</Text>
          <Text style={{ fontSize: 9, marginBottom: 2 }}>{proj.description}</Text>
          <Text style={{ fontSize: 8, color: '#666' }}>{proj.technologies.join(', ')}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{personalInfo.firstName} {personalInfo.lastName}</Text>
          <View style={styles.contactInfo}>
            {personalInfo.email && <Text>{personalInfo.email}</Text>}
            {personalInfo.phone && <Text>• {personalInfo.phone}</Text>}
            {personalInfo.location && <Text>• {personalInfo.location}</Text>}
            {personalInfo.linkedIn && <Text>• {personalInfo.linkedIn}</Text>}
            {personalInfo.portfolio && <Text>• {personalInfo.portfolio}</Text>}
          </View>
        </View>

        {/* Content */}
        {layout === 'two-column' ? (
          <View style={styles.twoColumn}>
            <View style={styles.leftColumn}>
              <ExperienceSection />
              <ProjectsSection />
            </View>
            <View style={styles.rightColumn}>
              <EducationSection />
              <SkillsSection />
            </View>
          </View>
        ) : (
          <View>
            <ExperienceSection />
            <EducationSection />
            <SkillsSection />
            <ProjectsSection />
          </View>
        )}
      </Page>
    </Document>
  );
};

export class ResumeExporter {
  /**
   * Generates a PDF blob from profile data
   */
  async generatePdf(data: ProfileData, layout: 'single' | 'two-column' = 'single'): Promise<Blob> {
    const doc = <ResumeDocument data={data} layout={layout} />;
    return await pdf(doc).toBlob();
  }

  /**
   * Returns the Document component for preview purposes
   */
  getDocument(data: ProfileData, layout: 'single' | 'two-column' = 'single'): React.ReactElement {
    return <ResumeDocument data={data} layout={layout} />;
  }
}

export const resumeExporter = new ResumeExporter();
