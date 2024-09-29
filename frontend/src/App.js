import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Videos from './pages/Videos';
import Admin from './pages/Admin';
import ProtectedRoute from './components/ProtectedRoute'; // Import the protected route

const App = () => {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/videos" element={<Videos />} />
        {/* <Route path="/users" element={<Admin />} /> */}
        {/* Protect the admin route */}
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Routes> 
      <Footer />
    </>
  );
};

export default App;
