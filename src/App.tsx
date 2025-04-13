import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/toaster';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './components/auth/LoginPage';
import MonitoringDashboard from './components/dashboard/MonitoringDashboard';
import MonitorDetailsPage from './components/dashboard/MonitorDetailsPage'; // Import details page
import PrivateRoute from './components/auth/PrivateRoute.tsx'; // Added .tsx extension
import PublicStatusPage from './components/public/PublicStatusPage'; // Import the new page

function App() {
  return (
    <> 
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/status" element={<PublicStatusPage />} /> {/* Add public status page route */}

        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          <Route element={<DashboardLayout />}>
             {/* Redirect base path to dashboard */}
             <Route path="/" element={<Navigate to="/dashboard" replace />} />
             <Route path="/dashboard" element={<MonitoringDashboard />} />
             <Route path="/monitor/:id" element={<MonitorDetailsPage />} /> {/* Add monitor details route */}
             {/* Add other protected dashboard routes here if needed */}
           </Route>
         </Route>

        {/* Optional: Add a 404 Not Found route */}
        {/* <Route path="*" element={<NotFoundPage />} /> */}
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
