// contexts/AuthContext.tsx
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
  login: (identifier: string, secret: string, mode: 'email' | 'username') => boolean;
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

  const login = (identifier: string, secret: string, mode: 'email' | 'username'): boolean => {
    // For demo purposes - in real app, you would query Supabase
    const demoUsers: User[] = [
      {
        id: '1',
        name: 'Admin',
        surname: 'User',
        email: 'admin@church.com',
        phone: '+1234567890',
        role: 'admin',
        permissions: ['admin_access'],
        is_active: true,
        cell_group: null,
        department: null,
        login_username: 'admin_user',
        login_pin: '1234',
        assigned_groups: [],
        assigned_departments: [],
        can_add_members: true,
        can_edit_members: true,
        can_view_own_data: true
      },
      {
        id: '2',
        name: 'Sarah',
        surname: 'Smith',
        email: 'sarah@church.com',
        phone: '+0987654321',
        role: 'group_leader',
        permissions: ['view_members', 'add_members', 'edit_members', 'view_events', 'view_groups', 'manage_groups'],
        is_active: true,
        cell_group: 'Women Fellowship',
        department: 'Worship',
        login_username: 'sarah_smith',
        login_pin: '5432',
        assigned_groups: ['Youth Ministry', 'Women Fellowship'],
        assigned_departments: [],
        can_add_members: true,
        can_edit_members: true,
        can_view_own_data: true
      },
      {
        id: '3',
        name: 'Mike',
        surname: 'Johnson',
        email: 'mike@church.com',
        phone: '+1122334455',
        role: 'department_leader',
        permissions: ['view_members', 'add_members', 'edit_members', 'view_events', 'view_groups', 'manage_groups'],
        is_active: true,
        cell_group: null,
        department: 'Worship',
        login_username: 'mike_johnson',
        login_pin: '7890',
        assigned_groups: [],
        assigned_departments: ['Worship', 'Media'],
        can_add_members: true,
        can_edit_members: true,
        can_view_own_data: true
      }
    ];

    let authenticatedUser: User | null = null;

    if (mode === 'email') {
      // Email login
      authenticatedUser = demoUsers.find(
        u => u.email === identifier && secret === 'admin123'
      ) || null;
    } else {
      // Username/PIN login
      authenticatedUser = demoUsers.find(
        u => u.login_username === identifier && u.login_pin === secret
      ) || null;
    }

    if (authenticatedUser) {
      setUser(authenticatedUser);
      localStorage.setItem('church_user', JSON.stringify(authenticatedUser));
      return true;
    }

    return false;
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
