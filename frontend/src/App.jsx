import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Navbar from "./components/Navbar/Navbar.jsx";
import SitePreloader from "./components/Preloader/SitePreloader.jsx";
import TransitionOverlay from "./components/Preloader/TransitionOverlay.jsx";
import Hero from "./components/Hero/Hero.jsx";
import LoanProducts from "./components/LoanProducts/LoanProducts.jsx";
import LoanProductDetailsPage from "./components/LoanProducts/LoanProductDetailsPage.jsx";
import HowItWorks from "./components/HowItWorks/HowItWorks.jsx";
import TrustSection from "./components/TrustSection/TrustSection.jsx";
import { RepaymentCalculator as Calculator } from "./components/Calculator/Calculator.jsx";
import FAQ from "./components/FAQ/FAQ.jsx";
import Footer from "./components/Footer/Footer.jsx";
import About from "./components/Aboutus/About.jsx";
import Branches from "./components/Branches/Branches.jsx";
import InterestRates from "./components/InterestRates/InterestRates.jsx";
import Eligibility from "./components/Eligibility/Eligibility.jsx";
import Complaints from "./components/Complaints/Complaints.jsx";
import Terms from "./components/Terms/Terms.jsx";
import Privacy from "./components/Privacy/Privacy.jsx";
import CustomerLoginPage from "./auth/CustomerLoginPage.jsx";
import CustomerRegisterPage from "./auth/CustomerRegisterPage.jsx";
import LoanInquiryPage from "./publicPages/LoanInquiryPage.jsx";
import EligibilityCheckPage from "./publicPages/EligibilityCheckPage.jsx";
import FAQPage from "./publicPages/FAQPage.jsx";
import EligibilityDetailsPage from "./publicPages/EligibilityDetailsPage.jsx";
import Dashboard from "./dashboard/Dashboard.jsx";
import DashboardLayout from "./dashboard/DashboardLayout.jsx";
import DashboardProfilePage from "./dashboard/DashboardProfilePage.jsx";
import DashboardKycPage from "./dashboard/DashboardKycPage.jsx";
import DashboardEligibilityPage from "./dashboard/DashboardEligibilityPage.jsx";
import DashboardQuickActionsPage from "./dashboard/DashboardQuickActionsPage.jsx";
import DashboardUpdatesPage from "./dashboard/DashboardUpdatesPage.jsx";
import DashboardMyApplicationsPage from "./dashboard/DashboardMyApplicationsPage.jsx";
import DashboardApplyLoanPage from "./dashboard/DashboardApplyLoanPage.jsx";
import DashboardRepaymentsPage from "./dashboard/DashboardRepaymentsPage.jsx";
import DashboardSchedulePage from "./dashboard/DashboardSchedulePage.jsx";
import DashboardHelpCenterPage from "./dashboard/DashboardHelpCenterPage.jsx";
import DashboardContactOfficerPage from "./dashboard/DashboardContactOfficerPage.jsx";
import DashboardAccountInfoPage from "./dashboard/DashboardAccountInfoPage.jsx";
import MastercardRepaymentPage from "./payments/MastercardRepaymentPage.jsx";
import { useAuth } from "./context/AuthContext.jsx";

const Layout = ({ children, noNavbar = false }) => (
  <div className="bg-white min-h-screen">
    {!noNavbar ? <Navbar /> : null}
    {children}
    <Footer />
  </div>
);


