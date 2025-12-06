import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

// Developer preset credentials (embedded in app)
const DEVELOPER_CREDENTIALS = {
  username: 'elton',
  pin: '2527',
  email: 'elton.niati@developer.com',
  name: 'Elton',
  surname: 'Niati',
  phone: '0659132527',
  userId: '00000000-0000-0000-0000-000000000001'
};

interface UserProfile {
  id: string;
  name: string | null;
  surname: string | null;
  residence: string | null;
  phone: string | null;
  cell_group_id: string | null;
  is_permanent_member: boolean | null;
  permanent_member_date: string | null;
  invited_by: string | null;
  first_time_visit_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
  status_date: string | null;
  not_attending_reason: string | null;
  ministry_group_id: string | null;
  is_leader: boolean | null;
  gender: 'male' | 'female' | 'other' | null;
  login_username: string | null;
  login_pin: string | null;
  assigned_groups: string[];
  assigned_departments: string[];
  can_add_members: boolean;
  can_edit_members: boolean;
  can_view_own_data: boolean;
  permissions: string[];
  admin_role: string;
  pastor_role: boolean | null;
  deacon_role: boolean | null;
  group_leader: boolean | null;
  department_leader: boolean | null;
  baptism: string | null;
  is_hidden?: boolean;
  is_developer?: boolean;
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
  | 'create_reports'
  | 'manage_hidden_data'
  | 'view_audit_logs'
  | 'manage_permissions'
  | 'manage_developer';

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
  isSuperAdmin: () => boolean;
  isPastor: () => boolean;
  isDeacon: () => boolean;
  isGroupLeader: () => boolean;
  isDepartmentLeader: () => boolean;
  isPermanentMember: () => boolean;
  isDeveloper: () => boolean;
  isHidden: () => boolean;
  getRoles: () => string[];
  getStatus: () => string;
  logAuditAction: (action: string, tableName: string, recordId?: string, oldData?: any, newData?: any) => Promise<void>;
  updateSupabaseData: (table: string, data: any, id?: string) => Promise<any>;
  deleteSupabaseData: (table: string, id: string) => Promise<any>;
  executeSupabaseQuery: (query: string) => Promise<any>;
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

  // Helper methods for role checking
  const isSuperAdmin = (): boolean => {
    return profile ? profile.admin_role === 'super_admin' : false;
  };

