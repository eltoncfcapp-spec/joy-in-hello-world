// lib/auth-context.tsx
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

interface MeetingReport {
  id: string;
  meeting_id: string | null;
  report_text: string;
  decisions_made: string | null;
  action_items: string | null;
  next_meeting_date: string | null;
  created_by: string | null;
  created_at: string;
  meeting_title?: string;
  author_name?: string;
}

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  profile: UserProfile | null;
  login: (identifier: string, credential: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
  // Meeting Reports methods
  createMeetingReport: (report: Omit<MeetingReport, 'id' | 'created_at' | 'author_name'>) => Promise<MeetingReport | null>;
  updateMeetingReport: (id: string, report: Partial<MeetingReport>) => Promise<MeetingReport | null>;
  deleteMeetingReport: (id: string) => Promise<boolean>;
  getMeetingReports: () => Promise<MeetingReport[]>;
  getMeetingReport: (id: string) => Promise<MeetingReport | null>;
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
    const initializeAuth = async () => {
      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await fetchUserProfile(session.user.id);
          } else {
            setProfile(null);
          }
        }
      );

      // Check for existing session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await fetchUserProfile(currentSession.user.id);
      }
      setLoading(false);

      return () => subscription.unsubscribe();
    };

    initializeAuth();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('🔍 Fetching user profile for:', userId);
      
      // First try to fetch from members table
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', userId)
        .single();

      if (memberError) {
        console.error('❌ Error fetching from members table:', memberError);
      }

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
          assigned_departments: Array.isArray(memberData.assigned_departments) ? memberData.assigned_departments : []
        };

        setProfile(userProfile);
        return;
      }

      // Fallback to profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('❌ Error fetching from profiles table:', profileError);
      }

      if (profileData) {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        const roles = rolesData?.map(r => r.role) || [];
        const isAdmin = roles.includes('admin');
        let primaryRole: 'admin' | 'group_leader' | 'member' = 'member';
        
        if (isAdmin) {
          primaryRole = 'admin';
        } else if (roles.includes('leader' as any)) {
          primaryRole = 'group_leader';
        } else {
          primaryRole = 'member';
        }

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

        setProfile(userProfile);
      }
    } catch (error) {
      console.error('💥 Error fetching user profile:', error);
    }
  };

  // Meeting Reports API Methods
  const createMeetingReport = async (report: Omit<MeetingReport, 'id' | 'created_at' | 'author_name'>): Promise<MeetingReport | null> => {
    try {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('meeting_reports')
        .insert({
          ...report,
          created_by: profile.id
        })
        .select(`
          *,
          meetings (title),
          members (name, surname)
        `)
        .single();

      if (error) throw error;

      const meetingReport: MeetingReport = {
        ...data,
        meeting_title: data.meetings?.title,
        author_name: data.members ? `${data.members.name} ${data.members.surname}` : 'Unknown'
      };

      return meetingReport;
    } catch (error) {
      console.error('Error creating meeting report:', error);
      return null;
    }
  };

  const updateMeetingReport = async (id: string, report: Partial<MeetingReport>): Promise<MeetingReport | null> => {
    try {
      const { data, error } = await supabase
        .from('meeting_reports')
        .update(report)
        .eq('id', id)
        .select(`
          *,
          meetings (title),
          members (name, surname)
        `)
        .single();

      if (error) throw error;

      const meetingReport: MeetingReport = {
        ...data,
        meeting_title: data.meetings?.title,
        author_name: data.members ? `${data.members.name} ${data.members.surname}` : 'Unknown'
      };

      return meetingReport;
    } catch (error) {
      console.error('Error updating meeting report:', error);
      return null;
    }
  };

  const deleteMeetingReport = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('meeting_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting meeting report:', error);
      return false;
    }
  };

  const getMeetingReports = async (): Promise<MeetingReport[]> => {
    try {
      const { data, error } = await supabase
        .from('meeting_reports')
        .select(`
          *,
          meetings (title),
          members (name, surname)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(report => ({
        ...report,
        meeting_title: report.meetings?.title,
        author_name: report.members ? `${report.members.name} ${report.members.surname}` : 'Unknown'
      }));
    } catch (error) {
      console.error('Error fetching meeting reports:', error);
      return [];
    }
  };

  const getMeetingReport = async (id: string): Promise<MeetingReport | null> => {
    try {
      const { data, error } = await supabase
        .from('meeting_reports')
        .select(`
          *,
          meetings (title),
          members (name, surname)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const meetingReport: MeetingReport = {
        ...data,
        meeting_title: data.meetings?.title,
        author_name: data.members ? `${data.members.name} ${data.members.surname}` : 'Unknown'
      };

      return meetingReport;
    } catch (error) {
      console.error('Error fetching meeting report:', error);
      return null;
    }
  };

  const loginWithUsernamePin = async (username: string, pin: string): Promise<boolean> => {
    try {
      const { data: memberData, error } = await supabase
        .from('members')
        .select('*')
        .eq('login_username', username)
        .eq('login_pin', pin)
        .single();

      if (error || !memberData) {
        return false;
      }

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
        assigned_departments: Array.isArray(memberData.assigned_departments) ? memberData.assigned_departments : []
      };

      setProfile(userProfile);
      
      localStorage.setItem('username_pin_auth', JSON.stringify({
        user: mockUser,
        session: mockSession,
        profile: userProfile,
        timestamp: Date.now()
      }));

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
          } else {
            localStorage.removeItem('username_pin_auth');
          }
        }
      } catch (error) {
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
    createMeetingReport,
    updateMeetingReport,
    deleteMeetingReport,
    getMeetingReports,
    getMeetingReport
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export type { MeetingReport, UserProfile };
