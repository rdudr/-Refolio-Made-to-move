import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User,
    sendPasswordResetEmail,
    updateProfile
} from 'firebase/auth';
import { auth } from '../config/firebase';

export class AuthService {
    /**
     * Monitor auth state changes
     */
    onAuthStateChanged(callback: (user: User | null) => void) {
        return onAuthStateChanged(auth, callback);
    }

    /**
     * Sign up with email and password
     */
    async signup(email: string, password: string, name: string) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
            await updateProfile(userCredential.user, { displayName: name });
        }
        return userCredential.user;
    }

    /**
     * Sign in with email and password
     */
    async login(email: string, password: string) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    }

    /**
     * Sign out
     */
    async logout() {
        await signOut(auth);
    }

    /**
     * Send password reset email
     */
    async resetPassword(email: string) {
        await sendPasswordResetEmail(auth, email);
    }

    /**
     * Get current user
     */
    getCurrentUser(): User | null {
        return auth.currentUser;
    }
}

export const authService = new AuthService();
