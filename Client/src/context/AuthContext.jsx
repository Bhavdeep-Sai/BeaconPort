import { createContext, useEffect, useState } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (token && userStr) {
          const userData = JSON.parse(userStr);
          setAuthenticated(true);
          setUser(userData);
        } else {
          // Clear any partial data
          if (token && !userStr) {
            localStorage.removeItem('token');
          }
          if (!token && userStr) {
            localStorage.removeItem('user');
          }
          setAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
        // Clear corrupted data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (credentials) => {
    try {
      const token = credentials.token;
      const userData = credentials.user || credentials;

      if (!token) {
        throw new Error('Token is required for login');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setAuthenticated(true);
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      // Clean up on error
      logout();
      throw error;
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear state even if localStorage fails
      setAuthenticated(false);
      setUser(null);
    }
  };

  const updateUser = (updatedUserData) => {
    try {
      const newUserData = { ...user, ...updatedUserData };
      localStorage.setItem('user', JSON.stringify(newUserData));
      setUser(newUserData);
    } catch (error) {
      console.error('Update user error:', error);
    }
  };

  const isTokenValid = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      // Basic token validation - you might want to add JWT expiry check here
      const tokenParts = token.split('.');
      return tokenParts.length === 3; // Basic JWT structure check
    } catch (error) {
      return false;
    }
  };

  const contextValue = {
    authenticated,
    user,
    loading,
    login,
    logout,
    updateUser,
    isTokenValid
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;