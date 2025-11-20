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
  department_id: string | null;
  role: 'pastor' | 'administrator' | 'deacon' | 'department_leader' | 'group_leader' | 'member';
  isAdmin: boolean;
  isPastor: boolean;
  isDeacon: boolean;
  isDepartmentLeader: boolean;
  isGroupLeader: boolean;
  login_username: string | null;
  login_pin: string | null;
  permissions: string[];
  assigned_groups: string[];
  assigned_departments: string[];
}

// Permission types
export type Permission = 
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
  // New department-specific methods
  canCreateDepartmentMeetings: (departmentId: string) => boolean;
  canManageDepartmentAttendance: (departmentId: string) => boolean;
  canAddDepartmentNewcomers: (departmentId: string) => boolean;
  canCreateDepartmentReports: (departmentId: string) => boolean;
  // Group-specific methods
  canCreateGroupMeetings: (groupId: string) => boolean;
  canManageGroupAttendance: (groupId: string) => boolean;
  canAddGroupNewcomers: (groupId: string) => boolean;
  canCreateGroupReports: (groupId: string) => boolean;
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

  // Enhanced permission check function with role-based access
  const hasPermission = (permission: Permission, departmentId?: string, groupId?: string): boolean => {
    if (!profile) return false;
    
    // Admin and Pastor have all permissions everywhere
    if (profile.role === 'pastor' || profile.role === 'administrator') return true;
    
    // Check specific permissions based on role and assignments
    switch (permission) {
      case 'view_all_groups':
      case 'view_all_departments':
      case 'manage_all_groups':
      case 'manage_all_departments':
      case 'edit_users':
      case 'manage_system':
        return profile.role === 'pastor' || profile.role === 'administrator';
        
      case 'view_own_group':
        // Users can view groups they are assigned to or their cell group
        if (groupId) {
          return profile.assigned_groups.includes(groupId) || 
                 profile.cell_group_id === groupId;
        }
        return profile.role === 'pastor' || profile.role === 'administrator' || 
               profile.role === 'deacon' || profile.role === 'department_leader' || 
               profile.role === 'group_leader' || profile.role === 'member';
        
      case 'view_own_department':
        // Users can view departments they are assigned to
        if (departmentId) {
          return profile.assigned_departments.includes(departmentId);
        }
        return profile.role === 'pastor' || profile.role === 'administrator' || 
               profile.role === 'deacon' || profile.role === 'department_leader' || 
               profile.role === 'group_leader' || profile.role === 'member';
        
      case 'manage_own_group':
        // Group leaders can only manage their assigned groups
        if (groupId) {
          return profile.assigned_groups.includes(groupId) || 
                 profile.cell_group_id === groupId;
        }
        return profile.role === 'pastor' || profile.role === 'administrator' || 
               profile.role === 'group_leader';
        
      case 'manage_own_department':
        // Department leaders can only manage their assigned departments
        if (departmentId) {
          return profile.assigned_departments.includes(departmentId);
        }
        return profile.role === 'pastor' || profile.role === 'administrator' || 
               profile.role === 'department_leader';
        
      case 'view_reports':
        return profile.role === 'pastor' || profile.role === 'administrator' || 
               profile.role === 'deacon' || profile.role === 'department_leader' || 
               profile.role === 'group_leader';
        
      case 'create_meetings':
      case 'manage_attendance':
      case 'add_newcomers':
      case 'create_reports':
        // Department leaders can only do these in their assigned departments
        if (departmentId && profile.role === 'department_leader') {
          return profile.assigned_departments.includes(departmentId);
        }
        // Group leaders can only do these in their assigned groups
        if (groupId && profile.role === 'group_leader') {
          return profile.assigned_groups.includes(groupId) || 
                 profile.cell_group_id === groupId;
        }
        return profile.role === 'pastor' || profile.role === 'administrator' || 
               profile.role === 'department_leader' || profile.role === 'group_leader';
        
      default:
        return false;
    }
  };

  // Check if user can view a specific group
  const canViewGroup = (groupId: string): boolean => {
    if (!profile) return false;
    
    if (hasPermission('view_all_groups')) return true;
    
    // Members can only view their assigned groups
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
    
    // Deacon can view all departments
    if (profile.role === 'deacon') return true;
    
    // Department leaders and members can only view their assigned departments
    if (hasPermission('view_own_department')) {
      const isAssigned = profile.assigned_departments.includes(departmentId);
      const isUserDepartment = profile.department_id === departmentId;
      return isAssigned || isUserDepartment;
    }
    
    return false;
  };

  // Check if user can manage a specific group
  const canManageGroup = (groupId: string): boolean => {
    if (!profile) return false;
    
    if (hasPermission('manage_all_groups')) return true;
    
    // Group leaders can only manage their assigned groups
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
    
    // Department leaders can only manage their assigned departments
    if (hasPermission('manage_own_department')) {
      const isAssigned = profile.assigned_departments.includes(departmentId);
      const isUserDepartment = profile.department_id === departmentId;
      return isAssigned || isUserDepartment;
    }
    
    return false;
  };

  // Enhanced department-specific permission checks
  const canCreateDepartmentMeetings = (departmentId: string): boolean => {
    if (!profile) return false;
    
    // Admin and Pastor can create meetings for any department
    if (profile.role === 'pastor' || profile.role === 'administrator') return true;
    
    // Department leaders can create meetings only for their assigned departments
    if (profile.role === 'department_leader') {
      return profile.assigned_departments.includes(departmentId);
    }
    
    return false;
  };

  const canManageDepartmentAttendance = (departmentId: string): boolean => {
    if (!profile) return false;
    
    if (profile.role === 'pastor' || profile.role === 'administrator') return true;
    
    if (profile.role === 'department_leader') {
      return profile.assigned_departments.includes(departmentId);
    }
    
    return false;
  };

  const canAddDepartmentNewcomers = (departmentId: string): boolean => {
    if (!profile) return false;
    
    if (profile.role === 'pastor' || profile.role === 'administrator') return true;
    
    if (profile.role === 'department_leader') {
      return profile.assigned_departments.includes(departmentId);
    }
    
    return false;
  };

  const canCreateDepartmentReports = (departmentId: string): boolean => {
    if (!profile) return false;
    
    if (profile.role === 'pastor' || profile.role === 'administrator') return true;
    
    if (profile.role === 'department_leader') {
      return profile.assigned_departments.includes(departmentId);
    }
    
    // Deacon can view reports but not create them
    return false;
  };

  // Group-specific permission checks
  const canCreateGroupMeetings = (groupId: string): boolean => {
    if (!profile) return false;
    
    if (profile.role === 'pastor' || profile.role === 'administrator') return true;
    
    if (profile.role === 'group_leader') {
      return profile.assigned_groups.includes(groupId) || profile.cell_group_id === groupId;
    }
    
    return false;
  };

  const canManageGroupAttendance = (groupId: string): boolean => {
    if (!profile) return false;
    
    if (profile.role === 'pastor' || profile.role === 'administrator') return true;
    
    if (profile.role === 'group_leader') {
      return profile.assigned_groups.includes(groupId) || profile.cell_group_id === groupId;
    }
    
    return false;
  };

  const canAddGroupNewcomers = (groupId: string): boolean => {
    if (!profile) return false;
    
    if (profile.role === 'pastor' || profile.role === 'administrator') return true;
    
    if (profile.role === 'group_leader') {
      return profile.assigned_groups.includes(groupId) || profile.cell_group_id === groupId;
    }
    
    return false;
  };

  const canCreateGroupReports = (groupId: string): boolean => {
    if (!profile) return false;
    
    if (profile.role === 'pastor' || profile.role === 'administrator') return true;
    
    if (profile.role === 'group_leader') {
      return profile.assigned_groups.includes(groupId) || profile.cell_group_id === groupId;
    }
    
    return false;
  };

  // Get user's accessible groups
  const getUserGroups = (): string[] => {
    if (!profile) return [];
    
    if (hasPermission('view_all_groups')) {
      return ['all_groups'];
    }
    
    const groups = [...profile.assigned_groups];
    
    // Add cell group if not already included
    if (profile.cell_group_id && !groups.includes(profile.cell_group_id)) {
      groups.push(profile.cell_group_id);
    }
    
    return groups;
  };

  // Get user's accessible departments
  const getUserDepartments = (): string[] => {
    if (!profile) return [];
    
    if (hasPermission('view_all_departments')) {
      return ['all_departments'];
    }
    
    // Deacon can view all departments
    if (profile.role === 'deacon') {
      return ['all_departments'];
    }
    
    const departments = [...profile.assigned_departments];
    
    // Add user's primary department if not already included
    if (profile.department_id && !departments.includes(profile.department_id)) {
      departments.push(profile.department_id);
    }
    
    return departments;
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
          
          // If less than 24 hours old, restore the auth
          if (hoursElapsed < 24 && mounted) {
            setUser(authData.user);
            setSession(authData.session);
            setProfile(authData.profile);
            console.log('🔄 Restored auth from localStorage');
            setLoading(false);
            return;
          } else {
            // Clear expired auth
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
      async (event, supabaseSession) => {
        if (!mounted) return;

        console.log('Auth state changed:', event);
        setSession(supabaseSession);
        setUser(supabaseSession?.user ?? null);
        
        if (supabaseSession?.user) {
          await fetchUserProfile(supabaseSession.user.id);
        } else {
          setProfile(null);
          // Clear stored auth on sign out
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
      console.log('🔍 Fetching user profile for:', userId);
      
      // Fetch from members table
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', userId)
        .single();

      if (memberError) {
        console.error('❌ Error fetching from members table:', memberError);
        throw memberError;
      }

      if (memberData) {
        console.log('📊 Raw member data from database:', memberData);

        // Enhanced role mapping with new roles
        let primaryRole: 'pastor' | 'administrator' | 'deacon' | 'department_leader' | 'group_leader' | 'member' = 'member';
        
        switch (memberData.role?.toLowerCase()) {
          case 'pastor':
            primaryRole = 'pastor';
            break;
          case 'administrator':
          case 'admin':
            primaryRole = 'administrator';
            break;
          case 'deacon':
            primaryRole = 'deacon';
            break;
          case 'department_leader':
          case 'leader':
            primaryRole = 'department_leader';
            break;
          case 'group_leader':
          case 'cell_leader':
            primaryRole = 'group_leader';
            break;
          default:
            primaryRole = 'member';
        }

        console.log('🎯 Mapped role:', primaryRole);
        
        const userProfile: UserProfile = {
          id: userId,
          name: memberData.name || null,
          surname: memberData.surname || null,
          email: memberData.email || null,
          phone: memberData.phone || null,
          cell_group_id: memberData.cell_group_id || null,
          department_id: memberData.department_id || null,
          role: primaryRole,
          isAdmin: primaryRole === 'administrator',
          isPastor: primaryRole === 'pastor',
          isDeacon: primaryRole === 'deacon',
          isDepartmentLeader: primaryRole === 'department_leader',
          isGroupLeader: primaryRole === 'group_leader',
          login_username: memberData.login_username || null,
          login_pin: memberData.login_pin || null,
          permissions: Array.isArray(memberData.permissions) ? memberData.permissions : [],
          assigned_groups: Array.isArray(memberData.assigned_groups) ? memberData.assigned_groups : [],
          assigned_departments: Array.isArray(memberData.assigned_departments) ? memberData.assigned_departments : []
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

      // Enhanced role mapping for login
      let primaryRole: 'pastor' | 'administrator' | 'deacon' | 'department_leader' | 'group_leader' | 'member' = 'member';
      
      switch (memberData.role?.toLowerCase()) {
        case 'pastor':
          primaryRole = 'pastor';
          break;
        case 'administrator':
        case 'admin':
          primaryRole = 'administrator';
          break;
        case 'deacon':
          primaryRole = 'deacon';
          break;
        case 'department_leader':
        case 'leader':
          primaryRole = 'department_leader';
          break;
        case 'group_leader':
        case 'cell_leader':
          primaryRole = 'group_leader';
          break;
        default:
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
        department_id: memberData.department_id || null,
        role: primaryRole,
        isAdmin: primaryRole === 'administrator',
        isPastor: primaryRole === 'pastor',
        isDeacon: primaryRole === 'deacon',
        isDepartmentLeader: primaryRole === 'department_leader',
        isGroupLeader: primaryRole === 'group_leader',
        login_username: memberData.login_username || null,
        login_pin: memberData.login_pin || null,
        permissions: Array.isArray(memberData.permissions) ? memberData.permissions : [],
        assigned_groups: Array.isArray(memberData.assigned_groups) ? memberData.assigned_groups : [],
        assigned_departments: Array.isArray(memberData.assigned_departments) ? memberData.assigned_departments : []
      };

      console.log('✅ Final profile for login:', userProfile);
      
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
    canCreateGroupReports
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
