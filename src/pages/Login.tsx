// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  email: string;
  role: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => boolean;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored authentication on app start
    const checkStoredAuth = () => {
      try {
        const storedUser = localStorage.getItem('church_user');
        const rememberMe = localStorage.getItem('church_remember_me') === 'true';
        
        if (storedUser && rememberMe) {
          setUser(JSON.parse(storedUser));
        } else {
          // Also check sessionStorage for temporary login
          const sessionUser = sessionStorage.getItem('church_user');
          if (sessionUser) {
            setUser(JSON.parse(sessionUser));
          }
        }
      } catch (error) {
        console.error('Error checking stored auth:', error);
        // Clear invalid stored data
        localStorage.removeItem('church_user');
        localStorage.removeItem('church_remember_me');
        sessionStorage.removeItem('church_user');
      } finally {
        setIsLoading(false);
      }
    };

    checkStoredAuth();
  }, []);

  const login = (email: string, password: string, rememberMe: boolean = false): boolean => {
    // Mock authentication
    const mockUsers = [
      { email: 'admin@church.com', password: 'admin123', role: 'admin', name: 'Administrator' },
      { email: 'pastor@church.com', password: 'pastor123', role: 'pastor', name: 'Pastor John' },
      { email: 'leader@church.com', password: 'leader123', role: 'leader', name: 'Group Leader' },
    ];

    const foundUser = mockUsers.find(u => u.email === email && u.password === password);
    
    if (foundUser) {
      const userData = { email: foundUser.email, role: foundUser.role, name: foundUser.name };
      setUser(userData);
      
      if (rememberMe) {
        localStorage.setItem('church_user', JSON.stringify(userData));
        localStorage.setItem('church_remember_me', 'true');
        sessionStorage.removeItem('church_user');
      } else {
        // Only store in sessionStorage for session-only persistence
        sessionStorage.setItem('church_user', JSON.stringify(userData));
        localStorage.removeItem('church_user');
        localStorage.removeItem('church_remember_me');
      }
      
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('church_user');
    localStorage.removeItem('church_remember_me');
    sessionStorage.removeItem('church_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
