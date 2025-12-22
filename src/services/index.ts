// Service exports for Refolio platform
import { ProfileData } from '../types';

export { OCRService, ocrService } from './ocrService';
export { MovementAnalyzer, movementAnalyzer } from './movementAnalyzer';

export interface ResumeExporter {
  generatePDF(profileData: ProfileData): Promise<Blob>;
}

export interface DataService {
  saveProfile(profileData: ProfileData): Promise<void>;
  loadProfile(userId: string): Promise<ProfileData | null>;
  updateProfile(profileData: ProfileData): Promise<void>;
  deleteProfile(userId: string): Promise<void>;
}