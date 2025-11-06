import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../integrations/supabase/client';

interface User {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  role: string;
  permissions: string[];
  is_active: boolean;
  cell_group: string | null;
  department: string | null;
  login_username: string | null;
  login_pin: string | null;
  assigned_groups: string[];
  assigned_departments: string[];
  can_add_members: boolean;
  can_edit_members: boolean;
  can_view_own_data: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, secret: string, mode: 'email' | 'username') => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkUserSession();
  }, []);

  const checkUserSession = async () => {
    try {
      const savedUser = localStorage.getItem('church_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      }
    } catch (error) {
      console.error('Error checking user session:', error);
      localStorage.removeItem('church_user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier: string, secret: string, mode: 'email' | 'username'): Promise<boolean> => {
    try {
      // Query Supabase for the user
      let query = supabase.from('members').select('*');
      
      if (mode === 'email') {
        query = query.eq('email', identifier);
      } else {
        query = query.eq('login_username', identifier).eq('login_pin', secret);
      }
      
      const { data: members, error } = await query;

      if (error || !members || members.length === 0) {
        console.error('Login error:', error);
        return false;
      }

      const member = members[0];
      
      // For email mode, verify password (simplified for now)
      if (mode === 'email') {
        // TODO: Implement proper password hashing and verification
        // For now, we'll just check if the email exists
      }

      const authenticatedUser: User = {
        id: member.id,
        name: member.name,
        surname: member.surname,
        email: member.email,
        phone: member.phone,
        role: (member as any).is_leader ? 'leader' : 'member',
        permissions: (member as any).permissions || [],
        is_active: true,
        cell_group: member.cell_group_id,
        department: null,
        login_username: (member as any).login_username,
        login_pin: (member as any).login_pin,
        assigned_groups: (member as any).assigned_groups || [],
        assigned_departments: (member as any).assigned_departments || [],
        can_add_members: (member as any).can_add_members || false,
        can_edit_members: (member as any).can_edit_members || false,
        can_view_own_data: (member as any).can_view_own_data || false
      };

      setUser(authenticatedUser);
      localStorage.setItem('church_user', JSON.stringify(authenticatedUser));
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('church_user');
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
