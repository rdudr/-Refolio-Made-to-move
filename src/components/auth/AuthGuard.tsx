import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import LoginForm from './LoginForm';
import GlassmorphicContainer from '../ui/GlassmorphicContainer';

interface AuthGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
    const { currentUser, loading } = useAuth();

    if (loading) {
        return (
            <GlassmorphicContainer intensity="low">
                <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
            </GlassmorphicContainer>
        );
    }

    if (!currentUser) {
        if (fallback) return <>{fallback}</>;

        // Default fallback is the login form centered
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '50vh'
            }}>
                <div style={{ width: '100%', maxWidth: '400px' }}>
                    <LoginForm />
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default AuthGuard;
