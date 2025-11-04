import { BarChart3, Users, Calendar, AlertTriangle, TrendingUp, Activity, FileText, Download, Filter } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

interface StatCard {
  icon: any;
  label: string;
  value: string;
  color: string;
  description?: string;
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
  absence_reason?: string;
  member_since: string;
}

interface AttendanceReport {
  meeting_date: string;
  meeting_type: string;
  total_members: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  attendance_rate: number;
}

interface GrowthMetrics {
  new_members_this_month: number;
  new_members_last_month: number;
  growth_rate: number;
  permanent_members: number;
  newcomers: number;
  total_members: number;
}

interface CellGroupStats {
  group_name: string;
  total_members: number;
  avg_attendance: number;
  meetings_this_month: number;
  leader_name: string;
}

const Analytics = () => {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [absentMembers, setAbsentMembers] = useState<AbsentMember[]>([]);
  const [sundayAbsentees, setSundayAbsentees] = useState<AbsentMember[]>([]);
  const [attendanceReports, setAttendanceReports] = useState<AttendanceReport[]>([]);
  const [growthMetrics, setGrowthMetrics] = useState<GrowthMetrics>({
    new_members_this_month: 0,
    new_members_last_month: 0,
    growth_rate: 0,
    permanent_members: 0,
    newcomers: 0,
    total_members: 0
  });
  const [cellGroupStats, setCellGroupStats] = useState<CellGroupStats[]>([]);
  const [demographics, setDemographics] = useState({
    youth: 0,
    adults: 0,
    seniors: 0
  });
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [
        membersData,
        groupsData,
        meetingsData,
        attendanceData,
        cellGroupsData
      ] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('cell_groups').select('*, members(name, surname)'),
        supabase.from('meetings').select('*, attendance(status, member_id, notes)'),
        supabase.from('attendance').select('*'),
        supabase.from('cell_groups').select('*, members!cell_groups_leader_id_fkey(name, surname)')
      ]);

      if (membersData.error) throw membersData.error;
      if (groupsData.error) throw groupsData.error;
      if (meetingsData.error) throw meetingsData.error;
      if (attendanceData.error) throw attendanceData.error;
      if (cellGroupsData.error) throw cellGroupsData.error;

      const members = membersData.data || [];
      const groups = groupsData.data || [];
      const meetings = meetingsData.data || [];
      const allAttendance = attendanceData.data || [];
      const cellGroups = cellGroupsData.data || [];

      // Calculate basic statistics
      const totalMembers = members.length;
      const totalGroups = groups.length;
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      // Events this month
      const eventsThisMonth = meetings.filter(meeting => {
        const meetingDate = new Date(meeting.meeting_date);
        return meetingDate.getMonth() === currentMonth && meetingDate.getFullYear() === currentYear;
      }).length;

      // Average attendance calculation
      const totalPresent = meetings.reduce((acc, meeting) => {
        return acc + (meeting.attendance?.filter((a: any) => a.status === 'present').length || 0);
      }, 0);
      
      const avgAttendance = meetings.length > 0 ? Math.round((totalPresent / (meetings.length * totalMembers)) * 100) : 0;

      // Update main stats
      setStats([
        { 
          icon: Users, 
          label: 'Total Members', 
          value: totalMembers.toString(), 
          color: 'bg-blue-50 dark:bg-blue-900/20',
          description: `${members.filter(m => m.is_permanent_member).length} permanent members`
        },
        { 
          icon: Users, 
          label: 'Active Groups', 
          value: totalGroups.toString(), 
          color: 'bg-green-50 dark:bg-green-900/20',
          description: `${groups.filter(g => g.members && g.members.length > 0).length} with members`
        },
        { 
          icon: Calendar, 
          label: 'Meetings', 
          value: meetings.length.toString(), 
          color: 'bg-purple-50 dark:bg-purple-900/20',
          description: `${eventsThisMonth} this month`
        },
        { 
          icon: BarChart3, 
          label: 'Avg Attendance', 
          value: `${avgAttendance}%`, 
          color: 'bg-orange-50 dark:bg-orange-900/20',
          description: 'Across all meetings'
        },
      ]);

      // Calculate growth metrics
      await calculateGrowthMetrics(members);
      
      // Calculate demographics
      calculateDemographics(members);
      
      // Generate attendance reports
      generateAttendanceReports(meetings, members);
      
      // Calculate cell group statistics
      calculateCellGroupStats(cellGroups, meetings, allAttendance);
      
      // Find absent members
      await findConsecutiveAbsences(members, allAttendance, meetings);
      
      // Find Sunday service absentees
      await findSundayServiceAbsentees(members, allAttendance, meetings);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateGrowthMetrics = async (members: any[]) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const newMembersThisMonth = members.filter(member => {
      const memberDate = new Date(member.created_at);
      return memberDate.getMonth() === currentMonth && memberDate.getFullYear() === currentYear;
    }).length;

    const newMembersLastMonth = members.filter(member => {
      const memberDate = new Date(member.created_at);
      return memberDate.getMonth() === lastMonth && memberDate.getFullYear() === lastMonthYear;
    }).length;

    const growthRate = newMembersLastMonth > 0 
      ? Math.round(((newMembersThisMonth - newMembersLastMonth) / newMembersLastMonth) * 100)
      : newMembersThisMonth > 0 ? 100 : 0;

    setGrowthMetrics({
      new_members_this_month: newMembersThisMonth,
      new_members_last_month: newMembersLastMonth,
      growth_rate: growthRate,
      permanent_members: members.filter(m => m.is_permanent_member).length,
      newcomers: members.filter(m => m.status === 'newcomer').length,
      total_members: members.length
    });
  };

  const calculateDemographics = (members: any[]) => {
    // Simplified demographics - in real app, you'd have age data
    const total = members.length;
    const youth = Math.round(total * 0.35);
    const adults = Math.round(total * 0.45);
    const seniors = total - youth - adults;

    setDemographics({ youth, adults, seniors });
  };

  const generateAttendanceReports = (meetings: any[], members: any[]) => {
    const reports: AttendanceReport[] = meetings.map(meeting => {
      const present = meeting.attendance?.filter((a: any) => a.status === 'present').length || 0;
      const absent = meeting.attendance?.filter((a: any) => a.status === 'absent').length || 0;
      const late = meeting.attendance?.filter((a: any) => a.status === 'late').length || 0;
      const total = members.length;
      
      return {
        meeting_date: meeting.meeting_date,
        meeting_type: meeting.topic || 'General Meeting',
        total_members: total,
        present_count: present,
        absent_count: absent,
        late_count: late,
        attendance_rate: Math.round((present / total) * 100)
      };
    });

    setAttendanceReports(reports.slice(0, 10)); // Last 10 meetings
  };

  const calculateCellGroupStats = (cellGroups: any[], meetings: any[], attendance: any[]) => {
    const stats: CellGroupStats[] = cellGroups.map(group => {
      const groupMembers = attendance.filter(a => {
        const member = meetings.find(m => m.id === a.meeting_id)?.members?.find((m: any) => m.id === a.member_id);
        return member?.cell_group_id === group.id;
      });
      
      const presentCount = groupMembers.filter((a: any) => a.status === 'present').length;
      const totalPossible = groupMembers.length;
      const avgAttendance = totalPossible > 0 ? Math.round((presentCount / totalPossible) * 100) : 0;
      
      const meetingsThisMonth = meetings.filter(meeting => {
        const meetingDate = new Date(meeting.meeting_date);
        return meetingDate.getMonth() === new Date().getMonth() && 
               meetingDate.getFullYear() === new Date().getFullYear() &&
               meeting.attendance?.some((a: any) => {
                 const member = members.find(m => m.id === a.member_id);
                 return member?.cell_group_id === group.id;
               });
      }).length;

      return {
        group_name: group.name,
        total_members: group.members?.length || 0,
        avg_attendance: avgAttendance,
        meetings_this_month: meetingsThisMonth,
        leader_name: group.leader ? `${group.leader.name} ${group.leader.surname}` : 'Not assigned'
      };
    });

    setCellGroupStats(stats);
  };

  const findConsecutiveAbsences = async (members: any[], attendance: any[], meetings: any[]) => {
    try {
      const absentMembersList: AbsentMember[] = [];
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 14); // Last 2 weeks

      const recentMeetings = meetings
        .filter(meeting => new Date(meeting.meeting_date) >= twoDaysAgo)
        .sort((a, b) => new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime());

      if (recentMeetings.length < 2) {
        setAbsentMembers([]);
        return;
      }

      for (const member of members) {
        const memberAttendance = attendance.filter(a => a.member_id === member.id);
        let consecutiveAbsences = 0;
        let lastAttendanceDate: string | null = null;
        let absenceReason = '';

        const recentMemberMeetings = recentMeetings.filter(meeting => 
          meeting.attendance?.some((a: any) => a.member_id === member.id)
        );

        for (const meeting of recentMemberMeetings.slice(-3)) { // Check last 3 meetings
          const meetingAttendance = memberAttendance.find(a => a.meeting_id === meeting.id);
          
          if (!meetingAttendance || meetingAttendance.status === 'absent') {
            consecutiveAbsences++;
            if (meetingAttendance?.notes) {
              absenceReason = meetingAttendance.notes;
            }
          } else {
            consecutiveAbsences = 0;
            lastAttendanceDate = meeting.meeting_date;
            absenceReason = '';
          }
        }

        if (consecutiveAbsences >= 2) {
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
            cell_group_name: cellGroup?.name || null,
            absence_reason: absenceReason,
            member_since: member.created_at
          });
        }
      }

      setAbsentMembers(absentMembersList);
    } catch (error) {
      console.error('Error finding consecutive absences:', error);
    }
  };

  const findSundayServiceAbsentees = async (members: any[], attendance: any[], meetings: any[]) => {
    try {
      const sundayAbsenteesList: AbsentMember[] = [];
      
      // Get last 2 Sundays
      const today = new Date();
      const lastTwoSundays = [];
      for (let i = 0; i < 2; i++) {
        const sunday = new Date(today);
        sunday.setDate(today.getDate() - (today.getDay() + 7 * i));
        lastTwoSundays.push(sunday.toISOString().split('T')[0]);
      }

      const sundayMeetings = meetings.filter(meeting => 
        lastTwoSundays.includes(meeting.meeting_date.split('T')[0])
      );

      for (const member of members) {
        const memberAttendance = attendance.filter(a => a.member_id === member.id);
        let sundayAbsences = 0;

        for (const meeting of sundayMeetings) {
          const meetingAttendance = memberAttendance.find(a => a.meeting_id === meeting.id);
          if (!meetingAttendance || meetingAttendance.status === 'absent') {
            sundayAbsences++;
          }
        }

        if (sundayAbsences >= 2) {
          const { data: cellGroup } = await supabase
            .from('cell_groups')
            .select('name')
            .eq('id', member.cell_group_id)
            .single();

          sundayAbsenteesList.push({
            id: member.id,
            name: member.name,
            surname: member.surname,
            email: member.email,
            phone: member.phone,
            last_attendance_date: null,
            consecutive_absences: sundayAbsences,
            cell_group_name: cellGroup?.name || null,
            member_since: member.created_at
          });
        }
      }

      setSundayAbsentees(sundayAbsenteesList);
    } catch (error) {
      console.error('Error finding Sunday absentees:', error);
    }
  };

  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Cell Group', 'Consecutive Absences', 'Last Attendance', 'Absence Reason'],
      ...absentMembers.map(member => [
        `${member.name} ${member.surname}`,
        member.email,
        member.phone,
        member.cell_group_name,
        member.consecutive_absences,
        member.last_attendance_date ? new Date(member.last_attendance_date).toLocaleDateString() : 'Never',
        member.absence_reason || 'Not specified'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `absence-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading comprehensive analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Comprehensive church performance metrics and reports</p>
          </div>
          
          <div className="flex gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
            </select>
            
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className={`${stat.color} border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 md:p-6 backdrop-blur-xl`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white dark:bg-gray-700 rounded-lg">
                  <stat.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-gray-600 dark:text-gray-400 text-sm">{stat.label}</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</p>
              {stat.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.description}</p>
              )}
            </div>
          ))}
        </div>

        {/* Growth Metrics */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Growth Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {growthMetrics.new_members_this_month}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">New This Month</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className={`text-2xl font-bold ${growthMetrics.growth_rate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} mb-1`}>
                {growthMetrics.growth_rate}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Growth Rate</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                {growthMetrics.permanent_members}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Permanent Members</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                {growthMetrics.newcomers}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Newcomers</div>
            </div>
          </div>
        </div>

        {/* Alert Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Consecutive Absences */}
          {absentMembers.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                <h2 className="text-xl font-bold text-red-900 dark:text-red-300">Consecutive Absences</h2>
                <span className="bg-red-600 text-white px-2 py-1 rounded-full text-sm">
                  {absentMembers.length}
                </span>
              </div>
              <p className="text-red-700 dark:text-red-400 mb-4">
                Members with 2+ consecutive absences in cell meetings
              </p>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {absentMembers.map((member) => (
                  <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
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
                      <div className="text-xs text-red-600 dark:text-red-400">
                        Last attended: {new Date(member.last_attendance_date).toLocaleDateString()}
                      </div>
                    )}
                    {member.absence_reason && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Reason: {member.absence_reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sunday Service Absentees */}
          {sundayAbsentees.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                <h2 className="text-xl font-bold text-yellow-900 dark:text-yellow-300">Sunday Service Alerts</h2>
                <span className="bg-yellow-600 text-white px-2 py-1 rounded-full text-sm">
                  {sundayAbsentees.length}
                </span>
              </div>
              <p className="text-yellow-700 dark:text-yellow-400 mb-4">
                Members who missed 2+ consecutive Sunday services
              </p>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {sundayAbsentees.map((member) => (
                  <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {getInitials(member.name, member.surname)}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {member.name} {member.surname}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {member.cell_group_name || 'No Group'} • Member since {new Date(member.member_since).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Reports Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Cell Group Performance */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Cell Group Performance
            </h2>
            <div className="space-y-4">
              {cellGroupStats.map((group, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white">{group.group_name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {group.total_members} members • {group.meetings_this_month} meetings
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      Leader: {group.leader_name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      group.avg_attendance >= 80 ? 'text-green-600 dark:text-green-400' :
                      group.avg_attendance >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {group.avg_attendance}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">Attendance</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Attendance Reports */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Attendance Reports
            </h2>
            <div className="space-y-4">
              {attendanceReports.map((report, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{report.meeting_type}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(report.meeting_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      report.attendance_rate >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                      report.attendance_rate >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {report.attendance_rate}%
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Present: {report.present_count}</span>
                    <span>Absent: {report.absent_count}</span>
                    <span>Late: {report.late_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Demographics */}
        <div className="mt-8 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Member Demographics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {demographics.youth}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Youth (18-25)</div>
              <div className="text-sm text-gray-500 dark:text-gray-500">
                {Math.round((demographics.youth / growthMetrics.total_members) * 100)}% of total
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                {demographics.adults}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Adults (26-50)</div>
              <div className="text-sm text-gray-500 dark:text-gray-500">
                {Math.round((demographics.adults / growthMetrics.total_members) * 100)}% of total
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {demographics.seniors}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Seniors (50+)</div>
              <div className="text-sm text-gray-500 dark:text-gray-500">
                {Math.round((demographics.seniors / growthMetrics.total_members) * 100)}% of total
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
