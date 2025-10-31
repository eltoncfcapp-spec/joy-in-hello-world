import { TrendingUp, TrendingDown } from 'lucide-react';

const Trends = () => {
  const trends = [
    { label: 'Total Members', value: 245, change: '+12%', trend: 'up', period: 'vs last month' },
    { label: 'Active Cell Groups', value: 18, change: '+3', trend: 'up', period: 'new this quarter' },
    { label: 'Event Attendance', value: 82, change: '+8%', trend: 'up', period: 'vs last month' },
    { label: 'New Members', value: 15, change: '+5', trend: 'up', period: 'this month' },
  ];

  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold text-foreground mb-8">Trends</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {trends.map((trend, index) => (
          <div key={index} className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-muted-foreground text-sm mb-1">{trend.label}</p>
                <p className="text-3xl font-bold text-foreground">{trend.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${trend.trend === 'up' ? 'bg-green-50' : 'bg-red-50'}`}>
                {trend.trend === 'up' ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${trend.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trend.change}
              </span>
              <span className="text-muted-foreground text-sm">{trend.period}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground mb-4">Growth Overview</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground">Member Growth</span>
              <span className="font-semibold text-foreground">85%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground">Event Participation</span>
              <span className="font-semibold text-foreground">72%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '72%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground">Cell Group Engagement</span>
              <span className="font-semibold text-foreground">68%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: '68%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Trends;
