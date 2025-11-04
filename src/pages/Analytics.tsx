import { BarChart3, Users, Calendar, AlertTriangle, TrendingUp, Activity, FileText, Download, Filter, Target, Star, TrendingDown, X } from 'lucide-react';
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

interface FilterState {
  gender: 'all' | 'male' | 'female';
  cell_group: string;
  attendance_status: 'all' | 'present' | 'absent';
  meeting_type: 'all' | 'sunday' | 'cell' | 'other';
  date_from: string;
  date_to: string;
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
  const [cellGroups, setCellGroups] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Default date range: last 30 days
  const defaultDateFrom = new Date();
  defaultDateFrom.setDate(defaultDateFrom.getDate() - 30);

  const [filters, setFilters] = useState<FilterState>({
    gender: 'all',
    cell_group: 'all',
    attendance_status: 'all',
    meeting_type: 'all',
    date_from: defaultDateFrom.toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [filters]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Fetch all data with filters applied
      const [membersData, groupsData, meetingsData, attendanceData, cellGroupsData] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('cell_groups').select('*, members(name, surname)'),
        buildMeetingsQuery(),
        buildAttendanceQuery(),
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
      const allCellGroups = cellGroupsData.data || [];

      setCellGroups(allCellGroups);

      // Calculate all metrics with filtered data
      await calculateAllMetrics(members, groups, meetings, allAttendance, allCellGroups);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildMeetingsQuery = () => {
    let query = supabase
      .from('meetings')
      .select('*, attendance(status, member_id, notes)');

    // Apply date filter
    if (filters.date_from) {
      query = query.gte('meeting_date', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('meeting_date', filters.date_to);
    }

    // Apply meeting type filter
    if (filters.meeting_type === 'sunday') {
      query = query.ilike('topic', '%sunday%');
    } else if (filters.meeting_type === 'cell') {
      query = query.ilike('topic', '%cell%');
    }

    return query;
  };

  const buildAttendanceQuery = () => {
    let query = supabase.from('attendance').select('*');

    // Apply date filter through meetings join
    if (filters.date_from || filters.date_to) {
      query = query
        .select('*, meetings!inner(meeting_date)')
        .gte('meetings.meeting_date', filters.date_from)
        .lte('meetings.meeting_date', filters.date_to);
    }

    // Apply attendance status filter
    if (filters.attendance_status !== 'all') {
      query = query.eq('status', filters.attendance_status);
    }

    return query;
  };

  const calculateAllMetrics = async (members: any[], groups: any[], meetings: any[], attendance: any[], cellGroups: any[]) => {
    // Filter members based on gender and cell group
    let filteredMembers = members;
    
    if (filters.gender !== 'all') {
      filteredMembers = filteredMembers.filter(m => m.gender === filters.gender);
    }
    
    if (filters.cell_group !== 'all') {
      filteredMembers = filteredMembers.filter(m => m.cell_group_id === filters.cell_group);
    }

    // Basic statistics with filtered data
    const totalMembers = filteredMembers.length;
    const totalGroups = groups.length;
    
    // Events in date range
    const eventsInRange = meetings.length;

    // Average attendance calculation with filtered data
    const totalPresent = meetings.reduce((acc, meeting) => {
      const meetingAttendance = meeting.attendance || [];
      const presentCount = meetingAttendance.filter((a: any) => {
        const member = filteredMembers.find(m => m.id === a.member_id);
        return a.status === 'present' && member;
      }).length;
      return acc + presentCount;
    }, 0);
    
    const avgAttendance = meetings.length > 0 ? Math.round((totalPresent / (meetings.length * totalMembers)) * 100) : 0;

    // Update main stats
    setStats([
      { 
        icon: Users, 
        label: 'Total Members', 
        value: totalMembers.toString(), 
        color: 'bg-blue-50 dark:bg-blue-900/20',
        description: `${filteredMembers.filter(m => m.is_permanent_member).length} permanent`
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
        value: eventsInRange.toString(), 
        color: 'bg-purple-50 dark:bg-purple-900/20',
        description: `in selected period`
      },
      { 
        icon: BarChart3, 
        label: 'Avg Attendance', 
        value: `${avgAttendance}%`, 
        color: 'bg-orange-50 dark:bg-orange-900/20',
        description: 'Across filtered meetings'
      },
    ]);

    // Calculate all detailed metrics with filtered data
    await calculateGrowthMetrics(filteredMembers);
    await calculateGenderStats(filteredMembers, attendance, meetings);
    await calculateInviterStats(filteredMembers);
    await generateAttendanceReports(meetings, filteredMembers);
    await calculateCellGroupStats(cellGroups, meetings, attendance, filteredMembers);
    await findConsecutiveAbsences(filteredMembers, attendance, meetings);
    await findSundayServiceAbsentees(filteredMembers, attendance, meetings);
    await findThreeTimeAbsentees(filteredMembers, attendance, meetings);
  };

  const calculateGrowthMetrics = async (members: any[]) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Filter by date range for new members
    const newMembersInRange = members.filter(member => {
      const memberDate = new Date(member.created_at);
      const fromDate = new Date(filters.date_from);
      const toDate = new Date(filters.date_to);
      return memberDate >= fromDate && memberDate <= toDate;
    }).length;

    // New members this month (for growth rate calculation)
    const newMembersThisMonth = members.filter(member => {
      const memberDate = new Date(member.created_at);
      return memberDate.getMonth() === currentMonth && memberDate.getFullYear() === currentYear;
    }).length;

    const newMembersLastMonth = members.filter(member => {
      const memberDate = new Date(member.created_at);
      return memberDate.getMonth() === lastMonth && memberDate.getFullYear() === lastMonthYear;
    }).length;

    // Members who became permanent in date range
    const becameMembersInRange = members.filter(member => {
      if (!member.permanent_member_date) return false;
      const permanentDate = new Date(member.permanent_member_date);
      const fromDate = new Date(filters.date_from);
      const toDate = new Date(filters.date_to);
      return permanentDate >= fromDate && permanentDate <= toDate;
    }).length;

    const growthRate = newMembersLastMonth > 0 
      ? Math.round(((newMembersThisMonth - newMembersLastMonth) / newMembersLastMonth) * 100)
      : newMembersThisMonth > 0 ? 100 : 0;

    setGrowthMetrics({
      new_members_this_month: newMembersInRange,
      new_members_last_month: newMembersLastMonth,
      growth_rate: growthRate,
      permanent_members: members.filter(m => m.is_permanent_member).length,
      newcomers: members.filter(m => m.status === 'newcomer').length,
      total_members: members.length,
      became_members_this_month: becameMembersInRange,
      became_members_last_month: 0 // Not calculated for previous period in filtered view
    });
  };

  const calculateGenderStats = async (members: any[], attendance: any[], meetings: any[]) => {
    const maleMembers = members.filter(m => m.gender === 'male');
    const femaleMembers = members.filter(m => m.gender === 'female');
    
    // Calculate attendance by gender for meetings in date range
    let malePresent = 0;
    let femalePresent = 0;

    meetings.forEach(meeting => {
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
      male_present: malePresent,
      female_present: femalePresent
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
      .slice(0, 10);

    setInviterStats(inviterStatsArray);
  };

  const generateAttendanceReports = (meetings: any[], members: any[]) => {
    const reports: AttendanceReport[] = meetings.map(meeting => {
      const presentAttendees = meeting.attendance?.filter((a: any) => a.status === 'present') || [];
      const absentAttendees = meeting.attendance?.filter((a: any) => a.status === 'absent') || [];
      const lateAttendees = meeting.attendance?.filter((a: any) => a.status === 'late') || [];
      
      // Filter attendees based on current member filters
      const present = presentAttendees.filter((a: any) => 
        members.some(m => m.id === a.member_id)
      ).length;
      
      const absent = absentAttendees.filter((a: any) => 
        members.some(m => m.id === a.member_id)
      ).length;
      
      const late = lateAttendees.filter((a: any) => 
        members.some(m => m.id === a.member_id)
      ).length;

      const total = members.length;
      
      // Calculate gender attendance with filtered members
      let malePresent = 0;
      let femalePresent = 0;
      
      presentAttendees.forEach((a: any) => {
        const member = members.find(m => m.id === a.member_id);
        if (member) {
          if (member.gender === 'male') malePresent++;
          if (member.gender === 'female') femalePresent++;
        }
      });

      return {
        meeting_date: meeting.meeting_date,
        meeting_type: meeting.topic || 'General Meeting',
        total_members: total,
        present_count: present,
        absent_count: absent,
        late_count: late,
        attendance_rate: total > 0 ? Math.round((present / total) * 100) : 0,
        male_present: malePresent,
        female_present: femalePresent
      };
    });

    setAttendanceReports(reports);
  };

  const calculateCellGroupStats = (cellGroups: any[], meetings: any[], attendance: any[], members: any[]) => {
    const stats: CellGroupStats[] = cellGroups.map(group => {
      const groupMembers = members.filter(m => m.cell_group_id === group.id);
      const groupMemberIds = groupMembers.map(m => m.id);
      
      // Filter meetings by date range
      const dateRangeMeetings = meetings.filter(meeting => {
        const meetingDate = new Date(meeting.meeting_date);
        const fromDate = new Date(filters.date_from);
        const toDate = new Date(filters.date_to);
        return meetingDate >= fromDate && meetingDate <= toDate;
      });
      
      let presentCount = 0;
      let totalPossible = 0;
      
      dateRangeMeetings.forEach(meeting => {
        meeting.attendance?.forEach((a: any) => {
          if (groupMemberIds.includes(a.member_id)) {
            totalPossible++;
            if (a.status === 'present') presentCount++;
          }
        });
      });
      
      const avgAttendance = totalPossible > 0 ? Math.round((presentCount / totalPossible) * 100) : 0;
      
      // Calculate trend based on first vs second half of period
      const midPoint = new Date(filters.date_from);
      midPoint.setDate(midPoint.getDate() + Math.floor((new Date(filters.date_to).getTime() - midPoint.getTime()) / (2 * 24 * 60 * 60 * 1000)));
      
      const firstHalfMeetings = dateRangeMeetings.filter(m => new Date(m.meeting_date) < midPoint);
      const secondHalfMeetings = dateRangeMeetings.filter(m => new Date(m.meeting_date) >= midPoint);
      
      let firstHalfPresent = 0;
      let firstHalfTotal = 0;
      let secondHalfPresent = 0;
      let secondHalfTotal = 0;
      
      firstHalfMeetings.forEach(meeting => {
        meeting.attendance?.forEach((a: any) => {
          if (groupMemberIds.includes(a.member_id)) {
            firstHalfTotal++;
            if (a.status === 'present') firstHalfPresent++;
          }
        });
      });
      
      secondHalfMeetings.forEach(meeting => {
        meeting.attendance?.forEach((a: any) => {
          if (groupMemberIds.includes(a.member_id)) {
            secondHalfTotal++;
            if (a.status === 'present') secondHalfPresent++;
          }
        });
      });
      
      const firstHalfAttendance = firstHalfTotal > 0 ? Math.round((firstHalfPresent / firstHalfTotal) * 100) : 0;
      const secondHalfAttendance = secondHalfTotal > 0 ? Math.round((secondHalfPresent / secondHalfTotal) * 100) : 0;
      
      // Determine trend
      let trend: 'increasing' | 'decreasing' | 'steady' = 'steady';
      if (secondHalfAttendance > firstHalfAttendance + 5) trend = 'increasing';
      else if (secondHalfAttendance < firstHalfAttendance - 5) trend = 'decreasing';

      return {
        group_name: group.name,
        total_members: groupMembers.length,
        avg_attendance: avgAttendance,
        meetings_this_month: dateRangeMeetings.length,
        leader_name: group.leader ? `${group.leader.name} ${group.leader.surname}` : 'Not assigned',
        trend: trend,
        previous_month_attendance: firstHalfAttendance
      };
    }).filter(group => group.total_members > 0); // Only show groups with members

    setCellGroupStats(stats);
  };

  const findConsecutiveAbsences = async (members: any[], attendance: any[], meetings: any[]) => {
    try {
      const absentMembersList: AbsentMember[] = [];
      
      // Use date range for recent meetings
      const recentMeetings = meetings
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

        // Get last 3 meetings for this member
        const memberMeetings = recentMeetings.filter(meeting => 
          meeting.attendance?.some((a: any) => a.member_id === member.id)
        ).slice(-3);

        for (const meeting of memberMeetings) {
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
      
      // Find Sunday meetings in date range
      const sundayMeetings = meetings.filter(meeting => {
        const meetingDate = new Date(meeting.meeting_date);
        return meetingDate.getDay() === 0; // Sunday
      });

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

      for (const member of members) {
        const memberAttendance = attendance.filter(a => a.member_id === member.id);
        let totalAbsences = 0;

        for (const meeting of meetings) {
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

  const clearFilters = () => {
    setFilters({
      gender: 'all',
      cell_group: 'all',
      attendance_status: 'all',
      meeting_type: 'all',
      date_from: defaultDateFrom.toISOString().split('T')[0],
      date_to: new Date().toISOString().split('T')[0]
    });
  };

  const hasActiveFilters = () => {
    return filters.gender !== 'all' || 
           filters.cell_group !== 'all' || 
           filters.attendance_status !== 'all' || 
           filters.meeting_type !== 'all';
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
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Advanced Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Real-time data with advanced filtering</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters() && (
                <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                  Active
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filter Analytics</h3>
              <div className="flex gap-2">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                  Clear All
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Gender Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gender
                </label>
                <select
                  value={filters.gender}
                  onChange={(e) => setFilters({...filters, gender: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Genders</option>
                  <option value="male">Male Only</option>
                  <option value="female">Female Only</option>
                </select>
              </div>

              {/* Cell Group Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cell Group
                </label>
                <select
                  value={filters.cell_group}
                  onChange={(e) => setFilters({...filters, cell_group: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Groups</option>
                  {cellGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              {/* Attendance Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Attendance Status
                </label>
                <select
                  value={filters.attendance_status}
                  onChange={(e) => setFilters({...filters, attendance_status: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="present">Present Only</option>
                  <option value="absent">Absent Only</option>
                </select>
              </div>

              {/* Meeting Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meeting Type
                </label>
                <select
                  value={filters.meeting_type}
                  onChange={(e) => setFilters({...filters, meeting_type: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Meetings</option>
                  <option value="sunday">Sunday Services</option>
                  <option value="cell">Cell Groups</option>
                  <option value="other">Other Meetings</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({...filters, date_from: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({...filters, date_to: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters() && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Active Filters: 
                  {filters.gender !== 'all' && ` ${filters.gender}`}
                  {filters.cell_group !== 'all' && `, ${cellGroups.find(g => g.id === filters.cell_group)?.name || 'Selected Group'}`}
                  {filters.attendance_status !== 'all' && `, ${filters.attendance_status}`}
                  {filters.meeting_type !== 'all' && `, ${filters.meeting_type} meetings`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{genderStats.male}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Male Members</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {genderStats.male_present} present
            </div>
          </div>
          <div className="bg-pink-50 dark:bg-pink-900/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">{genderStats.female}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Female Members</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {genderStats.female_present} present
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{growthMetrics.new_members_this_month}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">New Members</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">in period</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{growthMetrics.became_members_this_month}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Became Members</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">in period</div>
          </div>
        </div>

        {/* Rest of the analytics components remain the same as previous code */}
        {/* ... (Include the same components for Top Inviters, Gender Attendance, Cell Group Performance, Absence Alerts, etc.) ... */}

      </div>
    </div>
  );
};

export default Analytics;
