import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import ChartsPage from './pages/ChartsPage';
import './App.css';
import HeatMapPage from './pages/HeatMapPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <main className="App-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/charts" element={<ChartsPage />} />
            <Route path="/heatmaps" element={<HeatMapPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
