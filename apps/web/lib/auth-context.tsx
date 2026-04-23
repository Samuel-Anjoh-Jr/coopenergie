'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  password: string;
}

// Demo users with hardcoded passwords
export const DEMO_USERS: DemoUser[] = [
  { id: '1', name: 'Jean Akogo', email: 'jean@coopenergie.cm', password: 'jean123' },
  { id: '2', name: 'Marie Ndoumbe', email: 'marie@coopenergie.cm', password: 'marie123' },
  { id: '3', name: 'Pierre Mbida', email: 'pierre@coopenergie.cm', password: 'pierre123' },
  { id: '4', name: 'Amara Diallo', email: 'amara@coopenergie.cm', password: 'amara123' },
  { id: '5', name: 'Sophie Ebonji', email: 'sophie@coopenergie.cm', password: 'sophie123' },
];

interface AuthContextType {
  currentUser: DemoUser | null;
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const stored = localStorage.getItem('coopenergie_user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('coopenergie_user');
      }
    }
  }, []);

  const login = (email: string, password: string): { success: boolean; error?: string } => {
    const user = DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    if (user.password !== password) {
      return { success: false, error: 'Invalid password' };
    }
    
    setCurrentUser(user);
    localStorage.setItem('coopenergie_user', JSON.stringify(user));
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('coopenergie_user');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isAuthenticated: !!currentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
