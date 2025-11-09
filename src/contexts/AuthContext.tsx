// =====================================================
// HOW TO QUERY MEMBERS WITH PROPER PERMISSIONS
// Using Database Functions (works with mock sessions)
// =====================================================

import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import React from 'react';

// =====================================================
// 1. Fetch members using permission-aware function
// =====================================================
export const fetchMembers = async (userId: string) => {
  // Use the database function that automatically filters based on permissions
  const { data, error } = await supabase
    .rpc('get_accessible_members', { requesting_user_id: userId });

  if (error) {
    console.error('Error fetching members:', error);
    return [];
  }

  return data || [];
};

// =====================================================
// 2. Check if user can edit a member
// =====================================================
export const canEditMemberDB = async (
  requestingUserId: string,
  targetMemberId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .rpc('can_edit_member', {
      requesting_user_id: requestingUserId,
      target_member_id: targetMemberId
    });

  if (error) {
    console.error('Error checking edit permission:', error);
    return false;
  }

  return data === true;
};

// =====================================================
// 3. Update a member using safe function
// =====================================================
export const updateMember = async (
  requestingUserId: string,
  targetMemberId: string,
  updates: {
    name?: string;
    surname?: string;
    email?: string;
    phone?: string;
    cell_group_id?: string;
    is_leader?: boolean;
  }
) => {
  const { data, error } = await supabase
    .rpc('update_member_safe', {
      requesting_user_id: requestingUserId,
      target_member_id: targetMemberId,
      new_name: updates.name || null,
      new_surname: updates.surname || null,
      new_email: updates.email || null,
      new_phone: updates.phone || null,
      new_cell_group_id: updates.cell_group_id || null,
      new_is_leader: updates.is_leader !== undefined ? updates.is_leader : null
    });

  if (error) {
    console.error('Error updating member:', error);
    throw new Error(error.message || 'Failed to update member');
  }

  return data;
};

// =====================================================
// 4. Alternative: Direct query with client-side filtering
// =====================================================
export const fetchMembersClient = async (profile: any) => {
  let query = supabase.from('members').select('*');

  // If not admin, filter by cell group
  if (!profile.isAdmin && profile.isLeader && profile.led_cell_groups.length > 0) {
    query = query.in('cell_group_id', profile.led_cell_groups);
  } else if (!profile.isAdmin && !profile.isLeader) {
    // Regular member can only see themselves
    query = query.eq('id', profile.id);
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) {
    console.error('Error fetching members:', error);
    return [];
  }

  return data || [];
};

// =====================================================
// 5. React Hook for fetching members
// =====================================================
export const useMembers = () => {
  const { profile } = useAuth();
  const [members, setMembers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadMembers = React.useCallback(async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      // Use database function for permission-aware query
      const data = await fetchMembers(profile.id);
      setMembers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load members');
      console.error('Error loading members:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  React.useEffect(() => {
    if (profile) {
      loadMembers();
    }
  }, [profile, loadMembers]);

  return { members, loading, error, refetch: loadMembers };
};

// =====================================================
// 6. React Hook for cell group members
// =====================================================
export const useCellGroupMembers = (cellGroupId?: string) => {
  const { profile } = useAuth();
  const [members, setMembers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadMembers = async () => {
      if (!cellGroupId || !profile) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Verify leader has access to this cell group
      if (profile.isLeader && !profile.isAdmin) {
        if (!profile.led_cell_groups.includes(cellGroupId)) {
          setError('You do not have access to this cell group');
          setLoading(false);
          return;
        }
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .eq('cell_group_id', cellGroupId)
          .order('name', { ascending: true });

        if (error) throw error;

        setMembers(data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load cell group members');
        console.error('Error loading cell group members:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [cellGroupId, profile]);

  return { members, loading, error };
};

// =====================================================
// 7. Example Component: Member List
// =====================================================
export const MemberListComponent: React.FC = () => {
  const { profile, canViewMember, canEditMember } = useAuth();
  const { members, loading, error, refetch } = useMembers();

  if (loading) return <div className="p-4">Loading members...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">
          {profile?.isAdmin && 'All Members'}
          {profile?.isLeader && !profile.isAdmin && 'My Cell Group Members'}
          {!profile?.isAdmin && !profile?.isLeader && 'My Profile'}
        </h2>
        
        {profile?.isLeader && !profile?.isAdmin && (
          <p className="text-sm text-gray-600">
            You are leading {profile.led_cell_groups.length} cell group(s) with {members.length} member(s)
          </p>
        )}

        <button 
          onClick={refetch}
          className="mt-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {members.length === 0 ? (
          <p className="text-gray-500">No members found</p>
        ) : (
          members.map(member => (
            <div key={member.id} className="p-4 border rounded-lg shadow-sm bg-white">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {member.name} {member.surname}
                    {member.is_leader && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Leader
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">{member.email || 'No email'}</p>
                  <p className="text-sm text-gray-500">{member.phone || 'No phone'}</p>
                  {member.cell_group_id && (
                    <p className="text-xs text-gray-400 mt-1">
                      Cell Group ID: {member.cell_group_id}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {canViewMember(member.id) && (
                    <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                      View
                    </button>
                  )}
                  {canEditMember(member.id) && (
                    <button className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// =====================================================
// 8. Example: Edit Member Form
// =====================================================
export const EditMemberForm: React.FC<{ 
  memberId: string;
  onSuccess?: () => void;
}> = ({ memberId, onSuccess }) => {
  const { profile, canEditMember } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
  });

  // Load member data
  React.useEffect(() => {
    const loadMember = async () => {
      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();
      
      if (data) {
        setFormData({
          name: data.name || '',
          surname: data.surname || '',
          email: data.email || '',
          phone: data.phone || '',
        });
      }
    };
    loadMember();
  }, [memberId]);

  if (!canEditMember(memberId)) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-700">You do not have permission to edit this member</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id) return;

    try {
      setLoading(true);
      await updateMember(profile.id, memberId, formData);
      alert('Member updated successfully!');
      onSuccess?.();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white rounded-lg shadow">
      <h3 className="text-xl font-bold mb-4">Edit Member</h3>

      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Surname</label>
        <input
          type="text"
          value={formData.surname}
          onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Phone</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {profile?.isLeader && !profile?.isAdmin && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            ⚠️ As a cell group leader, you cannot change cell group assignments or leadership status.
          </p>
        </div>
      )}
      
      <button 
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
};
