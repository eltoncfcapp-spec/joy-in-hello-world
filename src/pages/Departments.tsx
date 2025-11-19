import { useState, useEffect } from 'react';
import { 
  Users, MapPin, Calendar, User, Search, X, 
  Shield, AlertCircle, CheckCircle, Plus, Printer,
  Clock, FileText, Save, UserPlus, Mail, Phone
} from 'lucide-react';

// Real Supabase client (replace mock)
import { supabase } from '../../../integrations/supabase/client';

// Auth context / current user (you should have this in your app)
// If you don't have a context yet, you can use supabase.auth.getUser() directly
// For now, we'll keep the mock profile structure but you should replace this with real auth
const mockProfile = {
  id: 'user-123',
  isAdmin: true,
  role: 'admin',
  department_id: null,
  assigned_departments: ['all_departments'],
  permissions: ['manage_departments', 'create_meetings', 'manage_attendance', 'add_newcomers', 'create_reports']
};

// Department Meeting Creation Step
const DepartmentMeetingCreationStep = ({ department, onMeetingCreated, onError }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    meeting_date: '',
    meeting_time: '',
    location: department.location || '',
    topic: '',
    notes: ''
  });
  const [recentMeetings, setRecentMeetings] = useState([]);

  useEffect(() => {
    loadRecentMeetings();
  }, [department.id]);

  const loadRecentMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('departmentMeetings')
        .select('*')
        .eq('department_id', department.id)
        .order('meeting_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentMeetings(data || []);
    } catch (error) {
      console.error('Failed to load recent meetings:', error);
      onError?.('Failed to load recent meetings');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const createMeeting = async (e) => {
    e.preventDefault();
    
    if (!formData.meeting_date || !formData.meeting_time || !formData.location) {
      onError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const newMeeting = {
        department_id: department.id,
        meeting_date: formData.meeting_date,
        meeting_time: formData.meeting_time,
        location: formData.location,
        topic: formData.topic || null,
        notes: formData.notes || null,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        created_by: mockProfile.id // Replace with actual user ID from auth
      };

      const { data, error } = await supabase
        .from('departmentMeetings')
        .insert([newMeeting])
        .select()
        .single();

      if (error) throw error;

      setFormData({
        meeting_date: '',
        meeting_time: '',
        location: department.location || '',
        topic: '',
        notes: ''
      });

      await loadRecentMeetings();
      onMeetingCreated();
    } catch (error) {
      onError('Failed to create department meeting: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Schedule Department Meeting</h3>
        <p className="text-gray-600">Create a new meeting schedule for {department.name}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <form onSubmit={createMeeting} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  name="meeting_date"
                  value={formData.meeting_date}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Time *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="time"
                  name="meeting_time"
                  value={formData.meeting_time}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter meeting location"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Topic/Agenda
            </label>
            <input
              type="text"
              name="topic"
              value={formData.topic}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What will be discussed in this meeting?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional information about this meeting..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Creating Meeting...' : 'Schedule Department Meeting'}
          </button>
        </form>
      </div>

      {recentMeetings.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Department Meetings</h4>
          <div className="space-y-3">
            {recentMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {new Date(meeting.meeting_date).toLocaleDateString()} at {meeting.meeting_time}
                  </div>
                  <div className="text-sm text-gray-600">
                    {meeting.topic || 'No topic specified'} • {meeting.location}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  meeting.status === 'completed' 
                    ? 'bg-green-100 text-green-800'
                    : meeting.status === 'cancelled'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {meeting.status || 'Scheduled'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Departments Component
const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (err) {
      setError('Failed to load departments: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openWorkflowModal = (department) => {
    setSelectedDepartment(department);
    setShowWorkflowModal(true);
    setCurrentStep(1);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowWorkflowModal(false);
    setSelectedDepartment(null);
    setCurrentStep(1);
  };

  const handleError = (message) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const handleSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 5000);
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const steps = [
    { number: 1, title: 'Schedule Meeting', description: 'Create a new meeting schedule' },
    { number: 2, title: 'Take Attendance', description: 'Record member attendance' },
    { number: 3, title: 'Add Newcomers', description: 'Register first-time visitors' },
    { number: 4, title: 'Create Report', description: 'Generate meeting report' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Church Departments
            </h1>
            <p className="text-gray-600">
              Manage department meetings, attendance, and reports
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
          >
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
            Create Department
          </button>
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
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-700 font-medium">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-700 font-medium">{success}</p>
            </div>
            <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Departments Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading && filteredDepartments.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading departments...</p>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {searchTerm ? 'No departments found' : 'No Departments Yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'Try adjusting your search' : 'Create your first department to get started'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
                >
                  Create First Department
                </button>
              )}
            </div>
          ) : (
            filteredDepartments.map((department) => (
              <div
                key={department.id}
                className="bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{department.name}</h3>
                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      <Shield className="h-3 w-3 mr-1" />
                      Can Manage
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {department.location && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">{department.location}</span>
                    </div>
                  )}
                  
                  {(department.meeting_day || department.meeting_time) && (
                    <div className="flex items-center gap-3 text-gray-600">
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
                    0 members
                  </span>
                  <button
                    onClick={() => openWorkflowModal(department)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Manage Department
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Workflow Modal */}
        {showWorkflowModal && selectedDepartment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Manage {selectedDepartment.name}
                </h3>
                <button
                  onClick={closeModals}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

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
                  </div>
                ))}
              </div>

              {/* Current Step Content */}
              <div className="bg-gray-50 rounded-xl p-6 min-h-[400px]">
                {currentStep === 1 && (
                  <DepartmentMeetingCreationStep 
                    department={selectedDepartment}
                    onMeetingCreated={() => {
                      handleSuccess('Department meeting created successfully!');
                      setCurrentStep(2);
                    }}
                    onError={handleError}
                  />
                )}

                {currentStep === 2 && (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">Attendance Step</h3>
                    <p className="text-gray-500">This step will allow you to mark attendance for members</p>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="text-center py-12">
                    <UserPlus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">Newcomer Step</h3>
                    <p className="text-gray-500">This step will allow you to add first-time visitors</p>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">Report Step</h3>
                    <p className="text-gray-500">This step will allow you to generate meeting reports</p>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-6 border-t border-gray-200 mt-6">
                <button 
                  onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                  disabled={currentStep === 1}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-all duration-200 font-medium disabled:opacity-50"
                >
                  Previous
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={closeModals}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    Close
                  </button>
                  
                  <button 
                    onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
                    disabled={currentStep === 4}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Department Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900">Create New Department</h3>
                <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-center text-gray-600 py-8">
                  Department creation form would go here
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Departments;
