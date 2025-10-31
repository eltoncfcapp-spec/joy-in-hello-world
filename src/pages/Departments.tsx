import { Plus, User, Phone, Users } from 'lucide-react';
import { useState } from 'react';

const Departments = () => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    departmentName: '',
    leaderName: '',
    leaderSurname: '',
    cellNumber: '',
    role: 'member',
  });

  const departments = [
    { id: 1, name: 'Worship Team', leader: 'Jane Smith', phone: '(555) 234-5678', members: 8 },
    { id: 2, name: 'Youth Ministry', leader: 'David Brown', phone: '(555) 567-8901', members: 15 },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('New department:', formData);
    setShowForm(false);
    setFormData({ departmentName: '', leaderName: '', leaderSurname: '', cellNumber: '', role: 'member' });
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">Departments</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="h-5 w-5" />
          {showForm ? 'Cancel' : 'Create Department'}
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">Create New Department</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Department Name</label>
                <input
                  type="text"
                  value={formData.departmentName}
                  onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                <input
                  type="text"
                  value={formData.leaderName}
                  onChange={(e) => setFormData({ ...formData, leaderName: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Surname</label>
                <input
                  type="text"
                  value={formData.leaderSurname}
                  onChange={(e) => setFormData({ ...formData, leaderSurname: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Cell Number</label>
                <input
                  type="tel"
                  value={formData.cellNumber}
                  onChange={(e) => setFormData({ ...formData, cellNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="member">Group Member</option>
                  <option value="leader">Leader</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Create Department
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {departments.map((dept) => (
          <div key={dept.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground mb-3">{dept.name}</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Leader: {dept.leader}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{dept.phone}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-2xl font-bold text-primary">{dept.members}</span>
                </div>
                <div className="text-sm text-muted-foreground">Members</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Departments;
