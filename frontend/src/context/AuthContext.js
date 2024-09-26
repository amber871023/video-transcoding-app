import React, { createContext, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

// Custom hook to use the AuthContext
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('idToken'));
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
  const navigate = useNavigate();

  const login = (userData) => {
    setIsLoggedIn(true);
    setUsername(userData.username);
    localStorage.setItem('token', userData.idToken);
    localStorage.setItem('username', userData.username);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
