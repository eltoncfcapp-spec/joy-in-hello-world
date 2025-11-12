import { Plus, Users, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext'; // Import your auth context

interface CellGroup {
  id: string;
  name: string;
  location: string | null;
  meeting_day: string | null;
  leader_id: string | null;
  leader: { name: string; surname: string } | null;
}

const CellGroups = () => {
  const { profile } = useAuth(); // Get user profile for permissions
  const [showForm, setShowForm] = useState(false);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; surname: string }[]>([]);
  const [formData, setFormData] = useState({
    groupName: '',
    leaderId: '',
    location: '',
    meetingDay: '',
  });
  const [loading, setLoading] = useState(false);

  // Check if user has permission to create cell groups
  const canCreateCellGroups = profile?.isAdmin || profile?.role === 'admin' || 
                            profile?.permissions?.includes('manage_groups');

  useEffect(() => {
    fetchCellGroups();
    fetchMembers();
  }, []);

  const fetchCellGroups = async () => {
    setLoading(true);
    try {
      // Corrected query - using proper relationship
      const { data, error } = await supabase
        .from('cell_groups')
        .select(`
          *,
          leader:members!cell_groups_leader_id_fkey(
            name, 
            surname
          )
        `)
        .order('name');

      if (error) {
        console.error('Error fetching cell groups:', error);
      } else {
        console.log('Fetched cell groups:', data);
        setCellGroups(data || []);
      }
    } catch (error) {
      console.error('Error in fetchCellGroups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      // Only fetch members if user has permission to create groups
      if (!canCreateCellGroups) return;

      const { data, error } = await supabase
        .from('members')
        .select('id, name, surname')
        .order('name');

      if (error) {
        console.error('Error fetching members:', error);
      } else {
        setMembers(data || []);
      }
    } catch (error) {
      console.error('Error in fetchMembers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Double-check permissions before submitting
    if (!canCreateCellGroups) {
      alert('You do not have permission to create cell groups');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cell_groups')
        .insert({
          name: formData.groupName,
          leader_id: formData.leaderId || null,
          location: formData.location || null,
          meeting_day: formData.meetingDay || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating cell group:', error);
        alert(`Error creating cell group: ${error.message}`);
      } else {
        console.log('Created cell group:', data);
        setShowForm(false);
        setFormData({ groupName: '', leaderId: '', location: '', meetingDay: '' });
        fetchCellGroups(); // Refresh the list
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('Error creating cell group');
    } finally {
      setLoading(false);
    }
  };

  // If you want to show a loading state
  if (loading && cellGroups.length === 0) {
    return (
      <div className="animate-fadeIn">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Cell Groups</h1>
        </div>
        <div className="text-center py-8">Loading cell groups...</div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">Cell Groups</h1>
        {canCreateCellGroups && (
          <button
            onClick={() => setShowForm(!showForm)}
            disabled={loading}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            {showForm ? 'Cancel' : 'Create Cell Group'}
          </button>
        )}
      </div>

      {showForm && canCreateCellGroups && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">Create New Cell Group</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Group Name</label>
                <input
                  type="text"
                  value={formData.groupName}
                  onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Leader</label>
                <select
                  value={formData.leaderId}
                  onChange={(e) => setFormData({ ...formData, leaderId: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  disabled={loading}
                >
                  <option value="">Select leader</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} {member.surname}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Meeting Day</label>
                <select
                  value={formData.meetingDay}
                  onChange={(e) => setFormData({ ...formData, meetingDay: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  disabled={loading}
                >
                  <option value="">Select day</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={loading}
                className="px-6 py-2 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Cell Group'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!canCreateCellGroups && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            You have view-only access to cell groups. Contact an administrator to create or modify groups.
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {cellGroups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No cell groups found.
          </div>
        ) : (
          cellGroups.map((group) => (
            <div key={group.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{group.name}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        Leader: {group.leader ? `${group.leader.name} ${group.leader.surname}` : 'No leader assigned'}
                      </span>
                    </div>
                    {group.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{group.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mt-2">
                    {group.meeting_day || 'No meeting day set'}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default Groups;
