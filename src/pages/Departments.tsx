import { Users, Plus, Calendar, User, Search, X, CheckCircle, XCircle, Clock4, Trash2, Shield, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

// Type-safe wrapper for department-related queries
const db = supabase as any;

interface Department {
  id: string;
  name: string;
  description?: string | null;
  meeting_day: string | null;
  meeting_time?: string | null;
  location: string | null;
  leader_id: string | null;
  leader?: {
    name: string;
    surname: string;
  } | null;
  members?: DepartmentMember[];
  created_at?: string;
  updated_at?: string;
}

interface DepartmentMember {
  id: string;
  department_id: string;
  member_id: string;
  role: 'leader' | 'member' | 'assistant';
  assigned_at: string;
  member?: Member;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  cell_group_id: string | null;
  invited_by: string | null;
  role?: string;
  permissions?: string[];
  assigned_groups?: string[];
  assigned_departments?: string[];
  can_add_members?: boolean;
  can_edit_members?: boolean;
  can_view_own_data?: boolean;
}

interface DepartmentMeeting {
  id: string;
  department_id: string;
  meeting_date: string;
  meeting_time: string;
  location: string;
  topic: string;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
}

interface DepartmentAttendance {
  id: string;
  meeting_id: string;
  member_id: string;
  status: 'present' | 'absent' | 'late';
  arrival_time: string;
  notes: string;
  member?: Member;
}

// Permission checking utility
const hasPermission = (userPermissions: string[] = [], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin_access');
};

const Departments = () => {
  const { profile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'departments' | 'meetings' | 'members'>('departments');
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Meeting states
  const [meetings, setMeetings] = useState<DepartmentMeeting[]>([]);
  const [attendance, setAttendance] = useState<DepartmentAttendance[]>([]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<DepartmentMeeting | null>(null);

  // Form states
  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    description: '',
    meeting_day: '',
    meeting_time: '',
    location: '',
    leader_id: ''
  });

  const [meetingForm, setMeetingForm] = useState({
    meeting_date: '',
    meeting_time: '',
    location: '',
    topic: '',
    notes: ''
  });

  const [reportForm, setReportForm] = useState({
    report_text: '',
    decisions_made: '',
    action_items: '',
    next_meeting_date: ''
  });

  const [attendanceData, setAttendanceData] = useState<{[key: string]: 'present' | 'absent' | 'late'}>({});
  const [attendanceNotes, setAttendanceNotes] = useState<{[key: string]: string}>({});

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const memberRoles = ['member', 'leader', 'assistant'];

  // Check permissions and load data
  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      if (!profile) {
        setHasAccess(false);
        setInitialLoad(false);
        return;
      }

      // Check if user has access to departments
      const userHasAccess = profile.isAdmin || 
        hasPermission(profile.permissions, 'admin_access') ||
        hasPermission(profile.permissions, 'manage_departments') ||
        (profile.assigned_departments && profile.assigned_departments.length > 0);
      
      setHasAccess(userHasAccess);

      if (userHasAccess) {
        await loadData();
      } else {
        setInitialLoad(false);
      }
    };

    checkAccessAndLoadData();
  }, [profile]);

  // Filter departments based on user permissions
  const getFilteredDepartments = () => {
    if (!profile) return [];

    // Admin users can see all departments
    if (profile.isAdmin || hasPermission(profile.permissions, 'admin_access')) {
      return allDepartments;
    }

    // Department leaders can only see their assigned departments
    if (profile.assigned_departments && profile.assigned_departments.length > 0) {
      return allDepartments.filter(dept => 
        profile.assigned_departments?.includes(dept.name)
      );
    }

    // Regular users with department access can see departments they are members of
    return allDepartments.filter(dept => 
      dept.members?.some(member => member.member_id === profile.id)
    );
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchDepartments(),
        fetchMembers()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load departments data');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      // @ts-ignore - Supabase types may be out of sync
      const { data, error } = await db
        .from('departments')
        .select(`
          *,
          leader:members!departments_leader_id_fkey(name, surname),
          department_members(
            *,
            member:members(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const departmentsData = (data || []) as any;
      setAllDepartments(departmentsData);
      
      // Apply filtering based on user permissions
      const filtered = getFilteredDepartments();
      setDepartments(filtered);
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await db
        .from('members')
        .select('*')
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      throw error;
    }
  };

  const fetchDepartmentMembers = async (departmentId: string) => {
    try {
      const { data, error } = await db
        .from('department_members')
        .select(`
          *,
          member:members(*)
        `)
        .eq('department_id', departmentId)
        .order('role', { ascending: false });

      if (error) throw error;
      
      setDepartments(prev => prev.map(dept => 
        dept.id === departmentId ? { ...dept, members: (data || []) as any } : dept
      ));
    } catch (error) {
      console.error('Error fetching department members:', error);
    }
  };

  const fetchDepartmentMeetings = async (departmentId: string) => {
    try {
      // @ts-ignore - Supabase types may be out of sync
      const { data, error } = await db
        .from('department_meetings')
        .select('*')
        .eq('department_id', departmentId)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMeetings((data || []) as any);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  };

  const fetchMeetingAttendance = async (meetingId: string) => {
    try {
      // @ts-ignore - Supabase types may be out of sync
      const { data, error } = await db
        .from('department_attendance')
        .select(`
          *,
          member:members(*)
        `)
        .eq('meeting_id', meetingId);

      if (error) throw error;
      setAttendance((data || []) as any);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  // Check if user can manage department
  const canManageDepartment = (department: Department) => {
    if (!profile) return false;
    
    // Admin users can manage all departments
    if (profile.isAdmin || hasPermission(profile.permissions, 'admin_access')) {
      return true;
    }

    // Department leaders can manage their assigned departments
    if (profile.assigned_departments && profile.assigned_departments.includes(department.name)) {
      return true;
    }

    // Users can manage departments they are leaders of
    if (department.members?.some(member => 
      member.member_id === profile.id && member.role === 'leader'
    )) {
      return true;
    }

    return false;
  };

  // Check if user can view department
  const canViewDepartment = (department: Department) => {
    if (!profile) return false;
    
    // Admin users can view all departments
    if (profile.isAdmin || hasPermission(profile.permissions, 'admin_access')) {
      return true;
    }

    // Department leaders can view their assigned departments
    if (profile.assigned_departments && profile.assigned_departments.includes(department.name)) {
      return true;
    }

    // Users can view departments they are members of
    if (department.members?.some(member => member.member_id === profile.id)) {
      return true;
    }

    return false;
  };

  // Create new department
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check permission
    if (!profile?.isAdmin && !hasPermission(profile?.permissions, 'manage_departments')) {
      setError('You do not have permission to create departments');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (!departmentForm.name.trim()) {
        setError('Department name is required');
        return;
      }

      const departmentData = {
        name: departmentForm.name.trim(),
        description: departmentForm.description.trim() || null,
        meeting_day: departmentForm.meeting_day || null,
        meeting_time: departmentForm.meeting_time || null,
        location: departmentForm.location.trim() || null,
        leader_id: departmentForm.leader_id || null
      };

      const { error } = await db
        .from('departments')
        .insert([departmentData])
        .select(`
          *,
          leader:members!departments_leader_id_fkey(name, surname)
        `)
        .single();

      if (error) throw error;

      // Refresh departments list
      await fetchDepartments();
      setShowForm(false);
      setDepartmentForm({
        name: '',
        description: '',
        meeting_day: '',
        meeting_time: '',
        location: '',
        leader_id: ''
      });
    } catch (error: any) {
      console.error('Error creating department:', error);
      setError(`Error creating department: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add members to department
  const handleAddMembersToDepartment = async (departmentId: string, memberIds: string[], role: string = 'member') => {
    if (!selectedDepartment || !canManageDepartment(selectedDepartment)) {
      setError('You do not have permission to manage this department');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const memberAssignments = memberIds.map(memberId => ({
        department_id: departmentId,
        member_id: memberId,
        role: role
      }));

      const { error } = await db
        .from('department_members')
        .insert(memberAssignments);

      if (error) throw error;

      await fetchDepartmentMembers(departmentId);
      await fetchMembers();
      setSelectedMembers([]);
      setSearchTerm('');
    } catch (error) {
      console.error('Error adding members to department:', error);
      setError('Error adding members to department');
    } finally {
      setLoading(false);
    }
  };

  // Remove member from department
  const handleRemoveMemberFromDepartment = async (departmentMemberId: string) => {
    if (!selectedDepartment || !canManageDepartment(selectedDepartment)) {
      setError('You do not have permission to manage this department');
      return;
    }

    try {
      const { error } = await db
        .from('department_members')
        .delete()
        .eq('id', departmentMemberId);

      if (error) throw error;

      if (selectedDepartment) {
        await fetchDepartmentMembers(selectedDepartment.id);
      }
    } catch (error) {
      console.error('Error removing member from department:', error);
      setError('Error removing member from department');
    }
  };

  // Update member role
  const handleUpdateMemberRole = async (departmentMemberId: string, newRole: string) => {
    if (!selectedDepartment || !canManageDepartment(selectedDepartment)) {
      setError('You do not have permission to manage this department');
      return;
    }

    try {
      const { error } = await db
        .from('department_members')
        .update({ role: newRole })
        .eq('id', departmentMemberId);

      if (error) throw error;

      if (selectedDepartment) {
        await fetchDepartmentMembers(selectedDepartment.id);
      }
    } catch (error) {
      console.error('Error updating member role:', error);
      setError('Error updating member role');
    }
  };

  // Meeting management
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartment || !canManageDepartment(selectedDepartment)) {
      setError('You do not have permission to manage meetings for this department');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (!meetingForm.meeting_date || !meetingForm.meeting_time || !meetingForm.location) {
        setError('Please fill in all required fields');
        return;
      }

      const { data, error } = await db
        .from('department_meetings')
        .insert([{
          department_id: selectedDepartment.id,
          meeting_date: meetingForm.meeting_date,
          meeting_time: meetingForm.meeting_time,
          location: meetingForm.location,
          topic: meetingForm.topic,
          notes: meetingForm.notes,
          status: 'scheduled'
        }])
        .select()
        .single();

      if (error) throw error;

      setMeetings(prev => [data, ...prev]);
      setShowMeetingForm(false);
      setMeetingForm({
        meeting_date: '',
        meeting_time: '',
        location: '',
        topic: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating meeting:', error);
      setError('Error creating meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeAttendance = async (meeting: DepartmentMeeting) => {
    if (!canManageDepartment(selectedDepartment!)) {
      setError('You do not have permission to take attendance for this department');
      return;
    }

    setSelectedMeeting(meeting);
    await fetchMeetingAttendance(meeting.id);
    
    const currentDepartment = departments.find(d => d.id === meeting.department_id);
    const departmentMembers = currentDepartment?.members || [];
    const initialAttendance: {[key: string]: 'present' | 'absent' | 'late'} = {};
    const initialNotes: {[key: string]: string} = {};

    departmentMembers.forEach(deptMember => {
      const existing = attendance.find(a => a.member_id === deptMember.member_id);
      initialAttendance[deptMember.member_id] = existing?.status || 'absent';
      initialNotes[deptMember.member_id] = existing?.notes || '';
    });

    setAttendanceData(initialAttendance);
    setAttendanceNotes(initialNotes);
    setShowAttendanceModal(true);
  };

  const handleSaveAttendance = async () => {
    if (!selectedMeeting || !canManageDepartment(selectedDepartment!)) {
      setError('You do not have permission to save attendance for this department');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const currentDepartment = departments.find(d => d.id === selectedMeeting.department_id);
      const departmentMembers = currentDepartment?.members || [];

      const attendanceRecords = departmentMembers.map(deptMember => ({
        meeting_id: selectedMeeting.id,
        member_id: deptMember.member_id,
        status: attendanceData[deptMember.member_id] || 'absent',
        notes: attendanceNotes[deptMember.member_id] || '',
        arrival_time: attendanceData[deptMember.member_id] === 'late' ? new Date().toTimeString().split(' ')[0] : null
      }));

      const { error: deleteError } = await db
        .from('department_attendance')
        .delete()
        .eq('meeting_id', selectedMeeting.id);

      if (deleteError) throw deleteError;

      const { error: insertError } = await db
        .from('department_attendance')
        .insert(attendanceRecords);

      if (insertError) throw insertError;

      setShowAttendanceModal(false);
    } catch (error) {
      console.error('Error saving attendance:', error);
      setError('Error saving attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseMeeting = async () => {
    if (!selectedMeeting || !canManageDepartment(selectedDepartment!)) {
      setError('You do not have permission to close meetings for this department');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { error } = await db
        .from('department_meetings')
        .update({ status: 'completed' })
        .eq('id', selectedMeeting.id);

      if (error) throw error;

      await fetchDepartmentMeetings(selectedMeeting.department_id);
      setShowReportModal(true);
    } catch (error) {
      console.error('Error closing meeting:', error);
      setError('Error closing meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting || !canManageDepartment(selectedDepartment!)) {
      setError('You do not have permission to submit reports for this department');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { error } = await db
        .from('department_reports')
        .insert([{
          meeting_id: selectedMeeting.id,
          report_text: reportForm.report_text,
          decisions_made: reportForm.decisions_made,
          action_items: reportForm.action_items,
          next_meeting_date: reportForm.next_meeting_date || null,
          created_by: 'system'
        }]);

      if (error) throw error;

      setShowReportModal(false);
      setReportForm({
        report_text: '',
        decisions_made: '',
        action_items: '',
        next_meeting_date: ''
      });
    } catch (error) {
      console.error('Error submitting report:', error);
      setError('Error submitting report');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  const getAttendanceStats = (meetingId: string) => {
    const meetingAttendance = attendance.filter(a => a.meeting_id === meetingId);
    const present = meetingAttendance.filter(a => a.status === 'present').length;
    const absent = meetingAttendance.filter(a => a.status === 'absent').length;
    const late = meetingAttendance.filter(a => a.status === 'late').length;
    
    return { present, absent, late, total: meetingAttendance.length };
  };

  const availableMembers = members.filter(member => 
    !selectedDepartment?.members?.some(m => m.member_id === member.id) &&
    (member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Show loading while checking permissions
  if (initialLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied if user doesn't have permission to access departments
  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the departments section. Please contact an administrator.
          </p>
          <p className="text-sm text-gray-500">
            Your role: {profile?.role || 'member'}
            {profile?.assigned_departments && profile.assigned_departments.length > 0 && (
              <span> • Assigned to {profile.assigned_departments.length} department(s)</span>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Church Departments
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {profile?.isAdmin 
                ? 'Manage all church departments, meetings, and member assignments' 
                : `View and manage departments you are assigned to - ${profile?.role} access`
              }
            </p>
            {!profile?.isAdmin && (
              <p className="text-sm text-gray-500 mt-1">
                You can only view and manage departments you are assigned to as a leader or member
              </p>
            )}
          </div>
          {(profile?.isAdmin || hasPermission(profile?.permissions, 'manage_departments')) && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
              {showForm ? 'Cancel' : 'Create Department'}
            </button>
          )}
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

        {/* Create Department Form */}
        {showForm && (profile?.isAdmin || hasPermission(profile?.permissions, 'manage_departments')) && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Department</h2>
            <form onSubmit={handleCreateDepartment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Department Name *</label>
                  <input
                    type="text"
                    value={departmentForm.name}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter department name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                  <input
                    type="text"
                    value={departmentForm.location}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, location: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Meeting location"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Day</label>
                  <select
                    value={departmentForm.meeting_day}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, meeting_day: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select day</option>
                    {daysOfWeek.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Time</label>
                  <input
                    type="time"
                    value={departmentForm.meeting_time}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, meeting_time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    value={departmentForm.description}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Department description and purpose"
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Department Leader (Optional)</label>
                  <select
                    value={departmentForm.leader_id}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, leader_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select leader</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} {member.surname}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-5 w-5" />
                  {loading ? 'Creating...' : 'Create Department'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Department Selection and Tabs */}
        {selectedDepartment && canViewDepartment(selectedDepartment) && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedDepartment.name}</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Leader: {selectedDepartment.leader ? `${selectedDepartment.leader.name} ${selectedDepartment.leader.surname}` : 'Not assigned'}
                  {selectedDepartment.meeting_day && ` • Meets on ${selectedDepartment.meeting_day}s`}
                  {selectedDepartment.location && ` • ${selectedDepartment.location}`}
                </p>
                {!canManageDepartment(selectedDepartment) && (
                  <p className="text-sm text-yellow-600 mt-1">
                    <Shield className="h-3 w-3 inline mr-1" />
                    View-only access
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedDepartment(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Back to Departments
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {(['departments', 'meetings', 'members'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab === 'departments' && 'Department Info'}
                  {tab === 'meetings' && 'Meetings'}
                  {tab === 'members' && 'Members'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Department Details View */}
        {selectedDepartment && canViewDepartment(selectedDepartment) && activeTab === 'departments' && (
          <div className="space-y-6">
            {/* Department Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Department Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Department Name</label>
                    <p className="text-gray-900 dark:text-white">{selectedDepartment.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <p className="text-gray-900 dark:text-white">{selectedDepartment.description || 'No description'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Meeting Day</label>
                    <p className="text-gray-900 dark:text-white">{selectedDepartment.meeting_day || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Meeting Time</label>
                    <p className="text-gray-900 dark:text-white">{selectedDepartment.meeting_time || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                    <p className="text-gray-900 dark:text-white">{selectedDepartment.location || 'Not set'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  {canManageDepartment(selectedDepartment) && (
                    <>
                      <button
                        onClick={() => setShowMeetingForm(true)}
                        className="w-full flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        Schedule Meeting
                      </button>
                      <button
                        onClick={() => setActiveTab('members')}
                        className="w-full flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        <Users className="h-4 w-4" />
                        Manage Members
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setActiveTab('meetings')}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    <Calendar className="h-4 w-4" />
                    View Meetings
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Meetings */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Meetings</h3>
                <button
                  onClick={() => setActiveTab('meetings')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View All
                </button>
              </div>
              {meetings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No meetings scheduled yet</p>
                  {canManageDepartment(selectedDepartment) && (
                    <button
                      onClick={() => setShowMeetingForm(true)}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Schedule First Meeting
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {meetings.slice(0, 3).map((meeting) => {
                    const stats = getAttendanceStats(meeting.id);
                    return (
                      <div key={meeting.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {new Date(meeting.meeting_date).toLocaleDateString()} at {meeting.meeting_time}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {meeting.topic} • {meeting.location}
                          </div>
                          {stats.total > 0 && (
                            <div className="flex gap-4 mt-2 text-xs">
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                {stats.present} Present
                              </span>
                              <span className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-3 w-3" />
                                {stats.absent} Absent
                              </span>
                              <span className="flex items-center gap-1 text-yellow-600">
                                <Clock4 className="h-3 w-3" />
                                {stats.late} Late
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {canManageDepartment(selectedDepartment) && (
                            <>
                              <button
                                onClick={() => handleTakeAttendance(meeting)}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                              >
                                Attendance
                              </button>
                              {meeting.status === 'scheduled' && (
                                <button
                                  onClick={() => {
                                    setSelectedMeeting(meeting);
                                    handleCloseMeeting();
                                  }}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                                >
                                  Close
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Meetings Tab */}
        {selectedDepartment && canViewDepartment(selectedDepartment) && activeTab === 'meetings' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Meetings</h3>
              {canManageDepartment(selectedDepartment) && (
                <button
                  onClick={() => setShowMeetingForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Schedule Meeting
                </button>
              )}
            </div>

            {meetings.length === 0 ? (
              <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 rounded-2xl">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">No meetings scheduled yet</p>
                {canManageDepartment(selectedDepartment) && (
                  <button
                    onClick={() => setShowMeetingForm(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Schedule First Meeting
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {meetings.map((meeting) => {
                  const stats = getAttendanceStats(meeting.id);
                  return (
                    <div key={meeting.id} className="bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                      <div className="flex flex-col lg:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {new Date(meeting.meeting_date).toLocaleDateString()} • {meeting.meeting_time}
                            </h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              meeting.status === 'scheduled' 
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : meeting.status === 'completed'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            }`}>
                              {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mb-2">{meeting.topic || 'No topic specified'}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-500 mb-3">Location: {meeting.location}</p>
                          
                          {stats.total > 0 && (
                            <div className="flex gap-4 text-sm">
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                {stats.present} Present
                              </span>
                              <span className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-4 w-4" />
                                {stats.absent} Absent
                              </span>
                              <span className="flex items-center gap-1 text-yellow-600">
                                <Clock4 className="h-4 w-4" />
                                {stats.late} Late
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {canManageDepartment(selectedDepartment) && (
                            <>
                              <button
                                onClick={() => handleTakeAttendance(meeting)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                              >
                                Take Attendance
                              </button>
                              {meeting.status === 'scheduled' && (
                                <button
                                  onClick={() => {
                                    setSelectedMeeting(meeting);
                                    handleCloseMeeting();
                                  }}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                >
                                  Close Meeting
                                </button>
                              )}
                            </>
                          )}
                          {meeting.status === 'completed' && (
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm text-center">
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                      {meeting.notes && (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">{meeting.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Members Management Tab */}
        {selectedDepartment && canViewDepartment(selectedDepartment) && activeTab === 'members' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Department Members ({selectedDepartment.members?.length || 0})
              </h3>
            </div>

            {/* Add Members Section - Only show if user can manage department */}
            {canManageDepartment(selectedDepartment) && (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Members to Department</h4>
                
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search members to add..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Available Members */}
                  {availableMembers.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'No members found matching your search' : 'No available members to add'}
                    </div>
                  ) : (
                    <div className="border border-gray-300 dark:border-gray-600 rounded-xl max-h-60 overflow-y-auto">
                      {availableMembers.map((member) => (
                        <div key={member.id} className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-600 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member.id)}
                            onChange={() => {
                              if (selectedMembers.includes(member.id)) {
                                setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                              } else {
                                setSelectedMembers([...selectedMembers, member.id]);
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {getInitials(member.name, member.surname)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {member.name} {member.surname}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {member.email} • {member.phone}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedMembers.length > 0 && (
                    <div className="flex gap-3">
                      <select
                        onChange={(e) => {
                          const role = e.target.value;
                          handleAddMembersToDepartment(selectedDepartment.id, selectedMembers, role);
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="member">Add as Member</option>
                        <option value="leader">Add as Leader</option>
                        <option value="assistant">Add as Assistant</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Current Members */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Members</h4>
              
              {!selectedDepartment.members || selectedDepartment.members.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No members in this department yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedDepartment.members.map((deptMember) => (
                    <div key={deptMember.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {getInitials(deptMember.member?.name || '', deptMember.member?.surname || '')}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {deptMember.member?.name} {deptMember.member?.surname}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {deptMember.member?.phone || 'No phone'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          deptMember.role === 'leader' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : deptMember.role === 'assistant'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {deptMember.role}
                        </span>
                        {canManageDepartment(selectedDepartment) && (
                          <>
                            <select
                              value={deptMember.role}
                              onChange={(e) => handleUpdateMemberRole(deptMember.id, e.target.value)}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                            >
                              {memberRoles.map(role => (
                                <option key={role} value={role}>
                                  {role.charAt(0).toUpperCase() + role.slice(1)}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleRemoveMemberFromDepartment(deptMember.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Remove from department"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Departments List (when no department is selected) */}
        {!selectedDepartment && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading && departments.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading departments...</p>
              </div>
            ) : departments.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  {profile?.isAdmin ? 'No Departments Yet' : 'No Access to Departments'}
                </h3>
                <p className="text-gray-500 dark:text-gray-500 mb-6">
                  {profile?.isAdmin 
                    ? 'Create your first department to get started' 
                    : 'You are not assigned to any departments. Please contact an administrator.'
                  }
                </p>
                {profile?.isAdmin && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
                  >
                    Create First Department
                  </button>
                )}
              </div>
            ) : (
              departments.map((department) => (
                <div
                  key={department.id}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
                  onClick={() => setSelectedDepartment(department)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                      <Users className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{department.name}</h3>
                      {department.location && (
                        <span className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-2">
                          {department.location}
                        </span>
                      )}
                      {department.meeting_day && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          Meets on {department.meeting_day}s
                          {department.meeting_time && ` at ${department.meeting_time}`}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                      <User className="h-4 w-4" />
                      <span className="text-sm">
                        Leader: {department.leader ? `${department.leader.name} ${department.leader.surname}` : 'Not assigned'}
                      </span>
                    </div>
                    {department.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {department.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {department.members?.length || 0} members
                    </span>
                    {!canManageDepartment(department) && (
                      <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                        View Only
                      </span>
                    )}
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium text-sm">
                      {canManageDepartment(department) ? 'Manage Department' : 'View Department'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Meeting Form Modal */}
        {showMeetingForm && selectedDepartment && canManageDepartment(selectedDepartment) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule New Meeting</h3>
                <button
                  onClick={() => setShowMeetingForm(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreateMeeting} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Date *</label>
                    <input
                      type="date"
                      value={meetingForm.meeting_date}
                      onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Time *</label>
                    <input
                      type="time"
                      value={meetingForm.meeting_time}
                      onChange={(e) => setMeetingForm({ ...meetingForm, meeting_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location *</label>
                  <input
                    type="text"
                    value={meetingForm.location}
                    onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter meeting location"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Topic/Agenda</label>
                  <input
                    type="text"
                    value={meetingForm.topic}
                    onChange={(e) => setMeetingForm({ ...meetingForm, topic: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter meeting topic or agenda"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                  <textarea
                    value={meetingForm.notes}
                    onChange={(e) => setMeetingForm({ ...meetingForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes for the meeting"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                  >
                    {loading ? 'Scheduling...' : 'Schedule Meeting'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMeetingForm(false)}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Attendance Modal */}
        {showAttendanceModal && selectedMeeting && selectedDepartment && canManageDepartment(selectedDepartment) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Take Attendance - {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
                </h3>
                <button
                  onClick={() => setShowAttendanceModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                {selectedDepartment.members?.map((deptMember) => (
                  <div key={deptMember.member_id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {getInitials(deptMember.member?.name || '', deptMember.member?.surname || '')}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {deptMember.member?.name} {deptMember.member?.surname}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {deptMember.member?.phone || 'No phone'} • {deptMember.role}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <select
                        value={attendanceData[deptMember.member_id] || 'absent'}
                        onChange={(e) => setAttendanceData({
                          ...attendanceData,
                          [deptMember.member_id]: e.target.value as 'present' | 'absent' | 'late'
                        })}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                      </select>
                      
                      <input
                        type="text"
                        placeholder="Notes..."
                        value={attendanceNotes[deptMember.member_id] || ''}
                        onChange={(e) => setAttendanceNotes({
                          ...attendanceNotes,
                          [deptMember.member_id]: e.target.value
                        })}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={handleSaveAttendance}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {loading ? 'Saving...' : 'Save Attendance'}
                </button>
                <button
                  onClick={() => setShowAttendanceModal(false)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report Modal */}
        {showReportModal && selectedMeeting && canManageDepartment(selectedDepartment!) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Meeting Report</h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Report *</label>
                  <textarea
                    value={reportForm.report_text}
                    onChange={(e) => setReportForm({ ...reportForm, report_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="What was discussed and accomplished..."
                    rows={4}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Decisions Made</label>
                  <textarea
                    value={reportForm.decisions_made}
                    onChange={(e) => setReportForm({ ...reportForm, decisions_made: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Key decisions made during the meeting..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Action Items</label>
                  <textarea
                    value={reportForm.action_items}
                    onChange={(e) => setReportForm({ ...reportForm, action_items: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tasks and responsibilities assigned..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Next Meeting Date</label>
                  <input
                    type="date"
                    value={reportForm.next_meeting_date}
                    onChange={(e) => setReportForm({ ...reportForm, next_meeting_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                  >
                    {loading ? 'Submitting...' : 'Submit Report'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Departments;
