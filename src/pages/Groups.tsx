'use client';

import { Users, Plus, Calendar, User, Search, X, CheckCircle, XCircle, Clock4, Trash2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

interface Group {
  id: string;
  name: string;
  description?: string | null;
  meeting_day: string | null;
  meeting_time?: string;
  category?: string;
  location: string | null;
  leader_id: string | null;
  leader?: {
    name: string;
    surname: string;
  } | null;
  members?: Member[];
  status?: string;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  cell_group_id: string | null;
  invited_by: string | null;
  role?: string | null;
  permissions?: string[] | null;
  assigned_groups?: string[] | null;
  assigned_departments?: string[] | null;
}

interface Meeting {
  id: string;
  group_id: string;
  meeting_date: string;
  meeting_time: string;
  location: string;
  topic: string;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
}

interface Attendance {
  id: string;
  meeting_id: string;
  member_id: string;
  status: 'present' | 'absent' | 'late';
  arrival_time: string;
  notes: string;
  member?: Member;
}

// Permission utility
const hasPermission = (userPermissions: string[] = [], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin_access');
};

const Groups = () => {
  const { profile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'groups' | 'meetings' | 'members'>('groups');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Meeting states
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // Form states
  const [groupForm, setGroupForm] = useState({
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

  // Permissions
  const currentUserPermissions = profile?.permissions || [];
  const isAdmin = profile?.isAdmin || hasPermission(currentUserPermissions, 'admin_access');
  const canManageGroups = isAdmin || hasPermission(currentUserPermissions, 'manage_groups');
  const canViewGroups = isAdmin || hasPermission(currentUserPermissions, 'view_groups') || canManageGroups;
  const canAddMembers = isAdmin || hasPermission(currentUserPermissions, 'add_members') || profile?.can_add_members;
  const canEditMembers = isAdmin || hasPermission(currentUserPermissions, 'edit_members') || profile?.can_edit_members;

  // Check access on mount
  useEffect(() => {
    const checkAccessAndLoad = async () => {
      if (!profile) {
        setHasAccess(false);
        setInitialLoad(false);
        return;
      }

      const userHasAccess = isAdmin ||
        canViewGroups ||
        (profile.assigned_groups && profile.assigned_groups.length > 0) ||
        profile.role === 'group_leader' ||
        profile.is_leader ||
        profile.cell_group_id;

      setHasAccess(userHasAccess);
      if (userHasAccess) {
        await loadData();
      } else {
        setInitialLoad(false);
      }
    };

    checkAccessAndLoad();
  }, [profile]);

  // Load all data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchGroups(),
        fetchMembers()
      ]);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // Fetch Groups with Leader Join
  const fetchGroups = async () => {
    let query = supabase
      .from('cell_groups')
      .select(`
        *,
        leader:members!cell_groups_leader_id_fkey(
          id, name, surname
        )
      `)
      .eq('status', 'active');

    if (!isAdmin) {
      if (profile?.assigned_groups && profile.assigned_groups.length > 0) {
        query = query.in('id', profile.assigned_groups);
      } else if (profile?.role === 'group_leader' || profile?.is_leader) {
        query = query.eq('leader_id', profile.id);
      } else if (profile?.cell_group_id) {
        query = query.eq('id', profile.cell_group_id);
      } else {
        setGroups([]);
        setAllGroups([]);
        return;
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    const filtered = data || [];
    setAllGroups(filtered);
    setGroups(filtered);

    // Load members for each group
    await Promise.all(filtered.map(g => fetchGroupMembers(g.id)));
  };

  // Fetch Members
  const fetchMembers = async () => {
    let query = supabase.from('members').select('*').order('name');

    if (!isAdmin) {
      if (profile?.assigned_groups && profile.assigned_groups.length > 0) {
        query = query.in('cell_group_id', profile.assigned_groups);
      } else if (profile?.cell_group_id) {
        query = query.eq('cell_group_id', profile.cell_group_id);
      } else if (profile?.role === 'group_leader' || profile?.is_leader) {
        const { data: leaderGroups } = await supabase
          .from('cell_groups')
          .select('id')
          .eq('leader_id', profile.id)
          .eq('status', 'active');
        const ids = leaderGroups?.map(g => g.id) || [];
        query = ids.length > 0 ? query.in('cell_group_id', ids) : query.neq('id', 'null');
      } else {
        query = query.eq('id', profile.id);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    setMembers(data || []);
  };

  const fetchGroupMembers = async (groupId: string) => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('cell_group_id', groupId)
      .order('name');
    if (error) throw error;

    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, members: data || [] } : g));
    setAllGroups(prev => prev.map(g => g.id === groupId ? { ...g, members: data || [] } : g));
  };

  const fetchGroupMeetings = async (groupId: string) => {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('group_id', groupId)
      .order('meeting_date', { ascending: false });
    if (error) throw error;
    setMeetings(data || []);
  };

  const fetchMeetingAttendance = async (meetingId: string) => {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        member:members(*)
      `)
      .eq('meeting_id', meetingId);
    if (error) throw error;
    setAttendance(data || []);
  };

  // Permission Helpers
  const canManageGroup = (group: Group) => {
    if (isAdmin) return true;
    if (canManageGroups && profile.assigned_groups?.includes(group.id)) return true;
    if (group.leader_id === profile?.id) return true;
    return false;
  };

  const canViewGroup = (group: Group) => {
    if (isAdmin || canViewGroups) return true;
    if (profile.assigned_groups?.includes(group.id)) return true;
    if (group.members?.some(m => m.id === profile?.id)) return true;
    if (group.leader_id === profile?.id) return true;
    return false;
  };

  // Handlers
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageGroups) return setError('No permission');

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cell_groups')
        .insert([{
          ...groupForm,
          status: 'active'
        }])
        .select(`
          *,
          leader:members!cell_groups_leader_id_fkey(id, name, surname)
        `)
        .single();
      if (error) throw error;

      await fetchGroups();
      setShowForm(false);
      setGroupForm({ name: '', description: '', meeting_day: '', meeting_time: '', location: '', leader_id: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMembersToGroup = async (groupId: string, memberIds: string[]) => {
    if (!canAddMembers()) return setError('No permission');
    try {
      setLoading(true);
      const { error } = await supabase
        .from('members')
        .update({ cell_group_id: groupId })
        .in('id', memberIds);
      if (error) throw error;

      await Promise.all([fetchGroupMembers(groupId), fetchMembers()]);
      setSelectedMembers([]);
      setSearchTerm('');
    } catch (err) {
      setError('Failed to add members');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMemberFromGroup = async (memberId: string) => {
    if (!canEditMembers()) return setError('No permission');
    try {
      const { error } = await supabase
        .from('members')
        .update({ cell_group_id: null })
        .eq('id', memberId);
      if (error) throw error;

      if (selectedGroup) await fetchGroupMembers(selectedGroup.id);
    } catch (err) {
      setError('Failed to remove member');
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageGroup(selectedGroup!)) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('meetings')
        .insert([{ ...meetingForm, group_id: selectedGroup!.id, status: 'scheduled' }])
        .select()
        .single();
      if (error) throw error;

      setMeetings(prev => [data, ...prev]);
      setShowMeetingForm(false);
      setMeetingForm({ meeting_date: '', meeting_time: '', location: '', topic: '', notes: '' });
    } catch (err) {
      setError('Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeAttendance = async (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    await fetchMeetingAttendance(meeting.id);

    const group = groups.find(g => g.id === meeting.group_id);
    const members = group?.members || [];
    const init: typeof attendanceData = {};
    const notes: typeof attendanceNotes = {};

    members.forEach(m => {
      const rec = attendance.find(a => a.member_id === m.id);
      init[m.id] = rec?.status || 'absent';
      notes[m.id] = rec?.notes || '';
    });

    setAttendanceData(init);
    setAttendanceNotes(notes);
    setShowAttendanceModal(true);
  };

  const handleSaveAttendance = async () => {
    if (!selectedMeeting || !canManageGroup(selectedGroup!)) return;

    const group = groups.find(g => g.id === selectedMeeting.group_id);
    const members = group?.members || [];

    const records = members.map(m => ({
      meeting_id: selectedMeeting.id,
      member_id: m.id,
      status: attendanceData[m.id] || 'absent',
      notes: attendanceNotes[m.id] || '',
      arrival_time: attendanceData[m.id] === 'late' ? new Date().toTimeString().split(' ')[0] : null
    }));

    try {
      setLoading(true);
      await supabase.from('attendance').delete().eq('meeting_id', selectedMeeting.id);
      const { error } = await supabase.from('attendance').insert(records);
      if (error) throw error;
      setShowAttendanceModal(false);
    } catch (err) {
      setError('Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseMeeting = async () => {
    if (!selectedMeeting) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('meetings')
        .update({ status: 'completed' })
        .eq('id', selectedMeeting.id);
      if (error) throw error;

      await fetchGroupMeetings(selectedMeeting.group_id);
      setShowReportModal(true);
    } catch (err) {
      setError('Failed to close meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('meeting_reports')
        .insert([{
          meeting_id: selectedMeeting.id,
          ...reportForm,
          created_by: profile?.id
        }]);
      if (error) throw error;

      setShowReportModal(false);
      setReportForm({ report_text: '', decisions_made: '', action_items: '', next_meeting_date: '' });
    } catch (err) {
      setError('Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string, surname: string) => `${name[0]}${surname[0]}`.toUpperCase();

  const getAttendanceStats = (meetingId: string) => {
    const att = attendance.filter(a => a.meeting_id === meetingId);
    return {
      present: att.filter(a => a.status === 'present').length,
      absent: att.filter(a => a.status === 'absent').length,
      late: att.filter(a => a.status === 'late').length,
      total: att.length
    };
  };

  const availableMembers = members.filter(m =>
    !selectedGroup?.members?.some(gm => gm.id === m.id) &&
    (m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     m.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
     m.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Loading / Access Denied
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

  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">Contact admin for access.</p>
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
              Groups & Ministries
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isAdmin ? 'Manage all groups' : `Your access: ${profile?.role}`}
              {(profile?.role === 'group_leader' || profile?.is_leader) && ' • Leader'}
            </p>
          </div>
          {canManageGroups && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
            >
              <Plus className="h-5 w-5" />
              {showForm ? 'Cancel' : 'Create Group'}
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-700">{error}</p>
            </div>
            <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Create Group Form */}
        {showForm && canManageGroups && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold mb-6">Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input placeholder="Group Name *" value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} className="px-4 py-3 border rounded-xl" required />
                <input placeholder="Location" value={groupForm.location} onChange={e => setGroupForm({ ...groupForm, location: e.target.value })} className="px-4 py-3 border rounded-xl" />
                <select value={groupForm.meeting_day} onChange={e => setGroupForm({ ...groupForm, meeting_day: e.target.value })} className="px-4 py-3 border rounded-xl">
                  <option>Select Day</option>
                  {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input type="time" value={groupForm.meeting_time} onChange={e => setGroupForm({ ...groupForm, meeting_time: e.target.value })} className="px-4 py-3 border rounded-xl" />
                <textarea placeholder="Description" value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} className="md:col-span-2 px-4 py-3 border rounded-xl" rows={3} />
                <select value={groupForm.leader_id} onChange={e => setGroupForm({ ...groupForm, leader_id: e.target.value })} className="md:col-span-2 px-4 py-3 border rounded-xl">
                  <option>Select Leader</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name} {m.surname}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={loading} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create Group'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border rounded-xl">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Groups List */}
        {!selectedGroup ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading && groups.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : groups.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white/70 dark:bg-gray-800/70 rounded-2xl">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">{isAdmin ? 'No Groups' : 'Not Assigned'}</h3>
                {canManageGroups && <button onClick={() => setShowForm(true)} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg">Create First Group</button>}
              </div>
            ) : (
              groups.map(group => (
                <div
                  key={group.id}
                  onClick={() => {
                    setSelectedGroup(group);
                    fetchGroupMeetings(group.id);
                  }}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border rounded-2xl p-6 hover:shadow-xl cursor-pointer"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <Users className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">{group.name}</h3>
                      {group.location && <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{group.location}</span>}
                      {group.meeting_day && <div className="flex items-center gap-1 text-sm text-gray-600"><Calendar className="h-4 w-4" /> {group.meeting_day}s {group.meeting_time && `at ${group.meeting_time}`}</div>}
                    </div>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-gray-600">
                      <User className="h-4 w-4" />
                      Leader: {group.leader ? `${group.leader.name} ${group.leader.surname}` : 'None'}
                    </div>
                    {group.description && <p className="text-sm text-gray-600 line-clamp-2">{group.description}</p>}
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="text-sm">{group.members?.length || 0} members</span>
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm">
                      {canManageGroup(group) ? 'Manage' : 'View'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Group Detail View */
          <div className="space-y-6">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedGroup.name}</h2>
                  <p className="text-gray-600">Leader: {selectedGroup.leader ? `${selectedGroup.leader.name} ${selectedGroup.leader.surname}` : 'None'}</p>
                </div>
                <button onClick={() => setSelectedGroup(null)} className="px-4 py-2 border rounded-lg">Back</button>
              </div>
              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {(['groups', 'meetings', 'members'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${activeTab === tab ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}>
                    {tab === 'groups' ? 'Info' : tab === 'meetings' ? 'Meetings' : 'Members'}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'groups' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Group Info</h3>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p><strong>Name:</strong> {selectedGroup.name}</p>
                    <p><strong>Description:</strong> {selectedGroup.description || '—'}</p>
                    <p><strong>Meeting:</strong> {selectedGroup.meeting_day || '—'} {selectedGroup.meeting_time && `at ${selectedGroup.meeting_time}`}</p>
                    <p><strong>Location:</strong> {selectedGroup.location || '—'}</p>
                  </div>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Actions</h3>
                  <div className="space-y-3">
                    {canManageGroup(selectedGroup) && (
                      <>
                        <button onClick={() => setShowMeetingForm(true)} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg"><Plus className="h-4 w-4" /> Schedule Meeting</button>
                        <button onClick={() => setActiveTab('members')} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg"><Users className="h-4 w-4" /> Manage Members</button>
                      </>
                    )}
                    <button onClick={() => { fetchGroupMeetings(selectedGroup.id); setActiveTab('meetings'); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg"><Calendar className="h-4 w-4" /> View Meetings</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'meetings' && (
              <div className="space-y-6">
                <div className="flex justify-between">
                  <h3 className="text-lg font-semibold">Meetings</h3>
                  {canManageGroup(selectedGroup) && <button onClick={() => setShowMeetingForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg"><Plus className="h-4 w-4" /> Schedule</button>}
                </div>
                {meetings.length === 0 ? (
                  <div className="text-center py-12 bg-white/70 rounded-2xl">
                    <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p>No meetings yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {meetings.map(m => {
                      const stats = getAttendanceStats(m.id);
                      return (
                        <div key={m.id} className="bg-white/70 dark:bg-gray-800/70 border rounded-2xl p-6">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-semibold">{new Date(m.meeting_date).toLocaleDateString()} • {m.meeting_time}</h4>
                              <p className="text-gray-600">{m.topic} • {m.location}</p>
                              {stats.total > 0 && (
                                <div className="flex gap-4 mt-2 text-sm">
                                  <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3 w-3" /> {stats.present}</span>
                                  <span className="flex items-center gap-1 text-red-600"><XCircle className="h-3 w-3" /> {stats.absent}</span>
                                  <span className="flex items-center gap-1 text-yellow-600"><Clock4 className="h-3 w-3" /> {stats.late}</span>
                                </div>
                              )}
                            </div>
                            {canManageGroup(selectedGroup) && (
                              <div className="flex gap-2">
                                <button onClick={() => handleTakeAttendance(m)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Attendance</button>
                                {m.status === 'scheduled' && <button onClick={() => { setSelectedMeeting(m); handleCloseMeeting(); }} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Close</button>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'members' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Members ({selectedGroup.members?.length || 0})</h3>

                {canManageGroup(selectedGroup) && canAddMembers && (
                  <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl p-6">
                    <h4 className="font-semibold mb-4">Add Members</h4>
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border rounded-xl mb-4"
                    />
                    <div className="max-h-60 overflow-y-auto border rounded-xl">
                      {availableMembers.map(m => (
                        <label key={m.id} className="flex items-center gap-3 p-4 border-b hover:bg-gray-50">
                          <input type="checkbox" checked={selectedMembers.includes(m.id)} onChange={() => setSelectedMembers(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])} />
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm">{getInitials(m.name, m.surname)}</div>
                          <div>
                            <div className="font-medium">{m.name} {m.surname}</div>
                            <div className="text-sm text-gray-500">{m.email} • {m.phone}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {selectedMembers.length > 0 && (
                      <button onClick={() => handleAddMembersToGroup(selectedGroup.id, selectedMembers)} className="mt-4 w-full px-4 py-3 bg-blue-600 text-white rounded-lg">
                        Add {selectedMembers.length} Member{selectedMembers.length > 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                )}

                <div className="bg-white/70 dark:bg-gray-800/70 rounded-2xl p-6">
                  <h4 className="font-semibold mb-4">Current Members</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedGroup.members?.map(m => (
                      <div key={m.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {getInitials(m.name, m.surname)}
                          </div>
                          <div>
                            <div className="font-medium">{m.name} {m.surname}</div>
                            <div className="text-sm text-gray-500">{m.phone || 'No phone'}</div>
                          </div>
                        </div>
                        {canEditMembers() && (
                          <button onClick={() => handleRemoveMemberFromGroup(m.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        {showMeetingForm && <MeetingFormModal group={selectedGroup!} onSubmit={handleCreateMeeting} onClose={() => setShowMeetingForm(false)} form={meetingForm} setForm={setMeetingForm} loading={loading} />}
        {showAttendanceModal && <AttendanceModal members={groups.find(g => g.id === selectedMeeting?.group_id)?.members || []} data={attendanceData} notes={attendanceNotes} setData={setAttendanceData} setNotes={setAttendanceNotes} onSave={handleSaveAttendance} onClose={() => setShowAttendanceModal(false)} loading={loading} />}
        {showReportModal && <ReportModal form={reportForm} setForm={setReportForm} onSubmit={handleSubmitReport} onClose={() => setShowReportModal(false)} loading={loading} />}
      </div>
    </div>
  );
};

// Helper Modals
const MeetingFormModal = ({ group, onSubmit, onClose, form, setForm, loading }: any) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between mb-6"><h3 className="text-2xl font-bold">Schedule Meeting</h3><button onClick={onClose}><X className="h-5 w-5" /></button></div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input type="date" required value={form.meeting_date} onChange={e => setForm({ ...form, meeting_date: e.target.value })} className="px-3 py-2 border rounded-lg" />
          <input type="time" required value={form.meeting_time} onChange={e => setForm({ ...form, meeting_time: e.target.value })} className="px-3 py-2 border rounded-lg" />
        </div>
        <input type="text" required placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
        <input type="text" placeholder="Topic" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
        <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} />
        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-3 rounded-lg disabled:opacity-50">Schedule</button>
          <button type="button" onClick={onClose} className="flex-1 border py-3 rounded-lg">Cancel</button>
        </div>
      </form>
    </div>
  </div>
);

// Add AttendanceModal and ReportModal similarly if needed

export default Groups;
