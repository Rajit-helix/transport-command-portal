import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import AdminDashboard from "./pages/AdminDashboard";
import AuditLogsPage from "./pages/AuditLogsPage";
import BrowseRoutesPage from "./pages/BrowseRoutesPage";
import DriverDashboard from "./pages/DriverDashboard";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LoginPage from "./pages/LoginPage";
import ManagerDashboard from "./pages/ManagerDashboard";
import ManagerAssignmentsPage from "./pages/ManagerAssignmentsPage";
import ManagerCitiesPage from "./pages/ManagerCitiesPage";
import ManagerVehiclesPage from "./pages/ManagerVehiclesPage";
import ManagerSchedulesPage from "./pages/ManagerSchedulesPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ManagerRoutesPage from "./pages/ManagerRoutesPage";

function HomeRedirect() {
  const { user } = useAuth();
  const accessToken = localStorage.getItem("accessToken");

  if (!user || !accessToken) return <Navigate to="/login" replace />;
  if (user.role === "ADMIN") return <Navigate to="/admin" replace />;
  if (user.role === "TRANSPORT_MANAGER") return <Navigate to="/manager" replace />;
  if (user.role === "DRIVER") return <Navigate to="/driver" replace />;
  return <Navigate to="/customer/routes" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/customer/routes"
        element={
          <ProtectedRoute allowedRoles={["CUSTOMER"]}>
            <AppLayout>
              <BrowseRoutesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/bookings"
        element={
          <ProtectedRoute allowedRoles={["CUSTOMER"]}>
            <AppLayout>
              <MyBookingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager"
        element={
          <ProtectedRoute allowedRoles={["TRANSPORT_MANAGER"]}>
            <AppLayout>
              <ManagerDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/cities"
        element={
          <ProtectedRoute allowedRoles={["TRANSPORT_MANAGER", "ADMIN"]}>
            <AppLayout>
              <ManagerCitiesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/assignments"
        element={
          <ProtectedRoute allowedRoles={["TRANSPORT_MANAGER"]}>
            <AppLayout>
              <ManagerAssignmentsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/routes"
        element={
          <ProtectedRoute allowedRoles={["TRANSPORT_MANAGER"]}>
            <AppLayout>
              <ManagerRoutesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/vehicles"
        element={
          <ProtectedRoute allowedRoles={["TRANSPORT_MANAGER"]}>
            <AppLayout>
              <ManagerVehiclesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/schedules"
        element={
          <ProtectedRoute allowedRoles={["TRANSPORT_MANAGER"]}>
            <AppLayout>
              <ManagerSchedulesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/driver"
        element={
          <ProtectedRoute allowedRoles={["DRIVER"]}>
            <AppLayout>
              <DriverDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AppLayout>
              <AdminDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AppLayout>
              <AuditLogsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
