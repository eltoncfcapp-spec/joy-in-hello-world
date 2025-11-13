'use client';

import { Users, Plus, Calendar, User, Search, X, CheckCircle, XCircle, Clock4, Trash2, Edit3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

interface Group {
  id: string;
  name: string;
  description?: string | null;
  meeting_day: string | null;
  meeting_time?: string | null;
  location: string | null;
  leader_id: string | null;
  leader?: { name: string; surname: string } | null;
  members?: Member[];
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  role: string;
  cell_group_id: string | null;
}

interface Meeting {
  id: string;
  group_id: string;
  meeting_date: string;
  meeting_time: string;
  location: string;
  topic: string | null;
  notes: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface Attendance {
  id: string;
  meeting_id: string;
  member_id: string;
  status: 'present' | 'absent' | 'late';
  arrival_time: string | null;
  notes: string | null;
}

const Groups = () => {
  const [user, setUser] = useState<any>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'meetings' | 'members'>('info');

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const [groupForm, setGroupForm] = useState({
    name: '', description: '', meeting_day: '', meeting_time: '', location: '', leader_id: ''
  });

  const [meetingForm, setMeetingForm] = useState({
    meeting_date: '', meeting_time: '', location: '', topic: '', notes: ''
  });

  const [reportForm, setReportForm] = useState({
    report_text: '', decisions_made: '', action_items: '', next_meeting_date: ''
  });

  const [attendanceData, setAttendanceData] = useState<{ [k: string]: 'present' | 'absent' | 'late' }>({});
  const [attendanceNotes, setAttendanceNotes] = useState<{ [k: string]: string }>({});

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Auth + User Role
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('members')
          .select('id, role, cell_group_id')
          .eq('id', user.id)
          .single();
        setUser(data);
      }
    };
    getUser();
  }, []);

  // Fetch Groups (permission-aware)
  useEffect(() => {
    if (!user) return;

    const fetchGroups = async () => {
      setLoading(true);
      let query = supabase
        .from('cell_groups')
        .select(`
          *,
          leader:members!cell_groups_leader_id_fkey (name, surname)
        `)
        .eq('status', 'active');

      if (user.role !== 'admin') {
        if (user.role === 'group_leader' || user.cell_group_id) {
          query = query.eq('id', user.cell_group_id || user.leader_of_group);
        }
      }

      const { data, error } = await query.order('name');
      if (error) {
        console.error(error);
        alert('Access denied or error loading groups');
      } else {
        setGroups(data || []);
      }
      setLoading(false);
    };

    fetchGroups();
  }, [user]);

  // Fetch group members
  const fetchGroupMembers = async (groupId: string) => {
    const { data } = await supabase
      .from('members')
      .select('id, name, surname, email, phone')
      .eq('cell_group_id', groupId);
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, members: data || [] } : g));
  };

  // Fetch meetings
  const fetchMeetings = async (groupId: string) => {
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .eq('group_id', groupId)
      .order('meeting_date', { ascending: false });
    setMeetings(data || []);
  };

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupMembers(selectedGroup.id);
      fetchMeetings(selectedGroup.id);
    }
  }, [selectedGroup]);

  // Permissions
  const isAdmin = user?.role === 'admin';
  const isLeader = selectedGroup?.leader_id === user?.id;
  const isMember = selectedGroup?.members?.some((m: any) => m.id === user?.id);
  const canEdit = isAdmin || isLeader;

  // Create Group (Admin only)
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return alert('Only admins can create groups');
    if (!groupForm.name) return alert('Name required');

    const { data, error } = await supabase
      .from('cell_groups')
      .insert([{
        name: groupForm.name,
        description: groupForm.description || null,
        meeting_day: groupForm.meeting_day || null,
        meeting_time: groupForm.meeting_time || null,
        location: groupForm.location || null,
        leader_id: groupForm.leader_id || null,
        status: 'active'
      }])
      .select(`
        *, leader:members!cell_groups_leader_id_fkey (name, surname)
      `)
      .single();

    if (error) alert(error.message);
    else {
      setGroups(prev => [...prev, data]);
      setGroupForm({ name: '', description: '', meeting_day: '', meeting_time: '', location: '', leader_id: '' });
      setShowMeetingForm(false);
    }
  };

  // Add/Remove Members (Leader/Admin)
  const handleAddMembers = async () => {
    if (!canEdit || !selectedGroup) return;
    const { error } = await supabase
      .from('members')
      .update({ cell_group_id: selectedGroup.id })
      .in('id', selectedMembers);
    if (!error) {
      await fetchGroupMembers(selectedGroup.id);
      setSelectedMembers([]);
      setSearchTerm('');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!canEdit) return;
    await supabase.from('members').update({ cell_group_id: null }).eq('id', memberId);
    await fetchGroupMembers(selectedGroup!.id);
  };

  // Meetings & Attendance
  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !selectedGroup) return;

    const { data } = await supabase
      .from('meetings')
      .insert([{
        group_id: selectedGroup.id,
        meeting_date: meetingForm.meeting_date,
        meeting_time: meetingForm.meeting_time,
        location: meetingForm.location,
        topic: meetingForm.topic || null,
        notes: meetingForm.notes || null,
        status: 'scheduled'
      }])
      .select()
      .single();

    setMeetings(prev => [data, ...prev]);
    setShowMeetingForm(false);
    setMeetingForm({ meeting_date: '', meeting_time: '', location: '', topic: '', notes: '' });
  };

  const handleTakeAttendance = async (meeting: Meeting) => {
    if (!canEdit) return;
    setSelectedMeeting(meeting);
    const { data } = await supabase.from('attendance').select('*').eq('meeting_id', meeting.id);
    setAttendance(data || []);

    const init: any = {};
    const notes: any = {};
    selectedGroup?.members?.forEach((m: any) => {
      const rec = data?.find(a => a.member_id === m.id);
      init[m.id] = rec?.status || 'absent';
      notes[m.id] = rec?.notes || '';
    });
    setAttendanceData(init);
    setAttendanceNotes(notes);
    setShowAttendanceModal(true);
  };

  const handleSaveAttendance = async () => {
    if (!selectedMeeting || !canEdit) return;
    await supabase.from('attendance').delete().eq('meeting_id', selectedMeeting.id);
    const records = selectedGroup?.members?.map((m: any) => ({
      meeting_id: selectedMeeting.id,
      member_id: m.id,
      status: attendanceData[m.id] || 'absent',
      notes: attendanceNotes[m.id] || null,
      arrival_time: attendanceData[m.id] === 'late' ? new Date().toTimeString().slice(0, 8) : null
    })) || [];
    await supabase.from('attendance').insert(records);
    setShowAttendanceModal(false);
  };

  const handleCloseMeeting = async () => {
    if (!selectedMeeting || !canEdit) return;
    await supabase.from('meetings').update({ status: 'completed' }).eq('id', selectedMeeting.id);
    setMeetings(prev => prev.map(m => m.id === selectedMeeting.id ? { ...m, status: 'completed' } : m));
    setShowReportModal(true);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting || !canEdit) return;
    await supabase.from('meeting_reports').insert([{
      meeting_id: selectedMeeting.id,
      report_text: reportForm.report_text,
      decisions_made: reportForm.decisions_made || null,
      action_items: reportForm.action_items || null,
      next_meeting_date: reportForm.next_meeting_date || null,
      created_by: user.id
    }]);
    setShowReportModal(false);
    setReportForm({ report_text: '', decisions_made: '', action_items: '', next_meeting_date: '' });
  };

  const availableMembers = members.filter(m =>
    !selectedGroup?.members?.some(gm => gm.id === m.id) &&
    `${m.name} ${m.surname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Cell Groups
            </h1>
            <p className="text-gray-600">
              {isAdmin ? 'Manage all groups' : isLeader ? 'Your group' : 'Your cell group'}
            </p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowMeetingForm(true)} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl">
              <Plus className="h-5 w-5" /> Create Group
            </button>
          )}
        </div>

        {/* Create Group Form (Admin Only) */}
        {showMeetingForm && isAdmin && !selectedGroup && (
          <div className="bg-white rounded-2xl p-6 mb-6 shadow">
            <h2 className="text-2xl font-bold mb-6">Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <input placeholder="Name *" required value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} className="w-full px-4 py-3 border rounded-xl" />
              <input placeholder="Location" value={groupForm.location} onChange={e => setGroupForm({ ...groupForm, location: e.target.value })} className="w-full px-4 py-3 border rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                <select value={groupForm.meeting_day} onChange={e => setGroupForm({ ...groupForm, meeting_day: e.target.value })} className="px-4 py-3 border rounded-xl">
                  <option>Select Day</option>
                  {daysOfWeek.map(d => <option key={d}>{d}</option>)}
                </select>
                <input type="time" value={groupForm.meeting_time} onChange={e => setGroupForm({ ...groupForm, meeting_time: e.target.value })} className="px-4 py-3 border rounded-xl" />
              </div>
              <textarea placeholder="Description" value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} className="w-full px-4 py-3 border rounded-xl" />
              <select value={groupForm.leader_id} onChange={e => setGroupForm({ ...groupForm, leader_id: e.target.value })} className="w-full px-4 py-3 border rounded-xl">
                <option value="">Select Leader</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name} {m.surname}</option>)}
              </select>
              <div className="flex gap-3">
                <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-xl">Create</button>
                <button type="button" onClick={() => setShowMeetingForm(false)} className="px-6 py-3 border rounded-xl">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Group List */}
        {!selectedGroup ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map(group => (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className="bg-white rounded-2xl p-6 shadow hover:shadow-xl transition cursor-pointer"
              >
                <div className="flex justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white">
                    <Users className="h-6 w-6" />
                  </div>
                  {canEdit && <Edit3 className="h-5 w-5 text-gray-400" />}
                </div>
                <h3 className="text-xl font-bold mb-2">{group.name}</h3>
                <p className="text-sm text-gray-600">{group.location}</p>
                <p className="text-sm text-gray-600">{group.meeting_day} {group.meeting_time}</p>
                <div className="mt-4 pt-4 border-t text-sm">
                  <span>Leader: {group.leader?.name} {group.leader?.surname}</span>
                  <span className="float-right">{group.members?.length || 0} members</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Selected Group View */
          <div>
            <button onClick={() => setSelectedGroup(null)} className="mb-6 text-blue-600 flex items-center gap-1">
              Back to Groups
            </button>

            <div className="bg-white rounded-2xl p-6 mb-6">
              <h2 className="text-2xl font-bold">{selectedGroup.name}</h2>
              <p className="text-gray-600">
                {selectedGroup.leader && `${selectedGroup.leader.name} ${selectedGroup.leader.surname} • `}
                {selectedGroup.location} • {selectedGroup.meeting_day} {selectedGroup.meeting_time}
              </p>
            </div>

            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
              {(['info', 'meetings', 'members'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${activeTab === tab ? 'bg-white shadow' : ''}`}>
                  {tab === 'info' ? 'Info' : tab === 'meetings' ? 'Meetings' : 'Members'}
                </button>
              ))}
            </div>

            {/* Info */}
            {activeTab === 'info' && (
              <div className="bg-white rounded-2xl p-6 space-y-3">
                <div><strong>Name:</strong> {selectedGroup.name}</div>
                <div><strong>Location:</strong> {selectedGroup.location || '—'}</div>
                <div><strong>Meeting:</strong> {selectedGroup.meeting_day} {selectedGroup.meeting_time}</div>
                <div><strong>Leader:</strong> {selectedGroup.leader ? `${selectedGroup.leader.name} ${selectedGroup.leader.surname}` : '—'}</div>
                <div><strong>Description:</strong> {selectedGroup.description || '—'}</div>
              </div>
            )}

            {/* Members */}
            {activeTab === 'members' && canEdit && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6">
                  <h3 className="font-bold mb-4">Add Members</h3>
                  <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-lg mb-4" />
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {availableMembers.map(m => (
                      <label key={m.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                        <input type="checkbox" checked={selectedMembers.includes(m.id)} onChange={() => setSelectedMembers(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])} />
                        <span>{m.name} {m.surname}</span>
                      </label>
                    ))}
                  </div>
                  {selectedMembers.length > 0 && <button onClick={handleAddMembers} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Add Selected</button>}
                </div>

                <div className="bg-white rounded-2xl p-6">
                  <h3 className="font-bold mb-4">Current Members</h3>
                  {selectedGroup.members?.map(m => (
                    <div key={m.id} className="flex justify-between p-3 border-b">
                      <span>{m.name} {m.surname}</span>
                      <button onClick={() => handleRemoveMember(m.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meetings */}
            {activeTab === 'meetings' && (
              <div>
                {canEdit && <button onClick={() => setShowMeetingForm(true)} className="w-full py-3 bg-blue-600 text-white rounded-lg mb-4 flex items-center justify-center gap-2"><Plus className="h-5 w-5" /> Schedule</button>}
                {meetings.map(m => (
                  <div key={m.id} className="bg-white p-4 rounded-xl border mb-3">
                    <div className="flex justify-between">
                      <div>
                        <strong>{new Date(m.meeting_date).toLocaleDateString()}</strong> at {m.meeting_time}
                        <p>{m.topic || 'No topic'}</p>
                      </div>
                      <div className="flex gap-2">
                        {canEdit && <button onClick={() => handleTakeAttendance(m)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Attendance</button>}
                        {canEdit && m.status === 'scheduled' && <button onClick={() => { setSelectedMeeting(m); handleCloseMeeting(); }} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Close</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        {showMeetingForm && canEdit && selectedGroup && /* Schedule Modal */ (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Schedule Meeting</h3>
              <form onSubmit={handleScheduleMeeting} className="space-y-3">
                <input type="date" required value={meetingForm.meeting_date} onChange={e => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })} className="w-full px-3 py-2 border rounded" />
                <input type="time" required value={meetingForm.meeting_time} onChange={e => setMeetingForm({ ...meetingForm, meeting_time: e.target.value })} className="w-full px-3 py-2 border rounded" />
                <input type="text" required placeholder="Location" value={meetingForm.location} onChange={e => setMeetingForm({ ...meetingForm, location: e.target.value })} className="w-full px-3 py-2 border rounded" />
                <input type="text" placeholder="Topic" value={meetingForm.topic} onChange={e => setMeetingForm({ ...meetingForm, topic: e.target.value })} className="w-full px-3 py-2 border rounded" />
                <textarea placeholder="Notes" value={meetingForm.notes} onChange={e => setMeetingForm({ ...meetingForm, notes: e.target.value })} className="w-full px-3 py-2 border rounded" />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded">Schedule</button>
                  <button type="button" onClick={() => setShowMeetingForm(false)} className="flex-1 border py-2 rounded">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAttendanceModal && canEdit && selectedMeeting && /* Attendance Modal */ (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Attendance</h3>
              {selectedGroup?.members?.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-3 border-b">
                  <span>{m.name} {m.surname}</span>
                  <div className="flex gap-2">
                    <select value={attendanceData[m.id] || 'absent'} onChange={e => setAttendanceData({ ...attendanceData, [m.id]: e.target.value as any })} className="px-3 py-1 border rounded">
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                    </select>
                    <input placeholder="Notes" value={attendanceNotes[m.id] || ''} onChange={e => setAttendanceNotes({ ...attendanceNotes, [m.id]: e.target.value })} className="px-2 py-1 border rounded text-sm w-32" />
                  </div>
                </div>
              ))}
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveAttendance} className="flex-1 bg-green-600 text-white py-2 rounded">Save</button>
                <button onClick={() => setShowAttendanceModal(false)} className="flex-1 border py-2 rounded">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showReportModal && canEdit && selectedMeeting && /* Report Modal */ (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Meeting Report</h3>
              <form onSubmit={handleSubmitReport} className="space-y-3">
                <textarea required placeholder="Report..." value={reportForm.report_text} onChange={e => setReportForm({ ...reportForm, report_text: e.target.value })} className="w-full px-3 py-2 border rounded" rows={4} />
                <textarea placeholder="Decisions..." value={reportForm.decisions_made} onChange={e => setReportForm({ ...reportForm, decisions_made: e.target.value })} className="w-full px-3 py-2 border rounded" />
                <textarea placeholder="Action Items..." value={reportForm.action_items} onChange={e => setReportForm({ ...reportForm, action_items: e.target.value })} className="w-full px-3 py-2 border rounded" />
                <input type="date" value={reportForm.next_meeting_date} onChange={e => setReportForm({ ...reportForm, next_meeting_date: e.target.value })} className="w-full px-3 py-2 border rounded" />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded">Submit</button>
                  <button type="button" onClick={() => setShowReportModal(false)} className="flex-1 border py-2 rounded">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;
