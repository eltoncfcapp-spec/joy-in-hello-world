import { Search, Plus, Mail, Phone, User } from 'lucide-react';
import { useState } from 'react';

const Members = () => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    memberType: 'new',
    name: '',
    surname: '',
    firstTime: 'no',
    invitedBy: '',
    cellGroup: '',
  });

  const members = [
    { id: 1, name: 'John', surname: 'Doe', email: 'john@example.com', phone: '(555) 123-4567', cellGroup: 'North Side Cell', firstTimer: false },
    { id: 2, name: 'Jane', surname: 'Smith', email: 'jane@example.com', phone: '(555) 234-5678', cellGroup: 'Youth Cell', firstTimer: false },
  ];

  const cellGroups = ['North Side Cell', 'Youth Cell', 'South Community Cell', 'No Cell Group'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('New member:', formData);
    setShowForm(false);
    setFormData({ memberType: 'new', name: '', surname: '', firstTime: 'no', invitedBy: '', cellGroup: '' });
  };

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
                <label className="block text-sm font-medium text-foreground mb-2">Member Type</label>
                <select
                  value={formData.memberType}
                  onChange={(e) => setFormData({ ...formData, memberType: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="new">New Member</option>
                  <option value="existing">Existing Member</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">First Time Coming?</label>
                <select
                  value={formData.firstTime}
                  onChange={(e) => setFormData({ ...formData, firstTime: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
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
                    <option key={group} value={group}>{group}</option>
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
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {members.map((member) => (
          <div key={member.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground mb-2">{member.name} {member.surname}</h3>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{member.cellGroup}</span>
                  </div>
                </div>
              </div>
              {member.firstTimer && (
                <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">First Timer</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Members;
