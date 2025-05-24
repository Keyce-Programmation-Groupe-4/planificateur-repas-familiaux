// src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage'; // We will create this next
import SignupPage from './pages/SignupPage'; // We will create this next
import HomePage from './pages/HomePage'; // Placeholder
import ProfilePage from './pages/ProfilePage'; // Placeholder
import FamilyPage from './pages/FamilyPage'; // Placeholder
import Layout from './components/Layout'; // We will create this next
import AuthProvider from './contexts/AuthContext'; // We will create this next
import ProtectedRoute from './components/ProtectedRoute'; // We will create this next

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/family" element={<ProtectedRoute><FamilyPage /></ProtectedRoute>} />

          {/* Add other routes later */}
        </Routes>
      </Layout>
    </AuthProvider>
  );
}

export default App;
