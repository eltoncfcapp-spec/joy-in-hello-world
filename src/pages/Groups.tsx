import { Plus, Users, MapPin, Calendar, User, Search, X, Trash2, Edit, Shield, AlertCircle, FileText, Save, Eye, Clock, CheckCircle, XCircle, UserPlus, Mail, Phone, Ban } from 'lucide-react';
import { useState, useEffect } from 'react';

// Mock Supabase client for demonstration
const supabase = {
  from: (table: string) => ({
    select: (query?: string) => ({
      eq: (column: string, value: any) => ({
        single: async () => ({ data: null, error: null }),
        order: (column: string, options?: any) => ({
          then: async (callback: any) => callback({ data: [], error: null })
        }),
        then: async (callback: any) => callback({ data: [], error: null })
      }),
      or: (query: string) => ({
        order: (column: string) => ({
          then: async (callback: any) => callback({ data: [], error: null })
        })
      }),
      order: (column: string, options?: any) => ({
        then: async (callback: any) => callback({ data: [], error: null })
      }),
      then: async (callback: any) => callback({ data: [], error: null })
    }),
    insert: (data: any) => ({
      select: () => ({
        single: async () => ({ data: null, error: null })
      }),
      then: async (callback: any) => callback({ data: null, error: null })
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        then: async (callback: any) => callback({ data: null, error: null })
      })
    }),
    delete: () => ({
      eq: (column: string, value: any) => ({
        then: async (callback: any) => callback({ data: null, error: null })
      })
    })
  })
};
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
  status: 'scheduled' | 'completed' | 'cancelled';
  cancellation_reason?: string | null;
  created_at: string;
  has_attendance?: boolean;
  has_report?: boolean;
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
  is_leader?: boolean;
}

interface Attendance {
  id: string;
  meeting_id: string;
  member_id: string;
  status: 'present' | 'absent' | 'absent_with_reason';
  reason?: string | null;
  created_at: string;
  member?: Member;
}

