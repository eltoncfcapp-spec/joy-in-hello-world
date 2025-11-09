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
  login_username: string | null;
}

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  profile: UserProfile | null;
  login: (identifier: string, password: string, isEmailLogin?: boolean) => Promise<boolean>;
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

      // Fetch member data - this is where user profile data comes from
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', userId)
        .single();

      if (memberError) {
        console.error('Error fetching member data:', memberError);
        // If member not found, user might be an admin without a member record
        const { data: authUser } = await supabase.auth.getUser();
        
        setProfile({
          id: userId,
          name: authUser.user?.user_metadata?.name || null,
          surname: authUser.user?.user_metadata?.surname || null,
          email: authUser.user?.email || null,
          phone: null,
          cell_group_id: null,
          role: 'member',
          isAdmin: false,
          isLeader: false,
          login_username: null
        });
        return;
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

      // Create profile from member data
      const userProfile: UserProfile = {
        id: userId,
        name: memberData?.name || null,
        surname: memberData?.surname || null,
        email: memberData?.email || null,
        phone: memberData?.phone || null,
        cell_group_id: memberData?.cell_group_id || null,
        role: primaryRole,
        isAdmin,
        isLeader: isLeaderFromMembers || roles.includes('leader'),
        login_username: memberData?.login_username || null
      };

      setProfile(userProfile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setProfile({
        id: userId,
        name: null,
        surname: null,
        email: null,
        phone: null,
        cell_group_id: null,
        role: 'member',
        isAdmin: false,
        isLeader: false,
        login_username: null
      });
    }
  };

  // Universal login function that returns boolean for compatibility
  const login = async (identifier: string, password: string, isEmailLogin: boolean = false): Promise<boolean> => {
    try {
      setLoading(true);
      
      if (isEmailLogin) {
        // Email/Password authentication
        console.log('Attempting email login:', identifier);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: identifier.trim(),
          password: password
        });

        if (error) {
          console.error('Email login error:', error);
          return false;
        }

        if (data.session && data.user) {
          console.log('Email login successful');
          setSession(data.session);
          setUser(data.user);
          await fetchUserProfile(data.user.id);
          return true;
        }
      } else {
        // Username/PIN authentication
        console.log('Attempting username/PIN login:', identifier);
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('*')
          .eq('login_username', identifier.trim().toLowerCase())
          .eq('login_pin', password)
          .single();

        if (memberError || !memberData) {
          console.error('Username/PIN login error:', memberError);
          return false;
        }

        console.log('Member found:', memberData);

        // Try email login first if member has email
        if (memberData.email) {
          try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
              email: memberData.email,
              password: password
            });

            if (!authError && authData.session) {
              console.log('Member email login successful');
              setSession(authData.session);
              setUser(authData.user);
              await fetchUserProfile(memberData.id);
              return true;
            }
          } catch (emailError) {
            console.log('Member email login failed, using mock session');
          }
        }

        // Fallback: Create mock session
        const mockUser: SupabaseUser = {
          id: memberData.id,
          email: memberData.email || '',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const mockSession: Session = {
          access_token: 'mock-token-' + memberData.id,
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'mock-refresh-' + memberData.id,
          user: mockUser,
        };

        console.log('Creating mock session for member');
        setSession(mockSession);
        setUser(mockUser);
        await fetchUserProfile(memberData.id);
        return true;
      }

      return false;
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
      if (session?.access_token?.startsWith('mock-token-')) {
        setSession(null);
        setUser(null);
        setProfile(null);
      } else {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check for existing session and set up auth listener
  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session) {
          setSession(session);
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session) {
          setSession(session);
          setUser(session.user);
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
