import { Users, Plus, Calendar, User } from 'lucide-react';

const Groups = () => {
  const groups = [
    {
      id: 1,
      name: 'Youth Ministry',
      leader: 'David Brown',
      members: 45,
      meetingDay: 'Monday',
      meetingTime: '6:00 PM',
      category: 'Youth',
      description: 'Fellowship and spiritual growth for young people',
    },
    {
      id: 2,
      name: 'Women\'s Fellowship',
      leader: 'Sarah Williams',
      members: 32,
      meetingDay: 'Wednesday',
      meetingTime: '7:00 PM',
      category: 'Fellowship',
      description: 'Supporting and encouraging women in faith',
    },
    {
      id: 3,
      name: 'Men\'s Prayer Group',
      leader: 'John Doe',
      members: 28,
      meetingDay: 'Saturday',
      meetingTime: '7:00 AM',
      category: 'Prayer',
      description: 'Men gathering for prayer and accountability',
    },
    {
      id: 4,
      name: 'Worship Team',
      leader: 'Jane Smith',
      members: 15,
      meetingDay: 'Thursday',
      meetingTime: '7:30 PM',
      category: 'Worship',
      description: 'Leading the congregation in praise and worship',
    },
    {
      id: 5,
      name: 'Bible Study',
      leader: 'Mike Johnson',
      members: 38,
      meetingDay: 'Friday',
      meetingTime: '6:30 PM',
      category: 'Study',
      description: 'Deep dive into Scripture and theological discussion',
    },
  ];

  const categoryColors: Record<string, string> = {
    Youth: 'from-blue-500 to-blue-600',
    Fellowship: 'from-purple-500 to-purple-600',
    Prayer: 'from-green-500 to-green-600',
    Worship: 'from-orange-500 to-orange-600',
    Study: 'from-pink-500 to-pink-600',
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold gradient-text">Groups & Ministries</h1>
        <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg flex items-center gap-2 hover:scale-105 transition-transform duration-200">
          <Plus className="h-5 w-5" />
          Create Group
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groups.map((group) => (
          <div
            key={group.id}
            className="bg-background/10 backdrop-blur-xl border border-primary/20 rounded-xl p-6 hover:scale-[1.02] transition-all duration-200"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${categoryColors[group.category]} flex items-center justify-center`}>
                <Users className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground mb-1">{group.name}</h3>
                <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
                  {group.category}
                </span>
              </div>
            </div>

            <p className="text-foreground/70 mb-4">{group.description}</p>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-foreground/70">
                <User className="h-4 w-4" />
                <span>Leader: {group.leader}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground/70">
                <Users className="h-4 w-4" />
                <span>{group.members} Members</span>
              </div>
              <div className="flex items-center gap-2 text-foreground/70">
                <Calendar className="h-4 w-4" />
                <span>{group.meetingDay}s at {group.meetingTime}</span>
              </div>
            </div>

            <button className="w-full px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-colors">
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Groups;
