import React from 'react';
import './App.css';
import './index.css'
import { BrowserRouter as Router, Route, Routes } from 'react-router';
import LandingPage from './pages/LandingPage.js';
import CellDataPage from './pages/CellDataPage.js';
import Header from './components/Header.js'
import Footer from './components/Footer.js'
import SuspensionDataPage from './pages/SuspensionDataPage.js';
import GPSDataPage from './pages/GPSDataPage.js';
import TCUDataPage from './pages/TCUDataPage.js';

function App() {
  return (
    <Router>
      <div className="App">
        <Header/>
        <main className="App-Content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/celldata" element={<CellDataPage/>} />
            <Route path="/suspensiondata" element={<SuspensionDataPage/>} />
            <Route path="/gpsdata" element={<GPSDataPage/>} />
            <Route path="/tcudata" element={<TCUDataPage/>} />
          </Routes>
        </main>
        < Footer/>
      </div>
    </Router>
  );
}

export default App;
