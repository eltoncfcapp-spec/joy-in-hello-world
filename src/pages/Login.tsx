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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for stored authentication on app start
    const storedUser = localStorage.getItem('church_user');
    const rememberMe = localStorage.getItem('church_remember_me') === 'true';
    
    if (storedUser && rememberMe) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (email: string, password: string, rememberMe: boolean = false): boolean => {
    // Mock authentication - same as your working version
    const mockUsers = [
      { email: 'admin@church.com', password: 'admin123', role: 'admin', name: 'Administrator' },
      { email: 'pastor@church.com', password: 'pastor123', role: 'pastor', name: 'Pastor John' },
    ];

    const foundUser = mockUsers.find(u => u.email === email && u.password === password);
    
    if (foundUser) {
      const userData = { email: foundUser.email, role: foundUser.role, name: foundUser.name };
      setUser(userData);
      
      if (rememberMe) {
        // Store in localStorage for persistence across browser sessions
        localStorage.setItem('church_user', JSON.stringify(userData));
        localStorage.setItem('church_remember_me', 'true');
      } else {
        // Only store in sessionStorage for current session only
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
    <AuthContext.Provider value={{ user, login, logout }}>
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
