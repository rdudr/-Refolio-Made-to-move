import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    Timestamp,
    FirestoreDataConverter
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ProfileData } from '../types';

const COLLECTION_NAME = 'profiles';

// Helper to check if an object is a Firebase Timestamp
const isTimestamp = (obj: any): obj is Timestamp => {
    return obj && typeof obj.toDate === 'function';
};

// Recursive helper to convert Dates to Timestamps for storage
const convertDatesToTimestamps = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (obj instanceof Date) return Timestamp.fromDate(obj);
    if (Array.isArray(obj)) return obj.map(convertDatesToTimestamps);
    if (typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
            result[key] = convertDatesToTimestamps(obj[key]);
        }
        return result;
    }
    return obj;
};

// Recursive helper to convert Timestamps to Dates for application use
const convertTimestampsToDates = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (isTimestamp(obj)) return obj.toDate();
    if (Array.isArray(obj)) return obj.map(convertTimestampsToDates);
    if (typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
            result[key] = convertTimestampsToDates(obj[key]);
        }
        return result;
    }
    return obj;
};

// Custom converter for ProfileData
const profileConverter: FirestoreDataConverter<ProfileData> = {
    toFirestore: (profile: ProfileData) => {
        return convertDatesToTimestamps(profile);
    },
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return convertTimestampsToDates(data) as ProfileData;
    }
};

export class DataService {
    /**
     * Saves or updates a user's profile
     */
    async saveProfile(userId: string, profile: ProfileData): Promise<void> {
        const profileRef = doc(db, COLLECTION_NAME, userId).withConverter(profileConverter);
        // Ensure lastAnalyzed and updatedAt are set
        const profileToSave = {
            ...profile,
            updatedAt: new Date()
        };
        await setDoc(profileRef, profileToSave, { merge: true });
    }

    /**
     * Loads a user's profile
     */
    async getProfile(userId: string): Promise<ProfileData | null> {
        const profileRef = doc(db, COLLECTION_NAME, userId).withConverter(profileConverter);
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
            return snap.data();
        }
        return null;
    }

    /**
     * Updates specific fields of a profile
     */
    async updateProfileFields(userId: string, fields: Partial<ProfileData>): Promise<void> {
        const profileRef = doc(db, COLLECTION_NAME, userId);
        // Simple update without full converter validation, mainly for timestamps manual handling if needed
        // But better to use converter if we can. updateDoc doesn't use converter for partial data easily in Typescript v9 without exact partial types match
        // So we manually convert input fields
        const dataToSave = convertDatesToTimestamps({
            ...fields,
            updatedAt: new Date()
        });
        await updateDoc(profileRef, dataToSave);
    }
}

export const dataService = new DataService();
