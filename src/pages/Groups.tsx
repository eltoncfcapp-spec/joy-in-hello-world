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
  email?: string | null;
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

// Create Group Modal
const CreateGroupModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  userId: string | null;
}> = ({ isOpen, onClose, onSuccess, onError, userId }) => {
  const { profile, isAdmin, isPastor } = useAuth();
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
    if (isOpen) {
      loadAvailableLeaders();
    }
  }, [isOpen]);

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

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      onError('Group name is required');
      return;
    }

    if (!userId) {
      onError('You must be logged in to create a group');
      return;
    }

    // Check if user has permission to create groups (only admin and pastor)
    const isUserAdmin = isAdmin ? isAdmin() : false;
    const isUserPastor = isPastor ? isPastor() : false;
    
    if (!isUserAdmin && !isUserPastor) {
      onError('Only administrators and pastors can create new groups');
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
            Only administrators and pastors can create new groups. 
            The group creator will have full management permissions.
          </p>
        </div>
      </div>
    </div>
  );
};

// Edit Group Modal
const EditGroupModal: React.FC<{
  isOpen: boolean;
  group: CellGroup | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  canEdit: boolean;
}> = ({ isOpen, group, onClose, onSuccess, onError, canEdit }) => {
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

    try {
      setLoading(true);
      
      // Check if group with same name already exists (excluding current group)
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

        <form onSubmit={updateGroup} className="space-y-4">
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
              Group Leader
            </label>
            <select
              name="leader_id"
              value={formData.leader_id}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

// Delete Group Modal
const DeleteGroupModal: React.FC<{
  isOpen: boolean;
  group: CellGroup | null;
  onClose: () => void;
  onConfirm: () => void;
  onError: (message: string) => void;
  canDelete: boolean;
}> = ({ isOpen, group, onClose, onConfirm, onError, canDelete }) => {
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

// Group Meeting Creation Step Component
const GroupMeetingCreationStep = ({ group, onMeetingCreated, onError }: { 
  group: CellGroup; 
  onMeetingCreated: () => void; 
  onError: (message: string) => void; 
}) => {
  const { canCreateGroupMeetings } = useAuth();
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

    // Check permission
    if (!canCreateGroupMeetings(group.id)) {
      onError('You do not have permission to create meetings for this group');
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
            disabled={loading || !canCreateGroupMeetings(group.id)}
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
  const { canManageGroupAttendance } = useAuth();
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

    // Check permission
    if (!canManageGroupAttendance(group.id)) {
      onError('You do not have permission to manage attendance for this group');
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
                disabled={!canManageGroupAttendance(group.id)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
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
                disabled={!canManageGroupAttendance(group.id)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
                          disabled={!canManageGroupAttendance(group.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            attendance[member.id] === 'present'
                              ? 'bg-green-600 text-white shadow-lg'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          } ${!canManageGroupAttendance(group.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Present
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(member.id, 'absent')}
                          disabled={!canManageGroupAttendance(group.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            attendance[member.id] === 'absent'
                              ? 'bg-red-600 text-white shadow-lg'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          } ${!canManageGroupAttendance(group.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <X className="h-4 w-4" />
                          Absent
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(member.id, 'absent_with_reason')}
                          disabled={!canManageGroupAttendance(group.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            attendance[member.id] === 'absent_with_reason'
                              ? 'bg-orange-600 text-white shadow-lg'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          } ${!canManageGroupAttendance(group.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                          disabled={!canManageGroupAttendance(group.id)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-center pt-6">
                <button
                  onClick={saveAttendance}
                  disabled={loading || !canManageGroupAttendance(group.id)}
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
                        disabled={loading || !canManageGroupAttendance(group.id)}
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
  const { canAddGroupNewcomers } = useAuth();
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
    if (!canAddGroupNewcomers(group.id)) {
      onError('You do not have permission to add newcomers to this group');
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
            disabled={!canAddGroupNewcomers(group.id)}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-200 font-medium mx-auto disabled:opacity-50"
          >
            <UserPlus className="h-5 w-5" />
            Add Group Newcomer
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Register first-time visitors who attended the group meeting
          </p>
          {!canAddGroupNewcomers(group.id) && (
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
                disabled={loading || !canAddGroupNewcomers(group.id)}
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
  const { canCreateGroupReports } = useAuth();
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
      
      console.log('Loaded attendance data:', data);
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

    // Check permission
    if (!canCreateGroupReports(group.id)) {
      onError('You do not have permission to create reports for this group');
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
                    disabled={!canCreateGroupReports(group.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    onClick={handlePrint}
                    disabled={!canCreateGroupReports(group.id)}
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
                    disabled={loading || !selectedMeeting || !reportData.report_text.trim() || !canCreateGroupReports(group.id)}
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

// Group Management Workflow Component
interface GroupWorkflowProps {
  group: CellGroup;
  meetings: GroupMeeting[];
  members: Member[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const GroupManagementWorkflow: React.FC<GroupWorkflowProps> = ({ group, meetings, members: _members, onClose, onSuccess, onError }) => {
  const { profile, canCreateGroupMeetings, canManageGroupAttendance, canAddGroupNewcomers, canCreateGroupReports } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMeeting, setSelectedMeeting] = useState<GroupMeeting | null>(null);

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
        return canCreateGroupMeetings(group.id);
      case 2:
        return canManageGroupAttendance(group.id);
      case 3:
        return canAddGroupNewcomers(group.id);
      case 4:
        return canCreateGroupReports(group.id);
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
          <GroupMeetingCreationStep
            group={group}
            onMeetingCreated={() => {
              onSuccess('Group meeting created successfully!');
              setCurrentStep(2);
            }}
            onError={onError}
          />
        )}

        {currentStep === 2 && (
          <GroupAttendanceStep
            group={group}
            meetings={meetings}
            selectedMeeting={selectedMeeting}
            onMeetingSelect={setSelectedMeeting}
            onAttendanceSaved={() => {
              onSuccess('Group attendance saved successfully!');
              setCurrentStep(3);
            }}
            onError={onError}
          />
        )}

        {currentStep === 3 && (
          <GroupNewcomerStep
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
          <GroupReportStep
            group={group}
            meetings={meetings}
            selectedMeeting={selectedMeeting}
            onMeetingSelect={setSelectedMeeting}
            onReportCreated={() => {
              onSuccess('Group report generated successfully!');
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

// Main Groups Component
const Groups = () => {
  const { 
    profile, 
    canViewGroup, 
    canManageGroup, 
    getRoles, 
    isAdmin, 
    isPastor,
    isDeacon,
    isGroupLeader,
    isDepartmentLeader
  } = useAuth();
  
  const [groups, setGroups] = useState<CellGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<CellGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [showMeetingsModal, setShowMeetingsModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const [meetings, setMeetings] = useState<GroupMeeting[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMeetingForReport, setSelectedMeetingForReport] = useState<GroupMeeting | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<GroupAttendanceRecord[]>([]);

  // Get user's current group ID from profile
  const userGroupId = profile?.cell_group_id || null;

  // Safely get user roles and check permissions
  const userRoles = getRoles ? getRoles() : [];
  const isUserAdmin = isAdmin ? isAdmin() : false;
  const isUserPastor = isPastor ? isPastor() : false;
  const isUserDeacon = isDeacon ? isDeacon() : false;
  const isUserGroupLeader = isGroupLeader ? isGroupLeader() : false;
  const isUserDepartmentLeader = isDepartmentLeader ? isDepartmentLeader() : false;
  
  // Determine if user is a regular member (not admin, pastor, deacon, or group leader)
  const isUserMember = !isUserAdmin && !isUserPastor && !isUserDeacon && !isUserGroupLeader && !isUserDepartmentLeader && profile?.admin_role === 'member';

  // Store current user's member ID
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      getCurrentMemberId();
    }
  }, [profile]);

  const getCurrentMemberId = async () => {
    if (!profile) return;
    
    try {
      console.log('Debug Info - Getting current member ID:', {
        profileId: profile?.id,
        profileEmail: profile?.email,
        profileAdminRole: profile?.admin_role,
        profileCellGroupId: profile?.cell_group_id
      });

      // First try to find member by email (most reliable)
      if (profile.email) {
        const { data: memberByEmail, error: emailError } = await supabase
          .from('members')
          .select('id')
          .eq('email', profile.email)
          .single();

        if (!emailError && memberByEmail) {
          console.log('Found member by email:', memberByEmail);
          setCurrentMemberId(memberByEmail.id);
          return;
        }
      }

      // If email not found or doesn't match, try to find by auth ID
      const { data: memberById, error: idError } = await supabase
        .from('members')
        .select('id')
        .eq('id', profile.id)
        .single();

      if (!idError && memberById) {
        console.log('Found member by ID:', memberById);
        setCurrentMemberId(memberById.id);
      } else {
        console.error('Could not find member record for user:', profile.id);
        setCurrentMemberId(profile.id); // Fallback to auth ID
      }
    } catch (error) {
      console.error('Error getting current member ID:', error);
      setCurrentMemberId(profile.id); // Fallback to auth ID
    }
  };

  useEffect(() => {
    if (profile && currentMemberId) {
      loadGroups();
      loadAllMembers();
    }
  }, [profile, currentMemberId]);

  const loadGroups = async () => {
    try {
      if (!profile || !currentMemberId) return;
      
      setLoading(true);
      
      console.log('Debug Info - Loading groups with:', {
        currentMemberId,
        userGroupId,
        isUserAdmin,
        isUserPastor,
        isUserDeacon,
        isUserGroupLeader,
        isUserMember,
        adminRole: profile?.admin_role,
      });

      // First, load all groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('cell_groups')
        .select('*')
        .order('name');

      if (groupsError) throw groupsError;

      // Get leader information for each group
      const groupsWithDetails = await Promise.all(
        (groupsData || []).map(async (group) => {
          // Get member count
          const { count } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('cell_group_id', group.id);
          
          // Get leader information if leader_id exists
          let leaderInfo = null;
          if (group.leader_id) {
            const { data: leaderData } = await supabase
              .from('members')
              .select('name, surname, residence, phone')
              .eq('id', group.leader_id)
              .single();
            
            leaderInfo = leaderData;
          }
          
          // Check if current user is the leader of this group
          const isCurrentUserLeader = group.leader_id === currentMemberId;
          
          return {
            ...group,
            leader_name: leaderInfo ? `${leaderInfo.name} ${leaderInfo.surname}` : null,
            leader_residence: leaderInfo?.residence || null,
            leader_phone: leaderInfo?.phone || null,
            memberCount: count || 0,
            is_current_user_leader: isCurrentUserLeader
          };
        })
      );

      // Filter groups based on user role - FIXED LOGIC
      let filteredGroups = groupsWithDetails;
      
      if (isUserAdmin || isUserPastor) {
        // Administrators and Pastors can see all groups (no filtering)
        filteredGroups = groupsWithDetails;
        console.log('Admin/Pastor - showing all groups:', filteredGroups.length);
      } else if (isUserGroupLeader) {
        // Group Leaders can see only groups they lead
        filteredGroups = groupsWithDetails.filter(group => {
          const isLeader = group.leader_id === currentMemberId;
          console.log(`Group ${group.name}: leader_id=${group.leader_id}, currentMemberId=${currentMemberId}, isLeader=${isLeader}`);
          return isLeader;
        });
        console.log('Group Leader filtered groups:', filteredGroups.map(g => ({ name: g.name, leader_id: g.leader_id })));
      } else if (isUserMember) {
        // Members can see only their own assigned group
        if (userGroupId) {
          filteredGroups = groupsWithDetails.filter(group => group.id === userGroupId);
          console.log('Member filtered groups:', filteredGroups.map(g => g.name));
        } else {
          filteredGroups = []; // Member has no group assigned
          console.log('Member has no group assigned');
        }
      } else if (isUserDeacon || isUserDepartmentLeader) {
        // Deacons and Department Leaders can see all groups
        filteredGroups = groupsWithDetails;
        console.log('Deacon/Department Leader - showing all groups:', filteredGroups.length);
      } else {
        // No role - no access
        filteredGroups = [];
        console.log('No role - no access to groups');
      }

      setGroups(filteredGroups);
    } catch (error: any) {
      console.error('Error loading groups:', error);
      setError('Failed to load groups: ' + (error.message || 'Unknown error'));
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

  const loadAttendanceForMeeting = async (meetingId: string) => {
    try {
      const { data, error } = await supabase
        .from('meeting_attendance')
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
      
      console.log('Loaded attendance records:', data);
      setAttendanceRecords(data || []);
    } catch (error: any) {
      console.error('Failed to load attendance:', error);
      setError('Failed to load attendance: ' + error.message);
    }
  };

  const openReportModal = async (meeting: GroupMeeting) => {
    setSelectedMeetingForReport(meeting);
    await loadAttendanceForMeeting(meeting.id);
    setShowReportModal(true);
  };

  const handlePrintReport = () => {
    window.print();
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
    // Check if user can manage this specific group
    const canManage = canManageGroup ? canManageGroup(group.id) : false;
    
    if (!canManage) {
      setError('You do not have permission to manage this group');
      return;
    }

    setSelectedGroup(group);
    setShowWorkflowModal(true);
    await loadMeetings(group.id);
  };

  const openEditGroupModal = (group: CellGroup) => {
    // Only allow admin and pastor to edit groups
    if (!isUserAdmin && !isUserPastor) {
      setError('Only administrators and pastors can edit groups');
      return;
    }
    setSelectedGroup(group);
    setShowEditGroupModal(true);
  };

  const openDeleteGroupModal = (group: CellGroup) => {
    // Only allow admin and pastor to delete groups
    if (!isUserAdmin && !isUserPastor) {
      setError('Only administrators and pastors can delete groups');
      return;
    }
    setSelectedGroup(group);
    setShowDeleteGroupModal(true);
  };

  const closeAllModals = () => {
    setShowCreateGroupModal(false);
    setShowEditGroupModal(false);
    setShowDeleteGroupModal(false);
    setShowMeetingsModal(false);
    setShowWorkflowModal(false);
    setShowReportModal(false);
    setSelectedGroup(null);
    setSelectedMeetingForReport(null);
    setAttendanceRecords([]);
  };

  const handleGroupCreated = () => {
    loadGroups();
    setSuccess('Group created successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleGroupUpdated = () => {
    loadGroups();
    setSuccess('Group updated successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleGroupDeleted = () => {
    loadGroups();
    setSuccess('Group deleted successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Permission functions - FIXED VERSION
  const canCreateGroups = () => {
    return isUserAdmin || isUserPastor;
  };

  const canEditGroup = (group: CellGroup) => {
    // Only admin and pastor can edit groups
    return isUserAdmin || isUserPastor;
  };

  const canDeleteGroup = (group: CellGroup) => {
    // Only admin and pastor can delete groups
    return isUserAdmin || isUserPastor;
  };

  const canViewGroupDetails = (group: CellGroup) => {
    if (isUserAdmin || isUserPastor) {
      return true; // Admins & Pastors can view all groups
    }
    if (isUserGroupLeader) {
      return group.leader_id === currentMemberId; // Leaders can view only their own group
    }
    if (isUserMember) {
      // Members can view only their own assigned group
      return group.id === userGroupId;
    }
    if (isUserDeacon || isUserDepartmentLeader) {
      return true; // Deacons and Department Leaders can view all
    }
    return false;
  };

  const getUserRoleDisplay = () => {
    if (!profile) return 'Guest';
    
    if (isUserAdmin) return 'Administrator';
    if (isUserPastor) return 'Pastor';
    if (isUserDeacon) return 'Deacon';
    if (isUserDepartmentLeader) return 'Department Leader';
    if (isUserGroupLeader) return 'Group Leader';
    if (isUserMember) return 'Member';
    return 'Guest';
  };

  // FIXED: Check if user can manage a specific group
  const checkCanManageGroup = (groupId: string) => {
    if (isUserAdmin || isUserPastor) {
      return true; // Admins & Pastors can manage all groups
    }
    
    // For group leaders, check if they lead this specific group
    if (isUserGroupLeader) {
      // Find the group in the current list
      const group = groups.find(g => g.id === groupId);
      return group?.leader_id === currentMemberId;
    }
    
    return false;
  };

  // FIXED: Check if user can view a specific group
  const checkCanViewGroup = (groupId: string) => {
    if (isUserAdmin || isUserPastor || isUserDeacon || isUserDepartmentLeader) {
      return true; // Admins, Pastors, Deacons & Department Leaders can view all
    }
    
    // For group leaders, check if they lead this specific group
    if (isUserGroupLeader) {
      const group = groups.find(g => g.id === groupId);
      return group?.leader_id === currentMemberId;
    }
    
    // For members, check if this is their assigned group
    if (isUserMember) {
      return groupId === userGroupId;
    }
    
    return false;
  };

  const getAttendanceStats = () => {
    const attended = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const absentWithReason = attendanceRecords.filter(r => r.status === 'absent_with_reason').length;
    const total = attendanceRecords.length;

    return { attended, absent, absentWithReason, total };
  };

  // Render the main component
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Debug Info (optional) */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Church Cell Groups</h1>
          <p className="text-lg text-gray-600">
            {profile ? `Logged in as ${getUserRoleDisplay()} (Member ID: ${currentMemberId || 'Loading...'})` : 'Please log in to view groups'}
          </p>
          {profile && isUserGroupLeader && (
            <p className="text-sm text-blue-600 mt-2">
              You are a Group Leader. You can only see and manage groups you lead.
            </p>
          )}
        </div>

        {/* Search and Create Group Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {canCreateGroups() && (
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl hover:from-blue-700 hover:to-green-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              <Plus className="h-5 w-5" />
              Create New Group
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

        {/* Groups Grid */}
        {!profile ? (
          <div className="text-center py-12 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Please Log In</h3>
            <p className="text-gray-500 mb-6">You need to be logged in to view groups</p>
          </div>
        ) : !currentMemberId ? (
          <div className="text-center py-12 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Loading Your Profile</h3>
            <p className="text-gray-500">Please wait while we load your information...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading && groups.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading groups...</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  {searchTerm ? 'No groups match your search' : 'No Accessible Groups'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm ? 'Try a different search term' : 
                   isUserGroupLeader ? `You are not assigned as a leader of any group (Your member ID: ${currentMemberId})` :
                   isUserMember ? 'You are not assigned to any group' :
                   'You do not have access to any groups'}
                </p>
                {canCreateGroups() && (
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                  >
                    <Plus className="h-5 w-5" />
                    Create Your First Group
                  </button>
                )}
              </div>
            ) : (
              groups.filter(group => 
                group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                group.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                group.leader_name?.toLowerCase().includes(searchTerm.toLowerCase())
              ).map((group) => {
                // FIXED: Use the corrected permission check functions
                const canManage = checkCanManageGroup(group.id);
                const canView = checkCanViewGroup(group.id);
                const canEdit = canEditGroup(group);
                const canDelete = canDeleteGroup(group);
                
                return (
                  <div
                    key={group.id}
                    className="bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center shadow-lg">
                          <Users className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{group.name}</h3>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {group.is_current_user_leader && (
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
                              onClick={() => openEditGroupModal(group)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Group"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => openDeleteGroupModal(group)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Group"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 mb-4">
                      {group.leader_name && (
                        <div className="flex items-center gap-3 text-gray-600">
                          <User className="h-4 w-4" />
                          <span className="text-sm">Leader: {group.leader_name}</span>
                        </div>
                      )}
                      {group.location && (
                        <div className="flex items-center gap-3 text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">{group.location}</span>
                        </div>
                      )}
                      {(group.meeting_day || group.meeting_time) && (
                        <div className="flex items-center gap-3 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {group.meeting_day} {group.meeting_time && `at ${group.meeting_time}`}
                          </span>
                        </div>
                      )}
                      {group.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{group.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <span className="text-sm text-gray-600">
                        {group.memberCount || 0} member{(group.memberCount || 0) !== 1 ? 's' : ''}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openMeetingsModal(group)}
                          disabled={!canView}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
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

        {/* Modals */}
        <CreateGroupModal
          isOpen={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
          onSuccess={handleGroupCreated}
          onError={(message) => {
            setError(message);
            setTimeout(() => setError(null), 3000);
          }}
          userId={profile?.id || null}
        />
        <EditGroupModal
          isOpen={showEditGroupModal}
          group={selectedGroup}
          onClose={() => setShowEditGroupModal(false)}
          onSuccess={handleGroupUpdated}
          onError={(message) => {
            setError(message);
            setTimeout(() => setError(null), 3000);
          }}
          canEdit={selectedGroup ? canEditGroup(selectedGroup) : false}
        />

        <DeleteGroupModal
          isOpen={showDeleteGroupModal}
          group={selectedGroup}
          onClose={() => setShowDeleteGroupModal(false)}
          onConfirm={handleGroupDeleted}
          onError={(message) => {
            setError(message);
            setTimeout(() => setError(null), 3000);
          }}
          canDelete={selectedGroup ? canDeleteGroup(selectedGroup) : false}
        />

        {showMeetingsModal && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{selectedGroup.name} - Meetings</h3>
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

        {showReportModal && selectedMeetingForReport && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white">
            <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:rounded-none print:shadow-none">
              <div className="flex justify-between items-center mb-6 print:mb-8">
                <h3 className="text-2xl font-bold text-gray-900 print:text-black">
                  Group Meeting Report
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
                    {selectedGroup.name}
                  </h1>
                  <p className="text-lg text-gray-600 print:text-black">Group Meeting Attendance Report</p>
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
                      {selectedMeetingForReport.location || selectedGroup.location || 'Not specified'}
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

        {showWorkflowModal && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Manage {selectedGroup.name}</h3>
                <button
                  onClick={closeAllModals}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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

export default Groups;
