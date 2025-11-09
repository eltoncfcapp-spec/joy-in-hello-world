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
  role: 'admin' | 'group_leader' | 'member';
  isAdmin: boolean;
  login_username: string | null;
  login_pin: string | null;
  permissions: string[];
  assigned_groups: string[];
  assigned_departments: string[];
  is_leader: boolean;
  originalRole: string; // Keep the original role for reference
}

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  profile: UserProfile | null;
  login: (identifier: string, credential: string) => Promise<boolean>;
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('🔍 Fetching user profile for:', userId);
      
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', userId)
        .single();

      if (memberError) {
        console.error('❌ Error fetching from members table:', memberError);
        throw memberError;
      }

      console.log('📊 Raw member data from database:', memberData);

      if (memberData) {
        // FIXED: Enhanced role determination for cell group leaders
        const isAdmin = memberData.role === 'admin';
        
        // Check if user should be treated as group_leader for cell group purposes
        const shouldBeGroupLeader = 
          memberData.is_leader === true || 
          memberData.role === 'group_leader' || 
          memberData.role === 'leader' ||
          memberData.role === 'department_leader' || // Treat department_leader as group_leader for cell groups
          (memberData.assigned_groups && memberData.assigned_groups.length > 0);
        
        let primaryRole: 'admin' | 'group_leader' | 'member' = 'member';
        
        if (isAdmin) {
          primaryRole = 'admin';
        } else if (shouldBeGroupLeader) {
          // FIXED: Always use 'group_leader' role for cell group management
          primaryRole = 'group_leader';
        } else {
          primaryRole = 'member';
        }

        console.log('🎭 Role determination:', {
          databaseRole: memberData.role,
          isLeader: memberData.is_leader,
          assignedGroups: memberData.assigned_groups,
          shouldBeGroupLeader: shouldBeGroupLeader,
          finalRole: primaryRole,
          isAdmin
        });

        // Normalize assigned_groups
        const assignedGroups = Array.isArray(memberData.assigned_groups) 
          ? memberData.assigned_groups.map(group => group.toString().toLowerCase().trim())
          : [];

        console.log('✅ Normalized assigned_groups:', assignedGroups);
        
        const userProfile: UserProfile = {
          id: userId,
          name: memberData.name || null,
          surname: memberData.surname || null,
          email: memberData.email || null,
          phone: memberData.phone || null,
          cell_group_id: memberData.cell_group_id || null,
          role: primaryRole, // Use the mapped role for permissions
          isAdmin,
          login_username: memberData.login_username || null,
          login_pin: memberData.login_pin || null,
          permissions: Array.isArray(memberData.permissions) ? memberData.permissions : [],
          assigned_groups: assignedGroups,
          assigned_departments: Array.isArray(memberData.assigned_departments) ? memberData.assigned_departments : [],
          is_leader: memberData.is_leader === true,
          originalRole: memberData.role // Keep original for display purposes
        };

        console.log('✅ Final profile object:', userProfile);
        setProfile(userProfile);
        return;
      }

      throw new Error('No user data found in members table');
    } catch (error) {
      console.error('💥 Error fetching user profile:', error);
      setProfile(null);
    }
  };

  const loginWithUsernamePin = async (username: string, pin: string): Promise<boolean> => {
    try {
      console.log('🔐 Attempting username/PIN login:', { username, pin });
      
      const { data: memberData, error } = await supabase
        .from('members')
        .select('*')
        .eq('login_username', username)
        .eq('login_pin', pin)
        .single();

      if (error || !memberData) {
        console.error('❌ Username/PIN login error:', error);
        return false;
      }

      console.log('✅ Member found:', memberData);

      const mockUser: SupabaseUser = {
        id: memberData.id,
        email: memberData.email,
        phone: memberData.phone,
        created_at: memberData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {
          name: memberData.name,
          surname: memberData.surname
        },
        aud: 'authenticated',
        role: 'authenticated'
      } as SupabaseUser;

      const mockSession: Session = {
        access_token: 'username-pin-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'username-pin-refresh',
        user: mockUser,
        provider_token: null,
        provider_refresh_token: null
      } as Session;

      setUser(mockUser);
      setSession(mockSession);

      // FIXED: Enhanced role determination for login
      const isAdmin = memberData.role === 'admin';
      
      // Check if user should be treated as group_leader for cell group purposes
      const shouldBeGroupLeader = 
        memberData.is_leader === true || 
        memberData.role === 'group_leader' || 
        memberData.role === 'leader' ||
        memberData.role === 'department_leader' || // Treat department_leader as group_leader for cell groups
        (memberData.assigned_groups && memberData.assigned_groups.length > 0);
      
      let primaryRole: 'admin' | 'group_leader' | 'member' = 'member';
      
      if (isAdmin) {
        primaryRole = 'admin';
      } else if (shouldBeGroupLeader) {
        primaryRole = 'group_leader';
      } else {
        primaryRole = 'member';
      }

      console.log('🎯 Final mapped role for login:', primaryRole);
      
      const assignedGroups = Array.isArray(memberData.assigned_groups) 
        ? memberData.assigned_groups.map(group => group.toString().toLowerCase().trim())
        : [];

      console.log('✅ Normalized assigned_groups for login:', assignedGroups);
      
      const userProfile: UserProfile = {
        id: memberData.id,
        name: memberData.name || null,
        surname: memberData.surname || null,
        email: memberData.email || null,
        phone: memberData.phone || null,
        cell_group_id: memberData.cell_group_id || null,
        role: primaryRole,
        isAdmin,
        login_username: memberData.login_username || null,
        login_pin: memberData.login_pin || null,
        permissions: Array.isArray(memberData.permissions) ? memberData.permissions : [],
        assigned_groups: assignedGroups,
        assigned_departments: Array.isArray(memberData.assigned_departments) ? memberData.assigned_departments : [],
        is_leader: memberData.is_leader === true,
        originalRole: memberData.role
      };

      console.log('✅ Final profile for login:', userProfile);
      setProfile(userProfile);
      
      localStorage.setItem('username_pin_auth', JSON.stringify({
        user: mockUser,
        session: mockSession,
        profile: userProfile,
        timestamp: Date.now()
      }));

      console.log('🎉 Username/PIN login successful');
      return true;
    } catch (error) {
      console.error('💥 Username/PIN login error:', error);
      return false;
    }
  };

  const loginWithEmailPassword = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Email/password login error:', error);
        return false;
      }

      return !!data.session;
    } catch (error) {
      console.error('💥 Email/password login error:', error);
      return false;
    }
  };

  const login = async (identifier: string, credential: string): Promise<boolean> => {
    try {
      setLoading(true);

      const isEmail = identifier.includes('@');
      
      if (isEmail) {
        return await loginWithEmailPassword(identifier, credential);
      } else {
        return await loginWithUsernamePin(identifier, credential);
      }
    } catch (error) {
      console.error('💥 Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('username_pin_auth');
      
      if (session?.access_token !== 'username-pin-token') {
        await supabase.auth.signOut();
      }
      
      setUser(null);
      setSession(null);
      setProfile(null);
      console.log('👋 Logout successful');
    } catch (error) {
      console.error('💥 Logout error:', error);
    }
  };

  useEffect(() => {
    const checkStoredAuth = () => {
      try {
        const storedAuth = localStorage.getItem('username_pin_auth');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          const timestamp = authData.timestamp;
          const now = Date.now();
          const hoursElapsed = (now - timestamp) / (1000 * 60 * 60);
          
          if (hoursElapsed < 24) {
            setUser(authData.user);
            setSession(authData.session);
            setProfile(authData.profile);
            console.log('🔄 Restored auth from localStorage');
          } else {
            localStorage.removeItem('username_pin_auth');
            console.log('🗑️ Cleared expired auth from localStorage');
          }
        }
      } catch (error) {
        console.error('💥 Error checking stored auth:', error);
        localStorage.removeItem('username_pin_auth');
      }
    };

    checkStoredAuth();
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
