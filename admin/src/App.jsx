import { Navigate, Route, Routes } from "react-router-dom";
import AdminAccessPage from "./components/Auth/AdminAccess.jsx";
import AdminProtectedRoute from "./components/Auth/AdminProtectedRoute.jsx";
import CompliancePage from "./components/Compliance/Compliance.jsx";
import CustomersPage from "./components/Customers/Customers.jsx";
import Dashboard from "./components/Dashboard/Dashboard.jsx";
import LoanApplicationsPage from "./components/LoanApplication/LoanApplication.jsx";
import LoanProductsPage from "./components/LoanProducts/LoanProducts.jsx";
import SettingsPage from "./components/Settings/Settings.jsx";
import AdminLayout from "./layout/AdminLayout.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<AdminAccessPage />} />
      <Route path="/admin/access" element={<Navigate to="/admin/login" replace />} />

      <Route element={<AdminProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="applications" element={<LoanApplicationsPage />} />
          <Route path="loan-products" element={<LoanProductsPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}
