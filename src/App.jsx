import { Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"
import theme from "./theme"
import Layout from "./components/Layout"
import HomePage from "./pages/HomePage"
import LoginPage from "./pages/LoginPage"
import SignupPage from "./pages/SignupPage"
import RecipesListPage from "./pages/RecipesListPage"
import RecipeDetailPage from "./pages/RecipeDetailPage"
import RecipeFormPage from "./pages/RecipeFormPage"
import WeeklyPlannerPage from "./pages/planner/WeeklyPlannerPage"
import ShoppingListPage from "./pages/ShoppingListPage"
import ProfilePage from "./pages/ProfilePage"
import FamilyPage from "./pages/FamilyPage"
import IngredientsPage from "./pages/IngredientsPage"
import StockPage from "./pages/StockPage"
import AggregateRecipesPage from "./pages/AggregateRecipesPage"
import { AuthProvider } from "./contexts/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"

// Nouvelles pages pour la fonctionnalité d'ubérisation
import DeliveryRequestPage from "./pages/delivery/DeliveryRequestPage"
import DeliveryTrackingPage from "./pages/delivery/DeliveryTrackingPage"
import MyDeliveriesPage from "./pages/delivery/MyDeliveriesPage"
import VendorsPage from "./pages/delivery/VendorsPage"
import VendorProfilePage from "./pages/delivery/VendorProfilePage"

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/recipes"
              element={
                <ProtectedRoute>
                  <RecipesListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recipes/:recipeId"
              element={
                <ProtectedRoute>
                  <RecipeDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recipes/new"
              element={
                <ProtectedRoute>
                  <RecipeFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recipes/edit/:recipeId"
              element={
                <ProtectedRoute>
                  <RecipeFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planner"
              element={
                <ProtectedRoute>
                  <WeeklyPlannerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shopping-list"
              element={
                <ProtectedRoute>
                  <ShoppingListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/family"
              element={
                <ProtectedRoute>
                  <FamilyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ingredients"
              element={
                <ProtectedRoute>
                  <IngredientsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock"
              element={
                <ProtectedRoute>
                  <StockPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/aggregate-recipes"
              element={
                <ProtectedRoute>
                  <AggregateRecipesPage />
                </ProtectedRoute>
              }
            />

            {/* Nouvelles routes pour la fonctionnalité d'ubérisation */}
            <Route
              path="/delivery/request"
              element={
                <ProtectedRoute>
                  <DeliveryRequestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/delivery/tracking/:deliveryId"
              element={
                <ProtectedRoute>
                  <DeliveryTrackingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/deliveries"
              element={
                <ProtectedRoute>
                  <MyDeliveriesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendors"
              element={
                <ProtectedRoute>
                  <VendorsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendors/:vendorId"
              element={
                <ProtectedRoute>
                  <VendorProfilePage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Layout>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
