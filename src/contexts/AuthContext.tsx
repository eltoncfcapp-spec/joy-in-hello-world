// Re-export the types from auth context
export type { Member, Permission } from '../contexts/AuthContext';

// Additional types for your application
export interface Department {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CellGroup {
  id: string;
  name: string;
  description?: string | null;
  leader_id?: string | null;
  meeting_day?: string | null;
  meeting_time?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Event {
  id: string;
  name: string;
  description?: string | null;
  event_date: string;
  event_time?: string | null;
  location?: string | null;
  event_type: 'service' | 'meeting' | 'outreach' | 'other';
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface DepartmentAttendanceRecord {
  id: string;
  meeting_id: string;
  member_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string | null;
  arrival_time?: string | null;
  created_at?: string;
  updated_at?: string;
  member?: Member;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  member_id: string;
  attendance_status: 'confirmed' | 'attended' | 'absent' | 'excused';
  attended_at?: string | null;
  invited_by?: string | null;
  first_time?: boolean | null;
  created_at?: string;
  updated_at?: string;
  member?: Member;
}

export interface DepartmentMember {
  id: string;
  department_id: string;
  member_id: string;
  role: 'leader' | 'assistant' | 'member';
  created_at?: string;
  updated_at?: string;
  member?: Member;
  department?: Department;
}
