import { Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import HomePage from "./pages/HomePage"
import LoginPage from "./pages/LoginPage"
import SignupPage from "./pages/SignupPage"
import ProfilePage from "./pages/ProfilePage"
import RecipesListPage from "./pages/RecipesListPage"
import RecipeDetailPage from "./pages/RecipeDetailPage"
import RecipeFormPage from "./pages/RecipeFormPage"
import WeeklyPlannerPage from "./pages/planner/WeeklyPlannerPage"
import AggregateRecipesPage from "./pages/AggregateRecipesPage"
import ShoppingListPage from "./pages/ShoppingListPage"
import StockPage from "./pages/StockPage"
import IngredientsPage from "./pages/IngredientsPage"
import FamilyPage from "./pages/FamilyPage"
import ProtectedRoute from "./components/ProtectedRoute"
import AdminRoute from "./components/AdminRoute"
import { AuthProvider } from "./contexts/AuthContext"
import DeliveryRequestPage from "./pages/delivery/DeliveryRequestPage"
import DeliveryTrackingPage from "./pages/delivery/DeliveryTrackingPage"
import MyDeliveriesPage from "./pages/delivery/MyDeliveriesPage"
import VendorsPage from "./pages/delivery/VendorsPage"
import VendorProfilePage from "./pages/delivery/VendorProfilePage"
import VendorSignupPage from "./pages/vendor/VendorSignupPage"
import AdminDashboard from "./pages/admin/AdminDashboard"

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
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
            path="/planner/aggregate"
            element={
              <ProtectedRoute>
                <AggregateRecipesPage />
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
            path="/stock"
            element={
              <ProtectedRoute>
                <StockPage />
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
            path="/family"
            element={
              <ProtectedRoute>
                <FamilyPage />
              </ProtectedRoute>
            }
          />

          {/* Routes pour les livraisons */}
          <Route
            path="/delivery/request"
            element={
              <ProtectedRoute>
                <DeliveryRequestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery/tracking/:id"
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
            path="/vendors/:id"
            element={
              <ProtectedRoute>
                <VendorProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Route d'inscription vendeur (publique) */}
          <Route path="/vendor/signup" element={<VendorSignupPage />} />

          {/* Routes admin */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
        </Routes>
      </Layout>
    </AuthProvider>
  )
}

export default App
