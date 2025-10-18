import { supabase } from '@/constants/SupabaseConfig';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session and validate it
        const initializeAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                // If there's a session, validate it by checking user
                if (session?.access_token) {
                    const { data: { user }, error } = await supabase.auth.getUser();
                    
                    // If getUser fails or returns null, the session is invalid
                    if (error || !user) {
                        console.log('🔐 Auth: Session invalid, clearing...');
                        await supabase.auth.signOut();
                        setSession(null);
                        setUser(null);
                    } else {
                        console.log('🔐 Auth: Valid session found for:', user.email);
                        setSession(session);
                        setUser(user);
                    }
                } else {
                    console.log('🔐 Auth: No session found');
                    setSession(null);
                    setUser(null);
                }
            } catch (error) {
                console.error('🔐 Auth: Error initializing:', error);
                setSession(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, session: Session | null) => {
                console.log('🔐 Auth: State changed:', event);
                setSession(session);
                setUser(session?.user ?? null);
            }
        );

        return () => subscription?.unsubscribe();
    }, []);

    const signOut = async () => {
        console.log('🔐 Auth: Signing out...');
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
