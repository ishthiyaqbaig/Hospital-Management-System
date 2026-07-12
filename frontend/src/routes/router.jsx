import { createBrowserRouter } from "react-router-dom";

import AppShell from "../components/AppShell";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminDashboard from "../pages/AdminDashboard";
import Booking from "../pages/Booking";
import Dashboard from "../pages/Dashboard";
import DoctorDashboard from "../pages/DoctorDashboard";
import Health from "../pages/Health";
import Login from "../pages/Login";
import QueueDashboard from "../pages/QueueDashboard";
import Register from "../pages/Register";
import RoleHome from "../pages/RoleHome";
import Unauthorized from "../pages/Unauthorized";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "health",
        element: <Health />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "unauthorized",
        element: <Unauthorized />,
      },
      {
        element: <ProtectedRoute allowedRoles={["admin"]} />,
        children: [{ path: "admin", element: <AdminDashboard /> }],
      },
      {
        element: <ProtectedRoute allowedRoles={["doctor"]} />,
        children: [{ path: "doctor", element: <DoctorDashboard /> }],
      },
      {
        element: <ProtectedRoute allowedRoles={["receptionist"]} />,
        children: [
          { path: "receptionist", element: <RoleHome role="receptionist" /> },
          { path: "receptionist/queue", element: <QueueDashboard /> },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={["patient"]} />,
        children: [{ path: "patient", element: <RoleHome role="patient" /> }],
      },
      {
        element: <ProtectedRoute allowedRoles={["patient", "receptionist"]} />,
        children: [{ path: "booking", element: <Booking /> }],
      },
    ],
  },
]);

export default router;
