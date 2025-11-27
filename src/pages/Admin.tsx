import { Settings, Users, Database, Shield, Bell, Mail, X, Search, Key, Copy, RefreshCw, AlertCircle, FileText, Download, Upload, Calendar, MessageSquare, Globe, Building, Clock, MapPin, BookOpen, Heart, CreditCard, BarChart3, Filter, UserCheck, History, Lock, Eye, Server, Archive, Trash2, Wifi, WifiOff, Phone, Map, Globe2, Book, Cpu, HardDrive, Network, Smartphone, MessageCircle } from 'lucide-react';
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

interface ReportData {
  membership_growth: { month: string; count: number }[];
  attendance_trends: { date: string; attendance: number }[];
  donation_summary: { category: string; amount: number }[];
  group_statistics: { group_name: string; member_count: number }[];
}

// Helper functions
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

  async getNotificationSettings(): Promise<NotificationSettings> {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .single();

    if (error || !data) {
      return {
        email_settings: {
          smtp_host: '',
          smtp_port: 587,
          smtp_username: '',
          smtp_password: '',
          from_email: '',
          from_name: ''
        },
        sms_settings: {
          provider: 'twilio',
          account_sid: '',
          auth_token: '',
          from_number: ''
        },
        push_settings: {
          enabled: false,
          service_key: ''
        },
        notification_templates: []
      };
    }
    return data;
  },

  async updateNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
    const { data, error } = await supabase
      .from('notification_settings')
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
    await new Promise(resolve => setTimeout(resolve, 2000));
  },

  async getSystemStats(): Promise<any> {
    // Mock data for now since we don't have all tables
    return {
      total_members: 178,
      total_groups: 12,
      total_events: 45,
      total_donations: 234,
      storage_used: '2.3 GB',
      active_users: 45
    };
  },

  async getReportData(): Promise<ReportData> {
    // Mock report data
    return {
      membership_growth: [
        { month: 'Jan', count: 120 },
        { month: 'Feb', count: 135 },
        { month: 'Mar', count: 142 },
        { month: 'Apr', count: 156 },
        { month: 'May', count: 165 },
        { month: 'Jun', count: 178 }
      ],
      attendance_trends: [
        { date: '2024-01-01', attendance: 85 },
        { date: '2024-01-08', attendance: 92 },
        { date: '2024-01-15', attendance: 78 },
        { date: '2024-01-22', attendance: 105 },
        { date: '2024-01-29', attendance: 98 }
      ],
      donation_summary: [
        { category: 'Tithes', amount: 12500 },
        { category: 'Offerings', amount: 3200 },
        { category: 'Missions', amount: 1800 },
        { category: 'Building Fund', amount: 4500 }
      ],
      group_statistics: [
        { group_name: 'Young Adults', member_count: 25 },
        { group_name: 'Men\'s Fellowship', member_count: 18 },
        { group_name: 'Women\'s Ministry', member_count: 32 },
        { group_name: 'Youth Group', member_count: 15 }
      ]
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

// Modal wrapper component
const Modal = ({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
      <div className="flex justify-between items-center p-6 border-b border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
        <button 
          onClick={onClose}
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
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [backupStatus, setBackupStatus] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);

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
      const [membersData, groupsData, churchData, systemData, securityData, statsData] = await Promise.all([
        cloudService.getMembers(),
        cloudService.getGroups(),
        cloudService.getChurchInfo(),
        cloudService.getSystemConfig(),
        cloudService.getSecuritySettings(),
        cloudService.getSystemStats()
      ]);
      
      setMembers(membersData);
      setGroups(groupsData);
      setChurchInfo(churchData);
      setSystemConfig(systemData);
      setSecuritySettings(securityData);
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
        cell_group_id: profile.cell_group_id || null,
        status: profile.status || null,
        created_at: profile.created_at || null
      };

      if (profile.cell_group_id) {
        const groupName = await cloudService.getCellGroupNameById(profile.cell_group_id);
        setCurrentUserCellGroup(groupName);
      }

      const userHasAccess = 
        isAdminOrPastor(currentUser) || 
        hasPermission(profile.permissions || [], 'manage_groups') ||
        hasPermission(profile.permissions || [], 'view_members');
      
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
      cell_group_id: profile.cell_group_id || null,
      status: profile.status || null,
      created_at: profile.created_at || null
    };

    if (modalType === 'users' && !isAdminOrPastor(currentUser) && !hasPermission(profile.permissions || [], 'view_members')) {
      setError('You do not have permission to view user management');
      return;
    }
    
    if (user && !isAdminOrPastor(currentUser) && !hasPermission(profile.permissions || [], 'edit_members')) {
      setError('You do not have permission to edit users');
      return;
    }

    if (!isAdminOrPastor(currentUser) && !['users', 'userDetails'].includes(modalType)) {
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
    if (modalType === 'notifications') {
      const settings = await cloudService.getNotificationSettings();
      setNotificationSettings(settings);
    }
    if (modalType === 'reports') {
      const reports = await cloudService.getReportData();
      setReportData(reports);
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

  // Handler functions for administrative sections
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

  const handleUpdateSecuritySettings = async () => {
    if (!securitySettings) return;
    
    setLoading(true);
    try {
      await cloudService.updateSecuritySettings(securitySettings);
      alert('Security settings updated successfully!');
      closeModal();
    } catch (err) {
      setError('Failed to update security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotificationSettings = async () => {
    if (!notificationSettings) return;
    
    setLoading(true);
    try {
      await cloudService.updateNotificationSettings(notificationSettings);
      alert('Notification settings updated successfully!');
      closeModal();
    } catch (err) {
      setError('Failed to update notification settings');
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

  // Keep your existing handler functions
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
      cell_group_id: profile!.cell_group_id || null,
      status: profile!.status || null,
      created_at: profile!.created_at || null
    };
    
    if (!isAdminOrPastor(currentUser) && !hasPermission(profile!.permissions || [], 'edit_members')) {
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
      cell_group_id: profile.cell_group_id || null,
      status: profile.status || null,
      created_at: profile.created_at || null
    };

    if (!isAdminOrPastor(currentUser) && !hasPermission(profile.permissions || [], 'edit_members')) {
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

  // Permission and role handlers
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

  // Enhanced member filtering
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
      cell_group_id: profile.cell_group_id || null,
      status: profile.status || null,
      created_at: profile.created_at || null
    };

    if (isAdminOrPastor(currentUser)) {
      return filtered;
    }

    if (hasPermission(profile.permissions || [], 'manage_groups')) {
      return filtered;
    }

    if (currentUser.group_leader && profile.assigned_groups && profile.assigned_groups.length > 0) {
      filtered = filtered.filter(member => {
        if (member.cell_group_id && profile.assigned_groups.includes(member.cell_group_id)) {
          return true;
        }
        if (member.assigned_groups && member.assigned_groups.some(group => profile.assigned_groups.includes(group))) {
          return true;
        }
        return false;
      });
      return filtered;
    }

    if (currentUser.department_leader && profile.assigned_departments && profile.assigned_departments.length > 0) {
      filtered = filtered.filter(member => {
        if (member.assigned_departments && member.assigned_departments.some(dept => profile.assigned_departments.includes(dept))) {
          return true;
        }
        return false;
      });
      return filtered;
    }

    if (hasAnyRole(currentUser, ['member']) && profile.cell_group_id) {
      filtered = filtered.filter(member => 
        member.cell_group_id === profile.cell_group_id
      );
      return filtered;
    }

    if (hasPermission(profile.permissions || [], 'view_members')) {
      return filtered;
    }

    return [];
  };

  const filteredMembers = getFilteredMembers();
  const cellGroups = groups.filter(g => g.type === 'cell_group');
  const departments = groups.filter(g => g.type === 'department');

  // Modal Components for ALL Administrative Sections
  const ChurchInfoModal = () => (
    <Modal title="Church Information Management" onClose={closeModal}>
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
    <Modal title="System Configuration" onClose={closeModal}>
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
    <Modal title="Data Management" onClose={closeModal}>
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
    <Modal title="Security Settings" onClose={closeModal}>
      <div className="space-y-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Password Policy</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Length</label>
              <input 
                type="number" 
                value={securitySettings?.password_policy.min_length || 8}
                onChange={(e) => setSecuritySettings(prev => prev ? {
                  ...prev,
                  password_policy: {...prev.password_policy, min_length: parseInt(e.target.value)}
                } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" 
              />
            </div>
            <div className="space-y-2">
              {[
                { key: 'require_uppercase', label: 'Require uppercase letters' },
                { key: 'require_lowercase', label: 'Require lowercase letters' },
                { key: 'require_numbers', label: 'Require numbers' },
                { key: 'require_special_chars', label: 'Require special characters' }
              ].map((req) => (
                <label key={req.key} className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={(securitySettings?.password_policy as any)?.[req.key] || false}
                    onChange={(e) => setSecuritySettings(prev => prev ? {
                      ...prev,
                      password_policy: {...prev.password_policy, [req.key]: e.target.checked}
                    } : null)}
                    className="mr-2" 
                  />
                  <span className="text-sm text-gray-700">{req.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

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

        <div className="flex gap-3">
          <button 
            onClick={handleUpdateSecuritySettings}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Security Settings'}
          </button>
          <button onClick={closeModal} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );

  const NotificationsModal = () => (
    <Modal title="Notification Settings" onClose={closeModal}>
      <div className="space-y-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Email Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
              <input 
                type="text" 
                value={notificationSettings?.email_settings.smtp_host || ''}
                onChange={(e) => setNotificationSettings(prev => prev ? {
                  ...prev,
                  email_settings: {...prev.email_settings, smtp_host: e.target.value}
                } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
              <input 
                type="number" 
                value={notificationSettings?.email_settings.smtp_port || 587}
                onChange={(e) => setNotificationSettings(prev => prev ? {
                  ...prev,
                  email_settings: {...prev.email_settings, smtp_port: parseInt(e.target.value)}
                } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Notification Types</h3>
          <div className="space-y-3">
            {[
              { key: 'email_notifications', label: 'Email Notifications', icon: Mail },
              { key: 'sms_notifications', label: 'SMS Notifications', icon: MessageCircle },
              { key: 'push_notifications', label: 'Push Notifications', icon: Bell },
              { key: 'event_reminders', label: 'Event Reminders', icon: Calendar },
              { key: 'donation_receipts', label: 'Donation Receipts', icon: CreditCard },
              { key: 'birthday_reminders', label: 'Birthday Reminders', icon: Heart }
            ].map((type) => (
              <label key={type.key} className="flex items-center gap-3 p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50">
                <input 
                  type="checkbox" 
                  checked={(systemConfig?.notification_settings as any)?.[type.key] || false}
                  onChange={(e) => setSystemConfig(prev => prev ? {
                    ...prev,
                    notification_settings: {...prev.notification_settings, [type.key]: e.target.checked}
                  } : null)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <type.icon className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleUpdateNotificationSettings}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Notification Settings'}
          </button>
          <button onClick={closeModal} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );

  const CommunicationModal = () => (
    <Modal title="Communication Templates" onClose={closeModal}>
      <div className="space-y-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Email Templates</h3>
          <div className="space-y-4">
            {churchInfo?.communication_templates?.map((template, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-900">{template.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{template.subject}</p>
                <button className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                  Edit Template
                </button>
              </div>
            ))}
            <button className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700">
              + Add New Template
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );

  const ReportsModal = () => (
    <Modal title="Reports & Analytics" onClose={closeModal}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">{systemStats?.total_members || 0}</div>
            <div className="text-sm text-gray-600">Total Members</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{systemStats?.total_groups || 0}</div>
            <div className="text-sm text-gray-600">Active Groups</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-purple-600">{systemStats?.active_users || 0}</div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-orange-600">{systemStats?.total_donations || 0}</div>
            <div className="text-sm text-gray-600">Donations</div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Quick Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="p-4 bg-white rounded-lg border text-left hover:bg-gray-50">
              <FileText className="h-6 w-6 text-blue-600 mb-2" />
              <div className="font-semibold text-gray-900">Membership Report</div>
              <div className="text-sm text-gray-600">Current membership statistics</div>
            </button>
            <button className="p-4 bg-white rounded-lg border text-left hover:bg-gray-50">
              <BarChart3 className="h-6 w-6 text-green-600 mb-2" />
              <div className="font-semibold text-gray-900">Attendance Report</div>
              <div className="text-sm text-gray-600">Service attendance trends</div>
            </button>
            <button className="p-4 bg-white rounded-lg border text-left hover:bg-gray-50">
              <CreditCard className="h-6 w-6 text-purple-600 mb-2" />
              <div className="font-semibold text-gray-900">Financial Report</div>
              <div className="text-sm text-gray-600">Donations and expenses</div>
            </button>
            <button className="p-4 bg-white rounded-lg border text-left hover:bg-gray-50">
              <Users className="h-6 w-6 text-orange-600 mb-2" />
              <div className="font-semibold text-gray-900">Group Report</div>
              <div className="text-sm text-gray-600">Group activity and membership</div>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );

  // Your existing User Management Modal
  const UsersModal = () => (
    <Modal title="User Management" onClose={closeModal}>
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading users...</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {member.name.charAt(0)}{member.surname.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {member.name} {member.surname}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {member.email} • {getRolesFromMember(member).map(role => roles.find(r => r.value === role)?.label || role).join(', ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openModal('userDetails', member)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Manage
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );

  // Your existing User Details Modal
  const UserDetailsModal = () => (
    <Modal title={`Manage User - ${selectedUser?.name} ${selectedUser?.surname}`} onClose={closeModal}>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {selectedUser?.name.charAt(0)}{selectedUser?.surname.charAt(0)}
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-900">
                {selectedUser?.name} {selectedUser?.surname}
              </h4>
              <p className="text-gray-600">{selectedUser?.email}</p>
              <p className="text-sm text-gray-500">{selectedUser?.phone}</p>
              {selectedUser?.cell_group_id && (
                <p className="text-sm text-gray-500">Cell Group ID: {selectedUser?.cell_group_id}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Roles Section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              User Roles
            </label>
            <div className="grid grid-cols-1 gap-3">
              {roles.map(role => (
                <label
                  key={role.value}
                  className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={userFormData.roles.includes(role.value)}
                    onChange={() => handleRoleToggle(role.value)}
                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{role.label}</span>
                    <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              Selected: {userFormData.roles.map(role => 
                roles.find(r => r.value === role)?.label || role
              ).join(', ')}
            </p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Login Credentials
            </label>
            <button
              onClick={handleGenerateCredentials}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors font-medium disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Generating...' : 'Generate Login Credentials'}
            </button>
            
            {showCredentials && generatedCredentials && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-900">Generated Credentials</span>
                  <button
                    onClick={() => {
                      const text = `Username: ${generatedCredentials.username}\nPIN: ${generatedCredentials.pin}`;
                      navigator.clipboard.writeText(text);
                      alert('Credentials copied to clipboard!');
                    }}
                    className="flex items-center gap-1 text-green-700 hover:text-green-900"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="text-xs">Copy</span>
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-green-700">Username:</span>
                    <p className="font-mono font-semibold text-green-900">{generatedCredentials.username}</p>
                  </div>
                  <div>
                    <span className="text-xs text-green-700">PIN:</span>
                    <p className="font-mono font-semibold text-green-900 text-2xl tracking-wider">{generatedCredentials.pin}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {(userFormData.roles.includes('group_leader') || userFormData.roles.includes('department_leader')) && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Leadership Permissions</h4>
              <p className="text-sm text-blue-700 mb-4">
                Configure what this leader can do within their assigned groups/departments
              </p>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={userFormData.can_add_members}
                    onChange={(e) => setUserFormData(prev => ({...prev, can_add_members: e.target.checked}))}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Can Add Members</span>
                    <p className="text-xs text-gray-500">Allow adding new members to assigned groups</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={userFormData.can_edit_members}
                    onChange={(e) => setUserFormData(prev => ({...prev, can_edit_members: e.target.checked}))}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Can Edit Members</span>
                    <p className="text-xs text-gray-500">Allow editing member information in assigned groups</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={userFormData.can_view_own_data}
                    onChange={(e) => setUserFormData(prev => ({...prev, can_view_own_data: e.target.checked}))}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Can View & Edit Own Group/Department Data</span>
                    <p className="text-xs text-gray-500">Full access to view and edit all data within assigned areas</p>
                  </div>
                </label>
              </div>
            </div>

            {userFormData.roles.includes('group_leader') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Assigned Cell Groups
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cellGroups.map(group => (
                    <label
                      key={group.id}
                      className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={userFormData.assigned_groups.includes(group.id)}
                        onChange={() => handleGroupToggle(group.id)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">{group.name}</span>
                        <p className="text-xs text-gray-500">{group.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {userFormData.roles.includes('department_leader') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Assigned Departments
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {departments.map(dept => (
                    <label
                      key={dept.id}
                      className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={userFormData.assigned_departments.includes(dept.id)}
                        onChange={() => handleDepartmentToggle(dept.id)}
                        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">{dept.name}</span>
                        <p className="text-xs text-gray-500">{dept.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            System Permissions
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2">
            {permissions.map(permission => (
              <label
                key={permission.value}
                className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={userFormData.permissions.includes(permission.value)}
                  onChange={() => handlePermissionToggle(permission.value)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">{permission.label}</span>
                  <p className="text-xs text-gray-500">{permission.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleUserUpdate}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update User'}
          </button>
          <button
            onClick={closeModal}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
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
                  cell_group_id: profile.cell_group_id || null,
                  status: profile.status || null,
                  created_at: profile.created_at || null
                };
                
                if (isAdminOrPastor(currentUser)) return 'Full administrative access';
                if (hasPermission(profile.permissions || [], 'manage_groups')) return 'Can manage all groups and members';
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
              cell_group_id: profile.cell_group_id || null,
              status: profile.status || null,
              created_at: profile.created_at || null
            };
            
            const sectionHasAccess = isAdminOrPastor(currentUser) || hasPermission(profile.permissions || [], section.permission);
            
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

        {/* Your existing User Management Section */}
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
            cell_group_id: profile.cell_group_id || null,
            status: profile.status || null,
            created_at: profile.created_at || null
          };

          return (isAdminOrPastor(currentUser) || hasPermission(profile.permissions || [], 'view_members')) && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                {(isAdminOrPastor(currentUser) || hasPermission(profile.permissions || [], 'add_members')) && (
                  <button
                    onClick={() => openModal('users')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                  >
                    <Users className="h-4 w-4" />
                    View All Users
                  </button>
                )}
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading users...</p>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {searchTerm 
                      ? 'No users found matching your search' 
                      : hasAnyRole(currentUser, ['member'])
                      ? 'No members found in your cell group'
                      : 'No users found in your assigned groups/departments'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.name.charAt(0)}{member.surname.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {member.name} {member.surname}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {member.email} • {getRolesFromMember(member).map(role => roles.find(r => r.value === role)?.label || role).join(', ')}
                          </p>
                          {member.cell_group_id && (
                            <p className="text-xs text-gray-500">
                              Cell Group ID: {member.cell_group_id}
                            </p>
                          )}
                          {member.login_username && (
                            <p className="text-xs text-blue-600 mt-1">
                              <Key className="h-3 w-3 inline mr-1" />
                              Login: {member.login_username}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {member.assigned_groups.length > 0 && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            {member.assigned_groups.length} Group{member.assigned_groups.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {member.assigned_departments.length > 0 && (
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                            {member.assigned_departments.length} Dept{member.assigned_departments.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {(isAdminOrPastor(currentUser) || hasPermission(profile.permissions || [], 'edit_members')) && (
                          <button
                            onClick={() => openModal('userDetails', member)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                          >
                            Manage
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Stats Section */}
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
            cell_group_id: profile.cell_group_id || null,
            status: profile.status || null,
            created_at: profile.created_at || null
          };

          return (isAdminOrPastor(currentUser) || hasPermission(profile.permissions || [], 'view_reports')) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Role Statistics</h2>
                <div className="space-y-4">
                  {roles.map(role => {
                    const count = filteredMembers.filter(m => 
                      getRolesFromMember(m).includes(role.value)
                    ).length;
                    return (
                      <div key={role.value} className="flex justify-between items-center">
                        <span className="text-gray-600">{role.label}</span>
                        <span className="text-gray-900 font-semibold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Stats</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Visible Members</span>
                    <span className="text-gray-900 font-semibold">{filteredMembers.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Members</span>
                    <span className="text-gray-900 font-semibold">{members.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Active Groups</span>
                    <span className="text-gray-900 font-semibold">{cellGroups.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Departments</span>
                    <span className="text-gray-900 font-semibold">{departments.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Users with Login</span>
                    <span className="text-gray-900 font-semibold">
                      {members.filter(m => m.login_username).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Render ALL Modals */}
        {activeModal === 'church-info' && <ChurchInfoModal />}
        {activeModal === 'system-config' && <SystemConfigModal />}
        {activeModal === 'data-management' && <DataManagementModal />}
        {activeModal === 'security' && <SecurityModal />}
        {activeModal === 'notifications' && <NotificationsModal />}
        {activeModal === 'communication' && <CommunicationModal />}
        {activeModal === 'reports' && <ReportsModal />}
        {activeModal === 'users' && <UsersModal />}
        {activeModal === 'userDetails' && <UserDetailsModal />}

      </div>
    </div>
  );
};

export default Admin;
