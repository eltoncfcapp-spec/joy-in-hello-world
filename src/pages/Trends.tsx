import { TrendingUp, TrendingDown, Users, UserCheck, UserX } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

// Type-safe wrapper for trends-related queries
const db = supabase as any;

interface TrendData {
  label: string;
  value: number;
  change: string;
  trend: 'up' | 'down';
  period: string;
}

interface MemberStats {
  total: number;
  newThisMonth: number;
  permanent: number;
  newcomers: number;
}

const Trends = () => {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberStats, setMemberStats] = useState<MemberStats>({
    total: 0,
    newThisMonth: 0,
    permanent: 0,
    newcomers: 0
  });
  const [growthData, setGrowthData] = useState({
    memberGrowth: 0,
    eventParticipation: 0,
    groupEngagement: 0
  });

  useEffect(() => {
    fetchTrendsData();
  }, []);

  const fetchTrendsData = async () => {
    try {
      setLoading(true);
      
      const { data: members, error: membersError } = await db
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (membersError) throw membersError;

      const { data: groups, error: groupsError } = await db
        .from('cell_groups')
        .select('*');

      if (groupsError) throw groupsError;

      const { data: meetings, error: meetingsError } = await db
        .from('meetings')
        .select('*, attendance(*)')
        .gte('meeting_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      if (meetingsError) throw meetingsError;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const newThisMonth = members?.filter((member: any) => {
        const memberDate = member.created_at ? new Date(member.created_at) : null;
        return memberDate && memberDate.getMonth() === currentMonth && memberDate.getFullYear() === currentYear;
      }).length || 0;

      const permanentMembers = members?.filter((member: any) => member.is_permanent_member).length || 0;
      const newcomers = members?.filter((member: any) => member.status === 'newcomer').length || 0;

      setMemberStats({
        total: members?.length || 0,
        newThisMonth,
        permanent: permanentMembers,
        newcomers
      });

      const calculatedTrends: TrendData[] = [
        {
          label: 'Total Members',
          value: members?.length || 0,
          change: newThisMonth > 0 ? `+${newThisMonth}` : '0',
          trend: newThisMonth > 0 ? 'up' : 'down',
          period: 'this month'
        },
        {
          label: 'Active Cell Groups',
          value: groups?.length || 0,
          change: groups?.length || 0 > 0 ? `+${groups?.length || 0}` : '0',
          trend: (groups?.length || 0) > 0 ? 'up' : 'down',
          period: 'active groups'
        },
        {
          label: 'Permanent Members',
          value: permanentMembers,
          change: `${Math.round((permanentMembers / (members?.length || 1)) * 100)}%`,
          trend: permanentMembers > 0 ? 'up' : 'down',
          period: 'of total members'
        },
        {
          label: 'New Members',
          value: newThisMonth,
          change: newThisMonth > 0 ? `+${newThisMonth}` : '0',
          trend: newThisMonth > 0 ? 'up' : 'down',
          period: 'this month'
        }
      ];

      setTrends(calculatedTrends);

      const totalMeetings = meetings?.length || 1;
      const totalAttendance = meetings?.reduce((acc: any, meeting: any) => 
        acc + (meeting.attendance?.filter((a: any) => a.status === 'present').length || 0), 0) || 0;
      
      const avgAttendance = Math.round((totalAttendance / (totalMeetings * (members?.length || 1))) * 100);

      setGrowthData({
        memberGrowth: Math.round((newThisMonth / (members?.length || 1)) * 100),
        eventParticipation: avgAttendance,
        groupEngagement: Math.round((groups?.length || 0) / (members?.length || 1) * 100)
      });

    } catch (error) {
      console.error('Error fetching trends data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading trends data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Trends & Insights
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Real-time church growth and engagement metrics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {trends.map((trend, index) => (
            <div key={index} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">{trend.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{trend.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${trend.trend === 'up' ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                  {trend.trend === 'up' ? (
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${trend.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {trend.change}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">{trend.period}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Growth Overview</h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-700 dark:text-gray-300 font-medium">Member Growth Rate</span>
                <span className="font-bold text-gray-900 dark:text-white">{growthData.memberGrowth}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${growthData.memberGrowth}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-700 dark:text-gray-300 font-medium">Event Participation</span>
                <span className="font-bold text-gray-900 dark:text-white">{growthData.eventParticipation}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${growthData.eventParticipation}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-700 dark:text-gray-300 font-medium">Group Engagement</span>
                <span className="font-bold text-gray-900 dark:text-white">{growthData.groupEngagement}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-purple-500 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${growthData.groupEngagement}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Member Status Distribution</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-gray-300">Total Members</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{memberStats.total}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-gray-700 dark:text-gray-300">Permanent Members</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{memberStats.permanent}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <UserX className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-gray-700 dark:text-gray-300">Newcomers</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{memberStats.newcomers}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Monthly Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">New Members This Month</span>
                <span className="font-bold text-green-600 dark:text-green-400">{memberStats.newThisMonth}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">Growth Rate</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{growthData.memberGrowth}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">Engagement Score</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{growthData.groupEngagement}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Trends;
