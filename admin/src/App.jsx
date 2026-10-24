import { Navigate, Route, Routes } from "react-router-dom";
import AdminAccessPage from "./components/Auth/AdminAccess.jsx";
import AdminProtectedRoute from "./components/Auth/AdminProtectedRoute.jsx";
import AnalyticsPage from "./components/Analytics/Analytics.jsx";
import CompliancePage from "./components/Compliance/Compliance.jsx";
import ComplaintsPage from "./components/Complaints/Complaints.jsx";
import AccountsPage from "./components/Accounts/Accounts.jsx";
import AccountDetailPage from "./components/Accounts/AccountDetail.jsx";
import Dashboard from "./components/Dashboard/Dashboard.jsx";
import CustomersPage from "./components/Customers/Customers.jsx";
import InquiriesPage from "./components/Inquiries/Inquiries.jsx";
import LoanApplicationsPage from "./components/LoanApplication/LoanApplication.jsx";
import LoanApplicationDetailPage from "./components/LoanApplication/LoanApplicationDetail.jsx";
import LoanProductsPage from "./components/LoanProducts/LoanProducts.jsx";
import ReportsPage from "./components/Reports/Reports.jsx";
import SettingsPage from "./components/Settings/Settings.jsx";
import UserAccessPage from "./components/UserAccess/UserAccess.jsx";
import AdminLayout from "./layout/AdminLayout.jsx"; 
import RiskAssessmentPage from "./components/RiskAssessment/RiskAssessment.jsx";
import PaymentVerificationPage from "./components/PaymentVerification/PaymentVerification.jsx";
import FinancialJournalPage from "./components/Finance/FinancialJournal.jsx";
import AuditTrailPage from "./components/Audit/AuditTrail.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<AdminAccessPage />} />
      <Route path="/admin/access" element={<Navigate to="/admin/login" replace />} />

      <Route element={<AdminProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="applications" element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN", "VERIFIER", "RISK_ANALYST", "APPROVAL", "AUTHORIZED", "DISBURSED", "AUDITOR"]}><LoanApplicationsPage /></AdminProtectedRoute>} />
          <Route path="applications/:id" element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN", "VERIFIER", "RISK_ANALYST", "APPROVAL", "AUTHORIZED", "DISBURSED", "AUDITOR"]}><LoanApplicationDetailPage /></AdminProtectedRoute>} />
          <Route path="disbursement" element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN", "DISBURSED"]}><LoanApplicationsPage initialStatus="AUTHORIZED" /></AdminProtectedRoute>} />
          <Route path="risk-assessment" element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN", "RISK_ANALYST", "APPROVAL", "AUTHORIZED", "AUDITOR"]}><RiskAssessmentPage /></AdminProtectedRoute>} />
          <Route path="payment-verification" element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN", "PAYMENT_VERIFIER", "AUDITOR"]}><PaymentVerificationPage /></AdminProtectedRoute>} />
          <Route path="financial-journal" element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN", "PAYMENT_VERIFIER", "AUDITOR"]}><FinancialJournalPage /></AdminProtectedRoute>} />
          <Route path="audit-trail" element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN", "AUDITOR"]}><AuditTrailPage /></AdminProtectedRoute>} />
          <Route path="payments" element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN", "DISBURSED", "PAYMENT_VERIFIER", "AUDITOR"]}><AccountsPage /></AdminProtectedRoute>} />
          <Route path="payments/:id" element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN", "DISBURSED", "PAYMENT_VERIFIER", "AUDITOR"]}><AccountDetailPage /></AdminProtectedRoute>} />
          <Route path="reports" element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN"]}><ReportsPage /></AdminProtectedRoute>} />
          <Route path="analytics" element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN"]}><AnalyticsPage /></AdminProtectedRoute>} />
          <Route path="inquiries" element={<InquiriesPage />} />
          <Route path="loan-products" element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN"]}><LoanProductsPage /></AdminProtectedRoute>} />
          <Route path="complaints" element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN", "VERIFIER"]}><ComplaintsPage /></AdminProtectedRoute>} />
          <Route path="customers" element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN", "VERIFIER", "RISK_ANALYST", "APPROVAL", "AUTHORIZED", "DISBURSED", "AUDITOR"]}><CustomersPage /></AdminProtectedRoute>} />
          <Route path="compliance" element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN", "VERIFIER"]}><CompliancePage /></AdminProtectedRoute>} />
          <Route path="user-access" element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN"]}><UserAccessPage /></AdminProtectedRoute>} />
          <Route path="settings" element={<AdminProtectedRoute allowedRoles={["SUPER_ADMIN"]}><SettingsPage /></AdminProtectedRoute>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}


