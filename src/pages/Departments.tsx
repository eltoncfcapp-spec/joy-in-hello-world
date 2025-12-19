// ... previous code remains the same until the DepartmentAttendanceStep component ...

// Department Attendance Step Component - FIXED
interface DepartmentAttendanceStepProps {
  department: Department;
  meetings: DepartmentMeeting[];
  selectedMeeting: DepartmentMeeting | null;
  onMeetingSelect: (meeting: DepartmentMeeting) => void;
  onAttendanceSaved: () => void;
  onError: (message: string) => void;
  refreshDepartmentData: () => void; // ADD THIS LINE
}

const DepartmentAttendanceStep: React.FC<DepartmentAttendanceStepProps> = ({ 
  department, 
  meetings, 
  selectedMeeting, 
  onMeetingSelect, 
  onAttendanceSaved, 
  onError,
  refreshDepartmentData // ADD THIS LINE
}) => {
  // ... existing state and effects ...

  const addMemberToDepartment = async (member: Member) => {
    try {
      setLoading(true);
      const isAlreadyMember = departmentMembers.some(dm => dm.id === member.id);
      if (isAlreadyMember) {
        onError('Member is already in this department');
        return;
      }

      const { error } = await supabase
        .from('department_members')
        .insert([{ 
          department_id: department.id, 
          member_id: member.id, 
          role: 'member',
          assigned_at: new Date().toISOString()
        }]);

      if (error) throw error;
      
      // Refresh department members list AND refresh main department data
      await loadDepartmentMembers();
      refreshDepartmentData(); // ADD THIS LINE
      setShowAddAttendeeModal(false);
      setSearchMemberTerm('');
      setAttendance(prev => ({ ...prev, [member.id]: 'present' }));
      onError('Member added to department successfully!');
    } catch (error: any) {
      onError('Failed to add member to department: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of the component code ...
};

// Department Report Step Component - FIXED
interface DepartmentReportStepProps {
  department: Department;
  meetings: DepartmentMeeting[];
  selectedMeeting: DepartmentMeeting | null;
  onMeetingSelect: (meeting: DepartmentMeeting) => void;
  onReportCreated: () => void;
  onError: (message: string) => void;
}

const DepartmentReportStep: React.FC<DepartmentReportStepProps> = ({ 
  department, 
  meetings, 
  selectedMeeting, 
  onMeetingSelect, 
  onReportCreated, 
  onError 
}) => {
  // ... existing state and effects ...

  const loadAttendanceData = async () => {
    try {
      if (!selectedMeeting) return;

      // FIXED: Correct query for department attendance
      const { data, error } = await supabase
        .from('department_attendance')
        .select(`
          *,
          members!inner (
            id, name, surname, residence, phone
          )
        `)
        .eq('meeting_id', selectedMeeting.id);

      if (error) {
        console.error('Error loading attendance:', error);
        onError('Failed to load attendance data: ' + error.message);
        return;
      }
      
      console.log('Loaded department attendance data:', data);
      setAttendance(data || []);
    } catch (error: any) {
      console.error('Failed to load attendance data:', error);
      onError('Failed to load attendance data: ' + error.message);
    }
  };

  // ... rest of the component code ...
};

// Department Management Workflow Component - FIXED
interface DepartmentWorkflowProps {
  department: Department;
  meetings: DepartmentMeeting[];
  members: Member[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  refreshDepartmentData: () => void; // ADD THIS LINE
}

const DepartmentManagementWorkflow: React.FC<DepartmentWorkflowProps> = ({ 
  department, 
  meetings, 
  members: _members, 
  onClose, 
  onSuccess, 
  onError,
  refreshDepartmentData // ADD THIS LINE
}) => {
  // ... existing state and steps ...

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex justify-between items-center">
        {steps.map((step) => (
          <div key={step.number} className="flex-1 text-center">
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
            <div className="text-xs text-gray-400 hidden md:block">{step.description}</div>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-gray-50 rounded-xl p-6 min-h-[400px]">
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
              onSuccess('Department attendance saved successfully!');
              setCurrentStep(3);
            }}
            onError={onError}
            refreshDepartmentData={refreshDepartmentData} // PASS THE REFRESH FUNCTION
          />
        )}

        {currentStep === 3 && (
          <DepartmentNewcomerStep
            department={department}
            selectedMeeting={selectedMeeting}
            onNewcomerAdded={() => {
              onSuccess('Newcomer added successfully!');
              setCurrentStep(4);
              refreshDepartmentData(); // ADD THIS LINE
            }}
            onError={onError}
          />
        )}

        {currentStep === 4 && (
          <DepartmentReportStep
            department={department}
            meetings={meetings}
            selectedMeeting={selectedMeeting}
            onMeetingSelect={setSelectedMeeting}
            onReportCreated={() => {
              onSuccess('Department report generated successfully!');
              refreshDepartmentData(); // ADD THIS LINE
              onClose();
            }}
            onError={onError}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
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
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
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

// Main Departments Component - FIXED
const Departments = () => {
  const { profile, canViewDepartment, canManageDepartment, getRoles, isAdministrator, isPastor, isDepartmentLeader, isMember } = useAuth();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreateDepartmentModal, setShowCreateDepartmentModal] = useState(false);
  const [showEditDepartmentModal, setShowEditDepartmentModal] = useState(false);
  const [showDeleteDepartmentModal, setShowDeleteDepartmentModal] = useState(false);
  const [showMeetingsModal, setShowMeetingsModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const [meetings, setMeetings] = useState<DepartmentMeeting[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMeetingForReport, setSelectedMeetingForReport] = useState<DepartmentMeeting | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<DepartmentAttendanceRecord[]>([]);

  useEffect(() => {
    if (profile) {
      loadDepartments();
      loadAllMembers();
    }
  }, [profile]);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      
      // First, load all departments
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (departmentsError) throw departmentsError;

      // Get member count and leader information for each department
      const departmentsWithDetails = await Promise.all(
        (departmentsData || []).map(async (department) => {
          // Get member count from department_members table
          const { count } = await supabase
            .from('department_members')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', department.id);
          
          // Get leader information if leader_id exists
          let leaderInfo = null;
          if (department.leader_id) {
            const { data: leaderData } = await supabase
              .from('members')
              .select('name, surname, residence, phone')
              .eq('id', department.leader_id)
              .single();
            
            leaderInfo = leaderData;
          }
          
          // Check if current user is the leader of this department
          const isCurrentUserLeader = department.leader_id === profile?.id;
          
          return {
            ...department,
            leader_name: leaderInfo ? `${leaderInfo.name} ${leaderInfo.surname}` : null,
            leader_residence: leaderInfo?.residence || null,
            leader_phone: leaderInfo?.phone || null,
            memberCount: count || 0,
            is_current_user_leader: isCurrentUserLeader
          };
        })
      );

      // Filter departments based on user role
      let filteredDepartments = departmentsWithDetails;
      
      if (!isAdministrator && !isPastor) {
        if (isDepartmentLeader) {
          // Department Leaders can see only their own department
          filteredDepartments = departmentsWithDetails.filter(department => 
            department.leader_id === profile?.id
          );
        } else if (isMember) {
          // Members can see only departments they belong to
          const userDepartments = await getUserDepartments();
          filteredDepartments = departmentsWithDetails.filter(department => 
            userDepartments.some(ud => ud.id === department.id)
          );
        }
      }
      // Administrators and Pastors can see all departments (no filtering)

      setDepartments(filteredDepartments);
    } catch (error: any) {
      console.error('Error loading departments:', error);
      setError('Failed to load departments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh all department data
  const refreshAllData = async () => {
    await loadDepartments();
    await loadAllMembers();
  };

  const getUserDepartments = async (): Promise<Department[]> => {
    try {
      if (!profile?.id) return [];
      
      const { data: departmentMembers } = await supabase
        .from('department_members')
        .select('department_id')
        .eq('member_id', profile.id);
      
      if (!departmentMembers || departmentMembers.length === 0) return [];
      
      const departmentIds = departmentMembers.map(dm => dm.department_id);
      
      const { data: departmentData } = await supabase
        .from('departments')
        .select('*')
        .in('id', departmentIds);
      
      return departmentData || [];
    } catch (error) {
      console.error('Failed to get user departments:', error);
      return [];
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
      // FIXED: Correct query for report attendance
      const { data, error } = await supabase
        .from('department_attendance')
        .select(`
          *,
          members!inner (
            id, name, surname, residence, phone
          )
        `)
        .eq('meeting_id', meetingId);

      if (error) {
        console.error('Error loading attendance:', error);
        setError('Failed to load attendance: ' + error.message);
        return;
      }
      
      console.log('Loaded attendance for report:', data);
      setAttendanceRecords(data || []);
    } catch (error: any) {
      console.error('Failed to load attendance:', error);
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

  const openEditDepartmentModal = (department: Department) => {
    if (!canEditDepartment(department)) {
      setError('You do not have permission to edit this department');
      return;
    }
    setSelectedDepartment(department);
    setShowEditDepartmentModal(true);
  };

  const openDeleteDepartmentModal = (department: Department) => {
    if (!canDeleteDepartment(department)) {
      setError('Only administrators and pastors can delete departments');
      return;
    }
    setSelectedDepartment(department);
    setShowDeleteDepartmentModal(true);
  };

  const closeAllModals = () => {
    setShowCreateDepartmentModal(false);
    setShowEditDepartmentModal(false);
    setShowDeleteDepartmentModal(false);
    setShowMeetingsModal(false);
    setShowWorkflowModal(false);
    setShowReportModal(false);
    setSelectedDepartment(null);
    setSelectedMeetingForReport(null);
    setAttendanceRecords([]);
  };

  const handleDepartmentCreated = () => {
    refreshAllData(); // Refresh all data after creating department
    setSuccess('Department created successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDepartmentUpdated = () => {
    refreshAllData(); // Refresh all data after updating department
    setSuccess('Department updated successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDepartmentDeleted = () => {
    refreshAllData(); // Refresh all data after deleting department
    setSuccess('Department deleted successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Permission functions - FIXED for administrators and pastors
  const canCreateDepartments = () => {
    return isAdministrator || isPastor;
  };

  const canEditDepartment = (department: Department) => {
    if (isAdministrator || isPastor) {
      return true; // Admins & Pastors can edit all departments
    }
    if (isDepartmentLeader) {
      return department.leader_id === profile?.id; // Leaders can edit only their own department
    }
    return false; // Members cannot edit any departments
  };

  const canDeleteDepartment = (department: Department) => {
    return isAdministrator || isPastor; // Only admins & pastors can delete
  };

  const canViewDepartment = (departmentId: string) => {
    if (isAdministrator || isPastor) {
      return true; // Admins & Pastors can view all departments
    }
    if (isDepartmentLeader) {
      // Department leaders can view only their own department
      const department = departments.find(d => d.id === departmentId);
      return department?.leader_id === profile?.id;
    }
    if (isMember) {
      // Members can view only departments they belong to
      const userDepartments = departments.filter(d => 
        d.memberCount && d.memberCount > 0
      );
      return userDepartments.some(d => d.id === departmentId);
    }
    return false;
  };

  const canManageDepartment = (departmentId: string) => {
    if (isAdministrator || isPastor) {
      return true; // Admins & Pastors can manage all departments
    }
    if (isDepartmentLeader) {
      // Department leaders can manage only their own department
      const department = departments.find(d => d.id === departmentId);
      return department?.leader_id === profile?.id;
    }
    return false;
  };

  const getUserRoleDisplay = () => {
    if (!profile) return 'Guest';
    
    const roles = getRoles();
    if (roles.includes('admin') || roles.includes('administrator')) return 'Administrator';
    if (roles.includes('pastor')) return 'Pastor';
    if (roles.includes('deacon')) return 'Deacon';
    if (roles.includes('department_leader')) return 'Department Leader';
    if (roles.includes('group_leader')) return 'Group Leader';
    if (roles.includes('member')) return 'Member';
    return 'Guest';
  };

  const getAttendanceStats = () => {
    const attended = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const absentWithReason = attendanceRecords.filter(r => r.status === 'absent_with_reason').length;
    const total = attendanceRecords.length;

    return { attended, absent, absentWithReason, total };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Church Departments</h1>
          <p className="text-lg text-gray-600">
            {profile ? `Logged in as ${getUserRoleDisplay()}` : 'Please log in to view departments'}
          </p>
          {(isAdministrator || isPastor) && (
            <div className="mt-2 text-sm text-purple-600 font-medium">
              ⚡ Full Administrative Access
            </div>
          )}
        </div>

        {/* ... rest of the JSX remains the same until the workflow modal ... */}

        {showWorkflowModal && selectedDepartment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Manage {selectedDepartment.name}</h3>
                <button
                  onClick={closeAllModals}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                refreshDepartmentData={refreshAllData} // PASS THE REFRESH FUNCTION
              />
            </div>
          </div>
        )}
      </div>

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
