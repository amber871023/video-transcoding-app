import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

// Custom hook to use the AuthContext
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  // Initialize state from localStorage when the component mounts
  useEffect(() => {
    const storedToken = localStorage.getItem('idToken');
    const storedUsername = localStorage.getItem('username');

    if (storedToken && storedUsername) {
      setIsLoggedIn(true);
      setUsername(storedUsername);
    }
  }, []);

  const login = (userData) => {
    setIsLoggedIn(true);
    setUsername(userData.username);
    console.log(userData);
    localStorage.setItem('idToken', userData.idToken);
    localStorage.setItem('username', userData.username);
  };

  const logout = () => {
    localStorage.removeItem('idToken');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
    navigate('/');
  };

  // const role =() =>{
  //   localStorage.setItem()
  // }
  return (
    <AuthContext.Provider value={{ isLoggedIn, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
