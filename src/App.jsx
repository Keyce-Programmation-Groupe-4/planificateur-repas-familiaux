// src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/HomePage'; // Placeholder for logged-in view
import ProfilePage from './pages/ProfilePage';
import FamilyPage from './pages/FamilyPage';
import RecipesListPage from './pages/RecipesListPage'; // <-- Import the new page
// Import other recipe pages later: RecipeDetailPage, RecipeFormPage
import Layout from './components/Layout'; // Main layout with AppBar
import AuthProvider from './contexts/AuthContext'; // Context for auth state
import ProtectedRoute from './components/ProtectedRoute'; // Wrapper for protected routes

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          {/* Add forgot password route later */}

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/family" element={<ProtectedRoute><FamilyPage /></ProtectedRoute>} />
          {/* NEW: Route for Recipes List Page */} 
          <Route path="/recipes" element={<ProtectedRoute><RecipesListPage /></ProtectedRoute>} />
          {/* Add routes for recipe detail and edit/new later */}
          {/* <Route path="/recipes/:recipeId" element={<ProtectedRoute><RecipeDetailPage /></ProtectedRoute>} /> */}
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

