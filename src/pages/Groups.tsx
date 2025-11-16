import MeetingCreationStep from './steps/MeetingCreationStep';
import AttendanceStep from './steps/AttendanceStep';
import NewcomerStep from './steps/NewcomerStep';
import ReportStep from './steps/ReportStep';

import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, Users, MapPin, Calendar, User, Search, X, Trash2, Edit, 
  Shield, AlertCircle, FileText, Save, Eye, Clock, CheckCircle, 
  XCircle, UserPlus, Mail, Phone, ChevronRight, Check, ArrowRight
} from 'lucide-react';

// Interfaces
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
  updated_at: string;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  gender: 'male' | 'female' | 'other';
  status: 'newcomer' | 'member' | 'inactive';
  cell_group_id?: string | null;
  is_leader?: boolean;
  role?: string;
  invited_by?: string;
  first_time_visit_date?: string;
}

interface AttendanceRecord {
  id: string;
  meeting_id: string;
  member_id: string;
  status: 'present' | 'absent' | 'absent_with_reason';
  reason: string | null;
  created_at: string;
  member?: Member;
}

interface MeetingReport {
  id: string;
  meeting_id: string;
  report_text: string;
  decisions_made: string | null;
  action_items: string | null;
  next_meeting_date: string | null;
  created_by: string | null;
  created_at: string;
}

type Gender = 'male' | 'female' | 'other';
type AttendanceStatus = 'present' | 'absent' | 'absent_with_reason';

const Groups = () => {
  const { profile, hasPermission, canViewGroup, canManageGroup, getUserGroups } = useAuth();
  
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
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  // Permission checks
  const canCreateMeeting = (groupId: string) => {
    if (!profile) return false;
    return canManageGroup(groupId) || hasPermission('manage_all_meetings');
  };

  const canTakeAttendance = (groupId: string) => {
    if (!profile) return false;
    return canManageGroup(groupId) || hasPermission('manage_attendance');
  };

  const canAddNewcomers = (groupId: string) => {
    if (!profile) return false;
    return canManageGroup(groupId) || hasPermission('add_newcomers');
  };

  const canCreateReports = (groupId: string) => {
    if (!profile) return false;
    return canManageGroup(groupId) || hasPermission('create_reports');
  };

  // Load groups on component mount
  useEffect(() => {
    loadGroups();
    loadAllMembers();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cell_groups')
        .select(`
          *,
          leader:members(id, name, surname, email, phone),
          members:members(id, name, surname, email, phone, gender, status)
        `)
        .order('name');

      if (error) throw error;
      setGroups(data || []);
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
    setSelectedMeeting(null);
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.leader?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              Manage your cell groups, meetings, and members
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
                No Cell Groups Found
              </h3>
              <p className="text-gray-500 dark:text-gray-500 mb-6">
                {searchTerm ? 'Try adjusting your search terms' : 'No cell groups available'}
              </p>
            </div>
          ) : (
            filteredGroups.map((group) => {
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
                        Leader: {group.leader ? `${group.leader.name} ${group.leader.surname}` : 'Not assigned'}
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
                      {group.members?.length || 0} member{(group.members?.length || 0) !== 1 ? 's' : ''}
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

// Step 2: Create the Group Management Workflow Component

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
  const { profile, canManageGroup } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(false);

  const steps = [
    { number: 1, title: 'Schedule Meeting', description: 'Create a new meeting schedule' },
    { number: 2, title: 'Take Attendance', description: 'Record member attendance' },
    { number: 3, title: 'Add Newcomers', description: 'Register first-time visitors' },
    { number: 4, title: 'Create Report', description: 'Generate meeting report' }
  ];

  // Reset selected meeting when step changes
  useEffect(() => {
    if (currentStep !== 2 && currentStep !== 3 && currentStep !== 4) {
      setSelectedMeeting(null);
    }
  }, [currentStep]);

  const canAccessStep = (stepNumber: number) => {
    if (!profile) return false;
    
    switch (stepNumber) {
      case 1:
        return canManageGroup(group.id) || hasPermission('manage_all_meetings');
      case 2:
        return canManageGroup(group.id) || hasPermission('manage_attendance');
      case 3:
        return canManageGroup(group.id) || hasPermission('add_newcomers');
      case 4:
        return canManageGroup(group.id) || hasPermission('create_reports');
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Progress */}
      <div className="flex justify-between mb-8 relative">
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-10"></div>
        {steps.map((step, index) => (
          <div key={step.number} className="text-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 transition-all duration-300 ${
              currentStep >= step.number 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-gray-300 text-gray-600'
            }`}>
              {currentStep > step.number ? (
                <Check className="h-4 w-4" />
              ) : (
                step.number
              )}
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
          <NewcomerStep 
            group={group}
            selectedMeeting={selectedMeeting}
            onNewcomerAdded={() => {
              onSuccess('Newcomer added successfully!');
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
          className="flex items-center gap-2 px-6 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Groups;
