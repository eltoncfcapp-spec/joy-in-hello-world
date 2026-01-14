import { Users, Database, Shield, X, Search, Key, Copy, RefreshCw, AlertCircle, FileText, Download, Upload, Trash2, Clock, Activity, FileSpreadsheet } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';

// UUID Validation Helper
const cleanUUIDArray = (ids: string[]): string[] => {
  if (!Array.isArray(ids)) return [];
  
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  return ids.filter(id => {
    // Remove any empty objects, null, undefined, or invalid strings
    if (!id || typeof id !== 'string') return false;
    if (id === '{}' || id === 'null' || id === 'undefined') return false;
    return uuidPattern.test(id.trim());
  });
};

// Audit logging helper
const logAuditEvent = async (
  action: string,
  tableName: string,
  recordId: string,
  oldData?: any,
  newData?: any
) => {
  try {
    console.log('📝 Audit Log:', { action, tableName, recordId });
    
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        action,
        table_name: tableName,
        record_id: recordId,
        old_data: oldData || null,
        new_data: newData || null,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('❌ Failed to log audit event:', error);
    }
  } catch (error) {
    console.error('❌ Error logging audit event:', error);
  }
};

interface Member {
  id: string;
  name: string;
  surname: string;
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
  residence: string;
  gender: string | null;
  baptism: string | null;
  ministry_group_id: string | null;
  is_permanent_member: boolean;
  permanent_member_date: string | null;
  invited_by: string | null;
  first_time_visit_date: string | null;
  is_leader: boolean;
  is_hidden: boolean;
  is_developer: boolean;
  is_admin: boolean;
  auth_user_id: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  type: 'cell_group' | 'department';
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
  backup_settings: {
    auto_backup: boolean;
    backup_frequency: 'daily' | 'weekly' | 'monthly';
    backup_time: string;
    retain_backups: number;
    cloud_storage: boolean;
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

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string | null;
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  created_at: string | null;
  user_name?: string;
  user_surname?: string;
}

interface StorageInfo {
  total_storage: number;
  used_storage: number;
  available_storage: number;
  usage_percentage: number;
}

interface ImportFieldMapping {
  [key: string]: string; // Column name in CSV/Excel -> Database field name
}

interface ImportPreviewRow {
  index: number;
  rawData: { [key: string]: string };
  mappedData: { [key: string]: any };
  errors: string[];
  status: 'pending' | 'processing' | 'success' | 'error';
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

// Parse CSV row with proper handling of quoted values
const parseCSVRow = (row: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  return result;
};

// Excel file reader helper - now uses SheetJS (xlsx library)
const readExcelOrCsvFile = async (file: File): Promise<{ headers: string[], data: string[][] }> => {
  const fileExtension = file.name.toLowerCase().split('.').pop();
  
  if (fileExtension === 'csv') {
    // Handle CSV files
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const rows = content.split('\n').filter(row => row.trim() !== '');
          const data = rows.map(row => parseCSVRow(row));
          const headers = data[0] || [];
          resolve({ headers, data: data.slice(1) });
        } catch (error) {
          reject(new Error('Failed to parse CSV file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read CSV file'));
      reader.readAsText(file);
    });
  }
  
  // Handle Excel files (.xlsx, .xls)
  const XLSX = await import('xlsx');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of arrays
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        if (jsonData.length === 0) {
          reject(new Error('Excel file is empty'));
          return;
        }
        
        // First row is headers
        const headers = jsonData[0].map((h: any) => String(h).trim());
        
        // Rest is data - convert all values to strings
        const data = jsonData.slice(1).map(row => 
          row.map((cell: any) => {
            if (cell === null || cell === undefined) return '';
            if (typeof cell === 'number') return String(cell);
            if (cell instanceof Date) return cell.toISOString().split('T')[0];
            return String(cell).trim();
          })
        );
        
        resolve({ headers, data });
      } catch (error) {
        console.error('Excel parsing error:', error);
        reject(new Error('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read Excel file'));
    reader.readAsArrayBuffer(file);
  });
};

// FIXED: Enhanced CSV conversion function for better Excel compatibility
const convertToCSV = (data: any[]): string => {
  if (data.length === 0) return '';
  
  // Define the column order and mapping - optimized for readability
  const columns = [
    { key: 'surname', label: 'Surname', required: true },
    { key: 'name', label: 'Name', required: true },
    { key: 'residence', label: 'Residence', required: true },
    { key: 'phone', label: 'Phone Number' },
    { key: 'gender', label: 'Gender' },
    { key: 'status', label: 'Status' },
    { key: 'cell_group_id', label: 'Cell Group ID' },
    { key: 'admin_role', label: 'Admin Role' },
    { key: 'pastor_role', label: 'Is Pastor' },
    { key: 'deacon_role', label: 'Is Deacon' },
    { key: 'group_leader', label: 'Is Group Leader' },
    { key: 'department_leader', label: 'Is Department Leader' },
    { key: 'baptism', label: 'Baptism Date' },
    { key: 'is_permanent_member', label: 'Permanent Member' },
    { key: 'permanent_member_date', label: 'Permanent Member Date' },
    { key: 'first_time_visit_date', label: 'First Visit Date' },
    { key: 'invited_by', label: 'Invited By' },
    { key: 'is_leader', label: 'Is Leader' },
    { key: 'login_username', label: 'Login Username' },
    { key: 'created_at', label: 'Registration Date' },
    { key: 'assigned_groups', label: 'Assigned Groups' },
    { key: 'assigned_departments', label: 'Assigned Departments' },
    { key: 'permissions', label: 'Permissions' },
    { key: 'can_add_members', label: 'Can Add Members' },
    { key: 'can_edit_members', label: 'Can Edit Members' },
    { key: 'can_view_own_data', label: 'Can View Own Data' },
  ];

  // Create CSV headers
  const headers = columns.map(col => col.label);
  
  // Process each row
  const csvRows = data.map(item => {
    return columns.map(col => {
      let value = item[col.key];
      
      // Handle null/undefined values
      if (value === null || value === undefined) {
        return '';
      }
      
      // Handle arrays (like permissions, assigned_groups, assigned_departments)
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return '';
        }
        // Format arrays as semicolon-separated values for better Excel compatibility
        value = value.join('; ');
      }
      
      // Handle boolean values - convert to Yes/No for better readability
      if (typeof value === 'boolean') {
        value = value ? 'Yes' : 'No';
      }
      
      // Handle dates - format for Excel compatibility
      if (col.key.includes('_date') || col.key.includes('_at') || 
          col.key === 'baptism' || col.key === 'permanent_member_date' || 
          col.key === 'first_time_visit_date' || col.key === 'created_at') {
        if (value) {
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              // Format as YYYY-MM-DD for Excel date recognition
              value = date.toISOString().split('T')[0];
            }
          } catch (e) {
            // Keep original value if date parsing fails
          }
        }
      }
      
      // Convert to string and handle special characters
      const stringValue = String(value);
      
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const needsQuotes = stringValue.includes(',') || 
                         stringValue.includes('"') || 
                         stringValue.includes('\n') || 
                         stringValue.includes('\r') ||
                         stringValue.includes(';');
      
      if (needsQuotes) {
        // Escape double quotes by doubling them (Excel standard)
        const escapedValue = stringValue.replace(/"/g, '""');
        return `"${escapedValue}"`;
      }
      
      return stringValue;
    });
  });

  // Combine headers and rows with BOM for Excel compatibility
  const csvContent = [
    headers.join(','),
    ...csvRows.map(row => row.join(','))
  ].join('\r\n'); // Use \r\n for better Excel compatibility
  
  return csvContent;
};

// NEW: Function to export to Excel (XLSX) format using SheetJS (if available)
const exportToExcel = async (data: any[], includeSensitive: boolean = false): Promise<Blob> => {
  try {
    // Check if SheetJS is available
    if (typeof window !== 'undefined' && (window as any).XLSX) {
      const XLSX = (window as any).XLSX;
      
      // Prepare data for Excel
      const exportData = includeSensitive ? data : data.map(member => {
        const { login_pin, ...memberWithoutPin } = member;
        return memberWithoutPin;
      });
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Members");
      
      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } else {
      // Fallback to CSV with .xlsx extension
      console.warn('SheetJS not available, falling back to CSV format');
      const csvContent = convertToCSV(data);
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    }
  } catch (error) {
    console.error('Error creating Excel file:', error);
    throw error;
  }
};

