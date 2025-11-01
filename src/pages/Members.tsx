import { Search, Plus, Mail, Phone, User, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  cell_group_id: string | null;
  is_permanent_member: boolean;
  permanent_member_date: string | null;
  cell_groups: { name: string } | null;
}

const Members = () => {
  const [showForm, setShowForm] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [cellGroups, setCellGroups] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    firstTime: 'no',
    invitedBy: '',
    cellGroup: '',
  });

  useEffect(() => {
    fetchMembers();
    fetchCellGroups();
  }, []);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select(`
        *,
        cell_groups(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching members:', error);
    } else {
      setMembers(data || []);
    }
  };

  const fetchCellGroups = async () => {
    const { data, error } = await supabase
      .from('cell_groups')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error fetching cell groups:', error);
    } else {
      setCellGroups(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from('members').insert({
      name: formData.name,
      surname: formData.surname,
      email: formData.email || null,
      phone: formData.phone || null,
      cell_group_id: formData.cellGroup || null,
      invited_by: formData.invitedBy || null,
    });

    if (error) {
      console.error('Error adding member:', error);
      alert('Error adding member');
    } else {
      setShowForm(false);
      setFormData({ name: '', surname: '', email: '', phone: '', firstTime: 'no', invitedBy: '', cellGroup: '' });
      fetchMembers();
    }
  };

  const handleMarkAsPermanent = async (memberId: string) => {
    const { error } = await supabase
      .from('members')
      .update({
        is_permanent_member: true,
        permanent_member_date: new Date().toISOString(),
      })
      .eq('id', memberId);

    if (error) {
      console.error('Error marking as permanent:', error);
      alert('Error updating member');
    } else {
      fetchMembers();
    }
  };

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.surname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">Members Directory</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="h-5 w-5" />
          {showForm ? 'Cancel' : 'Add Member'}
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">Add New Member</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Surname</label>
                <input
                  type="text"
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Invited By</label>
                <input
                  type="text"
                  value={formData.invitedBy}
                  onChange={(e) => setFormData({ ...formData, invitedBy: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Cell Group</label>
                <select
                  value={formData.cellGroup}
                  onChange={(e) => setFormData({ ...formData, cellGroup: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select cell group</option>
                  {cellGroups.map((group) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Add Member
            </button>
          </form>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredMembers.map((member) => (
          <div key={member.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold text-foreground">{member.name} {member.surname}</h3>
                  {member.is_permanent_member && (
                    <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-medium">
                      Permanent Member
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {member.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{member.email}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{member.cell_groups?.name || 'No Cell Group'}</span>
                  </div>
                  {member.permanent_member_date && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Permanent since: {new Date(member.permanent_member_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              {!member.is_permanent_member && (
                <button
                  onClick={() => handleMarkAsPermanent(member.id)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  Mark as Permanent
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Members;
