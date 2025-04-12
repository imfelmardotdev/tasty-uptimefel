import { Suspense } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Home from "./components/home";
import PublicStatusPage from "./components/public/PublicStatusPage";
import LoginPage from "./components/auth/LoginPage";
import { useAuth } from "./contexts/AuthContext"; // Import useAuth hook

// Protected Route Component: Uses AuthContext to check authentication
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth(); // Use context state
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>; // Render children if authenticated
};

// Public Route Component: Redirects if already authenticated
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();

  // If user is authenticated, redirect away from public-only pages (like login)
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>; // Render children if not authenticated
};


function App() {
  const { isAuthenticated } = useAuth(); // Get auth state for root redirect

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <>
        <Routes>
          {/* Public routes wrapped with PublicRoute */}
          <Route
            path="/status"
            element={
              <PublicRoute>
                <PublicStatusPage />
              </PublicRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Protected routes wrapped with ProtectedRoute */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          {/* Root path redirection based on context */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/status" replace />
              )
            }
          />
        </Routes>
      </>
    </Suspense>
  );
}

export default App;
