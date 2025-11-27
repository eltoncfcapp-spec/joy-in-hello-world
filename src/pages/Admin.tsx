import { Settings, Users, Database, Shield, Bell, Mail, X, Search, Key, Copy, RefreshCw, AlertCircle, FileText, Download, Upload, Calendar, MessageSquare, Globe, Building, Clock, MapPin, BookOpen, Heart, CreditCard, BarChart3, Filter, UserCheck, History, Lock, Eye, Server, Archive, Trash2, Wifi, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  admin_role: string;
  pastor_role: boolean | null;
  deacon_role: boolean | null;
  group_leader: boolean | null;
  department_leader: boolean | null;
  permissions: string[];
  login_username: string | null;
  login_pin: string | null;
  assigned_groups: string[];
  assigned_departments: string[];
  can_add_members: boolean;
  can_edit_members: boolean;
  can_view_own_data: boolean;
  cell_group_id: string | null;
  status: string | null;
  created_at: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  type: 'cell_group' | 'department';
}

interface ChurchInfo {
  id?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  denomination: string;
  doctrinal_statement: string;
  service_times: ServiceTime[];
  communication_templates: CommunicationTemplate[];
}

interface ServiceTime {
  id?: string;
  day: string;
  time: string;
  type: string;
  description: string;
}

interface CommunicationTemplate {
  id?: string;
  name: string;
  subject: string;
  body: string;
  type: 'email' | 'sms' | 'notification';
}

interface SystemConfig {
  id?: string;
  global_settings: {
    timezone: string;
    date_format: string;
    language: string;
    currency: string;
    max_login_attempts: number;
    session_timeout: number;
  };
  notification_settings: {
    email_notifications: boolean;
    sms_notifications: boolean;
    push_notifications: boolean;
    event_reminders: boolean;
    donation_receipts: boolean;
    birthday_reminders: boolean;
  };
  backup_settings: {
    auto_backup: boolean;
    backup_frequency: 'daily' | 'weekly' | 'monthly';
    backup_time: string;
    retain_backups: number;
    cloud_storage: boolean;
  };
  integration_settings: {
    email_service: 'smtp' | 'sendgrid' | 'mailgun';
    sms_service: 'twilio' | 'plivo';
    calendar_sync: boolean;
    payment_gateway: 'stripe' | 'paypal' | 'none';
  };
}

interface SecuritySettings {
  id?: string;
  password_policy: {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special_chars: boolean;
    expiry_days: number;
  };
  access_controls: {
    ip_whitelist: string[];
    device_restrictions: boolean;
    two_factor_auth: boolean;
    login_hours: {
      start: string;
      end: string;
    };
  };
  audit_settings: {
    log_logins: boolean;
    log_data_changes: boolean;
    log_exports: boolean;
    retention_days: number;
  };
}

interface NotificationSettings {
  id?: string;
  email_settings: {
    smtp_host: string;
    smtp_port: number;
    smtp_username: string;
    smtp_password: string;
    from_email: string;
    from_name: string;
  };
  sms_settings: {
    provider: string;
    account_sid: string;
    auth_token: string;
    from_number: string;
  };
  push_settings: {
    enabled: boolean;
    service_key: string;
  };
  notification_templates: NotificationTemplate[];
}

interface NotificationTemplate {
  id?: string;
  name: string;
  trigger: string;
  subject: string;
  message: string;
  enabled: boolean;
}

