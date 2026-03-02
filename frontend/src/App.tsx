import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AIAssistant from './pages/AIAssistant';
import { AuthProvider } from './context/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="/workspaces" element={<div style={{ paddingTop: '120px', textAlign: 'center' }}><h1>Workspaces Page (To be implemented)</h1></div>} />
              <Route path="/pricing" element={<div style={{ paddingTop: '120px', textAlign: 'center' }}><h1>Pricing Page (To be implemented)</h1></div>} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
