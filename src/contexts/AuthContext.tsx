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

  // Check for existing session and set up auth listener
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile and role
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // Check for existing session
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
      
      // First try to fetch from members table (where your data is stored)
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
        // Debug: Check what role value actually comes from database
        console.log('🎭 Database role value:', memberData.role);
        console.log('🔑 Database permissions:', memberData.permissions);
        console.log('🏷️ Database assigned_groups:', memberData.assigned_groups);

        // Create profile from member data with ALL required fields
        const isAdmin = memberData.role === 'admin';
        
        // FIXED: Better role mapping that handles various database values
        let primaryRole: 'admin' | 'group_leader' | 'member' = 'member';
        
        if (isAdmin) {
          primaryRole = 'admin';
        } else if (memberData.role === 'group_leader' || memberData.role === 'leader') {
          primaryRole = 'group_leader';
        } else {
          primaryRole = 'member';
        }

        console.log('🎯 Mapped role:', primaryRole);
        console.log('👑 Is admin:', isAdmin);
        
        // FIXED: Ensure assigned_groups is always an array and properly formatted
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
          role: primaryRole,
          isAdmin,
          login_username: memberData.login_username || null,
          login_pin: memberData.login_pin || null,
          permissions: Array.isArray(memberData.permissions) ? memberData.permissions : [],
          assigned_groups: assignedGroups,
          assigned_departments: Array.isArray(memberData.assigned_departments) ? memberData.assigned_departments : []
        };

        console.log('✅ Final profile object:', userProfile);
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
        
        // Fetch user roles
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

        console.log('🎯 Mapped role from profiles:', primaryRole);

        const userProfile: UserProfile = {
          id: userId,
          name: profileData.name || null,
          surname: profileData.surname || null,
          email: profileData.email || null,
          phone: profileData.phone || null,
          cell_group_id: profileData.cell_group_id || null,
          role: primaryRole,
          isAdmin,
          login_username: null,
          login_pin: null,
          permissions: [],
          assigned_groups: [],
          assigned_departments: []
        };

        console.log('✅ Final profile from profiles table:', userProfile);
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
      
      // Search for member with matching username and PIN
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
      console.log('🎭 Database role:', memberData.role);
      console.log('🔑 Database permissions:', memberData.permissions);

      // Create a mock session and user for username/PIN login
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

      // Set the user and session
      setUser(mockUser);
      setSession(mockSession);

      // Create and set the profile with ALL required fields
      const isAdmin = memberData.role === 'admin';
      
      // FIXED: Better role mapping
      let primaryRole: 'admin' | 'group_leader' | 'member' = 'member';
      
      if (isAdmin) {
        primaryRole = 'admin';
      } else if (memberData.role === 'group_leader' || memberData.role === 'leader') {
        primaryRole = 'group_leader';
      } else {
        primaryRole = 'member';
      }

      console.log('🎯 Final mapped role for login:', primaryRole);
      
      // FIXED: Ensure assigned_groups is always an array and properly formatted
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
        assigned_departments: Array.isArray(memberData.assigned_departments) ? memberData.assigned_departments : []
      };

      console.log('✅ Final profile for login:', userProfile);
      setProfile(userProfile);
      
      // Store in localStorage for persistence
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
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
