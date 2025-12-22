import { authService } from '../services/authService';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

// Mock Firebase SDK
jest.mock('firebase/auth', () => ({
    getAuth: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
    updateProfile: jest.fn()
}));

jest.mock('../config/firebase', () => ({
    auth: {}
}));

describe('Auth Service Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('login calls signInWithEmailAndPassword', async () => {
        (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
            user: { uid: '123', email: 'test@test.com' }
        });

        await authService.login('test@test.com', 'password');
        expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@test.com', 'password');
    });

    test('signup calls createUserWithEmailAndPassword', async () => {
        (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
            user: { uid: '123', email: 'test@test.com' }
        });

        await authService.signup('test@test.com', 'password', 'Test User');
        expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@test.com', 'password');
    });

    test('logout calls signOut', async () => {
        await authService.logout();
        expect(signOut).toHaveBeenCalled();
    });
});
