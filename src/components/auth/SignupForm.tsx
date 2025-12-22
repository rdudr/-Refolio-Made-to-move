import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { dataService } from '../../services/dataService';
import GlassmorphicContainer from '../ui/GlassmorphicContainer';
import styles from './Auth.module.css';

interface SignupFormProps {
    onBackToLogin: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onBackToLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // 1. Create auth user
            const user = await authService.signup(email, password, name);

            // 2. Initialize empty profile structure in Firestore
            // We use the same structure as ProfileData but empty/default
            await dataService.saveProfile(user.uid, {
                id: user.uid,
                personalInfo: {
                    firstName: name.split(' ')[0] || '',
                    lastName: name.split(' ').slice(1).join(' ') || '',
                    email: email,
                    phone: '',
                    location: ''
                },
                experience: [],
                education: [],
                skills: [],
                projects: [],
                careerGaps: [],
                version: 1,
                isComplete: false,
                createdAt: new Date(),
                updatedAt: new Date()
            });

        } catch (err: any) {
            setError(err.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <GlassmorphicContainer intensity="medium">
            <form onSubmit={handleSubmit} className={styles.formContainer}>
                <h2 className={styles.title}>Create Account</h2>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Full Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={styles.input}
                        required
                        placeholder="John Doe"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.input}
                        required
                        placeholder="enter@email.com"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={styles.input}
                        required
                        placeholder="At least 6 characters"
                        minLength={6}
                    />
                </div>

                <button type="submit" className={styles.button} disabled={loading}>
                    {loading ? 'Creating Account...' : 'Sign Up'}
                </button>

                <p className={styles.toggleText}>
                    Already have an account?{' '}
                    <button
                        type="button"
                        className={styles.link}
                        onClick={onBackToLogin}
                    >
                        Login
                    </button>
                </p>
            </form>
        </GlassmorphicContainer>
    );
};

export default SignupForm;
