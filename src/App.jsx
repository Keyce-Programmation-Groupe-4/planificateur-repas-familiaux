// src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import FamilyPage from './pages/FamilyPage';
import RecipesListPage from './pages/RecipesListPage';
import RecipeDetailPage from './pages/RecipeDetailPage'; // <-- Import the new detail page
// Import RecipeFormPage later
import Layout from './components/Layout';
import AuthProvider from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

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
          <Route path="/recipes" element={<ProtectedRoute><RecipesListPage /></ProtectedRoute>} />
          {/* NEW: Route for Recipe Detail Page */} 
          <Route path="/recipes/:recipeId" element={<ProtectedRoute><RecipeDetailPage /></ProtectedRoute>} />
          {/* Add routes for edit/new later */}
          {/* <Route path="/recipes/new" element={<ProtectedRoute><RecipeFormPage /></ProtectedRoute>} /> */}
          {/* <Route path="/recipes/:recipeId/edit" element={<ProtectedRoute><RecipeFormPage /></ProtectedRoute>} /> */}

          {/* Add other routes as needed */}
          {/* <Route path="*" element={<NotFoundPage />} /> */}
        </Routes>
      </Layout>
    </AuthProvider>
  );
}

export default App;

