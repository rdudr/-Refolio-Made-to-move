// Mock Firebase SDK first, before any imports
jest.mock('firebase/app', () => ({
    initializeApp: jest.fn()
}));

jest.mock('firebase/firestore', () => {
    const mockWithConverter = jest.fn();
    const mockDocRef = {
        withConverter: mockWithConverter,
        id: 'test-doc-id'
    };
    // Ensure withConverter returns the same object (or a doc ref) for chaining
    mockWithConverter.mockReturnValue(mockDocRef);

    return {
        getFirestore: jest.fn(),
        collection: jest.fn(),
        doc: jest.fn(() => mockDocRef),
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

// Now import after mocking
import { dataService } from '../services/dataService';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
        expect(doc).toHaveBeenCalledWith({}, 'profiles', 'test-user');
    });

    test('getProfile returns data when snapshot exists', async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => mockProfile
        });

        const result = await dataService.getProfile('test-user');
        expect(result).toEqual(mockProfile);
        expect(getDoc).toHaveBeenCalled();
    });

    test('getProfile returns null when snapshot does not exist', async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
            data: () => undefined
        });

        const result = await dataService.getProfile('test-user');
        expect(result).toBeNull();
        expect(getDoc).toHaveBeenCalled();
    });
});
