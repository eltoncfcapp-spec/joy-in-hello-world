import { Settings, Users, Database, Shield, Bell, Mail, X, Search, Edit, Trash2, Eye, EyeOff, UserPlus, ChevronDown, Download, Upload, Key, Lock, AlertTriangle, MessageSquare, Send, Save, FileText, Columns, Grid } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  role: string;
  permissions: string[];
  is_active: boolean;
  cell_group: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
}

interface ImportColumnMapping {
  [excelColumn: string]: string;
}

const Admin = () => {
  const [activeModal, setActiveModal] = useState(null);
  const [members, setMembers] = useState([
    {
      id: '1',
      name: 'John',
      surname: 'Doe',
      email: 'john.doe@church.com',
      phone: '+1234567890',
      role: 'pastor',
      permissions: ['view_members', 'edit_members', 'manage_events'],
      is_active: true,
      cell_group: 'Youth Ministry'
    },
    {
      id: '2',
      name: 'Jane',
      surname: 'Smith',
      email: 'jane.smith@church.com',
      phone: '+0987654321',
      role: 'leader',
      permissions: ['view_members', 'view_groups', 'manage_groups'],
      is_active: true,
      cell_group: 'Women\'s Fellowship'
    },
    {
      id: '3',
      name: 'Bob',
      surname: 'Johnson',
      email: 'bob.j@church.com',
      phone: '+1122334455',
      role: 'member',
      permissions: ['view_members', 'view_events'],
      is_active: true,
      cell_group: 'Men\'s Group'
    }
  ]);
  
  const [groups, setGroups] = useState([
    { id: '1', name: 'Youth Ministry', description: 'Young adults and teenagers' },
    { id: '2', name: 'Women\'s Fellowship', description: 'Women\'s support group' },
    { id: '3', name: 'Men\'s Group', description: 'Men\'s Bible study' }
  ]);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const [excelData, setExcelData] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [availableColumns, setAvailableColumns] = useState([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [importMode, setImportMode] = useState('bulk');

  const [userFormData, setUserFormData] = useState({
    role: 'member',
    permissions: [],
    assignedGroups: [],
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    eventReminders: true,
    donationReceipts: true,
    weeklyDigest: false,
    newMemberAlerts: true,
    emergencyAlerts: true,
  });

  const [communicationSettings, setCommunicationSettings] = useState({
    smsEnabled: true,
    emailEnabled: true,
    defaultEmailTemplate: 'welcome',
    smsSignature: 'Your Church Family',
    emailSignature: 'Blessings,\nYour Church Team',
    autoWelcomeEmail: true,
    autoEventReminders: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 60,
    passwordMinLength: 8,
    requireStrongPassword: true,
    failedLoginLockout: 5,
    auditLogRetention: 365,
  });

  const [emailTemplates] = useState([
    {
      id: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to Our Church Family!',
      content: 'Dear {{name}},\n\nWelcome to our church family! We are excited to have you join us.\n\nBlessings,\nChurch Team'
    },
    {
      id: 'event_reminder',
      name: 'Event Reminder',
      subject: 'Reminder: {{event_name}}',
      content: 'Dear {{name}},\n\nThis is a reminder about {{event_name}} on {{event_date}}.\n\nWe hope to see you there!'
    },
    {
      id: 'donation_receipt',
      name: 'Donation Receipt',
      subject: 'Donation Receipt - Thank You!',
      content: 'Dear {{name}},\n\nThank you for your generous donation of {{amount}}.\n\nBlessings,\nChurch Team'
    }
  ]);

  const databaseFields = [
    { value: 'name', label: 'First Name', required: true },
    { value: 'surname', label: 'Surname', required: true },
    { value: 'email', label: 'Email', required: false },
    { value: 'phone', label: 'Phone Number', required: false },
    { value: 'cell_group', label: 'Cell Group', required: false },
    { value: 'role', label: 'Role', required: false },
  ];

  const adminSections = [
    {
      icon: Settings,
      title: 'General Settings',
      description: 'Configure church information and preferences',
      color: 'from-blue-500 to-blue-600',
      modal: 'general'
    },
    {
      icon: Users,
      title: 'User Management',
      description: 'Manage roles, permissions, and access control',
      color: 'from-purple-500 to-purple-600',
      modal: 'users'
    },
    {
      icon: Database,
      title: 'Data Management',
      description: 'Backup, import, and export church data',
      color: 'from-green-500 to-green-600',
      modal: 'data'
    },
    {
      icon: Shield,
      title: 'Security',
      description: 'Security settings and audit logs',
      color: 'from-red-500 to-red-600',
      modal: 'security'
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Configure email and push notifications',
      color: 'from-orange-500 to-orange-600',
      modal: 'notifications'
    },
    {
      icon: Mail,
      title: 'Communication',
      description: 'Email templates and messaging settings',
      color: 'from-pink-500 to-pink-600',
      modal: 'communication'
    },
  ];

  const roles = [
    { value: 'member', label: 'Member', description: 'Basic access to personal profile' },
    { value: 'leader', label: 'Group Leader', description: 'Can manage assigned groups and view members' },
    { value: 'deacon', label: 'Deacon', description: 'Extended access to ministry areas' },
    { value: 'pastor', label: 'Pastor', description: 'Full administrative access' },
    { value: 'admin', label: 'Administrator', description: 'Complete system access' },
  ];

  const permissions = [
    { value: 'view_members', label: 'View Members', description: 'Can see member directory' },
    { value: 'edit_members', label: 'Edit Members', description: 'Can modify member information' },
    { value: 'view_groups', label: 'View Groups', description: 'Can see all groups' },
    { value: 'manage_groups', label: 'Manage Groups', description: 'Can create and edit groups' },
    { value: 'view_events', label: 'View Events', description: 'Can see event calendar' },
    { value: 'manage_events', label: 'Manage Events', description: 'Can create and edit events' },
    { value: 'view_donations', label: 'View Donations', description: 'Can see donation records' },
    { value: 'manage_donations', label: 'Manage Donations', description: 'Can record and edit donations' },
    { value: 'view_reports', label: 'View Reports', description: 'Can access analytics and reports' },
    { value: 'admin_access', label: 'Admin Access', description: 'Full system administration' },
  ];

  const pageAccess = [
    { value: 'dashboard', label: 'Dashboard', description: 'Main dashboard overview' },
    { value: 'members', label: 'Members', description: 'Member directory and management' },
    { value: 'events', label: 'Events', description: 'Event calendar and management' },
    { value: 'groups', label: 'Groups', description: 'Groups and ministries' },
    { value: 'donations', label: 'Donations', description: 'Donation tracking' },
    { value: 'reports', label: 'Reports', description: 'Analytics and reporting' },
    { value: 'admin', label: 'Admin', description: 'Administration panel' },
  ];

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportResult(null);
    setImportProgress(0);

    const sampleData = [
      { 'First Name': 'Alice', 'Surname': 'Williams', 'Email': 'alice@example.com', 'Phone Number': '+1111111111', 'Cell Group': 'Youth Ministry', 'Role': 'member' },
      { 'First Name': 'Charlie', 'Surname': 'Brown', 'Email': 'charlie@example.com', 'Phone Number': '+2222222222', 'Cell Group': 'Men\'s Group', 'Role': 'leader' }
    ];
    
    setExcelData(sampleData);
    setPreviewData(sampleData);
    
    const columns = Object.keys(sampleData[0]);
    setAvailableColumns(columns);
    
    const autoMapping = {};
    columns.forEach(col => {
      const lowerCol = col.toLowerCase();
      if (lowerCol.includes('first') || (lowerCol.includes('name') && !lowerCol.includes('surname'))) {
        autoMapping[col] = 'name';
      } else if (lowerCol.includes('last') || lowerCol.includes('surname')) {
        autoMapping[col] = 'surname';
      } else if (lowerCol.includes('email')) {
        autoMapping[col] = 'email';
      } else if (lowerCol.includes('phone')) {
        autoMapping[col] = 'phone';
      } else if (lowerCol.includes('cell') || lowerCol.includes('group')) {
        autoMapping[col] = 'cell_group';
      } else if (lowerCol.includes('role')) {
        autoMapping[col] = 'role';
      }
    });
    setColumnMapping(autoMapping);
  };

  const handleColumnMappingChange = (excelColumn, databaseField) => {
    setColumnMapping(prev => ({
      ...prev,
      [excelColumn]: databaseField
    }));
  };

  const handleBulkImport = async () => {
    if (!excelData.length) return;

    setLoading(true);
    setImportProgress(0);

    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      setImportProgress(Math.round(((i + 1) / excelData.length) * 100));

      await new Promise(resolve => setTimeout(resolve, 300));

      try {
        const memberData = {
          id: Math.random().toString(36).substr(2, 9),
          role: 'member',
          permissions: [],
          is_active: true
        };

        Object.entries(columnMapping).forEach(([excelCol, dbField]) => {
          if (row[excelCol] !== undefined && row[excelCol] !== null && row[excelCol] !== '') {
            memberData[dbField] = row[excelCol];
          }
        });

        if (!memberData.name || !memberData.surname) {
          errors++;
          continue;
        }

        if (!memberData.email) {
          memberData.email = `${memberData.name.toLowerCase()}.${memberData.surname.toLowerCase()}@church.com`;
        }

        const existingMember = members.find(m => m.email === memberData.email);

        if (existingMember) {
          setMembers(prev => prev.map(m => m.id === existingMember.id ? { ...m, ...memberData, id: m.id } : m));
          updated++;
        } else {
          setMembers(prev => [...prev, memberData]);
          imported++;
        }
      } catch (error) {
        errors++;
      }
    }

    setImportResult({
      success: errors < excelData.length,
      imported,
      updated,
      errors,
      message: `Processed ${excelData.length} rows`
    });

    setLoading(false);
    setImportProgress(100);
  };

  const handleManualRowImport = async (row, index) => {
    const memberData = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'member',
      permissions: [],
      is_active: true
    };

    Object.entries(columnMapping).forEach(([excelCol, dbField]) => {
      if (row[excelCol] !== undefined && row[excelCol] !== null && row[excelCol] !== '') {
        memberData[dbField] = row[excelCol];
      }
    });

    if (!memberData.name || !memberData.surname) {
      alert(`Row ${index + 1}: Missing required fields (name and surname)`);
      return;
    }

    if (!memberData.email) {
      memberData.email = `${memberData.name.toLowerCase()}.${memberData.surname.toLowerCase()}@church.com`;
    }

    setMembers(prev => [...prev, memberData]);
    alert(`Successfully imported ${memberData.name} ${memberData.surname}`);
  };

  const exportToExcel = async () => {
    setLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const csvContent = [
      ['First Name', 'Surname', 'Email', 'Phone', 'Cell Group', 'Role', 'Status'].join(','),
      ...members.map(m => [
        m.name,
        m.surname,
        m.email,
        m.phone,
        m.cell_group,
        m.role,
        m.is_active ? 'Active' : 'Inactive'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `church-data-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    setLoading(false);
    alert('Data exported successfully!');
  };

  const downloadTemplate = () => {
    const csvContent = [
      ['First Name', 'Surname', 'Email', 'Phone Number', 'Cell Group', 'Role'].join(','),
      ['John', 'Doe', 'john.doe@example.com', '+1234567890', 'Youth Ministry', 'member'].join(','),
      ['Jane', 'Smith', 'jane.smith@example.com', '+0987654321', 'Women\'s Fellowship', 'leader'].join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'church-import-template.csv';
    a.click();
  };

  const openModal = (modalType, user) => {
    setActiveModal(modalType);
    if (user) {
      setSelectedUser(user);
      setUserFormData({
        role: user.role || 'member',
        permissions: user.permissions || [],
        assignedGroups: [],
      });
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedUser(null);
    setUserFormData({
      role: 'member',
      permissions: [],
      assignedGroups: [],
    });
    setExcelData([]);
    setSelectedFile(null);
    setColumnMapping({});
    setAvailableColumns([]);
    setImportProgress(0);
    setImportResult(null);
    setPreviewData([]);
    setImportMode('bulk');
  };

  const handleUserUpdate = async () => {
    if (!selectedUser) return;

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setMembers(prev => prev.map(m => 
      m.id === selectedUser.id 
        ? { ...m, role: userFormData.role, permissions: userFormData.permissions }
        : m
    ));
    
    setLoading(false);
    closeModal();
    alert('User updated successfully!');
  };

  const handlePermissionToggle = (permission) => {
    setUserFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const handleNotificationToggle = (setting) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleSecuritySettingChange = (setting, value) => {
    setSecuritySettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleCommunicationSettingChange = (setting, value) => {
    setCommunicationSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const getRolePermissions = (role) => {
    const rolePermissions = {
      member: ['view_members', 'view_events', 'view_groups'],
      leader: ['view_members', 'view_events', 'view_groups', 'manage_groups'],
      deacon: ['view_members', 'edit_members', 'view_events', 'view_groups', 'manage_groups', 'view_donations'],
      pastor: ['view_members', 'edit_members', 'view_events', 'manage_events', 'view_groups', 'manage_groups', 'view_donations', 'view_reports'],
      admin: ['admin_access']
    };
    return rolePermissions[role] || [];
  };

  const filteredMembers = members.filter(member =>
    `${member.name} ${member.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const Modal = ({ children, title }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Admin Panel
            </h1>
            <p className="text-gray-600">Manage system settings and user permissions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {adminSections.map((section) => (
            <button
              key={section.title}
              onClick={() => openModal(section.modal)}
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:scale-105 transition-all duration-200 hover:shadow-xl text-left group"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4 shadow-lg`}>
                <section.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{section.title}</h3>
              <p className="text-gray-600 text-sm">{section.description}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">System Status</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Database</span>
                <span className="flex items-center gap-2 text-green-500">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Healthy
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Storage</span>
                <span className="text-gray-900">45% Used</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Last Backup</span>
                <span className="text-gray-900">1 hour ago</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Users</span>
                <span className="text-gray-900">12 online</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Members</span>
                <span className="text-gray-900">{members.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Groups</span>
                <span className="text-gray-900">{groups.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Leaders</span>
                <span className="text-gray-900">
                  {members.filter(m => m.role === 'leader').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pastors</span>
                <span className="text-gray-900">
                  {members.filter(m => m.role === 'pastor').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {activeModal === 'data' && (
          <Modal title="Data Management">
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-green-900">Data Management</h4>
                    <p className="text-green-700 text-sm">Import, export, and manage church data</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <Download className="h-8 w-8 text-blue-600 mb-2" />
                  <div className="font-medium text-gray-900">Export to CSV</div>
                  <p className="text-sm text-gray-500 mb-3">
                    Export all church data including members and groups to CSV format
                  </p>
                  <button
                    onClick={exportToExcel}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    {loading ? 'Exporting...' : 'Export to CSV'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Import Data</h3>
                
                <div className="p-4 border border-gray-200 rounded-lg">
                  <Upload className="h-8 w-8 text-green-600 mb-2" />
                  <div className="font-medium text-gray-900">Upload CSV File</div>
                  <p className="text-sm text-gray-500 mb-3">
                    Upload CSV file to import member data
                  </p>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select CSV File
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          {selectedFile ? selectedFile.name : 'Click to upload CSV file'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Supports .csv files
                        </p>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium text-sm"
                  >
                    <FileText className="h-4 w-4" />
                    Download Template
                  </button>
                </div>

                {availableColumns.length > 0 && (
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <Columns className="h-6 w-6 text-purple-600 mb-2" />
                    <div className="font-medium text-gray-900 mb-3">Column Mapping</div>
                    
                    <div className="space-y-3">
                      {availableColumns.map(column => (
                        <div key={column} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Excel: {column}
                          </span>
                          <select
                            value={columnMapping[column] || ''}
                            onChange={(e) => handleColumnMappingChange(column, e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                          >
                            <option value="">Not mapped</option>
                            {databaseFields.map(field => (
                              <option key={field.value} value={field.value}>
                                {field.label} {field.required && '*'}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => setImportMode('bulk')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          importMode === 'bulk'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        Bulk Import
                      </button>
                      <button
                        onClick={() => setImportMode('manual')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          importMode === 'manual'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        Manual Import
                      </button>
                    </div>

                    {previewData.length > 0 && (
                      <div className="mt-4">
                        <div className="font-medium text-gray-900 mb-2">Data Preview</div>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                {availableColumns.map(col => (
                                  <th key={col} className="px-3 py-2 text-left font-medium text-gray-700 border-b">
                                    {col}
                                  </th>
                                ))}
                                {importMode === 'manual' && (
                                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">
                                    Actions
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.map((row, index) => (
                                <tr key={index} className="border-b border-gray-200">
                                  {availableColumns.map(col => (
                                    <td key={col} className="px-3 py-2 text-gray-600">
                                      {row[col]}
                                    </td>
                                  ))}
                                  {importMode === 'manual' && (
                                    <td className="px-3 py-2">
                                      <button
                                        onClick={() => handleManualRowImport(row, index)}
                                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium"
                                      >
                                        Import
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {importMode === 'bulk' && (
                      <button
                        onClick={handleBulkImport}
                        disabled={loading || !excelData.length}
                        className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                      >
                        <Upload className="h-4 w-4" />
                        {loading ? 'Importing...' : `Bulk Import (${excelData.length} records)`}
                      </button>
                    )}

                    {importProgress > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Progress</span>
                          <span className="text-sm text-gray-600">{importProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${importProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {importResult && (
                      <div className={`mt-4 p-3 rounded-lg ${
                        importResult.success 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <div className={`text-sm ${
                          importResult.success 
                            ? 'text-green-700' 
                            : 'text-red-700'
                        }`}>
                          {importResult.success ? '✅ ' : '❌ '}
                          {importResult.message}
                          {importResult.imported > 0 && ` • Imported: ${importResult.imported}`}
                          {importResult.updated > 0 && ` • Updated: ${importResult.updated}`}
                          {importResult.errors > 0 && ` • Errors: ${importResult.errors}`}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <h4 className="font-semibold text-red-900">Danger Zone</h4>
                    <p className="text-red-700 text-sm">Irreversible actions</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <button className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium">
                    Clear All Data
                  </button>
                  <p className="text-xs text-red-600 text-center">
                    This will permanently delete all church data
                  </p>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'users' && (
          <Modal title="User Management">
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
                          {member.email} • {member.role}
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
            </div>
          </Modal>
        )}

        {activeModal === 'userDetails' && selectedUser && (
          <Modal title={`Manage User - ${selectedUser.name} ${selectedUser.surname}`}>
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {selectedUser.name.charAt(0)}{selectedUser.surname.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">
                      {selectedUser.name} {selectedUser.surname}
                    </h4>
                    <p className="text-gray-600">{selectedUser.email}</p>
                    <p className="text-sm text-gray-500">{selectedUser.phone}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  User Role
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setUserFormData({
                      ...userFormData,
                      role: newRole,
                      permissions: getRolePermissions(newRole)
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500">
                  {roles.find(r => r.value === userFormData.role)?.description}
                </p>
              </div>

              {userFormData.role === 'pastor' && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Page Access Control
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pageAccess.map(page => (
                      <div key={page.value} className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg">
                        <input
                          type="checkbox"
                          checked={userFormData.permissions.includes(`view_${page.value}`)}
                          onChange={() => handlePermissionToggle(`view_${page.value}`)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {page.label}
                          </div>
                          <div className="text-xs text-gray-500">
                            {page.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {userFormData.role === 'leader' && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Assigned Groups
                  </label>
                  <div className="space-y-3">
                    {groups.map(group => (
                      <div key={group.id} className="flex items-center justify-between p-3 border border-gray-300 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">
                            {group.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {group.description}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                            <UserPlus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Permissions
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {permissions.map(permission => (
                    <div key={permission.value} className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg">
                      <input
                        type="checkbox"
                        checked={userFormData.permissions.includes(permission.value)}
                        onChange={() => handlePermissionToggle(permission.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {permission.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {permission.description}
                        </div>
                      </div>
                    </div>
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
        )}

        {activeModal === 'security' && (
          <Modal title="Security Settings">
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-red-600" />
                  <div>
                    <h4 className="font-semibold text-red-900">Security & Access Control</h4>
                    <p className="text-red-700 text-sm">Configure system security settings</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Authentication</h3>
                {Object.entries(securitySettings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </div>
                      <div className="text-sm text-gray-500">
                        {key === 'twoFactorAuth' ? 'Require 2FA for all users' :
                         key === 'sessionTimeout' ? `Session timeout: ${value} minutes` :
                         key === 'passwordMinLength' ? `Minimum password length: ${value} characters` :
                         key === 'requireStrongPassword' ? 'Require strong passwords' :
                         key === 'failedLoginLockout' ? `Account lockout after ${value} failed attempts` :
                         `Keep audit logs for ${value} days`}
                      </div>
                    </div>
                    {typeof value === 'boolean' ? (
                      <button
                        onClick={() => handleSecuritySettingChange(key, !value)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          value ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    ) : (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => handleSecuritySettingChange(key, parseInt(e.target.value))}
                        className="w-20 px-3 py-1 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <h4 className="font-semibold text-yellow-900">Security Audit Log</h4>
                    <p className="text-yellow-700 text-sm">Recent security events and access logs</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Last password change</span>
                    <span className="text-gray-900">2 days ago</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Failed login attempts</span>
                    <span className="text-gray-900">3 this week</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Last security scan</span>
                    <span className="text-gray-900">1 hour ago</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium">
                  <Lock className="h-4 w-4" />
                  Save Security Settings
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
        )}

        {activeModal === 'notifications' && (
          <Modal title="Notification Settings">
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-blue-900">Notification Preferences</h4>
                    <p className="text-blue-700 text-sm">Configure how and when you receive notifications</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
                {Object.entries(notificationSettings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </div>
                      <div className="text-sm text-gray-500">
                        {key.includes('email') ? 'Send via email' : key.includes('push') ? 'Send push notification' : 'System notification'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleNotificationToggle(key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        value ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium">
                  <Save className="h-4 w-4" />
                  Save Settings
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
        )}

        {activeModal === 'communication' && (
          <Modal title="Communication Settings">
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-purple-600" />
                  <div>
                    <h4 className="font-semibold text-purple-900">Communication Channels</h4>
                    <p className="text-purple-700 text-sm">Manage email and SMS settings</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Channel Settings</h3>
                  {Object.entries(communicationSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 text-sm capitalize">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </div>
                      </div>
                      {typeof value === 'boolean' ? (
                        <button
                          onClick={() => handleCommunicationSettingChange(key, !value)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            value ? 'bg-green-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              value ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      ) : (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => handleCommunicationSettingChange(key, e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Email Templates</h3>
                  <div className="space-y-3">
                    {emailTemplates.map(template => (
                      <div key={template.id} className="p-3 border border-gray-200 rounded-lg">
                        <div className="font-medium text-gray-900">{template.name}</div>
                        <div className="text-sm text-gray-500">{template.subject}</div>
                        <button className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
                          Edit Template
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium">
                  <Send className="h-4 w-4" />
                  Save & Test
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
        )}

        {activeModal === 'general' && (
          <Modal title="General Settings">
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-blue-900">Church Information</h4>
                    <p className="text-blue-700 text-sm">Configure basic church details and preferences</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Church Details</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Church Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      placeholder="Enter church name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      placeholder="Enter church address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">System Preferences</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Zone
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900">
                      <option>UTC-5 (Eastern Time)</option>
                      <option>UTC-6 (Central Time)</option>
                      <option>UTC-7 (Mountain Time)</option>
                      <option>UTC-8 (Pacific Time)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Format
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900">
                      <option>MM/DD/YYYY</option>
                      <option>DD/MM/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900">
                      <option>English</option>
                      <option>Spanish</option>
                      <option>French</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium">
                  <Save className="h-4 w-4" />
                  Save Settings
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
        )}
      </div>
    </div>
  );
};

export default Admin
