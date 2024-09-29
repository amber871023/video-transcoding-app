import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

// Custom hook to use the AuthContext
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [userGroup, setUserGroup] = useState('');
  const navigate = useNavigate();

  // Initialize state from localStorage when the component mounts
  useEffect(() => {
    const storedToken = localStorage.getItem('idToken');
    const storedUsername = localStorage.getItem('username');
    const storedUserGroup = localStorage.getItem('userGroup');

    if (storedToken && storedUsername && storedUserGroup) {
      setIsLoggedIn(true);
      setUsername(storedUsername);
      setUserGroup(storedUserGroup);
    }
  }, []);

  const login = (userData) => {
    setIsLoggedIn(true);
    setUsername(userData.username);
    setUserGroup(userData.userGroup);
    console.log(userData);
    localStorage.setItem('idToken', userData.idToken);
    localStorage.setItem('username', userData.username);
    localStorage.setItem('userGroup', userData.userGroup);
  };

  const logout = () => {
    localStorage.removeItem('idToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userGroup');
    setIsLoggedIn(false);
    setUsername('');
    navigate('/');
  };

  // const role =() =>{
  //   localStorage.setItem()
  // }
  return (
    <AuthContext.Provider value={{ isLoggedIn, username, login, logout, userGroup }}>
      {children}
    </AuthContext.Provider>
  );
};