const Groups = () => {
  const { profile, hasPermission, canViewGroup, canManageGroup, getUserGroups } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMeetingsModal, setShowMeetingsModal] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showReportView, setShowReportView] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showManageLeadersModal, setShowManageLeadersModal] = useState(false);
  const [showCancelMeetingModal, setShowCancelMeetingModal] = useState(false);
  const [showCompleteMeetingModal, setShowCompleteMeetingModal] = useState(false);
  
  const [Groups, setGroups] = useState<CellGroup[]>([]);
  const [allGroups, setAllGroups] = useState<CellGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingReports, setMeetingReports] = useState<MeetingReport[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [potentialLeaders, setPotentialLeaders] = useState<Member[]>([]);
  
  const [selectedGroup, setSelectedGroup] = useState<CellGroup | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedReport, setSelectedReport] = useState<MeetingReport | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [cancellationReason, setCancellationReason] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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

  const [attendanceFormData, setAttendanceFormData] = useState<{
    [key: string]: 'present' | 'absent' | 'absent_with_reason';
  }>({});

  const [absenceReasons, setAbsenceReasons] = useState<{[key: string]: string}>({});

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Mock data for demonstration
  useEffect(() => {
    const mockGroups: CellGroup[] = [
      {
        id: 'group-1',
        name: 'Downtown Fellowship',
        location: '123 Main Street',
        meeting_day: 'Wednesday',
        meeting_time: '19:00',
        leader_id: 'leader-1',
        leader: {
          id: 'leader-1',
          name: 'Sarah',
          surname: 'Johnson',
          email: 'sarah@example.com',
          phone: '+1234567890'
        },
        description: 'A vibrant community in the heart of downtown',
        members: []
      }
    ];

    const mockMembers: Member[] = [
      {
        id: 'member-1',
        name: 'John',
        surname: 'Smith',
        email: 'john@example.com',
        phone: '+1234567891',
        cell_group_id: 'group-1'
      },
      {
        id: 'member-2',
        name: 'Mary',
        surname: 'Brown',
        email: 'mary@example.com',
        phone: '+1234567892',
        cell_group_id: 'group-1'
      }
    ];

    const mockMeetings: Meeting[] = [
      {
        id: 'meeting-1',
        group_id: 'group-1',
        meeting_date: '2025-11-20',
        meeting_time: '19:00',
        location: '123 Main Street',
        topic: 'Community Building',
        notes: 'Focus on strengthening relationships',
        status: 'scheduled',
        created_at: '2025-11-14T10:00:00Z',
        has_attendance: false,
        has_report: false
      }
    ];

    setAllGroups(mockGroups);
    setGroups(mockGroups);
    setMembers(mockMembers);
    setMeetings(mockMeetings);
    setHasAccess(true);
    setInitialLoad(false);
  }, []);

  const canCreateGroups = () => {
    if (!profile) return false;
    return hasPermission('manage_all_groups') || profile.role === 'admin';
  };

  const canViewAllGroups = () => {
    if (!profile) return false;
    return hasPermission('view_all_groups') || profile.role === 'admin';
  };

  const canManageAllGroups = () => {
    if (!profile) return false;
    return hasPermission('manage_all_groups') || profile.role === 'admin';
  };

  const checkCanManageGroup = (group: CellGroup) => {
    if (!profile) return false;
    return canManageGroup(group.id) || canManageAllGroups();
  };

  const checkCanViewGroup = (group: CellGroup) => {
    if (!profile) return false;
    return canViewGroup(group.id) || canViewAllGroups();
  };

  // Cancel Meeting Function
  const openCancelMeetingModal = (meeting: Meeting) => {
    if (!selectedGroup || !checkCanManageGroup(selectedGroup)) {
      setError('You do not have permission to cancel meetings for this group');
      return;
    }

    setSelectedMeeting(meeting);
    setCancellationReason('');
    setShowCancelMeetingModal(true);
  };

  const cancelMeeting = async () => {
    if (!selectedMeeting || !cancellationReason.trim()) {
      setError('Cancellation reason is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Update meeting status to cancelled with reason
      const { error } = await supabase
        .from('meetings')
        .update({ 
          status: 'cancelled',
          cancellation_reason: cancellationReason
        })
        .eq('id', selectedMeeting.id);

      if (error) throw error;

      if (selectedGroup) {
        await fetchMeetings(selectedGroup.id);
      }

      setSuccess('Meeting cancelled successfully');
      setTimeout(() => setSuccess(null), 3000);
      setShowCancelMeetingModal(false);
      setCancellationReason('');
    } catch (error: any) {
      console.error('Error cancelling meeting:', error);
      setError(`Error cancelling meeting: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Complete Meeting Function
  const openCompleteMeetingModal = async (meeting: Meeting) => {
    if (!selectedGroup || !checkCanManageGroup(selectedGroup)) {
      setError('You do not have permission to complete meetings for this group');
      return;
    }

    // Check if attendance has been recorded
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('*')
      .eq('meeting_id', meeting.id);

    const hasAttendance = attendanceData && attendanceData.length > 0;

    // Check if report has been created
    const { data: reportData } = await supabase
      .from('meeting_reports')
      .select('*')
      .eq('meeting_id', meeting.id);

    const hasReport = reportData && reportData.length > 0;

    // Get total members count
    const groupMembers = members.filter(m => m.cell_group_id === selectedGroup.id);
    const allMembersRecorded = hasAttendance && attendanceData.length === groupMembers.length;

    if (!allMembersRecorded) {
      setError('Cannot complete meeting: Attendance must be recorded for all members');
      return;
    }

    if (!hasReport) {
      setError('Cannot complete meeting: A meeting report must be created first');
      return;
    }

    setSelectedMeeting(meeting);
    setShowCompleteMeetingModal(true);
  };

  const completeMeeting = async () => {
    if (!selectedMeeting) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('meetings')
        .update({ status: 'completed' })
        .eq('id', selectedMeeting.id);

      if (error) throw error;

      if (selectedGroup) {
        await fetchMeetings(selectedGroup.id);
      }

      setSuccess('Meeting marked as completed!');
      setTimeout(() => setSuccess(null), 3000);
      setShowCompleteMeetingModal(false);
    } catch (error: any) {
      console.error('Error completing meeting:', error);
      setError(`Error completing meeting: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetings = async (groupId: string) => {
    // Mock implementation
    console.log('Fetching meetings for group:', groupId);
  };

  const openAttendanceModal = async (meeting: Meeting) => {
    if (!selectedGroup || !checkCanManageGroup(selectedGroup)) {
      setError('You do not have permission to manage attendance for this group');
      return;
    }

    setSelectedMeeting(meeting);
    setShowAttendanceModal(true);
  };

  const handleAttendanceChange = (memberId: string, status: 'present' | 'absent' | 'absent_with_reason') => {
    setAttendanceFormData(prev => ({
      ...prev,
      [memberId]: status
    }));

    if (status !== 'absent_with_reason') {
      setAbsenceReasons(prev => {
        const newReasons = { ...prev };
        delete newReasons[memberId];
        return newReasons;
      });
    }
  };

  const handleReasonChange = (memberId: string, reason: string) => {
    setAbsenceReasons(prev => ({
      ...prev,
      [memberId]: reason
    }));
  };

  const saveAttendance = async () => {
    if (!selectedMeeting || !selectedGroup) return;

    const groupMembers = members.filter(member => member.cell_group_id === selectedGroup.id);
    
    // Check if all members have attendance assigned
    const allAssigned = groupMembers.every(member => attendanceFormData[member.id]);
    
    if (!allAssigned) {
      setError('Please assign attendance status for all members before saving');
      return;
    }

    // Check if reasons are provided for absent_with_reason
    const needsReason = groupMembers.filter(member => 
      attendanceFormData[member.id] === 'absent_with_reason'
    );
    
    const allReasonsProvided = needsReason.every(member => 
      absenceReasons[member.id] && absenceReasons[member.id].trim() !== ''
    );

    if (!allReasonsProvided) {
      setError('Please provide reasons for all absences marked as "Absent with Reason"');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const attendanceRecords = groupMembers.map(member => {
        const status = attendanceFormData[member.id];
        const reason = status === 'absent_with_reason' ? absenceReasons[member.id] || '' : null;

        return {
          meeting_id: selectedMeeting.id,
          member_id: member.id,
          status,
          reason
        };
      });

      const { error: deleteError } = await supabase
        .from('attendance')
        .delete()
        .eq('meeting_id', selectedMeeting.id);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('attendance')
        .insert(attendanceRecords);

      if (insertError) throw insertError;

      setSuccess('Attendance saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
      setShowAttendanceModal(false);
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      setError(`Error saving attendance: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openMeetingsModal = async (group: CellGroup) => {
    if (!checkCanViewGroup(group)) {
      setError('You do not have permission to view this cell group');
      return;
    }

    setSelectedGroup(group);
    setShowMeetingsModal(true);
  };

  const openReportForm = (meeting?: Meeting) => {
    if (!selectedGroup || !checkCanManageGroup(selectedGroup)) {
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

  const createMeetingReport = async () => {
    if (!profile || !reportFormData.report_text.trim()) {
      setError('Report text is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('meeting_reports')
        .insert({
          meeting_id: reportFormData.meeting_id || null,
          report_text: reportFormData.report_text,
          decisions_made: reportFormData.decisions_made || null,
          action_items: reportFormData.action_items || null,
          next_meeting_date: reportFormData.next_meeting_date || null,
          created_by: profile.id
        });

      if (error) throw error;

      setShowReportForm(false);
      setSuccess('Meeting report created successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error creating meeting report:', error);
      setError(`Error creating meeting report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const closeAllModals = () => {
    setShowMeetingsModal(false);
    setShowReportForm(false);
    setShowReportView(false);
    setShowAddMembersModal(false);
    setShowAttendanceModal(false);
    setShowManageLeadersModal(false);
    setShowEditForm(false);
    setShowCancelMeetingModal(false);
    setShowCompleteMeetingModal(false);
    setSelectedGroup(null);
    setSelectedMeeting(null);
    setSelectedReport(null);
    setCancellationReason('');
  };

  const filteredGroups = Groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (initialLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Cell Groups
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your cell groups, meetings, and reports
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-700 font-medium">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-green-700 font-medium">{success}</p>
              </div>
              <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{group.name}</h3>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {group.leader && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <User className="h-4 w-4" />
                    <span className="text-sm">
                      Leader: {group.leader.name} {group.leader.surname}
                    </span>
                  </div>
                )}
                
                {group.location && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{group.location}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openMeetingsModal(group)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Meetings
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Meetings Modal */}
        {showMeetingsModal && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedGroup.name} - Meetings
                </h3>
                <button
                  onClick={closeAllModals}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {meetings.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">No meetings scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meetings.map((meeting) => (
                      <div key={meeting.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div className="flex justify-between items-start mb-3">
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
                            {meeting.status === 'cancelled' && meeting.cancellation_reason && (
                              <div className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                                <Ban className="h-3 w-3" />
                                Reason: {meeting.cancellation_reason}
                              </div>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            meeting.status === 'completed' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : meeting.status === 'cancelled'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {meeting.status}
                          </span>
                        </div>
                        
                        {meeting.status === 'scheduled' && checkCanManageGroup(selectedGroup) && (
                          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <button
                              onClick={() => openAttendanceModal(meeting)}
                              className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors"
                            >
                              <Users className="h-3 w-3" />
                              Attendance
                            </button>
                            <button
                              onClick={() => openReportForm(meeting)}
                              className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                            >
                              <FileText className="h-3 w-3" />
                              Create Report
                            </button>
                            <button
                              onClick={() => openCompleteMeetingModal(meeting)}
                              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Complete
                            </button>
                            <button
                              onClick={() => openCancelMeetingModal(meeting)}
                              className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                            >
                              <Ban className="h-3 w-3" />
                              Cancel Meeting
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cancel Meeting Modal */}
        {showCancelMeetingModal && selectedMeeting && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Cancel Meeting
                </h3>
                <button
                  onClick={closeAllModals}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  You are about to cancel the meeting scheduled for{' '}
                  <span className="font-semibold">
                    {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
                  </span>
                </p>
                
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cancellation Reason *
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Please provide a reason for cancelling this meeting..."
                  required
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  This reason will be visible to all group members
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelMeeting}
                  disabled={loading || !cancellationReason.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Ban className="h-4 w-4" />
                  {loading ? 'Cancelling...' : 'Cancel Meeting'}
                </button>
                <button
                  onClick={closeAllModals}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Meeting Modal */}
        {showCompleteMeetingModal && selectedMeeting && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Complete Meeting
                </h3>
                <button
                  onClick={closeAllModals}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Mark the meeting scheduled for{' '}
                  <span className="font-semibold">
                    {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
                  </span>
                  {' '}as completed?
                </p>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">All requirements met:</span>
                  </div>
                  <ul className="ml-6 space-y-1 text-sm text-green-600 dark:text-green-400">
                    <li>✓ Attendance recorded for all members</li>
                    <li>✓ Meeting report completed</li>
                  </ul>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Once completed, this meeting cannot be edited further.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={completeMeeting}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  {loading ? 'Completing...' : 'Mark as Complete'}
                </button>
                <button
                  onClick={closeAllModals}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Modal */}
        {showAttendanceModal && selectedMeeting && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Attendance for {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Mark attendance for all members before saving
                  </p>
                </div>
                <button
                  onClick={closeAllModals}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {members.filter(member => member.cell_group_id === selectedGroup.id).map(member => (
                  <div key={member.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {member.name} {member.surname}
                          </div>
                          {member.email && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                              <Mail className="h-3 w-3" />
                              {member.email}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAttendanceChange(member.id, 'present')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                              attendanceFormData[member.id] === 'present'
                                ? 'bg-green-600 text-white shadow-lg'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Present
                          </button>

                          <button
                            onClick={() => handleAttendanceChange(member.id, 'absent')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                              attendanceFormData[member.id] === 'absent'
                                ? 'bg-red-600 text-white shadow-lg'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                          >
                            <XCircle className="h-4 w-4" />
                            Absent
                          </button>

                          <button
                            onClick={() => handleAttendanceChange(member.id, 'absent_with_reason')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                              attendanceFormData[member.id] === 'absent_with_reason'
                                ? 'bg-orange-600 text-white shadow-lg'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                          >
                            <FileText className="h-4 w-4" />
                            Absent w/ Reason
                          </button>
                        </div>
                      </div>

                      {attendanceFormData[member.id] === 'absent_with_reason' && (
                        <div className="mt-3 pl-4 border-l-4 border-orange-500">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Reason for Absence *
                          </label>
                          <input
                            type="text"
                            value={absenceReasons[member.id] || ''}
                            onChange={(e) => handleReasonChange(member.id, e.target.value)}
                            placeholder="Enter reason for absence..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      )}

                      {!attendanceFormData[member.id] && (
                        <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded">
                          ⚠️ Please mark attendance for this member
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={saveAttendance}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {loading ? 'Saving...' : 'Save Attendance'}
                </button>
                <button
                  onClick={closeAllModals}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
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
                  Create Meeting Report
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
                createMeetingReport();
              }} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Associated Meeting
                  </label>
                  <select
                    value={reportFormData.meeting_id}
                    onChange={(e) => setReportFormData({ ...reportFormData, meeting_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a meeting</option>
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
                    {loading ? 'Saving...' : 'Create Report'}
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
      </div>
    </div>
  );
};

export default Groups;
