import { BarChart3, Users, Calendar } from 'lucide-react';

const Analytics = () => {
  const stats = [
    { icon: Users, label: 'Total Members', value: '245', color: 'bg-blue-50' },
    { icon: Users, label: 'Cell Groups', value: '18', color: 'bg-green-50' },
    { icon: Calendar, label: 'Events This Month', value: '12', color: 'bg-purple-50' },
    { icon: BarChart3, label: 'Avg Attendance', value: '82%', color: 'bg-orange-50' },
  ];

  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold text-foreground mb-8">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className={`${stat.color} border border-border rounded-xl p-6`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white rounded-lg">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-muted-foreground text-sm">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">Member Demographics</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">Youth (18-25)</span>
                <span className="font-semibold text-foreground">35%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '35%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">Adults (26-50)</span>
                <span className="font-semibold text-foreground">45%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">Seniors (50+)</span>
                <span className="font-semibold text-foreground">20%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '20%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">Attendance by Event Type</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Sunday Service</span>
              <span className="font-bold text-foreground">220</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Wednesday Prayer</span>
              <span className="font-bold text-foreground">85</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Youth Meetings</span>
              <span className="font-bold text-foreground">45</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Cell Groups</span>
              <span className="font-bold text-foreground">150</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
