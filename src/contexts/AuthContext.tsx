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
  originalRole: string;
}

interface GroupMatch {
  user_id: string;
  user_name: string;
  assigned_groups: string[];
  assigned_group_normalized: string;
  group_id: string;
  group_name: string;
  normalized_name: string;
  match_type: 'EXACT_MATCH' | 'PARTIAL_MATCH_GROUP_CONTAINS_ASSIGNED' | 'PARTIAL_MATCH_ASSIGNED_CONTAINS_GROUP' | 'WHITESPACE_INSENSITIVE_MATCH' | 'NO_MATCH';
}

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  profile: UserProfile | null;
  login: (identifier: string, credential: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
  groupMatches: GroupMatch[];
  fetchGroupMatches: () => Promise<void>;
  groupMatchesLoading: boolean;
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
  const [groupMatches, setGroupMatches] = useState<GroupMatch[]>([]);
  const [groupMatchesLoading, setGroupMatchesLoading] = useState(false);

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
          setGroupMatches([]);
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

  const fetchGroupMatches = async () => {
    if (!profile) {
      console.log('❌ No profile available for group matching');
      return;
    }

    try {
      setGroupMatchesLoading(true);
      console.log('🔍 Fetching group matches for:', profile.id);
      
      const { data, error } = await supabase.rpc('get_group_matches', {
        p_user_id: profile.id,
        p_user_name: `${profile.name} ${profile.surname}`.trim(),
        p_assigned_groups: profile.assigned_groups || []
      });

      if (error) {
        console.error('❌ Error fetching group matches via RPC:', error);
        await fetchGroupMatchesDirect();
        return;
      }

      console.log('✅ Group matches fetched:', data);
      setGroupMatches(data || []);
    } catch (error) {
      console.error('💥 Error in fetchGroupMatches:', error);
      await fetchGroupMatchesDirect();
    } finally {
      setGroupMatchesLoading(false);
    }
  };

  const fetchGroupMatchesDirect = async () => {
    if (!profile) return;

    try {
      console.log('🔄 Using direct query for group matching');
      
      const { data: allGroups, error: groupsError } = await supabase
        .from('cell_groups')
        .select('id, name')
        .order('name');

      if (groupsError) {
        console.error('❌ Error fetching cell groups:', groupsError);
        return;
      }

      const matches: GroupMatch[] = [];
      const assignedGroups = profile.assigned_groups || [];

      for (const assignedGroup of assignedGroups) {
        const assignedGroupNormalized = assignedGroup.toLowerCase().trim();
        
        for (const group of allGroups || []) {
          const groupNameNormalized = group.name.toLowerCase().trim();
          
          let matchType: GroupMatch['match_type'] = 'NO_MATCH';
          
          if (assignedGroupNormalized === groupNameNormalized) {
            matchType = 'EXACT_MATCH';
          } else if (groupNameNormalized.includes(assignedGroupNormalized)) {
            matchType = 'PARTIAL_MATCH_GROUP_CONTAINS_ASSIGNED';
          } else if (assignedGroupNormalized.includes(groupNameNormalized)) {
            matchType = 'PARTIAL_MATCH_ASSIGNED_CONTAINS_GROUP';
          } else if (groupNameNormalized.replace(/\s/g, '') === assignedGroupNormalized.replace(/\s/g, '')) {
            matchType = 'WHITESPACE_INSENSITIVE_MATCH';
          }

          matches.push({
            user_id: profile.id,
            user_name: `${profile.name} ${profile.surname}`.trim(),
            assigned_groups: assignedGroups,
            assigned_group_normalized: assignedGroupNormalized,
            group_id: group.id,
            group_name: group.name,
            normalized_name: groupNameNormalized,
            match_type: matchType
          });
        }
      }

      console.log('✅ Direct group matches calculated:', matches);
      setGroupMatches(matches);
    } catch (error) {
      console.error('💥 Error in direct group matching:', error);
    }
  };

  useEffect(() => {
    if (profile) {
      console.log('🔄 Profile updated, fetching group matches...');
      fetchGroupMatches();
    }
  }, [profile]);

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
        const isAdmin = memberData.role === 'admin';
        
        const shouldBeGroupLeader = 
          memberData.is_leader === true || 
          memberData.role === 'group_leader' || 
          memberData.role === 'leader' ||
          memberData.role === 'department_leader' ||
          (memberData.assigned_groups && memberData.assigned_groups.length > 0);
        
        let primaryRole: 'admin' | 'group_leader' | 'member' = 'member';
        
        if (isAdmin) {
          primaryRole = 'admin';
        } else if (shouldBeGroupLeader) {
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
          assigned_departments: Array.isArray(memberData.assigned_departments) ? memberData.assigned_departments : [],
          is_leader: memberData.is_leader === true,
          originalRole: memberData.role
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

      const isAdmin = memberData.role === 'admin';
      
      const shouldBeGroupLeader = 
        memberData.is_leader === true || 
        memberData.role === 'group_leader' || 
        memberData.role === 'leader' ||
        memberData.role === 'department_leader' ||
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
      setGroupMatches([]);
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
    loading,
    groupMatches,
    fetchGroupMatches,
    groupMatchesLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
