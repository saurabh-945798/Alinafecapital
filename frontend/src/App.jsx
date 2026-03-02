import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Navbar from "./components/Navbar/Navbar.jsx";
import Hero from "./components/Hero/Hero.jsx";
import LoanProducts from "./components/LoanProducts/LoanProducts.jsx";
import LoanProductDetailsPage from "./components/LoanProducts/LoanProductDetailsPage.jsx";
import HowItWorks from "./components/HowItWorks/HowItWorks.jsx";
import TrustSection from "./components/TrustSection/TrustSection.jsx";
import { RepaymentCalculator as Calculator } from "./components/Calculator/Calculator.jsx";
import FAQ from "./components/FAQ/FAQ.jsx";
import FinalCTA from "./components/FinalCTA/FinalCTA.jsx";
import Footer from "./components/Footer/Footer.jsx";
import About from "./components/Aboutus/About.jsx";
import Branches from "./components/Branches/Branches.jsx";
import InterestRates from "./components/InterestRates/InterestRates.jsx";
import Eligibility from "./components/Eligibility/Eligibility.jsx";
import Complaints from "./components/Complaints/Complaints.jsx";
import Terms from "./components/Terms/Terms.jsx";
import Privacy from "./components/Privacy/Privacy.jsx";
import { ApplyLoanPage } from "./publicPages/ApplyLoanPage.jsx";
import EligibilityCheckPage from "./publicPages/EligibilityCheckPage.jsx";
import FAQPage from "./publicPages/FAQPage.jsx";
import EligibilityDetailsPage from "./publicPages/EligibilityDetailsPage.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
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

const Layout = ({ children, noNavbar = false }) => (
  <div className="bg-white min-h-screen">
    {!noNavbar ? <Navbar /> : null}
    {children}
    <Footer />
  </div>
);

const HomePage = () => (
  <>
    <Hero />
    <LoanProducts />
    <HowItWorks />
    <TrustSection />
    <Calculator />
    <FAQ />
    <FinalCTA />
  </>
);

function App() {
  return (
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

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<ProtectedRoute />}>
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
            <ApplyLoanPage />
          </Layout>
        }
      />
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
      <Route
        path="/faqs"
        element={<Navigate to="/faq" replace />}
      />
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
  );
}

export default App;
