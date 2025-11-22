import { useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { UserPlus, User, Phone, Mail, MapPin, Calendar, Save } from 'lucide-react';

interface DepartmentNewcomerStepProps {
  department: any;
  selectedMeeting: any;
  onNewcomerAdded: () => void;
  onError: (message: string) => void;
}

const DepartmentNewcomerStep: React.FC<DepartmentNewcomerStepProps> = ({
  department,
  selectedMeeting,
  onNewcomerAdded,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addNewcomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.surname.trim()) {
      onError('Name and surname are required');
      return;
    }

    try {
      setLoading(true);

      // First, create the member
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .insert([{
          name: formData.name.trim(),
          surname: formData.surname.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          status: 'newcomer',
          first_time_visit_date: new Date().toISOString(),
          invited_by: department.name
        }])
        .select()
        .single();

      if (memberError) throw memberError;

      // Then, add them to the department
      const { error: deptError } = await supabase
        .from('department_members')
        .insert([{
          department_id: department.id,
          member_id: memberData.id,
          role: 'member'
        }]);

      if (deptError) throw deptError;

      // Record their attendance if a meeting is selected
      if (selectedMeeting) {
        const { error: attendanceError } = await supabase
          .from('department_attendance')
          .insert([{
            meeting_id: selectedMeeting.id,
            member_id: memberData.id,
            status: 'present',
            notes: 'First-time department visitor - ' + (formData.notes || 'No additional notes')
          }]);

        if (attendanceError) console.error('Failed to record attendance:', attendanceError);
      }

      // Reset form and show success
      setFormData({
        name: '',
        surname: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
      });
      setShowForm(false);
      onNewcomerAdded();
      
    } catch (error: any) {
      onError('Failed to add newcomer: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="h-8 w-8 text-purple-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Add Department Newcomer</h3>
        <p className="text-gray-600">
          Register first-time visitors to the {department.name} department
        </p>
      </div>

      {/* Current Meeting Info */}
      {selectedMeeting && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">
                Recording for: {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
              </p>
              <p className="text-sm text-blue-700">
                {selectedMeeting.topic || 'Department Meeting'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Newcomer Button */}
      {!showForm && (
        <div className="text-center">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-200 font-medium mx-auto"
          >
            <UserPlus className="h-5 w-5" />
            Add Department Newcomer
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Register first-time visitors who attended the department meeting
          </p>
        </div>
      )}

      {/* Newcomer Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Newcomer Information
          </h4>
          
          <form onSubmit={addNewcomer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter first name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="surname"
                  value={formData.surname}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter email address"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter home address"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Any additional notes about the newcomer..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Adding Newcomer...' : 'Add to Department'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    name: '',
                    surname: '',
                    phone: '',
                    email: '',
                    address: '',
                    notes: ''
                  });
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Newcomers will be added as members of the {department.name} department
          {selectedMeeting && ' and marked as present for the current meeting'}.
        </p>
      </div>
    </div>
  );
};

export default DepartmentNewcomerStep;