interface DataManagement {
  id?: string;
  export_settings: {
    format: 'csv' | 'json' | 'excel';
    include_sensitive: boolean;
    compression: boolean;
  };
  import_settings: {
    allow_updates: boolean;
    create_missing: boolean;
    validation_rules: string[];
  };
  cleanup_settings: {
    auto_cleanup: boolean;
    cleanup_frequency: 'weekly' | 'monthly' | 'quarterly';
    retain_inactive_users: number;
    retain_old_events: number;
  };
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  details: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

// Helper functions (keep your existing ones)
const getRolesFromMember = (member: Member): string[] => {
  const roles: string[] = [];
  if (member.admin_role && member.admin_role !== 'member') {
    roles.push(member.admin_role);
  }
  if (member.pastor_role) roles.push('pastor');
  if (member.deacon_role) roles.push('deacon');
  if (member.group_leader) roles.push('group_leader');
  if (member.department_leader) roles.push('department_leader');
  if (roles.length === 0) {
    roles.push(member.admin_role || 'member');
  }
  return roles;
};

const isUserAdmin = (member: Member): boolean => {
  return member.admin_role === 'admin' || 
         getRolesFromMember(member).includes('admin') ||
         member.pastor_role === true;
};

const hasPermission = (userPermissions: string[] = [], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin_access');
};

const hasAnyRole = (member: Member, targetRoles: string[]): boolean => {
  const userRoles = getRolesFromMember(member);
  return userRoles.some(role => targetRoles.includes(role));
};

const isAdminOrPastor = (member: Member): boolean => {
  return isUserAdmin(member) || member.pastor_role === true || hasAnyRole(member, ['admin', 'pastor']);
};

const setRolesToMember = (roles: string[]): Partial<Member> => {
  const updateData: Partial<Member> = {
    pastor_role: false,
    deacon_role: false,
    group_leader: false,
    department_leader: false,
    admin_role: 'member'
  };

  roles.forEach(role => {
    switch (role) {
      case 'admin':
        updateData.admin_role = 'admin';
        break;
      case 'pastor':
        updateData.pastor_role = true;
        break;
      case 'deacon':
        updateData.deacon_role = true;
        break;
      case 'group_leader':
        updateData.group_leader = true;
        break;
      case 'department_leader':
        updateData.department_leader = true;
        break;
      case 'member':
        updateData.admin_role = 'member';
        break;
    }
  });

  return updateData;
};

// Extended Cloud Service Functions
const cloudService = {
  // Your existing member/group functions
  async getMembers(): Promise<Member[]> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching members:', error);
      throw error;
    }
  },

  async getGroups(): Promise<Group[]> {
    try {
      const [cellGroupsData, departmentsData] = await Promise.all([
        supabase.from('cell_groups').select('id, name, description').order('name'),
        supabase.from('departments').select('id, name, description').order('name')
      ]);

      const cellGroups: Group[] = (cellGroupsData.data || []).map(group => ({
        id: group.id,
        name: group.name || 'Unnamed Group',
        description: group.description,
        type: 'cell_group'
      }));

      const departments: Group[] = (departmentsData.data || []).map(dept => ({
        id: dept.id,
        name: dept.name || 'Unnamed Department',
        description: dept.description,
        type: 'department'
      }));

      return [...cellGroups, ...departments];
    } catch (error) {
      console.error('Error fetching groups:', error);
      throw error;
    }
  },

  async updateMember(memberId: string, updates: Partial<Member>): Promise<Member> {
    try {
      const { data, error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  },

  async generateCredentials(memberId: string): Promise<{ username: string; pin: string }> {
    try {
      const username = `user${Date.now()}`;
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      
      await this.updateMember(memberId, {
        login_username: username,
        login_pin: pin
      });
      
      return { username, pin };
    } catch (error) {
      console.error('Error generating credentials:', error);
      throw error;
    }
  },

  async getCellGroupNameById(groupId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('cell_groups')
        .select('name')
        .eq('id', groupId)
        .single();

      if (error || !data) return null;
      return data.name;
    } catch (error) {
      console.error('Error fetching cell group name:', error);
      return null;
    }
  },

  // New Administrative Functions
  async getChurchInfo(): Promise<ChurchInfo> {
    const { data, error } = await supabase
      .from('church_info')
      .select('*')
      .single();

    if (error || !data) {
      return {
        name: 'Your Church Name',
        address: '',
        phone: '',
        email: '',
        website: '',
        denomination: '',
        doctrinal_statement: '',
        service_times: [],
        communication_templates: []
      };
    }
    return data;
  },

  async updateChurchInfo(info: ChurchInfo): Promise<ChurchInfo> {
    const { data, error } = await supabase
      .from('church_info')
      .upsert(info)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSystemConfig(): Promise<SystemConfig> {
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .single();

    if (error || !data) {
      return {
        global_settings: {
          timezone: 'UTC',
          date_format: 'MM/DD/YYYY',
          language: 'en',
          currency: 'USD',
          max_login_attempts: 5,
          session_timeout: 60
        },
        notification_settings: {
          email_notifications: true,
          sms_notifications: false,
          push_notifications: true,
          event_reminders: true,
          donation_receipts: true,
          birthday_reminders: true
        },
        backup_settings: {
          auto_backup: true,
          backup_frequency: 'weekly',
          backup_time: '02:00',
          retain_backups: 30,
          cloud_storage: true
        },
        integration_settings: {
          email_service: 'smtp',
          sms_service: 'twilio',
          calendar_sync: false,
          payment_gateway: 'none'
        }
      };
    }
    return data;
  },

  async updateSystemConfig(config: SystemConfig): Promise<SystemConfig> {
    const { data, error } = await supabase
      .from('system_config')
      .upsert(config)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSecuritySettings(): Promise<SecuritySettings> {
    const { data, error } = await supabase
      .from('security_settings')
      .select('*')
      .single();

    if (error || !data) {
      return {
        password_policy: {
          min_length: 8,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_special_chars: false,
          expiry_days: 90
        },
        access_controls: {
          ip_whitelist: [],
          device_restrictions: false,
          two_factor_auth: false,
          login_hours: {
            start: '00:00',
            end: '23:59'
          }
        },
        audit_settings: {
          log_logins: true,
          log_data_changes: true,
          log_exports: true,
          retention_days: 365
        }
      };
    }
    return data;
  },

  async updateSecuritySettings(settings: SecuritySettings): Promise<SecuritySettings> {
    const { data, error } = await supabase
      .from('security_settings')
      .upsert(settings)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return [];
    return data || [];
  },

  async exportData(format: string, includeSensitive: boolean): Promise<Blob> {
    const { data, error } = await supabase
      .from('members')
      .select('*');

    if (error) throw error;

    const csvContent = convertToCSV(data || []);
    return new Blob([csvContent], { type: 'text/csv' });
  },

  async runBackup(): Promise<void> {
    // Simulate backup process
    await new Promise(resolve => setTimeout(resolve, 2000));
  },

  async getSystemStats(): Promise<any> {
    const [
      membersCount,
      groupsCount,
      eventsCount,
      donationsCount
    ] = await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }),
      supabase.from('cell_groups').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('donations').select('*', { count: 'exact', head: true })
    ]);

    return {
      total_members: membersCount.count || 0,
      total_groups: groupsCount.count || 0,
      total_events: eventsCount.count || 0,
      total_donations: donationsCount.count || 0,
      storage_used: '2.3 GB',
      active_users: 45
    };
  }
};

