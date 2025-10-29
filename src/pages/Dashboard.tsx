import { Users, Calendar, DollarSign, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const stats = [
    { icon: Users, label: 'Total Members', value: '324', change: '+12 this month', color: 'from-blue-500 to-blue-600' },
    { icon: Calendar, label: 'Upcoming Events', value: '8', change: 'Next: Sunday Service', color: 'from-purple-500 to-purple-600' },
    { icon: DollarSign, label: 'Monthly Donations', value: '$12,450', change: '+8% from last month', color: 'from-green-500 to-green-600' },
    { icon: TrendingUp, label: 'Active Groups', value: '15', change: '3 new this quarter', color: 'from-orange-500 to-orange-600' },
  ];

  return (
    <div className="animate-fadeIn">
      <h1 className="text-4xl font-bold gradient-text mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-background/10 backdrop-blur-xl border border-primary/20 rounded-xl p-6 hover:scale-105 transition-transform duration-200"
          >
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-2">{stat.value}</h3>
            <p className="text-foreground/60 text-sm mb-1">{stat.label}</p>
            <p className="text-primary text-xs">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background/10 backdrop-blur-xl border border-primary/20 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-foreground/80">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <p>John Doe joined the church</p>
            </div>
            <div className="flex items-center gap-3 text-foreground/80">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <p>New event: Youth Group Meeting</p>
            </div>
            <div className="flex items-center gap-3 text-foreground/80">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <p>Donation received: $500</p>
            </div>
          </div>
        </div>

        <div className="bg-background/10 backdrop-blur-xl border border-primary/20 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">Upcoming Events</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-primary pl-4">
              <h3 className="font-semibold text-foreground">Sunday Service</h3>
              <p className="text-sm text-foreground/60">Tomorrow, 10:00 AM</p>
            </div>
            <div className="border-l-4 border-primary/60 pl-4">
              <h3 className="font-semibold text-foreground">Prayer Meeting</h3>
              <p className="text-sm text-foreground/60">Wednesday, 7:00 PM</p>
            </div>
            <div className="border-l-4 border-primary/40 pl-4">
              <h3 className="font-semibold text-foreground">Bible Study</h3>
              <p className="text-sm text-foreground/60">Friday, 6:30 PM</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
