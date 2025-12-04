import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

// Define UserProfile interface
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

// PRESET DEVELOPER ACCOUNT
const DEVELOPER_ACCOUNT = {
  email: 'admin1@church.com',
  username: 'developer',
  password: 'admin2025',
  pin: '2025',
  name: 'System',
  surname: 'Developer',
  id: 'dev-001'
};

// Check if credentials match developer account
const isDeveloperCredentials = (identifier: string, credential: string): boolean => {
  const normalizedIdentifier = identifier.toLowerCase().trim();
  
  // Check email login
  if (normalizedIdentifier === DEVELOPER_ACCOUNT.email.toLowerCase()) {
    return credential === DEVELOPER_ACCOUNT.password;
  }
  
  // Check username login
  if (normalizedIdentifier === DEVELOPER_ACCOUNT.username.toLowerCase()) {
    return credential === DEVELOPER_ACCOUNT.pin;
  }
  
  return false;
};

// Create developer user profile
const createDeveloperProfile = (): UserProfile => ({
  id: DEVELOPER_ACCOUNT.id,
  name: DEVELOPER_ACCOUNT.name,
  surname: DEVELOPER_ACCOUNT.surname,
  email: DEVELOPER_ACCOUNT.email,
  phone: '+1234567890',
  cell_group_id: null,
  admin_role: 'super_admin',
  pastor_role: true,
  deacon_role: true,
  group_leader: true,
  department_leader: true,
  login_username: DEVELOPER_ACCOUNT.username,
  login_pin: DEVELOPER_ACCOUNT.pin,
  permissions: [
    'view_all_groups',
    'view_all_departments',
    'view_own_group',
    'view_own_department',
    'manage_all_groups',
    'manage_all_departments',
    'manage_own_group',
    'manage_own_department',
    'edit_users',
    'view_reports',
    'manage_system',
    'create_meetings',
    'manage_attendance',
    'add_newcomers',
    'create_reports'
  ],
  assigned_groups: ['all_groups'],
  assigned_departments: ['all_departments'],
  can_add_members: true,
  can_edit_members: true,
  can_view_own_data: true
});

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper methods for role checking
  const isAdmin = (): boolean => {
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;
    return profile ? (profile.admin_role === 'admin' || profile.pastor_role === true) : false;
  };

  const isPastor = (): boolean => {
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;
    return profile ? profile.pastor_role === true : false;
  };

  const isDeacon = (): boolean => {
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;
    return profile ? profile.deacon_role === true : false;
  };

  const isGroupLeader = (): boolean => {
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;
    return profile ? profile.group_leader === true : false;
  };

  const isDepartmentLeader = (): boolean => {
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;
    return profile ? profile.department_leader === true : false;
  };

  const getRoles = (): string[] => {
    if (user?.id === DEVELOPER_ACCOUNT.id) {
      return ['super_admin', 'developer', 'pastor', 'deacon', 'group_leader', 'department_leader'];
    }
    
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
    // Developer has all permissions everywhere
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;

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
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;
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
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;
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
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;
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
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;
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
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    if (isDepartmentLeader()) {
      return profile.assigned_departments.includes(departmentId);
    }
    return false;
  };

  const canManageDepartmentAttendance = (departmentId: string): boolean => {
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    if (isDepartmentLeader()) {
      return profile.assigned_departments.includes(departmentId);
    }
    return false;
  };

  const canAddDepartmentNewcomers = (departmentId: string): boolean => {
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    if (isDepartmentLeader()) {
      return profile.assigned_departments.includes(departmentId);
    }
    return false;
  };

  const canCreateDepartmentReports = (departmentId: string): boolean => {
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    if (isDepartmentLeader()) {
      return profile.assigned_departments.includes(departmentId);
    }
    return false;
  };

  // Group-specific permission checks
  const canCreateGroupMeetings = (groupId: string): boolean => {
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    if (isGroupLeader()) {
      return profile.assigned_groups.includes(groupId) || profile.cell_group_id === groupId;
    }
    return false;
  };

  const canManageGroupAttendance = (groupId: string): boolean => {
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    if (isGroupLeader()) {
      return profile.assigned_groups.includes(groupId) || profile.cell_group_id === groupId;
    }
    return false;
  };

  const canAddGroupNewcomers = (groupId: string): boolean => {
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    if (isGroupLeader()) {
      return profile.assigned_groups.includes(groupId) || profile.cell_group_id === groupId;
    }
    return false;
  };

  const canCreateGroupReports = (groupId: string): boolean => {
    if (user?.id === DEVELOPER_ACCOUNT.id) return true;
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    if (isGroupLeader()) {
      return profile.assigned_groups.includes(groupId) || profile.cell_group_id === groupId;
    }
    return false;
  };

  // Get user's accessible groups
  const getUserGroups = (): string[] => {
    if (user?.id === DEVELOPER_ACCOUNT.id) return ['all_groups'];
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
    if (user?.id === DEVELOPER_ACCOUNT.id) return ['all_departments'];
    if (!profile) return [];
    if (hasPermission('view_all_departments')) return ['all_departments'];
    if (isDeacon()) return ['all_departments'];
    return [...profile.assigned_departments];
  };

  // Check for existing session and set up auth listener
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // First check for stored username/PIN auth
        const storedAuth = localStorage.getItem('username_pin_auth');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          const timestamp = authData.timestamp;
          const now = Date.now();
          const hoursElapsed = (now - timestamp) / (1000 * 60 * 60);
          
          if (hoursElapsed < 24 && mounted) {
            setUser(authData.user);
            setSession(authData.session);
            setProfile(authData.profile);
            setLoading(false);
            return;
          } else {
            localStorage.removeItem('username_pin_auth');
          }
        }

        // Check for developer session in localStorage
        const storedDeveloperAuth = localStorage.getItem('developer_auth');
        if (storedDeveloperAuth) {
          const authData = JSON.parse(storedDeveloperAuth);
          const timestamp = authData.timestamp;
          const now = Date.now();
          const hoursElapsed = (now - timestamp) / (1000 * 60 * 60);
          
          if (hoursElapsed < 24 && mounted) {
            setUser(authData.user);
            setSession(authData.session);
            setProfile(authData.profile);
            setLoading(false);
            return;
          } else {
            localStorage.removeItem('developer_auth');
          }
        }

        // Check for Supabase session
        const { data: { session: supabaseSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        }

        if (mounted) {
          setSession(supabaseSession);
          setUser(supabaseSession?.user ?? null);
          if (supabaseSession?.user) {
            await fetchUserProfile(supabaseSession.user.id);
          } else {
            setProfile(null);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, supabaseSession) => {
        if (!mounted) return;
        
        setSession(supabaseSession);
        setUser(supabaseSession?.user ?? null);
        
        if (supabaseSession?.user) {
          await fetchUserProfile(supabaseSession.user.id);
        } else {
          setProfile(null);
          localStorage.removeItem('username_pin_auth');
          localStorage.removeItem('developer_auth');
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      // If it's the developer user, create profile
      if (userId === DEVELOPER_ACCOUNT.id) {
        const developerProfile = createDeveloperProfile();
        setProfile(developerProfile);
        return;
      }

      // Fetch from members table for regular users
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', userId)
        .single();

      if (memberError) {
        console.error('Error fetching from members table:', memberError);
        throw memberError;
      }

      if (memberData) {
        const userProfile: UserProfile = {
          id: userId,
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

        setProfile(userProfile);
        return;
      }

      throw new Error('No user data found in members table');
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setProfile(null);
    }
  };

  // Developer login handler
  const loginAsDeveloper = async (): Promise<boolean> => {
    try {
      // Create a mock user object for developer
      const devUser: SupabaseUser = {
        id: DEVELOPER_ACCOUNT.id,
        email: DEVELOPER_ACCOUNT.email,
        phone: '+1234567890',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        app_metadata: {
          provider: 'developer',
          roles: ['super_admin', 'developer']
        },
        user_metadata: {
          name: DEVELOPER_ACCOUNT.name,
          surname: DEVELOPER_ACCOUNT.surname,
          full_name: `${DEVELOPER_ACCOUNT.name} ${DEVELOPER_ACCOUNT.surname}`
        },
        aud: 'authenticated',
        role: 'authenticated'
      } as SupabaseUser;

      const devSession: Session = {
        access_token: 'developer-token-' + Date.now(),
        token_type: 'bearer',
        expires_in: 86400,
        expires_at: Math.floor(Date.now() / 1000) + 86400,
        refresh_token: 'developer-refresh-' + Date.now(),
        user: devUser,
        provider_token: null,
        provider_refresh_token: null
      } as Session;

      const devProfile = createDeveloperProfile();

      // Set state
      setUser(devUser);
      setSession(devSession);
      setProfile(devProfile);

      // Store in localStorage for persistence
      localStorage.setItem('developer_auth', JSON.stringify({
        user: devUser,
        session: devSession,
        profile: devProfile,
        timestamp: Date.now()
      }));

      return true;
    } catch (error) {
      console.error('Developer login error:', error);
      return false;
    }
  };

  const loginWithUsernamePin = async (username: string, pin: string): Promise<boolean> => {
    try {
      // Check if it's developer login
      if (isDeveloperCredentials(username, pin)) {
        return await loginAsDeveloper();
      }

      // Search for member with matching username and PIN
      const { data: memberData, error } = await supabase
        .from('members')
        .select('*')
        .eq('login_username', username)
        .eq('login_pin', pin)
        .single();

      if (error || !memberData) {
        console.error('Username/PIN login error:', error);
        return false;
      }

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

      // Set state
      setUser(mockUser);
      setSession(mockSession);
      setProfile(userProfile);

      // Store in localStorage for persistence
      localStorage.setItem('username_pin_auth', JSON.stringify({
        user: mockUser,
        session: mockSession,
        profile: userProfile,
        timestamp: Date.now()
      }));

      return true;
    } catch (error) {
      console.error('Username/PIN login error:', error);
      return false;
    }
  };

  const loginWithEmailPassword = async (email: string, password: string): Promise<boolean> => {
    try {
      // Check if it's developer login
      if (isDeveloperCredentials(email, password)) {
        return await loginAsDeveloper();
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Email/password login error:', error);
        return false;
      }

      return !!data.session;
    } catch (error) {
      console.error('Email/password login error:', error);
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
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear all auth from localStorage
      localStorage.removeItem('username_pin_auth');
      localStorage.removeItem('developer_auth');

      // Only call Supabase logout if it's a regular user session
      if (user?.id !== DEVELOPER_ACCOUNT.id && session?.access_token !== 'username-pin-token') {
        await supabase.auth.signOut();
      }

      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    login,
    logout,
    loading,
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