  const isAdmin = (): boolean => {
    return profile ? (profile.admin_role === 'admin' || profile.admin_role === 'super_admin' || profile.pastor_role === true) : false;
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

  const isPermanentMember = (): boolean => {
    return profile ? profile.is_permanent_member === true : false;
  };

  const isDeveloper = (): boolean => {
    return profile ? profile.is_developer === true : false;
  };

  const isHidden = (): boolean => {
    return profile ? profile.is_hidden === true : false;
  };

  const getStatus = (): string => {
    return profile ? profile.status || 'newcomer' : 'newcomer';
  };

  const getRoles = (): string[] => {
    if (!profile) return [];
    
    const roles: string[] = [];
    
    if (profile.admin_role) {
      roles.push(profile.admin_role);
    }
    if (profile.pastor_role) roles.push('pastor');
    if (profile.deacon_role) roles.push('deacon');
    if (profile.group_leader) roles.push('group_leader');
    if (profile.department_leader) roles.push('department_leader');
    if (profile.is_leader) roles.push('leader');
    if (profile.is_permanent_member) roles.push('permanent_member');
    if (profile.is_developer) roles.push('developer');
    if (profile.is_hidden) roles.push('hidden');
    
    if (roles.length === 0) {
      roles.push('member');
    }
    
    return roles;
  };

  // Enhanced permission check function
  const hasPermission = (permission: Permission, departmentId?: string, groupId?: string): boolean => {
    if (!profile) return false;

    // Developer has all permissions everywhere
    if (isDeveloper()) return true;

    // Super Admin has all permissions except developer-specific
    if (isSuperAdmin() && permission !== 'manage_developer') return true;

    // Admin and Pastor have most permissions
    if (isAdmin() || isPastor()) {
      // Hide developer-specific permissions from regular admins
      if (permission === 'manage_hidden_data' || permission === 'view_audit_logs' || permission === 'manage_developer') {
        return false;
      }
      return true;
    }

    // Permanent members have basic view permissions
    if (isPermanentMember()) {
      if (permission === 'view_own_group' && groupId && profile.cell_group_id === groupId) {
        return true;
      }
      if (permission === 'view_own_department' && departmentId && profile.assigned_departments.includes(departmentId)) {
        return true;
      }
      if (permission === 'view_reports') {
        return true;
      }
    }

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
        return isGroupLeader() || isDeacon() || isPermanentMember();
      
      case 'view_own_department':
        if (departmentId) {
          return profile.assigned_departments.includes(departmentId);
        }
        return isDepartmentLeader() || isDeacon() || isPermanentMember();
      
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
        return isAdmin() || isPastor() || isDeacon() || isDepartmentLeader() || isGroupLeader() || isPermanentMember();
      
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
      
      case 'manage_hidden_data':
      case 'view_audit_logs':
      case 'manage_permissions':
      case 'manage_developer':
        // Only developers can access these
        return isDeveloper();
      
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

  // Audit logging function
  const logAuditAction = async (
    action: string, 
    tableName: string, 
    recordId?: string, 
    oldData?: any, 
    newData?: any
  ): Promise<void> => {
    try {
      if (!profile) return;
      
      await supabase.from('audit_logs').insert([{
        action,
        table_name: tableName,
        record_id: recordId || '',
        old_data: oldData,
        new_data: newData,
        created_at: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  };

  // Developer functions for updating Supabase
  const updateSupabaseData = async (table: string, data: any, id?: string): Promise<any> => {
    if (!isDeveloper()) {
      throw new Error('Only developer can update data directly');
    }

    try {
      let result;
      
      if (id) {
        result = await supabase
          .from(table as any)
          .update(data)
          .eq('id', id)
          .select();
      } else {
        result = await supabase
          .from(table as any)
          .insert(data)
          .select();
      }

      await logAuditAction(
        id ? 'UPDATE' : 'INSERT',
        table,
        id || data.id,
        id ? null : undefined,
        data
      );

      return result;
    } catch (error) {
      console.error('Error updating Supabase data:', error);
      throw error;
    }
  };

  const deleteSupabaseData = async (table: string, id: string): Promise<any> => {
    if (!isDeveloper()) {
      throw new Error('Only developer can delete data directly');
    }

    try {
      const result = await supabase
        .from(table as any)
        .delete()
        .eq('id', id);

      await logAuditAction('DELETE', table, id);

      return result;
    } catch (error) {
      console.error('Error deleting Supabase data:', error);
      throw error;
    }
  };

  const executeSupabaseQuery = async (query: string): Promise<any> => {
    if (!isDeveloper()) {
      throw new Error('Only developer can execute direct queries');
    }

    try {
      // Note: For security, we're using the REST API instead of raw SQL
      // In production, you should use Supabase functions or RPC calls
      console.warn('Direct SQL queries are not recommended. Use Supabase RPC instead.');
      
      // This is a placeholder - return a message instead of executing raw SQL
      const result = { 
        message: 'Direct SQL execution is disabled for security. Use the Data tab to browse tables.',
        query 
      };
      
      await logAuditAction('EXECUTE_QUERY', 'system', undefined, undefined, { query });
      
      return result;
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  };

  // Check for existing session and set up auth listener
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // First check for stored auth
        const storedAuth = localStorage.getItem('church_auth');
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
            localStorage.removeItem('church_auth');
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
          localStorage.removeItem('church_auth');
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
      // Check if this is the developer user
      const isDeveloperUser = userId === DEVELOPER_CREDENTIALS.userId;
      
      if (isDeveloperUser) {
        // Use embedded developer profile
        const developerProfile: UserProfile = {
          id: DEVELOPER_CREDENTIALS.userId,
          name: DEVELOPER_CREDENTIALS.name,
          surname: DEVELOPER_CREDENTIALS.surname,
          residence: 'Tanzania',
          phone: DEVELOPER_CREDENTIALS.phone,
          cell_group_id: null,
          is_permanent_member: true,
          permanent_member_date: new Date().toISOString(),
          invited_by: null,
          first_time_visit_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'signed_member',
          status_date: new Date().toISOString(),
          not_attending_reason: null,
          ministry_group_id: null,
          is_leader: true,
          gender: 'male',
          login_username: DEVELOPER_CREDENTIALS.username,
          login_pin: DEVELOPER_CREDENTIALS.pin,
          assigned_groups: [],
          assigned_departments: [],
          can_add_members: true,
          can_edit_members: true,
          can_view_own_data: true,
          permissions: [
            'view_all_groups', 'view_all_departments', 'manage_all_groups', 
            'manage_all_departments', 'edit_users', 'view_reports', 'manage_system', 
            'create_meetings', 'manage_attendance', 'add_newcomers', 'create_reports',
            'manage_hidden_data', 'view_audit_logs', 'manage_permissions', 'manage_developer'
          ],
          admin_role: 'super_admin',
          pastor_role: true,
          deacon_role: true,
          group_leader: true,
          department_leader: true,
          baptism: null,
          is_hidden: true,
          is_developer: true
        };
        
        setProfile(developerProfile);
        return;
      }

      // For regular users, fetch from database
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', userId)
        .neq('is_hidden', true) // Don't fetch hidden users
        .maybeSingle();

      if (memberError || !memberData) {
        console.error('Error fetching user profile:', memberError);
        setProfile(null);
        return;
      }

      const userProfile: UserProfile = {
        id: userId,
        name: memberData.name || null,
        surname: memberData.surname || null,
        residence: memberData.residence || null,
        phone: memberData.phone || null,
        cell_group_id: memberData.cell_group_id || null,
        is_permanent_member: memberData.is_permanent_member || false,
        permanent_member_date: memberData.permanent_member_date || null,
        invited_by: memberData.invited_by || null,
        first_time_visit_date: memberData.first_time_visit_date || null,
        created_at: memberData.created_at || null,
        updated_at: memberData.updated_at || null,
        status: memberData.status || 'newcomer',
        status_date: memberData.status_date || null,
        not_attending_reason: memberData.not_attending_reason || null,
        ministry_group_id: memberData.ministry_group_id || null,
        is_leader: memberData.is_leader || false,
        gender: memberData.gender || null,
        login_username: memberData.login_username || null,
        login_pin: memberData.login_pin || null,
        assigned_groups: Array.isArray(memberData.assigned_groups) ? memberData.assigned_groups : [],
        assigned_departments: Array.isArray(memberData.assigned_departments) ? memberData.assigned_departments : [],
        can_add_members: Boolean(memberData.can_add_members),
        can_edit_members: Boolean(memberData.can_edit_members),
        can_view_own_data: Boolean(memberData.can_view_own_data),
        permissions: Array.isArray(memberData.permissions) ? memberData.permissions : [],
        admin_role: memberData.admin_role || 'member',
        pastor_role: memberData.pastor_role || false,
        deacon_role: memberData.deacon_role || false,
        group_leader: memberData.group_leader || false,
        department_leader: memberData.department_leader || false,
        baptism: memberData.baptism || null,
        is_hidden: memberData.is_hidden || false,
        is_developer: memberData.is_developer || false
      };

      setProfile(userProfile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setProfile(null);
    }
  };

  const handleDeveloperLogin = (): boolean => {
    try {
      const mockUser: SupabaseUser = {
        id: DEVELOPER_CREDENTIALS.userId,
        email: DEVELOPER_CREDENTIALS.email,
        phone: DEVELOPER_CREDENTIALS.phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        app_metadata: {
          provider: 'developer',
          roles: ['super_admin', 'developer'],
          is_developer: true,
          is_hidden: true
        },
        user_metadata: {
          name: DEVELOPER_CREDENTIALS.name,
          surname: DEVELOPER_CREDENTIALS.surname,
          residence: 'Tanzania',
          is_developer: true,
          is_hidden: true
        },
        aud: 'authenticated',
        role: 'authenticated'
      } as any;

      const mockSession: Session = {
        access_token: 'developer-embedded-token',
        token_type: 'bearer',
        expires_in: 86400, // 24 hours
        expires_at: Math.floor(Date.now() / 1000) + 86400,
        refresh_token: 'developer-embedded-refresh',
        user: mockUser,
        provider_token: null,
        provider_refresh_token: null
      } as any;

      const developerProfile: UserProfile = {
        id: DEVELOPER_CREDENTIALS.userId,
        name: DEVELOPER_CREDENTIALS.name,
        surname: DEVELOPER_CREDENTIALS.surname,
        residence: 'Tanzania',
        phone: DEVELOPER_CREDENTIALS.phone,
        cell_group_id: null,
        is_permanent_member: true,
        permanent_member_date: new Date().toISOString(),
        invited_by: null,
        first_time_visit_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'signed_member',
        status_date: new Date().toISOString(),
        not_attending_reason: null,
        ministry_group_id: null,
        is_leader: true,
        gender: 'male',
        login_username: DEVELOPER_CREDENTIALS.username,
        login_pin: DEVELOPER_CREDENTIALS.pin,
        assigned_groups: [],
        assigned_departments: [],
        can_add_members: true,
        can_edit_members: true,
        can_view_own_data: true,
        permissions: [
          'view_all_groups', 'view_all_departments', 'manage_all_groups', 
          'manage_all_departments', 'edit_users', 'view_reports', 'manage_system', 
          'create_meetings', 'manage_attendance', 'add_newcomers', 'create_reports',
          'manage_hidden_data', 'view_audit_logs', 'manage_permissions', 'manage_developer'
        ],
        admin_role: 'super_admin',
        pastor_role: true,
        deacon_role: true,
        group_leader: true,
        department_leader: true,
        baptism: null,
        is_hidden: true,
        is_developer: true
      };

      setUser(mockUser);
      setSession(mockSession);
      setProfile(developerProfile);

      localStorage.setItem('church_auth', JSON.stringify({
        user: mockUser,
        session: mockSession,
        profile: developerProfile,
        timestamp: Date.now(),
        is_developer: true
      }));

      logAuditAction('LOGIN', 'auth', developerProfile.id, null, {
        method: 'developer_embedded',
        username: DEVELOPER_CREDENTIALS.username,
        is_developer: true
      });

      return true;
    } catch (error) {
      console.error('Developer login error:', error);
      return false;
    }
  };

  const loginWithUsernamePin = async (username: string, pin: string): Promise<boolean> => {
    try {
      // Check for developer login first
      if (username === DEVELOPER_CREDENTIALS.username && pin === DEVELOPER_CREDENTIALS.pin) {
        return handleDeveloperLogin();
      }

      // Regular username/PIN login
      const { data: memberData, error } = await supabase
        .from('members')
        .select('*')
        .eq('login_username', username.trim())
        .eq('login_pin', pin.trim())
        .neq('is_hidden', true) // Exclude hidden users
        .single();

      if (error || !memberData) {
        console.error('Username/PIN login error:', error);
        return false;
      }

      const mockUser: SupabaseUser = {
        id: memberData.id,
        email: null,
        phone: memberData.phone || null,
        created_at: memberData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        app_metadata: {
          provider: 'username-pin',
          roles: [memberData.admin_role || 'member']
        },
        user_metadata: {
          name: memberData.name,
          surname: memberData.surname,
          residence: memberData.residence
        },
        aud: 'authenticated',
        role: 'authenticated'
      } as any;

      const mockSession: Session = {
        access_token: 'username-pin-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'username-pin-refresh',
        user: mockUser,
        provider_token: null,
        provider_refresh_token: null
      } as any;

      const userProfile: UserProfile = {
        id: memberData.id,
        name: memberData.name || null,
        surname: memberData.surname || null,
        residence: memberData.residence || null,
        phone: memberData.phone || null,
        cell_group_id: memberData.cell_group_id || null,
        is_permanent_member: memberData.is_permanent_member || false,
        permanent_member_date: memberData.permanent_member_date || null,
        invited_by: memberData.invited_by || null,
        first_time_visit_date: memberData.first_time_visit_date || null,
        created_at: memberData.created_at || null,
        updated_at: memberData.updated_at || null,
        status: memberData.status || 'newcomer',
        status_date: memberData.status_date || null,
        not_attending_reason: memberData.not_attending_reason || null,
        ministry_group_id: memberData.ministry_group_id || null,
        is_leader: memberData.is_leader || false,
        gender: memberData.gender || null,
        login_username: memberData.login_username || null,
        login_pin: memberData.login_pin || null,
        assigned_groups: Array.isArray(memberData.assigned_groups) ? memberData.assigned_groups : [],
        assigned_departments: Array.isArray(memberData.assigned_departments) ? memberData.assigned_departments : [],
        can_add_members: Boolean(memberData.can_add_members),
        can_edit_members: Boolean(memberData.can_edit_members),
        can_view_own_data: Boolean(memberData.can_view_own_data),
        permissions: Array.isArray(memberData.permissions) ? memberData.permissions : [],
        admin_role: memberData.admin_role || 'member',
        pastor_role: memberData.pastor_role || false,
        deacon_role: memberData.deacon_role || false,
        group_leader: memberData.group_leader || false,
        department_leader: memberData.department_leader || false,
        baptism: memberData.baptism || null,
        is_hidden: memberData.is_hidden || false,
        is_developer: memberData.is_developer || false
      };

      setUser(mockUser);
      setSession(mockSession);
      setProfile(userProfile);

      localStorage.setItem('church_auth', JSON.stringify({
        user: mockUser,
        session: mockSession,
        profile: userProfile,
        timestamp: Date.now()
      }));

      await logAuditAction('LOGIN', 'auth', userProfile.id, null, {
        method: 'username_pin',
        username: username
      });

      return true;
    } catch (error) {
      console.error('Username/PIN login error:', error);
      return false;
    }
  };

  const loginWithEmailPassword = async (email: string, password: string): Promise<boolean> => {
    try {
      // Check for developer email (though developer should use username/PIN)
      if (email === DEVELOPER_CREDENTIALS.email) {
        // Developer should use username/PIN, but we'll handle it
        console.log('Developer should use username/PIN login');
        return false;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Email/password login error:', error);
        return false;
      }

      if (data.session) {
        await logAuditAction('LOGIN', 'auth', data.user.id, null, {
          method: 'email_password',
          email: email
        });
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
        return await loginWithEmailPassword(identifier, credential);
      } else {
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
      if (profile) {
        await logAuditAction('LOGOUT', 'auth', profile.id);
      }

      localStorage.removeItem('church_auth');

      // Only sign out from Supabase if it's a real session
      if (session?.access_token !== 'username-pin-token' && 
          session?.access_token !== 'developer-embedded-token') {
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
    isSuperAdmin,
    isPastor,
    isDeacon,
    isGroupLeader,
    isDepartmentLeader,
    isPermanentMember,
    isDeveloper,
    isHidden,
    getRoles,
    getStatus,
    logAuditAction,
    updateSupabaseData,
    deleteSupabaseData,
    executeSupabaseQuery
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
