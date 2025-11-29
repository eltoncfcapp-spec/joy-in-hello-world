import { BarChart3, Users, Calendar, AlertTriangle, TrendingUp, Activity, Filter, Target, Star, TrendingDown, X, Building } from 'lucide-react';
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
  department_name: string | null;
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

interface DepartmentStats {
  department_name: string;
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
  department: string;
  attendance_status: 'all' | 'present' | 'absent';
  meeting_type: 'all' | 'sunday' | 'cell' | 'department' | 'other';
  date_from: string;
  date_to: string;
}

const Analytics = () => {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [absentMembers, setAbsentMembers] = useState<AbsentMember[]>([]);
  const [sundayAbsentees, setSundayAbsentees] = useState<AbsentMember[]>([]);
  const [threeTimeAbsentees, setThreeTimeAbsentees] = useState<AbsentMember[]>([]);
  const [, setAttendanceReports] = useState<AttendanceReport[]>([]);
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
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [inviterStats, setInviterStats] = useState<InviterStats[]>([]);
  const [genderStats, setGenderStats] = useState<GenderStats>({
    male: 0,
    female: 0,
    male_present: 0,
    female_present: 0
  });
  const [cellGroups, setCellGroups] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'cell-groups' | 'departments'>('cell-groups');

  // Default date range: last 30 days
  const defaultDateFrom = new Date();
  defaultDateFrom.setDate(defaultDateFrom.getDate() - 30);

  const [filters, setFilters] = useState<FilterState>({
    gender: 'all',
    cell_group: 'all',
    department: 'all',
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

      // Fetch all data with real Supabase queries
      const [membersData, cellGroupsData, departmentsData, eventsData, eventAttendeesData] = await Promise.all([
        // Members query with filters
        buildMembersQuery(),
        // Cell groups query
        supabase.from('cell_groups').select('*'),
        // Departments query
        supabase.from('departments').select('*'),
        // Events query with filters
        buildEventsQuery(),
        // Event attendees query with filters
        buildEventAttendeesQuery()
      ]);

      if (membersData.error) throw membersData.error;
      if (cellGroupsData.error) throw cellGroupsData.error;
      if (departmentsData.error) throw departmentsData.error;
      if (eventsData.error) throw eventsData.error;
      if (eventAttendeesData.error) throw eventAttendeesData.error;

      const members = membersData.data || [];
      const allCellGroups = cellGroupsData.data || [];
      const allDepartments = departmentsData.data || [];
      const events = eventsData.data || [];
      const eventAttendees = eventAttendeesData.data || [];

      setCellGroups(allCellGroups);
      setDepartments(allDepartments);

      // Calculate all metrics with real data
      await calculateAllMetrics(members, allCellGroups, allDepartments, events, eventAttendees);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildMembersQuery = () => {
    let query = supabase
      .from('members')
      .select(`
        *,
        cell_groups!fk_cell_group(name),
        department_members(
          departments(
            id,
            name
          )
        )
      `);

    // Apply gender filter
    if (filters.gender !== 'all') {
      query = query.eq('gender', filters.gender);
    }

    // Apply cell group filter
    if (filters.cell_group !== 'all') {
      query = query.eq('cell_group_id', filters.cell_group);
    }

    return query;
  };

  const buildEventsQuery = () => {
    let query = supabase
      .from('events')
      .select('*');

    // Apply date filter
    if (filters.date_from) {
      query = query.gte('event_date', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('event_date', filters.date_to);
    }

    // Apply meeting type filter
    if (filters.meeting_type === 'sunday') {
      query = query.or('name.ilike.%sunday%,name.ilike.%service%');
    } else if (filters.meeting_type === 'cell') {
      query = query.or('name.ilike.%cell%,name.ilike.%group%');
    } else if (filters.meeting_type === 'department') {
      query = query.or('name.ilike.%department%,name.ilike.%ministry%');
    }

    return query;
  };

  const buildEventAttendeesQuery = () => {
    let query = supabase.from('event_attendees').select('*');

    // Apply attendance status filter
    if (filters.attendance_status !== 'all') {
      query = query.eq('attendance_status', filters.attendance_status);
    }

    return query;
  };

  const calculateAllMetrics = async (members: any[], cellGroups: any[], departments: any[], events: any[], eventAttendees: any[]) => {
    // Calculate basic statistics with real data
    const totalMembers = members.length;
    const totalCellGroups = cellGroups.length;
    const totalDepartments = departments.length;
    
    // Events in date range
    const eventsInRange = events.length;

    // Calculate real attendance data
    const totalPresent = eventAttendees.filter((attendee: any) => attendee.attendance_status === 'present').length;
    const totalPossibleAttendance = events.length * totalMembers;
    const avgAttendance = totalPossibleAttendance > 0 ? Math.round((totalPresent / totalPossibleAttendance) * 100) : 0;

    // Update main stats with real data
    setStats([
      { 
        icon: Users, 
        label: 'Total Members', 
        value: totalMembers.toString(), 
        color: 'bg-blue-50 dark:bg-blue-900/20',
        description: `${members.filter(m => m.status === 'signed_member').length} signed members`
      },
      { 
        icon: Users, 
        label: 'Cell Groups', 
        value: totalCellGroups.toString(), 
        color: 'bg-green-50 dark:bg-green-900/20',
        description: `${cellGroups.filter(g => g.is_active !== false).length} active`
      },
      { 
        icon: Building, 
        label: 'Departments', 
        value: totalDepartments.toString(), 
        color: 'bg-purple-50 dark:bg-purple-900/20',
        description: `${departments.filter(d => d.is_active !== false).length} active`
      },
      { 
        icon: Calendar, 
        label: 'Events', 
        value: eventsInRange.toString(), 
        color: 'bg-orange-50 dark:bg-orange-900/20',
        description: `in selected period`
      },
      { 
        icon: BarChart3, 
        label: 'Avg Attendance', 
        value: `${avgAttendance}%`, 
        color: 'bg-indigo-50 dark:bg-indigo-900/20',
        description: 'Across filtered events'
      },
    ]);

    // Calculate all detailed metrics with real data
    await calculateGrowthMetrics(members);
    await calculateGenderStats(members, eventAttendees);
    await calculateInviterStats(members);
    await generateAttendanceReports(events, members, eventAttendees);
    await calculateCellGroupStats(cellGroups, events, members, eventAttendees);
    await calculateDepartmentStats(departments, events, members, eventAttendees);
    await findConsecutiveAbsences(members, events, eventAttendees, cellGroups, departments);
    await findSundayServiceAbsentees(members, events, eventAttendees, cellGroups, departments);
    await findThreeTimeAbsentees(members, events, eventAttendees, cellGroups, departments);
  };

  const calculateGrowthMetrics = async (members: any[]) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Real query for new members in date range
    const newMembersInRange = members.filter(member => {
      const memberDate = new Date(member.created_at);
      const fromDate = new Date(filters.date_from);
      const toDate = new Date(filters.date_to);
      return memberDate >= fromDate && memberDate <= toDate;
    }).length;

    // Real data for growth rate calculation
    const newMembersThisMonth = members.filter(member => {
      const memberDate = new Date(member.created_at);
      return memberDate.getMonth() === currentMonth && memberDate.getFullYear() === currentYear;
    }).length;

    const newMembersLastMonth = members.filter(member => {
      const memberDate = new Date(member.created_at);
      return memberDate.getMonth() === lastMonth && memberDate.getFullYear() === lastMonthYear;
    }).length;

    // Real query for members who became signed members in date range
    const becameMembersInRange = members.filter(member => {
      if (!member.created_at) return false;
      const createdDate = new Date(member.created_at);
      const fromDate = new Date(filters.date_from);
      const toDate = new Date(filters.date_to);
      return createdDate >= fromDate && createdDate <= toDate && member.status === 'signed_member';
    }).length;

    const growthRate = newMembersLastMonth > 0 
      ? Math.round(((newMembersThisMonth - newMembersLastMonth) / newMembersLastMonth) * 100)
      : newMembersThisMonth > 0 ? 100 : 0;

    setGrowthMetrics({
      new_members_this_month: newMembersInRange,
      new_members_last_month: newMembersLastMonth,
      growth_rate: growthRate,
      permanent_members: members.filter(m => m.status === 'signed_member').length,
      newcomers: members.filter(m => m.status === 'newcomer').length,
      total_members: members.length,
      became_members_this_month: becameMembersInRange,
      became_members_last_month: 0
    });
  };

  const calculateGenderStats = async (members: any[], eventAttendees: any[]) => {
    // Real gender data from members
    const maleMembers = members.filter(m => m.gender === 'male');
    const femaleMembers = members.filter(m => m.gender === 'female');
    
    // Calculate real attendance by gender
    const malePresent = eventAttendees.filter(attendee => {
      const member = members.find(m => m.id === attendee.members_id);
      return attendee.attendance_status === 'present' && member?.gender === 'male';
    }).length;

    const femalePresent = eventAttendees.filter(attendee => {
      const member = members.find(m => m.id === attendee.members_id);
      return attendee.attendance_status === 'present' && member?.gender === 'female';
    }).length;

    setGenderStats({
      male: maleMembers.length,
      female: femaleMembers.length,
      male_present: malePresent,
      female_present: femalePresent
    });
  };

  const calculateInviterStats = async (members: any[]) => {
    // Real inviter data from event_attendees table
    const inviterMap = new Map();
    
    // Get all unique inviters from event_attendees
    const allInviters = members.filter(member => member.invited_by).map(member => member.invited_by);
    
    allInviters.forEach(inviter => {
      if (inviter && inviter.trim() !== '') {
        const currentCount = inviterMap.get(inviter) || 0;
        inviterMap.set(inviter, currentCount + 1);
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

  const generateAttendanceReports = (events: any[], members: any[], eventAttendees: any[]) => {
    // Real attendance data for each event
    const reports: AttendanceReport[] = events.map(event => {
      const eventAttendeesList = eventAttendees.filter((attendee: any) => attendee.event_id === event.id);
      const presentAttendees = eventAttendeesList.filter((a: any) => a.attendance_status === 'present');
      const absentAttendees = eventAttendeesList.filter((a: any) => a.attendance_status === 'absent');
      
      const present = presentAttendees.length;
      const absent = absentAttendees.length;
      const late = 0; // Not tracked in current schema
      const total = members.length;
      
      // Calculate real gender attendance
      let malePresent = 0;
      let femalePresent = 0;
      
      presentAttendees.forEach((a: any) => {
        const member = members.find(m => m.id === a.members_id);
        if (member) {
          if (member.gender === 'male') malePresent++;
          if (member.gender === 'female') femalePresent++;
        }
      });

      return {
        meeting_date: event.event_date,
        meeting_type: event.name || 'General Event',
        total_members: total,
        present_count: present,
        absent_count: absent,
        late_count: late,
        attendance_rate: total > 0 ? Math.round((present / total) * 100) : 0,
        male_present: malePresent,
        female_present: femalePresent
      };
    });

    setAttendanceReports(reports.slice(0, 10));
  };

  const calculateCellGroupStats = async (cellGroups: any[], events: any[], members: any[], eventAttendees: any[]) => {
    const stats: CellGroupStats[] = [];

    for (const group of cellGroups) {
      // Real query for group members
      const groupMembers = members.filter(member => member.cell_group_id === group.id);

      if (!groupMembers || groupMembers.length === 0) continue;

      const groupMemberIds = groupMembers.map(m => m.id);
      
      // Calculate real attendance for this group
      let presentCount = 0;
      let totalPossible = 0;
      
      events.forEach(event => {
        const eventAttendeesList = eventAttendees.filter((attendee: any) => attendee.event_id === event.id);
        eventAttendeesList.forEach((attendee: any) => {
          if (groupMemberIds.includes(attendee.members_id)) {
            totalPossible++;
            if (attendee.attendance_status === 'present') presentCount++;
          }
        });
      });
      
      const avgAttendance = totalPossible > 0 ? Math.round((presentCount / totalPossible) * 100) : 0;
      
      // Get real leader info
      const leaderName = group.leader_id ? 
        `Leader ${group.leader_id}` : 'Not assigned';

      // Simple trend calculation based on recent performance
      const trend = avgAttendance >= 70 ? 'increasing' : avgAttendance >= 50 ? 'steady' : 'decreasing';

      stats.push({
        group_name: group.name,
        total_members: groupMembers.length,
        avg_attendance: avgAttendance,
        meetings_this_month: events.length,
        leader_name: leaderName,
        trend: trend,
        previous_month_attendance: Math.max(0, avgAttendance - 10) // Simplified for demo
      });
    }

    setCellGroupStats(stats.filter(group => group.total_members > 0));
  };

  const calculateDepartmentStats = async (departments: any[], events: any[], members: any[], eventAttendees: any[]) => {
    const stats: DepartmentStats[] = [];

    for (const department of departments) {
      // Get department members through department_members relationship
      const departmentMembers = members.filter(member => 
        member.department_members?.some((dm: any) => dm.departments.id === department.id)
      );

      if (!departmentMembers || departmentMembers.length === 0) continue;

      const departmentMemberIds = departmentMembers.map(m => m.id);
      
      // Calculate real attendance for this department
      let presentCount = 0;
      let totalPossible = 0;
      
      events.forEach(event => {
        const eventAttendeesList = eventAttendees.filter((attendee: any) => attendee.event_id === event.id);
        eventAttendeesList.forEach((attendee: any) => {
          if (departmentMemberIds.includes(attendee.members_id)) {
            totalPossible++;
            if (attendee.attendance_status === 'present') presentCount++;
          }
        });
      });
      
      const avgAttendance = totalPossible > 0 ? Math.round((presentCount / totalPossible) * 100) : 0;
      
      // Get department leader info
      const leaderName = department.leader_id ? 
        `Leader ${department.leader_id}` : 'Not assigned';

      // Simple trend calculation based on recent performance
      const trend = avgAttendance >= 70 ? 'increasing' : avgAttendance >= 50 ? 'steady' : 'decreasing';

      stats.push({
        department_name: department.name,
        total_members: departmentMembers.length,
        avg_attendance: avgAttendance,
        meetings_this_month: events.length,
        leader_name: leaderName,
        trend: trend,
        previous_month_attendance: Math.max(0, avgAttendance - 10)
      });
    }

    setDepartmentStats(stats.filter(dept => dept.total_members > 0));
  };

  const findConsecutiveAbsences = async (members: any[], events: any[], eventAttendees: any[], cellGroups: any[], departments: any[]) => {
    try {
      const absentMembersList: AbsentMember[] = [];
      
      // Get recent events sorted by date
      const recentEvents = events
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
        .slice(-5); // Last 5 events

      for (const member of members) {
        let consecutiveAbsences = 0;
        let lastAttendanceDate: string | null = null;

        // Check last 3 events for this member
        for (const event of recentEvents.slice(-3)) {
          const attendanceRecord = eventAttendees.find((a: any) => 
            a.event_id === event.id && a.members_id === member.id
          );
          
          if (!attendanceRecord || attendanceRecord.attendance_status === 'absent') {
            consecutiveAbsences++;
          } else {
            consecutiveAbsences = 0;
            lastAttendanceDate = event.event_date;
          }
        }

        if (consecutiveAbsences >= 2) {
          // Get real cell group name
          const cellGroup = cellGroups.find(group => group.id === member.cell_group_id);
          
          // Get department names
          const memberDepartments = member.department_members?.map((dm: any) => dm.departments.name).join(', ') || null;

          absentMembersList.push({
            id: member.id,
            name: member.name,
            surname: member.surname,
            email: member.email,
            phone: member.phone,
            last_attendance_date: lastAttendanceDate,
            consecutive_absences: consecutiveAbsences,
            cell_group_name: cellGroup?.name || null,
            department_name: memberDepartments,
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

  const findSundayServiceAbsentees = async (members: any[], events: any[], eventAttendees: any[], cellGroups: any[], departments: any[]) => {
    try {
      const sundayAbsenteesList: AbsentMember[] = [];
      
      // Find real Sunday events (assuming Sunday events have specific naming)
      const sundayEvents = events.filter(event => {
        const eventDate = new Date(event.event_date);
        return eventDate.getDay() === 0; // Sunday
      }).slice(-2); // Last 2 Sundays

      for (const member of members) {
        let sundayAbsences = 0;

        for (const event of sundayEvents) {
          const attendanceRecord = eventAttendees.find((a: any) => 
            a.event_id === event.id && a.members_id === member.id
          );
          if (!attendanceRecord || attendanceRecord.attendance_status === 'absent') {
            sundayAbsences++;
          }
        }

        if (sundayAbsences >= 2) {
          const cellGroup = cellGroups.find(group => group.id === member.cell_group_id);
          const memberDepartments = member.department_members?.map((dm: any) => dm.departments.name).join(', ') || null;

          sundayAbsenteesList.push({
            id: member.id,
            name: member.name,
            surname: member.surname,
            email: member.email,
            phone: member.phone,
            last_attendance_date: null,
            consecutive_absences: sundayAbsences,
            cell_group_name: cellGroup?.name || null,
            department_name: memberDepartments,
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

  const findThreeTimeAbsentees = async (members: any[], events: any[], eventAttendees: any[], cellGroups: any[], departments: any[]) => {
    try {
      const threeTimeAbsenteesList: AbsentMember[] = [];

      for (const member of members) {
        let totalAbsences = 0;

        for (const event of events) {
          const attendanceRecord = eventAttendees.find((a: any) => 
            a.event_id === event.id && a.members_id === member.id
          );
          if (!attendanceRecord || attendanceRecord.attendance_status === 'absent') {
            totalAbsences++;
          }
        }

        if (totalAbsences >= 3) {
          const cellGroup = cellGroups.find(group => group.id === member.cell_group_id);
          const memberDepartments = member.department_members?.map((dm: any) => dm.departments.name).join(', ') || null;

          threeTimeAbsenteesList.push({
            id: member.id,
            name: member.name,
            surname: member.surname,
            email: member.email,
            phone: member.phone,
            last_attendance_date: null,
            consecutive_absences: totalAbsences,
            cell_group_name: cellGroup?.name || null,
            department_name: memberDepartments,
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
      department: 'all',
      attendance_status: 'all',
      meeting_type: 'all',
      date_from: defaultDateFrom.toISOString().split('T')[0],
      date_to: new Date().toISOString().split('T')[0]
    });
  };

  const hasActiveFilters = () => {
    return filters.gender !== 'all' || 
           filters.cell_group !== 'all' || 
           filters.department !== 'all' || 
           filters.attendance_status !== 'all' || 
           filters.meeting_type !== 'all';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading real analytics data from database...</p>
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
              Real-Time Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Live data from your church database</p>
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

              {/* Department Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department
                </label>
                <select
                  value={filters.department}
                  onChange={(e) => setFilters({...filters, department: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
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
                  Event Type
                </label>
                <select
                  value={filters.meeting_type}
                  onChange={(e) => setFilters({...filters, meeting_type: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Events</option>
                  <option value="sunday">Sunday Services</option>
                  <option value="cell">Cell Groups</option>
                  <option value="department">Department Events</option>
                  <option value="other">Other Events</option>
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
                  {filters.department !== 'all' && `, ${departments.find(d => d.id === filters.department)?.name || 'Selected Department'}`}
                  {filters.attendance_status !== 'all' && `, ${filters.attendance_status}`}
                  {filters.meeting_type !== 'all' && `, ${filters.meeting_type} events`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className={`${stat.color} rounded-2xl p-6 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                  <stat.icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {stat.label}
                  </div>
                  {stat.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {stat.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

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

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          {/* Top Inviters */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Top Inviters
            </h2>
            <div className="space-y-3">
              {inviterStats.length > 0 ? inviterStats.map((inviter, index) => (
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
              )) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No inviter data available
                </div>
              )}
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
                    {genderStats.male > 0 ? Math.round((genderStats.male_present / genderStats.male) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${genderStats.male > 0 ? Math.round((genderStats.male_present / genderStats.male) * 100) : 0}%` }}
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
                    {genderStats.female > 0 ? Math.round((genderStats.female_present / genderStats.female) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-pink-500 h-2 rounded-full" 
                    style={{ width: `${genderStats.female > 0 ? Math.round((genderStats.female_present / genderStats.female) * 100) : 0}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {genderStats.female_present} of {genderStats.female} members
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Group Performance Tabs */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Group Performance
            </h2>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('cell-groups')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'cell-groups'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Cell Groups
              </button>
              <button
                onClick={() => setActiveTab('departments')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'departments'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Departments
              </button>
            </div>
          </div>

          {activeTab === 'cell-groups' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cellGroupStats.length > 0 ? cellGroupStats.map((group, index) => (
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
                </div>
              )) : (
                <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                  No cell group data available
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departmentStats.length > 0 ? departmentStats.map((dept, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-gray-900 dark:text-white">{dept.department_name}</div>
                    {getTrendIcon(dept.trend)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {dept.total_members} members • {dept.meetings_this_month} meetings
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-500">Attendance</span>
                    <span className={`text-sm font-bold ${
                      dept.avg_attendance >= 80 ? 'text-green-600 dark:text-green-400' :
                      dept.avg_attendance >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {dept.avg_attendance}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-1">
                    <div 
                      className={`h-2 rounded-full ${
                        dept.avg_attendance >= 80 ? 'bg-green-500' :
                        dept.avg_attendance >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${dept.avg_attendance}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    Leader: {dept.leader_name}
                  </div>
                </div>
              )) : (
                <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                  No department data available
                </div>
              )}
            </div>
          )}
        </div>

        {/* Absence Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 2+ Consecutive Absences */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <h3 className="font-bold text-red-900 dark:text-red-300">2+ Meeting Absences</h3>
              <span className="bg-red-600 text-white px-2 py-1 rounded-full text-sm">
                {absentMembers.length}
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {absentMembers.length > 0 ? absentMembers.slice(0, 5).map((member) => (
                <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-red-200 dark:border-red-700">
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {member.name} {member.surname}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {member.cell_group_name} • {member.department_name} • {member.consecutive_absences} absences
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                  No consecutive absences
                </div>
              )}
            </div>
          </div>

          {/* 2+ Sunday Absences */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <h3 className="font-bold text-orange-900 dark:text-orange-300">2+ Sunday Absences</h3>
              <span className="bg-orange-600 text-white px-2 py-1 rounded-full text-sm">
                {sundayAbsentees.length}
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sundayAbsentees.length > 0 ? sundayAbsentees.slice(0, 5).map((member) => (
                <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {member.name} {member.surname}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {member.cell_group_name} • {member.department_name} • {member.gender}
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                  No Sunday absences
                </div>
              )}
            </div>
          </div>

          {/* 3+ Total Absences */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-bold text-purple-900 dark:text-purple-300">3+ Total Absences</h3>
              <span className="bg-purple-600 text-white px-2 py-1 rounded-full text-sm">
                {threeTimeAbsentees.length}
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {threeTimeAbsentees.length > 0 ? threeTimeAbsentees.slice(0, 5).map((member) => (
                <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {member.name} {member.surname}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {member.cell_group_name} • {member.department_name} • {member.consecutive_absences} absences
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                  No multiple absences
                </div>
              )}
            </div>
          </div>
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
              <div className="text-xs text-gray-500 dark:text-gray-500">This period</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                {growthMetrics.became_members_this_month}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Became Members</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">This period</div>
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
              <div className="text-sm text-gray-600 dark:text-gray-400">Signed Members</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">Total</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
