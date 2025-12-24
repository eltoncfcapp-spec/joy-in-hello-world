import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Users, MapPin, Calendar, User, Search, X, Shield, AlertCircle, CheckCircle, Printer, Clock, FileText, Save, UserPlus, Home, Phone, Download, FileDown, Plus, Settings, Trash2, Edit } from 'lucide-react';

// Interfaces
interface CellGroup {
  id: string;
  name: string;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  leader_id: string | null;
  description?: string | null;
  memberCount?: number;
  created_at?: string;
  updated_at?: string;
  leader_name?: string | null;
  leader_residence?: string | null;
  leader_phone?: string | null;
  is_current_user_leader?: boolean;
}

interface GroupMeeting {
  id: string;
  group_id: string | null;
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
  cell_group_id?: string | null;
  status?: string | null;
  admin_role?: string | null;
  invited_by?: string | null;
}

interface GroupAttendanceRecord {
  id: string;
  meeting_id: string | null;
  member_id: string | null;
  status: 'present' | 'absent' | 'absent_with_reason' | string | null;
  notes?: string | null;
  members?: Member | null;
}

interface GroupReport {
  id: string;
  meeting_id: string | null;
  report_text: string | null;
  decisions_made: string | null;
  action_items: string | null;
  next_meeting_date: string | null;
  created_at: string | null;
}

