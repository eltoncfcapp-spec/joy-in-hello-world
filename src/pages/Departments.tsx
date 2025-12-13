import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, MapPin, Calendar, User, Search, X, 
  Shield, AlertCircle, CheckCircle, Printer,
  Clock, FileText, Save, UserPlus, Mail, Phone,
  Download, FileDown, PlusCircle, Group
} from 'lucide-react';

// Simple interfaces
interface Department {
  id: string;
  name: string;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  leader_id: string | null;
  description?: string | null;
  memberCount?: number;
}

interface DepartmentMeeting {
  id: string;
  department_id: string | null;
  meeting_date: string;
  meeting_time: string | null;
  location: string | null;
  topic: string | null;
  notes: string | null;
  status: string | null;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  phone: string | null;
  department_role?: string;
}

// Main Departments Component
const Departments = () => {
  const { profile } = useAuth();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showMeetingsModal, setShowMeetingsModal] = useState(false);
  const [meetings, setMeetings] = useState<DepartmentMeeting[]>([]);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (departmentsError) throw departmentsError;
      
      const departmentsWithMemberCounts = await Promise.all(
        (departmentsData || []).map(async (department) => {
          const { count } = await supabase
            .from('department_members')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', department.id);

          return {
            ...department,
            memberCount: count || 0
          } as Department;
        })
      );

      setDepartments(departmentsWithMemberCounts);
    } catch (error: any) {
      setError('Failed to load departments: ' + error.message);
    } finally {
      setLoading(false);
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

  const openMeetingsModal = async (department: Department) => {
    setSelectedDepartment(department);
    setShowMeetingsModal(true);
    await loadMeetings(department.id);
  };

  const closeAllModals = () => {
    setShowMeetingsModal(false);
    setSelectedDepartment(null);
  };

  const filteredDepartments = departments.filter(department =>
    department.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    department.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserRoleDisplay = () => {
    if (!profile) return 'Guest';
    
    const adminRole = profile.admin_role || 'member';
    if (adminRole === 'admin' || adminRole === 'administrator') return 'Administrator';
    if (adminRole === 'pastor') return 'Pastor';
    if (adminRole === 'deacon') return 'Deacon';
    if (adminRole === 'department_leader') return 'Department Leader';
    if (adminRole === 'group_leader') return 'Group Leader';
    return 'Member';
  };

  // Permission functions
  const canCreateGroup = () => {
    if (!profile) return false;
    
    const adminRole = profile.admin_role || 'member';
    return adminRole === 'admin' || adminRole === 'pastor';
  };

  const canViewDepartment = (deptId: string) => {
    if (!profile) return false;
    
    const adminRole = profile.admin_role || 'member';
    return adminRole === 'admin' || adminRole === 'pastor' || adminRole === 'department_leader';
  };

  const canManageDepartment = (deptId: string) => {
    if (!profile) return false;
    
    const adminRole = profile.admin_role || 'member';
    return adminRole === 'admin' || adminRole === 'pastor' || adminRole === 'department_leader';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Church Departments
            </h1>
            <p className="text-gray-600">
              {profile ? `Logged in as ${getUserRoleDisplay()}` : 'Please log in to view departments'}
            </p>
          </div>
          
          <div className="flex gap-3">
            {canCreateGroup() && (
              <button
                onClick={() => {/* Open group creation modal */}}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Group className="h-4 w-4" />
                Create Group
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error Message */}
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

        {/* Success Message */}
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
          <div className="text-center py-12 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Please Log In
            </h3>
            <p className="text-gray-500 mb-6">
              You need to be logged in to view departments
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {loading && filteredDepartments.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading departments...</p>
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  {searchTerm ? 'No departments found' : 'No departments available'}
                </h3>
                <p className="text-gray-500">
                  {searchTerm ? 'Try a different search term' : 'No departments have been created yet'}
                </p>
              </div>
            ) : (
              filteredDepartments.map((department) => {
                const canManage = canManageDepartment(department.id);
                const canView = canViewDepartment(department.id);
                
                return (
                  <div
                    key={department.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start gap-3 md:gap-4 mb-4">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Users className="h-6 w-6 md:h-7 md:w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 md:mb-2">{department.name}</h3>
                        {canManage ? (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            <Shield className="h-3 w-3 mr-1" />
                            Can Manage
                          </span>
                        ) : canView ? (
                          <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                            <Shield className="h-3 w-3 mr-1" />
                            View Only
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2 md:space-y-3 mb-4">
                      {department.location && (
                        <div className="flex items-center gap-2 md:gap-3 text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">{department.location}</span>
                        </div>
                      )}
                      
                      {(department.meeting_day || department.meeting_time) && (
                        <div className="flex items-center gap-2 md:gap-3 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {department.meeting_day} {department.meeting_time && `at ${department.meeting_time}`}
                          </span>
                        </div>
                      )}
                      
                      {department.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {department.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <span className="text-sm text-gray-600">
                        {department.memberCount || 0} member{(department.memberCount || 0) !== 1 ? 's' : ''}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openMeetingsModal(department)}
                          className="px-3 py-1 md:px-4 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs md:text-sm font-medium"
                        >
                          View Meetings
                        </button>
                        {canManage && (
                          <button
                            onClick={() => {/* Open manage modal */}}
                            className="px-3 py-1 md:px-4 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs md:text-sm font-medium"
                          >
                            Manage
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 max-w-2xl md:max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                  {selectedDepartment.name} - Meetings
                </h3>
                <button
                  onClick={closeAllModals}
                  className="p-1 md:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 md:space-y-4">
                {meetings.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No meetings scheduled</p>
                  </div>
                ) : (
                  meetings.map((meeting) => (
                    <div key={meeting.id} className="p-3 md:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                        <div>
                          <div className="font-medium text-gray-900">
                            {new Date(meeting.meeting_date).toLocaleDateString()}
                            {meeting.meeting_time && ` at ${meeting.meeting_time}`}
                          </div>
                          {meeting.topic && (
                            <div className="text-sm text-gray-600 mt-1">
                              Topic: {meeting.topic}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            meeting.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : meeting.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {meeting.status || 'scheduled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Departments;
