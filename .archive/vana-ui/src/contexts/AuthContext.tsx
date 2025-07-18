import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  isAuthenticated: boolean;
  user: {
    email: string;
    name: string;
  } | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const navigate = useNavigate();

  // Check for existing auth on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem('vana_auth');
    if (storedAuth) {
      const authData = JSON.parse(storedAuth);
      setIsAuthenticated(true);
      setUser(authData.user);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simple demo authentication - in production, this would call an API
    if (email && password) {
      const userData = {
        email: email,
        name: email.split('@')[0] // Extract name from email
      };
      
      // Store auth state
      localStorage.setItem('vana_auth', JSON.stringify({
        isAuthenticated: true,
        user: userData
      }));
      
      setIsAuthenticated(true);
      setUser(userData);
      navigate('/chat');
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('vana_auth');
    setIsAuthenticated(false);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};