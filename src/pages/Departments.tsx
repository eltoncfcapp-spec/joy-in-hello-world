import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Users, MapPin, Calendar, User, Search, X, Shield, AlertCircle, CheckCircle, Printer, Clock, FileText, Save, UserPlus, Home, Phone, Download, FileDown, Plus, Trash2, Edit } from 'lucide-react';

// Interfaces
interface Department {
  id: string;
  name: string;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  leader_id: string | null;
  description?: string | null;
  memberCount?: number;
  created_at?: string | null;
  updated_at?: string | null;
  leader_name?: string | null;
  leader_residence?: string | null;
  leader_phone?: string | null;
  is_current_user_leader?: boolean;
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
  created_at: string | null;
  cancellation_reason?: string | null;
}

interface Member {
  id: string;
  name: string;
  surname: string;
  residence: string | null;
  phone: string | null;
  department_id?: string | null;
  department_role?: string | null;
  status?: string | null;
  admin_role?: string | null;
  invited_by?: string | null;
}

interface DepartmentAttendanceRecord {
  id: string;
  meeting_id: string | null;
  member_id: string | null;
  status: 'present' | 'absent' | 'absent_with_reason' | string | null;
  notes?: string | null;
  members?: Member | null;
}

interface DepartmentReport {
  id: string;
  meeting_id: string | null;
  report_text: string | null;
  decisions_made: string | null;
  action_items: string | null;
  next_meeting_date: string | null;
  created_at: string | null;
}

// Create Department Modal Component
interface CreateDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  userId: string | null;
}

