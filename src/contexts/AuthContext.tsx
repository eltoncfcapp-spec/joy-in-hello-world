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
  admin_role: string;
  pastor_role: boolean | null;
  deacon_role: boolean | null;
  group_leader: boolean | null;
  department_leader: boolean | null;
  login_username: string | null;
  login_pin: string | null;
  permissions: string[];
  assigned_groups: string[];
  assigned_departments: string[];
  can_add_members: boolean;
  can_edit_members: boolean;
  can_view_own_data: boolean;
}

type Permission = 
  | 'view_all_groups'
  | 'view_all_departments'
  | 'view_own_group'
  | 'view_own_department'
  | 'manage_all_groups'
  | 'manage_all_departments'
  | 'manage_own_group'
  | 'manage_own_department'
  | 'edit_users'
  | 'view_reports'
  | 'manage_system'
  | 'create_meetings'
  | 'manage_attendance'
  | 'add_newcomers'
  | 'create_reports';

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  profile: UserProfile | null;
  login: (identifier: string, credential: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
  hasPermission: (permission: Permission, departmentId?: string, groupId?: string) => boolean;
  canViewGroup: (groupId: string) => boolean;
  canViewDepartment: (departmentId: string) => boolean;
  canManageGroup: (groupId: string) => boolean;
  canManageDepartment: (departmentId: string) => boolean;
  getUserGroups: () => string[];
  getUserDepartments: () => string[];
  canCreateDepartmentMeetings: (departmentId: string) => boolean;
  canManageDepartmentAttendance: (departmentId: string) => boolean;
  canAddDepartmentNewcomers: (departmentId: string) => boolean;
  canCreateDepartmentReports: (departmentId: string) => boolean;
  canCreateGroupMeetings: (groupId: string) => boolean;
  canManageGroupAttendance: (groupId: string) => boolean;
  canAddGroupNewcomers: (groupId: string) => boolean;
  canCreateGroupReports: (groupId: string) => boolean;
  isAdmin: () => boolean;
  isPastor: () => boolean;
  isDeacon: () => boolean;
  isGroupLeader: () => boolean;
  isDepartmentLeader: () => boolean;
  getRoles: () => string[];
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
  const [authInitialized, setAuthInitialized] = useState(false);

  // Helper methods for role checking
  const isAdmin = (): boolean => {
    return profile ? (profile.admin_role === 'admin' || profile.pastor_role === true) : false;
  };

  const isPastor = (): boolean => {
    return profile ? profile.pastor_role === true : false;
  };

  const isDeacon = (): boolean => {
    return profile ? profile.deacon_role === true : false;
  };

  const isGroupLeader = (): boolean => {
    return profile ? profile.group_leader === true : false;
  };

  const isDepartmentLeader = (): boolean => {
    return profile ? profile.department_leader === true : false;
  };

  const getRoles = (): string[] => {
    if (!profile) return [];
    
    const roles: string[] = [];
    if (profile.admin_role && profile.admin_role !== 'member') {
      roles.push(profile.admin_role);
    }
    if (profile.pastor_role) roles.push('pastor');
    if (profile.deacon_role) roles.push('deacon');
    if (profile.group_leader) roles.push('group_leader');
    if (profile.department_leader) roles.push('department_leader');
    
    if (roles.length === 0) {
      roles.push('member');
    }
    
    return roles;
  };

  // Enhanced permission check function
  const hasPermission = (permission: Permission, departmentId?: string, groupId?: string): boolean => {
    if (!profile) return false;

    // Admin and Pastor have all permissions everywhere
    if (isAdmin() || isPastor()) return true;

    // Check specific permissions based on role and assignments
    switch (permission) {
      case 'view_all_groups':
      case 'view_all_departments':
      case 'manage_all_groups':
      case 'manage_all_departments':
      case 'edit_users':
      case 'manage_system':
        return isAdmin() || isPastor();
      
      case 'view_own_group':
        if (groupId) {
          return profile.assigned_groups.includes(groupId) || profile.cell_group_id === groupId;
        }
        return isGroupLeader() || isDeacon();
      
      case 'view_own_department':
        if (departmentId) {
          return profile.assigned_departments.includes(departmentId);
        }
        return isDepartmentLeader() || isDeacon();
      
      case 'manage_own_group':
        if (groupId) {
          return profile.assigned_groups.includes(groupId) || profile.cell_group_id === groupId;
        }
        return isGroupLeader();
      
      case 'manage_own_department':
        if (departmentId) {
          return profile.assigned_departments.includes(departmentId);
        }
        return isDepartmentLeader();
      
      case 'view_reports':
        return isAdmin() || isPastor() || isDeacon() || isDepartmentLeader() || isGroupLeader();
      
      case 'create_meetings':
      case 'manage_attendance':
      case 'add_newcomers':
      case 'create_reports':
        // Department leaders can only do these in their assigned departments
        if (departmentId && isDepartmentLeader()) {
          return profile.assigned_departments.includes(departmentId);
        }
        // Group leaders can only do these in their assigned groups
        if (groupId && isGroupLeader()) {
          return profile.assigned_groups.includes(groupId) || profile.cell_group_id === groupId;
        }
        return isAdmin() || isPastor() || isDepartmentLeader() || isGroupLeader();
      
      default:
        return false;
    }
  };

  // Check if user can view a specific group
  const canViewGroup = (groupId: string): boolean => {
    if (!profile) return false;
    if (hasPermission('view_all_groups')) return true;
    if (hasPermission('view_own_group')) {
      const isAssigned = profile.assigned_groups.includes(groupId);
      const isCellGroup = profile.cell_group_id === groupId;
      return isAssigned || isCellGroup;
    }
    return false;
  };

  // Check if user can view a specific department
  const canViewDepartment = (departmentId: string): boolean => {
    if (!profile) return false;
    if (hasPermission('view_all_departments')) return true;
    if (isDeacon()) return true;
    if (hasPermission('view_own_department')) {
      const isAssigned = profile.assigned_departments.includes(departmentId);
      return isAssigned;
    }
    return false;
  };

  // Check if user can manage a specific group
  const canManageGroup = (groupId: string): boolean => {
    if (!profile) return false;
    if (hasPermission('manage_all_groups')) return true;
    if (hasPermission('manage_own_group')) {
      const isAssigned = profile.assigned_groups.includes(groupId);
      const isCellGroup = profile.cell_group_id === groupId;
      return isAssigned || isCellGroup;
    }
    return false;
  };

  // Check if user can manage a specific department
  const canManageDepartment = (departmentId: string): boolean => {
    if (!profile) return false;
    if (hasPermission('manage_all_departments')) return true;
    if (hasPermission('manage_own_department')) {
      const isAssigned = profile.assigned_departments.includes(departmentId);
      return isAssigned;
    }
    return false;
  };

  // Enhanced department-specific permission checks
  const canCreateDepartmentMeetings = (departmentId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    if (isDepartmentLeader()) {
      return profile.assigned_departments.includes(departmentId);
    }
    return false;
  };

  const canManageDepartmentAttendance = (departmentId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    if (isDepartmentLeader()) {
      return profile.assigned_departments.includes(departmentId);
    }
    return false;
  };

  const canAddDepartmentNewcomers = (departmentId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    if (isDepartmentLeader()) {
      return profile.assigned_departments.includes(departmentId);
    }
    return false;
  };

  const canCreateDepartmentReports = (departmentId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    if (isDepartmentLeader()) {
      return profile.assigned_departments.includes(departmentId);
    }
    return false;
  };

  // Group-specific permission checks
  const canCreateGroupMeetings = (groupId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    if (isGroupLeader()) {
      return profile.assigned_groups.includes(groupId) || profile.cell_group_id === groupId;
    }
    return false;
  };

  const canManageGroupAttendance = (groupId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    if (isGroupLeader()) {
      return profile.assigned_groups.includes(groupId) || profile.cell_group_id === groupId;
    }
    return false;
  };

  const canAddGroupNewcomers = (groupId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    if (isGroupLeader()) {
      return profile.assigned_groups.includes(groupId) || profile.cell_group_id === groupId;
    }
    return false;
  };

  const canCreateGroupReports = (groupId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    if (isGroupLeader()) {
      return profile.assigned_groups.includes(groupId) || profile.cell_group_id === groupId;
    }
    return false;
  };

  // Get user's accessible groups
  const getUserGroups = (): string[] => {
    if (!profile) return [];
    if (hasPermission('view_all_groups')) return ['all_groups'];
    const groups = [...profile.assigned_groups];
    if (profile.cell_group_id && !groups.includes(profile.cell_group_id)) {
      groups.push(profile.cell_group_id);
    }
    return groups;
  };

  // Get user's accessible departments
  const getUserDepartments = (): string[] => {
    if (!profile) return [];
    if (hasPermission('view_all_departments')) return ['all_departments'];
    if (isDeacon()) return ['all_departments'];
    return [...profile.assigned_departments];
  };

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string, email?: string): Promise<UserProfile | null> => {
    try {
      console.log('Fetching profile for user:', userId, 'email:', email);
      
      // Try to find user by ID first
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .or(`id.eq.${userId},email.eq.${email || ''}`)
        .maybeSingle();

      if (memberError) {
        console.error('Error fetching from members table:', memberError);
        throw memberError;
      }

      if (memberData) {
        const userProfile: UserProfile = {
          id: memberData.id,
          name: memberData.name || null,
          surname: memberData.surname || null,
          email: memberData.email || null,
          phone: memberData.phone || null,
          cell_group_id: memberData.cell_group_id || null,
          admin_role: memberData.admin_role || 'member',
          pastor_role: memberData.pastor_role || false,
          deacon_role: memberData.deacon_role || false,
          group_leader: memberData.group_leader || false,
          department_leader: memberData.department_leader || false,
          login_username: memberData.login_username || null,
          login_pin: memberData.login_pin || null,
          permissions: Array.isArray(memberData.permissions) ? memberData.permissions : [],
          assigned_groups: Array.isArray(memberData.assigned_groups) ? memberData.assigned_groups : [],
          assigned_departments: Array.isArray(memberData.assigned_departments) ? memberData.assigned_departments : [],
          can_add_members: Boolean(memberData.can_add_members),
          can_edit_members: Boolean(memberData.can_edit_members),
          can_view_own_data: Boolean(memberData.can_view_own_data)
        };

        console.log('Profile fetched successfully:', userProfile);
        return userProfile;
      }

      console.log('No user data found in members table');
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Handle Supabase auth state changes
  const handleAuthStateChange = async (event: string, session: Session | null) => {
    console.log('Auth state change:', event, session?.user?.id);
    
    setSession(session);
    setUser(session?.user ?? null);
    
    if (session?.user) {
      // Fetch profile for authenticated user
      const userProfile = await fetchUserProfile(session.user.id, session.user.email);
      if (userProfile) {
        setProfile(userProfile);
        // Store minimal auth info in localStorage
        localStorage.setItem('auth_info', JSON.stringify({
          userId: session.user.id,
          timestamp: Date.now(),
          type: 'supabase'
        }));
      }
    } else {
      // Clear everything on sign out
      setProfile(null);
      localStorage.removeItem('auth_info');
      localStorage.removeItem('username_auth');
    }
    
    setLoading(false);
    setAuthInitialized(true);
  };

  // Initialize auth
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // First check for existing Supabase session
        const { data: { session: supabaseSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting Supabase session:', error);
          if (mounted) {
            setLoading(false);
            setAuthInitialized(true);
          }
          return;
        }

        if (supabaseSession?.user && mounted) {
          console.log('Found Supabase session for user:', supabaseSession.user.id);
          const userProfile = await fetchUserProfile(supabaseSession.user.id, supabaseSession.user.email);
          if (userProfile) {
            setSession(supabaseSession);
            setUser(supabaseSession.user);
            setProfile(userProfile);
            
            // Store auth info
            localStorage.setItem('auth_info', JSON.stringify({
              userId: supabaseSession.user.id,
              timestamp: Date.now(),
              type: 'supabase'
            }));
          }
        }
        
        if (mounted) {
          setLoading(false);
          setAuthInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
          setAuthInitialized(true);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loginWithUsernamePin = async (username: string, pin: string): Promise<boolean> => {
    try {
      console.log('Attempting username/PIN login:', username);
      
      // Clear any existing Supabase session first
      await supabase.auth.signOut();
      
      // Search for member with matching username and PIN
      const { data: memberData, error } = await supabase
        .from('members')
        .select('*')
        .eq('login_username', username)
        .eq('login_pin', pin)
        .maybeSingle();

      if (error || !memberData) {
        console.error('Username/PIN login error:', error);
        return false;
      }

      console.log('Username/PIN login successful for:', memberData.id);
      
      // Create a lightweight user object
      const userProfile: UserProfile = {
        id: memberData.id,
        name: memberData.name || null,
        surname: memberData.surname || null,
        email: memberData.email || null,
        phone: memberData.phone || null,
        cell_group_id: memberData.cell_group_id || null,
        admin_role: memberData.admin_role || 'member',
        pastor_role: memberData.pastor_role || false,
        deacon_role: memberData.deacon_role || false,
        group_leader: memberData.group_leader || false,
        department_leader: memberData.department_leader || false,
        login_username: memberData.login_username || null,
        login_pin: memberData.login_pin || null,
        permissions: Array.isArray(memberData.permissions) ? memberData.permissions : [],
        assigned_groups: Array.isArray(memberData.assigned_groups) ? memberData.assigned_groups : [],
        assigned_departments: Array.isArray(memberData.assigned_departments) ? memberData.assigned_departments : [],
        can_add_members: Boolean(memberData.can_add_members),
        can_edit_members: Boolean(memberData.can_edit_members),
        can_view_own_data: Boolean(memberData.can_view_own_data)
      };

      // Create a simple SupabaseUser-like object
      const simpleUser: SupabaseUser = {
        id: memberData.id,
        email: memberData.email || `${username}@church.local`,
        phone: memberData.phone || null,
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

      // Create a simple session
      const simpleSession: Session = {
        access_token: 'simple-token-' + Date.now(),
        token_type: 'bearer',
        expires_in: 86400, // 24 hours
        expires_at: Math.floor(Date.now() / 1000) + 86400,
        refresh_token: 'simple-refresh-' + Date.now(),
        user: simpleUser,
        provider_token: null,
        provider_refresh_token: null
      } as Session;

      // Set state
      setUser(simpleUser);
      setSession(simpleSession);
      setProfile(userProfile);

      // Store simple auth info
      localStorage.setItem('auth_info', JSON.stringify({
        userId: memberData.id,
        timestamp: Date.now(),
        type: 'username_pin'
      }));
      
      // Store user profile separately for quick retrieval
      localStorage.setItem('user_profile', JSON.stringify(userProfile));

      return true;
    } catch (error) {
      console.error('Username/PIN login error:', error);
      return false;
    }
  };

  const loginWithEmailPassword = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting email/password login:', email);
      
      // Clear any stored auth info
      localStorage.removeItem('auth_info');
      localStorage.removeItem('user_profile');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Email/password login error:', error);
        return false;
      }

      console.log('Email/password login successful');
      return !!data.session;
    } catch (error) {
      console.error('Email/password login error:', error);
      return false;
    }
  };

  const login = async (identifier: string, credential: string): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('Login attempt with identifier:', identifier);

      // Clear any existing local storage
      localStorage.removeItem('auth_info');
      localStorage.removeItem('user_profile');

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
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Clear all local storage
      localStorage.removeItem('auth_info');
      localStorage.removeItem('user_profile');
      localStorage.removeItem('username_pin_auth');
      
      // Sign out from Supabase if it's an email/password session
      await supabase.auth.signOut();
      
      // Reset all state
      setUser(null);
      setSession(null);
      setProfile(null);
      
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    login,
    logout,
    loading: loading || !authInitialized,
    hasPermission,
    canViewGroup,
    canViewDepartment,
    canManageGroup,
    canManageDepartment,
    getUserGroups,
    getUserDepartments,
    canCreateDepartmentMeetings,
    canManageDepartmentAttendance,
    canAddDepartmentNewcomers,
    canCreateDepartmentReports,
    canCreateGroupMeetings,
    canManageGroupAttendance,
    canAddGroupNewcomers,
    canCreateGroupReports,
    isAdmin,
    isPastor,
    isDeacon,
    isGroupLeader,
    isDepartmentLeader,
    getRoles
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
