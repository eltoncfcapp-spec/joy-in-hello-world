import { Plus, Users, MapPin, Calendar, User, Search, X, Trash2, Edit, Shield, AlertCircle, FileText, Save, Eye, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

interface CellGroup {
  id: string;
  name: string;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  leader_id: string | null;
  leader?: {
    id: string;
    name: string;
    surname: string;
    email: string | null;
    phone: string | null;
  } | null;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  members?: any[];
}

interface Meeting {
  id: string;
  group_id: string;
  meeting_date: string;
  meeting_time: string | null;
  location: string | null;
  topic: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

interface MeetingReport {
  id: string;
  meeting_id: string | null;
  report_text: string;
  decisions_made: string | null;
  action_items: string | null;
  next_meeting_date: string | null;
  created_by: string | null;
  created_at: string;
  meeting?: Meeting;
  author?: {
    name: string;
    surname: string;
  };
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  role?: string | null;
  permissions?: string[] | null;
  assigned_groups?: string[] | null;
  assigned_departments?: string[] | null;
  cell_group_id?: string | null;
}

// Permission checking utility
const hasPermission = (userPermissions: string[] = [], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin_access');
};

// Check if user is admin or pastor
const isAdminOrPastor = (role: string): boolean => {
  return role === 'admin' || role === 'pastor';
};

// Check if user can manage all groups (has manage_groups permission)
const canManageAllGroups = (permissions: string[] = []): boolean => {
  return hasPermission(permissions, 'manage_groups');
};

const CellGroups = () => {
  const { profile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showMeetingsModal, setShowMeetingsModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showReportView, setShowReportView] = useState(false);
  
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [allCellGroups, setAllCellGroups] = useState<CellGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingReports, setMeetingReports] = useState<MeetingReport[]>([]);
  
  const [selectedGroup, setSelectedGroup] = useState<CellGroup | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedReport, setSelectedReport] = useState<MeetingReport | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    meeting_day: '',
    meeting_time: '',
    leader_id: '',
  });

  const [meetingFormData, setMeetingFormData] = useState({
    meeting_date: '',
    meeting_time: '',
    location: '',
    topic: '',
    notes: ''
  });

  const [reportFormData, setReportFormData] = useState({
    meeting_id: '',
    report_text: '',
    decisions_made: '',
    action_items: '',
    next_meeting_date: ''
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Check if user can create cell groups (only Admin)
  const canCreateGroups = () => {
    if (!profile) return false;
    return isAdminOrPastor(profile.role);
  };

  // Check if user can manage specific cell group
  const canManageGroup = (group: CellGroup) => {
    if (!profile) return false;
    
    // Admin and Pastor can manage all groups
    if (isAdminOrPastor(profile.role)) {
      return true;
    }
    
    // Users with manage_groups permission can manage all groups
    if (canManageAllGroups(profile.permissions)) {
      return true;
    }
    
    // Group leaders can only manage their assigned groups
    if (profile.role === 'group_leader' && profile.assigned_groups) {
      return profile.assigned_groups.some(assignedGroup => 
        assignedGroup.toLowerCase() === group.name.toLowerCase()
      );
    }
    
    // Check if user is the leader of this group (from leader_id)
    if (group.leader_id === profile.id) {
      return true;
    }

    // Check if user is marked as leader in cell_group_members
    const isGroupLeader = group.members?.some(member => 
      member.member_id === profile.id && member.role === 'leader'
    );
    if (isGroupLeader) return true;

    return false;
  };

  // Check if user can view specific cell group
  const canViewGroup = (group: CellGroup) => {
    if (!profile) return false;
    
    // Admin and Pastor can view all groups
    if (isAdminOrPastor(profile.role)) {
      return true;
    }
    
    // Users with view_groups or manage_groups permission can view all groups
    if (hasPermission(profile.permissions, 'view_groups') || canManageAllGroups(profile.permissions)) {
      return true;
    }
    
    // Group leaders can view their assigned groups
    if (profile.role === 'group_leader' && profile.assigned_groups) {
      return profile.assigned_groups.some(assignedGroup => 
        assignedGroup.toLowerCase() === group.name.toLowerCase()
      );
    }
    
    // Regular members can only view groups they are members of
    if (profile.role === 'member') {
      // Check if member belongs to this group via cell_group_members
      const isMemberOfGroup = group.members?.some(member => member.member_id === profile.id);
      
      // Or check if their cell_group_id matches this group
      const isMemberByCellGroupId = profile.cell_group_id === group.id;
      
      return isMemberOfGroup || isMemberByCellGroupId || false;
    }
    
    return false;
  };

  // Filter cell groups based on user permissions
  const getFilteredCellGroups = () => {
    if (!profile) return [];

    // Admin and Pastor can see all cell groups
    if (isAdminOrPastor(profile.role)) {
      return allCellGroups;
    }

    // Users with view_groups or manage_groups permission can see all groups
    if (hasPermission(profile.permissions, 'view_groups') || canManageAllGroups(profile.permissions)) {
      return allCellGroups;
    }

    let userGroups: CellGroup[] = [];

    // Group leaders can see their assigned groups
    if (profile.role === 'group_leader' && profile.assigned_groups && profile.assigned_groups.length > 0) {
      userGroups = allCellGroups.filter(group => 
        profile.assigned_groups?.some(assignedGroup => 
          assignedGroup.toLowerCase() === group.name.toLowerCase()
        )
      );
    }

    // Regular members can see groups they are members of
    if (profile.role === 'member') {
      const memberGroups = allCellGroups.filter(group => {
        // Check via cell_group_members table
        const isMemberOfGroup = group.members?.some(member => member.member_id === profile.id);
        
        // Check via cell_group_id field
        const isMemberByCellGroupId = profile.cell_group_id === group.id;
        
        return isMemberOfGroup || isMemberByCellGroupId;
      });
      userGroups = [...userGroups, ...memberGroups];
    }

    // Remove duplicates
    const uniqueGroups = userGroups.filter((group, index, self) => 
      index === self.findIndex(g => g.id === group.id)
    );

    return uniqueGroups;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchCellGroups(),
        fetchMembers()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load cell groups data');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const fetchCellGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('cell_groups')
        .select(`
          *,
          leader:members!leader_id(id, name, surname, email, phone),
          cell_group_members(
            *,
            member:members(id, name, surname, email, phone)
          )
        `)
        .order('name');

      if (error) throw error;
      
      const cellGroupsData = data || [];
      
      // Map the data properly
      const mappedGroups = cellGroupsData.map(group => ({
        ...group,
        members: []
      }));
      
      setAllCellGroups(mappedGroups as any);
      
    } catch (error) {
      console.error('Error fetching cell groups:', error);
      throw error;
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
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

  const fetchMeetings = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('group_id', groupId)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setMeetings([]);
    }
  };

  const fetchMeetingReports = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('meeting_reports')
        .select(`
          *,
          meeting:meetings(*),
          author:members(name, surname)
        `)
        .eq('meeting.group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeetingReports(data || []);
    } catch (error) {
      console.error('Error fetching meeting reports:', error);
      setMeetingReports([]);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, surname, email, phone')
        .eq('cell_group_id', groupId)
        .order('role', { ascending: false });

      if (error) throw error;
      
      setAllCellGroups(prev => prev.map(group => 
        group.id === groupId ? { ...group, members: data || [] } : group
      ));
    } catch (error) {
      console.error('Error fetching group members:', error);
    }
  };

  // Check permissions and load data
  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      if (!profile) {
        setHasAccess(false);
        setInitialLoad(false);
        return;
      }

      // Determine access based on role and permissions
      let userHasAccess = false;

      // Admin and Pastor always have access
      if (isAdminOrPastor(profile.role)) {
        userHasAccess = true;
      }
      // Users with view_groups or manage_groups permission
      else if (hasPermission(profile.permissions, 'view_groups') || canManageAllGroups(profile.permissions)) {
        userHasAccess = true;
      }
      // Group leaders with assigned groups
      else if (profile.role === 'group_leader' && profile.assigned_groups && profile.assigned_groups.length > 0) {
        userHasAccess = true;
      }
      // Regular members who belong to a cell group
      else if (profile.role === 'member' && profile.cell_group_id) {
        userHasAccess = true;
      }
      
      setHasAccess(userHasAccess);

      if (userHasAccess) {
        await loadData();
      } else {
        setInitialLoad(false);
      }
    };

    checkAccessAndLoadData();
  }, [profile]);

  // Update filtered cell groups when allCellGroups or profile changes
  useEffect(() => {
    if (allCellGroups.length > 0 && profile) {
      const filtered = getFilteredCellGroups();
      setCellGroups(filtered);
    }
  }, [allCellGroups, profile]);

  // Meeting Reports Functions
  const createMeetingReport = async () => {
    if (!profile) {
      setError('You must be logged in to create reports');
      return;
    }

    if (!reportFormData.report_text.trim()) {
      setError('Report text is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('meeting_reports')
        .insert({
          meeting_id: reportFormData.meeting_id || null,
          report_text: reportFormData.report_text,
          decisions_made: reportFormData.decisions_made || null,
          action_items: reportFormData.action_items || null,
          next_meeting_date: reportFormData.next_meeting_date || null,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      if (selectedGroup) {
        await fetchMeetingReports(selectedGroup.id);
      }

      setShowReportForm(false);
      setReportFormData({
        meeting_id: '',
        report_text: '',
        decisions_made: '',
        action_items: '',
        next_meeting_date: ''
      });
      
      alert('Meeting report created successfully!');
    } catch (error: any) {
      console.error('Error creating meeting report:', error);
      setError(`Error creating meeting report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateMeetingReport = async () => {
    if (!selectedReport || !profile) {
      setError('Invalid request');
      return;
    }

    if (!reportFormData.report_text.trim()) {
      setError('Report text is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('meeting_reports')
        .update({
          meeting_id: reportFormData.meeting_id || null,
          report_text: reportFormData.report_text,
          decisions_made: reportFormData.decisions_made || null,
          action_items: reportFormData.action_items || null,
          next_meeting_date: reportFormData.next_meeting_date || null
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      if (selectedGroup) {
        await fetchMeetingReports(selectedGroup.id);
      }

      setShowReportForm(false);
      setSelectedReport(null);
      setReportFormData({
        meeting_id: '',
        report_text: '',
        decisions_made: '',
        action_items: '',
        next_meeting_date: ''
      });
      
      alert('Meeting report updated successfully!');
    } catch (error: any) {
      console.error('Error updating meeting report:', error);
      setError(`Error updating meeting report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteMeetingReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this meeting report? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('meeting_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      if (selectedGroup) {
        await fetchMeetingReports(selectedGroup.id);
      }
      
      alert('Meeting report deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting meeting report:', error);
      setError(`Error deleting meeting report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createMeeting = async () => {
    if (!selectedGroup || !profile) {
      setError('Invalid request');
      return;
    }

    if (!meetingFormData.meeting_date) {
      setError('Meeting date is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('meetings')
        .insert({
          group_id: selectedGroup.id,
          meeting_date: meetingFormData.meeting_date,
          meeting_time: meetingFormData.meeting_time || null,
          location: meetingFormData.location || null,
          topic: meetingFormData.topic || null,
          notes: meetingFormData.notes || null,
          status: 'scheduled'
        });

      if (error) throw error;

      await fetchMeetings(selectedGroup.id);
      setMeetingFormData({
        meeting_date: '',
        meeting_time: '',
        location: '',
        topic: '',
        notes: ''
      });
      
      alert('Meeting created successfully!');
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      setError(`Error creating meeting: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Modal Handlers
  const openMeetingsModal = async (group: CellGroup) => {
    if (!canViewGroup(group)) {
      setError('You do not have permission to view this cell group');
      return;
    }

    setSelectedGroup(group);
    setShowMeetingsModal(true);
    await fetchMeetings(group.id);
    await fetchMeetingReports(group.id);
  };

  const openReportForm = (meeting?: Meeting) => {
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to create reports for this group');
      return;
    }

    setSelectedMeeting(meeting || null);
    setReportFormData({
      meeting_id: meeting?.id || '',
      report_text: '',
      decisions_made: '',
      action_items: '',
      next_meeting_date: ''
    });
    setShowReportForm(true);
  };

  const openEditReportForm = (report: MeetingReport) => {
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to edit reports for this group');
      return;
    }

    setSelectedReport(report);
    setReportFormData({
      meeting_id: report.meeting_id || '',
      report_text: report.report_text,
      decisions_made: report.decisions_made || '',
      action_items: report.action_items || '',
      next_meeting_date: report.next_meeting_date || ''
    });
    setShowReportForm(true);
  };

  const openReportView = (report: MeetingReport) => {
    setSelectedReport(report);
    setShowReportView(true);
  };

  const closeAllModals = () => {
    setShowMeetingsModal(false);
    setShowReportsModal(false);
    setShowReportForm(false);
    setShowReportView(false);
    setSelectedGroup(null);
    setSelectedMeeting(null);
    setSelectedReport(null);
    setMeetings([]);
    setMeetingReports([]);
    setMeetingFormData({
      meeting_date: '',
      meeting_time: '',
      location: '',
      topic: '',
      notes: ''
    });
    setReportFormData({
      meeting_id: '',
      report_text: '',
      decisions_made: '',
      action_items: '',
      next_meeting_date: ''
    });
  };

  // Existing functions (handleSubmit, handleUpdateGroup, etc.) remain the same...
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check permission - only admin/pastor can create groups
    if (!canCreateGroups()) {
      setError('You do not have permission to create cell groups. Only administrators can create new cell groups.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (!formData.name.trim()) {
        setError('Cell group name is required');
        return;
      }

      const { error } = await supabase.from('cell_groups').insert({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        location: formData.location.trim() || null,
        meeting_day: formData.meeting_day || null,
        meeting_time: formData.meeting_time || null,
        leader_id: formData.leader_id || null,
      });

      if (error) throw error;

      await fetchCellGroups();
      setShowForm(false);
      setFormData({ 
        name: '', 
        description: '', 
        location: '', 
        meeting_day: '', 
        meeting_time: '', 
        leader_id: '' 
      });
    } catch (error: any) {
      console.error('Error creating cell group:', error);
      setError(`Error creating cell group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !canManageGroup(selectedGroup)) {
      setError('You do not have permission to edit this cell group');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('cell_groups')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          location: formData.location.trim() || null,
          meeting_day: formData.meeting_day || null,
          meeting_time: formData.meeting_time || null,
          leader_id: formData.leader_id || null,
        })
        .eq('id', selectedGroup.id);

      if (error) throw error;

      await fetchCellGroups();
      setShowEditForm(false);
      setSelectedGroup(null);
      setFormData({ 
        name: '', 
        description: '', 
        location: '', 
        meeting_day: '', 
        meeting_time: '', 
        leader_id: '' 
      });
    } catch (error: any) {
      console.error('Error updating cell group:', error);
      setError(`Error updating cell group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const groupToDelete = allCellGroups.find(g => g.id === groupId);
    if (!groupToDelete || !canManageGroup(groupToDelete)) {
      setError('You do not have permission to delete this cell group');
      return;
    }

    if (!confirm('Are you sure you want to delete this cell group? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('cell_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      await fetchCellGroups();
    } catch (error: any) {
      console.error('Error deleting cell group:', error);
      setError(`Error deleting cell group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

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

  // Show access denied if user doesn't have permission to access cell groups
  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have permission to access the cell groups section.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your role: {profile?.role || 'member'}
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
              Cell Groups
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isAdminOrPastor(profile?.role || '')
                ? 'Full administrative access to all cell groups' 
                : canManageAllGroups(profile?.permissions)
                ? 'Can manage all cell groups and members'
                : profile?.role === 'group_leader'
                ? `Managing ${profile?.assigned_groups?.length || 0} assigned group(s)`
                : `Viewing your cell group - ${profile?.role} access`
              }
            </p>
          </div>
          {canCreateGroups() && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
              {showForm ? 'Cancel' : 'Create Cell Group'}
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

        {/* Create Cell Group Form - Keep existing form */}
        {showForm && canCreateGroups() && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Cell Group</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter cell group name"
                    required
                  />
                </div>
                {/* ... rest of the form fields ... */}
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-5 w-5" />
                  {loading ? 'Creating...' : 'Create Cell Group'}
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

        {/* Cell Groups List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading && cellGroups.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading cell groups...</p>
            </div>
          ) : cellGroups.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {isAdminOrPastor(profile?.role || '') ? 'No Cell Groups Yet' : 'No Access to Cell Groups'}
              </h3>
              <p className="text-gray-500 dark:text-gray-500 mb-6">
                {isAdminOrPastor(profile?.role || '')
                  ? 'Create your first cell group to get started' 
                  : 'You are not a member of any cell groups'
                }
              </p>
              {canCreateGroups() && (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
                >
                  Create First Cell Group
                </button>
              )}
            </div>
          ) : (
            cellGroups.map((group) => {
              const canManage = canManageGroup(group);
              const canView = canViewGroup(group);
              
              return (
                <div
                  key={group.id}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                      <Users className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{group.name}</h3>
                      {canManage ? (
                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-xs font-medium mb-2">
                          <Shield className="h-3 w-3 mr-1" />
                          Can Manage
                        </span>
                      ) : canView ? (
                        <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full text-xs font-medium mb-2">
                          <Shield className="h-3 w-3 mr-1" />
                          View Only
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                      <User className="h-4 w-4" />
                      <span className="text-sm">
                        Leader: {group.leader ? `${group.leader.name} ${group.leader.surname}` : 'Not assigned'}
                      </span>
                    </div>
                    {group.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {group.members?.length || 0} member{(group.members?.length || 0) !== 1 ? 's' : ''}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openMeetingsModal(group)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Meetings & Reports
                      </button>
                      {canManage && (
                        <>
                          <button
                            onClick={() => openEditForm(group)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            title="Edit group"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGroup(group.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete group"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Meetings & Reports Modal */}
        {showMeetingsModal && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedGroup.name} - Meetings & Reports
                </h3>
                <button
                  onClick={closeAllModals}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Meetings Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Meetings</h4>
                    {canManageGroup(selectedGroup) && (
                      <button
                        onClick={() => {
                          setMeetingFormData({
                            meeting_date: '',
                            meeting_time: '',
                            location: selectedGroup.location || '',
                            topic: '',
                            notes: ''
                          });
                        }}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Plus className="h-4 w-4" />
                        New Meeting
                      </button>
                    )}
                  </div>

                  {meetings.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">No meetings scheduled</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {meetings.map((meeting) => (
                        <div key={meeting.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {new Date(meeting.meeting_date).toLocaleDateString()}
                                {meeting.meeting_time && ` at ${meeting.meeting_time}`}
                              </div>
                              {meeting.topic && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  Topic: {meeting.topic}
                                </div>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              meeting.status === 'completed' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : meeting.status === 'cancelled'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            }`}>
                              {meeting.status}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            {canManageGroup(selectedGroup) && (
                              <button
                                onClick={() => openReportForm(meeting)}
                                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                              >
                                <FileText className="h-3 w-3" />
                                Create Report
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reports Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Meeting Reports</h4>
                    {canManageGroup(selectedGroup) && (
                      <button
                        onClick={() => openReportForm()}
                        className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        <Plus className="h-4 w-4" />
                        New Report
                      </button>
                    )}
                  </div>

                  {meetingReports.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">No meeting reports</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {meetingReports.map((report) => (
                        <div key={report.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {report.meeting ? 
                                  `Meeting: ${new Date(report.meeting.meeting_date).toLocaleDateString()}` : 
                                  'General Report'
                                }
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Created: {new Date(report.created_at).toLocaleDateString()}
                                {report.author && ` by ${report.author.name} ${report.author.surname}`}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openReportView(report)}
                                className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                title="View report"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {canManageGroup(selectedGroup) && (
                                <>
                                  <button
                                    onClick={() => openEditReportForm(report)}
                                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                    title="Edit report"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteMeetingReport(report.id)}
                                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    title="Delete report"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {report.report_text}
                          </div>
                          {report.next_meeting_date && (
                            <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 mt-2">
                              <Clock className="h-3 w-3" />
                              Next: {new Date(report.next_meeting_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Meeting Report Form Modal */}
        {showReportForm && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedReport ? 'Edit Meeting Report' : 'Create Meeting Report'}
                </h3>
                <button
                  onClick={() => setShowReportForm(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                selectedReport ? updateMeetingReport() : createMeetingReport();
              }} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Associated Meeting (Optional)
                  </label>
                  <select
                    value={reportFormData.meeting_id}
                    onChange={(e) => setReportFormData({ ...reportFormData, meeting_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a meeting (optional)</option>
                    {meetings.map(meeting => (
                      <option key={meeting.id} value={meeting.id}>
                        {new Date(meeting.meeting_date).toLocaleDateString()} - {meeting.topic || 'No topic'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Report Text *
                  </label>
                  <textarea
                    value={reportFormData.report_text}
                    onChange={(e) => setReportFormData({ ...reportFormData, report_text: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter the main content of the meeting report..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Decisions Made (Optional)
                  </label>
                  <textarea
                    value={reportFormData.decisions_made}
                    onChange={(e) => setReportFormData({ ...reportFormData, decisions_made: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="List any decisions that were made during the meeting..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Action Items (Optional)
                  </label>
                  <textarea
                    value={reportFormData.action_items}
                    onChange={(e) => setReportFormData({ ...reportFormData, action_items: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="List any action items with responsible parties..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Next Meeting Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={reportFormData.next_meeting_date}
                    onChange={(e) => setReportFormData({ ...reportFormData, next_meeting_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {loading ? 'Saving...' : (selectedReport ? 'Update Report' : 'Create Report')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportForm(false)}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Report Modal */}
        {showReportView && selectedReport && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Meeting Report</h3>
                <button
                  onClick={() => setShowReportView(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting</label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-900 dark:text-white">
                        {selectedReport.meeting ? 
                          `${new Date(selectedReport.meeting.meeting_date).toLocaleDateString()}` : 
                          'General Report'
                        }
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report Date</label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-900 dark:text-white">
                        {new Date(selectedReport.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedReport.next_meeting_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Next Meeting</label>
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-green-700 dark:text-green-300">
                        {new Date(selectedReport.next_meeting_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report Content</label>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg whitespace-pre-wrap">
                    {selectedReport.report_text}
                  </div>
                </div>

                {selectedReport.decisions_made && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Decisions Made</label>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg whitespace-pre-wrap">
                      {selectedReport.decisions_made}
                    </div>
                  </div>
                )}

                {selectedReport.action_items && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Action Items</label>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg whitespace-pre-wrap">
                      {selectedReport.action_items}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  {canManageGroup(selectedGroup!) && (
                    <button
                      onClick={() => {
                        setShowReportView(false);
                        openEditReportForm(selectedReport);
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Report
                    </button>
                  )}
                  <button
                    onClick={() => setShowReportView(false)}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;
