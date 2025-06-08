/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { TokenManager } from '@/utils/tokenManager';

interface UserData {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check authentication status on mount and when storage changes
    const checkAuth = () => {
      const authenticated = TokenManager.isAuthenticated();
      const user = TokenManager.getUserData();
      const type = TokenManager.getUserType();
      
      setIsAuthenticated(authenticated);
      setUserData(user);
      setUserType(type);
      setIsLoading(false);
    };

    checkAuth();
    
    // Listen for storage changes (if user logs out in another tab)
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = (authData: any) => {
    TokenManager.setAuthData(authData);
    setIsAuthenticated(true);
    setUserData(authData.user_data);
    setUserType(authData.user_type);
  };

  const logout = () => {
    TokenManager.clearAuthData();
    setIsAuthenticated(false);
    setUserData(null);
    setUserType(null);
  };

  return {
    isAuthenticated,
    userData,
    userType,
    isLoading,
    login,
    logout
  };
};