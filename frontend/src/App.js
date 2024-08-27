// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Videos from './pages/Videos';

// Import other pages like VideosPage when they are ready

const App = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route exact path="/" component={Home} />
        <Route path="/videos" component={Videos} /> {/* Replace with actual VideosPage component */}
      </Routes>
      <Footer />
    </Router>
  );
};

export default App;