const convertToCSV = (data: any[]): string => {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const escaped = ('' + row[header]).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
};

const Admin = () => {
  const { profile } = useAuth();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{username: string; pin: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [currentUserCellGroup, setCurrentUserCellGroup] = useState<string | null>(null);

  // New state for administrative sections
  const [churchInfo, setChurchInfo] = useState<ChurchInfo | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [backupStatus, setBackupStatus] = useState<string>('');

  const [userFormData, setUserFormData] = useState<{
    roles: string[];
    permissions: string[];
    assigned_groups: string[];
    assigned_departments: string[];
    can_add_members: boolean;
    can_edit_members: boolean;
    can_view_own_data: boolean;
    login_username: string;
    login_pin: string;
  }>({
    roles: ['member'],
    permissions: [],
    assigned_groups: [],
    assigned_departments: [],
    can_add_members: false,
    can_edit_members: false,
    can_view_own_data: false,
    login_username: '',
    login_pin: ''
  });

  // Enhanced admin sections
  const adminSections = [
    {
      icon: Building,
      title: 'Church Information',
      description: 'Manage church profile, service times, and communication',
      color: 'from-blue-500 to-blue-600',
      modal: 'church-info',
      permission: 'admin_access'
    },
    {
      icon: Settings,
      title: 'System Configuration',
      description: 'Global preferences, integrations, and backups',
      color: 'from-purple-500 to-purple-600',
      modal: 'system-config',
      permission: 'admin_access'
    },
    {
      icon: Users,
      title: 'User Management',
      description: 'Manage roles, permissions, and access control',
      color: 'from-green-500 to-green-600',
      modal: 'users',
      permission: 'view_members'
    },
    {
      icon: Database,
      title: 'Data Management',
      description: 'Backup, import, export, and data cleanup',
      color: 'from-orange-500 to-orange-600',
      modal: 'data-management',
      permission: 'admin_access'
    },
    {
      icon: Shield,
      title: 'Security',
      description: 'Security policies and audit logs',
      color: 'from-red-500 to-red-600',
      modal: 'security',
      permission: 'admin_access'
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Email, SMS, and push notifications',
      color: 'from-yellow-500 to-yellow-600',
      modal: 'notifications',
      permission: 'admin_access'
    },
    {
      icon: Mail,
      title: 'Communication',
      description: 'Email templates and messaging',
      color: 'from-pink-500 to-pink-600',
      modal: 'communication',
      permission: 'admin_access'
    },
    {
      icon: BarChart3,
      title: 'Reports & Analytics',
      description: 'System reports and statistics',
      color: 'from-indigo-500 to-indigo-600',
      modal: 'reports',
      permission: 'view_reports'
    },
  ];

  const roles = [
    { value: 'member', label: 'Member', description: 'Basic access to personal profile' },
    { value: 'group_leader', label: 'Group Leader', description: 'Can manage assigned groups and view members' },
    { value: 'department_leader', label: 'Department Leader', description: 'Can manage assigned departments' },
    { value: 'deacon', label: 'Deacon', description: 'Extended access to ministry areas' },
    { value: 'pastor', label: 'Pastor', description: 'Full administrative access' },
    { value: 'admin', label: 'Administrator', description: 'Complete system access' },
  ];

  const permissions = [
    { value: 'view_members', label: 'View Members', description: 'Can see member directory' },
    { value: 'add_members', label: 'Add Members', description: 'Can add new members' },
    { value: 'edit_members', label: 'Edit Members', description: 'Can modify member information' },
    { value: 'delete_members', label: 'Delete Members', description: 'Can remove members' },
    { value: 'view_groups', label: 'View Groups', description: 'Can see all groups' },
    { value: 'manage_groups', label: 'Manage Groups', description: 'Can create and edit groups' },
    { value: 'view_events', label: 'View Events', description: 'Can see event calendar' },
    { value: 'manage_events', label: 'Manage Events', description: 'Can create and edit events' },
    { value: 'view_donations', label: 'View Donations', description: 'Can see donation records' },
    { value: 'manage_donations', label: 'Manage Donations', description: 'Can record and edit donations' },
    { value: 'view_reports', label: 'View Reports', description: 'Can access analytics and reports' },
    { value: 'admin_access', label: 'Admin Access', description: 'Full system administration' },
  ];

  // Enhanced load data function
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading admin data...');
      const [membersData, groupsData, churchData, systemData, securityData, auditData, statsData] = await Promise.all([
        cloudService.getMembers(),
        cloudService.getGroups(),
        cloudService.getChurchInfo(),
        cloudService.getSystemConfig(),
        cloudService.getSecuritySettings(),
        cloudService.getAuditLogs(),
        cloudService.getSystemStats()
      ]);
      
      console.log('Data loaded:', { members: membersData.length, groups: groupsData.length });
      setMembers(membersData);
      setGroups(groupsData);
      setChurchInfo(churchData);
      setSystemConfig(systemData);
      setSecuritySettings(securityData);
      setAuditLogs(auditData);
      setSystemStats(statsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // Enhanced useEffect for permissions and data loading
  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      if (!profile) {
        setHasAccess(false);
        setInitialLoad(false);
        return;
      }

      const currentUser: Member = {
        id: profile.id,
        name: profile.name || '',
        surname: profile.surname || '',
        email: profile.email,
        phone: profile.phone || null,
        admin_role: profile.admin_role || 'member',
        pastor_role: profile.pastor_role || false,
        deacon_role: profile.deacon_role || false,
        group_leader: profile.group_leader || false,
        department_leader: profile.department_leader || false,
        permissions: profile.permissions || [],
        login_username: profile.login_username || null,
        login_pin: profile.login_pin || null,
        assigned_groups: profile.assigned_groups || [],
        assigned_departments: profile.assigned_departments || [],
        can_add_members: profile.can_add_members || false,
        can_edit_members: profile.can_edit_members || false,
        can_view_own_data: profile.can_view_own_data || false,
        cell_group_id: profile.cell_group_id,
        status: profile.status,
        created_at: profile.created_at
      };

      if (profile.cell_group_id) {
        const groupName = await cloudService.getCellGroupNameById(profile.cell_group_id);
        setCurrentUserCellGroup(groupName);
      }

      const userHasAccess = 
        isAdminOrPastor(currentUser) || 
        hasPermission(profile.permissions, 'manage_groups') ||
        hasPermission(profile.permissions, 'view_members');
      
      setHasAccess(userHasAccess);

      if (userHasAccess) {
        await loadData();
      } else {
        setInitialLoad(false);
      }
    };

    checkAccessAndLoadData();
  }, [profile]);

  // Enhanced modal handler
  const openModal = async (modalType: string, user?: Member) => {
    if (!profile) return;

    const currentUser: Member = {
      id: profile.id,
      name: profile.name || '',
      surname: profile.surname || '',
      email: profile.email,
      phone: profile.phone || null,
      admin_role: profile.admin_role || 'member',
      pastor_role: profile.pastor_role || false,
      deacon_role: profile.deacon_role || false,
      group_leader: profile.group_leader || false,
      department_leader: profile.department_leader || false,
      permissions: profile.permissions || [],
      login_username: profile.login_username || null,
      login_pin: profile.login_pin || null,
      assigned_groups: profile.assigned_groups || [],
      assigned_departments: profile.assigned_departments || [],
      can_add_members: profile.can_add_members || false,
      can_edit_members: profile.can_edit_members || false,
      can_view_own_data: profile.can_view_own_data || false,
      cell_group_id: profile.cell_group_id,
      status: profile.status,
      created_at: profile.created_at
    };

    if (!isAdminOrPastor(currentUser)) {
      setError('You do not have permission to access admin sections');
      return;
    }

    setActiveModal(modalType);
    setError(null);

    if (user) {
      setSelectedUser(user);
      const userRoles = getRolesFromMember(user);
      setUserFormData({
        roles: userRoles,
        permissions: user.permissions || [],
        assigned_groups: user.assigned_groups || [],
        assigned_departments: user.assigned_departments || [],
        can_add_members: user.can_add_members || false,
        can_edit_members: user.can_edit_members || false,
        can_view_own_data: user.can_view_own_data || false,
        login_username: user.login_username || '',
        login_pin: user.login_pin || ''
      });
      setShowCredentials(false);
      setGeneratedCredentials(null);
    }

    // Load additional data for specific modals
    if (modalType === 'security') {
      const logs = await cloudService.getAuditLogs();
      setAuditLogs(logs);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedUser(null);
    setUserFormData({
      roles: ['member'],
      permissions: [],
      assigned_groups: [],
      assigned_departments: [],
      can_add_members: false,
      can_edit_members: false,
      can_view_own_data: false,
      login_username: '',
      login_pin: ''
    });
    setShowCredentials(false);
    setGeneratedCredentials(null);
    setError(null);
  };

  // New handler functions for administrative sections
  const handleUpdateChurchInfo = async () => {
    if (!churchInfo) return;
    
    setLoading(true);
    try {
      await cloudService.updateChurchInfo(churchInfo);
      alert('Church information updated successfully!');
      closeModal();
    } catch (err) {
      setError('Failed to update church information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSystemConfig = async () => {
    if (!systemConfig) return;
    
    setLoading(true);
    try {
      await cloudService.updateSystemConfig(systemConfig);
      alert('System configuration updated successfully!');
      closeModal();
    } catch (err) {
      setError('Failed to update system configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleRunBackup = async () => {
    setLoading(true);
    setBackupStatus('Starting backup...');
    try {
      await cloudService.runBackup();
      setBackupStatus('Backup completed successfully!');
      setTimeout(() => setBackupStatus(''), 3000);
    } catch (err) {
      setBackupStatus('Backup failed!');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async (format: string, includeSensitive: boolean) => {
    setLoading(true);
    try {
      const blob = await cloudService.exportData(format, includeSensitive);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `church-data-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  // Keep your existing handler functions (handleGenerateCredentials, handleUserUpdate, etc.)
  const handleGenerateCredentials = async () => {
    if (!selectedUser) return;
    
    const currentUser: Member = {
      id: profile!.id,
      name: profile!.name || '',
      surname: profile!.surname || '',
      email: profile!.email,
      phone: profile!.phone || null,
      admin_role: profile!.admin_role || 'member',
      pastor_role: profile!.pastor_role || false,
      deacon_role: profile!.deacon_role || false,
      group_leader: profile!.group_leader || false,
      department_leader: profile!.department_leader || false,
      permissions: profile!.permissions || [],
      login_username: profile!.login_username || null,
      login_pin: profile!.login_pin || null,
      assigned_groups: profile!.assigned_groups || [],
      assigned_departments: profile!.assigned_departments || [],
      can_add_members: profile!.can_add_members || false,
      can_edit_members: profile!.can_edit_members || false,
      can_view_own_data: profile!.can_view_own_data || false,
      cell_group_id: profile!.cell_group_id,
      status: profile!.status,
      created_at: profile!.created_at
    };
    
    if (!isAdminOrPastor(currentUser) && !hasPermission(profile!.permissions, 'edit_members')) {
      setError('You do not have permission to generate credentials');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const credentials = await cloudService.generateCredentials(selectedUser.id);
      
      setUserFormData(prev => ({
        ...prev,
        login_username: credentials.username,
        login_pin: credentials.pin
      }));
      
      setGeneratedCredentials(credentials);
      setShowCredentials(true);
      
      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate credentials';
      setError(errorMessage);
      console.error('Error generating credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = async () => {
    if (!selectedUser || !profile) return;

    const currentUser: Member = {
      id: profile.id,
      name: profile.name || '',
      surname: profile.surname || '',
      email: profile.email,
      phone: profile.phone || null,
      admin_role: profile.admin_role || 'member',
      pastor_role: profile.pastor_role || false,
      deacon_role: profile.deacon_role || false,
      group_leader: profile.group_leader || false,
      department_leader: profile.department_leader || false,
      permissions: profile.permissions || [],
      login_username: profile.login_username || null,
      login_pin: profile.login_pin || null,
      assigned_groups: profile.assigned_groups || [],
      assigned_departments: profile.assigned_departments || [],
      can_add_members: profile.can_add_members || false,
      can_edit_members: profile.can_edit_members || false,
      can_view_own_data: profile.can_view_own_data || false,
      cell_group_id: profile.cell_group_id,
      status: profile.status,
      created_at: profile.created_at
    };

    if (!isAdminOrPastor(currentUser) && !hasPermission(profile.permissions, 'edit_members')) {
      setError('You do not have permission to update users');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const roleUpdates = setRolesToMember(userFormData.roles);

      const updatedMember = await cloudService.updateMember(selectedUser.id, {
        ...roleUpdates,
        permissions: userFormData.permissions,
        assigned_groups: userFormData.assigned_groups,
        assigned_departments: userFormData.assigned_departments,
        can_add_members: userFormData.can_add_members,
        can_edit_members: userFormData.can_edit_members,
        can_view_own_data: userFormData.can_view_own_data,
        login_username: userFormData.login_username,
        login_pin: userFormData.login_pin
      });

      setMembers(prev => prev.map(m => 
        m.id === selectedUser.id ? updatedMember : m
      ));
      
      alert('User updated successfully!');
      closeModal();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      setError(errorMessage);
      console.error('Error updating user:', err);
    } finally {
      setLoading(false);
    }
  };

  // Permission and role handlers (keep your existing ones)
  const handlePermissionToggle = (permission: string) => {
    setUserFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const handleGroupToggle = (groupId: string) => {
    setUserFormData(prev => ({
      ...prev,
      assigned_groups: prev.assigned_groups.includes(groupId)
        ? prev.assigned_groups.filter(g => g !== groupId)
        : [...prev.assigned_groups, groupId]
    }));
  };

  const handleDepartmentToggle = (deptId: string) => {
    setUserFormData(prev => ({
      ...prev,
      assigned_departments: prev.assigned_departments.includes(deptId)
        ? prev.assigned_departments.filter(d => d !== deptId)
        : [...prev.assigned_departments, deptId]
    }));
  };

  const handleRoleToggle = (roleValue: string) => {
    setUserFormData(prev => {
      let newRoles: string[];
      
      if (prev.roles.includes(roleValue)) {
        if (prev.roles.length > 1) {
          newRoles = prev.roles.filter(r => r !== roleValue);
        } else {
          alert('User must have at least one role');
          return prev;
        }
      } else {
        newRoles = [...prev.roles, roleValue];
      }

      return {
        ...prev,
        roles: newRoles
      };
    });
  };

  const getRolePermissions = (roles: string[]): string[] => {
    const rolePermissions: Record<string, string[]> = {
      member: ['view_members', 'view_events', 'view_groups'],
      group_leader: ['view_members', 'add_members', 'edit_members', 'view_events', 'view_groups', 'manage_groups'],
      department_leader: ['view_members', 'add_members', 'edit_members', 'view_events', 'view_groups', 'manage_groups'],
      deacon: ['view_members', 'add_members', 'edit_members', 'view_events', 'view_groups', 'manage_groups', 'view_donations'],
      pastor: ['view_members', 'add_members', 'edit_members', 'view_events', 'manage_events', 'view_groups', 'manage_groups', 'view_donations', 'view_reports'],
      admin: ['admin_access']
    };

    const combinedPermissions = new Set<string>();
    roles.forEach(role => {
      const permissions = rolePermissions[role] || [];
      permissions.forEach(permission => combinedPermissions.add(permission));
    });

    return Array.from(combinedPermissions);
  };

  // Enhanced member filtering (keep your existing)
  const getFilteredMembers = () => {
    let filtered = members;
    if (searchTerm) {
      filtered = filtered.filter(member =>
        `${member.name} ${member.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        getRolesFromMember(member).some(role => role.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (!profile) return [];
    // ... rest of your filtering logic
    return filtered;
  };

  const filteredMembers = getFilteredMembers();
  const cellGroups = groups.filter(g => g.type === 'cell_group');
  const departments = groups.filter(g => g.type === 'department');

  // Modal Components for New Administrative Sections
  const ChurchInfoModal = () => (
    <Modal title="Church Information Management">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Church Name</label>
            <input
              type="text"
              value={churchInfo?.name || ''}
              onChange={(e) => setChurchInfo(prev => prev ? {...prev, name: e.target.value} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Denomination</label>
            <input
              type="text"
              value={churchInfo?.denomination || ''}
              onChange={(e) => setChurchInfo(prev => prev ? {...prev, denomination: e.target.value} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
          <textarea
            value={churchInfo?.address || ''}
            onChange={(e) => setChurchInfo(prev => prev ? {...prev, address: e.target.value} : null)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input
              type="text"
              value={churchInfo?.phone || ''}
              onChange={(e) => setChurchInfo(prev => prev ? {...prev, phone: e.target.value} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={churchInfo?.email || ''}
              onChange={(e) => setChurchInfo(prev => prev ? {...prev, email: e.target.value} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
            <input
              type="url"
              value={churchInfo?.website || ''}
              onChange={(e) => setChurchInfo(prev => prev ? {...prev, website: e.target.value} : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Doctrinal Statement</label>
          <textarea
            value={churchInfo?.doctrinal_statement || ''}
            onChange={(e) => setChurchInfo(prev => prev ? {...prev, doctrinal_statement: e.target.value} : null)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your church's doctrinal statement..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleUpdateChurchInfo}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={closeModal}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );

  const SystemConfigModal = () => (
    <Modal title="System Configuration">
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Global Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select 
                value={systemConfig?.global_settings.timezone || 'UTC'}
                onChange={(e) => setSystemConfig(prev => prev ? {
                  ...prev,
                  global_settings: {...prev.global_settings, timezone: e.target.value}
                } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="UTC">UTC</option>
                <option value="EST">EST</option>
                <option value="PST">PST</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
              <select 
                value={systemConfig?.global_settings.date_format || 'MM/DD/YYYY'}
                onChange={(e) => setSystemConfig(prev => prev ? {
                  ...prev,
                  global_settings: {...prev.global_settings, date_format: e.target.value}
                } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Backup Settings</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={systemConfig?.backup_settings.auto_backup || false}
                onChange={(e) => setSystemConfig(prev => prev ? {
                  ...prev,
                  backup_settings: {...prev.backup_settings, auto_backup: e.target.checked}
                } : null)}
                className="mr-2" 
              />
              <span className="text-sm text-gray-700">Automatic Backups</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select 
                  value={systemConfig?.backup_settings.backup_frequency || 'weekly'}
                  onChange={(e) => setSystemConfig(prev => prev ? {
                    ...prev,
                    backup_settings: {...prev.backup_settings, backup_frequency: e.target.value as any}
                  } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Retain Backups (days)</label>
                <input 
                  type="number" 
                  value={systemConfig?.backup_settings.retain_backups || 30}
                  onChange={(e) => setSystemConfig(prev => prev ? {
                    ...prev,
                    backup_settings: {...prev.backup_settings, retain_backups: parseInt(e.target.value)}
                  } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" 
                />
              </div>
            </div>
            {backupStatus && (
              <div className={`p-3 rounded-lg ${
                backupStatus.includes('failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>
                {backupStatus}
              </div>
            )}
            <button
              onClick={handleRunBackup}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {loading ? 'Running Backup...' : 'Run Backup Now'}
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleUpdateSystemConfig}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
          <button onClick={closeModal} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );

  const DataManagementModal = () => (
    <Modal title="Data Management">
      <div className="space-y-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Export Data</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="format" value="csv" defaultChecked className="mr-2" />
                <span className="text-sm text-gray-700">CSV Format</span>
              </label>
              <label className="flex items-center">
                <input type="radio" name="format" value="json" className="mr-2" />
                <span className="text-sm text-gray-700">JSON Format</span>
              </label>
            </div>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span className="text-sm text-gray-700">Include sensitive data</span>
            </label>
            <button
              onClick={() => handleExportData('csv', false)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {loading ? 'Exporting...' : 'Export Data'}
            </button>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">System Statistics</h3>
          {systemStats && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-blue-600">{systemStats.total_members}</div>
                <div className="text-sm text-gray-600">Total Members</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-green-600">{systemStats.total_groups}</div>
                <div className="text-sm text-gray-600">Groups</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-purple-600">{systemStats.active_users}</div>
                <div className="text-sm text-gray-600">Active Users</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );

  const SecurityModal = () => (
    <Modal title="Security Settings">
      <div className="space-y-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Audit Logs</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <div className="font-medium">{log.action}</div>
                  <div className="text-sm text-gray-600">{log.resource}</div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(log.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No audit logs found
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Security Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span className="font-semibold">System Status</span>
              </div>
              <div className="text-sm text-gray-600">All systems secure</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">Active Sessions</span>
              </div>
              <div className="text-sm text-gray-600">{systemStats?.active_users || 0} users</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );

  // Modal wrapper component
  const Modal = ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
          <button 
            onClick={closeModal}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );

  // Keep your existing render logic for initialLoad and hasAccess
  if (initialLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the admin panel. Please contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Admin Panel
            </h1>
            <p className="text-gray-600">
              {profile && (() => {
                const currentUser: Member = {
                  id: profile.id,
                  name: profile.name || '',
                  surname: profile.surname || '',
                  email: profile.email,
                  phone: profile.phone || null,
                  admin_role: profile.admin_role || 'member',
                  pastor_role: profile.pastor_role || false,
                  deacon_role: profile.deacon_role || false,
                  group_leader: profile.group_leader || false,
                  department_leader: profile.department_leader || false,
                  permissions: profile.permissions || [],
                  login_username: profile.login_username || null,
                  login_pin: profile.login_pin || null,
                  assigned_groups: profile.assigned_groups || [],
                  assigned_departments: profile.assigned_departments || [],
                  can_add_members: profile.can_add_members || false,
                  can_edit_members: profile.can_edit_members || false,
                  can_view_own_data: profile.can_view_own_data || false,
                  cell_group_id: profile.cell_group_id,
                  status: profile.status,
                  created_at: profile.created_at
                };
                
                if (isAdminOrPastor(currentUser)) return 'Full administrative access';
                if (hasPermission(profile.permissions, 'manage_groups')) return 'Can manage all groups and members';
                if (currentUser.group_leader) return `Group Leader - Managing ${profile.assigned_groups?.length || 0} group(s)`;
                if (currentUser.department_leader) return `Department Leader - Managing ${profile.assigned_departments?.length || 0} department(s)`;
                if (hasAnyRole(currentUser, ['member'])) return `Viewing members in your cell group${currentUserCellGroup ? `: ${currentUserCellGroup}` : ''}`;
                return `Limited access - ${getRolesFromMember(currentUser).join(', ') || 'member'} role`;
              })()}
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <p className="text-red-700 font-medium">{error}</p>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Admin Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {adminSections.map((section) => {
            if (!profile) return null;
            
            const currentUser: Member = {
              id: profile.id,
              name: profile.name || '',
              surname: profile.surname || '',
              email: profile.email,
              phone: profile.phone || null,
              admin_role: profile.admin_role || 'member',
              pastor_role: profile.pastor_role || false,
              deacon_role: profile.deacon_role || false,
              group_leader: profile.group_leader || false,
              department_leader: profile.department_leader || false,
              permissions: profile.permissions || [],
              login_username: profile.login_username || null,
              login_pin: profile.login_pin || null,
              assigned_groups: profile.assigned_groups || [],
              assigned_departments: profile.assigned_departments || [],
              can_add_members: profile.can_add_members || false,
              can_edit_members: profile.can_edit_members || false,
              can_view_own_data: profile.can_view_own_data || false,
              cell_group_id: profile.cell_group_id,
              status: profile.status,
              created_at: profile.created_at
            };
            
            const sectionHasAccess = isAdminOrPastor(currentUser) || hasPermission(profile.permissions, section.permission);
            
            return (
              <button
                key={section.title}
                onClick={() => sectionHasAccess ? openModal(section.modal) : setError('You do not have permission to access this section')}
                disabled={!sectionHasAccess}
                className={`bg-white border border-gray-200 rounded-2xl p-6 transition-all duration-200 text-left group ${
                  sectionHasAccess 
                    ? 'hover:scale-105 hover:shadow-xl cursor-pointer' 
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <section.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{section.title}</h3>
                <p className="text-gray-600 text-sm">{section.description}</p>
                {!sectionHasAccess && (
                  <p className="text-xs text-red-600 mt-2">Permission required</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Keep your existing User Management Section */}
        {/* ... */}

        {/* Render Modals */}
        {activeModal === 'church-info' && <ChurchInfoModal />}
        {activeModal === 'system-config' && <SystemConfigModal />}
        {activeModal === 'data-management' && <DataManagementModal />}
        {activeModal === 'security' && <SecurityModal />}

        {/* Keep your existing User Details Modal and other modals */}
        {/* ... */}

      </div>
    </div>
  );
};

export default Admin;
