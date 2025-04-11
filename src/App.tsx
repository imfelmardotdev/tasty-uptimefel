import { Suspense, useEffect } from "react";
import {
  useRoutes,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Home from "./components/home";
import PublicStatusPage from "./components/public/PublicStatusPage";
import LoginPage from "./components/auth/LoginPage";
import routes from "tempo-routes";

// Auth guard component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

function App() {
  // Check for authentication on app load
  useEffect(() => {
    // You could add token validation logic here
    const checkAuth = () => {
      if (typeof window !== "undefined") {
        const isAuthenticated =
          localStorage.getItem("isAuthenticated") === "true";
        // Additional validation could be done here
      }
    };

    checkAuth();
  }, []);

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <>
        <Routes>
          {/* Public routes */}
          <Route path="/status" element={<PublicStatusPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          {/* Redirect root to dashboard if authenticated, otherwise to status page */}
          <Route
            path="/"
            element={
              typeof window !== "undefined" &&
              localStorage.getItem("isAuthenticated") === "true" ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/status" replace />
              )
            }
          />
        </Routes>
        {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
      </>
    </Suspense>
  );
}

export default App;
