import React, { useState } from 'react';
import { authService } from '../../services/authService';
import GlassmorphicContainer from '../ui/GlassmorphicContainer';
import styles from './Auth.module.css';
import SignupForm from './SignupForm';

const LoginForm: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showSignup, setShowSignup] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await authService.login(email, password);
        } catch (err: any) {
            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    if (showSignup) {
        return <SignupForm onBackToLogin={() => setShowSignup(false)} />;
    }

    return (
        <GlassmorphicContainer intensity="medium">
            <form onSubmit={handleSubmit} className={styles.formContainer}>
                <h2 className={styles.title}>Welcome Back</h2>

                {error && <div className={styles.error}>{error}</div>}

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
                        placeholder="••••••••"
                    />
                </div>

                <button type="submit" className={styles.button} disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>

                <p className={styles.toggleText}>
                    Don't have an account?{' '}
                    <button
                        type="button"
                        className={styles.link}
                        onClick={() => setShowSignup(true)}
                    >
                        Sign up
                    </button>
                </p>
            </form>
        </GlassmorphicContainer>
    );
};

export default LoginForm;
