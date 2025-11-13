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
  member?: Member;
}

const Groups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'meetings' | 'members'>('info');

  // Meeting & Attendance
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // Forms
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

  const [attendanceData, setAttendanceData] = useState<{ [key: string]: 'present' | 'absent' | 'late' }>({});
  const [attendanceNotes, setAttendanceNotes] = useState<{ [key: string]: string }>({});

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Fetch groups (your exact query)
  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('cell_groups')
        .select(`
          *,
          leader:members!cell_groups_leader_id_fkey (name, surname)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        alert('Failed to load groups');
      } else {
        setGroups(data || []);
      }
      setLoading(false);
    };

    const fetchMembers = async () => {
      const { data } = await supabase.from('members').select('id, name, surname, email, phone');
      setMembers(data || []);
    };

    fetchGroups();
    fetchMembers();
  }, []);

  // Load meetings & members when group selected
  useEffect(() => {
    if (!selectedGroup) return;

    const fetchMeetings = async () => {
      const { data } = await supabase
        .from('meetings')
        .select('*')
        .eq('group_id', selectedGroup.id)
        .order('meeting_date', { ascending: false });
      setMeetings(data || []);
    };

    const fetchMembers = async () => {
      const { data } = await supabase
        .from('members')
        .select('id, name, surname, email, phone')
        .eq('cell_group_id', selectedGroup.id);
      setGroups(prev =>
        prev.map(g => g.id === selectedGroup.id ? { ...g, members: data || [] } : g)
      );
    };

    fetchMeetings();
    fetchMembers();
  }, [selectedGroup]);

  // Create Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return alert('Group name required');

    setLoading(true);
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
        *,
        leader:members!cell_groups_leader_id_fkey (name, surname)
      `)
      .single();

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setGroups(prev => [data, ...prev]);
      setGroupForm({ name: '', description: '', meeting_day: '', meeting_time: '', location: '', leader_id: '' });
      setShowMeetingForm(false);
      alert('Group created!');
    }
    setLoading(false);
  };

  // Add Members
  const handleAddMembers = async () => {
    if (!selectedGroup || selectedMembers.length === 0) return;
    setLoading(true);
    const { error } = await supabase
      .from('members')
      .update({ cell_group_id: selectedGroup.id })
      .in('id', selectedMembers);

    if (!error) {
      const { data } = await supabase
        .from('members')
        .select('id, name, surname, email, phone')
        .eq('cell_group_id', selectedGroup.id);
      setGroups(prev =>
        prev.map(g => g.id === selectedGroup.id ? { ...g, members: data || [] } : g)
      );
      setSelectedMembers([]);
      setSearchTerm('');
    }
    setLoading(false);
  };

  // Remove Member
  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase
      .from('members')
      .update({ cell_group_id: null })
      .eq('id', memberId);
    if (!error && selectedGroup) {
      setGroups(prev =>
        prev.map(g => g.id === selectedGroup.id ? {
          ...g,
          members: g.members?.filter(m => m.id !== memberId) || []
        } : g)
      );
    }
  };

  // Schedule Meeting
  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    const { data, error } = await supabase
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

    if (error) alert(error.message);
    else {
      setMeetings(prev => [data, ...prev]);
      setShowMeetingForm(false);
      setMeetingForm({ meeting_date: '', meeting_time: '', location: '', topic: '', notes: '' });
    }
  };

  // Take Attendance
  const handleTakeAttendance = async (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    const { data } = await supabase
      .from('attendance')
      .select('*, member:members(*)')
      .eq('meeting_id', meeting.id);
    setAttendance(data || []);

    const init: any = {};
    const notes: any = {};
    selectedGroup?.members?.forEach(m => {
      const rec = data?.find(a => a.member_id === m.id);
      init[m.id] = rec?.status || 'absent';
      notes[m.id] = rec?.notes || '';
    });
    setAttendanceData(init);
    setAttendanceNotes(notes);
    setShowAttendanceModal(true);
  };

  // Save Attendance
  const handleSaveAttendance = async () => {
    if (!selectedMeeting || !selectedGroup) return;
    setLoading(true);

    await supabase.from('attendance').delete().eq('meeting_id', selectedMeeting.id);
    const records = selectedGroup.members?.map(m => ({
      meeting_id: selectedMeeting.id,
      member_id: m.id,
      status: attendanceData[m.id] || 'absent',
      notes: attendanceNotes[m.id] || null,
      arrival_time: attendanceData[m.id] === 'late' ? new Date().toTimeString().slice(0, 8) : null
    })) || [];

    await supabase.from('attendance').insert(records);
    setShowAttendanceModal(false);
    setLoading(false);
  };

  // Close Meeting
  const handleCloseMeeting = async () => {
    if (!selectedMeeting) return;
    await supabase.from('meetings').update({ status: 'completed' }).eq('id', selectedMeeting.id);
    setMeetings(prev => prev.map(m => m.id === selectedMeeting.id ? { ...m, status: 'completed' } : m));
    setShowReportModal(true);
  };

  // Submit Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting) return;
    await supabase.from('meeting_reports').insert([{
      meeting_id: selectedMeeting.id,
      report_text: reportForm.report_text,
      decisions_made: reportForm.decisions_made || null,
      action_items: reportForm.action_items || null,
      next_meeting_date: reportForm.next_meeting_date || null,
      created_by: supabase.auth.user()?.id || null
    }]);
    setShowReportModal(false);
    setReportForm({ report_text: '', decisions_made: '', action_items: '', next_meeting_date: '' });
  };

  const getInitials = (name: string, surname: string) =>
    `${name[0]}${surname[0]}`.toUpperCase();

  const availableMembers = members.filter(m =>
    !selectedGroup?.members?.some(gm => gm.id === m.id) &&
    `${m.name} ${m.surname} ${m.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Open Edit Form
  const openEditForm = (group: Group) => {
    setGroupForm({
      name: group.name,
      description: group.description || '',
      meeting_day: group.meeting_day || '',
      meeting_time: group.meeting_time || '',
      location: group.location || '',
      leader_id: group.leader_id || ''
    });
    setSelectedGroup(group);
    setActiveTab('info');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Cell Groups
            </h1>
            <p className="text-gray-600">Manage your cell groups and members</p>
          </div>
          <button
            onClick={() => setShowMeetingForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg font-medium"
          >
            <Plus className="h-5 w-5" />
            Create Group
          </button>
        </div>

        {/* Create Form */}
        {showMeetingForm && !selectedGroup && (
          <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <input placeholder="Group Name *" value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} className="w-full px-4 py-3 border rounded-xl" required />
              <input placeholder="Location" value={groupForm.location} onChange={e => setGroupForm({ ...groupForm, location: e.target.value })} className="w-full px-4 py-3 border rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                <select value={groupForm.meeting_day} onChange={e => setGroupForm({ ...groupForm, meeting_day: e.target.value })} className="px-4 py-3 border rounded-xl">
                  <option value="">Meeting Day</option>
                  {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input type="time" value={groupForm.meeting_time} onChange={e => setGroupForm({ ...groupForm, meeting_time: e.target.value })} className="px-4 py-3 border rounded-xl" />
              </div>
              <textarea placeholder="Description" value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} className="w-full px-4 py-3 border rounded-xl" rows={3} />
              <select value={groupForm.leader_id} onChange={e => setGroupForm({ ...groupForm, leader_id: e.target.value })} className="w-full px-4 py-3 border rounded-xl">
                <option value="">Select Leader</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name} {m.surname}</option>)}
              </select>
              <div className="flex gap-3">
                <button type="submit" disabled={loading} className="px-8 py-3 bg-blue-600 text-white rounded-xl disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create'}
                </button>
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
                onClick={() => openEditForm(group)}
                className="bg-white rounded-2xl p-6 shadow hover:shadow-xl transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white">
                    <Users className="h-6 w-6" />
                  </div>
                  <Edit3 className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">{group.name}</h3>
                {group.location && <p className="text-sm text-gray-600 mb-1">{group.location}</p>}
                {group.meeting_day && (
                  <p className="text-sm text-gray-600">
                    {group.meeting_day}s {group.meeting_time && `at ${group.meeting_time}`}
                  </p>
                )}
                <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                  <span className="text-gray-600">
                    Leader: {group.leader ? `${group.leader.name} ${group.leader.surname}` : 'None'}
                  </span>
                  <span className="font-medium">{group.members?.length || 0} members</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Selected Group View */
          <div>
            <button onClick={() => setSelectedGroup(null)} className="mb-6 text-blue-600 hover:underline flex items-center gap-1">
              ← Back to Groups
            </button>

            <div className="bg-white rounded-2xl p-6 mb-6">
              <h2 className="text-2xl font-bold mb-2">{selectedGroup.name}</h2>
              <p className="text-gray-600">
                {selectedGroup.leader && `${selectedGroup.leader.name} ${selectedGroup.leader.surname} • `}
                {selectedGroup.location} • {selectedGroup.meeting_day} {selectedGroup.meeting_time}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
              {(['info', 'meetings', 'members'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab ? 'bg-white shadow-sm' : 'text-gray-600'
                  }`}
                >
                  {tab === 'info' && 'Group Info'}
                  {tab === 'meetings' && 'Meetings'}
                  {tab === 'members' && 'Members'}
                </button>
              ))}
            </div>

            {/* Info Tab */}
            {activeTab === 'info' && (
              <div className="bg-white rounded-2xl p-6 space-y-4">
                <div><strong>Name:</strong> {selectedGroup.name}</div>
                <div><strong>Location:</strong> {selectedGroup.location || '—'}</div>
                <div><strong>Meeting:</strong> {selectedGroup.meeting_day} {selectedGroup.meeting_time}</div>
                <div><strong>Leader:</strong> {selectedGroup.leader ? `${selectedGroup.leader.name} ${selectedGroup.leader.surname}` : '—'}</div>
                <div><strong>Description:</strong> {selectedGroup.description || '—'}</div>
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6">
                  <h3 className="font-bold mb-4">Add Members</h3>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg mb-4"
                  />
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableMembers.map(m => (
                      <label key={m.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(m.id)}
                          onChange={() => {
                            setSelectedMembers(prev =>
                              prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                            );
                          }}
                        />
                        <span>{m.name} {m.surname}</span>
                      </label>
                    ))}
                  </div>
                  {selectedMembers.length > 0 && (
                    <button onClick={handleAddMembers} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
                      Add {selectedMembers.length} Member{selectedMembers.length > 1 ? 's' : ''}
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-6">
                  <h3 className="font-bold mb-4">Current Members ({selectedGroup.members?.length})</h3>
                  {selectedGroup.members?.map(m => (
                    <div key={m.id} className="flex justify-between items-center p-3 border-b">
                      <span>{m.name} {m.surname}</span>
                      <button onClick={() => handleRemoveMember(m.id)} className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meetings Tab */}
            {activeTab === 'meetings' && (
              <div className="space-y-4">
                <button
                  onClick={() => setShowMeetingForm(true)}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <Plus className="h-5 w-5" /> Schedule Meeting
                </button>
                {meetings.map(m => (
                  <div key={m.id} className="bg-white p-4 rounded-xl border">
                    <div className="flex justify-between">
                      <div>
                        <strong>{new Date(m.meeting_date).toLocaleDateString()}</strong> at {m.meeting_time}
                        <p>{m.topic || 'No topic'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleTakeAttendance(m)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                          Attendance
                        </button>
                        {m.status === 'scheduled' && (
                          <button onClick={() => { setSelectedMeeting(m); handleCloseMeeting(); }} className="px-3 py-1 bg-green-600 text-white rounded text-sm">
                            Close
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        {showMeetingForm && selectedGroup && /* Schedule Meeting Modal */ (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
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

        {/* Attendance Modal */}
        {showAttendanceModal && selectedMeeting && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Attendance - {new Date(selectedMeeting.meeting_date).toLocaleDateString()}</h3>
              {selectedGroup?.members?.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 border-b">
                  <span>{m.name} {m.surname}</span>
                  <div className="flex gap-2">
                    <select
                      value={attendanceData[m.id] || 'absent'}
                      onChange={e => setAttendanceData({ ...attendanceData, [m.id]: e.target.value as any })}
                      className="px-3 py-1 border rounded"
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                    </select>
                    <input
                      placeholder="Notes"
                      value={attendanceNotes[m.id] || ''}
                      onChange={e => setAttendanceNotes({ ...attendanceNotes, [m.id]: e.target.value })}
                      className="px-2 py-1 border rounded text-sm w-32"
                    />
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

        {/* Report Modal */}
        {showReportModal && selectedMeeting && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Meeting Report</h3>
              <form onSubmit={handleSubmitReport} className="space-y-3">
                <textarea required placeholder="Report..." value={reportForm.report_text} onChange={e => setReportForm({ ...reportForm, report_text: e.target.value })} className="w-full px-3 py-2 border rounded" rows={4} />
                <textarea placeholder="Decisions..." value={reportForm.decisions_made} onChange={e => setReportForm({ ...reportForm, decisions_made: e.target.value })} className="w-full px-3 py-2 border rounded" rows={2} />
                <textarea placeholder="Action Items..." value={reportForm.action_items} onChange={e => setReportForm({ ...reportForm, action_items: e.target.value })} className="w-full px-3 py-2 border rounded" rows={2} />
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
