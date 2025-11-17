import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, MapPin, Calendar, User, Search, X, 
  Shield, AlertCircle, CheckCircle, Plus, Printer
} from 'lucide-react';

// Import the step components (you'll need to create these for departments)
import DepartmentMeetingCreationStep from '../components/departments/steps/DepartmentMeetingCreationStep';
import DepartmentAttendanceStep from '../components/departments/steps/DepartmentAttendanceStep';
import DepartmentNewcomerStep from '../components/departments/steps/DepartmentNewcomerStep';
import DepartmentReportStep from '../components/departments/steps/DepartmentReportStep';

// Simple interfaces for departments
interface Department {
  id: string;
  name: string;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  leader_id: string | null;
  description?: string | null;
}

interface DepartmentMeeting {
  id: string;
  department_id: string;
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
  department_id?: string | null;
}

interface DepartmentAttendanceRecord {
  id: string;
  meeting_id: string;
  member_id: string;
  status: 'present' | 'absent' | 'absent_with_reason';
  reason?: string | null;
  members?: Member;
}

// Department Management Workflow Component
interface DepartmentWorkflowProps {
  department: Department;
  meetings: DepartmentMeeting[];
  members: Member[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const DepartmentManagementWorkflow: React.FC<DepartmentWorkflowProps> = ({
  department,
  meetings,
  members,
  onClose,
  onSuccess,
  onError
}) => {
  const { profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMeeting, setSelectedMeeting] = useState<DepartmentMeeting | null>(null);

  const steps = [
    { number: 1, title: 'Schedule Meeting', description: 'Create a new meeting schedule' },
    { number: 2, title: 'Take Attendance', description: 'Record member attendance' },
    { number: 3, title: 'Add Newcomers', description: 'Register first-time visitors' },
    { number: 4, title: 'Create Report', description: 'Generate meeting report' }
  ];

  // Permission checks based on AuthContext profile
  const canAccessStep = (stepNumber: number) => {
    if (!profile) return false;
    
    // Admin can access everything
    if (profile.isAdmin) return true;
    
    // Department leaders can access all steps for their departments
    if (profile.role === 'department_leader' || profile.role === 'group_leader') {
      // Check if this department is in their assigned departments or if they're the leader
      const isAssignedDepartment = profile.assigned_departments?.includes(department.id) || 
                                   profile.assigned_departments?.includes('all_departments') ||
                                   profile.department_id === department.id;
      return isAssignedDepartment;
    }
    
    // Regular members have limited access
    if (profile.role === 'member') {
      // Members can only view their own department
      const isOwnDepartment = profile.department_id === department.id;
      
      switch (stepNumber) {
        case 1: return isOwnDepartment && profile.permissions?.includes('create_meetings');
        case 2: return isOwnDepartment && profile.permissions?.includes('manage_attendance');
        case 3: return isOwnDepartment && profile.permissions?.includes('add_newcomers');
        case 4: return isOwnDepartment && profile.permissions?.includes('create_reports');
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
          <DepartmentMeetingCreationStep 
            department={department}
            onMeetingCreated={() => {
              onSuccess('Department meeting created successfully!');
              setCurrentStep(2);
            }}
            onError={onError}
          />
        )}

        {currentStep === 2 && (
          <DepartmentAttendanceStep 
            department={department}
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
          <DepartmentNewcomerStep 
            department={department}
            selectedMeeting={selectedMeeting}
            onNewcomerAdded={() => {
              onSuccess('Newcomer added successfully!');
              setCurrentStep(4);
            }}
            onError={onError}
          />
        )}

        {currentStep === 4 && (
          <DepartmentReportStep 
            department={department}
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

// Main Departments Component
const Departments = () => {
  const { profile } = useAuth();
  
  // State management
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showMeetingsModal, setShowMeetingsModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Data states
  const [meetings, setMeetings] = useState<DepartmentMeeting[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [departmentMembers, setDepartmentMembers] = useState<Record<string, Member[]>>({});
  const [selectedMeetingForReport, setSelectedMeetingForReport] = useState<DepartmentMeeting | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<DepartmentAttendanceRecord[]>([]);

  // Load departments on component mount
  useEffect(() => {
    loadDepartments();
    loadAllMembers();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      
      // Simple query without complex relationships
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (departmentsError) throw departmentsError;
      
      // Load member counts for each department
      const departmentsWithMemberCounts = await Promise.all(
        (departmentsData || []).map(async (department) => {
          const { count, error: countError } = await supabase
            .from('department_members')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', department.id);

          return {
            ...department,
            memberCount: count || 0
          };
        })
      );

      setDepartments(departmentsWithMemberCounts);
    } catch (error: any) {
      setError('Failed to load departments: ' + error.message);
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

  const loadMeetings = async (departmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('department_meetings')
        .select('*')
        .eq('department_id', departmentId)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error: any) {
      setError('Failed to load meetings: ' + error.message);
    }
  };

  const loadAttendanceForMeeting = async (meetingId: string) => {
    try {
      const { data, error } = await supabase
        .from('department_attendance')
        .select(`
          *,
          members:member_id (
            id,
            name,
            surname,
            email,
            phone
          )
        `)
        .eq('meeting_id', meetingId);

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (error: any) {
      setError('Failed to load attendance: ' + error.message);
    }
  };

  const openReportModal = async (meeting: DepartmentMeeting) => {
    setSelectedMeetingForReport(meeting);
    await loadAttendanceForMeeting(meeting.id);
    setShowReportModal(true);
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Permission functions based on AuthContext
  const canViewDepartment = (departmentId: string) => {
    if (!profile) return false;
    
    // Admin can view all departments
    if (profile.isAdmin) return true;
    
    // Department leaders can view assigned departments and their own department
    if (profile.role === 'department_leader' || profile.role === 'group_leader') {
      return profile.assigned_departments?.includes(departmentId) || 
             profile.assigned_departments?.includes('all_departments') ||
             profile.department_id === departmentId;
    }
    
    // Regular members can only view their own department
    if (profile.role === 'member') {
      return profile.department_id === departmentId;
    }
    
    return false;
  };

  const canManageDepartment = (departmentId: string) => {
    if (!profile) return false;
    
    // Admin can manage all departments
    if (profile.isAdmin) return true;
    
    // Department leaders can manage assigned departments and their own department
    if (profile.role === 'department_leader' || profile.role === 'group_leader') {
      return profile.assigned_departments?.includes(departmentId) || 
             profile.assigned_departments?.includes('all_departments') ||
             profile.department_id === departmentId;
    }
    
    // Regular members need specific permissions for their own department
    if (profile.role === 'member') {
      const isOwnDepartment = profile.department_id === departmentId;
      return isOwnDepartment && profile.permissions?.includes('manage_department');
    }
    
    return false;
  };

  const hasPermission = (permission: string) => {
    if (!profile) return false;
    return profile.permissions?.includes(permission) || profile.isAdmin;
  };

  const openMeetingsModal = async (department: Department) => {
    if (!canViewDepartment(department.id)) {
      setError('You do not have permission to view this department');
      return;
    }

    setSelectedDepartment(department);
    setShowMeetingsModal(true);
    await loadMeetings(department.id);
  };

  const openWorkflowModal = async (department: Department) => {
    if (!canManageDepartment(department.id)) {
      setError('You do not have permission to manage this department');
      return;
    }

    setSelectedDepartment(department);
    setShowWorkflowModal(true);
    await loadMeetings(department.id);
  };

  const closeAllModals = () => {
    setShowMeetingsModal(false);
    setShowWorkflowModal(false);
    setShowReportModal(false);
    setSelectedDepartment(null);
    setSelectedMeetingForReport(null);
    setAttendanceRecords([]);
  };

  const filteredDepartments = departments.filter(department =>
    canViewDepartment(department.id) && (
      department.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      department.location?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Get user's display role
  const getUserRoleDisplay = () => {
    if (!profile) return 'Guest';
    
    if (profile.isAdmin) return 'Administrator';
    if (profile.role === 'department_leader') return 'Department Leader';
    if (profile.role === 'group_leader') return 'Group Leader';
    return 'Member';
  };

  // Calculate attendance statistics
  const getAttendanceStats = () => {
    const attended = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const absentWithReason = attendanceRecords.filter(r => r.status === 'absent_with_reason').length;
    const total = attendanceRecords.length;

    return { attended, absent, absentWithReason, total };
  };

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
              {profile ? `Logged in as ${getUserRoleDisplay()}` : 'Please log in to view departments'}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search departments..."
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

        {/* Departments Grid */}
        {!profile ? (
          <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Please Log In
            </h3>
            <p className="text-gray-500 dark:text-gray-500 mb-6">
              You need to be logged in to view departments
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading && filteredDepartments.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading departments...</p>
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  No Accessible Departments
                </h3>
                <p className="text-gray-500 dark:text-gray-500 mb-6">
                  {searchTerm ? 'No departments match your search' : 'You do not have access to any departments'}
                </p>
              </div>
            ) : (
              filteredDepartments.map((department: any) => {
                const canManage = canManageDepartment(department.id);
                const canView = canViewDepartment(department.id);
                
                return (
                  <div
                    key={department.id}
                    className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                        <Users className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{department.name}</h3>
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
                          Leader: {department.leader_id ? 'Assigned' : 'Not assigned'}
                        </span>
                      </div>
                      
                      {department.location && (
                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">{department.location}</span>
                        </div>
                      )}
                      
                      {(department.meeting_day || department.meeting_time) && (
                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {department.meeting_day} {department.meeting_time && `at ${department.meeting_time}`}
                          </span>
                        </div>
                      )}
                      
                      {department.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {department.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {department.memberCount || 0} member{(department.memberCount || 0) !== 1 ? 's' : ''}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openMeetingsModal(department)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          View Meetings
                        </button>
                        {canManage && (
                          <button
                            onClick={() => openWorkflowModal(department)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            Manage Department
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
        {showMeetingsModal && selectedDepartment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedDepartment.name} - Meetings
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
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            meeting.status === 'completed' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : meeting.status === 'cancelled'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {meeting.status}
                          </span>
                          {meeting.status === 'completed' && (
                            <button
                              onClick={() => openReportModal(meeting)}
                              className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium flex items-center gap-1"
                            >
                              <Printer className="h-3 w-3" />
                              View Report
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Report Modal with Print Feature */}
        {showReportModal && selectedMeetingForReport && selectedDepartment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:rounded-none print:shadow-none print:dark:bg-white">
              <div className="flex justify-between items-center mb-6 print:mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white print:text-black print:text-3xl">
                  Department Meeting Report
                </h3>
                <div className="flex gap-2 print:hidden">
                  <button
                    onClick={handlePrintReport}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print Report
                  </button>
                  <button
                    onClick={closeAllModals}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Print Header */}
              <div className="mb-8 pb-6 border-b-2 border-gray-300 print:border-black">
                <div className="text-center mb-4">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white print:text-black mb-2">
                    {selectedDepartment.name}
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 print:text-black">
                    Department Meeting Attendance Report
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-700">Date</p>
                    <p className="font-semibold text-gray-900 dark:text-white print:text-black">
                      {new Date(selectedMeetingForReport.meeting_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-700">Time</p>
                    <p className="font-semibold text-gray-900 dark:text-white print:text-black">
                      {selectedMeetingForReport.meeting_time || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-700">Location</p>
                    <p className="font-semibold text-gray-900 dark:text-white print:text-black">
                      {selectedMeetingForReport.location || selectedDepartment.location || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-700">Topic</p>
                    <p className="font-semibold text-gray-900 dark:text-white print:text-black">
                      {selectedMeetingForReport.topic || 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attendance Statistics */}
              <div className="mb-8">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white print:text-black mb-4">
                  Attendance Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 print:bg-blue-50 border border-blue-200 dark:border-blue-800 print:border-blue-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 dark:text-blue-400 print:text-blue-700 font-medium">Total Members</p>
                        <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 print:text-blue-900">
                          {getAttendanceStats().total}
                        </p>
                      </div>
                      <Users className="h-10 w-10 text-blue-400 dark:text-blue-500 print:text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 print:bg-green-50 border border-green-200 dark:border-green-800 print:border-green-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 dark:text-green-400 print:text-green-700 font-medium">Attended</p>
                        <p className="text-3xl font-bold text-green-700 dark:text-green-300 print:text-green-900">
                          {getAttendanceStats().attended}
                        </p>
                      </div>
                      <CheckCircle className="h-10 w-10 text-green-400 dark:text-green-500 print:text-green-600" />
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 print:text-green-700 mt-2">
                      {getAttendanceStats().total > 0 
                        ? `${Math.round((getAttendanceStats().attended / getAttendanceStats().total) * 100)}%`
                        : '0%'}
                    </p>
                  </div>

                  <div className="bg-red-50 dark:bg-red-900/20 print:bg-red-50 border border-red-200 dark:border-red-800 print:border-red-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-red-600 dark:text-red-400 print:text-red-700 font-medium">Absent</p>
                        <p className="text-3xl font-bold text-red-700 dark:text-red-300 print:text-red-900">
                          {getAttendanceStats().absent}
                        </p>
                      </div>
                      <X className="h-10 w-10 text-red-400 dark:text-red-500 print:text-red-600" />
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400 print:text-red-700 mt-2">
                      {getAttendanceStats().total > 0 
                        ? `${Math.round((getAttendanceStats().absent / getAttendanceStats().total) * 100)}%`
                        : '0%'}
                    </p>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 print:bg-yellow-50 border border-yellow-200 dark:border-yellow-800 print:border-yellow-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-yellow-600 dark:text-yellow-400 print:text-yellow-700 font-medium">Absent w/ Reason</p>
                        <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300 print:text-yellow-900">
                          {getAttendanceStats().absentWithReason}
                        </p>
                      </div>
                      <AlertCircle className="h-10 w-10 text-yellow-400 dark:text-yellow-500 print:text-yellow-600" />
                    </div>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 print:text-yellow-700 mt-2">
                      {getAttendanceStats().total > 0 
                        ? `${Math.round((getAttendanceStats().absentWithReason / getAttendanceStats().total) * 100)}%`
                        : '0%'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Attendance List */}
              <div className="mb-6">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white print:text-black mb-4">
                  Detailed Attendance
                </h4>

                {attendanceRecords.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 print:bg-gray-50 rounded-lg">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400 print:text-gray-700">
                      No attendance records found
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Present Members */}
                    {getAttendanceStats().attended > 0 && (
                      <div className="mb-6">
                        <h5 className="text-lg font-semibold text-green-700 dark:text-green-400 print:text-green-800 mb-3 flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          Present ({getAttendanceStats().attended})
                        </h5>
                        <div className="bg-green-50 dark:bg-green-900/10 print:bg-green-50 border border-green-200 dark:border-green-800 print:border-green-300 rounded-lg p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {attendanceRecords
                              .filter(record => record.status === 'present')
                              .map((record) => (
                                <div key={record.id} className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                  <span className="text-gray-900 dark:text-white print:text-black">
                                    {record.members?.name} {record.members?.surname}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Absent Members */}
                    {getAttendanceStats().absent > 0 && (
                      <div className="mb-6">
                        <h5 className="text-lg font-semibold text-red-700 dark:text-red-400 print:text-red-800 mb-3 flex items-center gap-2">
                          <X className="h-5 w-5" />
                          Absent ({getAttendanceStats().absent})
                        </h5>
                        <div className="bg-red-50 dark:bg-red-900/10 print:bg-red-50 border border-red-200 dark:border-red-800 print:border-red-300 rounded-lg p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {attendanceRecords
                              .filter(record => record.status === 'absent')
                              .map((record) => (
                                <div key={record.id} className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                                  <span className="text-gray-900 dark:text-white print:text-black">
                                    {record.members?.name} {record.members?.surname}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Absent with Reason */}
                    {getAttendanceStats().absentWithReason > 0 && (
                      <div className="mb-6">
                        <h5 className="text-lg font-semibold text-yellow-700 dark:text-yellow-400 print:text-yellow-800 mb-3 flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" />
                          Absent with Reason ({getAttendanceStats().absentWithReason})
                        </h5>
                        <div className="bg-yellow-50 dark:bg-yellow-900/10 print:bg-yellow-50 border border-yellow-200 dark:border-yellow-800 print:border-yellow-300 rounded-lg p-4">
                          <div className="space-y-3">
                            {attendanceRecords
                              .filter(record => record.status === 'absent_with_reason')
                              .map((record) => (
                                <div key={record.id} className="flex items-start gap-2">
                                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-1.5"></div>
                                  <div className="flex-1">
                                    <span className="text-gray-900 dark:text-white print:text-black font-medium">
                                      {record.members?.name} {record.members?.surname}
                                    </span>
                                    {record.reason && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-700 mt-1">
                                        Reason: {record.reason}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Notes Section */}
              {selectedMeetingForReport.notes && (
                <div className="mb-6">
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white print:text-black mb-3">
                    Meeting Notes
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 print:bg-gray-50 border border-gray-200 dark:border-gray-600 print:border-gray-300 rounded-lg p-4">
                    <p className="text-gray-700 dark:text-gray-300 print:text-black whitespace-pre-wrap">
                      {selectedMeetingForReport.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Footer for print */}
              <div className="hidden print:block mt-8 pt-4 border-t border-gray-300">
                <p className="text-sm text-gray-600 text-center">
                  Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Modal */}
        {showWorkflowModal && selectedDepartment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Manage {selectedDepartment.name}
                </h3>
                <button
                  onClick={closeAllModals}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <DepartmentManagementWorkflow 
                department={selectedDepartment}
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

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          @page {
            margin: 1cm;
            size: A4;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\:bg-white {
            background-color: white !important;
          }
          
          .print\\:text-black {
            color: black !important;
          }
          
          .print\\:max-h-none {
            max-height: none !important;
          }
          
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Departments;