const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Extended Cloud Service Functions
const cloudService = {
  async getMembers(): Promise<Member[]> {
    try {
      console.log('🔍 Fetching members...');
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching members:', error);
        throw error;
      }
      
      console.log(`✅ Found ${data?.length || 0} members`);
      return (data || []) as any;
    } catch (error) {
      console.error('❌ Error fetching members:', error);
      throw error;
    }
  },

  async getGroups(): Promise<Group[]> {
    try {
      console.log('🔍 Fetching groups...');
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

      console.log(`✅ Found ${cellGroups.length} cell groups and ${departments.length} departments`);
      return [...cellGroups, ...departments];
    } catch (error) {
      console.error('❌ Error fetching groups:', error);
      throw error;
    }
  },

  async updateMember(memberId: string, updates: Partial<Member>): Promise<Member> {
    try {
      const cleanedUpdates = {
        ...updates,
        assigned_groups: updates.assigned_groups 
          ? cleanUUIDArray(updates.assigned_groups) 
          : updates.assigned_groups,
        assigned_departments: updates.assigned_departments 
          ? cleanUUIDArray(updates.assigned_departments) 
          : updates.assigned_departments
      };

      console.log('🔧 Updating member in database:', {
        memberId,
        originalUpdates: updates,
        cleanedUpdates: cleanedUpdates
      });

      const { data, error } = await supabase
        .from('members')
        .update(cleanedUpdates as any)
        .eq('id', memberId)
        .select()
        .single();

      if (error) {
        console.error('❌ Database update error:', error);
        throw error;
      }

      console.log('✅ Database update successful:', {
        memberId: data.id,
        assigned_groups: data.assigned_groups,
        assigned_departments: data.assigned_departments
      });

      return data as any;
    } catch (error) {
      console.error('❌ Error updating member:', error);
      throw error;
    }
  },

  async generateCredentials(memberId: string): Promise<{ username: string; pin: string }> {
    try {
      console.log(`🔑 Generating credentials for member: ${memberId}`);
      const username = `user${Date.now()}`;
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      
      await this.updateMember(memberId, {
        login_username: username,
        login_pin: pin
      });
      
      console.log(`✅ Credentials generated: ${username}`);
      return { username, pin };
    } catch (error) {
      console.error('❌ Error generating credentials:', error);
      throw error;
    }
  },

  async getCellGroupNameById(groupId: string): Promise<string | null> {
    try {
      console.log(`🔍 Getting cell group name for ID: ${groupId}`);
      const { data, error } = await supabase
        .from('cell_groups')
        .select('name')
        .eq('id', groupId)
        .single();

      if (error || !data) return null;
      return data.name;
    } catch (error) {
      console.error('❌ Error fetching cell group name:', error);
      return null;
    }
  },

  async getCellGroupIdByName(groupName: string): Promise<string | null> {
    try {
      console.log(`🔍 Getting cell group ID for name: ${groupName}`);
      const { data, error } = await supabase
        .from('cell_groups')
        .select('id')
        .ilike('name', groupName.trim())
        .single();

      if (error || !data) return null;
      return data.id;
    } catch (error) {
      console.error('❌ Error fetching cell group ID:', error);
      return null;
    }
  },

  async getSystemConfig(): Promise<SystemConfig> {
    try {
      console.log('🔍 Fetching system config...');
      const { data, error } = await supabase
        .from('system_config' as any)
        .select('*')
        .single();

      if (error || !data) {
        console.log('⚠️ Using default system config');
        const defaultConfig: SystemConfig = {
          global_settings: {
            timezone: 'UTC',
            date_format: 'MM/DD/YYYY',
            language: 'en',
            currency: 'USD',
            max_login_attempts: 5,
            session_timeout: 60
          },
          backup_settings: {
            auto_backup: true,
            backup_frequency: 'weekly',
            backup_time: '02:00',
            retain_backups: 30,
            cloud_storage: true
          }
        };
        return defaultConfig;
      }
      return data as any;
    } catch (error) {
      console.error('❌ Error fetching system config:', error);
      return {
        global_settings: {
          timezone: 'UTC',
          date_format: 'MM/DD/YYYY',
          language: 'en',
          currency: 'USD',
          max_login_attempts: 5,
          session_timeout: 60
        },
        backup_settings: {
          auto_backup: true,
          backup_frequency: 'weekly',
          backup_time: '02:00',
          retain_backups: 30,
          cloud_storage: true
        }
      };
    }
  },

  async updateSystemConfig(config: SystemConfig): Promise<SystemConfig> {
    try {
      console.log('⚙️ Updating system config...');
      const { data, error } = await supabase
        .from('system_config' as any)
        .upsert(config)
        .select()
        .single();

      if (error) throw error;
      
      await logAuditEvent(
        'UPDATE',
        'system_config',
        (data as any)?.id || 'new'
      );
      
      return data as any;
    } catch (error) {
      console.error('❌ Error updating system config:', error);
      throw error;
    }
  },

  async getSecuritySettings(): Promise<SecuritySettings> {
    try {
      console.log('🔍 Fetching security settings...');
      const { data, error } = await supabase
        .from('security_settings' as any)
        .select('*')
        .single();

      if (error || !data) {
        console.log('⚠️ Using default security settings');
        const defaultSettings: SecuritySettings = {
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
        return defaultSettings;
      }
      return data as any;
    } catch (error) {
      console.error('❌ Error fetching security settings:', error);
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
  },

  async updateSecuritySettings(settings: SecuritySettings): Promise<SecuritySettings> {
    try {
      console.log('⚙️ Updating security settings...');
      const { data, error } = await supabase
        .from('security_settings' as any)
        .upsert(settings)
        .select()
        .single();

      if (error) throw error;
      
      await logAuditEvent(
        'UPDATE',
        'security_settings',
        (data as any)?.id || 'new'
      );
      
      return data as any;
    } catch (error) {
      console.error('❌ Error updating security settings:', error);
      throw error;
    }
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      console.log('🔍 Fetching audit logs...');
      const { data: logsData, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ Error fetching audit logs:', error);
        return [];
      }

      const logs = (logsData || []).map(log => ({
        ...log,
        user_id: log.user_id,
        action: log.action,
        table_name: log.table_name,
        record_id: log.record_id,
        old_data: log.old_data,
        new_data: log.new_data,
        created_at: log.created_at
      })) as AuditLog[];
      
      const logsWithUserNames = await Promise.all(
        logs.map(async (log) => {
          if (log.user_id) {
            try {
              const { data: userData } = await supabase
                .from('members')
                .select('name, surname')
                .eq('id', log.user_id)
                .single();

              if (userData) {
                return {
                  ...log,
                  user_name: userData.name,
                  user_surname: userData.surname
                };
              }
            } catch (userError) {
              console.warn(`⚠️ Could not fetch user for log ${log.id}:`, userError);
            }
          }
          return log;
        })
      );

      console.log(`✅ Found ${logsWithUserNames.length} audit logs`);
      return logsWithUserNames;
    } catch (error) {
      console.error('❌ Error fetching audit logs:', error);
      return [];
    }
  },

  // FIXED: Enhanced exportData function with proper Excel support
  async exportData(format: string, includeSensitive: boolean): Promise<Blob> {
    try {
      console.log(`📤 Exporting data in ${format.toUpperCase()} format...`);
      console.log(`🔒 Include sensitive data: ${includeSensitive}`);
      
      // Fetch all members
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('surname')
        .order('name');

      if (error) {
        console.error('❌ Error fetching members for export:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No data to export');
        throw new Error('No data to export');
      }

      console.log(`✅ Found ${data.length} members for export`);
      
      // Transform the data if needed
      let exportData = [...data];
      
      // Remove sensitive data if not requested
      if (!includeSensitive) {
        console.log('🔒 Excluding sensitive data from export');
        exportData = exportData.map(member => {
          const { login_pin, auth_user_id, ...memberWithoutSensitive } = member as any;
          return memberWithoutSensitive;
        });
      }
      
      let blob: Blob;
      let fileName: string;
      const timestamp = new Date().toISOString().split('T')[0];
      
      if (format.toLowerCase() === 'excel' || format.toLowerCase() === 'xlsx') {
        try {
          // Try to use SheetJS if available
          blob = await exportToExcel(exportData, includeSensitive);
          fileName = `church-members-${timestamp}.xlsx`;
        } catch (excelError) {
          console.warn('⚠️ Excel export failed, falling back to CSV:', excelError);
          // Fallback to CSV
          const csvContent = convertToCSV(exportData);
          const BOM = '\uFEFF';
          blob = new Blob([BOM + csvContent], { 
            type: 'text/csv;charset=utf-8;' 
          });
          fileName = `church-members-${timestamp}.csv`;
        }
      } else {
        // CSV export
        const csvContent = convertToCSV(exportData);
        const BOM = '\uFEFF'; // Byte Order Mark for Excel compatibility
        blob = new Blob([BOM + csvContent], { 
          type: 'text/csv;charset=utf-8;' 
        });
        fileName = `church-members-${timestamp}.csv`;
      }
      
      // Log audit event
      await logAuditEvent(
        'EXPORT',
        'members',
        `export-${Date.now()}`,
        null,
        {
          format,
          includeSensitive,
          recordCount: data.length,
          timestamp: new Date().toISOString()
        }
      );
      
      console.log('✅ Export completed successfully');
      console.log(`📁 File: ${fileName}, Size: ${blob.size} bytes`);
      
      // Return both blob and filename
      return blob;
    } catch (error) {
      console.error('❌ Error exporting data:', error);
      throw error;
    }
  },

  async importData(
    file: File, 
    options: { updateExisting: boolean; createMissing: boolean },
    fieldMapping: ImportFieldMapping,
    cellGroups: Group[]
  ): Promise<{ success: number; errors: number; errorMessages: string[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const rows = content.split('\n').filter(row => row.trim() !== '');
          
          if (rows.length === 0) {
            reject(new Error('The uploaded file is empty. Please upload a CSV file with data.'));
            return;
          }

          const headerRow = rows[0];
          const headers = parseCSVRow(headerRow).map(col => col.replace(/^"|"$/g, '').trim());
          
          // Validate that we have headers
          if (headers.length === 0 || headers.every(h => !h.trim())) {
            reject(new Error('File has no valid headers. Please check your file format.'));
            return;
          }

          const errorMessages: string[] = [];
          let success = 0;
          let errors = 0;

          console.log(`📥 Importing ${rows.length - 1} rows from file...`);

          // First, create a map of cell group names to IDs for faster lookup
          const cellGroupMap = new Map<string, string>();
          cellGroups.forEach(group => {
            if (group.type === 'cell_group') {
              cellGroupMap.set(group.name.toLowerCase(), group.id);
            }
          });

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row.trim()) continue;
            
            const columns = parseCSVRow(row).map(col => col.replace(/^"|"$/g, '').trim());
            
            try {
              // Map CSV columns to database fields
              const memberData: any = {
                status: 'newcomer',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                first_time_visit_date: new Date().toISOString(),
                is_permanent_member: false,
                is_leader: false,
                is_hidden: false,
                is_developer: false,
                is_admin: false,
                assigned_groups: [],
                assigned_departments: [],
                permissions: [],
                can_add_members: false,
                can_edit_members: false,
                can_view_own_data: false,
                pastor_role: false,
                deacon_role: false,
                group_leader: false,
                department_leader: false,
                admin_role: 'member'
              };
              
              let cellGroupValue = '';
              
              // Process each mapped field
              for (const csvHeader of headers) {
                const dbField = fieldMapping[csvHeader];
                if (dbField) {
                  const columnIndex = headers.indexOf(csvHeader);
                  if (columnIndex >= 0 && columnIndex < columns.length) {
                    const value = columns[columnIndex];
                    
                    // Skip empty values for non-required fields
                    if (!value && !['surname', 'name'].includes(dbField)) {
                      continue;
                    }

                    switch (dbField) {
                      case 'surname':
                        memberData.surname = value.trim();
                        break;
                      case 'name':
                        memberData.name = value.trim();
                        break;
                      case 'residence':
                        memberData.residence = value.trim();
                        break;
                      case 'phone':
                        memberData.phone = value.trim();
                        break;
                      case 'cell_group':
                        cellGroupValue = value.trim();
                        break;
                      case 'gender':
                        const genderValue = value.toLowerCase().trim();
                        if (genderValue === 'male' || genderValue === 'female') {
                          memberData.gender = genderValue;
                        } else if (value.trim()) {
                          throw new Error(`Gender must be "Male" or "Female", got "${value}"`);
                        }
                        break;
                      case 'baptism':
                        if (value.trim()) {
                          const parsedDate = new Date(value);
                          if (!isNaN(parsedDate.getTime())) {
                            memberData.baptism = parsedDate.toISOString();
                          } else {
                            throw new Error(`Invalid baptism date format: "${value}". Use YYYY-MM-DD format.`);
                          }
                        }
                        break;
                      case 'is_permanent_member':
                        memberData.is_permanent_member = value.toLowerCase().trim() === 'true' || 
                                                        value.toLowerCase().trim() === 'yes' || 
                                                        value === '1';
                        break;
                      case 'is_leader':
                        memberData.is_leader = value.toLowerCase().trim() === 'true' || 
                                              value.toLowerCase().trim() === 'yes' || 
                                              value === '1';
                        break;
                      case 'status':
                        const validStatuses = ['newcomer', 'active', 'inactive', 'not_attending'];
                        if (validStatuses.includes(value.toLowerCase().trim())) {
                          memberData.status = value.toLowerCase().trim();
                        } else if (value.trim()) {
                          throw new Error(`Invalid status: "${value}". Must be one of: ${validStatuses.join(', ')}`);
                        }
                        break;
                    }
                  }
                }
              }

              // Handle cell group after all fields are processed
              if (cellGroupValue) {
                let cellGroupId = cellGroupMap.get(cellGroupValue.toLowerCase());
                
                if (!cellGroupId) {
                  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                  if (uuidPattern.test(cellGroupValue)) {
                    const matchingGroup = cellGroups.find(g => 
                      g.type === 'cell_group' && g.id === cellGroupValue
                    );
                    if (matchingGroup) {
                      cellGroupId = matchingGroup.id;
                    }
                  }
                }
                
                if (cellGroupId) {
                  memberData.cell_group_id = cellGroupId;
                } else {
                  throw new Error(`Cell group "${cellGroupValue}" not found. Please create it first or check spelling.`);
                }
              }

              // Validate required fields
              if (!memberData.name || !memberData.surname || !memberData.residence) {
                const missingFields = [];
                if (!memberData.name) missingFields.push('name');
                if (!memberData.surname) missingFields.push('surname');
                if (!memberData.residence) missingFields.push('residence');
                
                throw new Error(`Missing required fields: ${missingFields.join(', ')}. These fields are required in the database.`);
              }

              // Check if member exists (by name, surname, and phone if available)
              let existingMemberId: string | null = null;
              if (options.updateExisting) {
                const query = supabase
                  .from('members')
                  .select('id')
                  .eq('name', memberData.name)
                  .eq('surname', memberData.surname);
                
                if (memberData.phone) {
                  query.eq('phone', memberData.phone);
                }
                
                const { data: existingMembers, error: findError } = await query.limit(1);

                if (!findError && existingMembers && existingMembers.length > 0) {
                  existingMemberId = existingMembers[0].id;
                }
              }

              if (existingMemberId) {
                console.log(`🔄 Updating existing member: ${memberData.name} ${memberData.surname}`);
                const { error: updateError } = await supabase
                  .from('members')
                  .update(memberData)
                  .eq('id', existingMemberId);

                if (!updateError) {
                  success++;
                } else {
                  errorMessages.push(`Row ${i}: Failed to update member "${memberData.name} ${memberData.surname}" - ${updateError.message}`);
                  errors++;
                }
              } else if (options.createMissing) {
                console.log(`➕ Creating new member: ${memberData.name} ${memberData.surname}`);
                const { error: insertError } = await supabase
                  .from('members')
                  .insert(memberData);

                if (!insertError) {
                  success++;
                } else {
                  errorMessages.push(`Row ${i}: Failed to create new member "${memberData.name} ${memberData.surname}" - ${insertError.message}`);
                  errors++;
                }
              } else {
                errorMessages.push(`Row ${i}: Member "${memberData.name} ${memberData.surname}" not found and "Create missing members" is disabled`);
                errors++;
              }
            } catch (rowError) {
              const errorMsg = rowError instanceof Error ? rowError.message : 'Unknown error';
              errorMessages.push(`Row ${i}: ${errorMsg}`);
              errors++;
              console.error('❌ Error processing row:', rowError);
            }
          }

          // Log audit event for import
          if (success > 0) {
            await logAuditEvent(
              'IMPORT',
              'members',
              `import-${Date.now()}`,
              null,
              {
                successCount: success,
                errorCount: errors,
                fileName: file.name,
                options
              }
            );
          }

          resolve({ success, errors, errorMessages });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read the file. Please make sure it is a valid file.'));
      reader.readAsText(file);
    });
  },

  async runBackup(): Promise<void> {
    try {
      console.log('💾 Running backup...');
      const { error } = await supabase
        .from('backups' as any)
        .insert({
          created_at: new Date().toISOString(),
          status: 'completed',
          size: '0 MB',
          type: 'manual'
        });

      if (error && !error.message.includes('does not exist')) {
        throw error;
      }
      
      await logAuditEvent(
        'BACKUP',
        'system',
        `backup-${Date.now()}`
      );
      
    } catch (error) {
      console.error('❌ Error running backup:', error);
      throw error;
    }
  },

  async getSystemStats(): Promise<any> {
    try {
      console.log('📊 Getting system stats...');
      const [
        membersCount,
        groupsCount,
        storageInfo,
        auditLogsCount,
        activeSessions
      ] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('cell_groups').select('*', { count: 'exact', head: true }),
        this.getStorageInfo(),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
        supabase.from('audit_logs')
          .select('user_id')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .then(res => new Set(res.data?.map(log => log.user_id) || []).size)
      ]);

      return {
        total_members: membersCount.count || 0,
        total_groups: groupsCount.count || 0,
        total_backups: 0,
        storage_used: storageInfo.used_storage,
        storage_total: storageInfo.total_storage,
        storage_percentage: storageInfo.usage_percentage,
        audit_logs_count: auditLogsCount.count || 0,
        active_users_last_24h: activeSessions || 0,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error fetching system stats:', error);
      return {
        total_members: 0,
        total_groups: 0,
        total_backups: 0,
        storage_used: 0,
        storage_total: 0,
        storage_percentage: 0,
        audit_logs_count: 0,
        active_users_last_24h: 0,
        last_updated: new Date().toISOString()
      };
    }
  },

  async getStorageInfo(): Promise<StorageInfo> {
    try {
      const { data: dbSize, error: dbError } = await supabase
        .from('members')
        .select('*');

      if (dbError) throw dbError;

      const memberCount = dbSize?.length || 0;
      const estimatedSizePerMember = 1024;
      const usedStorage = memberCount * estimatedSizePerMember;
      const totalStorage = 100 * 1024 * 1024;
      const availableStorage = totalStorage - usedStorage;
      const usagePercentage = (usedStorage / totalStorage) * 100;

      return {
        total_storage: totalStorage,
        used_storage: usedStorage,
        available_storage: availableStorage,
        usage_percentage: usagePercentage
      };
    } catch (error) {
      console.error('❌ Error calculating storage info:', error);
      return {
        total_storage: 100 * 1024 * 1024,
        used_storage: 0,
        available_storage: 100 * 1024 * 1024,
        usage_percentage: 0
      };
    }
  },

  async cleanupOldData(): Promise<{ deleted: number }> {
    try {
      console.log('🧹 Cleaning up old data...');
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { error, count } = await supabase
        .from('members')
        .delete()
        .eq('status', 'not_attending' as any)
        .lt('updated_at', oneYearAgo.toISOString() as any);

      if (error) throw error;

      if (count && count > 0) {
        await logAuditEvent(
          'CLEANUP',
          'members',
          `cleanup-${Date.now()}`
        );
      }

      return { deleted: count || 0 };
    } catch (error) {
      console.error('❌ Error cleaning up old data:', error);
      throw error;
    }
  }
};

