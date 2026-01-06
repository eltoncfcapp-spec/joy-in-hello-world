import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Users, MapPin, Calendar, User, Search, X, Shield, AlertCircle, CheckCircle, Printer, Clock, FileText, Save, UserPlus, Home, Phone, Download, FileDown, Plus, Trash2, Edit } from 'lucide-react';

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
  created_at?: string | null;
  updated_at?: string | null;
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
  first_time_visit_date?: string | null;
  is_permanent_member?: boolean | null;
  is_leader?: boolean | null;
  status_date?: string | null;
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

// Audit Log Functions
const logAuditEvent = async (
  tableName: string,
  recordId: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'SYNC',
  oldData: any = null,
  newData: any = null,
  userId: string | null = null
) => {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        table_name: tableName,
        record_id: recordId,
        action: action,
        old_data: oldData,
        new_data: newData,
        user_id: userId
      }]);

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (error) {
    console.error('Audit logging error:', error);
  }
};

// New Group Creation Component
interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  userId: string | null;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onSuccess, onError, userId }) => {
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
      setAvailableMembers((data || []) as Member[]);
    } catch (error: any) {
      console.error('Failed to load members:', error);
      onError('Failed to load church members');
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
    if (!isAdmin() && !isPastor()) {
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

      // Log audit event
      await logAuditEvent('cell_groups', data.id, 'INSERT', null, newGroup, userId);

      // If a leader was selected, update their group assignment and role
      if (formData.leader_id) {
        const { data: oldLeaderData } = await supabase
          .from('members')
          .select('*')
          .eq('id', formData.leader_id)
          .single();

        await supabase
          .from('members')
          .update({ 
            cell_group_id: data.id,
            admin_role: 'group_leader',
            updated_at: new Date().toISOString()
          })
          .eq('id', formData.leader_id);

        // Log leader update
        if (oldLeaderData) {
          const newLeaderData = {
            ...oldLeaderData,
            cell_group_id: data.id,
            admin_role: 'group_leader',
            updated_at: new Date().toISOString()
          };
          await logAuditEvent('members', formData.leader_id, 'UPDATE', oldLeaderData, newLeaderData, userId);
        }
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
                    {member.cell_group_id ? ' - Already in a group' : ''}
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
              You can select any church member to be the group leader. They will be assigned the "group_leader" role.
            </p>
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

// Edit Group Modal Component
interface EditGroupModalProps {
  isOpen: boolean;
  group: CellGroup | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  canEdit: boolean;
}

const EditGroupModal: React.FC<EditGroupModalProps> = ({ isOpen, group, onClose, onSuccess, onError, canEdit }) => {
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
  const { profile } = useAuth();

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
      setPreviousLeaderId(group.leader_id);
      loadAllMembers();
    }
  }, [isOpen, group]);

  const loadAllMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (error) throw error;
      setAvailableMembers((data || []) as Member[]);
    } catch (error: any) {
      console.error('Failed to load members:', error);
      onError('Failed to load church members');
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
      
      // Get old group data for audit log
      const { data: oldGroupData } = await supabase
        .from('cell_groups')
        .select('*')
        .eq('id', group.id)
        .single();

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

      // Log audit event
      await logAuditEvent('cell_groups', group.id, 'UPDATE', oldGroupData, updatedGroup, profile?.id || null);

      // Handle leader assignment changes
      if (previousLeaderId !== formData.leader_id) {
        // Remove previous leader's group assignment and revert role
        if (previousLeaderId) {
          // Get previous leader's current role
          const { data: previousLeader } = await supabase
            .from('members')
            .select('*')
            .eq('id', previousLeaderId)
            .single();
          
          // Revert to 'member' role if they were a group leader
          let newRole = previousLeader?.admin_role || 'member';
          if (newRole === 'group_leader') {
            newRole = 'member';
          }
          
          const updatedPreviousLeader = {
            cell_group_id: null,
            admin_role: newRole,
            updated_at: new Date().toISOString()
          };
          
          await supabase
            .from('members')
            .update(updatedPreviousLeader)
            .eq('id', previousLeaderId);

          // Log previous leader update
          await logAuditEvent('members', previousLeaderId, 'UPDATE', previousLeader, {
            ...previousLeader,
            ...updatedPreviousLeader
          }, profile?.id || null);
        }

        // Assign new leader
        if (formData.leader_id) {
          // Check if new leader is already in another group
          const { data: newLeader } = await supabase
            .from('members')
            .select('*')
            .eq('id', formData.leader_id)
            .single();
          
          if (newLeader?.cell_group_id && newLeader.cell_group_id !== group.id) {
            onError('Selected member is already assigned to another group');
            return;
          }
          
          const updatedNewLeader = {
            cell_group_id: group.id,
            admin_role: 'group_leader',
            updated_at: new Date().toISOString()
          };
          
          await supabase
            .from('members')
            .update(updatedNewLeader)
            .eq('id', formData.leader_id);

          // Log new leader update
          await logAuditEvent('members', formData.leader_id, 'UPDATE', newLeader, {
            ...newLeader,
            ...updatedNewLeader
          }, profile?.id || null);
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
              {availableMembers.map((member) => (
                <option 
                  key={member.id} 
                  value={member.id}
                  disabled={!!(member.cell_group_id && member.cell_group_id !== group?.id)}
                >
                  {member.name} {member.surname} 
                  {member.admin_role ? ` (${member.admin_role})` : ''}
                  {member.cell_group_id && member.cell_group_id !== group?.id ? ' - Already in another group' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Selecting a new leader will automatically remove the previous leader's group assignment.
            </p>
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
  const { profile } = useAuth();

  useEffect(() => {
    if (isOpen && group) {
      checkMemberCount();
    }
  }, [isOpen, group]);

  const checkMemberCount = async () => {
    try {
      if (!group?.id) return;
      const { count } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('cell_group_id', group.id);

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
      
      // Get group data for audit log
      const { data: groupData } = await supabase
        .from('cell_groups')
        .select('*')
        .eq('id', group.id)
        .single();

      // Remove leader assignment if exists
      if (group.leader_id) {
        // Get leader's current role
        const { data: leader } = await supabase
          .from('members')
          .select('*')
          .eq('id', group.leader_id)
          .single();
        
        // Revert to 'member' role if they were a group leader
        let newRole = leader?.admin_role || 'member';
        if (newRole === 'group_leader') {
          newRole = 'member';
        }
        
        const updatedLeader = {
          cell_group_id: null,
          admin_role: newRole,
          updated_at: new Date().toISOString()
        };
        
        await supabase
          .from('members')
          .update(updatedLeader)
          .eq('id', group.leader_id);

        // Log leader update
        await logAuditEvent('members', group.leader_id, 'UPDATE', leader, {
          ...leader,
          ...updatedLeader
        }, profile?.id || null);
      }

      // Delete the group
      const { error } = await supabase
        .from('cell_groups')
        .delete()
        .eq('id', group.id);

      if (error) throw error;

      // Log group deletion
      await logAuditEvent('cell_groups', group.id, 'DELETE', groupData, null, profile?.id || null);

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
  const { canCreateGroupMeetings, profile } = useAuth();
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

      const { data: meetingData, error } = await supabase
        .from('meetings')
        .insert([newMeeting])
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await logAuditEvent('meetings', meetingData.id, 'INSERT', null, newMeeting, profile?.id || null);

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
  const { canManageGroupAttendance, profile } = useAuth();
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
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

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
      
      // Only initialize as present if we don't have existing attendance loaded
      if (!initialLoadComplete) {
        const initialAttendance: Record<string, 'present'> = {};
        data?.forEach(member => {
          initialAttendance[member.id] = 'present';
        });
        setAttendance(initialAttendance);
      }
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

  const addMemberToGroup = async (member: Member) => {
    try {
      setLoading(true);
      const isAlreadyMember = groupMembers.some(gm => gm.id === member.id);
      if (isAlreadyMember) {
        onError('Member is already in this group');
        return;
      }

      // Get old member data for audit log
      const { data: oldMemberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', member.id)
        .single();

      const updatedMember = {
        cell_group_id: group.id,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('members')
        .update(updatedMember)
        .eq('id', member.id);

      if (error) throw error;

      // Log audit event
      await logAuditEvent('members', member.id, 'UPDATE', oldMemberData, {
        ...oldMemberData,
        ...updatedMember
      }, profile?.id || null);

      // Add member to local state immediately
      const newMember = {
        ...member,
        cell_group_id: group.id,
        updated_at: new Date().toISOString()
      };
      
      setGroupMembers(prev => [...prev, newMember]);
      setAttendance(prev => ({ ...prev, [member.id]: 'present' }));
      
      setShowAddAttendeeModal(false);
      setSearchMemberTerm('');
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
      
      // Get existing attendance for audit logging
      const { data: existingAttendance } = await supabase
        .from('meeting_attendance')
        .select('*')
        .eq('meeting_id', selectedMeeting.id);

      const attendanceRecords = groupMembers.map(member => ({
        meeting_id: selectedMeeting.id,
        member_id: member.id,
        status: attendance[member.id] || 'absent',
        notes: attendance[member.id] === 'absent_with_reason' ? notes[member.id] || null : null
      }));

      // First, delete existing attendance for this meeting
      const { error: deleteError } = await supabase
        .from('meeting_attendance')
        .delete()
        .eq('meeting_id', selectedMeeting.id);

      if (deleteError) throw deleteError;

      // Log deletion of old attendance records
      if (existingAttendance && existingAttendance.length > 0) {
        for (const record of existingAttendance) {
          await logAuditEvent('meeting_attendance', record.id, 'DELETE', record, null, profile?.id || null);
        }
      }

      // Then insert new attendance records
      const { data: newAttendance, error: insertError } = await supabase
        .from('meeting_attendance')
        .insert(attendanceRecords)
        .select();

      if (insertError) throw insertError;

      // Log creation of new attendance records
      if (newAttendance) {
        for (const record of newAttendance) {
          await logAuditEvent('meeting_attendance', record.id, 'INSERT', null, record, profile?.id || null);
        }
      }

      // Update the meeting status to completed
      const { data: oldMeetingData } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', selectedMeeting.id)
        .single();

      const updatedMeeting = {
        status: 'completed',
        updated_at: new Date().toISOString()
      };

      await supabase
        .from('meetings')
        .update(updatedMeeting)
        .eq('id', selectedMeeting.id);

      // Log meeting update
      await logAuditEvent('meetings', selectedMeeting.id, 'UPDATE', oldMeetingData, {
        ...oldMeetingData,
        ...updatedMeeting
      }, profile?.id || null);

      // Reload attendance data after saving to ensure state is synced
      await loadExistingAttendance();

      // Call the success callback AFTER the reload completes
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
                            member.admin_role === 'group_leader' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
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
                        + Add to Group
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
  const { canAddGroupNewcomers, profile } = useAuth();
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
  const [submitted, setSubmitted] = useState(false);

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
    // Reset submitted state when user starts typing
    if (submitted) setSubmitted(false);
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
        const updatedMember: {
          status: 'newcomer';
          cell_group_id: string;
          invited_by: string | null;
          first_time_visit_date: string;
          updated_at: string;
        } = {
          status: 'newcomer',
          cell_group_id: group.id,
          invited_by: formData.invited_by || null,
          first_time_visit_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: updatedData, error: updateError } = await supabase
          .from('members')
          .update(updatedMember)
          .eq('id', existingMember.id)
          .select()
          .single();

        if (updateError) throw updateError;
        console.log('Updated member:', updatedData);

        // Log audit event for existing member update
        await logAuditEvent('members', memberId, 'UPDATE', existingMember, updatedData, profile?.id || null);
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

        const { data: newMemberData, error: memberError } = await supabase
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
        memberId = newMemberData.id;
        console.log('Created new member:', newMemberData);

        // Log audit event for new member creation
        await logAuditEvent('members', memberId, 'INSERT', null, newMemberData, profile?.id || null);
      }

      // Record attendance for selected meeting
      if (selectedMeeting) {
        const attendancePayload = {
          meeting_id: selectedMeeting.id,
          member_id: memberId,
          status: 'present',
          notes: 'First-time group visitor - ' + (formData.notes || 'No additional notes')
        };
        
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('meeting_attendance')
          .insert([attendancePayload])
          .select()
          .single();

        if (attendanceError) {
          console.error('Failed to record attendance:', attendanceError);
        } else {
          // Log attendance record
          await logAuditEvent('meeting_attendance', attendanceData.id, 'INSERT', null, attendanceData, profile?.id || null);
        }
      }

      // Reset form and show success
      setFormData({ name: '', surname: '', phone: '', residence: '', notes: '', invited_by: '' });
      setSubmitted(true);
      onNewcomerAdded();
      
      // Don't show success message immediately - let the user see the form reset
      setTimeout(() => {
        setSubmitted(false);
        setShowForm(false);
      }, 1500);
      
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
            onClick={() => {
              setShowForm(true);
              setSubmitted(false);
            }}
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
          {submitted ? (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Newcomer Added Successfully!</h3>
              <p className="text-gray-600">The newcomer has been registered to {group.name}.</p>
            </div>
          ) : (
            <>
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
                      setSubmitted(false);
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}
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

// Enhanced Group Report Step Component with A4 print formatting
interface GroupReportStepProps {
  group: CellGroup;
  meetings: GroupMeeting[];
  selectedMeeting: GroupMeeting | null;
  onMeetingSelect: (meeting: GroupMeeting) => void;
  onReportCreated: () => void;
  onError: (message: string) => void;
}

const GroupReportStep: React.FC<GroupReportStepProps> = ({ group, meetings, selectedMeeting, onMeetingSelect, onReportCreated, onError }) => {
  const { canCreateGroupReports, profile } = useAuth();
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
  const [showPrintPreview, setShowPrintPreview] = useState(false);

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
            id, name, surname, residence, phone, admin_role
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
        // Get old report data for audit log
        const { data: oldReportData } = await supabase
          .from('meeting_reports')
          .select('*')
          .eq('id', existingReport.id)
          .single();

        const { error: updateError } = await supabase
          .from('meeting_reports')
          .update(reportPayload)
          .eq('id', existingReport.id);
        error = updateError;

        // Log audit event for report update
        await logAuditEvent('meeting_reports', existingReport.id, 'UPDATE', oldReportData, {
          ...oldReportData,
          ...reportPayload,
          updated_at: new Date().toISOString()
        }, profile?.id || null);
      } else {
        const { data: newReport, error: insertError } = await supabase
          .from('meeting_reports')
          .insert([reportPayload])
          .select()
          .single();
        error = insertError;

        // Log audit event for new report creation
        if (newReport) {
          await logAuditEvent('meeting_reports', newReport.id, 'INSERT', null, newReport, profile?.id || null);
        }
      }

      if (error) throw error;

      // Get old meeting data for audit log
      const { data: oldMeetingData } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', selectedMeeting.id)
        .single();

      const updatedMeeting = {
        status: 'completed',
        updated_at: new Date().toISOString()
      };

      await supabase
        .from('meetings')
        .update(updatedMeeting)
        .eq('id', selectedMeeting.id);

      // Log meeting update
      await logAuditEvent('meetings', selectedMeeting.id, 'UPDATE', oldMeetingData, {
        ...oldMeetingData,
        ...updatedMeeting
      }, profile?.id || null);

      onReportCreated();
    } catch (error: any) {
      onError('Failed to generate group report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    setShowPrintPreview(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setShowPrintPreview(false), 100);
    }, 100);
  };

  const downloadReport = () => {
    const stats = attendanceStats;
    const dateStr = new Date(selectedMeeting?.meeting_date || '').toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
    
    const reportContent = `
================================================================================
                         CHURCH CELL GROUP MEETING REPORT
================================================================================

GROUP: ${group.name}
MEETING DATE: ${selectedMeeting ? new Date(selectedMeeting.meeting_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'N/A'}
MEETING TIME: ${selectedMeeting?.meeting_time || 'Not specified'}
LOCATION: ${selectedMeeting?.location || group.location || 'Not specified'}
TOPIC: ${selectedMeeting?.topic || 'General Group Meeting'}
STATUS: ${selectedMeeting?.status || 'N/A'}

${selectedMeeting?.status === 'cancelled' && selectedMeeting?.cancellation_reason ? 
`CANCELLATION REASON: ${selectedMeeting.cancellation_reason}\n` : ''}

================================================================================
                              ATTENDANCE SUMMARY
================================================================================
Total Members: ${stats.total}
Present: ${stats.present} (${stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%)
Absent: ${stats.absent} (${stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : 0}%)
Absent with Notes: ${stats.absentWithReason} (${stats.total > 0 ? Math.round((stats.absentWithReason / stats.total) * 100) : 0}%)
Attendance Rate: ${stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%

================================================================================
                          MEETING SUMMARY WITH ALL DETAILS
================================================================================
${reportData.report_text || 'No meeting summary recorded'}

================================================================================
                              DECISIONS MADE
================================================================================
${reportData.decisions_made || 'No decisions recorded'}

================================================================================
                         ACTION ITEMS & FOLLOW-UPS
================================================================================
${reportData.action_items || 'No action items recorded'}

================================================================================
                              NEXT MEETING DATE
================================================================================
${reportData.next_meeting_date ? `Scheduled for: ${new Date(reportData.next_meeting_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}` : 'No next meeting date set'}

================================================================================
                         DETAILED ATTENDANCE WITH NOTES
================================================================================
${attendance.length > 0 ? attendance.map(record => 
`• ${record.members?.name || ''} ${record.members?.surname || ''}
  Role: ${record.members?.admin_role || 'Member'}
  Residence: ${record.members?.residence || 'No residence'}
  Phone: ${record.members?.phone || 'No phone'}
  Status: ${(record.status || 'unknown').toUpperCase()}
  ${record.notes ? `Notes: ${record.notes}` : ''}
  ${'-'.repeat(78)}`
).join('\n\n') : 'No attendance records available.'}

${selectedMeeting?.notes ? `
================================================================================
                              MEETING NOTES
================================================================================
${selectedMeeting.notes}
` : ''}

${reportData.additional_notes ? `
================================================================================
                           ADDITIONAL NOTES
================================================================================
${reportData.additional_notes}
` : ''}

================================================================================
                              REPORT INFORMATION
================================================================================
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
Report ID: ${existingReport?.id || 'New Report'}
Church Management System
${group.name} Cell Group
================================================================================
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${group.name.replace(/\s+/g, '-')}-Meeting-Report-${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print Preview Component
  const PrintPreview = () => {
    if (!showPrintPreview) return null;

    return (
      <div className="fixed inset-0 bg-white z-[100] p-8 hidden print:block">
        <div className="max-w-[210mm] mx-auto min-h-[297mm] p-12 bg-white text-black">
          {/* Header */}
          <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
            <h1 className="text-3xl font-bold mb-2">CHURCH CELL GROUP MEETING REPORT</h1>
            <div className="text-lg font-medium text-gray-700">
              {group.name} - Professional A4 Format
            </div>
          </div>

          {/* Meeting Information */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2">MEETING INFORMATION</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Group Name:</p>
                <p className="mb-2">{group.name}</p>
              </div>
              <div>
                <p className="font-semibold">Meeting Date:</p>
                <p className="mb-2">
                  {selectedMeeting ? new Date(selectedMeeting.meeting_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="font-semibold">Meeting Time:</p>
                <p className="mb-2">{selectedMeeting?.meeting_time || 'Not specified'}</p>
              </div>
              <div>
                <p className="font-semibold">Location:</p>
                <p className="mb-2">{selectedMeeting?.location || group.location || 'Not specified'}</p>
              </div>
              <div>
                <p className="font-semibold">Topic:</p>
                <p className="mb-2">{selectedMeeting?.topic || 'General Group Meeting'}</p>
              </div>
              <div>
                <p className="font-semibold">Status:</p>
                <p className="mb-2">{selectedMeeting?.status || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2">ATTENDANCE SUMMARY</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 border border-gray-300">
                <div className="text-3xl font-bold">{attendanceStats.total}</div>
                <div className="text-sm">Total Members</div>
              </div>
              <div className="text-center p-4 border border-gray-300 bg-green-50">
                <div className="text-3xl font-bold text-green-700">{attendanceStats.present}</div>
                <div className="text-sm">Present</div>
                <div className="text-xs mt-1">
                  ({attendanceStats.total > 0 ? Math.round((attendanceStats.present / attendanceStats.total) * 100) : 0}%)
                </div>
              </div>
              <div className="text-center p-4 border border-gray-300 bg-red-50">
                <div className="text-3xl font-bold text-red-700">{attendanceStats.absent}</div>
                <div className="text-sm">Absent</div>
                <div className="text-xs mt-1">
                  ({attendanceStats.total > 0 ? Math.round((attendanceStats.absent / attendanceStats.total) * 100) : 0}%)
                </div>
              </div>
              <div className="text-center p-4 border border-gray-300 bg-yellow-50">
                <div className="text-3xl font-bold text-yellow-700">{attendanceStats.absentWithReason}</div>
                <div className="text-sm">Absent with Notes</div>
                <div className="text-xs mt-1">
                  ({attendanceStats.total > 0 ? Math.round((attendanceStats.absentWithReason / attendanceStats.total) * 100) : 0}%)
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-xl font-bold">
                Overall Attendance Rate: {attendanceStats.total > 0 ? Math.round((attendanceStats.present / attendanceStats.total) * 100) : 0}%
              </div>
            </div>
          </div>

          {/* Meeting Summary */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2">MEETING SUMMARY WITH ALL DETAILS</h2>
            <div className="p-4 border border-gray-200 bg-gray-50 min-h-[100px] whitespace-pre-wrap">
              {reportData.report_text || 'No meeting summary recorded'}
            </div>
          </div>

          {/* Decisions Made */}
          {reportData.decisions_made && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2">DECISIONS MADE</h2>
              <div className="p-4 border border-gray-200 bg-blue-50 min-h-[80px] whitespace-pre-wrap">
                {reportData.decisions_made}
              </div>
            </div>
          )}

          {/* Action Items */}
          {reportData.action_items && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2">ACTION ITEMS & FOLLOW-UPS</h2>
              <div className="p-4 border border-gray-200 bg-green-50 min-h-[80px] whitespace-pre-wrap">
                {reportData.action_items}
              </div>
            </div>
          )}

          {/* Next Meeting */}
          {reportData.next_meeting_date && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2">NEXT MEETING DATE</h2>
              <div className="p-4 border border-gray-200 bg-purple-50">
                <p className="text-lg font-semibold">
                  Scheduled for: {new Date(reportData.next_meeting_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Detailed Attendance */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2">DETAILED ATTENDANCE WITH NOTES ({attendance.length} members)</h2>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Name</th>
                  <th className="border border-gray-300 p-2 text-left">Role</th>
                  <th className="border border-gray-300 p-2 text-left">Residence</th>
                  <th className="border border-gray-300 p-2 text-left">Status</th>
                  <th className="border border-gray-300 p-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record, index) => (
                  <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-2">
                      {record.members?.name} {record.members?.surname}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {record.members?.admin_role || 'Member'}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {record.members?.residence || '-'}
                    </td>
                    <td className={`border border-gray-300 p-2 font-semibold ${
                      record.status === 'present' ? 'text-green-700' :
                      record.status === 'absent' ? 'text-red-700' :
                      'text-yellow-700'
                    }`}>
                      {(record.status || '').replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {record.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-4 border-t border-gray-300 text-center text-sm text-gray-600">
            <p>Report Generated: {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} at {new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p className="mt-1">Church Management System • {group.name} Cell Group</p>
            <p className="mt-1">Report ID: {existingReport?.id || 'New Report'}</p>
          </div>
        </div>
      </div>
    );
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

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={downloadReport}
                    disabled={!canCreateGroupReports(group.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    Download TXT
                  </button>
                  <button
                    onClick={handlePrint}
                    disabled={!canCreateGroupReports(group.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Printer className="h-4 w-4" />
                    Print A4
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
                          <div className="text-sm text-gray-600">
                            <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs mr-2">
                              {record.members?.admin_role || 'Member'}
                            </span>
                            {record.members?.residence}
                          </div>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Summary with All Details *</label>
                    <textarea
                      name="report_text"
                      value={reportData.report_text}
                      onChange={handleReportChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Detailed report of what was discussed and accomplished during the meeting..."
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
                      placeholder="Important decisions, approvals, or resolutions made during the meeting..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Action Items & Follow-ups</label>
                    <textarea
                      name="action_items"
                      value={reportData.action_items}
                      onChange={handleReportChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tasks assigned, follow-ups, or next steps to be taken..."
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
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Status</label>
                      <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                        <span className="font-medium">{selectedMeeting.status}</span>
                      </div>
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
                      placeholder="Any other relevant information about the meeting..."
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

      {/* Print Preview */}
      <PrintPreview />
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
    isGroupLeader, 
    isMember 
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

  const [meetings, setMeetings] = useState<GroupMeeting[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMeetingForReport, setSelectedMeetingForReport] = useState<GroupMeeting | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<GroupAttendanceRecord[]>([]);

  useEffect(() => {
    if (profile) {
      loadGroups();
      loadAllMembers();
    }
  }, [profile]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      
      const { data: groupsData, error: groupsError } = await supabase
        .from('cell_groups')
        .select('*')
        .order('name');

      if (groupsError) throw groupsError;

      const groupsWithDetails = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('cell_group_id', group.id);
          
          let leaderInfo = null;
          if (group.leader_id) {
            const { data: leaderData } = await supabase
              .from('members')
              .select('name, surname, residence, phone')
              .eq('id', group.leader_id)
              .single();
            
            leaderInfo = leaderData;
          }
          
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

      let filteredGroups = groupsWithDetails;
      
      if (!isAdmin() && !isPastor()) {
        if (isGroupLeader()) {
          filteredGroups = groupsWithDetails.filter(group => 
            group.leader_id === profile?.id
          );
        } else if (isMember()) {
          const userGroup = await getUserGroup();
          filteredGroups = groupsWithDetails.filter(group => 
            group.id === userGroup?.id
          );
        } else {
          filteredGroups = [];
        }
      }

      setGroups(filteredGroups as CellGroup[]);
    } catch (error: any) {
      console.error('Error loading groups:', error);
      setError('Failed to load groups: ' + error.message);
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
      
      return groupData as CellGroup | null;
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
    if (!isAdmin() && !isPastor()) {
      setError('Only administrators and pastors can edit groups');
      return;
    }
    setSelectedGroup(group);
    setShowEditGroupModal(true);
  };

  const openDeleteGroupModal = (group: CellGroup) => {
    if (!isAdmin() && !isPastor()) {
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
    setSelectedGroup(null);
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

  const canCreateGroups = () => {
    return isAdmin() || isPastor();
  };

  const canEditGroup = (_group: CellGroup) => {
    return isAdmin() || isPastor();
  };

  const canDeleteGroup = (_group: CellGroup) => {
    return isAdmin() || isPastor();
  };

  const getUserRoleDisplay = () => {
    if (!profile) return 'Guest';
    
    const roles = getRoles();
    if (roles.includes('admin') || roles.includes('administrator')) return 'Administrator';
    if (roles.includes('pastor')) return 'Pastor';
    if (roles.includes('deacon')) return 'Deacon';
    if (roles.includes('group_leader')) return 'Group Leader';
    if (roles.includes('member')) return 'Member';
    return 'Guest';
  };

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
                  {searchTerm ? 'Try a different search term' : 'You do not have access to any groups'}
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
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
            size: A4;
            margin: 20mm;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Groups;
