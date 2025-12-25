import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Users, MapPin, Calendar, User, Search, X, Shield, AlertCircle, CheckCircle, Printer, Clock, FileText, Save, UserPlus, Home, Phone, Download, FileDown, Plus, Settings, Trash2, Edit } from 'lucide-react';

// Interfaces (keep your existing interfaces here)
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

// Create Group Modal (keep your existing CreateGroupModal component)
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

// Edit Group Modal (keep your existing EditGroupModal component)
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

// Delete Group Modal (keep your existing DeleteGroupModal component)
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

// Main Groups Component - FIXED VERSION
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

  // Safely get user roles and check permissions
  const userRoles = getRoles ? getRoles() : [];
  const isUserAdmin = isAdmin ? isAdmin() : false;
  const isUserPastor = isPastor ? isPastor() : false;
  const isUserDeacon = isDeacon ? isDeacon() : false;
  const isUserGroupLeader = isGroupLeader ? isGroupLeader() : false;
  
  // Determine if user is a member (not admin, pastor, deacon, or group leader)
  const isUserMember = !isUserAdmin && !isUserPastor && !isUserDeacon && !isUserGroupLeader && profile?.admin_role === 'member';

  useEffect(() => {
    if (profile) {
      loadGroups();
      loadAllMembers();
    }
  }, [profile]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      
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
          const isCurrentUserLeader = group.leader_id === profile?.id;
          
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

      // Filter groups based on user role
      let filteredGroups = groupsWithDetails;
      
      if (!isUserAdmin && !isUserPastor) {
        if (isUserGroupLeader) {
          // Group Leaders can see only their own group
          filteredGroups = groupsWithDetails.filter(group => 
            group.leader_id === profile?.id
          );
        } else if (isUserMember) {
          // Members can see only their own group
          const userGroup = await getUserGroup();
          if (userGroup) {
            filteredGroups = groupsWithDetails.filter(group => 
              group.id === userGroup.id
            );
          } else {
            // Member has no group assigned
            filteredGroups = [];
          }
        } else if (isUserDeacon) {
          // Deacons can see all groups
          filteredGroups = groupsWithDetails;
        } else {
          // No role - no access
          filteredGroups = [];
        }
      }
      // Administrators and Pastors can see all groups (no filtering)

      setGroups(filteredGroups);
    } catch (error: any) {
      console.error('Error loading groups:', error);
      setError('Failed to load groups: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const getUserGroup = async (): Promise<CellGroup | null> => {
    try {
      if (!profile?.id) return null;
      
      const { data: memberData } = await supabase
        .from('members')
        .select('cell_group_id')
        .eq('id', profile.id)
        .single();
      
      if (!memberData?.cell_group_id) return null;
      
      const { data: groupData } = await supabase
        .from('cell_groups')
        .select('*')
        .eq('id', memberData.cell_group_id)
        .single();
      
      return groupData;
    } catch (error) {
      console.error('Failed to get user group:', error);
      return null;
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
    if (!canManageGroup(group.id)) {
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

  // Permission functions
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
      return true;
    }
    if (isUserGroupLeader) {
      return group.leader_id === profile?.id;
    }
    if (isUserMember) {
      // Members can view only their own group
      return true;
    }
    return false;
  };

  const getUserRoleDisplay = () => {
    if (!profile) return 'Guest';
    
    if (isUserAdmin) return 'Administrator';
    if (isUserPastor) return 'Pastor';
    if (isUserDeacon) return 'Deacon';
    if (isUserGroupLeader) return 'Group Leader';
    if (isUserMember) return 'Member';
    return 'Guest';
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Church Cell Groups</h1>
          <p className="text-lg text-gray-600">
            {profile ? `Logged in as ${getUserRoleDisplay()}` : 'Please log in to view groups'}
          </p>
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
                  {searchTerm ? 'Try a different search term' : isUserMember && !searchTerm ? 'You are not assigned to any group' : 'You do not have access to any groups'}
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
                const canManage = canManageGroup(group.id);
                const canView = canViewGroup(group.id);
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
