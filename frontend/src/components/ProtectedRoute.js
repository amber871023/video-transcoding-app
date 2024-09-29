import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Auth provider from the previous step

const ProtectedRoute = ({  children }) => {
  const { username, userGroup } = useAuth();
  console.log("Stored username: ", username); // Debugging log

   // If no user is logged in, redirect to login page
   if (!username) {
    console.log("Stored username: ", username); // Debugging log
    return <Navigate to="/login" replace />;
  }

  // If user is not an admin, redirect to home page
  if (userGroup !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // If user has the correct role, render the children components
  return children;
};

export default ProtectedRoute;