import { Search, Plus, Mail, Phone } from 'lucide-react';

const Members = () => {
  const members = [
    { id: 1, name: 'John Doe', email: 'john@example.com', phone: '(555) 123-4567', role: 'Elder', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '(555) 234-5678', role: 'Member', status: 'Active' },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', phone: '(555) 345-6789', role: 'Deacon', status: 'Active' },
    { id: 4, name: 'Sarah Williams', email: 'sarah@example.com', phone: '(555) 456-7890', role: 'Member', status: 'Active' },
    { id: 5, name: 'David Brown', email: 'david@example.com', phone: '(555) 567-8901', role: 'Youth Leader', status: 'Active' },
  ];

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold gradient-text">Members Directory</h1>
        <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg flex items-center gap-2 hover:scale-105 transition-transform duration-200">
          <Plus className="h-5 w-5" />
          Add Member
        </button>
      </div>

      <div className="bg-background/10 backdrop-blur-xl border border-primary/20 rounded-xl p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-foreground/40" />
          <input
            type="text"
            placeholder="Search members..."
            className="w-full pl-10 pr-4 py-3 bg-background/20 border border-primary/20 rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {members.map((member) => (
          <div
            key={member.id}
            className="bg-background/10 backdrop-blur-xl border border-primary/20 rounded-xl p-6 hover:scale-[1.02] transition-all duration-200"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground mb-2">{member.name}</h3>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-foreground/70">
                    <Mail className="h-4 w-4" />
                    <span>{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground/70">
                    <Phone className="h-4 w-4" />
                    <span>{member.phone}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">{member.role}</span>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">{member.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Members;
