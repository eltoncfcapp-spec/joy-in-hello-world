import { BarChart3, Users, Calendar, AlertTriangle, TrendingUp, Activity, FileText, Download, Filter, Target, Star, TrendingDown } from 'lucide-react';
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
  gender: string;
}

interface AttendanceReport {
  meeting_date: string;
  meeting_type: string;
  total_members: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  attendance_rate: number;
  male_present: number;
  female_present: number;
}

interface GrowthMetrics {
  new_members_this_month: number;
  new_members_last_month: number;
  growth_rate: number;
  permanent_members: number;
  newcomers: number;
  total_members: number;
  became_members_this_month: number;
  became_members_last_month: number;
}

interface CellGroupStats {
  group_name: string;
  total_members: number;
  avg_attendance: number;
  meetings_this_month: number;
  leader_name: string;
  trend: 'increasing' | 'decreasing' | 'steady';
  previous_month_attendance: number;
}

interface InviterStats {
  invited_by: string;
  invite_count: number;
  new_members_count: number;
}

interface GenderStats {
  male: number;
  female: number;
  male_present: number;
  female_present: number;
}

const Analytics = () => {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [absentMembers, setAbsentMembers] = useState<AbsentMember[]>([]);
  const [sundayAbsentees, setSundayAbsentees] = useState<AbsentMember[]>([]);
  const [threeTimeAbsentees, setThreeTimeAbsentees] = useState<AbsentMember[]>([]);
  const [attendanceReports, setAttendanceReports] = useState<AttendanceReport[]>([]);
  const [growthMetrics, setGrowthMetrics] = useState<GrowthMetrics>({
    new_members_this_month: 0,
    new_members_last_month: 0,
    growth_rate: 0,
    permanent_members: 0,
    newcomers: 0,
    total_members: 0,
    became_members_this_month: 0,
    became_members_last_month: 0
  });
  const [cellGroupStats, setCellGroupStats] = useState<CellGroupStats[]>([]);
  const [inviterStats, setInviterStats] = useState<InviterStats[]>([]);
  const [genderStats, setGenderStats] = useState<GenderStats>({
    male: 0,
    female: 0,
    male_present: 0,
    female_present: 0
  });
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, dateRange]);

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

      // Calculate all metrics
      await calculateAllMetrics(members, groups, meetings, allAttendance, cellGroups);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAllMetrics = async (members: any[], groups: any[], meetings: any[], attendance: any[], cellGroups: any[]) => {
    // Basic statistics
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

    // Calculate all detailed metrics
    await calculateGrowthMetrics(members);
    await calculateGenderStats(members, attendance, meetings);
    await calculateInviterStats(members);
    await generateAttendanceReports(meetings, members);
    await calculateCellGroupStats(cellGroups, meetings, attendance, members);
    await findConsecutiveAbsences(members, attendance, meetings);
    await findSundayServiceAbsentees(members, attendance, meetings);
    await findThreeTimeAbsentees(members, attendance, meetings);
  };

  const calculateGrowthMetrics = async (members: any[]) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // New members (created date)
    const newMembersThisMonth = members.filter(member => {
      const memberDate = new Date(member.created_at);
      return memberDate.getMonth() === currentMonth && memberDate.getFullYear() === currentYear;
    }).length;

    const newMembersLastMonth = members.filter(member => {
      const memberDate = new Date(member.created_at);
      return memberDate.getMonth() === lastMonth && memberDate.getFullYear() === lastMonthYear;
    }).length;

    // Members who became permanent/baptized this month
    const becameMembersThisMonth = members.filter(member => {
      if (!member.permanent_member_date) return false;
      const permanentDate = new Date(member.permanent_member_date);
      return permanentDate.getMonth() === currentMonth && permanentDate.getFullYear() === currentYear;
    }).length;

    const becameMembersLastMonth = members.filter(member => {
      if (!member.permanent_member_date) return false;
      const permanentDate = new Date(member.permanent_member_date);
      return permanentDate.getMonth() === lastMonth && permanentDate.getFullYear() === lastMonthYear;
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
      total_members: members.length,
      became_members_this_month: becameMembersThisMonth,
      became_members_last_month: becameMembersLastMonth
    });
  };

  const calculateGenderStats = async (members: any[], attendance: any[], meetings: any[]) => {
    const maleMembers = members.filter(m => m.gender === 'male');
    const femaleMembers = members.filter(m => m.gender === 'female');
    
    // Calculate attendance by gender for recent meetings
    const recentMeetings = meetings.slice(-5); // Last 5 meetings
    
    let malePresent = 0;
    let femalePresent = 0;
    let totalMeetingsCount = recentMeetings.length;

    recentMeetings.forEach(meeting => {
      meeting.attendance?.forEach((a: any) => {
        if (a.status === 'present') {
          const member = members.find(m => m.id === a.member_id);
          if (member?.gender === 'male') malePresent++;
          if (member?.gender === 'female') femalePresent++;
        }
      });
    });

    setGenderStats({
      male: maleMembers.length,
      female: femaleMembers.length,
      male_present: Math.round(malePresent / totalMeetingsCount),
      female_present: Math.round(femalePresent / totalMeetingsCount)
    });
  };

  const calculateInviterStats = async (members: any[]) => {
    const inviterMap = new Map();
    
    members.forEach(member => {
      if (member.invited_by) {
        const currentCount = inviterMap.get(member.invited_by) || 0;
        inviterMap.set(member.invited_by, currentCount + 1);
      }
    });

    const inviterStatsArray: InviterStats[] = Array.from(inviterMap.entries())
      .map(([invited_by, invite_count]) => ({
        invited_by,
        invite_count,
        new_members_count: members.filter(m => m.invited_by === invited_by && m.status === 'newcomer').length
      }))
      .sort((a, b) => b.invite_count - a.invite_count)
      .slice(0, 10); // Top 10 inviters

    setInviterStats(inviterStatsArray);
  };

  const generateAttendanceReports = (meetings: any[], members: any[]) => {
    const reports: AttendanceReport[] = meetings.map(meeting => {
      const present = meeting.attendance?.filter((a: any) => a.status === 'present').length || 0;
      const absent = meeting.attendance?.filter((a: any) => a.status === 'absent').length || 0;
      const late = meeting.attendance?.filter((a: any) => a.status === 'late').length || 0;
      const total = members.length;
      
      // Calculate gender attendance
      let malePresent = 0;
      let femalePresent = 0;
      
      meeting.attendance?.forEach((a: any) => {
        if (a.status === 'present') {
          const member = members.find(m => m.id === a.member_id);
          if (member?.gender === 'male') malePresent++;
          if (member?.gender === 'female') femalePresent++;
        }
      });

      return {
        meeting_date: meeting.meeting_date,
        meeting_type: meeting.topic || 'General Meeting',
        total_members: total,
        present_count: present,
        absent_count: absent,
        late_count: late,
        attendance_rate: Math.round((present / total) * 100),
        male_present: malePresent,
        female_present: femalePresent
      };
    });

    setAttendanceReports(reports.slice(0, 10)); // Last 10 meetings
  };

  const calculateCellGroupStats = (cellGroups: any[], meetings: any[], attendance: any[], members: any[]) => {
    const stats: CellGroupStats[] = cellGroups.map(group => {
      const groupMembers = members.filter(m => m.cell_group_id === group.id);
      const groupMemberIds = groupMembers.map(m => m.id);
      
      // Current month attendance
      const currentMonth = new Date().getMonth();
      const currentMonthMeetings = meetings.filter(m => 
        new Date(m.meeting_date).getMonth() === currentMonth
      );
      
      let presentCount = 0;
      let totalPossible = 0;
      
      currentMonthMeetings.forEach(meeting => {
        meeting.attendance?.forEach((a: any) => {
          if (groupMemberIds.includes(a.member_id)) {
            totalPossible++;
            if (a.status === 'present') presentCount++;
          }
        });
      });
      
      const avgAttendance = totalPossible > 0 ? Math.round((presentCount / totalPossible) * 100) : 0;
      
      // Previous month attendance for trend
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthMeetings = meetings.filter(m => 
        new Date(m.meeting_date).getMonth() === lastMonth
      );
      
      let lastMonthPresent = 0;
      let lastMonthTotal = 0;
      
      lastMonthMeetings.forEach(meeting => {
        meeting.attendance?.forEach((a: any) => {
          if (groupMemberIds.includes(a.member_id)) {
            lastMonthTotal++;
            if (a.status === 'present') lastMonthPresent++;
          }
        });
      });
      
      const lastMonthAttendance = lastMonthTotal > 0 ? Math.round((lastMonthPresent / lastMonthTotal) * 100) : 0;
      
      // Determine trend
      let trend: 'increasing' | 'decreasing' | 'steady' = 'steady';
      if (avgAttendance > lastMonthAttendance + 5) trend = 'increasing';
      else if (avgAttendance < lastMonthAttendance - 5) trend = 'decreasing';

      return {
        group_name: group.name,
        total_members: groupMembers.length,
        avg_attendance: avgAttendance,
        meetings_this_month: currentMonthMeetings.length,
        leader_name: group.leader ? `${group.leader.name} ${group.leader.surname}` : 'Not assigned',
        trend: trend,
        previous_month_attendance: lastMonthAttendance
      };
    });

    setCellGroupStats(stats);
  };

  const findConsecutiveAbsences = async (members: any[], attendance: any[], meetings: any[]) => {
    try {
      const absentMembersList: AbsentMember[] = [];
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const recentMeetings = meetings
        .filter(meeting => new Date(meeting.meeting_date) >= twoWeeksAgo)
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

        for (const meeting of recentMemberMeetings.slice(-3)) {
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
            member_since: member.created_at,
            gender: member.gender || 'unknown'
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
            member_since: member.created_at,
            gender: member.gender || 'unknown'
          });
        }
      }

      setSundayAbsentees(sundayAbsenteesList);
    } catch (error) {
      console.error('Error finding Sunday absentees:', error);
    }
  };

  const findThreeTimeAbsentees = async (members: any[], attendance: any[], meetings: any[]) => {
    try {
      const threeTimeAbsenteesList: AbsentMember[] = [];
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const recentMeetings = meetings
        .filter(meeting => new Date(meeting.meeting_date) >= oneMonthAgo)
        .sort((a, b) => new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime());

      for (const member of members) {
        const memberAttendance = attendance.filter(a => a.member_id === member.id);
        let totalAbsences = 0;

        for (const meeting of recentMeetings) {
          const meetingAttendance = memberAttendance.find(a => a.meeting_id === meeting.id);
          if (!meetingAttendance || meetingAttendance.status === 'absent') {
            totalAbsences++;
          }
        }

        if (totalAbsences >= 3) {
          const { data: cellGroup } = await supabase
            .from('cell_groups')
            .select('name')
            .eq('id', member.cell_group_id)
            .single();

          threeTimeAbsenteesList.push({
            id: member.id,
            name: member.name,
            surname: member.surname,
            email: member.email,
            phone: member.phone,
            last_attendance_date: null,
            consecutive_absences: totalAbsences,
            cell_group_name: cellGroup?.name || null,
            member_since: member.created_at,
            gender: member.gender || 'unknown'
          });
        }
      }

      setThreeTimeAbsentees(threeTimeAbsenteesList);
    } catch (error) {
      console.error('Error finding three-time absentees:', error);
    }
  };

  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'steady') => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Target className="h-4 w-4 text-gray-500" />;
    }
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
              Advanced Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Comprehensive church metrics and detailed reports</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
            </select>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{genderStats.male}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Male Members</div>
          </div>
          <div className="bg-pink-50 dark:bg-pink-900/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">{genderStats.female}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Female Members</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{growthMetrics.new_members_this_month}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">New This Month</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{growthMetrics.became_members_this_month}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Became Members</div>
          </div>
        </div>

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          {/* Top Inviters */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Top Inviters
            </h2>
            <div className="space-y-3">
              {inviterStats.map((inviter, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{inviter.invited_by}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {inviter.new_members_count} new members
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {inviter.invite_count}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">invited</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gender Attendance */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gender Attendance
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 dark:text-gray-300">Male Attendance</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {Math.round((genderStats.male_present / genderStats.male) * 100) || 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${Math.round((genderStats.male_present / genderStats.male) * 100) || 0}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {genderStats.male_present} of {genderStats.male} members
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 dark:text-gray-300">Female Attendance</span>
                  <span className="font-bold text-pink-600 dark:text-pink-400">
                    {Math.round((genderStats.female_present / genderStats.female) * 100) || 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-pink-500 h-2 rounded-full" 
                    style={{ width: `${Math.round((genderStats.female_present / genderStats.female) * 100) || 0}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {genderStats.female_present} of {genderStats.female} members
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cell Group Performance with Trends */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Cell Group Performance & Trends
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cellGroupStats.map((group, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-gray-900 dark:text-white">{group.group_name}</div>
                  {getTrendIcon(group.trend)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {group.total_members} members • {group.meetings_this_month} meetings
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-500">Attendance</span>
                  <span className={`text-sm font-bold ${
                    group.avg_attendance >= 80 ? 'text-green-600 dark:text-green-400' :
                    group.avg_attendance >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {group.avg_attendance}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-1">
                  <div 
                    className={`h-2 rounded-full ${
                      group.avg_attendance >= 80 ? 'bg-green-500' :
                      group.avg_attendance >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${group.avg_attendance}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Leader: {group.leader_name}
                </div>
                {group.previous_month_attendance > 0 && (
                  <div className={`text-xs ${
                    group.trend === 'increasing' ? 'text-green-600 dark:text-green-400' :
                    group.trend === 'decreasing' ? 'text-red-600 dark:text-red-400' :
                    'text-gray-500 dark:text-gray-500'
                  }`}>
                    {group.trend === 'increasing' ? '↗' : group.trend === 'decreasing' ? '↘' : '→'} 
                    {' '}Last month: {group.previous_month_attendance}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Absence Alerts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 2+ Consecutive Absences */}
          {absentMembers.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h3 className="font-bold text-red-900 dark:text-red-300">2+ Cell Meeting Absences</h3>
                <span className="bg-red-600 text-white px-2 py-1 rounded-full text-sm">
                  {absentMembers.length}
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {absentMembers.slice(0, 5).map((member) => (
                  <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-red-200 dark:border-red-700">
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {member.name} {member.surname}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {member.cell_group_name} • {member.consecutive_absences} absences
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2+ Sunday Absences */}
          {sundayAbsentees.length > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <h3 className="font-bold text-orange-900 dark:text-orange-300">2+ Sunday Absences</h3>
                <span className="bg-orange-600 text-white px-2 py-1 rounded-full text-sm">
                  {sundayAbsentees.length}
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sundayAbsentees.slice(0, 5).map((member) => (
                  <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {member.name} {member.surname}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {member.cell_group_name} • {member.gender}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3+ Total Absences */}
          {threeTimeAbsentees.length > 0 && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-purple-900 dark:text-purple-300">3+ Total Absences</h3>
                <span className="bg-purple-600 text-white px-2 py-1 rounded-full text-sm">
                  {threeTimeAbsentees.length}
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {threeTimeAbsentees.slice(0, 5).map((member) => (
                  <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {member.name} {member.surname}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {member.cell_group_name} • {member.consecutive_absences} absences
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Growth Metrics */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Growth & Membership Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {growthMetrics.new_members_this_month}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">New Members</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">This month</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                {growthMetrics.became_members_this_month}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Became Members</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">This month</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className={`text-2xl font-bold ${
                growthMetrics.growth_rate >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'
              } mb-1`}>
                {growthMetrics.growth_rate}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Growth Rate</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">vs last month</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                {growthMetrics.permanent_members}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Permanent</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">Members</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
