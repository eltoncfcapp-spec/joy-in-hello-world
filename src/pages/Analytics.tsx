import { BarChart3, Users, Calendar, AlertTriangle, TrendingUp, Activity, Filter, Target, Star, TrendingDown, X, Building, Printer, Droplets, MapPin, Download, RefreshCw, Eye, EyeOff, ChevronDown, ChevronRight, Search, Phone, Home, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

// Import the DetailedAbsenceModal component types and interfaces
interface MemberAbsenceDetails {
  // Member Information
  id: string;
  name: string;
  surname: string;
  phone: string | null;
  residence: string | null;
  gender: string;
  status: string;
  baptism: string | null;
  member_since: string;
  is_hidden: boolean;
  
  // Group Information
  cell_group_name: string | null;
  cell_group_location: string | null;
  department_names: string[];
  
  // Overall Statistics
  total_events: number;
  total_absences: number;
  total_present: number;
  absence_rate: number;
  last_attended_date: string | null;
  consecutive_absences: number;
  
  // Detailed Absence Records
  absence_records: {
    id: string;
    event_id: string;
    event_name: string;
    event_date: string;
    event_type: 'sunday' | 'cell' | 'department' | 'other';
    attendance_status: string;
    notes: string | null;
    event_location: string | null;
    cell_group_name: string | null;
    invited_by: string | null;
  }[];
  
  // Department Attendance
  department_attendance: {
    department_name: string;
    total_meetings: number;
    absences: number;
    attendance_rate: number;
    last_attended: string | null;
  }[];
  
  // Pattern Analysis
  absence_patterns: {
    pattern: string;
    count: number;
    percentage: number;
  }[];
  
  // Monthly Breakdown
  monthly_stats: {
    month: string;
    year: number;
    total_events: number;
    absences: number;
    attendance_rate: number;
    trend: 'improving' | 'declining' | 'stable';
  }[];
}

interface DetailedAbsenceModalProps {
  memberId: string;
  onClose: () => void;
}

const DetailedAbsenceModal: React.FC<DetailedAbsenceModalProps> = ({ memberId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [memberData, setMemberData] = useState<MemberAbsenceDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'absences' | 'departments' | 'patterns' | 'monthly'>('overview');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (memberId) {
      fetchMemberAbsenceDetails();
    }
  }, [memberId]);

  const fetchMemberAbsenceDetails = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch basic member information
      const { data: memberInfo, error: memberError } = await supabase
        .from('members')
        .select(`
          *,
          cell_groups!fk_cell_group(name, location),
          department_members!left(
            departments!inner(name)
          )
        `)
        .eq('id', memberId)
        .single();

      if (memberError) throw memberError;

      // 2. Fetch all event attendance records for this member
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('event_attendees')
        .select(`
          *,
          events!event_attendees_event_id_fkey(
            id,
            name,
            event_date,
            event_time,
            location,
            is_whole_church,
            target_groups,
            target_departments
          ),
          cell_groups!event_attendees_cell_group_id_fkey(name)
        `)
        .eq('members_id', memberId);

      if (attendanceError) throw attendanceError;

      // 3. Fetch department attendance records
      const { data: departmentAttendance, error: deptError } = await supabase
        .from('department_attendance')
        .select(`
          *,
          department_meetings!inner(
            id,
            meeting_date,
            department_id,
            departments!inner(name)
          )
        `)
        .eq('member_id', memberId);

      if (deptError && !deptError.message.includes('does not exist')) {
        console.warn('Department attendance error:', deptError);
      }
      
      // Sort attendance records by event date (descending) in JavaScript
      const sortedAttendanceRecords = (attendanceRecords || []).sort((a, b) => {
        const dateA = new Date(a.events?.event_date || 0).getTime();
        const dateB = new Date(b.events?.event_date || 0).getTime();
        return dateB - dateA;
      });
      
      // Sort department attendance by meeting date (descending) in JavaScript
      const sortedDeptAttendance = (departmentAttendance || []).sort((a, b) => {
        const dateA = new Date(a.department_meetings?.meeting_date || 0).getTime();
        const dateB = new Date(b.department_meetings?.meeting_date || 0).getTime();
        return dateB - dateA;
      });

      // 4. Process the data
      const processedData = processMemberData(
        memberInfo,
        sortedAttendanceRecords,
        sortedDeptAttendance
      );

      setMemberData(processedData);
    } catch (error) {
      console.error('Error fetching member absence details:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMemberData = (
    memberInfo: any,
    attendanceRecords: any[],
    departmentAttendance: any[]
  ): MemberAbsenceDetails => {
    // Calculate overall statistics
    const totalEvents = attendanceRecords.length;
    const absences = attendanceRecords.filter(record => 
      record.attendance_status === 'absent' || record.attendance_status === 'absent_with_reason'
    ).length;
    const presentCount = attendanceRecords.filter(record => 
      record.attendance_status === 'present'
    ).length;
    
    const absenceRate = totalEvents > 0 ? Math.round((absences / totalEvents) * 100) : 0;
    
    // Find last attended date
    const lastAttended = attendanceRecords
      .filter(record => record.attendance_status === 'present')
      .sort((a, b) => new Date(b.events?.event_date).getTime() - new Date(a.events?.event_date).getTime())[0]
      ?.events?.event_date || null;

    // Calculate consecutive absences
    let consecutiveAbsences = 0;
    let currentStreak = 0;
    
    const sortedRecords = [...attendanceRecords]
      .sort((a, b) => new Date(a.events?.event_date).getTime() - new Date(b.events?.event_date).getTime());
    
    sortedRecords.forEach(record => {
      if (record.attendance_status === 'absent' || record.attendance_status === 'absent_with_reason') {
        currentStreak++;
        consecutiveAbsences = Math.max(consecutiveAbsences, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    // Process detailed absence records
    const detailedAbsences = attendanceRecords.map(record => {
      const eventName = record.events?.name || 'Unknown Event';
      let eventType: 'sunday' | 'cell' | 'department' | 'other' = 'other';
      
      if (eventName.toLowerCase().includes('sunday') || eventName.toLowerCase().includes('service')) {
        eventType = 'sunday';
      } else if (eventName.toLowerCase().includes('cell') || eventName.toLowerCase().includes('group')) {
        eventType = 'cell';
      } else if (eventName.toLowerCase().includes('department') || eventName.toLowerCase().includes('ministry')) {
        eventType = 'department';
      }

      return {
        id: record.id,
        event_id: record.event_id,
        event_name: eventName,
        event_date: record.events?.event_date || '',
        event_type: eventType,
        attendance_status: record.attendance_status,
        notes: record.notes,
        event_location: record.events?.location,
        cell_group_name: record.cell_groups?.name,
        invited_by: record.invited_by
      };
    });

    // Process department attendance
    const deptAttendance = departmentAttendance.reduce((acc, record) => {
      const deptName = record.department_meetings?.departments?.name || 'Unknown Department';
      
      if (!acc[deptName]) {
        acc[deptName] = {
          total_meetings: 0,
          absences: 0,
          attendance_rate: 0,
          last_attended: null
        };
      }
      
      acc[deptName].total_meetings++;
      
      if (record.status === 'absent' || record.status === 'absent_with_reason') {
        acc[deptName].absences++;
      } else if (record.status === 'present') {
        const meetingDate = record.department_meetings?.meeting_date;
        if (!acc[deptName].last_attended || new Date(meetingDate) > new Date(acc[deptName].last_attended)) {
          acc[deptName].last_attended = meetingDate;
        }
      }
      
      acc[deptName].attendance_rate = acc[deptName].total_meetings > 0 
        ? Math.round(((acc[deptName].total_meetings - acc[deptName].absences) / acc[deptName].total_meetings) * 100)
        : 0;
      
      return acc;
    }, {} as Record<string, any>);

    // Analyze absence patterns
    const processedAbsencePatterns = analyzeAbsencePatterns(detailedAbsences);

    // Calculate monthly statistics
    const monthlyStats = calculateMonthlyStats(detailedAbsences);

    return {
      id: memberInfo.id,
      name: memberInfo.name,
      surname: memberInfo.surname,
      phone: memberInfo.phone,
      residence: memberInfo.residence,
      gender: memberInfo.gender,
      status: memberInfo.status,
      baptism: memberInfo.baptism,
      member_since: memberInfo.created_at,
      is_hidden: memberInfo.is_hidden,
      
      cell_group_name: memberInfo.cell_groups?.name,
      cell_group_location: memberInfo.cell_groups?.location,
      department_names: memberInfo.department_members?.map((dm: any) => dm.departments?.name) || [],
      
      total_events: totalEvents,
      total_absences: absences,
      total_present: presentCount,
      absence_rate: absenceRate,
      last_attended_date: lastAttended,
      consecutive_absences: consecutiveAbsences,
      
      absence_records: detailedAbsences,
      department_attendance: Object.entries(deptAttendance).map(([deptName, statsData]: [string, any]) => ({
        department_name: deptName,
        total_meetings: statsData.total_meetings,
        absences: statsData.absences,
        attendance_rate: statsData.attendance_rate,
        last_attended: statsData.last_attended
      })),
      absence_patterns: processedAbsencePatterns,
      monthly_stats: monthlyStats
    };
  };

  const analyzeAbsencePatterns = (absences: any[]) => {
    
    // Group by day of week
    const dayPatterns: Record<string, number> = {};
    absences.forEach(absence => {
      const date = new Date(absence.event_date);
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      dayPatterns[day] = (dayPatterns[day] || 0) + 1;
    });
    
    // Group by event type
    const typePatterns: Record<string, number> = {};
    absences.forEach(absence => {
      typePatterns[absence.event_type] = (typePatterns[absence.event_type] || 0) + 1;
    });
    
    // Group by month
    const monthPatterns: Record<string, number> = {};
    absences.forEach(absence => {
      const date = new Date(absence.event_date);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      monthPatterns[monthYear] = (monthPatterns[monthYear] || 0) + 1;
    });
    
    return [
      ...Object.entries(dayPatterns).map(([pattern, count]) => ({
        pattern: `Absent on ${pattern}`,
        count,
        percentage: Math.round((count / absences.length) * 100)
      })),
      ...Object.entries(typePatterns).map(([pattern, count]) => ({
        pattern: `Absent from ${pattern} events`,
        count,
        percentage: Math.round((count / absences.length) * 100)
      })),
      ...Object.entries(monthPatterns).slice(0, 3).map(([pattern, count]) => ({
        pattern: `Absent in ${pattern}`,
        count,
        percentage: Math.round((count / absences.length) * 100)
      }))
    ].sort((a, b) => b.percentage - a.percentage);
  };

  const calculateMonthlyStats = (absences: any[]) => {
    const monthlyData: Record<string, any> = {};
    
    absences.forEach(absence => {
      const date = new Date(absence.event_date);
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      const key = `${month} ${year}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = {
          month,
          year,
          total_events: 0,
          absences: 0,
          present: 0
        };
      }
      
      monthlyData[key].total_events++;
      if (absence.attendance_status === 'absent' || absence.attendance_status === 'absent_with_reason') {
        monthlyData[key].absences++;
      } else {
        monthlyData[key].present++;
      }
    });
    
    // Convert to array and calculate rates
    const result = Object.values(monthlyData).map((data: any) => {
      const attendanceRate = Math.round((data.present / data.total_events) * 100);
      
      // Determine trend (simple calculation)
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      // This would be better with more data, but for now we'll use a simple approach
      
      return {
        ...data,
        attendance_rate: attendanceRate,
        trend
      };
    }).sort((a: any, b: any) => {
      // Sort by year and month
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthOrderA = months.indexOf(a.month);
      const monthOrderB = months.indexOf(b.month);
      
      if (a.year === b.year) {
        return monthOrderA - monthOrderB;
      }
      return a.year - b.year;
    });
    
    return result;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'sunday': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'cell': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'department': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'absent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'absent_with_reason': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const exportToCSV = () => {
    if (!memberData) return;
    
    setExporting(true);
    
    try {
      // Prepare CSV data
      const csvData = [
        [`Member Absence Report: ${memberData.name} ${memberData.surname}`, `Generated: ${new Date().toLocaleDateString()}`],
        [],
        ['Member Information'],
        ['Field', 'Value'],
        ['Name', `${memberData.name} ${memberData.surname}`],
        ['Phone', memberData.phone || 'N/A'],
        ['Residence', memberData.residence || 'N/A'],
        ['Gender', memberData.gender],
        ['Status', memberData.status],
        ['Cell Group', memberData.cell_group_name || 'N/A'],
        ['Departments', memberData.department_names.join(', ') || 'N/A'],
        ['Member Since', formatDate(memberData.member_since)],
        ['Is Hidden', memberData.is_hidden ? 'Yes' : 'No'],
        [],
        ['Attendance Statistics'],
        ['Total Events', memberData.total_events],
        ['Total Present', memberData.total_present],
        ['Total Absences', memberData.total_absences],
        ['Absence Rate', `${memberData.absence_rate}%`],
        ['Consecutive Absences', memberData.consecutive_absences],
        ['Last Attended', formatDate(memberData.last_attended_date)],
        [],
        ['Detailed Absence Records'],
        ['Date', 'Event Name', 'Event Type', 'Attendance Status', 'Location', 'Notes'],
        ...memberData.absence_records.map(record => [
          formatDate(record.event_date),
          record.event_name,
          record.event_type.toUpperCase(),
          record.attendance_status.replace('_', ' ').toUpperCase(),
          record.event_location || 'N/A',
          record.notes || 'N/A'
        ])
      ];

      // Convert to CSV string
      const csvString = csvData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');

      // Create download link
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `absence-report-${memberData.name}-${memberData.surname}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Loading Details...</h3>
          </div>
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading member absence details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!memberData) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Error Loading Details</h3>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="p-8 text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <p className="text-gray-700 dark:text-gray-300 mb-4">Failed to load member details. The member may not exist or you may not have permission to view them.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl bg-gradient-to-br from-blue-500 to-purple-600">
                  {memberData.name.charAt(0)}{memberData.surname.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {memberData.name} {memberData.surname}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Absence Rate: <span className={`font-bold ${memberData.absence_rate > 50 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {memberData.absence_rate}%
                    </span> ({memberData.total_absences} of {memberData.total_events} events)
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 mt-4">
                {memberData.cell_group_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Users className="h-4 w-4" />
                    <span>{memberData.cell_group_name}</span>
                  </div>
                )}
                {memberData.department_names.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Building className="h-4 w-4" />
                    <span>{memberData.department_names.join(', ')}</span>
                  </div>
                )}
                {memberData.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Phone className="h-4 w-4" />
                    <span>{memberData.phone}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 self-stretch sm:self-auto">
              <button
                onClick={exportToCSV}
                disabled={exporting}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
              <button 
                onClick={onClose}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="px-6">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === 'overview'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('absences')}
                className={`px-4 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === 'absences'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Absence Records ({memberData.absence_records.filter(a => a.attendance_status !== 'present').length})
              </button>
              <button
                onClick={() => setActiveTab('departments')}
                className={`px-4 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === 'departments'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Departments ({memberData.department_attendance.length})
              </button>
              <button
                onClick={() => setActiveTab('patterns')}
                className={`px-4 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === 'patterns'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Patterns
              </button>
              <button
                onClick={() => setActiveTab('monthly')}
                className={`px-4 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === 'monthly'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Monthly Trends
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-200px)] p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h4 className="font-semibold text-blue-700 dark:text-blue-300">Overall Attendance</h4>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {memberData.absence_rate}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {memberData.total_present} present / {memberData.total_events} events
                  </div>
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <h4 className="font-semibold text-red-700 dark:text-red-300">Total Absences</h4>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {memberData.total_absences}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {memberData.consecutive_absences} consecutive
                  </div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h4 className="font-semibold text-green-700 dark:text-green-300">Last Attended</h4>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {formatDate(memberData.last_attended_date)}
                  </div>
                  {memberData.last_attended_date && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {Math.floor((new Date().getTime() - new Date(memberData.last_attended_date).getTime()) / (1000 * 60 * 60 * 24))} days ago
                    </div>
                  )}
                </div>
                
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <h4 className="font-semibold text-amber-700 dark:text-amber-300">Member Since</h4>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {formatDate(memberData.member_since)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.floor((new Date().getTime() - new Date(memberData.member_since).getTime()) / (1000 * 60 * 60 * 24))} days
                  </div>
                </div>
              </div>

              {/* Member Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Member Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className={`font-medium ${memberData.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {memberData.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Gender:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{memberData.gender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Residence:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{memberData.residence || 'N/A'}</span>
                    </div>
                    {memberData.baptism && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Baptism Date:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatDate(memberData.baptism)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Visibility:</span>
                      <span className={`font-medium ${memberData.is_hidden ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {memberData.is_hidden ? 'Hidden (Non-active)' : 'Visible (Active)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Group Information
                  </h4>
                  <div className="space-y-4">
                    {memberData.cell_group_name ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="h-4 w-4 text-blue-500" />
                          <span className="font-medium text-gray-900 dark:text-white">Cell Group:</span>
                        </div>
                        <div className="ml-6">
                          <div className="text-gray-700 dark:text-gray-300">{memberData.cell_group_name}</div>
                          {memberData.cell_group_location && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {memberData.cell_group_location}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400">No cell group assigned</div>
                    )}
                    
                    {memberData.department_names.length > 0 ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Building className="h-4 w-4 text-purple-500" />
                          <span className="font-medium text-gray-900 dark:text-white">Departments:</span>
                        </div>
                        <div className="ml-6">
                          <div className="flex flex-wrap gap-2">
                            {memberData.department_names.map((dept, index) => (
                              <span key={index} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-sm">
                                {dept}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400">No departments assigned</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Absences */}
              {memberData.absence_records.filter(a => a.attendance_status !== 'present').length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Recent Absences
                  </h4>
                  <div className="space-y-3">
                    {memberData.absence_records
                      .filter(a => a.attendance_status !== 'present')
                      .slice(0, 5)
                      .map((record, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getEventTypeColor(record.event_type)}`}>
                              {record.event_type.toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{record.event_name}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">{formatDate(record.event_date)}</div>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.attendance_status)}`}>
                            {record.attendance_status.replace('_', ' ').toUpperCase()}
                          </div>
                        </div>
                      ))}
                  </div>
                  {memberData.absence_records.filter(a => a.attendance_status !== 'present').length > 5 && (
                    <button
                      onClick={() => setActiveTab('absences')}
                      className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-1"
                    >
                      View all {memberData.absence_records.filter(a => a.attendance_status !== 'present').length} absences
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'absences' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                  All Attendance Records ({memberData.absence_records.length})
                </h4>
                <div className="flex gap-2">
                  <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                    <option value="all">All Status</option>
                    <option value="present">Present Only</option>
                    <option value="absent">Absent Only</option>
                  </select>
                  <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                    <option value="all">All Event Types</option>
                    <option value="sunday">Sunday Services</option>
                    <option value="cell">Cell Groups</option>
                    <option value="department">Departments</option>
                  </select>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Event</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Location</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {memberData.absence_records.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-4 whitespace-nowrap text-sm">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {formatDate(record.event_date)}
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {record.event_name}
                          </div>
                          {record.invited_by && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Invited by: {record.invited_by}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(record.event_type)}`}>
                            {record.event_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {record.event_location || 'N/A'}
                        </td>
                        <td className="px-3 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.attendance_status)}`}>
                            {record.attendance_status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate" title={record.notes || ''}>
                          {record.notes || 'No notes'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {memberData.absence_records.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <CalendarDays className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg">No attendance records found for this member</p>
                  <p className="text-sm mt-2">This member may not have been invited to any events yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'departments' && (
            <div className="space-y-6">
              <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                Department Attendance ({memberData.department_attendance.length})
              </h4>
              
              {memberData.department_attendance.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {memberData.department_attendance.map((dept, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Building className="h-5 w-5 text-purple-500" />
                        <h5 className="font-semibold text-gray-900 dark:text-white">{dept.department_name}</h5>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Attendance Rate</span>
                            <span className={`text-lg font-bold ${
                              dept.attendance_rate >= 80 ? 'text-green-600 dark:text-green-400' :
                              dept.attendance_rate >= 60 ? 'text-amber-600 dark:text-amber-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {dept.attendance_rate}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                dept.attendance_rate >= 80 ? 'bg-green-500' :
                                dept.attendance_rate >= 60 ? 'bg-amber-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${dept.attendance_rate}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{dept.total_meetings}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Total Meetings</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{dept.absences}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Absences</div>
                          </div>
                        </div>
                        
                        {dept.last_attended && (
                          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-600 dark:text-gray-400">Last Attended</div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {formatDate(dept.last_attended)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Building className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg">No department attendance records found</p>
                  <p className="text-sm mt-2">This member may not be assigned to any departments</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'patterns' && (
            <div className="space-y-6">
              <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                Absence Patterns Analysis
              </h4>
              
              {memberData.absence_patterns.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h5 className="font-medium text-gray-900 dark:text-white">Most Common Patterns</h5>
                    <div className="space-y-3">
                      {memberData.absence_patterns.slice(0, 5).map((pattern, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {pattern.pattern}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                              {pattern.count}
                            </div>
                            <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full bg-blue-500"
                                style={{ width: `${pattern.percentage}%` }}
                              ></div>
                            </div>
                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400 w-10 text-right">
                              {pattern.percentage}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h5 className="font-medium text-gray-900 dark:text-white">Insights</h5>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                      <div className="space-y-4">
                        {memberData.absence_patterns[0] && (
                          <div>
                            <div className="font-semibold text-blue-700 dark:text-blue-300">Primary Pattern:</div>
                            <div className="text-gray-900 dark:text-white mt-1">
                              {memberData.absence_patterns[0].pattern} ({memberData.absence_patterns[0].percentage}% of absences)
                            </div>
                          </div>
                        )}
                        
                        {memberData.consecutive_absences >= 3 && (
                          <div>
                            <div className="font-semibold text-red-700 dark:text-red-300">⚠️ Concern:</div>
                            <div className="text-gray-900 dark:text-white mt-1">
                              Has {memberData.consecutive_absences} consecutive absences
                            </div>
                          </div>
                        )}
                        
                        {memberData.absence_rate > 50 && (
                          <div>
                            <div className="font-semibold text-amber-700 dark:text-amber-300">⚠️ Alert:</div>
                            <div className="text-gray-900 dark:text-white mt-1">
                              Overall absence rate is {memberData.absence_rate}% (above 50%)
                            </div>
                          </div>
                        )}
                        
                        {memberData.last_attended_date && 
                          (new Date().getTime() - new Date(memberData.last_attended_date).getTime()) > (30 * 24 * 60 * 60 * 1000) && (
                          <div>
                            <div className="font-semibold text-red-700 dark:text-red-300">⚠️ Critical:</div>
                            <div className="text-gray-900 dark:text-white mt-1">
                              Last attended over 30 days ago
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg">No absence patterns to analyze</p>
                  <p className="text-sm mt-2">This member has no recorded absences</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'monthly' && (
            <div className="space-y-6">
              <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                Monthly Attendance Trends
              </h4>
              
              {memberData.monthly_stats.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {memberData.monthly_stats.slice(-4).reverse().map((month, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                        <div className="font-semibold text-gray-900 dark:text-white mb-4">
                          {month.month} {month.year}
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Attendance</span>
                              <span className={`text-lg font-bold ${
                                month.attendance_rate >= 80 ? 'text-green-600 dark:text-green-400' :
                                month.attendance_rate >= 60 ? 'text-amber-600 dark:text-amber-400' :
                                'text-red-600 dark:text-red-400'
                              }`}>
                                {month.attendance_rate}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  month.attendance_rate >= 80 ? 'bg-green-500' :
                                  month.attendance_rate >= 60 ? 'bg-amber-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${month.attendance_rate}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">{month.total_events}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Events</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{month.absences}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Absences</div>
                            </div>
                          </div>
                          
                          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-600 dark:text-gray-400">Trend</div>
                            <div className={`font-medium ${
                              month.trend === 'improving' ? 'text-green-600 dark:text-green-400' :
                              month.trend === 'declining' ? 'text-red-600 dark:text-red-400' :
                              'text-amber-600 dark:text-amber-400'
                            }`}>
                              {month.trend.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Year-over-year comparison */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-4">Yearly Comparison</h5>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                            <th className="px-3 py-2">Year</th>
                            <th className="px-3 py-2">Months</th>
                            <th className="px-3 py-2">Total Events</th>
                            <th className="px-3 py-2">Avg Attendance</th>
                            <th className="px-3 py-2">Total Absences</th>
                            <th className="px-3 py-2">Trend</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(
                            memberData.monthly_stats.reduce((acc: any, month) => {
                              if (!acc[month.year]) {
                                acc[month.year] = {
                                  months: [],
                                  totalEvents: 0,
                                  totalAbsences: 0,
                                  attendanceRates: []
                                };
                              }
                              acc[month.year].months.push(month.month);
                              acc[month.year].totalEvents += month.total_events;
                              acc[month.year].totalAbsences += month.absences;
                              acc[month.year].attendanceRates.push(month.attendance_rate);
                              return acc;
                            }, {})
                          ).map(([year, data]: [string, any]) => (
                            <tr key={year} className="border-t border-gray-200 dark:border-gray-700">
                              <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">{year}</td>
                              <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{data.months.join(', ')}</td>
                              <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">{data.totalEvents}</td>
                              <td className="px-3 py-3">
                                <span className={`font-bold ${
                                  Math.round(data.attendanceRates.reduce((a: number, b: number) => a + b, 0) / data.attendanceRates.length) >= 80 ? 'text-green-600 dark:text-green-400' :
                                  Math.round(data.attendanceRates.reduce((a: number, b: number) => a + b, 0) / data.attendanceRates.length) >= 60 ? 'text-amber-600 dark:text-amber-400' :
                                  'text-red-600 dark:text-red-400'
                                }`}>
                                  {Math.round(data.attendanceRates.reduce((a: number, b: number) => a + b, 0) / data.attendanceRates.length)}%
                                </span>
                              </td>
                              <td className="px-3 py-3 text-red-600 dark:text-red-400 font-medium">{data.totalAbsences}</td>
                              <td className="px-3 py-3">
                                <span className="text-amber-600 dark:text-amber-400 font-medium">STABLE</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg">No monthly data available</p>
                  <p className="text-sm mt-2">Insufficient attendance records for trend analysis</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Add missing imports for the DetailedAbsenceModal
import { Clock, CalendarDays } from 'lucide-react';

interface StatCard {
  icon: any;
  label: string;
  value: string;
  color: string;
  description?: string;
  trend?: number;
}

interface AbsentMember {
  id: string;
  name: string;
  surname: string;
  phone: string | null;
  last_attendance_date: string | null;
  consecutive_absences: number;
  cell_group_name: string | null;
  department_name: string | null;
  absence_reason?: string;
  member_since: string;
  gender: string;
  residence: string | null;
  status: string;
  is_hidden?: boolean;
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
  first_timers: number;
  newcomers: number;
  regulars: number;
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
  baptism_this_month: number;
  baptism_last_month: number;
  baptism_growth_rate: number;
  total_baptisms: number;
  baptism_by_gender: {
    male: number;
    female: number;
  };
  average_attendance_rate: number;
  average_sunday_attendance: number;
  retention_rate: number;
  conversion_rate: number;
  non_active_members: number;
  non_active_rate: number;
  potential_return_members: number;
}

interface CellGroupStats {
  group_name: string;
  total_members: number;
  avg_attendance: number;
  meetings_this_month: number;
  leader_name: string;
  trend: 'increasing' | 'decreasing' | 'steady';
  previous_month_attendance: number;
  new_members: number;
  baptism_count: number;
  location: string;
  meeting_day: string;
  non_active_count: number;
}

interface DepartmentStats {
  department_name: string;
  total_members: number;
  avg_attendance: number;
  meetings_this_month: number;
  leader_name: string;
  trend: 'increasing' | 'decreasing' | 'steady';
  previous_month_attendance: number;
  new_members: number;
  baptism_count: number;
  purpose: string;
  non_active_count: number;
}

interface InviterStats {
  invited_by: string;
  invite_count: number;
  new_members_count: number;
  baptism_count: number;
  conversion_rate: number;
  non_active_count: number;
}

interface GenderStats {
  male: number;
  female: number;
  male_present: number;
  female_present: number;
  male_baptized: number;
  female_baptized: number;
  male_attendance_rate: number;
  female_attendance_rate: number;
  male_non_active: number;
  female_non_active: number;
  non_active_rate: number;
}

interface NonActiveMember {
  id: string;
  name: string;
  surname: string;
  phone: string | null;
  last_attendance_date: string | null;
  cell_group_name: string | null;
  department_name: string | null;
  member_since: string;
  gender: string;
  residence: string | null;
  status: string;
  not_attending_reason: string | null;
  days_non_active: number;
  potential_return_score: number;
}

interface NonActiveMetrics {
  total: number;
  by_reason: Record<string, number>;
  by_gender: { male: number; female: number };
  avg_time_non_active: number;
  potential_return_rate: number;
}

interface FilterState {
  gender: 'all' | 'male' | 'female';
  cell_group: string;
  department: string;
  attendance_status: 'all' | 'present' | 'absent';
  meeting_type: 'all' | 'sunday' | 'cell' | 'department' | 'other';
  date_from: string;
  date_to: string;
  status: 'all' | 'newcomer' | 'signed_member' | 'not_attending';
  baptism_status: 'all' | 'baptized' | 'not_baptized';
  member_visibility: 'all' | 'active' | 'non-active';
}

interface AbsenceQueryFilter {
  event_type: 'all' | 'sunday' | 'cell' | 'department' | 'other';
  group_type: 'all' | 'cell_group' | 'department';
  group_id: string;
  date_from: string;
  date_to: string;
  min_absences: number;
  show_only_active: boolean;
}

interface DetailedAbsenceRecord {
  id: string;
  name: string;
  surname: string;
  phone: string | null;
  residence: string | null;
  gender: string;
  cell_group_name: string | null;
  department_name: string | null;
  total_events: number;
  absences: number;
  absence_rate: number;
  absence_dates: string[];
  last_attended_date: string | null;
  member_since: string;
  status: string;
}

// Check if user has permission to view analytics page
const canViewAnalyticsPage = (userRole: string | null | undefined, userPermissions: string[] = [], profile?: any): boolean => {
  // Only pastors and admins can view this page
  if (userRole === 'pastor' || userRole === 'admin') return true;
  
  // Check boolean role flags from profile
  if (profile) {
    if (profile.pastor_role || profile.is_admin || profile.is_developer) return true;
    if (profile.admin_role === 'admin' || profile.admin_role === 'pastor') return true;
  }
  
  // Check permissions array
  return hasPermission(userPermissions, 'admin_access');
};

const hasPermission = (userPermissions: string[] = [], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin_access');
};

const canEdit = (userRole: string | null | undefined, userPermissions: string[] = []): boolean => {
  return userRole === 'pastor' || userRole === 'admin' || hasPermission(userPermissions, 'admin_access');
};

const canViewMemberDetails = (userRole: string | null | undefined, userPermissions: string[] = [], profile?: any): boolean => {
  // Check admin_role string
  if (userRole === 'pastor' || userRole === 'admin') return true;
  
  // Check boolean role flags from profile
  if (profile) {
    if (profile.pastor_role || profile.is_admin || profile.is_developer) return true;
    if (profile.admin_role === 'admin' || profile.admin_role === 'pastor') return true;
    // Group leaders and department leaders can also view member details
    if (profile.group_leader || profile.department_leader || profile.deacon_role) return true;
  }
  
  // Check permissions array
  return hasPermission(userPermissions, 'view_members') || hasPermission(userPermissions, 'admin_access');
};

const Analytics = () => {
  const { profile } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [accessLoading, setAccessLoading] = useState(true);
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
    became_members_last_month: 0,
    baptism_this_month: 0,
    baptism_last_month: 0,
    baptism_growth_rate: 0,
    total_baptisms: 0,
    baptism_by_gender: { male: 0, female: 0 },
    average_attendance_rate: 0,
    average_sunday_attendance: 0,
    retention_rate: 0,
    conversion_rate: 0,
    non_active_members: 0,
    non_active_rate: 0,
    potential_return_members: 0
  });
  const [cellGroupStats, setCellGroupStats] = useState<CellGroupStats[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [inviterStats, setInviterStats] = useState<InviterStats[]>([]);
  const [genderStats, setGenderStats] = useState<GenderStats>({
    male: 0,
    female: 0,
    male_present: 0,
    female_present: 0,
    male_baptized: 0,
    female_baptized: 0,
    male_attendance_rate: 0,
    female_attendance_rate: 0,
    male_non_active: 0,
    female_non_active: 0,
    non_active_rate: 0
  });
  const [nonActiveMembers, setNonActiveMembers] = useState<NonActiveMember[]>([]);
  const [nonActiveMetrics, setNonActiveMetrics] = useState<NonActiveMetrics>({
    total: 0,
    by_reason: {},
    by_gender: { male: 0, female: 0 },
    avg_time_non_active: 0,
    potential_return_rate: 0
  });
  const [cellGroups, setCellGroups] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'cell-groups' | 'departments' | 'non-active' | 'absence-query'>('cell-groups');
  const [exporting, setExporting] = useState(false);
  
  const [showAbsenceQuery, setShowAbsenceQuery] = useState(false);
  const [detailedAbsences, setDetailedAbsences] = useState<DetailedAbsenceRecord[]>([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [absenceQueryFilter, setAbsenceQueryFilter] = useState<AbsenceQueryFilter>({
    event_type: 'all',
    group_type: 'all',
    group_id: 'all',
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
    min_absences: 1,
    show_only_active: true
  });
  const [selectedAbsenceMember, setSelectedAbsenceMember] = useState<DetailedAbsenceRecord | null>(null);
  const [selectedMemberForDetailedView, setSelectedMemberForDetailedView] = useState<string | null>(null);

  const defaultDateFrom = new Date();
  defaultDateFrom.setDate(defaultDateFrom.getDate() - 30);

  const [filters, setFilters] = useState<FilterState>({
    gender: 'all',
    cell_group: 'all',
    department: 'all',
    attendance_status: 'all',
    meeting_type: 'all',
    date_from: defaultDateFrom.toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
    status: 'all',
    baptism_status: 'all',
    member_visibility: 'active'
  });

  useEffect(() => {
    checkAccess();
  }, [profile]);

  const checkAccess = async () => {
    try {
      setAccessLoading(true);
      
      // Check if user has pastor or admin role
      const userCanView = canViewAnalyticsPage(
        profile?.admin_role,
        profile?.permissions || [],
        profile
      );
      
      setHasAccess(userCanView);
      
      if (userCanView) {
        fetchAnalyticsData();
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    } finally {
      setAccessLoading(false);
    }
  };

  void canEdit(profile?.admin_role, profile?.permissions || []); // Keep function call for potential future use
  const currentUserCanViewMemberDetails = canViewMemberDetails(profile?.admin_role, profile?.permissions || [], profile);

  useEffect(() => {
    if (hasAccess) {
      fetchAnalyticsData();
    }
  }, [filters, hasAccess]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // First, fetch cell groups and departments for filters
      const [cellGroupsData, departmentsData] = await Promise.all([
        supabase.from('cell_groups').select('*'),
        supabase.from('departments').select('*')
      ]);

      if (cellGroupsData.error) throw cellGroupsData.error;
      if (departmentsData.error) throw departmentsData.error;

      const allCellGroups = cellGroupsData.data || [];
      const allDepartments = departmentsData.data || [];
      
      setCellGroups(allCellGroups);
      setDepartments(allDepartments);

      // Build base members query
      let membersQuery = supabase
        .from('members')
        .select(`
          *,
          cell_groups!fk_cell_group(id, name),
          department_members!left(
            departments!inner(id, name)
          )
        `);

      // Apply member visibility filter
      if (filters.member_visibility === 'active') {
        membersQuery = membersQuery.eq('is_hidden', false);
      } else if (filters.member_visibility === 'non-active') {
        membersQuery = membersQuery.eq('is_hidden', true);
      }

      // Apply other filters
      if (filters.gender !== 'all') {
        membersQuery = membersQuery.eq('gender', filters.gender);
      }

      if (filters.cell_group !== 'all') {
        membersQuery = membersQuery.eq('cell_group_id', filters.cell_group);
      }

      if (filters.status !== 'all') {
        if (filters.status === 'not_attending') {
          membersQuery = membersQuery.or('status.ilike.%inactive%,status.ilike.%stopped%,status.ilike.%left%');
        } else {
          membersQuery = membersQuery.eq('status', filters.status);
        }
      }

      // Fetch members
      const membersData = await membersQuery;
      if (membersData.error) throw membersData.error;
      const members = membersData.data || [];

      // Fetch events with date filter
      let eventsQuery = supabase
        .from('events')
        .select('*')
        .gte('event_date', filters.date_from)
        .lte('event_date', filters.date_to);

      if (filters.meeting_type === 'sunday') {
        eventsQuery = eventsQuery.ilike('name', '%sunday%');
      } else if (filters.meeting_type === 'cell') {
        eventsQuery = eventsQuery.ilike('name', '%cell%');
      } else if (filters.meeting_type === 'department') {
        eventsQuery = eventsQuery.ilike('name', '%department%');
      }

      const eventsData = await eventsQuery;
      if (eventsData.error) throw eventsData.error;
      const events = eventsData.data || [];

      // Fetch event attendees
      let attendeesQuery = supabase
        .from('event_attendees')
        .select(`
          *,
          members!event_attendees_members_id_fkey(id, name, surname, gender, status),
          events!event_attendees_event_id_fkey(id, name, event_date)
        `);

      if (filters.attendance_status !== 'all') {
        attendeesQuery = attendeesQuery.eq('attendance_status', filters.attendance_status);
      }

      const attendeesData = await attendeesQuery;
      if (attendeesData.error) throw attendeesData.error;
      const eventAttendees = attendeesData.data || [];

      // Fetch non-active members
      const nonActiveMembersData = await fetchNonActiveMembers();
      const nonActiveMembers = nonActiveMembersData || [];

      // Calculate all metrics
      await calculateAllMetrics(
        members,
        allCellGroups,
        allDepartments,
        events,
        eventAttendees,
        nonActiveMembers
      );

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      // You might want to show an error message to the user here
    } finally {
      setLoading(false);
    }
  };

  const fetchNonActiveMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select(`
          *,
          cell_groups!fk_cell_group(name),
          department_members!left(
            departments(id, name)
          )
        `)
        .eq('is_hidden', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching non-active members:', error);
      return [];
    }
  };

  const queryDetailedAbsences = async () => {
    try {
      setQueryLoading(true);
      setDetailedAbsences([]);

      // Build events query based on filters
      let eventsQuery = supabase
        .from('events')
        .select('id, event_date, name')
        .gte('event_date', absenceQueryFilter.date_from)
        .lte('event_date', absenceQueryFilter.date_to);

      if (absenceQueryFilter.event_type !== 'all') {
        if (absenceQueryFilter.event_type === 'sunday') {
          eventsQuery = eventsQuery.ilike('name', '%sunday%');
        } else if (absenceQueryFilter.event_type === 'cell') {
          eventsQuery = eventsQuery.ilike('name', '%cell%');
        } else if (absenceQueryFilter.event_type === 'department') {
          eventsQuery = eventsQuery.ilike('name', '%department%');
        }
      }

      const { data: events, error: eventsError } = await eventsQuery;
      if (eventsError) throw eventsError;

      if (!events || events.length === 0) {
        setDetailedAbsences([]);
        return;
      }

      // Build members query
      let membersQuery = supabase
        .from('members')
        .select(`
          id,
          name,
          surname,
          phone,
          residence,
          gender,
          created_at,
          status,
          is_hidden,
          cell_groups!fk_cell_group(name),
          department_members!left(
            departments(name)
          )
        `);

      if (absenceQueryFilter.show_only_active) {
        membersQuery = membersQuery.eq('is_hidden', false);
      }

      if (absenceQueryFilter.group_type === 'cell_group' && absenceQueryFilter.group_id !== 'all') {
        membersQuery = membersQuery.eq('cell_group_id', absenceQueryFilter.group_id);
      }

      const { data: members, error: membersError } = await membersQuery;
      if (membersError) throw membersError;

      if (!members || members.length === 0) {
        setDetailedAbsences([]);
        return;
      }

      // Get attendance for these events
      const eventIds = events.map(e => e.id);
      const { data: attendances, error: attendanceError } = await supabase
        .from('event_attendees')
        .select('*')
        .in('event_id', eventIds);

      if (attendanceError) throw attendanceError;

      // Process each member's absence record
      const detailedAbsencesList: DetailedAbsenceRecord[] = [];

      for (const member of members) {
        // For department filtering
        if (absenceQueryFilter.group_type === 'department' && absenceQueryFilter.group_id !== 'all') {
          const memberDepartments = member.department_members || [];
          const hasDepartment = memberDepartments.some((dm: any) => 
            dm.departments.id === absenceQueryFilter.group_id
          );
          if (!hasDepartment) continue;
        }

        const totalEvents = events.length;
        let absences = 0;
        const absenceDates: string[] = [];
        let lastAttendedDate: string | null = null;

        for (const event of events) {
          const attendance = attendances?.find(a => 
            a.event_id === event.id && a.members_id === member.id
          );

          if (!attendance || attendance.attendance_status === 'absent') {
            absences++;
            absenceDates.push(event.event_date);
          } else if (attendance.attendance_status === 'present') {
            lastAttendedDate = event.event_date;
          }
        }

        const absenceRate = totalEvents > 0 ? Math.round((absences / totalEvents) * 100) : 0;

        if (absences >= absenceQueryFilter.min_absences) {
          detailedAbsencesList.push({
            id: member.id,
            name: member.name,
            surname: member.surname,
            phone: member.phone,
            residence: member.residence,
            gender: member.gender || 'unknown',
            cell_group_name: member.cell_groups?.name || null,
            department_name: member.department_members?.map((dm: any) => dm.departments?.name).filter(Boolean).join(', ') || null,
            total_events: totalEvents,
            absences: absences,
            absence_rate: absenceRate,
            absence_dates: absenceDates,
            last_attended_date: lastAttendedDate,
            member_since: member.created_at || '',
            status: member.status || 'unknown'
          });
        }
      }

      // Sort by highest absences first
      detailedAbsencesList.sort((a, b) => b.absences - a.absences);
      setDetailedAbsences(detailedAbsencesList);

    } catch (error) {
      console.error('Error querying detailed absences:', error);
    } finally {
      setQueryLoading(false);
    }
  };

  const calculateAllMetrics = async (members: any[], cellGroups: any[], departments: any[], events: any[], eventAttendees: any[], nonActiveMembersList: any[]) => {
    // Calculate basic statistics
    const totalMembers = members.length;
    const totalCellGroups = cellGroups.length;
    const totalDepartments = departments.length;

    // Calculate attendance data
    const totalPresent = eventAttendees.filter((attendee: any) => attendee.attendance_status === 'present').length;
    const totalPossibleAttendance = events.length * totalMembers;
    const avgAttendance = totalPossibleAttendance > 0 ? Math.round((totalPresent / totalPossibleAttendance) * 100) : 0;

    // Get baptism data
    const baptizedMembers = members.filter(m => m.baptism);
    const totalBaptisms = baptizedMembers.length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Calculate members who became baptized this month
    const baptismsThisMonth = baptizedMembers.filter(member => {
      if (!member.baptism) return false;
      const baptismDate = new Date(member.baptism);
      return baptismDate.getMonth() === currentMonth && baptismDate.getFullYear() === currentYear;
    }).length;

    const baptismsLastMonth = baptizedMembers.filter(member => {
      if (!member.baptism) return false;
      const baptismDate = new Date(member.baptism);
      return baptismDate.getMonth() === lastMonth && baptismDate.getFullYear() === lastMonthYear;
    }).length;

    const baptismGrowthRate = baptismsLastMonth > 0 
      ? Math.round(((baptismsThisMonth - baptismsLastMonth) / baptismsLastMonth) * 100)
      : baptismsThisMonth > 0 ? 100 : 0;

    // Calculate non-active metrics
    const totalNonActive = nonActiveMembersList.length;
    const nonActiveRate = members.length > 0 ? Math.round((totalNonActive / (members.length + totalNonActive)) * 100) : 0;
    
    const nonActiveByGender = {
      male: nonActiveMembersList.filter(m => m.gender === 'male').length,
      female: nonActiveMembersList.filter(m => m.gender === 'female').length
    };

    const nonActiveByReason: Record<string, number> = {};
    nonActiveMembersList.forEach(member => {
      const reason = member.not_attending_reason || 'No reason provided';
      nonActiveByReason[reason] = (nonActiveByReason[reason] || 0) + 1;
    });

    // Calculate average time non-active
    const now = new Date();
    const totalDaysNonActive = nonActiveMembersList.reduce((sum, member) => {
      const statusDate = member.status_date ? new Date(member.status_date) : new Date(member.created_at);
      const daysDiff = Math.floor((now.getTime() - statusDate.getTime()) / (1000 * 60 * 60 * 24));
      return sum + daysDiff;
    }, 0);
    const avgTimeNonActive = totalNonActive > 0 ? Math.round(totalDaysNonActive / totalNonActive) : 0;

    // Calculate potential return rate
    const potentialReturnMembers = nonActiveMembersList.filter(member => {
      const statusDate = member.status_date ? new Date(member.status_date) : new Date(member.created_at);
      const daysDiff = Math.floor((now.getTime() - statusDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff < 90;
    }).length;
    const potentialReturnRate = totalNonActive > 0 ? Math.round((potentialReturnMembers / totalNonActive) * 100) : 0;

    // Prepare non-active members for display
    const formattedNonActiveMembers: NonActiveMember[] = nonActiveMembersList.map(member => {
      const statusDate = member.status_date ? new Date(member.status_date) : new Date(member.created_at);
      const daysDiff = Math.floor((now.getTime() - statusDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: member.id,
        name: member.name,
        surname: member.surname,
        phone: member.phone,
        last_attendance_date: member.status_date,
        cell_group_name: member.cell_groups?.name || null,
        department_name: member.department_members?.map((dm: any) => dm.departments?.name).filter(Boolean).join(', ') || null,
        member_since: member.created_at,
        gender: member.gender || 'unknown',
        residence: member.residence,
        status: member.status,
        not_attending_reason: member.not_attending_reason,
        days_non_active: daysDiff,
        potential_return_score: daysDiff < 90 ? 100 - Math.min(100, Math.round((daysDiff / 90) * 100)) : 0
      };
    });

    setNonActiveMembers(formattedNonActiveMembers);
    setNonActiveMetrics({
      total: totalNonActive,
      by_reason: nonActiveByReason,
      by_gender: nonActiveByGender,
      avg_time_non_active: avgTimeNonActive,
      potential_return_rate: potentialReturnRate
    });

    // Update main stats
    const totalSignedMembers = members.filter(m => m.status === 'signed_member').length;

    setStats([
      { 
        icon: Users, 
        label: 'Active Members', 
        value: totalMembers.toString(), 
        color: 'bg-blue-50 dark:bg-blue-900/20',
        description: `${totalSignedMembers} signed members`,
        trend: 5.2
      },
      { 
        icon: EyeOff, 
        label: 'Non-active Members', 
        value: totalNonActive.toString(), 
        color: 'bg-amber-50 dark:bg-amber-900/20',
        description: `${nonActiveRate}% of total members`,
        trend: -2.1
      },
      { 
        icon: Users, 
        label: 'Cell Groups', 
        value: totalCellGroups.toString(), 
        color: 'bg-green-50 dark:bg-green-900/20',
        description: `${cellGroups.filter(g => g.status === 'active').length} active`,
        trend: 2.1
      },
      { 
        icon: Building, 
        label: 'Departments', 
        value: totalDepartments.toString(), 
        color: 'bg-purple-50 dark:bg-purple-900/20',
        description: `${departments.filter(d => d.status === 'active').length} active`,
        trend: 1.5
      },
      { 
        icon: Droplets, 
        label: 'Baptisms', 
        value: totalBaptisms.toString(), 
        color: 'bg-indigo-50 dark:bg-indigo-900/20',
        description: `${baptismGrowthRate > 0 ? '+' : ''}${baptismGrowthRate}% this month`,
        trend: baptismGrowthRate
      },
      { 
        icon: BarChart3, 
        label: 'Avg Attendance', 
        value: `${avgAttendance}%`, 
        color: 'bg-orange-50 dark:bg-orange-900/20',
        description: 'Across filtered events',
        trend: avgAttendance > 80 ? 3.2 : avgAttendance > 60 ? 0.5 : -2.1
      },
    ]);

    // Calculate all detailed metrics
    await calculateGrowthMetrics(members, totalNonActive, potentialReturnMembers);
    await calculateGenderStats(members, eventAttendees, nonActiveMembersList);
    await calculateInviterStats(members, nonActiveMembersList);
    await generateAttendanceReports(events, members, eventAttendees);
    await calculateCellGroupStats(cellGroups, events, members, eventAttendees, nonActiveMembersList);
    await calculateDepartmentStats(departments, events, members, eventAttendees, nonActiveMembersList);
    await findConsecutiveAbsences(members, events, eventAttendees, cellGroups);
    await findSundayServiceAbsentees(members, events, eventAttendees, cellGroups);
    await findThreeTimeAbsentees(members, events, eventAttendees, cellGroups);
  };

  const calculateGrowthMetrics = async (members: any[], totalNonActive: number, potentialReturnMembers: number) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // New members in date range
    const newMembersInRange = members.filter(member => {
      const memberDate = new Date(member.created_at);
      const fromDate = new Date(filters.date_from);
      const toDate = new Date(filters.date_to);
      return memberDate >= fromDate && memberDate <= toDate;
    }).length;

    // New members this month
    const newMembersThisMonth = members.filter(member => {
      const memberDate = new Date(member.created_at);
      return memberDate.getMonth() === currentMonth && memberDate.getFullYear() === currentYear;
    }).length;

    const newMembersLastMonth = members.filter(member => {
      const memberDate = new Date(member.created_at);
      return memberDate.getMonth() === lastMonth && memberDate.getFullYear() === lastMonthYear;
    }).length;

    // Members who became signed members
    const becameMembersInRange = members.filter(member => {
      if (!member.created_at) return false;
      const createdDate = new Date(member.created_at);
      const fromDate = new Date(filters.date_from);
      const toDate = new Date(filters.date_to);
      return createdDate >= fromDate && createdDate <= toDate && member.status === 'signed_member';
    }).length;

    // Calculate retention and conversion rates
    const totalSignedMembers = members.filter(m => m.status === 'signed_member').length;
    const totalNewcomers = members.filter(m => m.status === 'newcomer').length;
    
    const retentionRate = members.length > 0 ? Math.round((totalSignedMembers / members.length) * 100) : 0;
    const conversionRate = totalNewcomers > 0 ? Math.round((becameMembersInRange / totalNewcomers) * 100) : 0;

    // Baptism calculations
    const baptizedMembers = members.filter(m => m.baptism);
    const totalBaptisms = baptizedMembers.length;
    const baptismsThisMonth = baptizedMembers.filter(member => {
      const baptismDate = new Date(member.baptism);
      return baptismDate.getMonth() === currentMonth && baptismDate.getFullYear() === currentYear;
    }).length;

    const baptismsLastMonth = baptizedMembers.filter(member => {
      const baptismDate = new Date(member.baptism);
      return baptismDate.getMonth() === lastMonth && baptismDate.getFullYear() === lastMonthYear;
    }).length;

    const baptismGrowthRate = baptismsLastMonth > 0 
      ? Math.round(((baptismsThisMonth - baptismsLastMonth) / baptismsLastMonth) * 100)
      : baptismsThisMonth > 0 ? 100 : 0;

    const growthRate = newMembersLastMonth > 0 
      ? Math.round(((newMembersThisMonth - newMembersLastMonth) / newMembersLastMonth) * 100)
      : newMembersThisMonth > 0 ? 100 : 0;

    // Calculate non-active rate
    const totalAllMembers = members.length + totalNonActive;
    const nonActiveRate = totalAllMembers > 0 ? Math.round((totalNonActive / totalAllMembers) * 100) : 0;

    setGrowthMetrics(prev => ({
      ...prev,
      new_members_this_month: newMembersInRange,
      new_members_last_month: newMembersLastMonth,
      growth_rate: growthRate,
      permanent_members: totalSignedMembers,
      newcomers: totalNewcomers,
      total_members: members.length,
      became_members_this_month: becameMembersInRange,
      baptism_this_month: baptismsThisMonth,
      baptism_last_month: baptismsLastMonth,
      baptism_growth_rate: baptismGrowthRate,
      total_baptisms: totalBaptisms,
      baptism_by_gender: {
        male: baptizedMembers.filter(m => m.gender === 'male').length,
        female: baptizedMembers.filter(m => m.gender === 'female').length
      },
      average_attendance_rate: 75,
      average_sunday_attendance: 85,
      retention_rate: retentionRate,
      conversion_rate: conversionRate,
      non_active_members: totalNonActive,
      non_active_rate: nonActiveRate,
      potential_return_members: potentialReturnMembers
    }));
  };

  const calculateGenderStats = async (members: any[], eventAttendees: any[], nonActiveMembers: any[]) => {
    const maleMembers = members.filter(m => m.gender === 'male');
    const femaleMembers = members.filter(m => m.gender === 'female');
    
    // Calculate attendance by gender
    const malePresent = eventAttendees.filter(attendee => {
      const member = members.find(m => m.id === attendee.members_id);
      return attendee.attendance_status === 'present' && member?.gender === 'male';
    }).length;

    const femalePresent = eventAttendees.filter(attendee => {
      const member = members.find(m => m.id === attendee.members_id);
      return attendee.attendance_status === 'present' && member?.gender === 'female';
    }).length;

    // Calculate baptism by gender
    const baptizedMembers = members.filter(m => m.baptism);
    const maleBaptized = baptizedMembers.filter(m => m.gender === 'male').length;
    const femaleBaptized = baptizedMembers.filter(m => m.gender === 'female').length;

    // Calculate non-active by gender
    const maleNonActive = nonActiveMembers.filter(m => m.gender === 'male').length;
    const femaleNonActive = nonActiveMembers.filter(m => m.gender === 'female').length;

    const maleAttendanceRate = maleMembers.length > 0 ? Math.round((malePresent / maleMembers.length) * 100) : 0;
    const femaleAttendanceRate = femaleMembers.length > 0 ? Math.round((femalePresent / femaleMembers.length) * 100) : 0;
    
    const totalAllMembers = members.length + nonActiveMembers.length;
    const nonActiveRate = totalAllMembers > 0 ? Math.round(((maleNonActive + femaleNonActive) / totalAllMembers) * 100) : 0;

    setGenderStats({
      male: maleMembers.length,
      female: femaleMembers.length,
      male_present: malePresent,
      female_present: femalePresent,
      male_baptized: maleBaptized,
      female_baptized: femaleBaptized,
      male_attendance_rate: maleAttendanceRate,
      female_attendance_rate: femaleAttendanceRate,
      male_non_active: maleNonActive,
      female_non_active: femaleNonActive,
      non_active_rate: nonActiveRate
    });
  };

  const calculateInviterStats = async (members: any[], nonActiveMembers: any[]) => {
    const allMembers = [...members, ...nonActiveMembers];
    const inviterMap = new Map();
    
    const allInviters = allMembers.filter(member => member.invited_by).map(member => member.invited_by);
    
    allInviters.forEach(inviter => {
      if (inviter && inviter.trim() !== '') {
        const currentCount = inviterMap.get(inviter) || 0;
        inviterMap.set(inviter, currentCount + 1);
      }
    });

    const inviterStatsArray: InviterStats[] = Array.from(inviterMap.entries())
      .map(([invited_by, invite_count]) => {
        const invitedMembers = allMembers.filter(m => m.invited_by === invited_by);
        const newMembersCount = invitedMembers.filter(m => m.status === 'newcomer').length;
        const baptismCount = invitedMembers.filter(m => m.baptism).length;
        const nonActiveCount = invitedMembers.filter(m => m.is_hidden).length;
        const conversionRate = invite_count > 0 ? Math.round((baptismCount / invite_count) * 100) : 0;

        return {
          invited_by,
          invite_count,
          new_members_count: newMembersCount,
          baptism_count: baptismCount,
          conversion_rate: conversionRate,
          non_active_count: nonActiveCount
        };
      })
      .sort((a, b) => b.invite_count - a.invite_count)
      .slice(0, 10);

    setInviterStats(inviterStatsArray);
  };

  const generateAttendanceReports = (events: any[], members: any[], eventAttendees: any[]) => {
    const reports: AttendanceReport[] = events.map(event => {
      const eventAttendeesList = eventAttendees.filter((attendee: any) => attendee.event_id === event.id);
      const presentAttendees = eventAttendeesList.filter((a: any) => a.attendance_status === 'present');
      const absentAttendees = eventAttendeesList.filter((a: any) => a.attendance_status === 'absent');
      
      const present = presentAttendees.length;
      const absent = absentAttendees.length;
      const late = 0;
      const total = members.length;
      
      let malePresent = 0;
      let femalePresent = 0;
      let firstTimers = 0;
      let newcomers = 0;
      let regulars = 0;
      
      presentAttendees.forEach((a: any) => {
        const member = members.find(m => m.id === a.members_id);
        if (member) {
          if (member.gender === 'male') malePresent++;
          if (member.gender === 'female') femalePresent++;
          if (member.status === 'newcomer') newcomers++;
          if (member.status === 'signed_member') regulars++;
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
        female_present: femalePresent,
        first_timers: firstTimers,
        newcomers: newcomers,
        regulars: regulars
      };
    });

    setAttendanceReports(reports.slice(0, 10));
  };

  const calculateCellGroupStats = async (cellGroups: any[], events: any[], members: any[], eventAttendees: any[], nonActiveMembers: any[]) => {
    const stats: CellGroupStats[] = [];

    for (const group of cellGroups) {
      const groupMembers = members.filter(member => member.cell_group_id === group.id);
      const nonActiveGroupMembers = nonActiveMembers.filter(member => member.cell_group_id === group.id);

      if ((!groupMembers || groupMembers.length === 0) && (!nonActiveGroupMembers || nonActiveGroupMembers.length === 0)) continue;

      const groupMemberIds = groupMembers.map(m => m.id);
      
      // Calculate attendance for this group
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
      
      // Calculate baptism count
      const groupBaptisms = groupMembers.filter(m => m.baptism).length;

      // Get leader info
      const leaderName = group.leader_id ? 
        `Leader ${group.leader_id}` : 'Not assigned';

      const trend = avgAttendance >= 70 ? 'increasing' : avgAttendance >= 50 ? 'steady' : 'decreasing';

      stats.push({
        group_name: group.name,
        total_members: groupMembers.length + nonActiveGroupMembers.length,
        avg_attendance: avgAttendance,
        meetings_this_month: events.length,
        leader_name: leaderName,
        trend: trend,
        previous_month_attendance: Math.max(0, avgAttendance - 10),
        new_members: groupMembers.filter(m => m.status === 'newcomer').length,
        baptism_count: groupBaptisms,
        location: group.location || 'Not specified',
        meeting_day: group.meeting_day || 'Not specified',
        non_active_count: nonActiveGroupMembers.length
      });
    }

    setCellGroupStats(stats.filter(group => group.total_members > 0));
  };

  const calculateDepartmentStats = async (departments: any[], events: any[], members: any[], eventAttendees: any[], nonActiveMembers: any[]) => {
    const stats: DepartmentStats[] = [];

    for (const department of departments) {
      // Get department members
      const departmentMembers = members.filter(member => 
        member.department_members?.some((dm: any) => dm.departments?.id === department.id)
      );

      const nonActiveDepartmentMembers = nonActiveMembers.filter(member => 
        member.department_members?.some((dm: any) => dm.departments?.id === department.id)
      );

      if ((!departmentMembers || departmentMembers.length === 0) && (!nonActiveDepartmentMembers || nonActiveDepartmentMembers.length === 0)) continue;

      const departmentMemberIds = departmentMembers.map(m => m.id);
      
      // Calculate attendance
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
      
      const departmentBaptisms = departmentMembers.filter(m => m.baptism).length;

      const leaderName = department.leader_id ? 
        `Leader ${department.leader_id}` : 'Not assigned';

      const trend = avgAttendance >= 70 ? 'increasing' : avgAttendance >= 50 ? 'steady' : 'decreasing';

      stats.push({
        department_name: department.name,
        total_members: departmentMembers.length + nonActiveDepartmentMembers.length,
        avg_attendance: avgAttendance,
        meetings_this_month: events.length,
        leader_name: leaderName,
        trend: trend,
        previous_month_attendance: Math.max(0, avgAttendance - 10),
        new_members: departmentMembers.filter(m => m.status === 'newcomer').length,
        baptism_count: departmentBaptisms,
        purpose: department.description || 'Not specified',
        non_active_count: nonActiveDepartmentMembers.length
      });
    }

    setDepartmentStats(stats.filter(dept => dept.total_members > 0));
  };

  const findConsecutiveAbsences = async (members: any[], events: any[], eventAttendees: any[], cellGroups: any[]) => {
    try {
      const absentMembersList: AbsentMember[] = [];
      
      const recentEvents = events
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
        .slice(-5);

      for (const member of members) {
        let consecutiveAbsences = 0;
        let lastAttendanceDate: string | null = null;

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
          const cellGroup = cellGroups.find(group => group.id === member.cell_group_id);
          
          const memberDepartments = member.department_members?.map((dm: any) => dm.departments?.name).filter(Boolean).join(', ') || null;

          absentMembersList.push({
            id: member.id,
            name: member.name,
            surname: member.surname,
            phone: member.phone,
            last_attendance_date: lastAttendanceDate,
            consecutive_absences: consecutiveAbsences,
            cell_group_name: cellGroup?.name || null,
            department_name: memberDepartments,
            member_since: member.created_at,
            gender: member.gender || 'unknown',
            residence: member.residence,
            status: member.status
          });
        }
      }

      setAbsentMembers(absentMembersList);
    } catch (error) {
      console.error('Error finding consecutive absences:', error);
    }
  };

  const findSundayServiceAbsentees = async (members: any[], events: any[], eventAttendees: any[], cellGroups: any[]) => {
    try {
      const sundayAbsenteesList: AbsentMember[] = [];
      
      const sundayEvents = events.filter(event => {
        const eventDate = new Date(event.event_date);
        return eventDate.getDay() === 0;
      }).slice(-2);

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
          const memberDepartments = member.department_members?.map((dm: any) => dm.departments?.name).filter(Boolean).join(', ') || null;

          sundayAbsenteesList.push({
            id: member.id,
            name: member.name,
            surname: member.surname,
            phone: member.phone,
            last_attendance_date: null,
            consecutive_absences: sundayAbsences,
            cell_group_name: cellGroup?.name || null,
            department_name: memberDepartments,
            member_since: member.created_at,
            gender: member.gender || 'unknown',
            residence: member.residence,
            status: member.status
          });
        }
      }

      setSundayAbsentees(sundayAbsenteesList);
    } catch (error) {
      console.error('Error finding Sunday absentees:', error);
    }
  };

  const findThreeTimeAbsentees = async (members: any[], events: any[], eventAttendees: any[], cellGroups: any[]) => {
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
          const memberDepartments = member.department_members?.map((dm: any) => dm.departments?.name).filter(Boolean).join(', ') || null;

          threeTimeAbsenteesList.push({
            id: member.id,
            name: member.name,
            surname: member.surname,
            phone: member.phone,
            last_attendance_date: null,
            consecutive_absences: totalAbsences,
            cell_group_name: cellGroup?.name || null,
            department_name: memberDepartments,
            member_since: member.created_at,
            gender: member.gender || 'unknown',
            residence: member.residence,
            status: member.status
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
      date_to: new Date().toISOString().split('T')[0],
      status: 'all',
      baptism_status: 'all',
      member_visibility: 'active'
    });
  };

  const hasActiveFilters = () => {
    return filters.gender !== 'all' || 
           filters.cell_group !== 'all' || 
           filters.department !== 'all' || 
           filters.attendance_status !== 'all' || 
           filters.meeting_type !== 'all' ||
           filters.status !== 'all' ||
           filters.baptism_status !== 'all' ||
           filters.member_visibility !== 'active';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const viewAbsenceMemberDetails = (member: DetailedAbsenceRecord) => {
    if (!currentUserCanViewMemberDetails) {
      return;
    }
    setSelectedAbsenceMember(member);
  };

  const closeAbsenceMemberDetails = () => {
    setSelectedAbsenceMember(null);
  };

  const openDetailedAbsenceModal = (memberId: string) => {
    if (!currentUserCanViewMemberDetails) {
      return;
    }
    setSelectedMemberForDetailedView(memberId);
  };

  const closeDetailedAbsenceModal = () => {
    setSelectedMemberForDetailedView(null);
  };

  const AbsenceMemberDetailModal = ({ member }: { member: DetailedAbsenceRecord }) => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-white font-semibold text-2xl bg-gradient-to-br from-red-500 to-orange-500">
          {member.name.charAt(0)}{member.surname.charAt(0)}
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{member.name} {member.surname}</h3>
          <p className="text-gray-600 dark:text-gray-400">Absence Rate: {member.absence_rate}% ({member.absences} of {member.total_events} events)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-white">Member Information</h4>
          {member.phone && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Phone className="h-4 w-4" />
              <span>{member.phone}</span>
            </div>
          )}
          {member.residence && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Home className="h-4 w-4" />
              <span>{member.residence}</span>
            </div>
          )}
          <div className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">Gender:</span> {member.gender}
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">Status:</span> {member.status}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-white">Group Information</h4>
          {member.cell_group_name && (
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-medium">Cell Group:</span> {member.cell_group_name}
            </div>
          )}
          {member.department_name && (
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-medium">Department:</span> {member.department_name}
            </div>
          )}
          {member.last_attended_date && (
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-medium">Last Attended:</span> {formatDate(member.last_attended_date)}
            </div>
          )}
          <div className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">Member Since:</span> {formatDate(member.member_since)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900 dark:text-white">Absence Dates</h4>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          {member.absence_dates.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {member.absence_dates.map((date, index) => (
                <div key={index} className="text-sm text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 rounded px-3 py-2">
                  {formatDate(date)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No absence dates recorded</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            setSelectedAbsenceMember(null);
            openDetailedAbsenceModal(member.id);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          <FileText className="h-4 w-4" />
          View Detailed Report
        </button>
        {member.phone && (
          <a
            href={`tel:${member.phone}`}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
          >
            <Phone className="h-4 w-4" />
            Call Member
          </a>
        )}
        <button
          onClick={closeAbsenceMemberDetails}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );

  const handlePrintAnalytics = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Church Analytics Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 100%; margin: 0 auto; color: #111827; }
            h1 { color: #1e3a5f; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 25px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
            .header-info { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 15px 0; }
            .stat-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; text-align: center; }
            .stat-value { font-size: 20px; font-weight: bold; color: #111827; }
            .stat-label { font-size: 11px; color: #6b7280; margin-top: 5px; }
            .quick-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 15px 0; }
            .quick-stat { background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; text-align: center; }
            .section { margin: 20px 0; }
            .table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            .table th, .table td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
            .table th { background: #f3f4f6; font-weight: 600; }
            .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 11px; }
            .non-active-alert { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 15px 0; }
            @media print { 
              body { padding: 10px; }
              .stats-grid { grid-template-columns: repeat(3, 1fr); }
              .quick-stats { grid-template-columns: repeat(2, 1fr); }
            }
            @media screen and (max-width: 480px) {
              .stats-grid, .quick-stats { grid-template-columns: 1fr; }
              .table { font-size: 11px; }
              .table th, .table td { padding: 6px; }
            }
          </style>
        </head>
        <body>
          <h1>📊 Church Analytics Report</h1>
          <div class="header-info">
            <p><strong>Report Period:</strong> ${filters.date_from} to ${filters.date_to}</p>
            <p><strong>Member Filter:</strong> ${filters.member_visibility === 'all' ? 'All Members' : filters.member_visibility === 'active' ? 'Active Members Only' : 'Non-active Members Only'}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>

          ${growthMetrics.non_active_members > 0 ? `
          <div class="non-active-alert">
            <p><strong>⚠️ Non-active Members Alert:</strong> ${growthMetrics.non_active_members} members (${growthMetrics.non_active_rate}% of total) are currently non-active.</p>
            <p><strong>Potential Return:</strong> ${growthMetrics.potential_return_members} members have been non-active for less than 90 days.</p>
          </div>
          ` : ''}

          <h2>📈 Key Metrics</h2>
          <div class="stats-grid">
            ${stats.map(stat => `
              <div class="stat-box">
                <div class="stat-value">${stat.value}</div>
                <div class="stat-label">${stat.label}</div>
              </div>
            `).join('')}
          </div>

          <h2>👥 Member Statistics</h2>
          <div class="quick-stats">
            <div class="quick-stat">
              <div class="stat-value">${genderStats.male}</div>
              <div class="stat-label">Male Members</div>
            </div>
            <div class="quick-stat">
              <div class="stat-value">${genderStats.female}</div>
              <div class="stat-label">Female Members</div>
            </div>
            <div class="quick-stat">
              <div class="stat-value">${growthMetrics.new_members_this_month}</div>
              <div class="stat-label">New Members in Period</div>
            </div>
            <div class="quick-stat">
              <div class="stat-value">${growthMetrics.baptism_this_month}</div>
              <div class="stat-label">Baptisms This Month</div>
            </div>
            <div class="quick-stat">
              <div class="stat-value">${genderStats.male_non_active}</div>
              <div class="stat-label">Non-active Male</div>
            </div>
            <div class="quick-stat">
              <div class="stat-value">${genderStats.female_non_active}</div>
              <div class="stat-label">Non-active Female</div>
            </div>
          </div>

          <h2>💧 Baptism Statistics</h2>
          <div class="quick-stats">
            <div class="quick-stat">
              <div class="stat-value">${growthMetrics.total_baptisms}</div>
              <div class="stat-label">Total Baptisms</div>
            </div>
            <div class="quick-stat">
              <div class="stat-value">${growthMetrics.baptism_by_gender.male}</div>
              <div class="stat-label">Male Baptized</div>
            </div>
            <div class="quick-stat">
              <div class="stat-value">${growthMetrics.baptism_by_gender.female}</div>
              <div class="stat-label">Female Baptized</div>
            </div>
            <div class="quick-stat">
              <div class="stat-value">${growthMetrics.baptism_growth_rate}%</div>
              <div class="stat-label">Baptism Growth Rate</div>
            </div>
          </div>

          <h2>🏠 Cell Group Performance</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Group Name</th>
                <th>Total Members</th>
                <th>Active Members</th>
                <th>Non-active</th>
                <th>Avg Attendance</th>
                <th>Baptisms</th>
              </tr>
            </thead>
            <tbody>
              ${cellGroupStats.map(group => `
                <tr>
                  <td>${group.group_name}</td>
                  <td>${group.total_members}</td>
                  <td>${group.total_members - group.non_active_count}</td>
                  <td>${group.non_active_count}</td>
                  <td>${group.avg_attendance}%</td>
                  <td>${group.baptism_count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>🏢 Department Performance</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Total Members</th>
                <th>Active Members</th>
                <th>Non-active</th>
                <th>Avg Attendance</th>
                <th>Baptisms</th>
              </tr>
            </thead>
            <tbody>
              ${departmentStats.map(dept => `
                <tr>
                  <td>${dept.department_name}</td>
                  <td>${dept.total_members}</td>
                  <td>${dept.total_members - dept.non_active_count}</td>
                  <td>${dept.non_active_count}</td>
                  <td>${dept.avg_attendance}%</td>
                  <td>${dept.baptism_count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>📊 Non-active Members Analysis</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Reason for Non-attendance</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(nonActiveMetrics.by_reason).map(([reason, count]) => `
                <tr>
                  <td>${reason}</td>
                  <td>${count}</td>
                  <td>${nonActiveMetrics.total > 0 ? Math.round((count / nonActiveMetrics.total) * 100) : 0}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${inviterStats.length > 0 ? `
          <h2>⭐ Top Inviters</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Inviter Name</th>
                <th>Total Invited</th>
                <th>Non-active</th>
              </tr>
            </thead>
            <tbody>
              ${inviterStats.map((inviter, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${inviter.invited_by}</td>
                  <td>${inviter.invite_count}</td>
                  <td>${inviter.non_active_count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}

          <div class="footer">
            <p>Church Management System - Analytics Report</p>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const exportToCSV = () => {
    setExporting(true);
    
    const csvData = [
      ['Church Analytics Report', `Period: ${filters.date_from} to ${filters.date_to}`, `Generated: ${new Date().toLocaleDateString()}`],
      [],
      ['Key Metrics'],
      ['Metric', 'Value', 'Description'],
      ...stats.map(stat => [stat.label, stat.value, stat.description || '']),
      [],
      ['Growth & Baptism Metrics'],
      ['Metric', 'Value'],
      ['New Members (Period)', growthMetrics.new_members_this_month],
      ['Baptisms (Period)', growthMetrics.baptism_this_month],
      ['Total Baptisms', growthMetrics.total_baptisms],
      ['Male Baptized', growthMetrics.baptism_by_gender.male],
      ['Female Baptized', growthMetrics.baptism_by_gender.female],
      ['Baptism Growth Rate', `${growthMetrics.baptism_growth_rate}%`],
      ['Non-active Members', growthMetrics.non_active_members],
      ['Non-active Rate', `${growthMetrics.non_active_rate}%`],
      ['Potential Return Members', growthMetrics.potential_return_members],
      [],
      ['Cell Group Performance'],
      ['Group Name', 'Total Members', 'Active Members', 'Non-active Members', 'Avg Attendance', 'Baptisms', 'Trend'],
      ...cellGroupStats.map(group => [
        group.group_name,
        group.total_members,
        group.total_members - group.non_active_count,
        group.non_active_count,
        `${group.avg_attendance}%`,
        group.baptism_count,
        group.trend
      ])
    ];

    const csvString = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `church-analytics-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setExporting(false);
  };

  // Show access denied if user doesn't have permission
  if (accessLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Checking access permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You don't have permission to access the analytics page. Only pastors and administrators can view this page.
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 max-w-md mx-auto">
              <p className="text-yellow-800 dark:text-yellow-300 mb-4">
                <strong>Allowed Roles:</strong> Pastor, Admin
              </p>
              <p className="text-yellow-700 dark:text-yellow-400">
                <strong>Restricted Roles:</strong> Regular Members, Group Leaders, Department Leaders, Deacons
              </p>
            </div>
            <a
              href="/dashboard"
              className="inline-block mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-3 sm:p-4 md:p-6 animate-fadeIn overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Church Analytics
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Comprehensive insights & analytics</p>
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto mt-3 lg:mt-0">
            <button
              onClick={fetchAnalyticsData}
              disabled={loading}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 text-sm sm:text-base"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={exportToCSV}
              disabled={exporting}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 text-sm sm:text-base"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={handlePrintAnalytics}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm sm:text-base"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm sm:text-base"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters() && (
                <span className="bg-red-500 text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs">
                  Active
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filter Analytics</h3>
              <div className="flex gap-2 self-end sm:self-auto">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-3 py-1.5 min-h-[44px] text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                  Clear All
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Member Visibility Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Member Visibility
                </label>
                <select
                  value={filters.member_visibility}
                  onChange={(e) => setFilters({...filters, member_visibility: e.target.value as any})}
                  className="w-full px-3 py-2.5 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                >
                  <option value="active">Active Members Only</option>
                  <option value="non-active">Non-active Members Only</option>
                  <option value="all">All Members</option>
                </select>
              </div>

              {/* Gender Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gender
                </label>
                <select
                  value={filters.gender}
                  onChange={(e) => setFilters({...filters, gender: e.target.value as any})}
                  className="w-full px-3 py-2.5 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
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
                  className="w-full px-3 py-2.5 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
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
                  className="w-full px-3 py-2.5 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Member Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value as any})}
                  className="w-full px-3 py-2.5 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                >
                  <option value="all">All Status</option>
                  <option value="newcomer">Newcomers</option>
                  <option value="signed_member">Signed Members</option>
                  <option value="not_attending">Not Attending</option>
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
                  className="w-full px-3 py-2.5 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
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
                  className="w-full px-3 py-2.5 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
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
                  className="w-full px-3 py-2.5 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters() && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Active Filters: 
                  {filters.member_visibility !== 'active' && ` ${filters.member_visibility} members`}
                  {filters.gender !== 'all' && `, ${filters.gender}`}
                  {filters.cell_group !== 'all' && `, ${cellGroups.find(g => g.id === filters.cell_group)?.name || 'Selected Group'}`}
                  {filters.department !== 'all' && `, ${departments.find(d => d.id === filters.department)?.name || 'Selected Department'}`}
                  {filters.status !== 'all' && `, ${filters.status}`}
                  {filters.meeting_type !== 'all' && `, ${filters.meeting_type} events`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Non-active Members Alert */}
        {growthMetrics.non_active_members > 0 && filters.member_visibility !== 'non-active' && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <EyeOff className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400" />
                <div>
                  <h3 className="font-bold text-amber-900 dark:text-amber-300 text-sm sm:text-base">
                    Non-active Members Alert
                  </h3>
                  <p className="text-amber-700 dark:text-amber-400 text-xs sm:text-sm">
                    {growthMetrics.non_active_members} members ({growthMetrics.non_active_rate}% of total) are currently non-active
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-center px-2 sm:px-3 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <div className="text-base sm:text-lg font-bold text-amber-700 dark:text-amber-300">
                    {growthMetrics.potential_return_members}
                  </div>
                  <div className="text-xs text-amber-600 dark:text-amber-400">Potential Return</div>
                </div>
                <button
                  onClick={() => setFilters({...filters, member_visibility: 'non-active'})}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium text-xs sm:text-sm"
                >
                  <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
                  View Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4 md:gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className={`${stat.color} rounded-2xl p-4 sm:p-6 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50`}>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                  <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700 dark:text-gray-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1 truncate">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {stat.label}
                  </div>
                  {stat.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 hidden sm:block">
                      {stat.description}
                    </div>
                  )}
                  {stat.trend !== undefined && (
                    <div className={`text-xs mt-1 flex items-center gap-1 ${
                      stat.trend > 0 ? 'text-green-600 dark:text-green-400' : 
                      stat.trend < 0 ? 'text-red-600 dark:text-red-400' : 
                      'text-gray-500 dark:text-gray-500'
                    }`}>
                      {stat.trend > 0 ? <TrendingUp className="h-3 w-3" /> : 
                       stat.trend < 0 ? <TrendingDown className="h-3 w-3" /> : 
                       <Target className="h-3 w-3" />}
                      {stat.trend > 0 ? '+' : ''}{stat.trend}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Absence Query Section */}
        <div className="mb-8">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-500" />
                Detailed Absence Query
              </h2>
              <button
                onClick={() => setShowAbsenceQuery(!showAbsenceQuery)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
              >
                {showAbsenceQuery ? 'Hide Query' : 'Show Query'}
                <ChevronDown className={`h-4 w-4 transition-transform ${showAbsenceQuery ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showAbsenceQuery && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Event Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Event Type
                    </label>
                    <select
                      value={absenceQueryFilter.event_type}
                      onChange={(e) => setAbsenceQueryFilter({...absenceQueryFilter, event_type: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="all">All Events</option>
                      <option value="sunday">Sunday Services</option>
                      <option value="cell">Cell Group Meetings</option>
                      <option value="department">Department Events</option>
                      <option value="other">Other Events</option>
                    </select>
                  </div>

                  {/* Group Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Filter by Group
                    </label>
                    <select
                      value={absenceQueryFilter.group_type}
                      onChange={(e) => setAbsenceQueryFilter({...absenceQueryFilter, group_type: e.target.value as any, group_id: 'all'})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="all">All Groups</option>
                      <option value="cell_group">Cell Group</option>
                      <option value="department">Department</option>
                    </select>
                  </div>

                  {/* Specific Group */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {absenceQueryFilter.group_type === 'cell_group' ? 'Select Cell Group' : 
                       absenceQueryFilter.group_type === 'department' ? 'Select Department' : 'Select Group'}
                    </label>
                    <select
                      value={absenceQueryFilter.group_id}
                      onChange={(e) => setAbsenceQueryFilter({...absenceQueryFilter, group_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      disabled={absenceQueryFilter.group_type === 'all'}
                    >
                      <option value="all">All</option>
                      {absenceQueryFilter.group_type === 'cell_group' && cellGroups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                      {absenceQueryFilter.group_type === 'department' && departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Minimum Absences */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Absences
                    </label>
                    <select
                      value={absenceQueryFilter.min_absences}
                      onChange={(e) => setAbsenceQueryFilter({...absenceQueryFilter, min_absences: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="1">1+ Absences</option>
                      <option value="2">2+ Absences</option>
                      <option value="3">3+ Absences</option>
                      <option value="5">5+ Absences</option>
                      <option value="10">10+ Absences</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Date From */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date From
                    </label>
                    <input
                      type="date"
                      value={absenceQueryFilter.date_from}
                      onChange={(e) => setAbsenceQueryFilter({...absenceQueryFilter, date_from: e.target.value})}
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
                      value={absenceQueryFilter.date_to}
                      onChange={(e) => setAbsenceQueryFilter({...absenceQueryFilter, date_to: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Member Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Show Members
                    </label>
                    <select
                      value={absenceQueryFilter.show_only_active ? 'active' : 'all'}
                      onChange={(e) => setAbsenceQueryFilter({...absenceQueryFilter, show_only_active: e.target.value === 'active'})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="active">Active Members Only</option>
                      <option value="all">All Members</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={queryDetailedAbsences}
                    disabled={queryLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    <Search className="h-4 w-4" />
                    {queryLoading ? 'Querying...' : 'Query Absences'}
                  </button>
                </div>
              </div>
            )}

            {/* Results Table */}
            {detailedAbsences.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Query Results: {detailedAbsences.length} members with {absenceQueryFilter.min_absences}+ absences
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                        <th className="px-3 py-2 font-medium">Member</th>
                        <th className="px-3 py-2 font-medium">Cell Group</th>
                        <th className="px-3 py-2 font-medium">Total Events</th>
                        <th className="px-3 py-2 font-medium">Absences</th>
                        <th className="px-3 py-2 font-medium">Absence Rate</th>
                        <th className="px-3 py-2 font-medium">Last Attended</th>
                        <th className="px-3 py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {detailedAbsences.map((member, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {member.name} {member.surname}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {member.cell_group_name || 'Not assigned'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {member.total_events}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`text-sm font-bold ${
                              member.absence_rate >= 50 ? 'text-red-600 dark:text-red-400' :
                              member.absence_rate >= 25 ? 'text-orange-600 dark:text-orange-400' :
                              'text-yellow-600 dark:text-yellow-400'
                            }`}>
                              {member.absences}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    member.absence_rate >= 50 ? 'bg-red-500' :
                                    member.absence_rate >= 25 ? 'bg-orange-500' :
                                    'bg-yellow-500'
                                  }`}
                                  style={{ width: `${Math.min(100, member.absence_rate)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm">{member.absence_rate}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {member.last_attended_date ? formatDate(member.last_attended_date) : 'Never'}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => viewAbsenceMemberDetails(member)}
                                disabled={!currentUserCanViewMemberDetails}
                                className={`px-3 py-1 rounded text-sm font-medium ${
                                  currentUserCanViewMemberDetails 
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                Quick View
                              </button>
                              <button
                                onClick={() => openDetailedAbsenceModal(member.id)}
                                disabled={!currentUserCanViewMemberDetails}
                                className={`px-3 py-1 rounded text-sm font-medium ${
                                  currentUserCanViewMemberDetails 
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                <FileText className="h-3 w-3 inline mr-1" />
                                Full Report
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {queryLoading && detailedAbsences.length === 0 && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Querying absences...</p>
              </div>
            )}

            {!queryLoading && showAbsenceQuery && detailedAbsences.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No members found matching your criteria</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Baptism & Growth Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-8">
          {/* Baptism Summary */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              Baptism Analytics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="text-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {growthMetrics.total_baptisms}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Baptisms</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                  {growthMetrics.baptism_this_month}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">This Month</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className={`text-lg sm:text-xl md:text-2xl font-bold ${
                  growthMetrics.baptism_growth_rate >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'
                } mb-1`}>
                  {growthMetrics.baptism_growth_rate}%
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Growth Rate</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                  {Math.round((growthMetrics.total_baptisms / (growthMetrics.total_members + growthMetrics.non_active_members)) * 100)}%
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Baptism Rate</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <div className="text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-300 mb-1">
                  {growthMetrics.baptism_by_gender.male}
                </div>
                <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">Male Baptized</div>
                <div className="text-xs text-blue-500 dark:text-blue-500 mt-1">
                  {genderStats.male > 0 ? Math.round((growthMetrics.baptism_by_gender.male / genderStats.male) * 100) : 0}% of males
                </div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                <div className="text-lg sm:text-xl font-bold text-pink-700 dark:text-pink-300 mb-1">
                  {growthMetrics.baptism_by_gender.female}
                </div>
                <div className="text-xs sm:text-sm text-pink-600 dark:text-pink-400">Female Baptized</div>
                <div className="text-xs text-pink-500 dark:text-pink-500 mt-1">
                  {genderStats.female > 0 ? Math.round((growthMetrics.baptism_by_gender.female / genderStats.female) * 100) : 0}% of females
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Quick Stats
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">{genderStats.male}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Active Male</div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {genderStats.male_non_active} non-active
                </div>
              </div>
              <div className="bg-pink-50 dark:bg-pink-900/20 rounded-xl p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-pink-600 dark:text-pink-400">{genderStats.female}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Active Female</div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {genderStats.female_non_active} non-active
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">{growthMetrics.new_members_this_month}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">New Members</div>
                <div className="text-xs text-gray-500 dark:text-gray-500">in period</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400">{growthMetrics.non_active_members}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Non-active</div>
                <div className="text-xs text-amber-500 dark:text-amber-500">
                  {growthMetrics.non_active_rate}% of total
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3">
                <div className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400">{growthMetrics.retention_rate}%</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Retention Rate</div>
              </div>
              <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-3">
                <div className="text-base sm:text-lg font-bold text-teal-600 dark:text-teal-400">{growthMetrics.conversion_rate}%</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Conversion Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-8">
          {/* Top Inviters */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Top Inviters
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {inviterStats.length > 0 ? inviterStats.map((inviter, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white truncate text-sm sm:text-base">{inviter.invited_by}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {inviter.new_members_count} new • {inviter.baptism_count} baptized
                      </div>
                      <div className="text-xs text-amber-600 dark:text-amber-400">
                        {inviter.non_active_count} non-active
                      </div>
                    </div>
                  </div>
                  <div className="text-right pl-2">
                    <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
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
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gender Analytics
            </h2>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">Male Attendance</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {genderStats.male_attendance_rate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${genderStats.male_attendance_rate}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {genderStats.male_present} of {genderStats.male} active • {genderStats.male_baptized} baptized
                </div>
                <div className="text-xs text-amber-500 dark:text-amber-500 mt-1">
                  {genderStats.male_non_active} non-active members
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">Female Attendance</span>
                  <span className="font-bold text-pink-600 dark:text-pink-400">
                    {genderStats.female_attendance_rate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-pink-500 h-2 rounded-full" 
                    style={{ width: `${genderStats.female_attendance_rate}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {genderStats.female_present} of {genderStats.female} active • {genderStats.female_baptized} baptized
                </div>
                <div className="text-xs text-amber-500 dark:text-amber-500 mt-1">
                  {genderStats.female_non_active} non-active members
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
                      {Math.round((genderStats.male_baptized / genderStats.male) * 100) || 0}%
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Male Baptism Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-bold text-pink-600 dark:text-pink-400">
                      {Math.round((genderStats.female_baptized / genderStats.female) * 100) || 0}%
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Female Baptism Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">
                      {genderStats.non_active_rate}%
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Non-active Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Group Performance Tabs */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Analytics
            </h2>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-full sm:w-auto mt-3 sm:mt-0">
              <button
                onClick={() => setActiveTab('cell-groups')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
                  activeTab === 'cell-groups'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Cell Groups
              </button>
              <button
                onClick={() => setActiveTab('departments')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
                  activeTab === 'departments'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Departments
              </button>
              <button
                onClick={() => setActiveTab('non-active')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
                  activeTab === 'non-active'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Non-active Members
              </button>
              <button
                onClick={() => setActiveTab('absence-query')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
                  activeTab === 'absence-query'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Absence Query
              </button>
            </div>
          </div>

          {activeTab === 'cell-groups' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {cellGroupStats.length > 0 ? cellGroupStats.map((group, index) => (
                <div key={index} className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-gray-900 dark:text-white truncate text-sm sm:text-base">{group.group_name}</div>
                    {getTrendIcon(group.trend)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {group.total_members} total • {group.total_members - group.non_active_count} active • {group.non_active_count} non-active
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-500">Attendance</span>
                      <span className={`text-xs sm:text-sm font-bold ${
                        group.avg_attendance >= 80 ? 'text-green-600 dark:text-green-400' :
                        group.avg_attendance >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {group.avg_attendance}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          group.avg_attendance >= 80 ? 'bg-green-500' :
                          group.avg_attendance >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${group.avg_attendance}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-500">Baptisms</span>
                      <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">
                        {group.baptism_count}
                      </span>
                    </div>
                    {group.non_active_count > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-amber-500 dark:text-amber-500">Non-active</span>
                        <span className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">
                          {group.non_active_count}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
                    <div className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{group.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{group.meeting_day}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                  No cell group data available
                </div>
              )}
            </div>
          ) : activeTab === 'departments' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {departmentStats.length > 0 ? departmentStats.map((dept, index) => (
                <div key={index} className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-gray-900 dark:text-white truncate text-sm sm:text-base">{dept.department_name}</div>
                    {getTrendIcon(dept.trend)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {dept.total_members} total • {dept.total_members - dept.non_active_count} active • {dept.non_active_count} non-active
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-500">Attendance</span>
                      <span className={`text-xs sm:text-sm font-bold ${
                        dept.avg_attendance >= 80 ? 'text-green-600 dark:text-green-400' :
                        dept.avg_attendance >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {dept.avg_attendance}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          dept.avg_attendance >= 80 ? 'bg-green-500' :
                          dept.avg_attendance >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${dept.avg_attendance}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-500">Baptisms</span>
                      <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">
                        {dept.baptism_count}
                      </span>
                    </div>
                    {dept.non_active_count > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-amber-500 dark:text-amber-500">Non-active</span>
                        <span className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">
                          {dept.non_active_count}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2">
                    {dept.purpose}
                  </div>
                </div>
              )) : (
                <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                  No department data available
                </div>
              )}
            </div>
          ) : activeTab === 'non-active' ? (
            <div className="space-y-4">
              {/* Non-active Members Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-1">
                    {nonActiveMetrics.total}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Non-active</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-1">
                    {nonActiveMetrics.avg_time_non_active}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Avg Days Non-active</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                    {nonActiveMetrics.potential_return_rate}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Potential Return Rate</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {growthMetrics.potential_return_members}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Potential Return Members</div>
                </div>
              </div>

              {/* Non-active Members List */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr className="text-left text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      <th scope="col" className="px-2 sm:px-4 py-2 font-medium">Name</th>
                      <th scope="col" className="px-2 sm:px-4 py-2 font-medium">Cell Group</th>
                      <th scope="col" className="px-2 sm:px-4 py-2 font-medium">Days Non-active</th>
                      <th scope="col" className="px-2 sm:px-4 py-2 font-medium">Return Potential</th>
                      <th scope="col" className="px-2 sm:px-4 py-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {nonActiveMembers.slice(0, 10).map((member, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          {member.name} {member.surname}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">{member.cell_group_name || 'Not assigned'}</td>
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">
                          <span className={`font-medium ${
                            member.days_non_active < 30 ? 'text-green-600 dark:text-green-400' :
                            member.days_non_active < 90 ? 'text-amber-600 dark:text-amber-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {member.days_non_active}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  member.potential_return_score >= 70 ? 'bg-green-500' :
                                  member.potential_return_score >= 30 ? 'bg-amber-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${member.potential_return_score}%` }}
                              ></div>
                            </div>
                            <span className="text-xs sm:text-sm">{member.potential_return_score}%</span>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm max-w-[150px] truncate" title={member.not_attending_reason || 'No reason'}>
                          {member.not_attending_reason || 'No reason'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {nonActiveMembers.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Eye className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No non-active members found</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Search className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">Use the Detailed Absence Query section above</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Filter by event type, group, and date range to find members with specific absence patterns</p>
            </div>
          )}
        </div>

        {/* Absence Member Details Modal */}
        {selectedAbsenceMember && currentUserCanViewMemberDetails && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Absence Member Details</h3>
                <button 
                  onClick={closeAbsenceMemberDetails}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <div className="p-6">
                <AbsenceMemberDetailModal member={selectedAbsenceMember} />
              </div>
            </div>
          </div>
        )}

        {/* Detailed Absence Modal */}
        {selectedMemberForDetailedView && (
          <DetailedAbsenceModal 
            memberId={selectedMemberForDetailedView} 
            onClose={closeDetailedAbsenceModal} 
          />
        )}

        {/* Absence Alerts */}
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6 mb-8">
          {/* 2+ Consecutive Absences */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 sm:p-6 flex-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
              <h3 className="font-bold text-red-900 dark:text-red-300 text-sm sm:text-base">2+ Meeting Absences</h3>
              <span className="bg-red-600 text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs">
                {absentMembers.length}
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {absentMembers.length > 0 ? absentMembers.slice(0, 5).map((member) => (
                <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg p-2.5 sm:p-3 border border-red-200 dark:border-red-700">
                  <div className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">
                    {member.name} {member.surname}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {member.cell_group_name} • {member.consecutive_absences} absences
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                  No consecutive absences
                </div>
              )}
            </div>
          </div>

          {/* 2+ Sunday Absences */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 sm:p-6 flex-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
              <h3 className="font-bold text-orange-900 dark:text-orange-300 text-sm sm:text-base">2+ Sunday Absences</h3>
              <span className="bg-orange-600 text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs">
                {sundayAbsentees.length}
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sundayAbsentees.length > 0 ? sundayAbsentees.slice(0, 5).map((member) => (
                <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg p-2.5 sm:p-3 border border-orange-200 dark:border-orange-700">
                  <div className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">
                    {member.name} {member.surname}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {member.cell_group_name} • {member.gender}
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                  No Sunday absences
                </div>
              )}
            </div>
          </div>

          {/* 3+ Total Absences */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-4 sm:p-6 flex-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-bold text-purple-900 dark:text-purple-300 text-sm sm:text-base">3+ Total Absences</h3>
              <span className="bg-purple-600 text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs">
                {threeTimeAbsentees.length}
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {threeTimeAbsentees.length > 0 ? threeTimeAbsentees.slice(0, 5).map((member) => (
                <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg p-2.5 sm:p-3 border border-purple-200 dark:border-purple-700">
                  <div className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">
                    {member.name} {member.surname}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {member.cell_group_name} • {member.consecutive_absences} absences
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                  No multiple absences
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Attendance Reports */}
        {attendanceReports.length > 0 && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Attendance
            </h2>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                      <tr className="text-left text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        <th scope="col" className="px-2 sm:px-4 py-2 font-medium">Date</th>
                        <th scope="col" className="px-2 sm:px-4 py-2 font-medium">Event</th>
                        <th scope="col" className="px-2 sm:px-4 py-2 font-medium">Present</th>
                        <th scope="col" className="px-2 sm:px-4 py-2 font-medium">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {attendanceReports.slice(0, 5).map((report, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">{report.meeting_date}</td>
                          <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-none">
                            {report.meeting_type}
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm">
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {report.present_count}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-3">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <div className="w-10 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    report.attendance_rate >= 80 ? 'bg-green-500' :
                                    report.attendance_rate >= 60 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${report.attendance_rate}%` }}
                                ></div>
                              </div>
                              <span className="text-xs sm:text-sm">{report.attendance_rate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
