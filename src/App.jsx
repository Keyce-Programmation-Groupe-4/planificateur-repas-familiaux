import { Routes, Route, Outlet } from "react-router-dom" // Outlet might be useful
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
import VendorLayout from "./components/VendorLayout";
import VendorRoute from "./components/VendorRoute";
import PendingApprovalPage from "./pages/vendor/PendingApprovalPage";
import VendorOrderDashboard from "./pages/vendor/VendorOrderDashboard"; // Assuming this will be created
import VendorDashboardProfilePage from "./pages/vendor/VendorProfilePage"; // Renamed import for clarity
import VendorProductsPage from "./pages/vendor/VendorProductsPage"; // Added for vendor products
import { AuthProvider } from "./contexts/AuthContext"
import Notifications from './components/Notifications/Notifications.jsx'; // <<< ADD THIS
import DeliveryRequestPage from "./pages/delivery/DeliveryRequestPage"
import DeliveryTrackingPage from "./pages/delivery/DeliveryTrackingPage"
import MyDeliveriesPage from "./pages/delivery/MyDeliveriesPage"
import VendorsPage from "./pages/delivery/VendorsPage"
import VendorProfilePage from "./pages/delivery/VendorProfilePage"
import OrderReviewPage from "./pages/delivery/OrderReviewPage" // Added
import VendorSignupPage from "./pages/vendor/VendorSignupPage"
import AdminDashboard from "./pages/admin/AdminDashboard"
import AdminUserManagement from "./pages/admin/AdminUserManagement"
import AdminRecipeManagement from "./pages/admin/AdminRecipeManagement"
import AdminIngredientManagement from "./pages/admin/AdminIngredientManagement"
import AdminVendorManagement from "./pages/admin/AdminVendorManagement"
import AdminDeliveryManagement from "./pages/admin/AdminDeliveryManagement" // Added

// Define a layout component for user routes
const UserRoutesLayout = () => (
  <Layout>
    <Outlet /> {/* Child routes will render here */}
  </Layout>
);

function App() {
  return (
    <AuthProvider>
      <Notifications /> {/* <<< ADD THIS HERE */}
      <Routes>
        {/* User Facing Routes wrapped by Main Layout */}
        <Route element={<UserRoutesLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/vendor/signup" element={<VendorSignupPage />} /> {/* Public vendor signup */}

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
            path="/recipes/aggregate"
            element={
              <ProtectedRoute>
                <AggregateRecipesPage />
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
            path="/recipes/:recipeId/edit"
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
            path="/vendors/:id"
            element={
              <ProtectedRoute>
                <VendorProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery/review/:orderId"
            element={
              <ProtectedRoute>
                <OrderReviewPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Vendor Pending Approval Page - accessible without full vendor rights yet */}
        <Route path="/vendor/pending-approval" element={<PendingApprovalPage />} />

        {/* Vendor Routes - Protected and uses VendorLayout */}
        <Route
          path="/vendor"
          element={
            <VendorRoute>
              <VendorLayout />
            </VendorRoute>
          }
        >
          <Route path="dashboard" element={<VendorOrderDashboard />} />
          <Route path="profile" element={<VendorDashboardProfilePage />} />
          <Route path="products" element={<VendorProductsPage />} />
          {/* Add other vendor-specific nested routes here, e.g., products, orders, etc. */}
        </Route>

        {/* Admin Routes - Not wrapped by the main Layout */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUserManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/recipes"
          element={
            <AdminRoute>
              <AdminRecipeManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/ingredients"
          element={
            <AdminRoute>
              <AdminIngredientManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/vendors"
          element={
            <AdminRoute>
              <AdminVendorManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/deliveries"
          element={
            <AdminRoute>
              <AdminDeliveryManagement />
            </AdminRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}

export default App
