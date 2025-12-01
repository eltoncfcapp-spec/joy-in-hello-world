export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          arrival_time: string | null
          created_at: string | null
          id: string
          meeting_id: string | null
          member_id: string | null
          notes: string | null
          status: string
        }
        Insert: {
          arrival_time?: string | null
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          member_id?: string | null
          notes?: string | null
          status: string
        }
        Update: {
          arrival_time?: string | null
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          member_id?: string | null
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string | null
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cell_group_members: {
        Row: {
          cell_group_id: string
          created_at: string | null
          id: string
          joined_at: string | null
          member_id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          cell_group_id: string
          created_at?: string | null
          id?: string
          joined_at?: string | null
          member_id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          cell_group_id?: string
          created_at?: string | null
          id?: string
          joined_at?: string | null
          member_id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cell_group_members_cell_group_id_fkey"
            columns: ["cell_group_id"]
            isOneToOne: false
            referencedRelation: "cell_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cell_group_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      cell_groups: {
        Row: {
          created_at: string | null
          current_member_count: number | null
          description: string | null
          id: string
          leader_id: string | null
          location: string | null
          login_username: string | null
          meeting_day: string | null
          meeting_time: string | null
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_member_count?: number | null
          description?: string | null
          id?: string
          leader_id?: string | null
          location?: string | null
          login_username?: string | null
          meeting_day?: string | null
          meeting_time?: string | null
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_member_count?: number | null
          description?: string | null
          id?: string
          leader_id?: string | null
          location?: string | null
          login_username?: string | null
          meeting_day?: string | null
          meeting_time?: string | null
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cell_groups_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      department_attendance: {
        Row: {
          arrival_time: string | null
          created_at: string | null
          id: string
          meeting_id: string | null
          member_id: string | null
          notes: string | null
          status: string | null
        }
        Insert: {
          arrival_time?: string | null
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          member_id?: string | null
          notes?: string | null
          status?: string | null
        }
        Update: {
          arrival_time?: string | null
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          member_id?: string | null
          notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "department_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      department_meetings: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          location: string
          meeting_date: string
          meeting_time: string
          notes: string | null
          status: string | null
          topic: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          location: string
          meeting_date: string
          meeting_time: string
          notes?: string | null
          status?: string | null
          topic?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          location?: string
          meeting_date?: string
          meeting_time?: string
          notes?: string | null
          status?: string | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_meetings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      department_members: {
        Row: {
          assigned_at: string | null
          department_id: string | null
          id: string
          member_id: string | null
          role: string | null
        }
        Insert: {
          assigned_at?: string | null
          department_id?: string | null
          id?: string
          member_id?: string | null
          role?: string | null
        }
        Update: {
          assigned_at?: string | null
          department_id?: string | null
          id?: string
          member_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      department_reports: {
        Row: {
          action_items: string | null
          created_at: string | null
          created_by: string | null
          decisions_made: string | null
          id: string
          meeting_id: string | null
          next_meeting_date: string | null
          report_text: string | null
        }
        Insert: {
          action_items?: string | null
          created_at?: string | null
          created_by?: string | null
          decisions_made?: string | null
          id?: string
          meeting_id?: string | null
          next_meeting_date?: string | null
          report_text?: string | null
        }
        Update: {
          action_items?: string | null
          created_at?: string | null
          created_by?: string | null
          decisions_made?: string | null
          id?: string
          meeting_id?: string | null
          next_meeting_date?: string | null
          report_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_reports_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "department_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          leader_id: string | null
          location: string | null
          meeting_day: string | null
          meeting_time: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          leader_id?: string | null
          location?: string | null
          meeting_day?: string | null
          meeting_time?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          leader_id?: string | null
          location?: string | null
          meeting_day?: string | null
          meeting_time?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          attendance_status: string | null
          attended_at: string | null
          cell_group_id: string | null
          event_id: string
          first_time: boolean | null
          id: string
          invited_by: string | null
          invited_by_id: string | null
          members_id: string
          name: string | null
          phone: string | null
          surname: string | null
        }
        Insert: {
          attendance_status?: string | null
          attended_at?: string | null
          cell_group_id?: string | null
          event_id: string
          first_time?: boolean | null
          id?: string
          invited_by?: string | null
          invited_by_id?: string | null
          members_id: string
          name?: string | null
          phone?: string | null
          surname?: string | null
        }
        Update: {
          attendance_status?: string | null
          attended_at?: string | null
          cell_group_id?: string | null
          event_id?: string
          first_time?: boolean | null
          id?: string
          invited_by?: string | null
          invited_by_id?: string | null
          members_id?: string
          name?: string | null
          phone?: string | null
          surname?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_cell_group_id_fkey"
            columns: ["cell_group_id"]
            isOneToOne: false
            referencedRelation: "cell_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_members_id_fkey"
            columns: ["members_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          completed_at: string | null
          created_at: string | null
          event_date: string
          event_time: string
          id: string
          is_completed: boolean | null
          is_whole_church: boolean | null
          location: string | null
          name: string
          pamphlet_url: string | null
          target_departments: string[] | null
          target_groups: string[] | null
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          event_date: string
          event_time: string
          id?: string
          is_completed?: boolean | null
          is_whole_church?: boolean | null
          location?: string | null
          name: string
          pamphlet_url?: string | null
          target_departments?: string[] | null
          target_groups?: string[] | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          event_date?: string
          event_time?: string
          id?: string
          is_completed?: boolean | null
          is_whole_church?: boolean | null
          location?: string | null
          name?: string
          pamphlet_url?: string | null
          target_departments?: string[] | null
          target_groups?: string[] | null
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      group_meetings: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          location: string
          meeting_date: string
          meeting_time: string
          notes: string | null
          status: string
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          location: string
          meeting_date: string
          meeting_time: string
          notes?: string | null
          status?: string
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          location?: string
          meeting_date?: string
          meeting_time?: string
          notes?: string | null
          status?: string
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_meetings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "cell_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string | null
          id: string
          joined_at: string | null
          member_id: string | null
          role: string | null
        }
        Insert: {
          group_id?: string | null
          id?: string
          joined_at?: string | null
          member_id?: string | null
          role?: string | null
        }
        Update: {
          group_id?: string | null
          id?: string
          joined_at?: string | null
          member_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "cell_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendance: {
        Row: {
          created_at: string | null
          id: string
          meeting_id: string | null
          member_id: string | null
          notes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          member_id?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          member_id?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_reports: {
        Row: {
          action_items: string | null
          created_at: string | null
          created_by: string | null
          decisions_made: string | null
          id: string
          meeting_id: string | null
          next_meeting_date: string | null
          report_text: string
        }
        Insert: {
          action_items?: string | null
          created_at?: string | null
          created_by?: string | null
          decisions_made?: string | null
          id?: string
          meeting_id?: string | null
          next_meeting_date?: string | null
          report_text: string
        }
        Update: {
          action_items?: string | null
          created_at?: string | null
          created_by?: string | null
          decisions_made?: string | null
          id?: string
          meeting_id?: string | null
          next_meeting_date?: string | null
          report_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_reports_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string | null
          group_id: string | null
          id: string
          location: string | null
          meeting_date: string
          meeting_time: string | null
          notes: string | null
          status: string | null
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          location?: string | null
          meeting_date: string
          meeting_time?: string | null
          notes?: string | null
          status?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          location?: string | null
          meeting_date?: string
          meeting_time?: string | null
          notes?: string | null
          status?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "cell_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      member_roles: {
        Row: {
          created_at: string | null
          id: string
          member_id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_id: string
          role: string
        }
        Update: {
          created_at?: string | null
          id?: string
          member_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_member_roles_member"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          admin_role: string | null
          assigned_departments: string[] | null
          assigned_groups: string[] | null
          can_add_members: boolean | null
          can_edit_members: boolean | null
          can_view_own_data: boolean | null
          cell_group_id: string | null
          created_at: string | null
          deacon_role: boolean | null
          department_leader: boolean | null
          email: string | null
          first_time_visit_date: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          group_leader: boolean | null
          id: string
          invited_by: string | null
          is_leader: boolean | null
          is_permanent_member: boolean | null
          login_pin: string | null
          login_username: string | null
          ministry_group_id: string | null
          name: string
          not_attending_reason: string | null
          pastor_role: boolean | null
          permanent_member_date: string | null
          permissions: string[] | null
          phone: string | null
          status: Database["public"]["Enums"]["member_status"] | null
          status_date: string | null
          surname: string
          updated_at: string | null
        }
        Insert: {
          admin_role?: string | null
          assigned_departments?: string[] | null
          assigned_groups?: string[] | null
          can_add_members?: boolean | null
          can_edit_members?: boolean | null
          can_view_own_data?: boolean | null
          cell_group_id?: string | null
          created_at?: string | null
          deacon_role?: boolean | null
          department_leader?: boolean | null
          email?: string | null
          first_time_visit_date?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          group_leader?: boolean | null
          id?: string
          invited_by?: string | null
          is_leader?: boolean | null
          is_permanent_member?: boolean | null
          login_pin?: string | null
          login_username?: string | null
          ministry_group_id?: string | null
          name: string
          not_attending_reason?: string | null
          pastor_role?: boolean | null
          permanent_member_date?: string | null
          permissions?: string[] | null
          phone?: string | null
          status?: Database["public"]["Enums"]["member_status"] | null
          status_date?: string | null
          surname: string
          updated_at?: string | null
        }
        Update: {
          admin_role?: string | null
          assigned_departments?: string[] | null
          assigned_groups?: string[] | null
          can_add_members?: boolean | null
          can_edit_members?: boolean | null
          can_view_own_data?: boolean | null
          cell_group_id?: string | null
          created_at?: string | null
          deacon_role?: boolean | null
          department_leader?: boolean | null
          email?: string | null
          first_time_visit_date?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          group_leader?: boolean | null
          id?: string
          invited_by?: string | null
          is_leader?: boolean | null
          is_permanent_member?: boolean | null
          login_pin?: string | null
          login_username?: string | null
          ministry_group_id?: string | null
          name?: string
          not_attending_reason?: string | null
          pastor_role?: boolean | null
          permanent_member_date?: string | null
          permissions?: string[] | null
          phone?: string | null
          status?: Database["public"]["Enums"]["member_status"] | null
          status_date?: string | null
          surname?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_cell_group"
            columns: ["cell_group_id"]
            isOneToOne: false
            referencedRelation: "cell_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_ministry_group_id_fkey"
            columns: ["ministry_group_id"]
            isOneToOne: false
            referencedRelation: "ministry_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      ministry_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cell_group_id: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          phone: string | null
          surname: string | null
          updated_at: string | null
        }
        Insert: {
          cell_group_id?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
          surname?: string | null
          updated_at?: string | null
        }
        Update: {
          cell_group_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          surname?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sermon_summaries: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          pastor_name: string
          sermon_date: string
          summary: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          pastor_name: string
          sermon_date: string
          summary: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          pastor_name?: string
          sermon_date?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sermon_summaries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      sermons: {
        Row: {
          created_at: string
          document_url: string | null
          event_id: string | null
          id: string
          pastor_name: string
          sermon_date: string
          summary: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          document_url?: string | null
          event_id?: string | null
          id?: string
          pastor_name: string
          sermon_date: string
          summary: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          document_url?: string | null
          event_id?: string | null
          id?: string
          pastor_name?: string
          sermon_date?: string
          summary?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sermons_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      gender_type: "male" | "female"
      member_status: "newcomer" | "signed_member" | "not_attending"
      user_role: "admin" | "group_leader" | "department_leader" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      gender_type: ["male", "female"],
      member_status: ["newcomer", "signed_member", "not_attending"],
      user_role: ["admin", "group_leader", "department_leader", "member"],
    },
  },
} as const
