// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase'; // Corrected path

const SUPABASE_URL = "https://zvwotqerxmohasszzybs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2d290cWVyeG1vaGFzc3p6eWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mzc2MjUsImV4cCI6MjA3NzUxMzYyNX0.2aaNglmJ2s-z8nnv0TPWBcawx4xSioldmKzCvjUlqaA";

// Validate environment variables
if (!SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing SUPABASE_PUBLISHABLE_KEY environment variable');
}

// Create Supabase client with enhanced configuration
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'church-management-system',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper functions for common operations
export const supabaseHelpers = {
  // Fetch members with pagination
  async fetchMembers(limit = 100, page = 0) {
    const from = page * limit;
    const to = from + limit - 1;
    
    return await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
  },

  // Fetch upcoming events
  async fetchUpcomingEvents() {
    const today = new Date().toISOString().split('T')[0];
    
    return await supabase
      .from('events')
      .select('*')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(10);
  },

  // Fetch cell groups
  async fetchCellGroups() {
    return await supabase
      .from('cell_groups')
      .select('id, name, location, meeting_day, meeting_time')
      .order('name');
  },

  // Fetch sermons
  async fetchSermons(limit = 20) {
    return await supabase
      .from('sermons')
      .select(`
        *,
        events (
          name,
          topic
        )
      `)
      .order('sermon_date', { ascending: false })
      .limit(limit);
  },

  // Upload file to storage
  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return { data, publicUrl };
  },

  // Get file URL
  getFileUrl(bucket: string, path: string) {
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return publicUrl;
  },

  // Subscribe to real-time updates
  subscribeToTable(table: string, callback: (payload: any) => void) {
    return supabase
      .channel('table-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
        },
        callback
      )
      .subscribe();
  },
};

// Export auth functions for convenience
export const auth = {
  // Sign in with email/password
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Sign up with email/password
  async signUpWithEmail(email: string, password: string, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get current session
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  // Get current user
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Reset password
  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  },
};

// Export storage functions
export const storage = {
  // Upload event pamphlet
  async uploadPamphlet(eventId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${eventId}/pamphlet.${fileExt}`;
    const filePath = `event-pamphlets/${fileName}`;

    return await supabaseHelpers.uploadFile('event-pamphlets', filePath, file);
  },

  // Upload sermon document
  async uploadSermonDocument(sermonId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${sermonId}/document.${fileExt}`;
    const filePath = `sermon-documents/${fileName}`;

    return await supabaseHelpers.uploadFile('sermon-documents', filePath, file);
  },

  // Upload sermon video
  async uploadSermonVideo(sermonId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${sermonId}/video.${fileExt}`;
    const filePath = `sermon-videos/${fileName}`;

    return await supabaseHelpers.uploadFile('sermon-videos', filePath, file);
  },

  // Get storage buckets
  async getBuckets() {
    const { data, error } = await supabase.storage.listBuckets();
    return { data, error };
  },

  // List files in bucket
  async listFiles(bucket: string, path = '') {
    const { data, error } = await supabase.storage.from(bucket).list(path);
    return { data, error };
  },
};

// Type exports for convenience
export type { Database };
export type Member = Database['public']['Tables']['members']['Row'];
export type Event = Database['public']['Tables']['events']['Row'];
export type CellGroup = Database['public']['Tables']['cell_groups']['Row'];
export type Sermon = Database['public']['Tables']['sermons']['Row'];
export type Department = Database['public']['Tables']['departments']['Row'];

// Default export
export default supabase;