const CreateDepartmentModal: React.FC<CreateDepartmentModalProps> = ({ isOpen, onClose, onSuccess, onError, userId }) => {
  const { isAdmin, isPastor } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    meeting_day: '',
    meeting_time: '',
    description: '',
    leader_id: '',
  });
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [searchMemberTerm, setSearchMemberTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAllMembers();
    }
  }, [isOpen]);

  const loadAllMembers = async () => {
    try {
      // Get ALL members, not just those with leadership roles
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (error) throw error;
      setAvailableMembers(data || []);
    } catch (error: any) {
      console.error('Failed to load members:', error);
      onError('Failed to load church members');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const createDepartment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      onError('Department name is required');
      return;
    }

    if (!userId) {
      onError('You must be logged in to create a department');
      return;
    }

    // Check if user has permission to create departments (only admin and pastor)
    if (!isAdmin() && !isPastor()) {
      onError('Only administrators and pastors can create new departments');
      return;
    }

    try {
      setLoading(true);
      
      // Check if department with same name already exists
      const { data: existingDepartment } = await supabase
        .from('departments')
        .select('id')
        .ilike('name', formData.name.trim())
        .single();

      if (existingDepartment) {
        onError('A department with this name already exists');
        return;
      }

      const newDepartment = {
        name: formData.name.trim(),
        location: formData.location.trim() || null,
        meeting_day: formData.meeting_day || null,
        meeting_time: formData.meeting_time || null,
        description: formData.description.trim() || null,
        leader_id: formData.leader_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('departments')
        .insert([newDepartment])
        .select()
        .single();

      if (error) throw error;

      // If a leader was selected, update their role
      if (formData.leader_id) {
        await supabase
          .from('members')
          .update({ 
            admin_role: 'department_leader',
            updated_at: new Date().toISOString()
          })
          .eq('id', formData.leader_id);
      }

      setFormData({
        name: '',
        location: '',
        meeting_day: '',
        meeting_time: '',
        description: '',
        leader_id: '',
      });
      
      onSuccess('Department created successfully!');
      onClose();
    } catch (error: any) {
      console.error('Error creating department:', error);
      onError('Failed to create department: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = availableMembers.filter(member =>
    member.name.toLowerCase().includes(searchMemberTerm.toLowerCase()) ||
    member.surname.toLowerCase().includes(searchMemberTerm.toLowerCase()) ||
    member.residence?.toLowerCase().includes(searchMemberTerm.toLowerCase()) ||
    member.admin_role?.toLowerCase().includes(searchMemberTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Create New Department</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={createDepartment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter department name"
              required
              minLength={2}
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
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
                maxLength={200}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Day
              </label>
              <select
                name="meeting_day"
                value={formData.meeting_day}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select day</option>
                <option value="Sunday">Sunday</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="time"
                  name="meeting_time"
                  value={formData.meeting_time}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter department description (optional)"
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department Leader (Optional)
            </label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search for church members..."
                  value={searchMemberTerm}
                  onChange={(e) => setSearchMemberTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <select
                name="leader_id"
                value={formData.leader_id}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No leader assigned</option>
                {filteredMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} {member.surname} 
                    {member.admin_role ? ` (${member.admin_role})` : ''}
                  </option>
                ))}
              </select>
              
              {filteredMembers.length === 0 && searchMemberTerm && (
                <p className="text-sm text-gray-500 text-center py-2">
                  No members found matching your search
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              You can select any church member to be the department leader. They will be assigned the "department_leader" role.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Creating Department...' : 'Create Department'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Only administrators and pastors can create new departments. 
            The department creator will have full management permissions.
          </p>
        </div>
      </div>
    </div>
  );
};

// Edit Department Modal Component
interface EditDepartmentModalProps {
  isOpen: boolean;
  department: Department | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  canEdit: boolean;
}

const EditDepartmentModal: React.FC<EditDepartmentModalProps> = ({ isOpen, department, onClose, onSuccess, onError, canEdit }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    meeting_day: '',
    meeting_time: '',
    description: '',
    leader_id: '',
  });
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [previousLeaderId, setPreviousLeaderId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && department) {
      setFormData({
        name: department.name || '',
        location: department.location || '',
        meeting_day: department.meeting_day || '',
        meeting_time: department.meeting_time || '',
        description: department.description || '',
        leader_id: department.leader_id || '',
      });
      setPreviousLeaderId(department.leader_id);
      loadAllMembers();
    }
  }, [isOpen, department]);

  const loadAllMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (error) throw error;
      setAvailableMembers(data || []);
    } catch (error: any) {
      console.error('Failed to load members:', error);
      onError('Failed to load church members');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!department?.id) {
      onError('Department not found');
      return;
    }

    if (!formData.name.trim()) {
      onError('Department name is required');
      return;
    }

    if (!canEdit) {
      onError('You do not have permission to edit this department');
      return;
    }

    try {
      setLoading(true);
      
      // Check if department with same name already exists (excluding current department)
      const { data: existingDepartment } = await supabase
        .from('departments')
        .select('id')
        .ilike('name', formData.name.trim())
        .neq('id', department.id)
        .single();

      if (existingDepartment) {
        onError('Another department with this name already exists');
        return;
      }

      const updatedDepartment = {
        name: formData.name.trim(),
        location: formData.location.trim() || null,
        meeting_day: formData.meeting_day || null,
        meeting_time: formData.meeting_time || null,
        description: formData.description.trim() || null,
        leader_id: formData.leader_id || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('departments')
        .update(updatedDepartment)
        .eq('id', department.id);

      if (error) throw error;

      // Handle leader assignment changes
      if (previousLeaderId !== formData.leader_id) {
        // Remove previous leader's role if they were a department leader
        if (previousLeaderId) {
          // Get previous leader's current role
          const { data: previousLeader } = await supabase
            .from('members')
            .select('admin_role')
            .eq('id', previousLeaderId)
            .single();
          
          // Revert to 'member' role if they were a department leader
          let newRole = previousLeader?.admin_role || 'member';
          if (newRole === 'department_leader') {
            newRole = 'member';
          }
          
          await supabase
            .from('members')
            .update({ 
              admin_role: newRole,
              updated_at: new Date().toISOString()
            })
            .eq('id', previousLeaderId);
        }

        // Assign new leader
        if (formData.leader_id) {
          await supabase
            .from('members')
            .update({ 
              admin_role: 'department_leader',
              updated_at: new Date().toISOString()
            })
            .eq('id', formData.leader_id);
        }
      }

      onSuccess('Department updated successfully!');
      onClose();
    } catch (error: any) {
      console.error('Error updating department:', error);
      onError('Failed to update department: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !department) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Edit Department</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={updateDepartment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter department name"
              required
              minLength={2}
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
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
                maxLength={200}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Day
              </label>
              <select
                name="meeting_day"
                value={formData.meeting_day}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select day</option>
                <option value="Sunday">Sunday</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="time"
                  name="meeting_time"
                  value={formData.meeting_time}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter department description (optional)"
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department Leader
            </label>
            <select
              name="leader_id"
              value={formData.leader_id}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No leader assigned</option>
              {availableMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} {member.surname} 
                  {member.admin_role ? ` (${member.admin_role})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Selecting a new leader will update their role to "department_leader".
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || !canEdit}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Updating Department...' : 'Update Department'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Delete Department Confirmation Modal
interface DeleteDepartmentModalProps {
  isOpen: boolean;
  department: Department | null;
  onClose: () => void;
  onConfirm: () => void;
  onError: (message: string) => void;
  canDelete: boolean;
}

const DeleteDepartmentModal: React.FC<DeleteDepartmentModalProps> = ({ isOpen, department, onClose, onConfirm, onError, canDelete }) => {
  const [loading, setLoading] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [confirmationName, setConfirmationName] = useState('');

  useEffect(() => {
    if (isOpen && department) {
      checkMemberCount();
      setConfirmationName('');
    }
  }, [isOpen, department]);

  const checkMemberCount = async () => {
    try {
      if (!department?.id) return;
      const { count } = await supabase
        .from('department_members')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', department.id);

      setMemberCount(count || 0);
    } catch (error) {
      console.error('Failed to check member count:', error);
    }
  };

  const isConfirmationValid = confirmationName.trim().toLowerCase() === department?.name?.trim().toLowerCase();

  const handleDelete = async () => {
    if (!department?.id) {
      onError('Department not found');
      return;
    }

    if (!canDelete) {
      onError('You do not have permission to delete this department');
      return;
    }

    if (!isConfirmationValid) {
      onError('Please type the department name correctly to confirm deletion');
      return;
    }

    try {
      setLoading(true);

      // If there are members, remove them from department_members junction table
      if (memberCount > 0) {
        await supabase
          .from('department_members')
          .delete()
          .eq('department_id', department.id);
      }
      
      // Remove leader assignment if exists
      if (department.leader_id) {
        const { data: leader } = await supabase
          .from('members')
          .select('admin_role')
          .eq('id', department.leader_id)
          .single();
        
        let newRole = leader?.admin_role || 'member';
        if (newRole === 'department_leader') {
          newRole = 'member';
        }
        
        await supabase
          .from('members')
          .update({ 
            admin_role: newRole,
            updated_at: new Date().toISOString()
          })
          .eq('id', department.leader_id);
      }

      // Delete the department
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', department.id);

      if (error) throw error;

      onConfirm();
    } catch (error: any) {
      console.error('Error deleting department:', error);
      onError('Failed to delete department: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
      onClose();
    }
  };

  if (!isOpen || !department) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Delete Department</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="text-red-800 font-medium mb-1">Warning</h4>
                <p className="text-red-700 text-sm">
                  You are about to delete the department "{department.name}". This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Department Name</span>
              <span className="font-medium text-gray-900">{department.name}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Location</span>
              <span className="font-medium text-gray-900">{department.location || 'Not specified'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Current Members</span>
              <span className="font-medium text-gray-900">{memberCount}</span>
            </div>
          </div>

          {memberCount > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  This department has {memberCount} member(s). They will be unassigned from this department upon deletion.
                </p>
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type "<span className="text-red-600 font-semibold">{department.name}</span>" to confirm deletion:
            </label>
            <input
              type="text"
              value={confirmationName}
              onChange={(e) => setConfirmationName(e.target.value)}
              placeholder="Enter department name..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            disabled={loading || !isConfirmationValid || !canDelete}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
          >
            <Trash2 className="h-4 w-4" />
            {loading ? 'Deleting...' : 'Delete Department'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Department Meeting Creation Step
const DepartmentMeetingCreationStep = ({ department, onMeetingCreated, onError, onMeetingsRefresh }: { 
  department: Department; 
  onMeetingCreated: () => void; 
  onError: (message: string) => void;
  onMeetingsRefresh?: () => Promise<void>;
}) => {
  const { canCreateDepartmentMeetings } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    meeting_date: '',
    meeting_time: '',
    location: department.location || '',
    topic: '',
    notes: ''
  });
  const [recentMeetings, setRecentMeetings] = useState<DepartmentMeeting[]>([]);

  useEffect(() => {
    loadRecentMeetings();
  }, [department.id]);

  const loadRecentMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('department_meetings')
        .select('*')
        .eq('department_id', department.id)
        .order('meeting_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentMeetings(data || []);
    } catch (error) {
      console.error('Failed to load recent meetings:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const createMeeting = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.meeting_date || !formData.location) {
      onError('Please fill in all required fields');
      return;
    }

    // Check permission
    if (!canCreateDepartmentMeetings(department.id)) {
      onError('You do not have permission to create meetings for this department');
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
        status: 'scheduled'
      };

      const { error } = await supabase
        .from('department_meetings')
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
      // Refresh the parent meetings list so the new meeting appears in step 2
      if (onMeetingsRefresh) {
        await onMeetingsRefresh();
      }
      onMeetingCreated();
    } catch (error: any) {
      onError('Failed to create department meeting: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Schedule Department Meeting</h3>
        <p className="text-gray-600">Create a new meeting schedule for {department.name}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <form onSubmit={createMeeting} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Date *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="time"
                  name="meeting_time"
                  value={formData.meeting_time}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Topic/Agenda</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
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
            disabled={loading || !canCreateDepartmentMeetings(department.id)}
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
                  meeting.status === 'completed' ? 'bg-green-100 text-green-800' :
                  meeting.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {meeting.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Department Attendance Step Component
interface DepartmentAttendanceStepProps {
  department: Department;
  meetings: DepartmentMeeting[];
  selectedMeeting: DepartmentMeeting | null;
  onMeetingSelect: (meeting: DepartmentMeeting) => void;
  onAttendanceSaved: () => void;
  onError: (message: string) => void;
}

const DepartmentAttendanceStep: React.FC<DepartmentAttendanceStepProps> = ({ 
  department, 
  meetings, 
  selectedMeeting, 
  onMeetingSelect, 
  onAttendanceSaved, 
  onError 
}) => {
  const { canManageDepartmentAttendance } = useAuth();
  const [loading, setLoading] = useState(false);
  const [departmentMembers, setDepartmentMembers] = useState<Member[]>([]);
  const [allChurchMembers, setAllChurchMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'absent_with_reason'>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showAddAttendeeModal, setShowAddAttendeeModal] = useState(false);
  const [searchMemberTerm, setSearchMemberTerm] = useState('');
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    absentWithReason: 0,
    total: 0
  });
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    loadDepartmentMembers();
    loadAllChurchMembers();
  }, [department.id]);

  useEffect(() => {
    if (selectedMeeting) {
      loadExistingAttendance();
    }
  }, [selectedMeeting]);

  useEffect(() => {
    // Update stats whenever attendance changes
    const presentCount = Object.values(attendance).filter(status => status === 'present').length;
    const absentCount = Object.values(attendance).filter(status => status === 'absent').length;
    const absentWithReasonCount = Object.values(attendance).filter(status => status === 'absent_with_reason').length;
    const totalCount = departmentMembers.length;

    setAttendanceStats({
      present: presentCount,
      absent: absentCount,
      absentWithReason: absentWithReasonCount,
      total: totalCount
    });
  }, [attendance, departmentMembers]);

  const loadDepartmentMembers = async () => {
    try {
      // Get department members from department_members table
      const { data: deptMembersData, error } = await supabase
        .from('department_members')
        .select(`
          member_id,
          members:member_id (*)
        `)
        .eq('department_id', department.id);

      if (error) throw error;
      
      const memberData = deptMembersData?.map(dm => ({
        ...dm.members,
        department_role: 'member' // Default role
      })) || [];
      
      setDepartmentMembers(memberData as Member[]);
      
      // Only initialize as present if we don't have existing attendance loaded
      if (!initialLoadComplete) {
        const initialAttendance: Record<string, 'present'> = {};
        memberData?.forEach(member => {
          if (member.id) initialAttendance[member.id] = 'present';
        });
        setAttendance(initialAttendance);
      }
    } catch (error: any) {
      onError('Failed to load department members: ' + error.message);
    }
  };

  const loadAllChurchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (error) throw error;
      setAllChurchMembers(data || []);
    } catch (error: any) {
      console.error('Failed to load all church members:', error);
    }
  };

  const loadExistingAttendance = async () => {
    try {
      if (!selectedMeeting?.id) return;
      
      const { data, error } = await supabase
        .from('department_attendance')
        .select('*')
        .eq('meeting_id', selectedMeeting.id);

      if (error) throw error;
      
      const existingAttendance: Record<string, 'present' | 'absent' | 'absent_with_reason'> = {};
      const existingNotes: Record<string, string> = {};
      
      data?.forEach(record => {
        if (record.member_id && record.status) {
          existingAttendance[record.member_id] = record.status as 'present' | 'absent' | 'absent_with_reason';
          if (record.notes) {
            existingNotes[record.member_id] = record.notes;
          }
        }
      });
      
      setAttendance(existingAttendance);
      setNotes(existingNotes);
      setInitialLoadComplete(true);
    } catch (error: any) {
      console.error('Failed to load existing attendance:', error);
    }
  };

  const handleAttendanceChange = (memberId: string, status: 'present' | 'absent' | 'absent_with_reason') => {
    setAttendance(prev => ({ ...prev, [memberId]: status }));
    
    if (status !== 'absent_with_reason') {
      setNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[memberId];
        return newNotes;
      });
    }
  };

  const handleNotesChange = (memberId: string, note: string) => {
    setNotes(prev => ({ ...prev, [memberId]: note }));
  };

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
      
      await loadDepartmentMembers();
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

  const saveAttendance = async () => {
    if (!selectedMeeting) {
      onError('Please select a department meeting first');
      return;
    }

    // Check permission
    if (!canManageDepartmentAttendance(department.id)) {
      onError('You do not have permission to manage attendance for this department');
      return;
    }

    try {
      setLoading(true);
      const attendanceRecords = departmentMembers.map(member => ({
        meeting_id: selectedMeeting.id,
        member_id: member.id,
        status: attendance[member.id] || 'absent',
        notes: attendance[member.id] === 'absent_with_reason' ? notes[member.id] || null : null
      }));

      // First, delete existing attendance for this meeting
      const { error: deleteError } = await supabase
        .from('department_attendance')
        .delete()
        .eq('meeting_id', selectedMeeting.id);

      if (deleteError) throw deleteError;

      // Then insert new attendance records
      const { error: insertError } = await supabase
        .from('department_attendance')
        .insert(attendanceRecords);

      if (insertError) throw insertError;

      // Update the meeting status to completed
      await supabase
        .from('department_meetings')
        .update({ status: 'completed' })
        .eq('id', selectedMeeting.id);

      // Reload attendance data after saving to ensure state is synced
      await loadExistingAttendance();

      // Call the success callback AFTER the reload completes
      onAttendanceSaved();
      onError('Attendance saved successfully!');
    } catch (error: any) {
      onError('Failed to save department attendance: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredChurchMembers = allChurchMembers.filter(member => 
    !departmentMembers.some(dm => dm.id === member.id) && (
      member.name.toLowerCase().includes(searchMemberTerm.toLowerCase()) ||
      member.surname.toLowerCase().includes(searchMemberTerm.toLowerCase()) ||
      member.residence?.toLowerCase().includes(searchMemberTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Record Department Attendance</h3>
        <p className="text-gray-600">Mark department members as present, absent, or absent with notes</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Select Department Meeting *</label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {meetings.filter(m => m.status === 'scheduled' || m.status === 'completed').map((meeting) => (
            <button
              key={meeting.id}
              onClick={() => onMeetingSelect(meeting)}
              className={`p-4 border rounded-xl text-left transition-all duration-200 ${
                selectedMeeting?.id === meeting.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">
                  {new Date(meeting.meeting_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Clock className="h-3 w-3" />
                {meeting.meeting_time}
              </div>
              {meeting.topic && (
                <p className="text-sm text-gray-600 truncate">{meeting.topic}</p>
              )}
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs mt-2 ${
                meeting.status === 'completed' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {meeting.status}
              </div>
            </button>
          ))}
        </div>
        {meetings.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No department meetings scheduled. Please create a department meeting first.
          </div>
        )}
      </div>

      {selectedMeeting && (
        <div className="space-y-6">
          {/* Attendance Summary */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Attendance Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Present</p>
                    <p className="text-2xl font-bold text-green-800">{attendanceStats.present}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700 font-medium">Absent</p>
                    <p className="text-2xl font-bold text-red-800">{attendanceStats.absent}</p>
                  </div>
                  <X className="h-8 w-8 text-red-500" />
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-700 font-medium">Absent with Notes</p>
                    <p className="text-2xl font-bold text-yellow-800">{attendanceStats.absentWithReason}</p>
                  </div>
                  <FileText className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Total Members</p>
                    <p className="text-2xl font-bold text-blue-800">{attendanceStats.total}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
                {attendanceStats.total > 0 && (
                  <div className="mt-2 text-center">
                    <div className="text-lg font-bold text-blue-900">
                      {Math.round((attendanceStats.present / attendanceStats.total) * 100)}%
                    </div>
                    <div className="text-xs text-blue-700">Attendance Rate</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900">
              Department Attendance for {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
            </h4>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{departmentMembers.length} department members</span>
              <button
                onClick={() => setShowAddAttendeeModal(true)}
                disabled={!canManageDepartmentAttendance(department.id)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                Add Attendee
              </button>
            </div>
          </div>

          {departmentMembers.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No members found in this department.</p>
              <button
                onClick={() => setShowAddAttendeeModal(true)}
                disabled={!canManageDepartmentAttendance(department.id)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Add Members
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {departmentMembers.map((member) => (
                  <div key={member.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-gray-900">
                            {member.name} {member.surname}
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            member.admin_role === 'department_leader' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {member.admin_role || 'member'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {member.residence} • {member.phone}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAttendanceChange(member.id, 'present')}
                          disabled={!canManageDepartmentAttendance(department.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            attendance[member.id] === 'present'
                              ? 'bg-green-600 text-white shadow-lg'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          } ${!canManageDepartmentAttendance(department.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Present
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(member.id, 'absent')}
                          disabled={!canManageDepartmentAttendance(department.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            attendance[member.id] === 'absent'
                              ? 'bg-red-600 text-white shadow-lg'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          } ${!canManageDepartmentAttendance(department.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <X className="h-4 w-4" />
                          Absent
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(member.id, 'absent_with_reason')}
                          disabled={!canManageDepartmentAttendance(department.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            attendance[member.id] === 'absent_with_reason'
                              ? 'bg-orange-600 text-white shadow-lg'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          } ${!canManageDepartmentAttendance(department.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <FileText className="h-4 w-4" />
                          Absent with Notes
                        </button>
                      </div>
                    </div>
                    {attendance[member.id] === 'absent_with_reason' && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes for Absence</label>
                        <input
                          type="text"
                          value={notes[member.id] || ''}
                          onChange={(e) => handleNotesChange(member.id, e.target.value)}
                          placeholder="Enter notes for absence..."
                          className="w-full px-3 py-2 border border-orange-300 rounded-lg bg-orange-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          disabled={!canManageDepartmentAttendance(department.id)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-center pt-6">
                <button
                  onClick={saveAttendance}
                  disabled={loading || !canManageDepartmentAttendance(department.id)}
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? 'Saving Department Attendance...' : 'Save Department Attendance'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showAddAttendeeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add Attendee to {department.name}</h3>
              <button
                onClick={() => setShowAddAttendeeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search church members..."
                  value={searchMemberTerm}
                  onChange={(e) => setSearchMemberTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredChurchMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchMemberTerm ? 'No members found matching your search' : 'No church members available to add'}
                </div>
              ) : (
                filteredChurchMembers.map((member) => (
                  <div key={member.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{member.name} {member.surname}</div>
                        <div className="text-sm text-gray-600">{member.residence} • {member.phone}</div>
                      </div>
                      <button
                        onClick={() => addMemberToDepartment(member)}
                        disabled={loading || !canManageDepartmentAttendance(department.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        Add to Department
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Department Newcomer Step Component
interface DepartmentNewcomerStepProps {
  department: Department;
  selectedMeeting: DepartmentMeeting | null;
  onNewcomerAdded: () => void;
  onError: (message: string) => void;
}

const DepartmentNewcomerStep: React.FC<DepartmentNewcomerStepProps> = ({ 
  department, 
  selectedMeeting, 
  onNewcomerAdded, 
  onError 
}) => {
  const { canAddDepartmentNewcomers } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    phone: '',
    residence: '',
    notes: '',
    invited_by: ''
  });
  const [allChurchMembers, setAllChurchMembers] = useState<Member[]>([]);
  const [searchInviterTerm, setSearchInviterTerm] = useState('');

  useEffect(() => {
    loadAllChurchMembers();
  }, []);

  const loadAllChurchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (error) throw error;
      setAllChurchMembers(data || []);
    } catch (error: any) {
      console.error('Failed to load all church members:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const filteredInviters = allChurchMembers.filter(member =>
    member.name.toLowerCase().includes(searchInviterTerm.toLowerCase()) ||
    member.surname.toLowerCase().includes(searchInviterTerm.toLowerCase()) ||
    member.residence?.toLowerCase().includes(searchInviterTerm.toLowerCase())
  );

  const addNewcomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.surname.trim() || !formData.residence.trim()) {
      onError('Name, surname, and residence are required');
      return;
    }

    // Check permission
    if (!canAddDepartmentNewcomers(department.id)) {
      onError('You do not have permission to add newcomers to this department');
      return;
    }

    try {
      setLoading(true);
      
      // Check if member already exists with same phone
      let existingMember = null;
      if (formData.phone.trim()) {
        const { data: phoneMatch } = await supabase
          .from('members')
          .select('*')
          .eq('phone', formData.phone.trim())
          .single();
        existingMember = phoneMatch;
      }

      let memberId;
      
      if (existingMember) {
        // Use existing member
        memberId = existingMember.id;
        // Update member status
        await supabase
          .from('members')
          .update({ 
            status: 'newcomer',
            invited_by: formData.invited_by || null,
            first_time_visit_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMember.id);
      } else {
        // Create new member
        const memberPayload = {
          name: formData.name.trim(),
          surname: formData.surname.trim(),
          phone: formData.phone.trim() || null,
          residence: formData.residence.trim(),
          status: 'newcomer' as const,
          first_time_visit_date: new Date().toISOString(),
          invited_by: formData.invited_by || null,
          is_permanent_member: false,
          is_leader: false,
          admin_role: 'member',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status_date: new Date().toISOString()
        };

        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .insert([memberPayload])
          .select()
          .single();

        if (memberError) {
          if (memberError.code === '23505' && memberError.message.includes('phone')) {
            onError('A member with this phone number already exists');
            return;
          }
          throw memberError;
        }
        memberId = memberData.id;
      }

      // Add to department members
      const { error: deptError } = await supabase
        .from('department_members')
        .insert([{
          department_id: department.id,
          member_id: memberId,
          role: 'member',
          assigned_at: new Date().toISOString()
        }]);

      if (deptError) throw deptError;

      // Record attendance for selected meeting
      if (selectedMeeting) {
        const { error: attendanceError } = await supabase
          .from('department_attendance')
          .insert([{
            meeting_id: selectedMeeting.id,
            member_id: memberId,
            status: 'present',
            notes: 'First-time department visitor - ' + (formData.notes || 'No additional notes')
          }]);
        if (attendanceError) console.error('Failed to record attendance:', attendanceError);
      }

      setFormData({ name: '', surname: '', phone: '', residence: '', notes: '', invited_by: '' });
      setShowForm(false);
      onNewcomerAdded();
      onError('Newcomer added successfully!');
    } catch (error: any) {
      console.error('Error adding newcomer:', error);
      onError('Failed to add newcomer: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Add Department Newcomer</h3>
        <p className="text-gray-600">Register first-time visitors to the {department.name} department</p>
      </div>

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

      {!showForm && (
        <div className="text-center">
          <button
            onClick={() => setShowForm(true)}
            disabled={!canAddDepartmentNewcomers(department.id)}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-200 font-medium mx-auto disabled:opacity-50"
          >
            <UserPlus className="h-5 w-5" />
            Add Department Newcomer
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Register first-time visitors who attended the department meeting
          </p>
          {!canAddDepartmentNewcomers(department.id) && (
            <p className="text-sm text-red-500 mt-2">You don't have permission to add newcomers</p>
          )}
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Newcomer Information</h4>
          <form onSubmit={addNewcomer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
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
                    minLength={1}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                <input
                  type="text"
                  name="surname"
                  value={formData.surname}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter last name"
                  required
                  minLength={1}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Residence *</label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    name="residence"
                    value={formData.residence}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter residence"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invited By</label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search for church member..."
                    value={searchInviterTerm}
                    onChange={(e) => setSearchInviterTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <select
                  name="invited_by"
                  value={formData.invited_by}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Not specified</option>
                  {filteredInviters.map((member) => (
                    <option key={member.id} value={`${member.name} ${member.surname}`}>
                      {member.name} {member.surname} ({member.residence})
                    </option>
                  ))}
                </select>
                
                {filteredInviters.length === 0 && searchInviterTerm && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    No church members found matching your search
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
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
                disabled={loading || !canAddDepartmentNewcomers(department.id)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Adding Newcomer...' : 'Add to Department'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ name: '', surname: '', phone: '', residence: '', notes: '', invited_by: '' });
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Newcomers will be added as members of the {department.name} department 
          {selectedMeeting && ' and marked as present for the current meeting'}.
        </p>
      </div>
    </div>
  );
};

// Department Report Step Component
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
  const { canCreateDepartmentReports } = useAuth();
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState<DepartmentAttendanceRecord[]>([]);
  const [existingReport, setExistingReport] = useState<DepartmentReport | null>(null);
  const [reportData, setReportData] = useState({
    report_text: '',
    decisions_made: '',
    action_items: '',
    next_meeting_date: '',
    additional_notes: ''
  });
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    absentWithReason: 0,
    total: 0
  });

  useEffect(() => {
    if (selectedMeeting) {
      loadAttendanceData();
      loadExistingReport();
    }
  }, [selectedMeeting]);

  useEffect(() => {
    // Update stats whenever attendance changes
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;
    const absentWithReasonCount = attendance.filter(a => a.status === 'absent_with_reason').length;
    const totalCount = attendance.length;

    setAttendanceStats({
      present: presentCount,
      absent: absentCount,
      absentWithReason: absentWithReasonCount,
      total: totalCount
    });
  }, [attendance]);

  const loadAttendanceData = async () => {
    try {
      if (!selectedMeeting) return;

      const { data, error } = await supabase
        .from('department_attendance')
        .select(`
          *,
          members:member_id (
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

  const loadExistingReport = async () => {
    try {
      if (!selectedMeeting) return;

      const { data, error } = await supabase
        .from('department_reports')
        .select('*')
        .eq('meeting_id', selectedMeeting.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setExistingReport(data);
        setReportData({
          report_text: data.report_text || '',
          decisions_made: data.decisions_made || '',
          action_items: data.action_items || '',
          next_meeting_date: data.next_meeting_date || '',
          additional_notes: ''
        });
      } else {
        setReportData({
          report_text: '',
          decisions_made: '',
          action_items: '',
          next_meeting_date: '',
          additional_notes: ''
        });
      }
    } catch (error: any) {
      console.error('Failed to load existing report:', error);
    }
  };

  const handleReportChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setReportData(prev => ({ ...prev, [name]: value }));
  };

  const generateReport = async () => {
    if (!selectedMeeting) {
      onError('Please select a meeting first');
      return;
    }

    // Check permission
    if (!canCreateDepartmentReports(department.id)) {
      onError('You do not have permission to create reports for this department');
      return;
    }

    try {
      setLoading(true);
      const reportPayload = {
        meeting_id: selectedMeeting.id,
        report_text: reportData.report_text,
        decisions_made: reportData.decisions_made || null,
        action_items: reportData.action_items || null,
        next_meeting_date: reportData.next_meeting_date || null
      };

      let error;
      if (existingReport) {
        const { error: updateError } = await supabase
          .from('department_reports')
          .update(reportPayload)
          .eq('id', existingReport.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('department_reports')
          .insert([reportPayload]);
        error = insertError;
      }

      if (error) throw error;

      await supabase
        .from('department_meetings')
        .update({ status: 'completed' })
        .eq('id', selectedMeeting.id);

      onReportCreated();
    } catch (error: any) {
      onError('Failed to generate department report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const stats = attendanceStats;
    
    // Build existing report preview section for print
    const existingReportPreview = existingReport ? `
      <div class="existing-report-preview">
        <div class="preview-header">
          <span class="preview-title">✓ Existing Report Preview</span>
          <span class="preview-badge">Report Saved</span>
        </div>
        <div class="preview-grid">
          <div class="preview-item">
            <h5>Meeting Summary</h5>
            <p>${reportData.report_text || 'Not provided'}</p>
          </div>
          <div class="preview-item">
            <h5>Decisions Made</h5>
            <p>${reportData.decisions_made || 'No decisions recorded'}</p>
          </div>
          <div class="preview-item">
            <h5>Action Items & Follow-ups</h5>
            <p>${reportData.action_items || 'No action items recorded'}</p>
          </div>
          <div class="preview-item">
            <h5>Next Meeting Date</h5>
            <p>${reportData.next_meeting_date 
              ? new Date(reportData.next_meeting_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              : 'Not scheduled'
            }</p>
          </div>
        </div>
      </div>
    ` : '';
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Department Meeting Report - ${department.name}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 100%; margin: 0 auto; font-size: 11px; }
            h1 { color: #1e3a5f; border-bottom: 2px solid #7c3aed; padding-bottom: 8px; font-size: 18px; margin-bottom: 15px; }
            h2 { color: #374151; margin-top: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; font-size: 14px; }
            .header-info { background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 12px 0; }
            .header-info p { margin: 4px 0; font-size: 11px; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
            .stat-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 10px; border-radius: 6px; text-align: center; }
            .stat-box.present { background: #dcfce7; border-color: #86efac; }
            .stat-box.absent { background: #fee2e2; border-color: #fca5a5; }
            .stat-box.with-reason { background: #fef3c7; border-color: #fcd34d; }
            .stat-value { font-size: 20px; font-weight: bold; color: #111827; }
            .stat-label { font-size: 9px; color: #6b7280; margin-top: 3px; }
            .report-section { background: #ffffff; border: 1px solid #e5e7eb; padding: 12px; border-radius: 6px; margin: 10px 0; overflow: hidden; }
            .report-section h3 { margin-top: 0; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; font-size: 12px; }
            .highlight-box { background: #eff6ff; border: 2px solid #3b82f6; padding: 12px; border-radius: 6px; margin: 8px 0; }
            .decisions-box { background: #f0fdf4; border: 2px solid #22c55e; }
            .actions-box { background: #fefce8; border: 2px solid #eab308; }
            .attendance-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
            .attendance-table th, .attendance-table td { border: 1px solid #e5e7eb; padding: 6px; text-align: left; }
            .attendance-table th { background: #f3f4f6; font-weight: 600; font-size: 9px; }
            .status-present { color: #059669; font-weight: 600; }
            .status-absent { color: #dc2626; font-weight: 600; }
            .status-with-reason { color: #d97706; font-weight: 600; }
            .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 9px; }
            .section-content { white-space: pre-wrap; line-height: 1.4; margin-top: 8px; font-size: 10px; word-wrap: break-word; overflow-wrap: break-word; max-width: 100%; }
            .existing-report-preview { background: linear-gradient(to right, #f0fdf4, #ecfdf5); border: 2px solid #86efac; border-radius: 8px; padding: 12px; margin: 12px 0; }
            .preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
            .preview-title { font-size: 13px; font-weight: 600; color: #166534; }
            .preview-badge { background: #dcfce7; color: #166534; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 500; }
            .preview-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .preview-item { background: rgba(255,255,255,0.8); padding: 10px; border-radius: 6px; overflow: hidden; }
            .preview-item h5 { margin: 0 0 6px 0; font-size: 10px; color: #374151; font-weight: 600; }
            .preview-item p { margin: 0; font-size: 10px; color: #111827; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; max-width: 100%; }
            @media print { 
              body { padding: 15px; font-size: 10px; }
              .page-break { page-break-before: always; }
              .existing-report-preview { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>📋 Department Meeting Report</h1>
          <div class="header-info">
            <p><strong>Department:</strong> ${department.name}</p>
            <p><strong>Meeting Date:</strong> ${selectedMeeting ? new Date(selectedMeeting.meeting_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : 'N/A'}</p>
            <p><strong>Meeting Time:</strong> ${selectedMeeting?.meeting_time || 'Not specified'}</p>
            <p><strong>Location:</strong> ${selectedMeeting?.location || department.location || 'Not specified'}</p>
            <p><strong>Topic:</strong> ${selectedMeeting?.topic || 'General Department Meeting'}</p>
            <p><strong>Status:</strong> ${selectedMeeting?.status || 'N/A'}</p>
            ${selectedMeeting?.status === 'cancelled' && selectedMeeting?.cancellation_reason ? 
              `<p><strong>Cancellation Reason:</strong> ${selectedMeeting.cancellation_reason}</p>` : ''}
          </div>

          <h2>📊 Attendance Summary</h2>
          <div class="stats-grid">
            <div class="stat-box present">
              <div class="stat-value">${stats.present}</div>
              <div class="stat-label">Present</div>
            </div>
            <div class="stat-box absent">
              <div class="stat-value">${stats.absent}</div>
              <div class="stat-label">Absent</div>
            </div>
            <div class="stat-box with-reason">
              <div class="stat-value">${stats.absentWithReason}</div>
              <div class="stat-label">Absent with Reason</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%</div>
              <div class="stat-label">Attendance Rate</div>
            </div>
          </div>

          ${existingReportPreview}

          <div class="page-break"></div>

          <!-- Meeting Summary/Report Section -->
          <div class="report-section highlight-box">
            <h3>📝 Meeting Summary</h3>
            <div class="section-content">${reportData.report_text || 'No summary recorded'}</div>
          </div>

          <!-- Decisions Made Section -->
          <div class="report-section decisions-box">
            <h3>✅ Decisions Made</h3>
            <div class="section-content">${reportData.decisions_made || 'No decisions recorded'}</div>
          </div>

          <!-- Action Items Section -->
          <div class="report-section actions-box">
            <h3>🎯 Action Items & Follow-ups</h3>
            <div class="section-content">${reportData.action_items || 'No action items recorded'}</div>
          </div>

          <!-- Next Meeting Section -->
          <div class="report-section">
            <h3>📅 Next Meeting</h3>
            <p>${reportData.next_meeting_date 
              ? `Scheduled for: ${new Date(reportData.next_meeting_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}`
              : 'Not scheduled yet'
            }</p>
          </div>

          <!-- Additional Notes Section -->
          ${reportData.additional_notes ? `
          <div class="report-section">
            <h3>📝 Additional Notes</h3>
            <div class="section-content">${reportData.additional_notes}</div>
          </div>
          ` : ''}

          <div class="page-break"></div>

          <h2>👥 Detailed Attendance (${attendance.length} members)</h2>
          ${attendance.length > 0 ? `
          <table class="attendance-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Residence</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${attendance.map(record => `
                <tr>
                  <td>${record.members?.name || ''} ${record.members?.surname || ''}</td>
                  <td>${record.members?.residence || ''}</td>
                  <td>${record.members?.phone || ''}</td>
                  <td class="${record.status === 'present' ? 'status-present' : record.status === 'absent' ? 'status-absent' : 'status-with-reason'}">
                    ${record.status === 'present' ? 'Present' : record.status === 'absent' ? 'Absent' : 'Absent with Reason'}
                  </td>
                  <td>${record.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : '<p>No attendance records available.</p>'}

          ${selectedMeeting?.notes ? `
          <div class="page-break"></div>
          <div class="report-section">
            <h3>📋 Meeting Notes</h3>
            <div class="section-content">${selectedMeeting.notes}</div>
          </div>
          ` : ''}

          <div class="footer">
            <p>Report Generated: ${new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} at ${new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p>Church Management System • ${department.name} Department</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const downloadReport = () => {
    const stats = attendanceStats;
    const reportContent = `
==================================================================
                    DEPARTMENT MEETING REPORT
==================================================================

Department: ${department.name}
Meeting Date: ${selectedMeeting ? new Date(selectedMeeting.meeting_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'N/A'}
Meeting Time: ${selectedMeeting?.meeting_time || 'N/A'}
Location: ${selectedMeeting?.location || department.location || 'N/A'}
Topic: ${selectedMeeting?.topic || 'General Department Meeting'}
Status: ${selectedMeeting?.status || 'N/A'}

${selectedMeeting?.status === 'cancelled' && selectedMeeting?.cancellation_reason ? 
`CANCELLATION REASON: ${selectedMeeting.cancellation_reason}\n` : ''}

==================================================================
                    ATTENDANCE SUMMARY
==================================================================
Total Members: ${stats.total}
Present: ${stats.present} (${stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%)
Absent: ${stats.absent} (${stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : 0}%)
Absent with Notes: ${stats.absentWithReason} (${stats.total > 0 ? Math.round((stats.absentWithReason / stats.total) * 100) : 0}%)
Attendance Rate: ${stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%

==================================================================
                    MEETING REPORT
==================================================================
${reportData.report_text || 'No report text recorded'}

==================================================================
                    DECISIONS MADE
==================================================================
${reportData.decisions_made || 'No decisions recorded'}

==================================================================
                    ACTION ITEMS
==================================================================
${reportData.action_items || 'No action items recorded'}

==================================================================
                    NEXT MEETING
==================================================================
${reportData.next_meeting_date ? `Scheduled for: ${new Date(reportData.next_meeting_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}` : 'No next meeting date set'}

==================================================================
                    ADDITIONAL NOTES
==================================================================
${reportData.additional_notes || 'No additional notes'}

==================================================================
                    DETAILED ATTENDANCE
==================================================================
${attendance.length > 0 ? attendance.map(record => 
`• ${record.members?.name || ''} ${record.members?.surname || ''}
  Residence: ${record.members?.residence || 'No residence'}
  Phone: ${record.members?.phone || 'No phone'}
  Status: ${(record.status || 'unknown').toUpperCase()}
  ${record.notes ? `Notes: ${record.notes}` : ''}
  ${'-'.repeat(60)}`
).join('\n\n') : 'No attendance records available.'}

${selectedMeeting?.notes ? `
==================================================================
                    MEETING NOTES
==================================================================
${selectedMeeting.notes}
` : ''}

==================================================================
                    REPORT INFORMATION
==================================================================
Generated on: ${new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}
Generated at: ${new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })}
Church Management System
${department.name} Department
==================================================================
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `department-report-${department.name.replace(/\s+/g, '-').toLowerCase()}-${selectedMeeting?.meeting_date || 'unknown'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Create Department Report</h3>
        <p className="text-gray-600">Generate a comprehensive report for the {department.name} department meeting</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Select Department Meeting *</label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {meetings.filter(m => m.status === 'scheduled' || m.status === 'completed').map((meeting) => (
            <button
              key={meeting.id}
              onClick={() => onMeetingSelect(meeting)}
              className={`p-4 border rounded-xl text-left transition-all duration-200 ${
                selectedMeeting?.id === meeting.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">
                  {new Date(meeting.meeting_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Clock className="h-3 w-3" />
                {meeting.meeting_time}
              </div>
              {meeting.topic && (
                <p className="text-sm text-gray-600 truncate">{meeting.topic}</p>
              )}
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs mt-2 ${
                meeting.status === 'completed' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {meeting.status}
              </div>
            </button>
          ))}
        </div>
        {meetings.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No department meetings available for reporting.
          </div>
        )}
      </div>

      {selectedMeeting && (
        <>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Meeting Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Time</p>
                  <p className="font-medium text-gray-900">
                    {selectedMeeting.meeting_time || 'Not specified'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-medium text-gray-900">
                    {selectedMeeting.location || department.location || 'Not specified'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Topic</p>
                  <p className="font-medium text-gray-900">
                    {selectedMeeting.topic || 'General Department Meeting'}
                  </p>
                </div>
              </div>
            </div>
            {selectedMeeting.status === 'cancelled' && selectedMeeting.cancellation_reason && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Cancellation Reason</p>
                    <p className="text-sm text-red-700">{selectedMeeting.cancellation_reason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Attendance Summary</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-800">Present</span>
                    </div>
                    <span className="text-lg font-bold text-green-800">{attendanceStats.present}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <X className="h-5 w-5 text-red-600" />
                      <span className="text-red-800">Absent</span>
                    </div>
                    <span className="text-lg font-bold text-red-800">{attendanceStats.absent}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <span className="text-yellow-800">Absent with Notes</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-800">{attendanceStats.absentWithReason}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span className="text-blue-800">Total</span>
                    </div>
                    <span className="text-lg font-bold text-blue-800">{attendanceStats.total}</span>
                  </div>
                </div>

                {attendanceStats.total > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {Math.round((attendanceStats.present / attendanceStats.total) * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">Attendance Rate</div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4 print:hidden">
                  <button
                    onClick={downloadReport}
                    disabled={!canCreateDepartmentReports(department.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    onClick={handlePrint}
                    disabled={!canCreateDepartmentReports(department.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                </div>
              </div>

              {attendance.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Attendance Details</h4>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {attendance.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {record.members?.name} {record.members?.surname}
                          </div>
                          <div className="text-sm text-gray-600">{record.members?.residence}</div>
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs mt-1 ${
                            record.status === 'present' ? 'bg-green-100 text-green-800' :
                            record.status === 'absent' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {(record.status || 'unknown').replace('_', ' ')}
                          </div>
                          {record.notes && (
                            <p className="text-sm text-gray-600 mt-1">Notes: {record.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              {/* Existing Report Preview */}
              {existingReport && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Existing Report Preview
                    </h4>
                    <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      ✓ Report Saved
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/80 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Meeting Summary</h5>
                      <p className="text-gray-900 text-sm whitespace-pre-wrap line-clamp-4">{reportData.report_text || 'Not provided'}</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Decisions Made</h5>
                      <p className="text-gray-900 text-sm whitespace-pre-wrap line-clamp-4">{reportData.decisions_made || 'No decisions recorded'}</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Action Items & Follow-ups</h5>
                      <p className="text-gray-900 text-sm whitespace-pre-wrap line-clamp-4">{reportData.action_items || 'No action items recorded'}</p>
                    </div>
                    <div className="bg-white/80 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Next Meeting Date</h5>
                      <p className="text-gray-900 text-sm">
                        {reportData.next_meeting_date 
                          ? new Date(reportData.next_meeting_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : 'Not scheduled'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {existingReport ? 'Edit Department Report' : 'Create Department Report'}
                  </h4>
                  {existingReport && (
                    <span className="text-sm text-gray-500">
                      Last updated: {existingReport.created_at ? new Date(existingReport.created_at).toLocaleString() : 'Unknown'}
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Report *</label>
                    <textarea
                      name="report_text"
                      value={reportData.report_text}
                      onChange={handleReportChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Detailed report of what was discussed and accomplished..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Decisions Made</label>
                    <textarea
                      name="decisions_made"
                      value={reportData.decisions_made}
                      onChange={handleReportChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Important decisions, approvals, or resolutions..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Action Items</label>
                    <textarea
                      name="action_items"
                      value={reportData.action_items}
                      onChange={handleReportChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tasks assigned, follow-ups, or next steps..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Next Meeting Date</label>
                      <input
                        type="date"
                        name="next_meeting_date"
                        value={reportData.next_meeting_date}
                        onChange={handleReportChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                    <textarea
                      name="additional_notes"
                      value={reportData.additional_notes}
                      onChange={handleReportChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any other relevant information..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    onClick={generateReport}
                    disabled={loading || !selectedMeeting || !reportData.report_text.trim() || !canCreateDepartmentReports(department.id)}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    {loading ? 'Generating Report...' : existingReport ? 'Update Department Report' : 'Generate Department Report'}
                  </button>
                </div>
              </div>

              {selectedMeeting.notes && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Meeting Notes</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedMeeting.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Department Management Workflow Component
interface DepartmentWorkflowProps {
  department: Department;
  meetings: DepartmentMeeting[];
  members: Member[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onMeetingsRefresh?: () => Promise<void>;
}

const DepartmentManagementWorkflow: React.FC<DepartmentWorkflowProps> = ({ 
  department, 
  meetings: initialMeetings, 
  members: _members, 
  onClose, 
  onSuccess, 
  onError,
  onMeetingsRefresh
}) => {
  const { profile, canCreateDepartmentMeetings, canManageDepartmentAttendance, canAddDepartmentNewcomers, canCreateDepartmentReports } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMeeting, setSelectedMeeting] = useState<DepartmentMeeting | null>(null);
  const [localMeetings, setLocalMeetings] = useState<DepartmentMeeting[]>(initialMeetings);

  // Update local meetings when initial meetings change
  useEffect(() => {
    setLocalMeetings(initialMeetings);
  }, [initialMeetings]);

  const loadMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('department_meetings')
        .select('*')
        .eq('department_id', department.id)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setLocalMeetings(data || []);
      
      // Also refresh parent meetings if callback provided
      if (onMeetingsRefresh) {
        await onMeetingsRefresh();
      }
    } catch (error) {
      console.error('Failed to load meetings:', error);
    }
  };

  const steps = [
    { number: 1, title: 'Schedule Meeting', description: 'Create a new meeting schedule' },
    { number: 2, title: 'Take Attendance', description: 'Record member attendance' },
    { number: 3, title: 'Add Newcomers', description: 'Register first-time visitors' },
    { number: 4, title: 'Create Report', description: 'Generate meeting report' }
  ];

  const canAccessStep = (stepNumber: number) => {
    if (!profile) return false;

    switch (stepNumber) {
      case 1:
        return canCreateDepartmentMeetings(department.id);
      case 2:
        return canManageDepartmentAttendance(department.id);
      case 3:
        return canAddDepartmentNewcomers(department.id);
      case 4:
        return canCreateDepartmentReports(department.id);
      default:
        return false;
    }
  };

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
            onMeetingsRefresh={loadMeetings}
          />
        )}

        {currentStep === 2 && (
          <DepartmentAttendanceStep
            department={department}
            meetings={localMeetings}
            selectedMeeting={selectedMeeting}
            onMeetingSelect={setSelectedMeeting}
            onAttendanceSaved={() => {
              onSuccess('Department attendance saved successfully!');
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
            meetings={localMeetings}
            selectedMeeting={selectedMeeting}
            onMeetingSelect={setSelectedMeeting}
            onReportCreated={() => {
              onSuccess('Department report generated successfully!');
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

// Main Departments Component
const Departments = () => {
  const { 
    profile, 
    canViewDepartment, 
    canManageDepartment, 
    getRoles, 
    isAdmin, 
    isPastor, 
    isDepartmentLeader, 
    isMember 
  } = useAuth();
  
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
  const [departmentReport, setDepartmentReport] = useState<DepartmentReport | null>(null);

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
      
      if (!isAdmin() && !isPastor()) {
        if (isDepartmentLeader()) {
          // Department Leaders can see only their own department
          filteredDepartments = departmentsWithDetails.filter(department => 
            department.leader_id === profile?.id
          );
        } else if (isMember()) {
          // Members can see only departments they belong to
          const userDepartments = await getUserDepartments();
          filteredDepartments = departmentsWithDetails.filter(department => 
            userDepartments.some(ud => ud.id === department.id)
          );
        } else {
          // No role - no access
          filteredDepartments = [];
        }
      }
      // Administrators and Pastors can see all departments (no filtering)

      setDepartments(filteredDepartments as Department[]);
    } catch (error: any) {
      console.error('Error loading departments:', error);
      setError('Failed to load departments: ' + error.message);
    } finally {
      setLoading(false);
    }
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
      
      return (departmentData || []) as Department[];
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
      const { data, error } = await supabase
        .from('department_attendance')
        .select(`
          *,
          members:member_id (
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

  const loadDepartmentReport = async (meetingId: string) => {
    try {
      const { data, error } = await supabase
        .from('department_reports')
        .select('*')
        .eq('meeting_id', meetingId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading department report:', error);
        return;
      }
      
      setDepartmentReport(data || null);
    } catch (error: any) {
      console.error('Failed to load department report:', error);
    }
  };

  const openReportModal = async (meeting: DepartmentMeeting) => {
    setSelectedMeetingForReport(meeting);
    await loadAttendanceForMeeting(meeting.id);
    await loadDepartmentReport(meeting.id);
    setShowReportModal(true);
  };

  const handlePrintReport = () => {
    const stats = getAttendanceStats();
    const meeting = selectedMeetingForReport;
    const department = selectedDepartment;
    
    if (!meeting || !department) return;

    // Get report data
    const reportText = departmentReport?.report_text || 'No report available';
    const decisionsMade = departmentReport?.decisions_made || 'No decisions recorded';
    const actionItems = departmentReport?.action_items || 'No action items recorded';
    const nextMeetingDate = departmentReport?.next_meeting_date || 'Not scheduled';

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Department Meeting Report - ${department.name}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 100%; margin: 0 auto; font-size: 12px; }
            h1 { color: #1e3a5f; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px; font-size: 22px; margin-bottom: 20px; }
            h2 { color: #374151; margin-top: 25px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; font-size: 18px; }
            h3 { color: #4b5563; margin-top: 20px; font-size: 16px; }
            .header-info { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .header-info p { margin: 5px 0; font-size: 12px; word-wrap: break-word; overflow-wrap: break-word; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 15px 0; }
            .stat-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; text-align: center; }
            .stat-box.present { background: #dcfce7; border-color: #86efac; }
            .stat-box.absent { background: #fee2e2; border-color: #fca5a5; }
            .stat-box.with-reason { background: #fef3c7; border-color: #fcd34d; }
            .stat-value { font-size: 24px; font-weight: bold; color: #111827; }
            .stat-label { font-size: 11px; color: #6b7280; margin-top: 4px; }
            .report-section { background: #ffffff; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin: 12px 0; overflow: hidden; }
            .report-section h3 { margin-top: 0; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; font-size: 15px; }
            .section-content { white-space: pre-wrap; line-height: 1.6; margin-top: 10px; font-size: 12px; word-wrap: break-word; overflow-wrap: break-word; overflow: hidden; }
            .highlight-box { background: #f5f3ff; border: 2px solid #8b5cf6; }
            .decisions-box { background: #f0fdf4; border: 2px solid #22c55e; }
            .actions-box { background: #fefce8; border: 2px solid #eab308; }
            .attendance-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            .attendance-table th, .attendance-table td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; word-wrap: break-word; overflow-wrap: break-word; }
            .attendance-table th { background: #f3f4f6; font-weight: 600; font-size: 11px; }
            .status-present { color: #059669; font-weight: 600; }
            .status-absent { color: #dc2626; font-weight: 600; }
            .status-with-reason { color: #d97706; font-weight: 600; }
            .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 11px; }
            @media print { 
              body { padding: 15px; font-size: 11px; }
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          <h1>📋 Department Meeting Report</h1>
          <div class="header-info">
            <p><strong>Department:</strong> ${department.name}</p>
            <p><strong>Leader:</strong> ${department.leader_name || 'Not assigned'}</p>
            <p><strong>Meeting Date:</strong> ${new Date(meeting.meeting_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p><strong>Meeting Time:</strong> ${meeting.meeting_time || 'Not specified'}</p>
            <p><strong>Location:</strong> ${meeting.location || department.location || 'Not specified'}</p>
            <p><strong>Topic:</strong> ${meeting.topic || 'General Department Meeting'}</p>
            <p><strong>Status:</strong> ${meeting.status || 'N/A'}</p>
          </div>

          <h2>📊 Attendance Summary</h2>
          <div class="stats-grid">
            <div class="stat-box present">
              <div class="stat-value">${stats.attended}</div>
              <div class="stat-label">Present</div>
            </div>
            <div class="stat-box absent">
              <div class="stat-value">${stats.absent}</div>
              <div class="stat-label">Absent</div>
            </div>
            <div class="stat-box with-reason">
              <div class="stat-value">${stats.absentWithReason}</div>
              <div class="stat-label">Absent with Notes</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0}%</div>
              <div class="stat-label">Attendance Rate</div>
            </div>
          </div>

          <h2>📝 Meeting Report</h2>
          
          <div class="report-section highlight-box">
            <h3>📋 Meeting Summary</h3>
            <div class="section-content">${reportText}</div>
          </div>

          <div class="report-section decisions-box">
            <h3>✅ Decisions Made</h3>
            <div class="section-content">${decisionsMade}</div>
          </div>

          <div class="report-section actions-box">
            <h3>📌 Action Items & Follow-ups</h3>
            <div class="section-content">${actionItems}</div>
          </div>

          <div class="report-section">
            <h3>📅 Next Meeting Date</h3>
            <p>${nextMeetingDate !== 'Not scheduled' ? new Date(nextMeetingDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : 'Not scheduled'}</p>
          </div>

          ${meeting.notes ? `
          <div class="report-section">
            <h3>📋 Original Meeting Notes</h3>
            <div class="section-content">${meeting.notes}</div>
          </div>
          ` : ''}

          <div class="page-break"></div>

          <h2>👥 Detailed Attendance (${attendanceRecords.length} members)</h2>
          ${attendanceRecords.length > 0 ? `
          <table class="attendance-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Residence</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Notes/Reason</th>
              </tr>
            </thead>
            <tbody>
              ${attendanceRecords.map((record, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${record.members?.name || ''} ${record.members?.surname || ''}</td>
                  <td>${record.members?.residence || '-'}</td>
                  <td>${record.members?.phone || '-'}</td>
                  <td class="${record.status === 'present' ? 'status-present' : record.status === 'absent' ? 'status-absent' : 'status-with-reason'}">
                    ${record.status === 'present' ? '✓ Present' : record.status === 'absent' ? '✗ Absent' : '⚠ Absent with Reason'}
                  </td>
                  <td>${record.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : '<p>No attendance records available.</p>'}

          <div class="footer">
            <p>Report Generated: ${new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} at ${new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p>Church Management System • ${department.name} Department</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
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
    // Only allow admin and pastor to edit departments
    if (!isAdmin() && !isPastor()) {
      setError('Only administrators and pastors can edit departments');
      return;
    }
    setSelectedDepartment(department);
    setShowEditDepartmentModal(true);
  };

  const openDeleteDepartmentModal = (department: Department) => {
    // Only allow admin and pastor to delete departments
    if (!isAdmin() && !isPastor()) {
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
    setDepartmentReport(null);
  };

  const handleDepartmentCreated = () => {
    loadDepartments();
    setSuccess('Department created successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDepartmentUpdated = () => {
    loadDepartments();
    setSuccess('Department updated successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDepartmentDeleted = () => {
    loadDepartments();
    setSuccess('Department deleted successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Permission functions
  const canCreateDepartments = () => {
    return isAdmin() || isPastor();
  };

  const canEditDepartment = (_department: Department) => {
    // Only admin and pastor can edit departments
    return isAdmin() || isPastor();
  };

  const canDeleteDepartment = (_department: Department) => {
    // Only admin and pastor can delete departments
    return isAdmin() || isPastor();
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
        </div>

        {/* Search and Create Department Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {canCreateDepartments() && (
            <button
              onClick={() => setShowCreateDepartmentModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              <Plus className="h-5 w-5" />
              Create New Department
            </button>
          )}
        </div>

        {/* Error/Success Messages */}
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
          <div className="text-center py-12 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Please Log In</h3>
            <p className="text-gray-500 mb-6">You need to be logged in to view departments</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading && departments.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading departments...</p>
              </div>
            ) : departments.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  {searchTerm ? 'No departments match your search' : 'No Accessible Departments'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm ? 'Try a different search term' : 'You do not have access to any departments'}
                </p>
                {canCreateDepartments() && (
                  <button
                    onClick={() => setShowCreateDepartmentModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                  >
                    <Plus className="h-5 w-5" />
                    Create Your First Department
                  </button>
                )}
              </div>
            ) : (
              departments.filter(department => 
                department.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                department.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                department.leader_name?.toLowerCase().includes(searchTerm.toLowerCase())
              ).map((department) => {
                const canManage = canManageDepartment(department.id);
                const canView = canViewDepartment(department.id);
                const canEdit = canEditDepartment(department);
                const canDelete = canDeleteDepartment(department);
                
                return (
                  <div
                    key={department.id}
                    className="bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                          <Users className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{department.name}</h3>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {department.is_current_user_leader && (
                              <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                <Shield className="h-3 w-3 mr-1" />
                                Your Leadership
                              </span>
                            )}
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
                      </div>
                      
                      {(canEdit || canDelete) && (
                        <div className="flex gap-1">
                          {canEdit && (
                            <button
                              onClick={() => openEditDepartmentModal(department)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Department"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => openDeleteDepartmentModal(department)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Department"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 mb-4">
                      {department.leader_name && (
                        <div className="flex items-center gap-3 text-gray-600">
                          <User className="h-4 w-4" />
                          <span className="text-sm">Leader: {department.leader_name}</span>
                        </div>
                      )}
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
                        <p className="text-sm text-gray-600 line-clamp-2">{department.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <span className="text-sm text-gray-600">
                        {department.memberCount || 0} member{(department.memberCount || 0) !== 1 ? 's' : ''}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openMeetingsModal(department)}
                          disabled={!canView}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
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

        {/* Modals */}
        <CreateDepartmentModal
          isOpen={showCreateDepartmentModal}
          onClose={() => setShowCreateDepartmentModal(false)}
          onSuccess={handleDepartmentCreated}
          onError={(message) => {
            setError(message);
            setTimeout(() => setError(null), 3000);
          }}
          userId={profile?.id || null}
        />

        <EditDepartmentModal
          isOpen={showEditDepartmentModal}
          department={selectedDepartment}
          onClose={() => setShowEditDepartmentModal(false)}
          onSuccess={handleDepartmentUpdated}
          onError={(message) => {
            setError(message);
            setTimeout(() => setError(null), 3000);
          }}
          canEdit={selectedDepartment ? canEditDepartment(selectedDepartment) : false}
        />

        <DeleteDepartmentModal
          isOpen={showDeleteDepartmentModal}
          department={selectedDepartment}
          onClose={() => setShowDeleteDepartmentModal(false)}
          onConfirm={handleDepartmentDeleted}
          onError={(message) => {
            setError(message);
            setTimeout(() => setError(null), 3000);
          }}
          canDelete={selectedDepartment ? canDeleteDepartment(selectedDepartment) : false}
        />

        {showMeetingsModal && selectedDepartment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{selectedDepartment.name} - Meetings</h3>
                <button
                  onClick={closeAllModals}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {meetings.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No meetings scheduled</p>
                  </div>
                ) : (
                  meetings.map((meeting) => (
                    <div key={meeting.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-gray-900">
                            {new Date(meeting.meeting_date).toLocaleDateString()}
                            {meeting.meeting_time && ` at ${meeting.meeting_time}`}
                          </div>
                          {meeting.topic && (
                            <div className="text-sm text-gray-600 mt-1">Topic: {meeting.topic}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            meeting.status === 'completed' ? 'bg-green-100 text-green-800' :
                            meeting.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
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

        {showReportModal && selectedMeetingForReport && selectedDepartment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white">
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:rounded-none print:shadow-none">
              <div className="flex justify-between items-center mb-6 print:mb-8">
                <h3 className="text-2xl font-bold text-gray-900 print:text-black">
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
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mb-8 pb-6 border-b-2 border-gray-300 print:border-black">
                <div className="text-center mb-4">
                  <h1 className="text-3xl font-bold text-gray-900 print:text-black mb-2">
                    {selectedDepartment.name}
                  </h1>
                  <p className="text-lg text-gray-600 print:text-black">Department Meeting Attendance Report</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-500 print:text-gray-700">Date</p>
                    <p className="font-semibold text-gray-900 print:text-black">
                      {new Date(selectedMeetingForReport.meeting_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 print:text-gray-700">Time</p>
                    <p className="font-semibold text-gray-900 print:text-black">
                      {selectedMeetingForReport.meeting_time || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 print:text-gray-700">Location</p>
                    <p className="font-semibold text-gray-900 print:text-black">
                      {selectedMeetingForReport.location || selectedDepartment.location || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 print:text-gray-700">Topic</p>
                    <p className="font-semibold text-gray-900 print:text-black">
                      {selectedMeetingForReport.topic || 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h4 className="text-xl font-bold text-gray-900 print:text-black mb-4">Attendance Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 print:bg-blue-50 border border-blue-200 print:border-blue-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 print:text-blue-700 font-medium">Total Members</p>
                        <p className="text-3xl font-bold text-blue-700 print:text-blue-900">
                          {getAttendanceStats().total}
                        </p>
                      </div>
                      <Users className="h-10 w-10 text-blue-400 print:text-blue-600" />
                    </div>
                  </div>
                  <div className="bg-green-50 print:bg-green-50 border border-green-200 print:border-green-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 print:text-green-700 font-medium">Attended</p>
                        <p className="text-3xl font-bold text-green-700 print:text-green-900">
                          {getAttendanceStats().attended}
                        </p>
                      </div>
                      <CheckCircle className="h-10 w-10 text-green-400 print:text-green-600" />
                    </div>
                    <p className="text-xs text-green-600 print:text-green-700 mt-2">
                      {getAttendanceStats().total > 0 ? `${Math.round((getAttendanceStats().attended / getAttendanceStats().total) * 100)}%` : '0%'}
                    </p>
                  </div>
                  <div className="bg-red-50 print:bg-red-50 border border-red-200 print:border-red-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-red-600 print:text-red-700 font-medium">Absent</p>
                        <p className="text-3xl font-bold text-red-700 print:text-red-900">
                          {getAttendanceStats().absent}
                        </p>
                      </div>
                      <X className="h-10 w-10 text-red-400 print:text-red-600" />
                    </div>
                    <p className="text-xs text-red-600 print:text-red-700 mt-2">
                      {getAttendanceStats().total > 0 ? `${Math.round((getAttendanceStats().absent / getAttendanceStats().total) * 100)}%` : '0%'}
                    </p>
                  </div>
                  <div className="bg-yellow-50 print:bg-yellow-50 border border-yellow-200 print:border-yellow-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-yellow-600 print:text-yellow-700 font-medium">Absent w/ Reason</p>
                        <p className="text-3xl font-bold text-yellow-700 print:text-yellow-900">
                          {getAttendanceStats().absentWithReason}
                        </p>
                      </div>
                      <AlertCircle className="h-10 w-10 text-yellow-400 print:text-yellow-600" />
                    </div>
                    <p className="text-xs text-yellow-600 print:text-yellow-700 mt-2">
                      {getAttendanceStats().total > 0 ? `${Math.round((getAttendanceStats().absentWithReason / getAttendanceStats().total) * 100)}%` : '0%'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Existing Report Preview */}
              {departmentReport && (
                <div className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 print:from-purple-50 print:to-blue-50 border-2 border-purple-200 print:border-purple-300 rounded-xl p-6">
                  <h4 className="text-xl font-bold text-purple-900 print:text-purple-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Existing Report Preview
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="bg-white print:bg-white rounded-lg p-4 border border-purple-100 print:border-purple-200">
                      <h5 className="font-semibold text-gray-800 print:text-gray-900 mb-2">Meeting Status</h5>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedMeetingForReport?.status === 'completed' 
                          ? 'bg-green-100 text-green-800 print:bg-green-100 print:text-green-800' 
                          : 'bg-blue-100 text-blue-800 print:bg-blue-100 print:text-blue-800'
                      }`}>
                        {selectedMeetingForReport?.status || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="bg-white print:bg-white rounded-lg p-4 border border-purple-100 print:border-purple-200">
                      <h5 className="font-semibold text-gray-800 print:text-gray-900 mb-2">Report Summary</h5>
                      <p className="text-gray-700 print:text-gray-800 whitespace-pre-wrap overflow-hidden break-words" style={{ overflowWrap: 'break-word' }}>
                        {departmentReport.report_text || 'No summary available'}
                      </p>
                    </div>
                    
                    {departmentReport.decisions_made && (
                      <div className="bg-white print:bg-white rounded-lg p-4 border border-green-100 print:border-green-200">
                        <h5 className="font-semibold text-green-800 print:text-green-900 mb-2">✅ Decisions Made</h5>
                        <p className="text-gray-700 print:text-gray-800 whitespace-pre-wrap overflow-hidden break-words" style={{ overflowWrap: 'break-word' }}>
                          {departmentReport.decisions_made}
                        </p>
                      </div>
                    )}
                    
                    {departmentReport.action_items && (
                      <div className="bg-white print:bg-white rounded-lg p-4 border border-yellow-100 print:border-yellow-200">
                        <h5 className="font-semibold text-yellow-800 print:text-yellow-900 mb-2">📌 Action Items</h5>
                        <p className="text-gray-700 print:text-gray-800 whitespace-pre-wrap overflow-hidden break-words" style={{ overflowWrap: 'break-word' }}>
                          {departmentReport.action_items}
                        </p>
                      </div>
                    )}
                    
                    {departmentReport.next_meeting_date && (
                      <div className="bg-white print:bg-white rounded-lg p-4 border border-blue-100 print:border-blue-200">
                        <h5 className="font-semibold text-blue-800 print:text-blue-900 mb-2">📅 Next Meeting</h5>
                        <p className="text-gray-700 print:text-gray-800">
                          {new Date(departmentReport.next_meeting_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h4 className="text-xl font-bold text-gray-900 print:text-black mb-4">Detailed Attendance</h4>
                {attendanceRecords.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 print:bg-gray-50 rounded-lg">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 print:text-gray-700">No attendance records found</p>
                  </div>
                ) : (
                  <>
                    {getAttendanceStats().attended > 0 && (
                      <div className="mb-6">
                        <h5 className="text-lg font-semibold text-green-700 print:text-green-800 mb-3 flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          Present ({getAttendanceStats().attended})
                        </h5>
                        <div className="bg-green-50 print:bg-green-50 border border-green-200 print:border-green-300 rounded-lg p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {attendanceRecords
                              .filter(record => record.status === 'present')
                              .map((record) => (
                                <div key={record.id} className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                  <span className="text-gray-900 print:text-black">
                                    {record.members?.name} {record.members?.surname}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {getAttendanceStats().absent > 0 && (
                      <div className="mb-6">
                        <h5 className="text-lg font-semibold text-red-700 print:text-red-800 mb-3 flex items-center gap-2">
                          <X className="h-5 w-5" />
                          Absent ({getAttendanceStats().absent})
                        </h5>
                        <div className="bg-red-50 print:bg-red-50 border border-red-200 print:border-red-300 rounded-lg p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {attendanceRecords
                              .filter(record => record.status === 'absent')
                              .map((record) => (
                                <div key={record.id} className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                                  <span className="text-gray-900 print:text-black">
                                    {record.members?.name} {record.members?.surname}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {getAttendanceStats().absentWithReason > 0 && (
                      <div className="mb-6">
                        <h5 className="text-lg font-semibold text-yellow-700 print:text-yellow-800 mb-3 flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" />
                          Absent with Notes ({getAttendanceStats().absentWithReason})
                        </h5>
                        <div className="bg-yellow-50 print:bg-yellow-50 border border-yellow-200 print:border-yellow-300 rounded-lg p-4">
                          <div className="space-y-3">
                            {attendanceRecords
                              .filter(record => record.status === 'absent_with_reason')
                              .map((record) => (
                                <div key={record.id} className="flex items-start gap-2">
                                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-1.5"></div>
                                  <div className="flex-1">
                                    <span className="text-gray-900 print:text-black font-medium">
                                      {record.members?.name} {record.members?.surname}
                                    </span>
                                    {record.notes && (
                                      <p className="text-sm text-gray-600 print:text-gray-700 mt-1">
                                        Notes: {record.notes}
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

              {selectedMeetingForReport.notes && (
                <div className="mb-6">
                  <h4 className="text-xl font-bold text-gray-900 print:text-black mb-3">Meeting Notes</h4>
                  <div className="bg-gray-50 print:bg-gray-50 border border-gray-200 print:border-gray-300 rounded-lg p-4">
                    <p className="text-gray-700 print:text-black whitespace-pre-wrap">
                      {selectedMeetingForReport.notes}
                    </p>
                  </div>
                </div>
              )}

              <div className="hidden print:block mt-8 pt-4 border-t border-gray-300">
                <p className="text-sm text-gray-600 text-center">
                  Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        )}

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
                onMeetingsRefresh={async () => {
                  await loadMeetings(selectedDepartment.id);
                }}
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