// Modal wrapper component
const Modal = ({ children, title, onClose, size = 'max-w-4xl' }: { 
  children: React.ReactNode; 
  title: string; 
  onClose: () => void;
  size?: string;
}) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className={`bg-white rounded-2xl ${size} w-full max-h-[90vh] overflow-y-auto shadow-2xl`}>
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

  const [, setSystemConfig] = useState<SystemConfig | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importOptions, setImportOptions] = useState({
    updateExisting: true,
    createMissing: true
  });
  const [importResults, setImportResults] = useState<{ success: number; errors: number; errorMessages: string[] } | null>(null);
  const [importFieldMapping, setImportFieldMapping] = useState<ImportFieldMapping>({});
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [showImportMapping, setShowImportMapping] = useState(false);
  const [importProgress, setImportProgress] = useState<{current: number; total: number} | null>(null);
  const [auditLogFilter, setAuditLogFilter] = useState<string>('all');
  const [searchAuditTerm, setSearchAuditTerm] = useState('');
  const [importPreviewData, setImportPreviewData] = useState<ImportPreviewRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [currentImportRow, setCurrentImportRow] = useState(0);
  const [importStatusMessage, setImportStatusMessage] = useState('');
  const [exportFormat, setExportFormat] = useState<string>('csv');
  const [exportIncludeSensitive, setExportIncludeSensitive] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState(false);

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

  useEffect(() => {
    if (profile?.id) {
      (window as any).currentUserId = profile.id;
    }
  }, [profile]);

  // Modified admin sections
  const adminSections = [
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
    }
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
    { value: 'admin_access', label: 'Admin Access', description: 'Full system administration' },
  ];

  // Database fields for import mapping
  const databaseFields = [
    { value: 'surname', label: 'Surname', required: true, description: 'Last name of the member (Required)' },
    { value: 'name', label: 'Name', required: true, description: 'First name of the member (Required)' },
    { value: 'residence', label: 'Residence', required: true, description: 'Address or location (Required)' },
    { value: 'phone', label: 'Phone', required: false, description: 'Phone number' },
    { value: 'cell_group', label: 'Cell Group', required: false, description: 'Cell group name (must match existing group)' },
    { value: 'gender', label: 'Gender', required: false, description: 'Male or Female' },
    { value: 'baptism', label: 'Baptism Date', required: false, description: 'Date format: YYYY-MM-DD' },
    { value: 'is_permanent_member', label: 'Permanent Member', required: false, description: 'true/false or yes/no' },
    { value: 'is_leader', label: 'Is Leader', required: false, description: 'true/false or yes/no' },
    { value: 'status', label: 'Status', required: false, description: 'newcomer, active, inactive, or not_attending' }
  ];

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    console.log('🔄 Loading data...');
    
    try {
      const [membersData, groupsData, systemData, securityData, statsData] = await Promise.all([
        cloudService.getMembers(),
        cloudService.getGroups(),
        cloudService.getSystemConfig(),
        cloudService.getSecuritySettings(),
        cloudService.getSystemStats()
      ]);
      
      console.log('✅ Data loaded successfully:', {
        membersCount: membersData.length,
        groupsCount: groupsData.length,
        cellGroups: groupsData.filter(g => g.type === 'cell_group').length,
        departments: groupsData.filter(g => g.type === 'department').length,
        stats: statsData
      });

      setMembers(membersData);
      setGroups(groupsData);
      setSystemConfig(systemData);
      setSecuritySettings(securityData);
      setSystemStats(statsData);
      
      if (profile) {
        await logAuditEvent(
          'ACCESS',
          'admin_panel',
          profile.id
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      console.error('❌ Error loading data:', {
        error: err,
        message: errorMessage
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

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
        status: null,
        created_at: null,
        residence: profile.residence || '',
        gender: null,
        baptism: null,
        ministry_group_id: null,
        is_permanent_member: false,
        permanent_member_date: null,
        invited_by: null,
        first_time_visit_date: null,
        is_leader: false,
        is_hidden: false,
        is_developer: false,
        is_admin: false,
        auth_user_id: null
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

  const openModal = async (modalType: string, user?: Member) => {
    if (!profile) return;

    const currentUser: Member = {
      id: profile.id,
      name: profile.name || '',
      surname: profile.surname || '',
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
      status: null,
      created_at: null,
      residence: profile.residence || '',
      gender: null,
      baptism: null,
      ministry_group_id: null,
      is_permanent_member: false,
      permanent_member_date: null,
      invited_by: null,
      first_time_visit_date: null,
      is_leader: false,
      is_hidden: false,
      is_developer: false,
      is_admin: false,
      auth_user_id: null
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

    await logAuditEvent(
      'VIEW',
      'modal',
      user?.id || 'none'
    );

    if (user) {
      console.log('👤 Opening user modal:', {
        userId: user.id,
        userName: `${user.name} ${user.surname}`,
        currentRoles: getRolesFromMember(user),
        assignedGroups: user.assigned_groups,
        assignedDepartments: user.assigned_departments,
        permissions: user.permissions
      });

      setSelectedUser(user);
      const userRoles = getRolesFromMember(user);
      
      const cleanedGroups = cleanUUIDArray(user.assigned_groups || []);
      const cleanedDepartments = cleanUUIDArray(user.assigned_departments || []);
      
      setUserFormData({
        roles: userRoles,
        permissions: user.permissions || [],
        assigned_groups: cleanedGroups,
        assigned_departments: cleanedDepartments,
        can_add_members: user.can_add_members || false,
        can_edit_members: user.can_edit_members || false,
        can_view_own_data: user.can_view_own_data || false,
        login_username: user.login_username || '',
        login_pin: user.login_pin || ''
      });
      
      setShowCredentials(false);
      setGeneratedCredentials(null);
    }

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
    setImportFile(null);
    setImportResults(null);
    setImportFieldMapping({});
    setCsvHeaders([]);
    setShowImportMapping(false);
    setImportProgress(null);
    setImportPreviewData([]);
    setIsImporting(false);
    setCurrentImportRow(0);
    setImportStatusMessage('');
    setExportFormat('csv');
    setExportIncludeSensitive(false);
    setIsExporting(false);
  };

  // FIXED: Enhanced export function with proper file download
  const handleExportData = async () => {
    setIsExporting(true);
    setError(null);
    
    try {
      const blob = await cloudService.exportData(exportFormat, exportIncludeSensitive);
      
      // Determine file extension based on format
      const extension = exportFormat.toLowerCase() === 'excel' || exportFormat.toLowerCase() === 'xlsx' ? 'xlsx' : 'csv';
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `church-members-${timestamp}.${extension}`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Show success message
      alert(`✅ Data exported successfully!\nFile: ${fileName}\nFormat: ${exportFormat.toUpperCase()}\nRecords: ${members.length}`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export data';
      setError(`Export failed: ${errorMessage}`);
      console.error('❌ Error exporting data:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpdateSecuritySettings = async () => {
    if (!securitySettings) return;
    
    setLoading(true);
    try {
      await cloudService.updateSecuritySettings(securitySettings);
      setError(null);
      alert('Security settings updated successfully!');
    } catch (err) {
      setError('Failed to update security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleImportData = async () => {
    if (!importFile) {
      setError('Please select a file to import');
      return;
    }

    setIsImporting(true);
    setError(null);
    setImportStatusMessage('Starting import...');
    
    try {
      const rows = importPreviewData.filter(row => row.errors.length === 0);
      setImportProgress({ current: 0, total: rows.length });
      
      let success = 0;
      let errors = 0;
      const errorMessages: string[] = [];
      
      const cellGroupMap = new Map<string, string>();
      groups.forEach(group => {
        if (group.type === 'cell_group') {
          cellGroupMap.set(group.name.toLowerCase(), group.id);
        }
      });
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setCurrentImportRow(i + 1);
        setImportStatusMessage(`Processing row ${i + 1} of ${rows.length}: ${row.mappedData.name} ${row.mappedData.surname}`);
        setImportProgress({ current: i + 1, total: rows.length });
        
        setImportPreviewData(prev => prev.map(r => 
          r.index === row.index ? { ...r, status: 'processing' } : r
        ));
        
        try {
          const memberData = { ...row.mappedData };
          
          if (memberData.cell_group) {
            let cellGroupId = cellGroupMap.get(memberData.cell_group.toLowerCase());
            
            if (!cellGroupId) {
              const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              if (uuidPattern.test(memberData.cell_group)) {
                const matchingGroup = groups.find(g => 
                  g.type === 'cell_group' && g.id === memberData.cell_group
                );
                if (matchingGroup) {
                  cellGroupId = matchingGroup.id;
                }
              }
            }
            
            if (cellGroupId) {
              memberData.cell_group_id = cellGroupId;
            } else {
              throw new Error(`Cell group "${memberData.cell_group}" not found`);
            }
            delete memberData.cell_group;
          }

          let existingMemberId: string | null = null;
          if (importOptions.updateExisting) {
            const query = supabase
              .from('members')
              .select('id')
              .eq('name', memberData.name)
              .eq('surname', memberData.surname);
            
            if (memberData.phone) {
              query.eq('phone', memberData.phone);
            }
            
            const { data: existingMembers, error: findError } = await query.limit(1);

            if (!findError && existingMembers && existingMembers.length > 0) {
              existingMemberId = existingMembers[0].id;
            }
          }

          if (existingMemberId) {
            const { error: updateError } = await supabase
              .from('members')
              .update(memberData)
              .eq('id', existingMemberId);

            if (!updateError) {
              success++;
              setImportPreviewData(prev => prev.map(r => 
                r.index === row.index ? { ...r, status: 'success' } : r
              ));
            } else {
              throw new Error(`Update failed: ${updateError.message}`);
            }
          } else if (importOptions.createMissing) {
            const { error: insertError } = await supabase
              .from('members')
              .insert([memberData as any]);

            if (!insertError) {
              success++;
              setImportPreviewData(prev => prev.map(r => 
                r.index === row.index ? { ...r, status: 'success' } : r
              ));
            } else {
              throw new Error(`Create failed: ${insertError.message}`);
            }
          } else {
            throw new Error('Member not found and "Create missing members" is disabled');
          }
        } catch (rowError) {
          const errorMsg = rowError instanceof Error ? rowError.message : 'Unknown error';
          errorMessages.push(`Row ${row.index}: ${errorMsg}`);
          errors++;
          setImportPreviewData(prev => prev.map(r => 
            r.index === row.index ? { ...r, status: 'error', errors: [errorMsg] } : r
          ));
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (success > 0) {
        await logAuditEvent(
          'IMPORT',
          'members',
          `import-${Date.now()}`
        );
      }

      setImportResults({ success, errors, errorMessages });
      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import data';
      setError(`Import failed: ${errorMessage}. Please check your CSV format and field mappings.`);
      console.error('❌ Import error:', err);
    } finally {
      setIsImporting(false);
      setImportStatusMessage('');
    }
  };

  const handleCleanupData = async () => {
    if (!confirm('Are you sure you want to cleanup old data? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const result = await cloudService.cleanupOldData();
      alert(`Successfully deleted ${result.deleted} inactive members.`);
      await loadData();
    } catch (err) {
      setError('Failed to cleanup data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setImportFile(null);
    setImportResults(null);
    setImportFieldMapping({});
    setCsvHeaders([]);
    setShowImportMapping(false);
    setImportPreviewData([]);
    setError(null);
    setLoading(true);

    const fileExtension = file.name.toLowerCase().split('.').pop();
    const validExtensions = ['csv', 'xlsx', 'xls'];
    
    if (!validExtensions.includes(fileExtension || '')) {
      setError('Please upload a CSV or Excel file. Only .csv, .xlsx, and .xls files are supported.');
      setLoading(false);
      return;
    }

    // Increased limit to 50MB for large Excel files
    if (file.size > 50 * 1024 * 1024) {
      setError('File is too large. Maximum size is 50MB.');
      setLoading(false);
      return;
    }

    try {
      console.log(`📂 Processing ${fileExtension?.toUpperCase()} file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      
      // Use the new Excel/CSV reader
      const { headers, data } = await readExcelOrCsvFile(file);
      
      if (headers.length === 0 || headers.every(h => !h.trim())) {
        setError('File has no valid headers. Please check your file format.');
        setLoading(false);
        return;
      }

      if (data.length === 0) {
        setError('File has no data rows. Please upload a file with data.');
        setLoading(false);
        return;
      }

      console.log(`✅ Parsed ${data.length} rows with ${headers.length} columns`);

      setCsvHeaders(headers);
      setImportFile(file);
      setShowImportMapping(true);
      
      // Auto-mapping logic
      const autoMapping: ImportFieldMapping = {};
      headers.forEach(header => {
        const headerLower = header.toLowerCase();
        
        if (headerLower.includes('surname') || headerLower.includes('last')) {
          autoMapping[header] = 'surname';
        } else if (headerLower.includes('name') || headerLower.includes('first')) {
          autoMapping[header] = 'name';
        } else if (headerLower.includes('residence') || headerLower.includes('address') || headerLower.includes('location')) {
          autoMapping[header] = 'residence';
        } else if (headerLower.includes('phone') || headerLower.includes('mobile') || headerLower.includes('contact') || headerLower.includes('tel')) {
          autoMapping[header] = 'phone';
        } else if (headerLower.includes('cell') || headerLower.includes('group')) {
          autoMapping[header] = 'cell_group';
        } else if (headerLower.includes('gender') || headerLower.includes('sex')) {
          autoMapping[header] = 'gender';
        } else if (headerLower.includes('baptism') || headerLower.includes('baptised') || headerLower.includes('baptized')) {
          autoMapping[header] = 'baptism';
        } else if (headerLower.includes('permanent') && headerLower.includes('member')) {
          autoMapping[header] = 'is_permanent_member';
        } else if (headerLower.includes('leader')) {
          autoMapping[header] = 'is_leader';
        } else if (headerLower.includes('status')) {
          autoMapping[header] = 'status';
        }
      });
      
      setImportFieldMapping(autoMapping);
      
      // Generate preview with all data rows (supporting 1000+ rows)
      generateImportPreviewFromData(data, headers, autoMapping);
      
      const requiredFields = ['surname', 'name', 'residence'];
      const missingRequired = requiredFields.filter(field => !Object.values(autoMapping).includes(field));
      
      if (missingRequired.length > 0) {
        setError(`Warning: Could not auto-detect required fields: ${missingRequired.join(', ')}. Please map them manually.`);
      } else {
        console.log(`✅ Successfully mapped ${Object.keys(autoMapping).length} fields`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse file';
      setError(`Failed to parse file: ${errorMessage}`);
      console.error('❌ File parsing error:', err);
    } finally {
      setLoading(false);
    }
  };

  // New function to generate preview from parsed data (supports 1000+ rows)
  const generateImportPreviewFromData = (data: string[][], headers: string[], mapping: ImportFieldMapping) => {
    const previewData: ImportPreviewRow[] = [];
    
    // Process ALL rows (not just 20) - show first 50 in preview but keep all for import
    const totalRows = data.length;
    console.log(`📊 Processing ${totalRows} data rows for import`);
    
    for (let i = 0; i < totalRows; i++) {
      const columns = data[i];
      if (!columns || columns.every(c => !c.trim())) continue; // Skip empty rows
      
      const rawData: { [key: string]: string } = {};
      const mappedData: any = {
        status: 'newcomer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        first_time_visit_date: new Date().toISOString(),
        is_permanent_member: false,
        is_leader: false,
        is_hidden: false,
        is_developer: false,
        is_admin: false,
        assigned_groups: [],
        assigned_departments: [],
        permissions: [],
        can_add_members: false,
        can_edit_members: false,
        can_view_own_data: false,
        pastor_role: false,
        deacon_role: false,
        group_leader: false,
        department_leader: false,
        admin_role: 'member'
      };
      
      const errors: string[] = [];
      
      headers.forEach((header, idx) => {
        rawData[header] = columns[idx] || '';
      });
      
      for (const csvHeader of headers) {
        const dbField = mapping[csvHeader];
        if (dbField && rawData[csvHeader]) {
          const value = rawData[csvHeader];
          
          try {
            switch (dbField) {
              case 'surname':
                mappedData.surname = value.trim();
                break;
              case 'name':
                mappedData.name = value.trim();
                break;
              case 'residence':
                mappedData.residence = value.trim();
                break;
              case 'phone':
                mappedData.phone = value.trim();
                break;
              case 'cell_group':
                mappedData.cell_group = value.trim();
                break;
              case 'gender':
                const genderValue = value.toLowerCase().trim();
                if (genderValue === 'male' || genderValue === 'female' || genderValue === 'm' || genderValue === 'f') {
                  mappedData.gender = genderValue === 'm' ? 'male' : genderValue === 'f' ? 'female' : genderValue;
                } else if (value.trim()) {
                  errors.push(`Invalid gender: "${value}". Must be "Male" or "Female"`);
                }
                break;
              case 'baptism':
                if (value.trim()) {
                  const baptismDate = new Date(value);
                  if (!isNaN(baptismDate.getTime())) {
                    mappedData.baptism = baptismDate.toISOString();
                  } else {
                    errors.push(`Invalid baptism date: "${value}"`);
                  }
                }
                break;
              case 'is_permanent_member':
                mappedData.is_permanent_member = value.toLowerCase().trim() === 'true' || 
                                                value.toLowerCase().trim() === 'yes' || 
                                                value === '1';
                break;
              case 'is_leader':
                mappedData.is_leader = value.toLowerCase().trim() === 'true' || 
                                      value.toLowerCase().trim() === 'yes' || 
                                      value === '1';
                break;
              case 'status':
                const validStatuses = ['newcomer', 'active', 'inactive', 'not_attending', 'member', 'permanent'];
                const statusValue = value.toLowerCase().trim().replace(/\s+/g, '_');
                if (validStatuses.includes(statusValue)) {
                  mappedData.status = statusValue;
                } else if (value.trim()) {
                  errors.push(`Invalid status: "${value}". Will default to "newcomer"`);
                  mappedData.status = 'newcomer';
                }
                break;
            }
          } catch (error) {
            errors.push(`Error processing ${dbField}: ${error}`);
          }
        }
      }
      
      if (!mappedData.name || !mappedData.surname || !mappedData.residence) {
        const missingFields = [];
        if (!mappedData.name) missingFields.push('name');
        if (!mappedData.surname) missingFields.push('surname');
        if (!mappedData.residence) missingFields.push('residence');
        
        errors.push(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      previewData.push({
        index: i + 1, // 1-based index for display
        rawData,
        mappedData,
        errors,
        status: 'pending'
      });
    }
    
    console.log(`✅ Prepared ${previewData.length} rows for import (${previewData.filter(r => r.errors.length === 0).length} valid)`);
    setImportPreviewData(previewData);
  };

  // Old generateImportPreview removed - using generateImportPreviewFromData instead

  const handleGenerateCredentials = async () => {
    if (!selectedUser) return;
    
    const currentUser: Member = {
      id: profile!.id,
      name: profile!.name || '',
      surname: profile!.surname || '',
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
      status: null,
      created_at: null,
      residence: profile!.residence || '',
      gender: null,
      baptism: null,
      ministry_group_id: null,
      is_permanent_member: false,
      permanent_member_date: null,
      invited_by: null,
      first_time_visit_date: null,
      is_leader: false,
      is_hidden: false,
      is_developer: false,
      is_admin: false,
      auth_user_id: null
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
      
      await logAuditEvent(
        'GENERATE_CREDENTIALS',
        'member',
        selectedUser.id
      );
      
      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate credentials';
      setError(errorMessage);
      console.error('❌ Error generating credentials:', err);
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
      status: null,
      created_at: null,
      residence: profile.residence || '',
      gender: null,
      baptism: null,
      ministry_group_id: null,
      is_permanent_member: false,
      permanent_member_date: null,
      invited_by: null,
      first_time_visit_date: null,
      is_leader: false,
      is_hidden: false,
      is_developer: false,
      is_admin: false,
      auth_user_id: null
    };

    if (!isAdminOrPastor(currentUser) && !hasPermission(profile.permissions || [], 'edit_members')) {
      setError('You do not have permission to update users');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const roleUpdates = setRolesToMember(userFormData.roles);

      const cleanedAssignedGroups = cleanUUIDArray(userFormData.assigned_groups);
      const cleanedAssignedDepartments = cleanUUIDArray(userFormData.assigned_departments);

      console.log('📝 Updating user:', {
        userId: selectedUser.id,
        userName: `${selectedUser.name} ${selectedUser.surname}`,
        roles: userFormData.roles,
        originalAssignedGroups: userFormData.assigned_groups,
        cleanedAssignedGroups: cleanedAssignedGroups,
        originalAssignedDepartments: userFormData.assigned_departments,
        cleanedAssignedDepartments: cleanedAssignedDepartments,
        permissions: userFormData.permissions,
        roleUpdates: roleUpdates
      });

      const updatedMember = await cloudService.updateMember(selectedUser.id, {
        ...roleUpdates,
        permissions: userFormData.permissions,
        assigned_groups: cleanedAssignedGroups,
        assigned_departments: cleanedAssignedDepartments,
        can_add_members: userFormData.can_add_members,
        can_edit_members: userFormData.can_edit_members,
        can_view_own_data: userFormData.can_view_own_data,
        login_username: userFormData.login_username || null,
        login_pin: userFormData.login_pin || null
      });

      console.log('✅ User updated successfully:', {
        userId: updatedMember.id,
        assignedGroups: updatedMember.assigned_groups,
        assignedDepartments: updatedMember.assigned_departments
      });

      await logAuditEvent(
        'UPDATE',
        'member',
        selectedUser.id
      );

      setMembers(prev => prev.map(m => 
        m.id === selectedUser.id ? updatedMember : m
      ));
      
      alert('User updated successfully!');
      closeModal();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      console.error('❌ Error updating user:', {
        error: err,
        message: errorMessage,
        userId: selectedUser.id
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permission: string) => {
    setUserFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const handleGroupToggle = (groupId: string) => {
    console.log('🔄 Toggling group:', {
      groupId,
      currentGroups: userFormData.assigned_groups,
      isSelected: userFormData.assigned_groups.includes(groupId)
    });

    setUserFormData(prev => {
      const newGroups = prev.assigned_groups.includes(groupId)
        ? prev.assigned_groups.filter(g => g !== groupId)
        : [...prev.assigned_groups, groupId];
      
      const cleanedGroups = cleanUUIDArray(newGroups);
      
      console.log('✅ Groups updated:', {
        before: prev.assigned_groups,
        after: cleanedGroups,
        added: !prev.assigned_groups.includes(groupId),
        groupId
      });

      return {
        ...prev,
        assigned_groups: cleanedGroups
      };
    });
  };

  const handleDepartmentToggle = (deptId: string) => {
    console.log('🔄 Toggling department:', {
      deptId,
      currentDepartments: userFormData.assigned_departments,
      isSelected: userFormData.assigned_departments.includes(deptId)
    });

    setUserFormData(prev => {
      const newDepartments = prev.assigned_departments.includes(deptId)
        ? prev.assigned_departments.filter(d => d !== deptId)
        : [...prev.assigned_departments, deptId];
      
      const cleanedDepartments = cleanUUIDArray(newDepartments);
      
      console.log('✅ Departments updated:', {
        before: prev.assigned_departments,
        after: cleanedDepartments,
        added: !prev.assigned_departments.includes(deptId),
        deptId
      });

      return {
        ...prev,
        assigned_departments: cleanedDepartments
      };
    });
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

  const getFilteredMembers = () => {
    let filtered = members;
    if (searchTerm) {
      filtered = filtered.filter(member =>
        `${member.name} ${member.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.phone && member.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (member.residence && member.residence.toLowerCase().includes(searchTerm.toLowerCase())) ||
        getRolesFromMember(member).some(role => role.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (!profile) return [];

    const currentUser: Member = {
      id: profile.id,
      name: profile.name || '',
      surname: profile.surname || '',
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
      status: null,
      created_at: null,
      residence: profile.residence || '',
      gender: null,
      baptism: null,
      ministry_group_id: null,
      is_permanent_member: false,
      permanent_member_date: null,
      invited_by: null,
      first_time_visit_date: null,
      is_leader: false,
      is_hidden: false,
      is_developer: false,
      is_admin: false,
      auth_user_id: null
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

  const getFilteredAuditLogs = () => {
    let filtered = auditLogs;

    const now = new Date();
    switch (auditLogFilter) {
      case 'today':
        filtered = filtered.filter(log => {
          if (!log.created_at) return false;
          const logDate = new Date(log.created_at);
          return logDate.toDateString() === now.toDateString();
        });
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(log => log.created_at ? new Date(log.created_at) >= weekAgo : false);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(log => log.created_at ? new Date(log.created_at) >= monthAgo : false);
        break;
    }

    if (searchAuditTerm) {
      const searchLower = searchAuditTerm.toLowerCase();
      filtered = filtered.filter(log =>
        (log.action || '').toLowerCase().includes(searchLower) ||
        (log.table_name || '').toLowerCase().includes(searchLower) ||
        log.user_name?.toLowerCase().includes(searchLower) ||
        log.user_surname?.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.new_data).toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  const filteredAuditLogs = getFilteredAuditLogs();

  // Updated DataManagementModal with improved export section
  const DataManagementModal = () => (
    <Modal title="Data Management" onClose={closeModal} size="max-w-7xl">
      <div className="space-y-6">
        {/* Storage Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Storage Information</h3>
          {systemStats && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Storage Used</span>
                  <span>{formatBytes(systemStats.storage_used)} of {formatBytes(systemStats.storage_total)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${systemStats.storage_percentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {systemStats.storage_percentage.toFixed(1)}% used
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded-lg border text-center">
                  <div className="text-lg font-bold text-blue-600">{systemStats.total_members}</div>
                  <div className="text-xs text-gray-600">Members</div>
                </div>
                <div className="bg-white p-3 rounded-lg border text-center">
                  <div className="text-lg font-bold text-green-600">{systemStats.total_groups}</div>
                  <div className="text-xs text-gray-600">Groups</div>
                </div>
                <div className="bg-white p-3 rounded-lg border text-center">
                  <div className="text-lg font-bold text-purple-600">{systemStats.total_backups}</div>
                  <div className="text-xs text-gray-600">Backups</div>
                </div>
                <div className="bg-white p-3 rounded-lg border text-center">
                  <div className="text-lg font-bold text-orange-600">{formatBytes(systemStats.storage_used)}</div>
                  <div className="text-xs text-gray-600">Used</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Export Data - IMPROVED SECTION */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </h3>
          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Export Format
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${exportFormat === 'csv' ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${exportFormat === 'csv' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">CSV Format</div>
                      <div className="text-xs text-gray-500">Compatible with Excel, Numbers, Google Sheets</div>
                    </div>
                  </div>
                  <input 
                    type="radio" 
                    name="format" 
                    value="csv" 
                    checked={exportFormat === 'csv'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                
                <label className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${exportFormat === 'excel' ? 'bg-green-50 border-green-300' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${exportFormat === 'excel' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Excel Format</div>
                      <div className="text-xs text-gray-500">Native Excel format (.xlsx) - requires SheetJS</div>
                    </div>
                  </div>
                  <input 
                    type="radio" 
                    name="format" 
                    value="excel" 
                    checked={exportFormat === 'excel'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-5 h-5 text-green-600 focus:ring-2 focus:ring-green-500"
                  />
                </label>
              </div>
            </div>
            
            {/* Sensitive Data Option */}
            <div className="bg-white p-4 rounded-lg border">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={exportIncludeSensitive}
                  onChange={(e) => setExportIncludeSensitive(e.target.checked)}
                  className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Include Sensitive Data</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Include login PINs and authentication user IDs in the export. 
                    <span className="font-medium text-red-600"> Only enable this for secure backups.</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    If disabled, the export will exclude: Login PINs and Auth User IDs
                  </div>
                </div>
              </label>
            </div>
            
            {/* Export Preview */}
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-3">Export Preview</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Records:</span>
                  <span className="font-medium">{members.length} members</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Export Format:</span>
                  <span className="font-medium">{exportFormat.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Include Sensitive Data:</span>
                  <span className={`font-medium ${exportIncludeSensitive ? 'text-red-600' : 'text-green-600'}`}>
                    {exportIncludeSensitive ? 'Yes (⚠️ Secure Required)' : 'No (Recommended)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated File Size:</span>
                  <span className="font-medium">
                    {formatBytes(members.length * 1024)} (approx)
                  </span>
                </div>
              </div>
            </div>
            
            {/* Export Button */}
            <button
              onClick={handleExportData}
              disabled={isExporting || members.length === 0}
              className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-medium transition-all ${
                isExporting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : exportIncludeSensitive 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isExporting ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Exporting {members.length} records...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Export {members.length} Records as {exportFormat.toUpperCase()}
                  {exportIncludeSensitive && ' (with sensitive data)'}
                </>
              )}
            </button>
            
            <div className="text-sm text-gray-500 space-y-2">
              <p><strong>Note:</strong> CSV files include a BOM (Byte Order Mark) for better Excel compatibility.</p>
              <p><strong>Excel Export:</strong> Requires SheetJS library. If not available, will fallback to CSV format.</p>
              <p><strong>Recommended:</strong> Use CSV format for maximum compatibility with all spreadsheet software.</p>
            </div>
          </div>
        </div>

        {/* Import Data Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Import Data</h3>
          
          {!showImportMapping ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                {importFile ? (
                  <div className="space-y-2">
                    {importFile.name.toLowerCase().endsWith('.csv') ? (
                      <FileText className="h-12 w-12 text-green-600 mx-auto" />
                    ) : (
                      <FileSpreadsheet className="h-12 w-12 text-blue-600 mx-auto" />
                    )}
                    <p className="text-sm font-medium text-gray-900">{importFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(importFile.size)} • {new Date(importFile.lastModified).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => setImportFile(null)}
                      className="text-red-600 text-sm hover:text-red-700"
                    >
                      Remove File
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-center gap-4 mb-4">
                      <FileText className="h-12 w-12 text-gray-400" />
                      <FileSpreadsheet className="h-12 w-12 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Upload CSV or Excel file with member data</p>
                    <p className="text-xs text-gray-500 mb-4">
                      <strong>Supported formats:</strong> .csv, .xlsx, .xls<br />
                      <strong>Required fields:</strong> Surname, Name, Residence<br />
                      <strong>Optional fields:</strong> Phone, Cell Group, Gender, Baptism Date, etc.
                    </p>
                    <input 
                      type="file" 
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      className="hidden" 
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium cursor-pointer hover:bg-blue-700"
                    >
                      <Upload className="h-4 w-4" />
                      Choose CSV or Excel File
                    </label>
                  </div>
                )}
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              )}
              
              <div className="space-y-3 bg-white p-4 rounded-lg border">
                <h4 className="font-medium text-gray-900">Import Options</h4>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={importOptions.updateExisting}
                    onChange={(e) => setImportOptions(prev => ({...prev, updateExisting: e.target.checked}))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Update existing members (by name and surname)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={importOptions.createMissing}
                    onChange={(e) => setImportOptions(prev => ({...prev, createMissing: e.target.checked}))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Create new members if not found</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {!isImporting ? (
                <>
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-4">
                      {importFile?.name.toLowerCase().endsWith('.csv') ? (
                        <FileText className="h-5 w-5 text-green-600" />
                      ) : (
                        <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                      )}
                      <h4 className="font-medium text-gray-900">Map File Columns to Database Fields</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Please map each file column to its corresponding database field.
                      <span className="text-red-500 font-medium"> Required fields are marked with *</span>
                    </p>
                    
                    <div className="space-y-4">
                      {csvHeaders.map((header, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">Column {index + 1}: </span>
                            <code className="bg-gray-200 px-2 py-1 rounded text-sm">{header}</code>
                          </div>
                          <select
                            value={importFieldMapping[header] || ''}
                            onChange={async (e) => {
                              const newMapping = {
                                ...importFieldMapping,
                                [header]: e.target.value
                              };
                              setImportFieldMapping(newMapping);
                              if (importFile) {
                                try {
                                  const { headers: parsedHeaders, data } = await readExcelOrCsvFile(importFile);
                                  generateImportPreviewFromData(data, parsedHeaders, newMapping);
                                } catch (err) {
                                  console.error('Error re-parsing file:', err);
                                }
                              }
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg min-w-48"
                          >
                            <option value="">Select database field...</option>
                            {databaseFields.map(field => (
                              <option key={field.value} value={field.value}>
                                {field.label} {field.required ? '* (Required)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <h5 className="font-medium text-blue-900 mb-2">Database Fields Description:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {databaseFields.map(field => (
                          <div key={field.value} className="text-sm">
                            <span className={`font-medium ${field.required ? 'text-red-700' : 'text-gray-900'}`}>
                              {field.label}
                            </span>
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                            <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {importPreviewData.length > 0 && (
                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-4">Import Preview (First {importPreviewData.length} rows)</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Surname</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Residence</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cell Group</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Errors</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {importPreviewData.map((row) => (
                              <tr key={row.index} className={row.errors.length > 0 ? 'bg-red-50' : 'hover:bg-gray-50'}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {row.index}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {row.mappedData.name || <span className="text-red-500">Missing</span>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {row.mappedData.surname || <span className="text-red-500">Missing</span>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {row.mappedData.residence || <span className="text-red-500">Missing</span>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {row.mappedData.cell_group || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {row.errors.length === 0 ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Valid
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      {row.errors.length} error(s)
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {row.errors.length > 0 && (
                                    <div className="text-xs text-red-600 space-y-1">
                                      {row.errors.map((error, idx) => (
                                        <div key={idx}>• {error}</div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 text-sm text-gray-500">
                        Showing {importPreviewData.length} rows. {importPreviewData.filter(r => r.errors.length === 0).length} valid, {importPreviewData.filter(r => r.errors.length > 0).length} with errors.
                      </div>
                    </div>
                  )}
                  
                  {error && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-700 text-sm font-medium">{error}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleImportData}
                      disabled={isImporting || Object.keys(importFieldMapping).filter(k => importFieldMapping[k]).length < 3}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                      <Upload className="h-4 w-4" />
                      Start Import
                    </button>
                    <button
                      onClick={() => setShowImportMapping(false)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Back
                    </button>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    <p><strong>Note:</strong> At minimum, you must map the 3 required fields: Surname, Name, and Residence.</p>
                    <p className="mt-1">Cell groups must already exist in the system. The import will match by exact group name.</p>
                  </div>
                </>
              ) : (
                <div className="bg-white p-6 rounded-lg border">
                  <h4 className="font-medium text-gray-900 mb-6">Importing Data...</h4>
                  
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>{importStatusMessage}</span>
                        <span>{currentImportRow} / {importProgress?.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div 
                          className="bg-green-600 h-4 rounded-full transition-all duration-300"
                          style={{ width: `${importProgress ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {importProgress && (
                          <span>{importProgress.current} of {importProgress.total} rows processed</span>
                        )}
                      </div>
                    </div>
                    
                    {currentImportRow > 0 && importPreviewData[currentImportRow - 1] && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-2">Current Row:</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <span className="text-xs text-gray-500">Name</span>
                            <p className="font-medium">{importPreviewData[currentImportRow - 1].mappedData.name}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Surname</span>
                            <p className="font-medium">{importPreviewData[currentImportRow - 1].mappedData.surname}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Residence</span>
                            <p className="font-medium">{importPreviewData[currentImportRow - 1].mappedData.residence}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Status</span>
                            <p className="font-medium">
                              {importPreviewData[currentImportRow - 1].status === 'processing' ? (
                                <span className="text-blue-600">Processing...</span>
                              ) : importPreviewData[currentImportRow - 1].status === 'success' ? (
                                <span className="text-green-600">Success</span>
                              ) : importPreviewData[currentImportRow - 1].status === 'error' ? (
                                <span className="text-red-600">Error</span>
                              ) : (
                                <span className="text-gray-600">Pending</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {importPreviewData.slice(0, 10).map((row) => (
                            <tr key={row.index}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                {row.index}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {row.mappedData.name} {row.mappedData.surname}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {row.status === 'pending' && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Pending
                                  </span>
                                )}
                                {row.status === 'processing' && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                    Processing
                                  </span>
                                )}
                                {row.status === 'success' && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Success
                                  </span>
                                )}
                                {row.status === 'error' && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Error
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-gray-600">Import in progress...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {importResults && (
                <div className={`mt-6 p-6 rounded-lg ${
                  importResults.errors > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className={`text-lg font-bold ${importResults.errors > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                      Import Complete!
                    </h4>
                    <button
                      onClick={() => setImportResults(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <div className="text-3xl font-bold text-green-600">{importResults.success}</div>
                      <div className="text-sm text-gray-600">Successful</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <div className="text-3xl font-bold text-red-600">{importResults.errors}</div>
                      <div className="text-sm text-gray-600">Errors</div>
                    </div>
                  </div>
                  
                  {importResults.errorMessages.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-red-700 mb-3">Error Details:</h5>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {importResults.errorMessages.map((msg, idx) => (
                          <div key={idx} className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-100">
                            <span className="font-medium">Row {idx + 2}:</span> {msg}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        Note: Row numbers start from 2 (Row 1 is headers)
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setImportResults(null);
                        closeModal();
                      }}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      Close and View Members
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Data Cleanup */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Data Cleanup</h3>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Remove inactive members who have been marked as "not attending" for more than 1 year. This action cannot be undone.
            </p>
            <button
              onClick={handleCleanupData}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {loading ? 'Cleaning...' : 'Cleanup Old Data'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );

  const SecurityModal = () => (
    <Modal title="Security Settings" onClose={closeModal} size="max-w-6xl">
      <div className="space-y-8">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Password Policy
          </h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Length</label>
                <input 
                  type="number" 
                  min="4"
                  max="32"
                  value={securitySettings?.password_policy.min_length || 8}
                  onChange={(e) => setSecuritySettings(prev => prev ? {
                    ...prev,
                    password_policy: {...prev.password_policy, min_length: parseInt(e.target.value)}
                  } : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
                <p className="text-xs text-gray-500 mt-1">Minimum password length (4-32 characters)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password Expiry (Days)</label>
                <input 
                  type="number" 
                  min="1"
                  max="365"
                  value={securitySettings?.password_policy.expiry_days || 90}
                  onChange={(e) => setSecuritySettings(prev => prev ? {
                    ...prev,
                    password_policy: {...prev.password_policy, expiry_days: parseInt(e.target.value)}
                  } : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
                <p className="text-xs text-gray-500 mt-1">Days until password expires (1-365)</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Password Requirements</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'require_uppercase', label: 'Require uppercase letters', icon: 'A' },
                  { key: 'require_lowercase', label: 'Require lowercase letters', icon: 'a' },
                  { key: 'require_numbers', label: 'Require numbers', icon: '123' },
                  { key: 'require_special_chars', label: 'Require special characters', icon: '#$@' }
                ].map((req) => (
                  <label key={req.key} className="flex items-center gap-3 p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={(securitySettings?.password_policy as any)?.[req.key] || false}
                      onChange={(e) => setSecuritySettings(prev => prev ? {
                        ...prev,
                        password_policy: {...prev.password_policy, [req.key]: e.target.checked}
                      } : null)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" 
                    />
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-blue-700 font-bold">
                        {req.icon}
                      </div>
                      <span className="text-sm text-gray-700">{req.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Audit Logs
            </h3>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setLoading(true);
                  const logs = await cloudService.getAuditLogs();
                  setAuditLogs(logs);
                  setLoading(false);
                }}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search audit logs..."
                  value={searchAuditTerm}
                  onChange={(e) => setSearchAuditTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAuditLogFilter('all')}
                  className={`px-3 py-2 text-sm rounded-lg ${auditLogFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setAuditLogFilter('today')}
                  className={`px-3 py-2 text-sm rounded-lg ${auditLogFilter === 'today' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setAuditLogFilter('week')}
                  className={`px-3 py-2 text-sm rounded-lg ${auditLogFilter === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setAuditLogFilter('month')}
                  className={`px-3 py-2 text-sm rounded-lg ${auditLogFilter === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  This Month
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border overflow-hidden">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading audit logs...</p>
                </div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No audit logs found</p>
                  {searchAuditTerm && (
                    <p className="text-sm text-gray-500 mt-2">Try changing your search criteria</p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Record ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>{log.created_at ? new Date(log.created_at).toLocaleDateString() : 'N/A'}</div>
                            <div className="text-xs">{log.created_at ? new Date(log.created_at).toLocaleTimeString() : ''}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {log.user_name && log.user_surname 
                                ? `${log.user_name} ${log.user_surname}`
                                : log.user_id || 'System'}
                            </div>
                            {log.user_id && (
                              <div className="text-xs text-gray-500">ID: {log.user_id.substring(0, 8)}...</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              log.action === 'CREATE' || log.action === 'INSERT' ? 'bg-green-100 text-green-800' :
                              log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                              log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                              log.action === 'LOGIN' || log.action === 'ACCESS' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {log.action || 'UNKNOWN'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.table_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.record_id ? log.record_id.substring(0, 8) + '...' : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate">
                              {JSON.stringify(log.new_data || log.old_data || {})}
                            </div>
                            <button
                              onClick={() => {
                                alert(JSON.stringify({ old_data: log.old_data, new_data: log.new_data }, null, 2));
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border text-center">
                <div className="text-2xl font-bold text-blue-600">{filteredAuditLogs.length}</div>
                <div className="text-xs text-gray-600">Filtered Logs</div>
              </div>
              <div className="bg-white p-4 rounded-lg border text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filteredAuditLogs.filter(l => l.action === 'CREATE' || l.action === 'UPDATE').length}
                </div>
                <div className="text-xs text-gray-600">Create/Update</div>
              </div>
              <div className="bg-white p-4 rounded-lg border text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {filteredAuditLogs.filter(l => l.action === 'LOGIN').length}
                </div>
                <div className="text-xs text-gray-600">Logins</div>
              </div>
              <div className="bg-white p-4 rounded-lg border text-center">
                <div className="text-2xl font-bold text-red-600">
                  {filteredAuditLogs.filter(l => l.action === 'DELETE').length}
                </div>
                <div className="text-xs text-gray-600">Deletes</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleUpdateSecuritySettings}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
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
                      {member.phone || 'No phone'} • {getRolesFromMember(member).map(role => roles.find(r => r.value === role)?.label || role).join(', ')}
                    </p>
                    <p className="text-xs text-gray-500">{member.residence}</p>
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

  const UserDetailsModal = () => (
    <Modal title={`Manage User - ${selectedUser?.name} ${selectedUser?.surname}`} onClose={closeModal}>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-red-700 font-medium">{error}</p>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                <X className="h-4 w-4" />
              </button>
            </div>
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
              <p className="text-gray-600">{selectedUser?.residence || 'No residence'}</p>
              <p className="text-gray-600">{selectedUser?.phone || 'No phone'}</p>
              {selectedUser?.cell_group_id && (
                <p className="text-sm text-gray-500">Cell Group ID: {selectedUser?.cell_group_id}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <p className="text-xs text-green-600 mt-2">
                    Note: These credentials allow the user to log into their account. Save them securely.
                  </p>
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
                  status: null,
                  created_at: null,
                  residence: profile.residence || '',
                  gender: null,
                  baptism: null,
                  ministry_group_id: null,
                  is_permanent_member: false,
                  permanent_member_date: null,
                  invited_by: null,
                  first_time_visit_date: null,
                  is_leader: false,
                  is_hidden: false,
                  is_developer: false,
                  is_admin: false,
                  auth_user_id: null
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {adminSections.map((section) => {
            if (!profile) return null;
            
            const currentUser: Member = {
              id: profile.id,
              name: profile.name || '',
              surname: profile.surname || '',
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
              status: null,
              created_at: null,
              residence: profile.residence || '',
              gender: null,
              baptism: null,
              ministry_group_id: null,
              is_permanent_member: false,
              permanent_member_date: null,
              invited_by: null,
              first_time_visit_date: null,
              is_leader: false,
              is_hidden: false,
              is_developer: false,
              is_admin: false,
              auth_user_id: null
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

        {profile && (() => {
          const currentUser: Member = {
            id: profile.id,
            name: profile.name || '',
            surname: profile.surname || '',
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
            status: null,
            created_at: null,
            residence: profile.residence || '',
            gender: null,
            baptism: null,
            ministry_group_id: null,
            is_permanent_member: false,
            permanent_member_date: null,
            invited_by: null,
            first_time_visit_date: null,
            is_leader: false,
            is_hidden: false,
            is_developer: false,
            is_admin: false,
            auth_user_id: null
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
                  placeholder="Search users by name, phone, residence, or role..."
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
                            {member.phone || 'No phone'} • {getRolesFromMember(member).map(role => roles.find(r => r.value === role)?.label || role).join(', ')}
                          </p>
                          <p className="text-xs text-gray-500">{member.residence}</p>
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

        {profile && (() => {
          const currentUser: Member = {
            id: profile.id,
            name: profile.name || '',
            surname: profile.surname || '',
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
            status: null,
            created_at: null,
            residence: profile.residence || '',
            gender: null,
            baptism: null,
            ministry_group_id: null,
            is_permanent_member: false,
            permanent_member_date: null,
            invited_by: null,
            first_time_visit_date: null,
            is_leader: false,
            is_hidden: false,
            is_developer: false,
            is_admin: false,
            auth_user_id: null
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
                  {systemStats?.audit_logs_count && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Audit Logs</span>
                      <span className="text-gray-900 font-semibold">
                        {systemStats.audit_logs_count}
                      </span>
                    </div>
                  )}
                  {systemStats?.active_users_last_24h && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Active Users (24h)</span>
                      <span className="text-gray-900 font-semibold">
                        {systemStats.active_users_last_24h}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {activeModal === 'data-management' && <DataManagementModal />}
        {activeModal === 'security' && <SecurityModal />}
        {activeModal === 'users' && <UsersModal />}
        {activeModal === 'userDetails' && <UserDetailsModal />}

      </div>
    </div>
  );
};

export default Admin;