// New Group Creation Component
interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  userId: string | null;
  canCreate: boolean;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onSuccess, onError, userId, canCreate }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    meeting_day: '',
    meeting_time: '',
    description: '',
    leader_id: '',
  });
  const [availableLeaders, setAvailableLeaders] = useState<Member[]>([]);
  const [searchLeaderTerm, setSearchLeaderTerm] = useState('');

  useEffect(() => {
    if (isOpen && canCreate) {
      loadAvailableLeaders();
    }
  }, [isOpen]);

  const loadAvailableLeaders = async () => {
    try {
      // Get all members who are leaders or have leadership potential
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .or('admin_role.eq.group_leader,admin_role.eq.deacon,admin_role.eq.pastor,admin_role.eq.administrator,admin_role.eq.admin')
        .order('name');

      if (error) throw error;
      setAvailableLeaders(data || []);
    } catch (error: any) {
      console.error('Failed to load leaders:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreate) {
      onError('You do not have permission to create groups');
      return;
    }

    if (!formData.name.trim()) {
      onError('Group name is required');
      return;
    }

    if (!userId) {
      onError('You must be logged in to create a group');
      return;
    }

    try {
      setLoading(true);
      
      // Check if group with same name already exists
      const { data: existingGroup } = await supabase
        .from('cell_groups')
        .select('id')
        .ilike('name', formData.name.trim())
        .single();

      if (existingGroup) {
        onError('A group with this name already exists');
        return;
      }

      const newGroup = {
        name: formData.name.trim(),
        location: formData.location.trim() || null,
        meeting_day: formData.meeting_day || null,
        meeting_time: formData.meeting_time || null,
        description: formData.description.trim() || null,
        leader_id: formData.leader_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('cell_groups')
        .insert([newGroup])
        .select()
        .single();

      if (error) throw error;

      // If a leader was selected, update their group assignment
      if (formData.leader_id) {
        await supabase
          .from('members')
          .update({ 
            cell_group_id: data.id,
            admin_role: 'group_leader',
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
      
      onSuccess('Group created successfully!');
      onClose();
    } catch (error: any) {
      console.error('Error creating group:', error);
      onError('Failed to create group: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const filteredLeaders = availableLeaders.filter(leader =>
    leader.name.toLowerCase().includes(searchLeaderTerm.toLowerCase()) ||
    leader.surname.toLowerCase().includes(searchLeaderTerm.toLowerCase()) ||
    leader.residence?.toLowerCase().includes(searchLeaderTerm.toLowerCase())
  );

  if (!isOpen) return null;

  if (!canCreate) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Access Denied</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="text-center py-8">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Permission Required</h4>
            <p className="text-gray-600">
              You do not have permission to create groups. Only administrators, pastors, and deacons can create groups.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Create New Group</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={createGroup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter group name"
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
              placeholder="Enter group description (optional)"
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Leader (Optional)
            </label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search for leaders..."
                  value={searchLeaderTerm}
                  onChange={(e) => setSearchLeaderTerm(e.target.value)}
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
                {filteredLeaders.map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name} {leader.surname} ({leader.admin_role})
                  </option>
                ))}
              </select>
              
              {filteredLeaders.length === 0 && searchLeaderTerm && (
                <p className="text-sm text-gray-500 text-center py-2">
                  No leaders found matching your search
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Creating Group...' : 'Create Group'}
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
            Only administrators, pastors, and deacons can create new groups. 
            The group creator will have full management permissions.
          </p>
        </div>
      </div>
    </div>
  );
};

// Edit Group Modal Component
interface EditGroupModalProps {
  isOpen: boolean;
  group: CellGroup | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  canEdit: boolean;
  currentUserRole?: string | null;
  currentUserId?: string | null;
}

const EditGroupModal: React.FC<EditGroupModalProps> = ({ 
  isOpen, 
  group, 
  onClose, 
  onSuccess, 
  onError, 
  canEdit,
  currentUserRole,
  currentUserId 
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    meeting_day: '',
    meeting_time: '',
    description: '',
    leader_id: '',
  });
  const [availableLeaders, setAvailableLeaders] = useState<Member[]>([]);

  useEffect(() => {
    if (isOpen && group) {
      setFormData({
        name: group.name || '',
        location: group.location || '',
        meeting_day: group.meeting_day || '',
        meeting_time: group.meeting_time || '',
        description: group.description || '',
        leader_id: group.leader_id || '',
      });
      loadAvailableLeaders();
    }
  }, [isOpen, group]);

  const loadAvailableLeaders = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .or('admin_role.eq.group_leader,admin_role.eq.deacon,admin_role.eq.pastor,admin_role.eq.administrator,admin_role.eq.admin')
        .order('name');

      if (error) throw error;
      setAvailableLeaders(data || []);
    } catch (error: any) {
      console.error('Failed to load leaders:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Helper function to check if user can edit specific fields
  const canEditTimeAndName = (): boolean => {
    if (!currentUserRole || !group) return false;
    
    // Only leaders, admins, and pastors can edit meeting time and name
    const allowedRoles = ['administrator', 'admin', 'pastor', 'deacon'];
    
    // Check if user is the group leader
    const isGroupLeader = group.leader_id === currentUserId;
    
    // Check if user has admin/pastor/deacon role OR is the group leader
    if (allowedRoles.includes(currentUserRole) || isGroupLeader) {
      return true;
    }
    
    return false;
  };

  const updateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!group?.id) {
      onError('Group not found');
      return;
    }

    if (!formData.name.trim()) {
      onError('Group name is required');
      return;
    }

    if (!canEdit) {
      onError('You do not have permission to edit this group');
      return;
    }

    // Check if user is trying to edit restricted fields without permission
    const changedRestrictedFields = (
      formData.meeting_day !== group.meeting_day ||
      formData.meeting_time !== group.meeting_time ||
      formData.name !== group.name
    );

    if (changedRestrictedFields && !canEditTimeAndName()) {
      onError('You do not have permission to edit meeting time, day, or group name. Only leaders, admins, and pastors can modify these fields.');
      return;
    }

    try {
      setLoading(true);
      
      // Check if group with same name already exists (excluding current group)
      if (formData.name !== group.name) {
        const { data: existingGroup } = await supabase
          .from('cell_groups')
          .select('id')
          .ilike('name', formData.name.trim())
          .neq('id', group.id)
          .single();

        if (existingGroup) {
          onError('Another group with this name already exists');
          return;
        }
      }

      const updatedGroup = {
        name: formData.name.trim(),
        location: formData.location.trim() || null,
        meeting_day: formData.meeting_day || null,
        meeting_time: formData.meeting_time || null,
        description: formData.description.trim() || null,
        leader_id: formData.leader_id || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('cell_groups')
        .update(updatedGroup)
        .eq('id', group.id);

      if (error) throw error;

      // Handle leader assignment changes
      const previousLeaderId = group.leader_id;
      if (previousLeaderId !== formData.leader_id) {
        // Remove previous leader's group assignment
        if (previousLeaderId) {
          await supabase
            .from('members')
            .update({ 
              cell_group_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', previousLeaderId);
        }

        // Assign new leader
        if (formData.leader_id) {
          await supabase
            .from('members')
            .update({ 
              cell_group_id: group.id,
              admin_role: 'group_leader',
              updated_at: new Date().toISOString()
            })
            .eq('id', formData.leader_id);
        }
      }

      onSuccess('Group updated successfully!');
      onClose();
    } catch (error: any) {
      console.error('Error updating group:', error);
      onError('Failed to update group: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !group) return null;

  const userCanEditTimeAndName = canEditTimeAndName();
  const isReadOnly = !userCanEditTimeAndName;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Edit Group</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!userCanEditTimeAndName && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> You can only edit basic information. Meeting time, day, and group name can only be modified by the group leader, admin, or pastor.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={updateGroup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name {userCanEditTimeAndName ? '*' : '(Restricted)'}
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter group name"
              required
              minLength={2}
              maxLength={100}
              disabled={isReadOnly}
            />
            {isReadOnly && (
              <p className="text-xs text-gray-500 mt-1">
                Only group leader, admin, or pastor can edit the name
              </p>
            )}
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
                Meeting Day {userCanEditTimeAndName ? '' : '(Restricted)'}
              </label>
              <select
                name="meeting_day"
                value={formData.meeting_day}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={isReadOnly}
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
              {isReadOnly && (
                <p className="text-xs text-gray-500 mt-1">
                  Only group leader, admin, or pastor can edit the meeting day
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Time {userCanEditTimeAndName ? '' : '(Restricted)'}
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="time"
                  name="meeting_time"
                  value={formData.meeting_time}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isReadOnly}
                />
              </div>
              {isReadOnly && (
                <p className="text-xs text-gray-500 mt-1">
                  Only group leader, admin, or pastor can edit the meeting time
                </p>
              )}
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
              placeholder="Enter group description (optional)"
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Leader
            </label>
            <select
              name="leader_id"
              value={formData.leader_id}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!canEdit}
            >
              <option value="">No leader assigned</option>
              {availableLeaders.map((leader) => (
                <option key={leader.id} value={leader.id}>
                  {leader.name} {leader.surname} ({leader.admin_role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || !canEdit}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Updating Group...' : 'Update Group'}
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

// Delete Group Confirmation Modal
interface DeleteGroupModalProps {
  isOpen: boolean;
  group: CellGroup | null;
  onClose: () => void;
  onConfirm: () => void;
  onError: (message: string) => void;
  canDelete: boolean;
}

const DeleteGroupModal: React.FC<DeleteGroupModalProps> = ({ isOpen, group, onClose, onConfirm, onError, canDelete }) => {
  const [loading, setLoading] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    if (isOpen && group) {
      checkMemberCount();
    }
  }, [isOpen, group]);

  const checkMemberCount = async () => {
    try {
      const { count } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('cell_group_id', group?.id);

      setMemberCount(count || 0);
    } catch (error) {
      console.error('Failed to check member count:', error);
    }
  };

  const handleDelete = async () => {
    if (!group?.id) {
      onError('Group not found');
      return;
    }

    if (!canDelete) {
      onError('You do not have permission to delete this group');
      return;
    }

    if (memberCount > 0) {
      onError(`Cannot delete group with ${memberCount} member(s). Please reassign or remove members first.`);
      return;
    }

    try {
      setLoading(true);
      
      // Remove leader assignment if exists
      if (group.leader_id) {
        await supabase
          .from('members')
          .update({ 
            cell_group_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', group.leader_id);
      }

      // Delete the group
      const { error } = await supabase
        .from('cell_groups')
        .delete()
        .eq('id', group.id);

      if (error) throw error;

      onConfirm();
    } catch (error: any) {
      console.error('Error deleting group:', error);
      onError('Failed to delete group: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
      onClose();
    }
  };

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Delete Group</h3>
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
                  You are about to delete the group "{group.name}". This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Group Name</span>
              <span className="font-medium text-gray-900">{group.name}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Location</span>
              <span className="font-medium text-gray-900">{group.location || 'Not specified'}</span>
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
                  This group has {memberCount} member(s). You must remove all members before deleting the group.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            disabled={loading || memberCount > 0 || !canDelete}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
          >
            <Trash2 className="h-4 w-4" />
            {loading ? 'Deleting...' : 'Delete Group'}
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

// Group Meeting Creation Step
const GroupMeetingCreationStep = ({ group, onMeetingCreated, onError }: { group: CellGroup; onMeetingCreated: () => void; onError: (message: string) => void; }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    meeting_date: '',
    meeting_time: '',
    location: group.location || '',
    topic: '',
    notes: ''
  });
  const [recentMeetings, setRecentMeetings] = useState<GroupMeeting[]>([]);

  useEffect(() => {
    loadRecentMeetings();
  }, [group.id]);

  const loadRecentMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('group_id', group.id)
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

    try {
      setLoading(true);
      const newMeeting = {
        group_id: group.id,
        meeting_date: formData.meeting_date,
        meeting_time: formData.meeting_time,
        location: formData.location,
        topic: formData.topic || null,
        notes: formData.notes || null,
        status: 'scheduled'
      };

      const { error } = await supabase
        .from('meetings')
        .insert([newMeeting])
        .select()
        .single();

      if (error) throw error;

      setFormData({
        meeting_date: '',
        meeting_time: '',
        location: group.location || '',
        topic: '',
        notes: ''
      });
      await loadRecentMeetings();
      onMeetingCreated();
    } catch (error: any) {
      onError('Failed to create group meeting: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Schedule Group Meeting</h3>
        <p className="text-gray-600">Create a new meeting schedule for {group.name}</p>
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
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Creating Meeting...' : 'Schedule Group Meeting'}
          </button>
        </form>
      </div>

      {recentMeetings.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Group Meetings</h4>
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

// Group Attendance Step Component
interface GroupAttendanceStepProps {
  group: CellGroup;
  meetings: GroupMeeting[];
  selectedMeeting: GroupMeeting | null;
  onMeetingSelect: (meeting: GroupMeeting) => void;
  onAttendanceSaved: () => void;
  onError: (message: string) => void;
}

const GroupAttendanceStep: React.FC<GroupAttendanceStepProps> = ({ group, meetings, selectedMeeting, onMeetingSelect, onAttendanceSaved, onError }) => {
  const [loading, setLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState<Member[]>([]);
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

  useEffect(() => {
    loadGroupMembers();
    loadAllChurchMembers();
  }, [group.id]);

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
    const totalCount = groupMembers.length;

    setAttendanceStats({
      present: presentCount,
      absent: absentCount,
      absentWithReason: absentWithReasonCount,
      total: totalCount
    });
  }, [attendance, groupMembers]);

  const loadGroupMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('cell_group_id', group.id)
        .order('name');

      if (error) throw error;
      
      setGroupMembers(data || []);
      // Initialize all members as present by default
      const initialAttendance: Record<string, 'present'> = {};
      data?.forEach(member => {
        initialAttendance[member.id] = 'present';
      });
      setAttendance(initialAttendance);
    } catch (error: any) {
      onError('Failed to load group members: ' + error.message);
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
        .from('meeting_attendance')
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

  const addMemberToGroup = async (member: Member) => {
    try {
      setLoading(true);
      const isAlreadyMember = groupMembers.some(gm => gm.id === member.id);
      if (isAlreadyMember) {
        onError('Member is already in this group');
        return;
      }

      const { error } = await supabase
        .from('members')
        .update({ cell_group_id: group.id })
        .eq('id', member.id);

      if (error) throw error;
      
      await loadGroupMembers();
      setShowAddAttendeeModal(false);
      setSearchMemberTerm('');
      setAttendance(prev => ({ ...prev, [member.id]: 'present' }));
      onError('Member added to group successfully!');
    } catch (error: any) {
      onError('Failed to add member to group: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveAttendance = async () => {
    if (!selectedMeeting) {
      onError('Please select a group meeting first');
      return;
    }

    try {
      setLoading(true);
      const attendanceRecords = groupMembers.map(member => ({
        meeting_id: selectedMeeting.id,
        member_id: member.id,
        status: attendance[member.id] || 'absent',
        notes: attendance[member.id] === 'absent_with_reason' ? notes[member.id] || null : null
      }));

      const { error: deleteError } = await supabase
        .from('meeting_attendance')
        .delete()
        .eq('meeting_id', selectedMeeting.id);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('meeting_attendance')
        .insert(attendanceRecords);

      if (insertError) throw insertError;
      
      // Reload attendance data after saving
      await loadExistingAttendance();
      onAttendanceSaved();
      onError('Attendance saved successfully!');
    } catch (error: any) {
      onError('Failed to save group attendance: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredChurchMembers = allChurchMembers.filter(member => 
    !groupMembers.some(gm => gm.id === member.id) && (
      member.name.toLowerCase().includes(searchMemberTerm.toLowerCase()) ||
      member.surname.toLowerCase().includes(searchMemberTerm.toLowerCase()) ||
      member.residence?.toLowerCase().includes(searchMemberTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Record Group Attendance</h3>
        <p className="text-gray-600">Mark group members as present, absent, or absent with notes</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Select Group Meeting *</label>
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
            No group meetings scheduled. Please create a group meeting first.
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
              Group Attendance for {new Date(selectedMeeting.meeting_date).toLocaleDateString()}
            </h4>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{groupMembers.length} group members</span>
              <button
                onClick={() => setShowAddAttendeeModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <UserPlus className="h-4 w-4" />
                Add Attendee
              </button>
            </div>
          </div>

          {groupMembers.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No members found in this group.</p>
              <button
                onClick={() => setShowAddAttendeeModal(true)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Members
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {groupMembers.map((member) => (
                  <div key={member.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-gray-900">
                            {member.name} {member.surname}
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            member.status === 'leader' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {member.status || 'member'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {member.residence} • {member.phone}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAttendanceChange(member.id, 'present')}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            attendance[member.id] === 'present'
                              ? 'bg-green-600 text-white shadow-lg'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Present
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(member.id, 'absent')}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            attendance[member.id] === 'absent'
                              ? 'bg-red-600 text-white shadow-lg'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          <X className="h-4 w-4" />
                          Absent
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(member.id, 'absent_with_reason')}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            attendance[member.id] === 'absent_with_reason'
                              ? 'bg-orange-600 text-white shadow-lg'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
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
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-center pt-6">
                <button
                  onClick={saveAttendance}
                  disabled={loading}
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? 'Saving Group Attendance...' : 'Save Group Attendance'}
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
              <h3 className="text-xl font-bold text-gray-900">Add Attendee to {group.name}</h3>
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
                        onClick={() => addMemberToGroup(member)}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        Add to Group
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

// Group Newcomer Step Component
interface GroupNewcomerStepProps {
  group: CellGroup;
  selectedMeeting: GroupMeeting | null;
  onNewcomerAdded: () => void;
  onError: (message: string) => void;
}

const GroupNewcomerStep: React.FC<GroupNewcomerStepProps> = ({ group, selectedMeeting, onNewcomerAdded, onError }) => {
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
        // Update member status and group assignment
        await supabase
          .from('members')
          .update({ 
            status: 'newcomer',
            cell_group_id: group.id,
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
          cell_group_id: group.id,
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

      // Record attendance for selected meeting
      if (selectedMeeting) {
        const { error: attendanceError } = await supabase
          .from('meeting_attendance')
          .insert([{
            meeting_id: selectedMeeting.id,
            member_id: memberId,
            status: 'present',
            notes: 'First-time group visitor - ' + (formData.notes || 'No additional notes')
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
        <h3 className="text-xl font-bold text-gray-900 mb-2">Add Group Newcomer</h3>
        <p className="text-gray-600">Register first-time visitors to the {group.name} group</p>
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
                {selectedMeeting.topic || 'Group Meeting'}
              </p>
            </div>
          </div>
        </div>
      )}

      {!showForm && (
        <div className="text-center">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-200 font-medium mx-auto"
          >
            <UserPlus className="h-5 w-5" />
            Add Group Newcomer
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Register first-time visitors who attended the group meeting
          </p>
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
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Adding Newcomer...' : 'Add to Group'}
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
          Newcomers will be added as members of the {group.name} group 
          {selectedMeeting && ' and marked as present for the current meeting'}.
        </p>
      </div>
    </div>
  );
};

// Group Report Step Component
interface GroupReportStepProps {
  group: CellGroup;
  meetings: GroupMeeting[];
  selectedMeeting: GroupMeeting | null;
  onMeetingSelect: (meeting: GroupMeeting) => void;
  onReportCreated: () => void;
  onError: (message: string) => void;
}

const GroupReportStep: React.FC<GroupReportStepProps> = ({ group, meetings, selectedMeeting, onMeetingSelect, onReportCreated, onError }) => {
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState<GroupAttendanceRecord[]>([]);
  const [existingReport, setExistingReport] = useState<GroupReport | null>(null);
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
        .from('meeting_attendance')
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
      
      console.log('Loaded attendance data:', data); // Debug log
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
        .from('meeting_reports')
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
          .from('meeting_reports')
          .update(reportPayload)
          .eq('id', existingReport.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('meeting_reports')
          .insert([reportPayload]);
        error = insertError;
      }

      if (error) throw error;

      await supabase
        .from('meetings')
        .update({ status: 'completed' })
        .eq('id', selectedMeeting.id);

      onReportCreated();
    } catch (error: any) {
      onError('Failed to generate group report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const stats = attendanceStats;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Group Meeting Report - ${group.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #1e3a5f; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
            .header-info { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .header-info p { margin: 8px 0; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
            .stat-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; text-align: center; }
            .stat-box.present { background: #dcfce7; border-color: #86efac; }
            .stat-box.absent { background: #fee2e2; border-color: #fca5a5; }
            .stat-box.with-reason { background: #fef3c7; border-color: #fcd34d; }
            .stat-value { font-size: 28px; font-weight: bold; color: #111827; }
            .stat-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
            .report-section { background: #ffffff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 15px 0; }
            .report-section h3 { margin-top: 0; color: #1f2937; }
            .attendance-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .attendance-table th, .attendance-table td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
            .attendance-table th { background: #f3f4f6; font-weight: 600; }
            .status-present { color: #059669; font-weight: 600; }
            .status-absent { color: #dc2626; font-weight: 600; }
            .status-with-reason { color: #d97706; font-weight: 600; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>📋 Group Meeting Report</h1>
          <div class="header-info">
            <p><strong>Group:</strong> ${group.name}</p>
            <p><strong>Meeting Date:</strong> ${selectedMeeting ? new Date(selectedMeeting.meeting_date).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Meeting Time:</strong> ${selectedMeeting?.meeting_time || 'Not specified'}</p>
            <p><strong>Location:</strong> ${selectedMeeting?.location || group.location || 'Not specified'}</p>
            <p><strong>Topic:</strong> ${selectedMeeting?.topic || 'General Group Meeting'}</p>
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

          ${reportData.report_text ? `
          <div class="report-section">
            <h3>📝 Meeting Report</h3>
            <p>${reportData.report_text.replace(/\n/g, '<br>')}</p>
          </div>
          ` : ''}

          ${reportData.decisions_made ? `
          <div class="report-section">
            <h3>✅ Decisions Made</h3>
            <p>${reportData.decisions_made.replace(/\n/g, '<br>')}</p>
          </div>
          ` : ''}

          ${reportData.action_items ? `
          <div class="report-section">
            <h3>📌 Action Items</h3>
            <p>${reportData.action_items.replace(/\n/g, '<br>')}</p>
          </div>
          ` : ''}

          ${reportData.next_meeting_date ? `
          <div class="report-section">
            <h3>📅 Next Meeting</h3>
            <p>Scheduled for: ${new Date(reportData.next_meeting_date).toLocaleDateString()}</p>
          </div>
          ` : ''}

          <h2>👥 Detailed Attendance (${attendance.length} members)</h2>
          <table class="attendance-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Residence</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${attendance.map(record => `
                <tr>
                  <td>${record.members?.name || ''} ${record.members?.surname || ''}</td>
                  <td>${record.members?.residence || ''}</td>
                  <td class="${record.status === 'present' ? 'status-present' : record.status === 'absent' ? 'status-absent' : 'status-with-reason'}">
                    ${record.status === 'present' ? 'Present' : record.status === 'absent' ? 'Absent' : 'Absent with Reason'}
                  </td>
                  <td>${record.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Report Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>Church Management System</p>
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
GROUP MEETING REPORT

Group: ${group.name}
Meeting Date: ${selectedMeeting ? new Date(selectedMeeting.meeting_date).toLocaleDateString() : 'N/A'}
Meeting Time: ${selectedMeeting?.meeting_time || 'N/A'}
Location: ${selectedMeeting?.location || group.location || 'N/A'}
Topic: ${selectedMeeting?.topic || 'General Group Meeting'}
Status: ${selectedMeeting?.status || 'N/A'}

${selectedMeeting?.status === 'cancelled' ? `CANCELLATION REASON: ${selectedMeeting.cancellation_reason || 'No reason provided'}\n` : ''}

ATTENDANCE SUMMARY
Total Members: ${stats.total}
Present: ${stats.present} (${stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%)
Absent: ${stats.absent} (${stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : 0}%)
Absent with Notes: ${stats.absentWithReason} (${stats.total > 0 ? Math.round((stats.absentWithReason / stats.total) * 100) : 0}%)
Attendance Rate: ${stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%

MEETING REPORT
${reportData.report_text || 'No report text recorded'}

DECISIONS MADE
${reportData.decisions_made || 'No decisions recorded'}

ACTION ITEMS
${reportData.action_items || 'No action items recorded'}

NEXT MEETING
${reportData.next_meeting_date ? `Scheduled for: ${new Date(reportData.next_meeting_date).toLocaleDateString()}` : 'No next meeting date set'}

ADDITIONAL NOTES
${reportData.additional_notes || 'No additional notes'}

DETAILED ATTENDANCE
${attendance.map(record => 
  `${record.members?.name} ${record.members?.surname} (${record.members?.residence || 'No residence'}) - ${(record.status || 'unknown').toUpperCase()}${record.notes ? ` (Notes: ${record.notes})` : ''}`
).join('\n')}

${selectedMeeting?.notes ? `
MEETING NOTES
${selectedMeeting.notes}
` : ''}

Report Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `group-report-${group.name.replace(/\s+/g, '-').toLowerCase()}-${selectedMeeting?.meeting_date || 'unknown'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Create Group Report</h3>
        <p className="text-gray-600">Generate a comprehensive report for the {group.name} group meeting</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Select Group Meeting *</label>
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
            No group meetings available for reporting.
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
                    {selectedMeeting.location || group.location || 'Not specified'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Topic</p>
                  <p className="font-medium text-gray-900">
                    {selectedMeeting.topic || 'General Group Meeting'}
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
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Group Meeting Report</h4>
                  {existingReport && (
                    <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      Report Exists
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
                    disabled={loading || !selectedMeeting || !reportData.report_text.trim()}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    {loading ? 'Generating Report...' : existingReport ? 'Update Group Report' : 'Generate Group Report'}
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

// Main Groups Component
const Groups: React.FC = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<CellGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CellGroup | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
    loadCurrentUserRole();
  }, [user]);

  const loadCurrentUserRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('members')
        .select('admin_role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setCurrentUserRole(data?.admin_role || null);
    } catch (error) {
      console.error('Failed to load user role:', error);
    }
  };

const loadGroups = async () => {
  try {
    setLoading(true);
    
    // First, get the current user's member record to check if they're a leader
    let currentUserMemberData = null;
    if (user) {
      const { data: memberData } = await supabase
        .from('members')
        .select('id, admin_role')
        .eq('id', user.id)
        .single();
      currentUserMemberData = memberData;
    }
    
    // Fetch all groups - without the join that's causing the error
    const { data: groupsData, error: groupsError } = await supabase
      .from('cell_groups')
      .select('*')
      .order('name');

    if (groupsError) {
      console.error('Groups error:', groupsError);
      throw groupsError;
    }

    // Process groups one by one to avoid complex joins
    const groupsWithDetails = await Promise.all(
      (groupsData || []).map(async (group) => {
        try {
          // Get member count for this group
          const { count: memberCount } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('cell_group_id', group.id);

          // Get leader information if leader_id exists
          let leaderName = null;
          let leaderResidence = null;
          let leaderPhone = null;
          
          if (group.leader_id) {
            try {
              const { data: leader } = await supabase
                .from('members')
                .select('name, surname, residence, phone')
                .eq('id', group.leader_id)
                .single();
              
              if (leader) {
                leaderName = `${leader.name} ${leader.surname}`;
                leaderResidence = leader.residence;
                leaderPhone = leader.phone;
              }
            } catch (leaderErr) {
              console.warn(`Could not load leader ${group.leader_id} for group ${group.name}:`, leaderErr);
            }
          }

          // Check if current user is the leader of this group
          const isCurrentUserLeader = currentUserMemberData && 
                                    group.leader_id === currentUserMemberData.id;

          return {
            id: group.id,
            name: group.name,
            location: group.location,
            meeting_day: group.meeting_day,
            meeting_time: group.meeting_time,
            leader_id: group.leader_id,
            description: group.description,
            created_at: group.created_at,
            updated_at: group.updated_at,
            leader_name: leaderName,
            leader_residence: leaderResidence,
            leader_phone: leaderPhone,
            memberCount: memberCount || 0,
            is_current_user_leader: isCurrentUserLeader
          };
        } catch (error) {
          console.error('Error processing group:', error);
          // Return basic group info if processing fails
          return {
            id: group.id,
            name: group.name,
            location: group.location,
            meeting_day: group.meeting_day,
            meeting_time: group.meeting_time,
            leader_id: group.leader_id,
            description: group.description,
            created_at: group.created_at,
            updated_at: group.updated_at,
            leader_name: null,
            leader_residence: null,
            leader_phone: null,
            memberCount: 0,
            is_current_user_leader: false
          };
        }
      })
    );

    setGroups(groupsWithDetails);
  } catch (error: any) {
    console.error('Error loading groups:', error);
    setErrorMessage('Failed to load groups: ' + error.message);
  } finally {
    setLoading(false);
  }
};
      setGroups(groupsWithDetails);
    } catch (error: any) {
      console.error('Error loading groups:', error);
      setErrorMessage('Failed to load groups: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const canCreateGroup = (): boolean => {
    if (!currentUserRole) return false;
    
    const allowedRoles = ['administrator', 'admin', 'pastor', 'deacon'];
    return allowedRoles.includes(currentUserRole);
  };

  const canEditGroup = (group: CellGroup): boolean => {
    if (!user || !currentUserRole) return false;
    
    const allowedRoles = ['administrator', 'admin', 'pastor', 'deacon'];
    
    // Admins, pastors, and deacons can edit any group
    if (allowedRoles.includes(currentUserRole)) {
      return true;
    }
    
    // Group leaders can edit their own group
    if (group.is_current_user_leader) {
      return true;
    }
    
    return false;
  };

  const canDeleteGroup = (group: CellGroup): boolean => {
    if (!user || !currentUserRole) return false;
    
    // Only administrators and pastors can delete groups
    const allowedRoles = ['administrator', 'admin', 'pastor'];
    return allowedRoles.includes(currentUserRole);
  };

  const handleCreateSuccess = (message: string) => {
    setSuccessMessage(message);
    loadGroups();
  };

  const handleEditSuccess = (message: string) => {
    setSuccessMessage(message);
    loadGroups();
  };

  const handleDeleteSuccess = () => {
    setSuccessMessage('Group deleted successfully!');
    loadGroups();
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.leader_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-800">{successMessage}</p>
            </div>
            <button onClick={() => setSuccessMessage('')} className="text-green-600 hover:text-green-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage('')} className="text-red-600 hover:text-red-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Cell Groups</h1>
        <p className="text-gray-600">Manage church cell groups, members, and meetings</p>
      </div>

      {/* Search and Actions Bar */}
      <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search groups by name, location, or leader..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {canCreateGroup() && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Create Group
            </button>
          )}
        </div>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No groups found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search terms' : 'Create your first cell group to get started'}
          </p>
          {canCreateGroup() && !searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create Group
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <div key={group.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{group.name}</h3>
                  <div className="flex items-center gap-1">
                    {canEditGroup(group) && (
                      <button
                        onClick={() => {
                          setSelectedGroup(group);
                          setShowEditModal(true);
                        }}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit group"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {canDeleteGroup(group) && (
                      <button
                        onClick={() => {
                          setSelectedGroup(group);
                          setShowDeleteModal(true);
                        }}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete group"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{group.location || 'No location specified'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">
                      {group.meeting_day ? `${group.meeting_day} at ${group.meeting_time || 'TBA'}` : 'Meeting schedule not set'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">
                      {group.leader_name || 'No leader assigned'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{group.memberCount || 0} members</span>
                  </div>
                </div>
                
                {group.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{group.description}</p>
                )}
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    group.is_current_user_leader ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {group.is_current_user_leader ? 'Your Group' : 'Cell Group'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Updated {group.updated_at ? new Date(group.updated_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
        onError={setErrorMessage}
        userId={user?.id || null}
        canCreate={canCreateGroup()}
      />

      <EditGroupModal
        isOpen={showEditModal}
        group={selectedGroup}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditSuccess}
        onError={setErrorMessage}
        canEdit={selectedGroup ? canEditGroup(selectedGroup) : false}
        currentUserRole={currentUserRole}
        currentUserId={user?.id || null}
      />

      <DeleteGroupModal
        isOpen={showDeleteModal}
        group={selectedGroup}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteSuccess}
        onError={setErrorMessage}
        canDelete={selectedGroup ? canDeleteGroup(selectedGroup) : false}
      />
    </div>
  );
};

export default Groups;
