import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../integrations/supabase/client';

export interface User {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  role: 'member' | 'group_leader' | 'admin';
  roles: string[];
  is_active: boolean;
  cell_group: string | null;
  department: string | null;
  login_username: string | null;
  permissions: {
    canAddMembers: boolean;
    canEditMembers: boolean;
    canViewOwnData: boolean;
  };
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const savedUser = localStorage.getItem('church_user');
        if (savedUser) setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Session error:', error);
        localStorage.removeItem('church_user');
      } finally {
        setLoading(false);
      }
    };

    checkUserSession();
  }, []);

  const login = async (identifier: string, secret: string, mode: 'email' | 'username'): Promise<boolean> => {
    try {
      let query = supabase.from('members').select(`
        *,
        profile:profiles(id, name, surname, cell_group_id),
        roles:user_roles(role)
      `).eq('is_active', true);

      if (mode === 'email') {
        query = query.eq('email', identifier);
      } else {
        query = query.eq('login_username', identifier);
      }

      const { data, error } = await query;
      
      if (error || !data?.length) return false;
      
      const member = data[0];
      const validPassword = mode === 'email' 
        ? member.login_pin === secret 
        : member.login_pin === secret;

      if (!validPassword) return false;

      const userRoles = member.roles.map((role: any) => role.role);
      const highestRole = ['admin', 'group_leader', 'member'].find(role => 
        userRoles.includes(role)
      ) || 'member';

      const authenticatedUser: User = {
        id: member.id,
        name: member.profile?.name || member.name,
        surname: member.profile?.surname || member.surname,
        email: member.email,
        phone: member.phone,
        role: highestRole,
        roles: userRoles,
        is_active: true,
        cell_group: member.cell_group_id || null,
        department: null,
        login_username: member.login_username,
        permissions: {
          canAddMembers: member.can_add_members || false,
          canEditMembers: member.can_edit_members || false,
          canViewOwnData: member.can_view_own_data || false
        }
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

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
