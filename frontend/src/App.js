// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Videos from './pages/Videos';

const App = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route exact path="/" element={<Home />} />
        <Route exact path="login" element={<Login />} />
        <Route exact path="/register" element={<Register />} />
        <Route path="/videos" element={<Videos />} />
      </Routes>
      <Footer />
    </Router>
  );
};

export default App;
