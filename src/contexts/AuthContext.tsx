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
  // ADD THIS: Store the user's cell group data
  userCellGroup?: any | null;
}

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  profile: UserProfile | null;
  login: (identifier: string, credential: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
  // ADD THIS: Function to refresh cell group data
  refreshUserCellGroup: () => Promise<void>;
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

  // ADD THIS: Function to fetch user's cell group using the exact query you provided
  const fetchUserCellGroup = async (username: string) => {
    try {
      console.log('🔍 Fetching user cell group for username:', username);
      
      if (!username) {
        console.log('❌ No username provided for cell group query');
        return null;
      }

      // Use the exact query you provided
      const { data, error } = await supabase
        .from('cell_groups')
        .select('*')
        .eq('id', 
          supabase
            .from('members')
            .select('cell_group_id')
            .eq('login_username', username)
        )
        .single();

      if (error) {
        console.error('❌ Error fetching cell group:', error);
        return null;
      }

      console.log('✅ Found cell group via username query:', data);
      return data;
    } catch (error) {
      console.error('❌ Error in fetchUserCellGroup:', error);
      return null;
    }
  };

  // ADD THIS: Function to refresh cell group data
  const refreshUserCellGroup = async () => {
    if (profile?.login_username) {
      const cellGroupData = await fetchUserCellGroup(profile.login_username);
      if (cellGroupData) {
        setProfile(prev => prev ? { ...prev, userCellGroup: cellGroupData } : null);
        console.log('🔄 Refreshed user cell group data');
      }
    }
  };

  // Check for existing session and set up auth listener
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
      }

      console.log('📊 Raw member data from database:', memberData);

      if (memberData) {
        const isAdmin = memberData.role === 'admin';
        
        let primaryRole: 'admin' | 'group_leader' | 'member' = 'member';
        
        if (isAdmin) {
          primaryRole = 'admin';
        } else if (memberData.role === 'group_leader' || memberData.role === 'leader') {
          primaryRole = 'group_leader';
        } else {
          primaryRole = 'member';
        }

        console.log('🎯 Mapped role:', primaryRole);
        
        // ADD THIS: Fetch user's cell group data using their login_username
        const userCellGroup = await fetchUserCellGroup(memberData.login_username || '');

        const userProfile: UserProfile = {
          id: userId,
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
          assigned_groups: Array.isArray(memberData.assigned_groups) ? memberData.assigned_groups : [],
          assigned_departments: Array.isArray(memberData.assigned_departments) ? memberData.assigned_departments : [],
          userCellGroup // ADD THIS: Store the cell group data
        };

        console.log('✅ Final profile object with cell group:', userProfile);
        setProfile(userProfile);
        return;
      }

      // Fallback to profiles table if members table doesn't have the user
      console.log('🔄 Trying profiles table as fallback...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('❌ Error fetching from profiles table:', profileError);
      }

      if (profileData) {
        console.log('📊 Profile data found:', profileData);
        
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        if (rolesError) {
          console.error('❌ Error fetching roles:', rolesError);
        }

        const roles = rolesData?.map(r => r.role) || [];
        console.log('🎭 User roles:', roles);
        
        const isAdmin = roles.includes('admin');
        let primaryRole: 'admin' | 'group_leader' | 'member' = 'member';
        
        if (isAdmin) {
          primaryRole = 'admin';
        } else if (roles.includes('leader' as any)) {
          primaryRole = 'group_leader';
        } else {
          primaryRole = 'member';
        }

        // For profile table users, we might not have login_username, so use a different approach
        const userCellGroup = profileData.cell_group_id ? await supabase
          .from('cell_groups')
          .select('*')
          .eq('id', profileData.cell_group_id)
          .single() : null;

        const userProfile: UserProfile = {
          id: userId,
          name: profileData.name || null,
          surname: profileData.surname || null,
          email: profileData.email || null,
          phone: profileData.phone || null,
          cell_group_id: profileData.cell_group_id || null,
          role: primaryRole,
          isAdmin,
          login_username: null, // Profile table might not have login_username
          login_pin: null,
          permissions: [],
          assigned_groups: [],
          assigned_departments: [],
          userCellGroup: userCellGroup?.data || null
        };

        console.log('✅ Final profile from profiles table with cell group:', userProfile);
        setProfile(userProfile);
      } else {
        console.log('❌ No user data found in members or profiles table');
      }
    } catch (error) {
      console.error('💥 Error fetching user profile:', error);
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

      // ADD THIS: Fetch user's cell group data during login using the username
      const userCellGroup = await fetchUserCellGroup(username);

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

      const isAdmin = memberData.role === 'admin';
      
      let primaryRole: 'admin' | 'group_leader' | 'member' = 'member';
      
      if (isAdmin) {
        primaryRole = 'admin';
      } else if (memberData.role === 'group_leader' || memberData.role === 'leader') {
        primaryRole = 'group_leader';
      } else {
        primaryRole = 'member';
      }

      console.log('🎯 Final mapped role for login:', primaryRole);
      
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
        assigned_groups: Array.isArray(memberData.assigned_groups) ? memberData.assigned_groups : [],
        assigned_departments: Array.isArray(memberData.assigned_departments) ? memberData.assigned_departments : [],
        userCellGroup // ADD THIS: Store the cell group data
      };

      console.log('✅ Final profile for login with cell group:', userProfile);
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

      // Check if identifier is email format
      const isEmail = identifier.includes('@');
      
      if (isEmail) {
        // Email/password login
        return await loginWithEmailPassword(identifier, credential);
      } else {
        // Username/PIN login
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
      // Clear username/PIN auth from localStorage
      localStorage.removeItem('username_pin_auth');
      
      // Only call Supabase logout if it's an email/password session
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

  // Check for stored username/PIN auth on component mount
  useEffect(() => {
    const checkStoredAuth = () => {
      try {
        const storedAuth = localStorage.getItem('username_pin_auth');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          const timestamp = authData.timestamp;
          const now = Date.now();
          const hoursElapsed = (now - timestamp) / (1000 * 60 * 60);
          
          // If less than 24 hours old, restore the auth
          if (hoursElapsed < 24) {
            setUser(authData.user);
            setSession(authData.session);
            setProfile(authData.profile);
            console.log('🔄 Restored auth from localStorage');
          } else {
            // Clear expired auth
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
    loading,
    refreshUserCellGroup // ADD THIS: Export the refresh function
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
