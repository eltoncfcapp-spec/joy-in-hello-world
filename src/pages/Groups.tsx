import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, MapPin, Calendar, User, Search, X, 
  Shield, AlertCircle, CheckCircle, Plus,
  FileText, Eye, ClipboardList
} from 'lucide-react';

// Simple interfaces
interface CellGroup {
  id: string;
  name: string;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  leader_id: string | null;
  description?: string | null;
  memberCount?: number;
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
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  cell_group_id?: string | null;
}

interface AttendanceRecord {
  member_id: string;
  attended: boolean;
  reason?: string;
  notes?: string;
}

interface DiscussionTopic {
  id?: string;
  topic: string;
  discussion_points: string;
  decisions_made?: string;
}

// Group Management Workflow Component
interface WorkflowProps {
  group: CellGroup;
  meetings: Meeting[];
  members: Member[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const GroupManagementWorkflow: React.FC<WorkflowProps> = ({
  group,
  meetings,
  members,
  onClose,
  onSuccess,
  onError
}) => {
  const { profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const steps = [
    { number: 1, title: 'Schedule Meeting', description: 'Create a new meeting schedule' },
    { number: 2, title: 'Take Attendance', description: 'Record member attendance with reasons' },
    { number: 3, title: 'Discussion Topics', description: 'Record meeting discussions' },
    { number: 4, title: 'Create Report', description: 'Generate detailed meeting report' }
  ];

  // Permission checks based on AuthContext profile
  const canAccessStep = (stepNumber: number) => {
    if (!profile) return false;
    
    if (profile.isAdmin) return true;
    
    if (profile.role === 'group_leader') {
      const isAssignedGroup = profile.assigned_groups?.includes(group.id) || 
                             profile.assigned_groups?.includes('all_groups') ||
                             profile.cell_group_id === group.id;
      return isAssignedGroup;
    }
    
    if (profile.role === 'member') {
      const isOwnGroup = profile.cell_group_id === group.id;
      
      switch (stepNumber) {
        case 1: return isOwnGroup && profile.permissions?.includes('create_meetings');
        case 2: return isOwnGroup && profile.permissions?.includes('manage_attendance');
        case 3: return isOwnGroup && profile.permissions?.includes('add_discussions');
        case 4: return isOwnGroup && profile.permissions?.includes('create_reports');
        default: return false;
      }
    }
    
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Step Progress */}
      <div className="flex justify-between mb-8 relative">
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-10"></div>
        {steps.map((step) => (
          <div key={step.number} className="text-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 transition-all duration-300 ${
              currentStep >= step.number 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-gray-300 text-gray-600'
            }`}>
              {step.number}
            </div>
            <div className={`text-sm font-medium ${
              currentStep >= step.number ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {step.title}
            </div>
            <div className="text-xs text-gray-500 mt-1 hidden sm:block">
              {step.description}
            </div>
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 min-h-[400px]">
        {currentStep === 1 && (
          <MeetingCreationStep 
            group={group}
            onMeetingCreated={() => {
              onSuccess('Meeting created successfully!');
              setCurrentStep(2);
            }}
            onError={onError}
          />
        )}

        {currentStep === 2 && (
          <AttendanceStep 
            group={group}
            meetings={meetings}
            selectedMeeting={selectedMeeting}
            onMeetingSelect={setSelectedMeeting}
            onAttendanceSaved={() => {
              onSuccess('Attendance saved successfully!');
              setCurrentStep(3);
            }}
            onError={onError}
          />
        )}

        {currentStep === 3 && (
          <DiscussionStep 
            group={group}
            selectedMeeting={selectedMeeting}
            onDiscussionsSaved={() => {
              onSuccess('Discussions saved successfully!');
              setCurrentStep(4);
            }}
            onError={onError}
          />
        )}

        {currentStep === 4 && (
          <ReportStep 
            group={group}
            selectedMeeting={selectedMeeting}
            onReportCreated={() => {
              onSuccess('Report created successfully!');
              onClose();
            }}
            onError={onError}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-600">
        <button 
          onClick={() => setCurrentStep(prev => prev - 1)}
          disabled={currentStep === 1}
          className="px-6 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-all duration-200 font-medium disabled:opacity-50"
        >
          Previous
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
          >
            Close
          </button>
          
          <button 
            onClick={() => setCurrentStep(prev => prev + 1)}
            disabled={currentStep === 4 || !canAccessStep(currentStep + 1)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

// Step Components Implementation
const MeetingCreationStep: React.FC<{
  group: CellGroup;
  onMeetingCreated: () => void;
  onError: (message: string) => void;
}> = ({ group, onMeetingCreated, onError }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    meeting_date: '',
    meeting_time: '',
    location: group.location || '',
    topic: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('meetings')
        .insert([{
          group_id: group.id,
          meeting_date: formData.meeting_date,
          meeting_time: formData.meeting_time,
          location: formData.location,
          topic: formData.topic,
          notes: formData.notes,
          status: 'scheduled'
        }])
        .select()
        .single();

      if (error) throw error;
      onMeetingCreated();
    } catch (error: any) {
      onError('Failed to create meeting: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Schedule New Meeting</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Meeting Date *</label>
            <input
              type="date"
              required
              value={formData.meeting_date}
              onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Meeting Time</label>
            <input
              type="time"
              value={formData.meeting_time}
              onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg"
            placeholder="Meeting location"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Topic/Theme *</label>
          <input
            type="text"
            required
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg"
            placeholder="Meeting topic or theme"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Agenda/Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg"
            rows={3}
            placeholder="Meeting agenda or additional notes"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Meeting'}
        </button>
      </form>
    </div>
  );
};

const AttendanceStep: React.FC<{
  group: CellGroup;
  meetings: Meeting[];
  selectedMeeting: Meeting | null;
  onMeetingSelect: (meeting: Meeting) => void;
  onAttendanceSaved: () => void;
  onError: (message: string) => void;
}> = ({ group, meetings, selectedMeeting, onMeetingSelect, onAttendanceSaved, onError }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(false);

  const absenceReasons = [
    'Sick',
    'Work commitment',
    'Family emergency',
    'Traveling',
    'Personal reasons',
    'Other'
  ];

  useEffect(() => {
    loadMembers();
  }, [group.id]);

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('cell_group_id', group.id);

      if (error) throw error;
      setMembers(data || []);
      
      // Initialize attendance records
      const initialAttendance: Record<string, AttendanceRecord> = {};
      data?.forEach(member => {
        initialAttendance[member.id] = {
          member_id: member.id,
          attended: true,
          reason: '',
          notes: ''
        };
      });
      setAttendance(initialAttendance);
    } catch (error: any) {
      onError('Failed to load members: ' + error.message);
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedMeeting) {
      onError('Please select a meeting first');
      return;
    }

    setLoading(true);
    try {
      const attendanceRecords = Object.values(attendance).map(record => ({
        meeting_id: selectedMeeting.id,
        member_id: record.member_id,
        attended: record.attended,
        reason: record.attended ? null : record.reason,
        notes: record.notes,
        group_id: group.id
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(attendanceRecords);

      if (error) throw error;

      onAttendanceSaved();
    } catch (error: any) {
      onError('Failed to save attendance: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const presentCount = Object.values(attendance).filter(a => a.attended).length;
  const absentCount = Object.values(attendance).filter(a => !a.attended).length;

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Take Attendance</h3>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Meeting *</label>
        <select
          value={selectedMeeting?.id || ''}
          onChange={(e) => {
            const meeting = meetings.find(m => m.id === e.target.value);
            if (meeting) onMeetingSelect(meeting);
          }}
          className="w-full p-2 border border-gray-300 rounded-lg"
          required
        >
          <option value="">Choose a meeting...</option>
          {meetings.map(meeting => (
            <option key={meeting.id} value={meeting.id}>
              {new Date(meeting.meeting_date).toLocaleDateString()} - {meeting.topic || 'No topic'}
            </option>
          ))}
        </select>
      </div>

      {selectedMeeting && (
        <div className="space-y-4">
          <div className="flex gap-4 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex-1">
              <div className="text-2xl font-bold text-green-600">{presentCount}</div>
              <div className="text-sm text-green-700">Present</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex-1">
              <div className="text-2xl font-bold text-red-600">{absentCount}</div>
              <div className="text-sm text-red-700">Absent</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex-1">
              <div className="text-2xl font-bold text-blue-600">{members.length}</div>
              <div className="text-sm text-blue-700">Total Members</div>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {members.map(member => {
              const record = attendance[member.id] || { attended: true, reason: '', notes: '' };
              
              return (
                <div key={member.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium">{member.name} {member.surname}</div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`attendance-${member.id}`}
                          checked={record.attended}
                          onChange={() => setAttendance(prev => ({
                            ...prev,
                            [member.id]: { ...record, attended: true, reason: '' }
                          }))}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Present</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`attendance-${member.id}`}
                          checked={!record.attended}
                          onChange={() => setAttendance(prev => ({
                            ...prev,
                            [member.id]: { ...record, attended: false, reason: 'Sick' }
                          }))}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Absent</span>
                      </label>
                    </div>
                  </div>

                  {!record.attended && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium mb-1">Reason for Absence</label>
                        <select
                          value={record.reason || ''}
                          onChange={(e) => setAttendance(prev => ({
                            ...prev,
                            [member.id]: { ...record, reason: e.target.value }
                          }))}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Select reason...</option>
                          {absenceReasons.map(reason => (
                            <option key={reason} value={reason}>{reason}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Additional Notes</label>
                        <input
                          type="text"
                          value={record.notes || ''}
                          onChange={(e) => setAttendance(prev => ({
                            ...prev,
                            [member.id]: { ...record, notes: e.target.value }
                          }))}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                          placeholder="Optional notes..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <button
            onClick={handleSaveAttendance}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      )}
    </div>
  );
};

const DiscussionStep: React.FC<{
  group: CellGroup;
  selectedMeeting: Meeting | null;
  onDiscussionsSaved: () => void;
  onError: (message: string) => void;
}> = ({ group, selectedMeeting, onDiscussionsSaved, onError }) => {
  const [loading, setLoading] = useState(false);
  const [discussionTopics, setDiscussionTopics] = useState<DiscussionTopic[]>([
    { topic: '', discussion_points: '', decisions_made: '' }
  ]);

  const addTopic = () => {
    setDiscussionTopics(prev => [...prev, { topic: '', discussion_points: '', decisions_made: '' }]);
  };

  const removeTopic = (index: number) => {
    setDiscussionTopics(prev => prev.filter((_, i) => i !== index));
  };

  const updateTopic = (index: number, field: keyof DiscussionTopic, value: string) => {
    setDiscussionTopics(prev => prev.map((topic, i) => 
      i === index ? { ...topic, [field]: value } : topic
    ));
  };

  const handleSaveDiscussions = async () => {
    if (!selectedMeeting) {
      onError('Please select a meeting first');
      return;
    }

    setLoading(true);
    try {
      const validTopics = discussionTopics.filter(topic => topic.topic.trim() !== '');
      
      const { error } = await supabase
        .from('discussion_topics')
        .upsert(
          validTopics.map(topic => ({
            ...topic,
            meeting_id: selectedMeeting.id,
            group_id: group.id
          }))
        );

      if (error) throw error;
      onDiscussionsSaved();
    } catch (error: any) {
      onError('Failed to save discussions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Discussion Topics</h3>
      
      {!selectedMeeting ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Please go back to Step 2 and select a meeting first to record discussion topics.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              Recording discussions for meeting on {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
              {selectedMeeting.topic && ` - ${selectedMeeting.topic}`}
            </p>
          </div>

          {discussionTopics.map((topic, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Topic #{index + 1}</h4>
                {discussionTopics.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTopic(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Topic Title *</label>
                  <input
                    type="text"
                    value={topic.topic}
                    onChange={(e) => updateTopic(index, 'topic', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., Bible Study, Prayer Requests, Announcements"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Discussion Points</label>
                  <textarea
                    value={topic.discussion_points}
                    onChange={(e) => updateTopic(index, 'discussion_points', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Key points discussed, questions raised, insights shared..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Decisions Made / Action Items</label>
                  <textarea
                    value={topic.decisions_made}
                    onChange={(e) => updateTopic(index, 'decisions_made', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    rows={2}
                    placeholder="Decisions made, action items, follow-up tasks..."
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addTopic}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Another Topic
          </button>

          <button
            onClick={handleSaveDiscussions}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Discussions'}
          </button>
        </div>
      )}
    </div>
  );
};

const ReportStep: React.FC<{
  group: CellGroup;
  selectedMeeting: Meeting | null;
  onReportCreated: () => void;
  onError: (message: string) => void;
}> = ({ group, selectedMeeting, onReportCreated, onError }) => {
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [discussionData, setDiscussionData] = useState<any[]>([]);
  const [reportData, setReportData] = useState({
    title: '',
    spiritual_highlights: '',
    challenges: '',
    prayer_requests: '',
    next_steps: '',
    additional_notes: ''
  });

  useEffect(() => {
    if (selectedMeeting) {
      loadMeetingData();
    }
  }, [selectedMeeting]);

  const loadMeetingData = async () => {
    if (!selectedMeeting) return;

    try {
      // Load attendance data
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          *,
          members (name, surname, email)
        `)
        .eq('meeting_id', selectedMeeting.id);

      if (attendanceError) throw attendanceError;
      setAttendanceData(attendance || []);

      // Load discussion topics
      const { data: discussions, error: discussionError } = await supabase
        .from('discussion_topics')
        .select('*')
        .eq('meeting_id', selectedMeeting.id)
        .order('created_at');

      if (discussionError) throw discussionError;
      setDiscussionData(discussions || []);

      // Set default report title
      setReportData(prev => ({
        ...prev,
        title: `${group.name} Meeting Report - ${new Date(selectedMeeting.meeting_date).toLocaleDateString()}`
      }));
    } catch (error: any) {
      onError('Failed to load meeting data: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('reports')
        .insert([{
          group_id: group.id,
          meeting_id: selectedMeeting?.id || null,
          title: reportData.title,
          spiritual_highlights: reportData.spiritual_highlights,
          challenges: reportData.challenges,
          prayer_requests: reportData.prayer_requests,
          next_steps: reportData.next_steps,
          additional_notes: reportData.additional_notes,
          report_date: new Date().toISOString().split('T')[0],
          attendance_summary: {
            present: attendanceData.filter(a => a.attended).length,
            absent: attendanceData.filter(a => !a.attended).length,
            total: attendanceData.length
          }
        }])
        .select()
        .single();

      if (error) throw error;
      onReportCreated();
    } catch (error: any) {
      onError('Failed to create report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePrintableReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const presentCount = attendanceData.filter(a => a.attended).length;
    const absentCount = attendanceData.filter(a => !a.attended).length;
    const absentMembers = attendanceData.filter(a => !a.attended);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportData.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
          .attendance-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px; }
          .attendance-card { text-align: center; padding: 15px; border-radius: 8px; }
          .present { background: #d1fae5; color: #065f46; }
          .absent { background: #fee2e2; color: #991b1b; }
          .total { background: #dbeafe; color: #1e40af; }
          .member-list { margin-left: 20px; }
          .topic { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CELL GROUP MEETING REPORT</h1>
          <h2>${reportData.title}</h2>
          <p><strong>Group:</strong> ${group.name} | <strong>Date:</strong> ${selectedMeeting ? new Date(selectedMeeting.meeting_date).toLocaleDateString() : 'N/A'} | <strong>Location:</strong> ${selectedMeeting?.location || group.location || 'N/A'}</p>
        </div>

        <div class="section">
          <div class="section-title">ATTENDANCE SUMMARY</div>
          <div class="attendance-grid">
            <div class="attendance-card present">
              <div style="font-size: 24px; font-weight: bold;">${presentCount}</div>
              <div>Present</div>
            </div>
            <div class="attendance-card absent">
              <div style="font-size: 24px; font-weight: bold;">${absentCount}</div>
              <div>Absent</div>
            </div>
            <div class="attendance-card total">
              <div style="font-size: 24px; font-weight: bold;">${attendanceData.length}</div>
              <div>Total Members</div>
            </div>
          </div>
          
          ${absentMembers.length > 0 ? `
            <p><strong>Absent Members:</strong></p>
            <div class="member-list">
              ${absentMembers.map(member => `
                <div>• ${member.members.name} ${member.members.surname} - ${member.reason || 'No reason provided'}</div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        ${discussionData.length > 0 ? `
          <div class="section">
            <div class="section-title">DISCUSSION TOPICS</div>
            ${discussionData.map((topic, index) => `
              <div class="topic">
                <h3>${index + 1}. ${topic.topic}</h3>
                ${topic.discussion_points ? `<p><strong>Discussion:</strong> ${topic.discussion_points}</p>` : ''}
                ${topic.decisions_made ? `<p><strong>Decisions/Actions:</strong> ${topic.decisions_made}</p>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">MEETING REPORT</div>
          ${reportData.spiritual_highlights ? `
            <p><strong>Spiritual Highlights:</strong><br>${reportData.spiritual_highlights}</p>
          ` : ''}
          ${reportData.challenges ? `
            <p><strong>Challenges & Concerns:</strong><br>${reportData.challenges}</p>
          ` : ''}
          ${reportData.prayer_requests ? `
            <p><strong>Prayer Requests:</strong><br>${reportData.prayer_requests}</p>
          ` : ''}
          ${reportData.next_steps ? `
            <p><strong>Next Steps & Action Items:</strong><br>${reportData.next_steps}</p>
          ` : ''}
          ${reportData.additional_notes ? `
            <p><strong>Additional Notes:</strong><br>${reportData.additional_notes}</p>
          ` : ''}
        </div>

        <div class="no-print" style="margin-top: 40px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Print Report</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const presentCount = attendanceData.filter(a => a.attended).length;
  const absentCount = attendanceData.filter(a => !a.attended).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Create Meeting Report</h3>
        <button
          onClick={generatePrintableReport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FileText className="h-4 w-4" />
          Print Report
        </button>
      </div>

      {!selectedMeeting ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Please complete the previous steps to generate a meeting report.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Meeting Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold mb-3">Meeting Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{presentCount}</div>
                <div className="text-sm text-gray-600">Present</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{absentCount}</div>
                <div className="text-sm text-gray-600">Absent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{discussionData.length}</div>
                <div className="text-sm text-gray-600">Topics</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{attendanceData.length}</div>
                <div className="text-sm text-gray-600">Total Members</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Report Title *</label>
              <input
                type="text"
                required
                value={reportData.title}
                onChange={(e) => setReportData({ ...reportData, title: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="Enter report title"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Spiritual Highlights</label>
                <textarea
                  value={reportData.spiritual_highlights}
                  onChange={(e) => setReportData({ ...reportData, spiritual_highlights: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={4}
                  placeholder="Spiritual insights, testimonies, breakthroughs..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Challenges & Concerns</label>
                <textarea
                  value={reportData.challenges}
                  onChange={(e) => setReportData({ ...reportData, challenges: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={4}
                  placeholder="Challenges faced, areas needing improvement..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Prayer Requests</label>
                <textarea
                  value={reportData.prayer_requests}
                  onChange={(e) => setReportData({ ...reportData, prayer_requests: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Specific prayer requests from members..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Next Steps & Action Items</label>
                <textarea
                  value={reportData.next_steps}
                  onChange={(e) => setReportData({ ...reportData, next_steps: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Follow-up actions, next meeting plans..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Additional Notes</label>
              <textarea
                value={reportData.additional_notes}
                onChange={(e) => setReportData({ ...reportData, additional_notes: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Any additional observations or comments..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating Report...' : 'Save Report'}
              </button>
              
              <button
                type="button"
                onClick={generatePrintableReport}
                className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="h-4 w-4" />
                Preview Report
              </button>
            </div>
          </form>

          {/* Attendance Details Preview */}
          {attendanceData.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold mb-3">Attendance Details</h4>
              <div className="space-y-2">
                {attendanceData.map(record => (
                  <div key={record.member_id} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div>
                      <span className="font-medium">{record.members.name} {record.members.surname}</span>
                      {!record.attended && record.reason && (
                        <span className="text-sm text-gray-500 ml-2">- {record.reason}</span>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      record.attended 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {record.attended ? 'Present' : 'Absent'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main Groups Component (same as before)
const Groups = () => {
  const { profile } = useAuth();
  
  // State management
  const [groups, setGroups] = useState<CellGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<CellGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showMeetingsModal, setShowMeetingsModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  
  // Data states
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  // Load groups on component mount
  useEffect(() => {
    loadGroups();
    loadAllMembers();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      
      const { data: groupsData, error: groupsError } = await supabase
        .from('cell_groups')
        .select('*')
        .order('name');

      if (groupsError) throw groupsError;
      
      const groupsWithMemberCounts = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count, error: countError } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('cell_group_id', group.id);

          return {
            ...group,
            memberCount: count || 0
          };
        })
      );

      setGroups(groupsWithMemberCounts);
    } catch (error: any) {
      setError('Failed to load groups: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAllMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      console.error('Failed to load members:', error);
    }
  };

  const loadMeetings = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('group_id', groupId)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error: any) {
      setError('Failed to load meetings: ' + error.message);
    }
  };

  // Permission functions based on AuthContext
  const canViewGroup = (groupId: string) => {
    if (!profile) return false;
    
    if (profile.isAdmin) return true;
    
    if (profile.role === 'group_leader') {
      return profile.assigned_groups?.includes(groupId) || 
             profile.assigned_groups?.includes('all_groups') ||
             profile.cell_group_id === groupId;
    }
    
    if (profile.role === 'member') {
      return profile.cell_group_id === groupId;
    }
    
    return false;
  };

  const canManageGroup = (groupId: string) => {
    if (!profile) return false;
    
    if (profile.isAdmin) return true;
    
    if (profile.role === 'group_leader') {
      return profile.assigned_groups?.includes(groupId) || 
             profile.assigned_groups?.includes('all_groups') ||
             profile.cell_group_id === groupId;
    }
    
    if (profile.role === 'member') {
      const isOwnGroup = profile.cell_group_id === groupId;
      return isOwnGroup && profile.permissions?.includes('manage_group');
    }
    
    return false;
  };

  const openMeetingsModal = async (group: CellGroup) => {
    if (!canViewGroup(group.id)) {
      setError('You do not have permission to view this group');
      return;
    }

    setSelectedGroup(group);
    setShowMeetingsModal(true);
    await loadMeetings(group.id);
  };

  const openWorkflowModal = async (group: CellGroup) => {
    if (!canManageGroup(group.id)) {
      setError('You do not have permission to manage this group');
      return;
    }

    setSelectedGroup(group);
    setShowWorkflowModal(true);
    await loadMeetings(group.id);
  };

  const closeAllModals = () => {
    setShowMeetingsModal(false);
    setShowWorkflowModal(false);
    setSelectedGroup(null);
  };

  const filteredGroups = groups.filter(group =>
    canViewGroup(group.id) && (
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.location?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getUserRoleDisplay = () => {
    if (!profile) return 'Guest';
    
    if (profile.isAdmin) return 'Administrator';
    if (profile.role === 'group_leader') return 'Group Leader';
    return 'Member';
  };

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
              {profile ? `Logged in as ${getUserRoleDisplay()}` : 'Please log in to view groups'}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search cell groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error and Success Messages */}
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

        {/* Groups Grid */}
        {!profile ? (
          <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Please Log In
            </h3>
            <p className="text-gray-500 dark:text-gray-500 mb-6">
              You need to be logged in to view cell groups
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading && filteredGroups.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading cell groups...</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  No Accessible Cell Groups
                </h3>
                <p className="text-gray-500 dark:text-gray-500 mb-6">
                  {searchTerm ? 'No groups match your search' : 'You do not have access to any cell groups'}
                </p>
              </div>
            ) : (
              filteredGroups.map((group: any) => {
                const canManage = canManageGroup(group.id);
                const canView = canViewGroup(group.id);
                
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
                          Leader: {group.leader_id ? 'Assigned' : 'Not assigned'}
                        </span>
                      </div>
                      
                      {group.location && (
                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">{group.location}</span>
                        </div>
                      )}
                      
                      {(group.meeting_day || group.meeting_time) && (
                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {group.meeting_day} {group.meeting_time && `at ${group.meeting_time}`}
                          </span>
                        </div>
                      )}
                      
                      {group.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {group.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {group.memberCount || 0} member{(group.memberCount || 0) !== 1 ? 's' : ''}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openMeetingsModal(group)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          View Meetings
                        </button>
                        {canManage && (
                          <button
                            onClick={() => openWorkflowModal(group)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            Manage Group
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Meetings Modal */}
        {showMeetingsModal && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                  meetings.map((meeting) => (
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
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Workflow Modal */}
        {showWorkflowModal && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Manage {selectedGroup.name}
                </h3>
                <button
                  onClick={closeAllModals}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <GroupManagementWorkflow 
                group={selectedGroup}
                meetings={meetings}
                members={members}
                onClose={closeAllModals}
                onSuccess={(message) => {
                  setSuccess(message);
                  setTimeout(() => setSuccess(null), 3000);
                }}
                onError={(message) => {
                  setError(message);
                  setTimeout(() => setError(null), 3000);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;
