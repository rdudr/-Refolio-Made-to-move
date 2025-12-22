import { dataService } from '../services/dataService';
import { getDoc, setDoc, Timestamp } from 'firebase/firestore';

// Mock Firebase SDK
jest.mock('firebase/firestore', () => {
    return {
        getFirestore: jest.fn(),
        collection: jest.fn(),
        doc: jest.fn(() => ({
            withConverter: jest.fn().mockReturnThis()
        })),
        getDoc: jest.fn(),
        setDoc: jest.fn(),
        updateDoc: jest.fn(),
        Timestamp: {
            fromDate: (date: Date) => ({
                seconds: Math.floor(date.getTime() / 1000),
                toDate: () => date
            })
        }
    };
});

jest.mock('../config/firebase', () => ({
    db: {}
}));

describe('Data Service Tests', () => {
    const mockDate = new Date('2023-01-01T00:00:00.000Z');

    const mockProfile = {
        id: 'test-user',
        personalInfo: { firstName: 'Test', lastName: 'User', email: 'test@test.com' },
        experience: [],
        education: [],
        skills: [],
        projects: [],
        careerGaps: [],
        version: 1,
        isComplete: true,
        createdAt: mockDate,
        updatedAt: mockDate
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('saveProfile calls setDoc with correct arguments', async () => {
        await dataService.saveProfile('test-user', mockProfile as any);
        expect(setDoc).toHaveBeenCalled();
    });

    test('getProfile returns data when snapshot exists', async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => mockProfile
        });

        const result = await dataService.getProfile('test-user');
        expect(result).toEqual(mockProfile);
    });

    test('getProfile returns null when snapshot does not exist', async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
            data: () => undefined
        });

        const result = await dataService.getProfile('test-user');
        expect(result).toBeNull();
    });
});
