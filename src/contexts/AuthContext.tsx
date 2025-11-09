import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  name: string | null;
  surname: string | null;
  email: string | null;
  phone: string | null;
  cell_group_id: string | null;
  role: 'admin' | 'leader' | 'member';
  isAdmin: boolean;
  isLeader: boolean;
}

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  profile: UserProfile | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      // Fetch user roles from user_roles table
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
      }

      // Fetch member data to check if user is a leader from members table
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('is_leader, role, cell_group_id, name, surname, email, phone')
        .eq('id', userId)
        .single();

      if (memberError) {
        console.error('Error fetching member data:', memberError);
      }

      const roles = rolesData?.map(r => r.role) || [];
      const isAdmin = roles.includes('admin');
      
      // Check if user is a leader from members table
      const isLeaderFromMembers = memberData?.is_leader === true || memberData?.role === 'leader';
      
      // Determine primary role - prioritize admin, then leader
      let primaryRole: 'admin' | 'leader' | 'member' = 'member';
      if (isAdmin) {
        primaryRole = 'admin';
      } else if (isLeaderFromMembers || roles.includes('leader')) {
        primaryRole = 'leader';
      }

      // Use data from members table
      const userProfile: UserProfile = {
        id: userId,
        name: memberData?.name || null,
        surname: memberData?.surname || null,
        email: memberData?.email || null,
        phone: memberData?.phone || null,
        cell_group_id: memberData?.cell_group_id || null,
        role: primaryRole,
        isAdmin,
        isLeader: isLeaderFromMembers || roles.includes('leader')
      };

      setProfile(userProfile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Set a basic profile if there's an error
      setProfile({
        id: userId,
        name: null,
        surname: null,
        email: null,
        phone: null,
        cell_group_id: null,
        role: 'member',
        isAdmin: false,
        isLeader: false
      });
    }
  };

  // Check for existing session and set up auth listener
  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      return !!data.session;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    profile,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
