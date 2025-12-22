import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { authService } from '../services/authService';
import { dataService } from '../services/dataService';
import { ProfileData } from '../types';
import { useGapRecalculation } from '../hooks/useGapRecalculation';

interface AuthContextType {
    currentUser: User | null;
    userProfile: ProfileData | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
    updateUserProfile: (data: Partial<ProfileData>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Initialize gap recalculation hook
    const { setupAutoRecalculation } = useGapRecalculation();

    // Function to fetch profile data
    const fetchProfile = async (userId: string) => {
        try {
            const profile = await dataService.getProfile(userId);
            setUserProfile(profile);
        } catch (error) {
            console.error("Error fetching profile:", error);
            setUserProfile(null);
        }
    };

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged(async (user) => {
            setCurrentUser(user);

            if (user) {
                await fetchProfile(user.uid);
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const refreshProfile = async () => {
        if (currentUser) {
            await fetchProfile(currentUser.uid);
        }
    };

    const updateUserProfile = async (data: Partial<ProfileData>) => {
        if (!currentUser) return;

        // Create updated profile for gap recalculation
        const updatedProfile = userProfile ? { ...userProfile, ...data } : null;

        // Optimistic update
        setUserProfile(updatedProfile);

        // Trigger automatic gap recalculation if timeline data changed
        if (updatedProfile && (data.experience || data.education)) {
            setupAutoRecalculation(updatedProfile, async (gapUpdates) => {
                // Update local state with gap recalculation results
                setUserProfile(prev => prev ? { ...prev, ...gapUpdates } : null);
                
                // Persist gap updates to database
                try {
                    await dataService.updateProfileFields(currentUser.uid, gapUpdates);
                } catch (error) {
                    console.error('Error persisting gap updates:', error);
                }
            });
        }

        // Persist original data
        try {
            await dataService.updateProfileFields(currentUser.uid, data);
        } catch (error) {
            console.error('Error updating profile:', error);
            // Revert optimistic update on error
            if (userProfile) {
                setUserProfile(userProfile);
            }
        }
    };

    const value = {
        currentUser,
        userProfile,
        loading,
        refreshProfile,
        updateUserProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
