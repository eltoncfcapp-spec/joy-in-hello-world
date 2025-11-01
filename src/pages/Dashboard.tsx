import { Users, Calendar, DollarSign, TrendingUp, MoreVertical, ArrowUp, ArrowDown } from 'lucide-react';

const Dashboard = () => {
  const stats = [
    { 
      icon: Users, 
      label: 'Total Members', 
      value: '324', 
      change: '+12 this month', 
      changeType: 'positive',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20'
    },
    { 
      icon: Calendar, 
      label: 'Upcoming Events', 
      value: '8', 
      change: 'Next: Sunday Service', 
      changeType: 'info',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20'
    },
    { 
      icon: DollarSign, 
      label: 'Monthly Donations', 
      value: '$12,450', 
      change: '+8% from last month', 
      changeType: 'positive',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20'
    },
    { 
      icon: TrendingUp, 
      label: 'Active Groups', 
      value: '15', 
      change: '3 new this quarter', 
      changeType: 'positive',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20'
    },
  ];

  const recentActivities = [
    { 
      type: 'member', 
      message: 'John Doe joined the church', 
      time: '2 hours ago',
      color: 'bg-green-500',
      icon: Users
    },
    { 
      type: 'event', 
      message: 'New event: Youth Group Meeting', 
      time: '5 hours ago',
      color: 'bg-blue-500',
      icon: Calendar
    },
    { 
      type: 'donation', 
      message: 'Donation received: $500', 
      time: '1 day ago',
      color: 'bg-purple-500',
      icon: DollarSign
    },
    { 
      type: 'group', 
      message: 'New Bible study group formed', 
      time: '2 days ago',
      color: 'bg-orange-500',
      icon: TrendingUp
    },
  ];

  const upcomingEvents = [
    { 
      title: 'Sunday Service', 
      time: 'Tomorrow, 10:00 AM', 
      location: 'Main Sanctuary',
      priority: 'high',
      attendees: 120
    },
    { 
      title: 'Prayer Meeting', 
      time: 'Wednesday, 7:00 PM', 
      location: 'Prayer Room',
      priority: 'medium',
      attendees: 45
    },
    { 
      title: 'Bible Study', 
      time: 'Friday, 6:30 PM', 
      location: 'Fellowship Hall',
      priority: 'medium',
      attendees: 35
    },
    { 
      title: 'Youth Group', 
      time: 'Saturday, 4:00 PM', 
      location: 'Youth Center',
      priority: 'low',
      attendees: 25
    },
  ];

  const getChangeIcon = (type: string) => {
    if (type === 'positive') return <ArrowUp className="h-3 w-3" />;
    if (type === 'negative') return <ArrowDown className="h-3 w-3" />;
    return null;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-400';
      case 'medium': return 'border-yellow-400';
      case 'low': return 'border-green-400';
      default: return 'border-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-foreground/60">Welcome to your church management dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            AD
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:scale-105 transition-all duration-300 hover:shadow-xl hover:border-gray-300/50 dark:hover:border-gray-600/50"
          >
            {/* Background accent */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                </div>
                <MoreVertical className="h-5 w-5 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" />
              </div>
              
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {stat.value}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-3">
                {stat.label}
              </p>
              
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                stat.changeType === 'positive' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : stat.changeType === 'negative'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              }`}>
                {getChangeIcon(stat.changeType)}
                {stat.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
              View All
            </button>
          </div>
          
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors duration-200 group"
              >
                <div className={`w-10 h-10 rounded-full ${activity.color} flex items-center justify-center flex-shrink-0`}>
                  <activity.icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-white font-medium truncate">
                    {activity.message}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {activity.time}
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-gray-300 group-hover:bg-gray-400 transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upcoming Events</h2>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
              View Calendar
            </button>
          </div>
          
          <div className="space-y-4">
            {upcomingEvents.map((event, index) => (
              <div 
                key={index}
                className={`border-l-4 ${getPriorityColor(event.priority)} pl-4 py-3 rounded-r-lg hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors duration-200 group`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {event.title}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                    {event.attendees} attending
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                  {event.time}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {event.location}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 hover:scale-105 font-medium">
            Add New Member
          </button>
          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 hover:scale-105 font-medium">
            Create Event
          </button>
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-200 hover:scale-105 font-medium">
            Record Donation
          </button>
          <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all duration-200 hover:scale-105 font-medium">
            Send Announcement
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
