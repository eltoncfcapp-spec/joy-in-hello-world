import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  name: string | null;
  surname: string | null;
  phone: string | null;
  residence: string | null;
  cell_group_id: string | null;
  admin_role: string;
  pastor_role: boolean | null;
  deacon_role: boolean | null;
  group_leader: boolean | null;
  department_leader: boolean | null;
  login_username: string | null;
  login_pin: string | null;
  permissions: string[];
  assigned_groups: string[];  // Array of group IDs like ["17804c57-e14e-47b4-a7f9-a5fbda5c78fe"]
  assigned_departments: string[]; // Array of department IDs
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
  isMember: () => boolean;
  getRoles: () => string[];
  isUserAssignedToGroup: (groupId: string) => boolean;
  isUserAssignedToDepartment: (departmentId: string) => boolean;
  hasGroupAccess: () => boolean;
  hasDepartmentAccess: () => boolean;
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

  // Helper to check if user is assigned to a group
  const isUserAssignedToGroup = (groupId: string): boolean => {
    if (!profile || !profile.assigned_groups || !Array.isArray(profile.assigned_groups)) return false;
    return profile.assigned_groups.includes(groupId);
  };

  // Helper to check if user is assigned to a department
  const isUserAssignedToDepartment = (departmentId: string): boolean => {
    if (!profile || !profile.assigned_departments || !Array.isArray(profile.assigned_departments)) return false;
    return profile.assigned_departments.includes(departmentId);
  };

  // Helper methods for role checking
  const isAdmin = (): boolean => {
    return profile ? (profile.admin_role === 'admin' || profile.admin_role === 'administrator') : false;
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

  const isMember = (): boolean => {
    if (!profile) return false;
    // Check if user is a regular member (no special roles)
    return !isAdmin() && !isPastor() && !isDeacon() && !isGroupLeader() && !isDepartmentLeader();
  };

  const getRoles = (): string[] => {
    if (!profile) return [];
    
    const roles: string[] = [];
    if (isAdmin()) roles.push('admin');
    if (isPastor()) roles.push('pastor');
    if (isDeacon()) roles.push('deacon');
    if (isGroupLeader()) roles.push('group_leader');
    if (isDepartmentLeader()) roles.push('department_leader');
    if (isMember()) roles.push('member');
    
    return roles;
  };

  // Check if user has any group access at all
  const hasGroupAccess = (): boolean => {
    if (!profile) return false;
    
    // Admins & Pastors always have group access
    if (isAdmin() || isPastor()) return true;
    
    // Deacons always have group access
    if (isDeacon()) return true;
    
    // Group Leaders have group access if they have a cell group or assigned groups
    if (isGroupLeader()) {
      return !!profile.cell_group_id || 
             (profile.assigned_groups && profile.assigned_groups.length > 0);
    }
    
    // Department Leaders ONLY have group access if explicitly assigned to groups
    if (isDepartmentLeader()) {
      return profile.assigned_groups && profile.assigned_groups.length > 0;
    }
    
    // Regular members have group access if they have a cell group
    if (isMember()) {
      return !!profile.cell_group_id;
    }
    
    return false;
  };

  // Check if user has any department access at all
  const hasDepartmentAccess = (): boolean => {
    if (!profile) return false;
    
    // Admins, Pastors & Deacons always have department access
    if (isAdmin() || isPastor() || isDeacon()) return true;
    
    // Department Leaders have department access if they have assigned departments
    if (isDepartmentLeader()) {
      return profile.assigned_departments && profile.assigned_departments.length > 0;
    }
    
    // Group Leaders have department access if they have assigned departments
    if (isGroupLeader()) {
      return profile.assigned_departments && profile.assigned_departments.length > 0;
    }
    
    // Regular members have department access if they have assigned departments
    if (isMember()) {
      return profile.assigned_departments && profile.assigned_departments.length > 0;
    }
    
    return false;
  };

  // Enhanced permission check function with array-based assignments
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
          const isAssigned = isUserAssignedToGroup(groupId);
          const isCellGroup = profile.cell_group_id === groupId;
          return isAssigned || isCellGroup || isGroupLeader() || isDeacon();
        }
        return isGroupLeader() || isDeacon();
      
      case 'view_own_department':
        if (departmentId) {
          return isUserAssignedToDepartment(departmentId) || isDeacon();
        }
        return isDepartmentLeader() || isDeacon();
      
      case 'manage_own_group':
        if (groupId) {
          const isAssigned = isUserAssignedToGroup(groupId);
          const isCellGroup = profile.cell_group_id === groupId;
          return (isGroupLeader() && (isAssigned || isCellGroup)) || 
                 (isDeacon() && isAssigned);
        }
        return isGroupLeader();
      
      case 'manage_own_department':
        if (departmentId) {
          return isDepartmentLeader() && isUserAssignedToDepartment(departmentId);
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
          return isUserAssignedToDepartment(departmentId);
        }
        // Group leaders can only do these in their assigned groups
        if (groupId && isGroupLeader()) {
          const isAssigned = isUserAssignedToGroup(groupId);
          const isCellGroup = profile.cell_group_id === groupId;
          return isAssigned || isCellGroup;
        }
        // Deacons can do these in their assigned groups
        if (groupId && isDeacon()) {
          return isUserAssignedToGroup(groupId);
        }
        return isAdmin() || isPastor() || isDepartmentLeader() || isGroupLeader();
      
      default:
        return false;
    }
  };

  // Check if user can view a specific group
  const canViewGroup = (groupId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    
    const isAssigned = isUserAssignedToGroup(groupId);
    const isCellGroup = profile.cell_group_id === groupId;
    
    // Everyone can view their own cell group
    if (isCellGroup) return true;
    
    // Deacons can view all groups
    if (isDeacon()) return true;
    
    // Group leaders can view groups they're assigned to
    if (isGroupLeader() && isAssigned) return true;
    
    // Department leaders can ONLY view groups they're explicitly assigned to
    if (isDepartmentLeader()) {
      return isAssigned;
    }
    
    // Regular members can view their own group
    if (isMember() && isCellGroup) return true;
    
    return false;
  };

  // Check if user can view a specific department
  const canViewDepartment = (departmentId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor() || isDeacon()) return true;
    
    return isUserAssignedToDepartment(departmentId) || isDepartmentLeader();
  };

  // Check if user can manage a specific group
  const canManageGroup = (groupId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    
    const isAssigned = isUserAssignedToGroup(groupId);
    const isCellGroup = profile.cell_group_id === groupId;
    
    // Group leaders can manage groups they're assigned to or their cell group
    if (isGroupLeader() && (isAssigned || isCellGroup)) {
      return true;
    }
    
    // Deacons can manage groups they're assigned to
    if (isDeacon() && isAssigned) {
      return true;
    }
    
    // Department leaders CANNOT manage groups unless explicitly given permission
    // (They should focus on departments only)
    return false;
  };

  // Check if user can manage a specific department
  const canManageDepartment = (departmentId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    
    return isDepartmentLeader() && isUserAssignedToDepartment(departmentId);
  };

  // Enhanced department-specific permission checks
  const canCreateDepartmentMeetings = (departmentId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    return isDepartmentLeader() && isUserAssignedToDepartment(departmentId);
  };

  const canManageDepartmentAttendance = (departmentId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    return isDepartmentLeader() && isUserAssignedToDepartment(departmentId);
  };

  const canAddDepartmentNewcomers = (departmentId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    return isDepartmentLeader() && isUserAssignedToDepartment(departmentId);
  };

  const canCreateDepartmentReports = (departmentId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    return isDepartmentLeader() && isUserAssignedToDepartment(departmentId);
  };

  // Group-specific permission checks - IMPORTANT: Department leaders should NOT have these permissions
  const canCreateGroupMeetings = (groupId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    
    // Department leaders CANNOT create group meetings
    if (isDepartmentLeader()) return false;
    
    const isAssigned = isUserAssignedToGroup(groupId);
    const isCellGroup = profile.cell_group_id === groupId;
    
    if (isGroupLeader() && (isAssigned || isCellGroup)) {
      return true;
    }
    
    if (isDeacon() && isAssigned) {
      return true;
    }
    
    return false;
  };

  const canManageGroupAttendance = (groupId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    
    // Department leaders CANNOT manage group attendance
    if (isDepartmentLeader()) return false;
    
    const isAssigned = isUserAssignedToGroup(groupId);
    const isCellGroup = profile.cell_group_id === groupId;
    
    if (isGroupLeader() && (isAssigned || isCellGroup)) {
      return true;
    }
    
    if (isDeacon() && isAssigned) {
      return true;
    }
    
    return false;
  };

  const canAddGroupNewcomers = (groupId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    
    // Department leaders CANNOT add group newcomers
    if (isDepartmentLeader()) return false;
    
    const isAssigned = isUserAssignedToGroup(groupId);
    const isCellGroup = profile.cell_group_id === groupId;
    
    if (isGroupLeader() && (isAssigned || isCellGroup)) {
      return true;
    }
    
    if (isDeacon() && isAssigned) {
      return true;
    }
    
    return false;
  };

  const canCreateGroupReports = (groupId: string): boolean => {
    if (!profile) return false;
    if (isAdmin() || isPastor()) return true;
    
    // Department leaders CANNOT create group reports
    if (isDepartmentLeader()) return false;
    
    const isAssigned = isUserAssignedToGroup(groupId);
    const isCellGroup = profile.cell_group_id === groupId;
    
    if (isGroupLeader() && (isAssigned || isCellGroup)) {
      return true;
    }
    
    if (isDeacon() && isAssigned) {
      return true;
    }
    
    return false;
  };

  // Get user's accessible groups
  const getUserGroups = (): string[] => {
    if (!profile) return [];
    if (isAdmin() || isPastor()) return ['all_groups'];
    
    const groups: string[] = [];
    
    // Add assigned groups
    if (profile.assigned_groups && Array.isArray(profile.assigned_groups)) {
      groups.push(...profile.assigned_groups);
    }
    
    // Add cell group if not already in the list
    if (profile.cell_group_id && !groups.includes(profile.cell_group_id)) {
      groups.push(profile.cell_group_id);
    }
    
    return groups;
  };

  // Get user's accessible departments
  const getUserDepartments = (): string[] => {
    if (!profile) return [];
    if (isAdmin() || isPastor()) return ['all_departments'];
    if (isDeacon()) return ['all_departments'];
    
    return profile.assigned_departments || [];
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
      // Fetch from members table
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
        // Ensure arrays are properly initialized
        const assigned_groups = Array.isArray(memberData.assigned_groups) 
          ? memberData.assigned_groups.filter((id: any) => id && typeof id === 'string')
          : [];
        
        const assigned_departments = Array.isArray(memberData.assigned_departments)
          ? memberData.assigned_departments.filter((id: any) => id && typeof id === 'string')
          : [];
        
        const permissions = Array.isArray(memberData.permissions)
          ? memberData.permissions
          : [];

        const userProfile: UserProfile = {
          id: userId,
          name: memberData.name || null,
          surname: memberData.surname || null,
          phone: memberData.phone || null,
          residence: memberData.residence || null,
          cell_group_id: memberData.cell_group_id || null,
          admin_role: memberData.admin_role || 'member',
          pastor_role: memberData.pastor_role || false,
          deacon_role: memberData.deacon_role || false,
          group_leader: memberData.group_leader || false,
          department_leader: memberData.department_leader || false,
          login_username: memberData.login_username || null,
          login_pin: memberData.login_pin || null,
          permissions: permissions,
          assigned_groups: assigned_groups,
          assigned_departments: assigned_departments,
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

  const loginWithUsernamePin = async (username: string, pin: string): Promise<boolean> => {
    try {
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
        email: undefined,
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

      // Ensure arrays are properly initialized
      const assigned_groups = Array.isArray(memberData.assigned_groups) 
        ? memberData.assigned_groups.filter((id: any) => id && typeof id === 'string')
        : [];
      
      const assigned_departments = Array.isArray(memberData.assigned_departments)
        ? memberData.assigned_departments.filter((id: any) => id && typeof id === 'string')
        : [];
      
      const permissions = Array.isArray(memberData.permissions)
        ? memberData.permissions
        : [];

      const userProfile: UserProfile = {
        id: memberData.id,
        name: memberData.name || null,
        surname: memberData.surname || null,
        phone: memberData.phone || null,
        residence: memberData.residence || null,
        cell_group_id: memberData.cell_group_id || null,
        admin_role: memberData.admin_role || 'member',
        pastor_role: memberData.pastor_role || false,
        deacon_role: memberData.deacon_role || false,
        group_leader: memberData.group_leader || false,
        department_leader: memberData.department_leader || false,
        login_username: memberData.login_username || null,
        login_pin: memberData.login_pin || null,
        permissions: permissions,
        assigned_groups: assigned_groups,
        assigned_departments: assigned_departments,
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
      // Clear username/PIN auth from localStorage
      localStorage.removeItem('username_pin_auth');

      // Only call Supabase logout if it's an email/password session
      if (session?.access_token !== 'username-pin-token') {
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
    isMember,
    getRoles,
    isUserAssignedToGroup,
    isUserAssignedToDepartment,
    hasGroupAccess,
    hasDepartmentAccess
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