const ApplyAccessGate = () => {
  const { isAuthenticated, isChecking } = useAuth();
  const location = useLocation();

  if (isChecking) return <div className="p-6 text-sm text-slate-500">Preparing application access...</div>;

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search || ""}`;
    return <Navigate to={`/register?next=${encodeURIComponent(next)}&intent=apply`} replace />;
  }

  return <LoanInquiryPage />;
};

const HomePage = () => (
  <>
    <Hero />
    <LoanProducts />
    <HowItWorks />
    <TrustSection />
    <Calculator />
    <FAQ />
  </>
);

function App() {
  const location = useLocation();
  const [showPreloader, setShowPreloader] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    const minDurationTimer = window.setTimeout(() => {
      setShowPreloader(false);
    }, 1400);

    return () => {
      window.clearTimeout(minDurationTimer);
    };
  }, []);

  useEffect(() => {
    if (showPreloader) return undefined;
    setRouteLoading(true);
    const timer = window.setTimeout(() => setRouteLoading(false), 420);
    return () => window.clearTimeout(timer);
  }, [location.pathname, showPreloader]);

  return (
    <>
      <SitePreloader visible={showPreloader} />
      <TransitionOverlay visible={!showPreloader && routeLoading} title="Opening your page" message="Preparing the next screen for you." />
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <HomePage />
            </Layout>
          }
        />
        <Route path="/home" element={<Navigate to="/" replace />} />

        <Route
          path="/login"
          element={
            <Layout noNavbar>
              <CustomerLoginPage />
            </Layout>
          }
        />
        <Route path="/customer/login" element={<Navigate to="/login" replace />} />
        <Route
          path="/register"
          element={
            <Layout noNavbar>
              <CustomerRegisterPage />
            </Layout>
          }
        />
        <Route path="/customer/register" element={<Navigate to="/register" replace />} />

        <Route element={<ProtectedRoute />}> 
          <Route path="/payments/mastercard/repayments/:paymentId" element={<MastercardRepaymentPage />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="quick-actions" element={<DashboardQuickActionsPage />} />
            <Route path="updates" element={<DashboardUpdatesPage />} />
            <Route path="my-applications" element={<DashboardMyApplicationsPage />} />
            <Route path="apply-loan" element={<DashboardApplyLoanPage />} />
            <Route path="profile-completion" element={<DashboardProfilePage />} />
            <Route path="kyc-status" element={<DashboardKycPage />} />
            <Route path="repayments" element={<DashboardRepaymentsPage />} />
            <Route path="schedule" element={<DashboardSchedulePage />} />
            <Route path="help-center" element={<DashboardHelpCenterPage />} />
            <Route path="contact-officer" element={<DashboardContactOfficerPage />} />
            <Route path="account-info" element={<DashboardAccountInfoPage />} />
            <Route path="profile" element={<Navigate to="/dashboard/profile-completion" replace />} />
            <Route path="kyc" element={<Navigate to="/dashboard/kyc-status" replace />} />
            <Route path="eligibility" element={<DashboardEligibilityPage />} />
          </Route>
        </Route>

        <Route
          path="/loan-products"
          element={
            <Layout>
              <LoanProducts />
            </Layout>
          }
        />
        <Route
          path="/about"
          element={
            <Layout>
              <About />
            </Layout>
          }
        />
        <Route
          path="/how-it-works"
          element={
            <Layout>
              <HowItWorks />
            </Layout>
          }
        />
        <Route
          path="/branches"
          element={
            <Layout>
              <Branches />
            </Layout>
          }
        />
        <Route
          path="/interest-rates"
          element={
            <Layout>
              <InterestRates />
            </Layout>
          }
        />
        <Route
          path="/eligibility"
          element={
            <Layout>
              <Eligibility />
            </Layout>
          }
        />
        <Route
          path="/loan-products/:slug"
          element={
            <Layout>
              <LoanProductDetailsPage />
            </Layout>
          }
        />
        <Route
          path="/apply"
          element={
            <Layout noNavbar>
              <ApplyAccessGate />
            </Layout>
          }
        />
        <Route
          path="/profile-kyc/:token"
          element={
            <Layout noNavbar>
              <DashboardProfilePage />
            </Layout>
          }
        />
        <Route path="/loan-inquiry" element={<Navigate to="/apply" replace />} />
        <Route
          path="/eligibility-check"
          element={
            <Layout>
              <EligibilityCheckPage />
            </Layout>
          }
        />
        <Route
          path="/faq"
          element={
            <Layout>
              <FAQPage />
            </Layout>
          }
        />
        <Route path="/faqs" element={<Navigate to="/faq" replace />} />
        <Route
          path="/complaints"
          element={
            <Layout>
              <Complaints />
            </Layout>
          }
        />
        <Route
          path="/terms"
          element={
            <Layout>
              <Terms />
            </Layout>
          }
        />
        <Route
          path="/privacy"
          element={
            <Layout>
              <Privacy />
            </Layout>
          }
        />
        <Route
          path="/eligibility-details"
          element={
            <Layout>
              <EligibilityDetailsPage />
            </Layout>
          }
        />
        <Route
          path="/calculator"
          element={
            <Layout>
              <Calculator />
            </Layout>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
