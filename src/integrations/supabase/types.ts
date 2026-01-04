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
            referencedRelation: "members"
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
            foreignKeyName: "cell_group_members_cell_group_id_fkey"
            columns: ["cell_group_id"]
            isOneToOne: false
            referencedRelation: "group_statistics"
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
          meeting_id: string
          member_id: string
          notes: string | null
          status: string | null
        }
        Insert: {
          arrival_time?: string | null
          created_at?: string | null
          id?: string
          meeting_id: string
          member_id: string
          notes?: string | null
          status?: string | null
        }
        Update: {
          arrival_time?: string | null
          created_at?: string | null
          id?: string
          meeting_id?: string
          member_id?: string
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
          cancellation_reason: string | null
          created_at: string | null
          department_id: string | null
          id: string
          location: string
          meeting_date: string
          meeting_time: string
          notes: string | null
          status: string | null
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          location: string
          meeting_date: string
          meeting_time: string
          notes?: string | null
          status?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          location?: string
          meeting_date?: string
          meeting_time?: string
          notes?: string | null
          status?: string | null
          topic?: string | null
          updated_at?: string | null
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
          department_id: string
          id: string
          member_id: string
          role: string | null
        }
        Insert: {
          assigned_at?: string | null
          department_id: string
          id?: string
          member_id: string
          role?: string | null
        }
        Update: {
          assigned_at?: string | null
          department_id?: string
          id?: string
          member_id?: string
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
          updated_at: string | null
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
          updated_at?: string | null
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
          updated_at?: string | null
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
            isOneToOne: true
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
          created_at: string | null
          event_id: string
          first_time: boolean | null
          id: string
          invited_by: string | null
          invited_by_id: string | null
          members_id: string
          notes: string | null
        }
        Insert: {
          attendance_status?: string | null
          attended_at?: string | null
          cell_group_id?: string | null
          created_at?: string | null
          event_id: string
          first_time?: boolean | null
          id?: string
          invited_by?: string | null
          invited_by_id?: string | null
          members_id: string
          notes?: string | null
        }
        Update: {
          attendance_status?: string | null
          attended_at?: string | null
          cell_group_id?: string | null
          created_at?: string | null
          event_id?: string
          first_time?: boolean | null
          id?: string
          invited_by?: string | null
          invited_by_id?: string | null
          members_id?: string
          notes?: string | null
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
            foreignKeyName: "event_attendees_cell_group_id_fkey"
            columns: ["cell_group_id"]
            isOneToOne: false
            referencedRelation: "group_statistics"
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
            foreignKeyName: "event_attendees_invited_by_id_fkey"
            columns: ["invited_by_id"]
            isOneToOne: false
            referencedRelation: "members"
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
          backup_created_at: string | null
          backup_file_url: string | null
          completed_at: string | null
          created_at: string | null
          event_date: string
          event_time: string
          id: string
          is_completed: boolean | null
          is_whole_church: boolean | null
          last_synced_at: string | null
          location: string | null
          name: string
          pamphlet_url: string | null
          target_departments: string[] | null
          target_groups: string[] | null
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          backup_created_at?: string | null
          backup_file_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          event_date: string
          event_time: string
          id?: string
          is_completed?: boolean | null
          is_whole_church?: boolean | null
          last_synced_at?: string | null
          location?: string | null
          name: string
          pamphlet_url?: string | null
          target_departments?: string[] | null
          target_groups?: string[] | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          backup_created_at?: string | null
          backup_file_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          event_date?: string
          event_time?: string
          id?: string
          is_completed?: boolean | null
          is_whole_church?: boolean | null
          last_synced_at?: string | null
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
          {
            foreignKeyName: "group_meetings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_statistics"
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
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_statistics"
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
          meeting_id: string
          member_id: string
          notes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meeting_id: string
          member_id: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meeting_id?: string
          member_id?: string
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
          updated_at: string | null
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
          updated_at?: string | null
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
          updated_at?: string | null
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
            isOneToOne: true
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          cancellation_reason: string | null
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
          cancellation_reason?: string | null
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
          cancellation_reason?: string | null
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
          {
            foreignKeyName: "meetings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_statistics"
            referencedColumns: ["id"]
          },
        ]
      }
      member_roles: {
        Row: {
          created_at: string | null
          id: string
          member_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          member_id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "member_roles_member_id_fkey"
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
          auth_user_id: string | null
          baptism: string | null
          can_add_members: boolean | null
          can_edit_members: boolean | null
          can_view_own_data: boolean | null
          cell_group_id: string | null
          created_at: string | null
          deacon_role: boolean | null
          department_leader: boolean | null
          first_time_visit_date: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          group_leader: boolean | null
          id: string
          invited_by: string | null
          is_admin: boolean | null
          is_developer: boolean | null
          is_hidden: boolean | null
          is_leader: boolean | null
          is_permanent_member: boolean | null
          login_pin: string | null
          login_username: string | null
          name: string
          not_attending_reason: string | null
          pastor_role: boolean | null
          permanent_member_date: string | null
          permissions: string[] | null
          phone: string | null
          residence: string
          status: Database["public"]["Enums"]["member_status"] | null
          status_date: string | null
          surname: string
          updated_at: string | null
        }
        Insert: {
          admin_role?: string | null
          assigned_departments?: string[] | null
          assigned_groups?: string[] | null
          auth_user_id?: string | null
          baptism?: string | null
          can_add_members?: boolean | null
          can_edit_members?: boolean | null
          can_view_own_data?: boolean | null
          cell_group_id?: string | null
          created_at?: string | null
          deacon_role?: boolean | null
          department_leader?: boolean | null
          first_time_visit_date?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          group_leader?: boolean | null
          id?: string
          invited_by?: string | null
          is_admin?: boolean | null
          is_developer?: boolean | null
          is_hidden?: boolean | null
          is_leader?: boolean | null
          is_permanent_member?: boolean | null
          login_pin?: string | null
          login_username?: string | null
          name: string
          not_attending_reason?: string | null
          pastor_role?: boolean | null
          permanent_member_date?: string | null
          permissions?: string[] | null
          phone?: string | null
          residence: string
          status?: Database["public"]["Enums"]["member_status"] | null
          status_date?: string | null
          surname: string
          updated_at?: string | null
        }
        Update: {
          admin_role?: string | null
          assigned_departments?: string[] | null
          assigned_groups?: string[] | null
          auth_user_id?: string | null
          baptism?: string | null
          can_add_members?: boolean | null
          can_edit_members?: boolean | null
          can_view_own_data?: boolean | null
          cell_group_id?: string | null
          created_at?: string | null
          deacon_role?: boolean | null
          department_leader?: boolean | null
          first_time_visit_date?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          group_leader?: boolean | null
          id?: string
          invited_by?: string | null
          is_admin?: boolean | null
          is_developer?: boolean | null
          is_hidden?: boolean | null
          is_leader?: boolean | null
          is_permanent_member?: boolean | null
          login_pin?: string | null
          login_username?: string | null
          name?: string
          not_attending_reason?: string | null
          pastor_role?: boolean | null
          permanent_member_date?: string | null
          permissions?: string[] | null
          phone?: string | null
          residence?: string
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
            foreignKeyName: "fk_cell_group"
            columns: ["cell_group_id"]
            isOneToOne: false
            referencedRelation: "group_statistics"
            referencedColumns: ["id"]
          },
        ]
      }
      ministry_group_members: {
        Row: {
          created_at: string | null
          id: string
          joined_at: string | null
          member_id: string
          ministry_group_id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          member_id: string
          ministry_group_id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          member_id?: string
          ministry_group_id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ministry_group_members_group_id_fkey"
            columns: ["ministry_group_id"]
            isOneToOne: false
            referencedRelation: "ministry_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_group_members_group_id_fkey"
            columns: ["ministry_group_id"]
            isOneToOne: false
            referencedRelation: "ministry_membership"
            referencedColumns: ["ministry_group_id"]
          },
          {
            foreignKeyName: "ministry_group_members_group_id_fkey"
            columns: ["ministry_group_id"]
            isOneToOne: false
            referencedRelation: "ministry_membership_view"
            referencedColumns: ["ministry_group_id"]
          },
          {
            foreignKeyName: "ministry_group_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      ministry_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          leader_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          leader_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          leader_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ministry_groups_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cell_group_id: string | null
          created_at: string | null
          id: string
          name: string | null
          phone: string | null
          surname: string | null
          updated_at: string | null
        }
        Insert: {
          cell_group_id?: string | null
          created_at?: string | null
          id: string
          name?: string | null
          phone?: string | null
          surname?: string | null
          updated_at?: string | null
        }
        Update: {
          cell_group_id?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          surname?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_cell_group_id_fkey"
            columns: ["cell_group_id"]
            isOneToOne: false
            referencedRelation: "cell_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_cell_group_id_fkey"
            columns: ["cell_group_id"]
            isOneToOne: false
            referencedRelation: "group_statistics"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          member_id: string | null
          p256dh: string
          updated_at: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          member_id?: string | null
          p256dh: string
          updated_at?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          member_id?: string | null
          p256dh?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      security_settings: {
        Row: {
          access_controls: Json | null
          audit_settings: Json | null
          created_at: string | null
          id: string
          password_policy: Json | null
          updated_at: string | null
        }
        Insert: {
          access_controls?: Json | null
          audit_settings?: Json | null
          created_at?: string | null
          id?: string
          password_policy?: Json | null
          updated_at?: string | null
        }
        Update: {
          access_controls?: Json | null
          audit_settings?: Json | null
          created_at?: string | null
          id?: string
          password_policy?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sermons: {
        Row: {
          created_at: string | null
          document_url: string | null
          event_id: string | null
          id: string
          pastor_name: string
          sermon_date: string
          summary: string
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          document_url?: string | null
          event_id?: string | null
          id?: string
          pastor_name: string
          sermon_date: string
          summary: string
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          document_url?: string | null
          event_id?: string | null
          id?: string
          pastor_name?: string
          sermon_date?: string
          summary?: string
          title?: string
          updated_at?: string | null
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
      system_config: {
        Row: {
          backup_settings: Json | null
          created_at: string | null
          global_settings: Json | null
          id: string
          updated_at: string | null
        }
        Insert: {
          backup_settings?: Json | null
          created_at?: string | null
          global_settings?: Json | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          backup_settings?: Json | null
          created_at?: string | null
          global_settings?: Json | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
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
      attendance_statistics: {
        Row: {
          absent_count: number | null
          first_time_visitors: number | null
          month: string | null
          present_count: number | null
          unique_attendees: number | null
        }
        Relationships: []
      }
      group_statistics: {
        Row: {
          avg_attendance_rate: number | null
          current_member_count: number | null
          id: string | null
          leader_id: string | null
          leader_name: string | null
          meetings_this_month: number | null
          name: string | null
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
      member_statistics: {
        Row: {
          active_members: number | null
          baptized_members: number | null
          female_members: number | null
          inactive_members: number | null
          left_members: number | null
          male_members: number | null
          newcomers: number | null
          not_attending_members: number | null
          permanent_members: number | null
          permanent_status_members: number | null
          regular_members: number | null
          signed_members: number | null
          stopped_attending_members: number | null
          total_members: number | null
        }
        Relationships: []
      }
      ministry_membership: {
        Row: {
          created_at: string | null
          joined_at: string | null
          leader_id: string | null
          leader_name: string | null
          member_id: string | null
          member_name: string | null
          ministry_group_id: string | null
          ministry_group_name: string | null
          role: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ministry_group_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_groups_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      ministry_membership_view: {
        Row: {
          joined_at: string | null
          leader_id: string | null
          leader_name: string | null
          member_id: string | null
          member_name: string | null
          ministry_group_id: string | null
          ministry_group_name: string | null
          role: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ministry_group_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_groups_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_member_to_ministry_group: {
        Args: {
          member_role?: string
          member_uuid: string
          ministry_group_uuid: string
        }
        Returns: undefined
      }
      authenticate_member: {
        Args: { p_pin: string; p_username: string }
        Returns: Json
      }
      check_user_permissions: {
        Args: { p_user_id: string }
        Returns: {
          admin_role: string
          can_manage_events: boolean
          can_manage_members: boolean
          permissions: string[]
          user_exists: boolean
        }[]
      }
      clean_uuid_array: { Args: { arr: string[] }; Returns: string[] }
      get_member_ministry_groups: {
        Args: { member_uuid: string }
        Returns: {
          joined_at: string
          ministry_group_id: string
          ministry_group_name: string
          role: string
        }[]
      }
      get_user_assigned_departments: { Args: never; Returns: string[] }
      get_user_assigned_groups: { Args: never; Returns: string[] }
      get_user_permissions: {
        Args: { user_id: string }
        Returns: {
          admin_role: string
          can_add_members: boolean
          can_edit_members: boolean
          can_view_own_data: boolean
          permissions: string[]
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_department_leader: { Args: never; Returns: boolean }
      is_group_leader: { Args: never; Returns: boolean }
      is_pastor: { Args: never; Returns: boolean }
      remove_member_from_ministry_group: {
        Args: { member_uuid: string; ministry_group_uuid: string }
        Returns: undefined
      }
      update_event_pamphlet: {
        Args: { p_event_id: string; p_pamphlet_url: string }
        Returns: Json
      }
      validate_uuid_array: { Args: { arr: string[] }; Returns: boolean }
    }
    Enums: {
      gender_enum: "male" | "female"
      gender_type: "male" | "female"
      member_gender: "male" | "female" | "other"
      member_status:
        | "newcomer"
        | "member"
        | "signed_member"
        | "permanent"
        | "active"
        | "inactive"
        | "stopped_attending"
        | "not_attending"
        | "left"
        | "signed member"
        | "stopped attending"
        | "not attending"
      user_role:
        | "pastor"
        | "administrator"
        | "deacon"
        | "department_leader"
        | "group_leader"
        | "member"
      user_role_type:
        | "pastor"
        | "administrator"
        | "deacon"
        | "department_leader"
        | "group_leader"
        | "member"
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
      gender_enum: ["male", "female"],
      gender_type: ["male", "female"],
      member_gender: ["male", "female", "other"],
      member_status: [
        "newcomer",
        "member",
        "signed_member",
        "permanent",
        "active",
        "inactive",
        "stopped_attending",
        "not_attending",
        "left",
        "signed member",
        "stopped attending",
        "not attending",
      ],
      user_role: [
        "pastor",
        "administrator",
        "deacon",
        "department_leader",
        "group_leader",
        "member",
      ],
      user_role_type: [
        "pastor",
        "administrator",
        "deacon",
        "department_leader",
        "group_leader",
        "member",
      ],
    },
  },
} as const
