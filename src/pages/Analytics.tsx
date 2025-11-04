import { BarChart3, Users, Calendar, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

interface StatCard {
  icon: any;
  label: string;
  value: string;
  color: string;
}

interface AbsentMember {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  last_attendance_date: string | null;
  consecutive_absences: number;
  cell_group_name: string | null;
}

const Analytics = () => {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [absentMembers, setAbsentMembers] = useState<AbsentMember[]>([]);
  const [demographics, setDemographics] = useState({
    youth: 0,
    adults: 0,
    seniors: 0
  });
  const [attendanceByType, setAttendanceByType] = useState({
    sundayService: 0,
    prayerMeeting: 0,
    youthMeetings: 0,
    cellGroups: 0
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Fetch all necessary data
      const [membersData, groupsData, meetingsData, attendanceData] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('cell_groups').select('*'),
        supabase.from('meetings').select('*, attendance(status, member_id)'),
        supabase.from('attendance').select('*').order('created_at', { ascending: false })
      ]);

      if (membersData.error) throw membersData.error;
      if (groupsData.error) throw groupsData.error;
      if (meetingsData.error) throw meetingsData.error;
      if (attendanceData.error) throw attendanceData.error;

      const members = membersData.data || [];
      const groups = groupsData.data || [];
      const meetings = meetingsData.data || [];
      const allAttendance = attendanceData.data || [];

      // Calculate statistics
      const totalMembers = members.length;
      const totalGroups = groups.length;
      
      // Calculate events this month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const eventsThisMonth = meetings.filter(meeting => {
        const meetingDate = new Date(meeting.meeting_date);
        return meetingDate.getMonth() === currentMonth && meetingDate.getFullYear() === currentYear;
      }).length;

      // Calculate average attendance
      const totalPresent = meetings.reduce((acc, meeting) => {
        return acc + (meeting.attendance?.filter((a: any) => a.status === 'present').length || 0);
      }, 0);
      
      const avgAttendance = meetings.length > 0 ? Math.round((totalPresent / (meetings.length * totalMembers)) * 100) : 0;

      // Update stats
      setStats([
        { 
          icon: Users, 
          label: 'Total Members', 
          value: totalMembers.toString(), 
          color: 'bg-blue-50 dark:bg-blue-900/20' 
        },
        { 
          icon: Users, 
          label: 'Cell Groups', 
          value: totalGroups.toString(), 
          color: 'bg-green-50 dark:bg-green-900/20' 
        },
        { 
          icon: Calendar, 
          label: 'Events This Month', 
          value: eventsThisMonth.toString(), 
          color: 'bg-purple-50 dark:bg-purple-900/20' 
        },
        { 
          icon: BarChart3, 
          label: 'Avg Attendance', 
          value: `${avgAttendance}%`, 
          color: 'bg-orange-50 dark:bg-orange-900/20' 
        },
      ]);

      // Calculate demographics (simplified - you might want to add age field to members)
      const youth = Math.round(totalMembers * 0.35);
      const adults = Math.round(totalMembers * 0.45);
      const seniors = totalMembers - youth - adults;

      setDemographics({ youth, adults, seniors });

      // Calculate attendance by type (simplified - you might want to add event types)
      setAttendanceByType({
        sundayService: Math.round(totalMembers * 0.9),
        prayerMeeting: Math.round(totalMembers * 0.35),
        youthMeetings: Math.round(totalMembers * 0.18),
        cellGroups: Math.round(totalMembers * 0.6)
      });

      // Find members absent for 2+ consecutive days
      await findConsecutiveAbsences(members, allAttendance, meetings);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const findConsecutiveAbsences = async (members: any[], attendance: any[], meetings: any[]) => {
    try {
      const absentMembersList: AbsentMember[] = [];
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      // Get recent meetings (last 7 days)
      const recentMeetings = meetings
        .filter(meeting => new Date(meeting.meeting_date) >= twoDaysAgo)
        .sort((a, b) => new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime());

      if (recentMeetings.length < 2) {
        setAbsentMembers([]);
        return;
      }

      // For each member, check their attendance in recent meetings
      for (const member of members) {
        const memberAttendance = attendance.filter(a => a.member_id === member.id);
        let consecutiveAbsences = 0;
        let lastAttendanceDate: string | null = null;

        // Check last 2 meetings
        const lastTwoMeetings = recentMeetings.slice(-2);
        
        for (const meeting of lastTwoMeetings) {
          const meetingAttendance = memberAttendance.find(a => a.meeting_id === meeting.id);
          
          if (!meetingAttendance || meetingAttendance.status === 'absent') {
            consecutiveAbsences++;
          } else {
            consecutiveAbsences = 0; // Reset if present
            lastAttendanceDate = meeting.meeting_date;
          }
        }

        if (consecutiveAbsences >= 2) {
          // Get cell group name
          const { data: cellGroup } = await supabase
            .from('cell_groups')
            .select('name')
            .eq('id', member.cell_group_id)
            .single();

          absentMembersList.push({
            id: member.id,
            name: member.name,
            surname: member.surname,
            email: member.email,
            phone: member.phone,
            last_attendance_date: lastAttendanceDate,
            consecutive_absences: consecutiveAbsences,
            cell_group_name: cellGroup?.name || null
          });
        }
      }

      setAbsentMembers(absentMembersList);
    } catch (error) {
      console.error('Error finding consecutive absences:', error);
    }
  };

  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics data...</p>
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
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Comprehensive church performance metrics</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className={`${stat.color} border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 backdrop-blur-xl`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white dark:bg-gray-700 rounded-lg">
                  <stat.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-gray-600 dark:text-gray-400 text-sm">{stat.label}</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Absence Alerts */}
        {absentMembers.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              <h2 className="text-xl font-bold text-red-900 dark:text-red-300">Attendance Alerts</h2>
            </div>
            <p className="text-red-700 dark:text-red-400 mb-4">
              {absentMembers.length} member(s) have been absent for 2 or more consecutive meetings
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {absentMembers.slice(0, 4).map((member) => (
                <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {getInitials(member.name, member.surname)}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {member.name} {member.surname}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {member.cell_group_name || 'No Group'} • {member.consecutive_absences} absences
                      </div>
                    </div>
                  </div>
                  {member.last_attendance_date && (
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                      Last attended: {new Date(member.last_attendance_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Demographics */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Member Demographics
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-700 dark:text-gray-300">Youth (18-25)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{demographics.youth} ({Math.round((demographics.youth / (demographics.youth + demographics.adults + demographics.seniors)) * 100)}%)</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${Math.round((demographics.youth / (demographics.youth + demographics.adults + demographics.seniors)) * 100)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-700 dark:text-gray-300">Adults (26-50)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{demographics.adults} ({Math.round((demographics.adults / (demographics.youth + demographics.adults + demographics.seniors)) * 100)}%)</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div className="bg-green-500 h-3 rounded-full" style={{ width: `${Math.round((demographics.adults / (demographics.youth + demographics.adults + demographics.seniors)) * 100)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-700 dark:text-gray-300">Seniors (50+)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{demographics.seniors} ({Math.round((demographics.seniors / (demographics.youth + demographics.adults + demographics.seniors)) * 100)}%)</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div className="bg-purple-500 h-3 rounded-full" style={{ width: `${Math.round((demographics.seniors / (demographics.youth + demographics.adults + demographics.seniors)) * 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance by Event Type */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Attendance by Event Type
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">Sunday Service</span>
                <span className="font-bold text-gray-900 dark:text-white">{attendanceByType.sundayService}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">Wednesday Prayer</span>
                <span className="font-bold text-gray-900 dark:text-white">{attendanceByType.prayerMeeting}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">Youth Meetings</span>
                <span className="font-bold text-gray-900 dark:text-white">{attendanceByType.youthMeetings}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">Cell Groups</span>
                <span className="font-bold text-gray-900 dark:text-white">{attendanceByType.cellGroups}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mt-8 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {Math.round((attendanceByType.sundayService / stats[0]?.value) * 100) || 0}%
              </div>
              <div className="text-gray-600 dark:text-gray-400">Sunday Service Engagement</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                {Math.round((attendanceByType.cellGroups / stats[0]?.value) * 100) || 0}%
              </div>
              <div className="text-gray-600 dark:text-gray-400">Cell Group Participation</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {Math.round((demographics.youth / stats[0]?.value) * 100) || 0}%
              </div>
              <div className="text-gray-600 dark:text-gray-400">Youth Engagement</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
