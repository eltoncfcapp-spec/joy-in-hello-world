import { Plus, Users, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CellGroup {
  id: string;
  name: string;
  location: string | null;
  meeting_day: string | null;
  leader: { name: string; surname: string } | null;
}

const CellGroups = () => {
  const [showForm, setShowForm] = useState(false);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; surname: string }[]>([]);
  const [formData, setFormData] = useState({
    groupName: '',
    leaderId: '',
    location: '',
    meetingDay: '',
  });

  useEffect(() => {
    fetchCellGroups();
    fetchMembers();
  }, []);

  const fetchCellGroups = async () => {
    const { data, error } = await supabase
      .from('cell_groups')
      .select(`
        id,
        name,
        location,
        meeting_day,
        leader:members!leader_id(name, surname)
      `)
      .order('name');

    if (error) {
      console.error('Error fetching cell groups:', error);
    } else {
      setCellGroups(data || []);
    }
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('id, name, surname')
      .order('name');

    if (error) {
      console.error('Error fetching members:', error);
    } else {
      setMembers(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from('cell_groups').insert({
      name: formData.groupName,
      leader_id: formData.leaderId || null,
      location: formData.location || null,
      meeting_day: formData.meetingDay || null,
    });

    if (error) {
      console.error('Error creating cell group:', error);
      alert('Error creating cell group');
    } else {
      setShowForm(false);
      setFormData({ groupName: '', leaderId: '', location: '', meetingDay: '' });
      fetchCellGroups();
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">Cell Groups</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="h-5 w-5" />
          {showForm ? 'Cancel' : 'Create Cell Group'}
        </button>
      </div>

      {showForm && (
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
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Leader</label>
                <select
                  value={formData.leaderId}
                  onChange={(e) => setFormData({ ...formData, leaderId: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
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
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Meeting Day</label>
                <select
                  value={formData.meetingDay}
                  onChange={(e) => setFormData({ ...formData, meetingDay: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
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
                className="px-6 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Save Cell Group
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {cellGroups.map((group) => (
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
        ))}
      </div>
    </div>
  );
};

export default CellGroups;
