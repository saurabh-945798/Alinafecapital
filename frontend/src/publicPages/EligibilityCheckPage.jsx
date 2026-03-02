import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";

const EligibilityCheckPage = () => {
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [existingLoanEMI, setExistingLoanEMI] = useState(0);
  const [desiredLoanAmount, setDesiredLoanAmount] = useState(0);

  const result = useMemo(() => {
    const emi = desiredLoanAmount > 0 ? (desiredLoanAmount * 0.06) + (desiredLoanAmount / 6) : 0;
    const disposable = Math.max(0, monthlyIncome - existingLoanEMI);
    const eligible = emi > 0 ? disposable >= emi : false;

    return { emi, eligible, disposable };
  }, [monthlyIncome, existingLoanEMI, desiredLoanAmount]);

  return (
    <section className="py-24 bg-gradient-to-br from-white to-gray-50 min-h-[70vh]">
      <div className="max-w-4xl mx-auto px-6">
        <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: BRAND_NAVY }}>
          <ArrowLeft size={16} /> Back to Home
        </a>

        <div className="mt-6 rounded-3xl border bg-white p-8 md:p-10 shadow-sm" style={{ borderColor: "rgba(0,45,91,0.12)" }}>
          <h1 className="text-3xl font-bold" style={{ color: BRAND_NAVY }}>Eligibility Check</h1>
          <p className="mt-2 text-sm text-gray-600">Quick affordability check based on income, deductions, and desired amount.</p>

          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <label className="text-sm font-medium text-gray-700">
              Monthly Income (MWK)
              <input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Number(e.target.value) || 0)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#002D5B] focus:ring-2 focus:ring-[#002D5B]/20"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Existing Loan EMI (MWK)
              <input
                type="number"
                value={existingLoanEMI}
                onChange={(e) => setExistingLoanEMI(Number(e.target.value) || 0)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#002D5B] focus:ring-2 focus:ring-[#002D5B]/20"
              />
            </label>

            <label className="text-sm font-medium text-gray-700 sm:col-span-2">
              Desired Loan Amount (MWK)
              <input
                type="number"
                value={desiredLoanAmount}
                onChange={(e) => setDesiredLoanAmount(Number(e.target.value) || 0)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#002D5B] focus:ring-2 focus:ring-[#002D5B]/20"
              />
            </label>
          </div>

          <div className="mt-8 grid sm:grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl border bg-gray-50 p-4" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
              <p className="text-gray-500">Estimated EMI</p>
              <p className="mt-1 font-semibold">MWK {Math.round(result.emi).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border bg-gray-50 p-4" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
              <p className="text-gray-500">Disposable Income</p>
              <p className="mt-1 font-semibold">MWK {Math.round(result.disposable).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border bg-gray-50 p-4" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
              <p className="text-gray-500">Eligibility Result</p>
              <p className="mt-1 font-semibold inline-flex items-center gap-2" style={{ color: result.eligible ? "#166534" : "#b91c1c" }}>
                {result.eligible ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {result.eligible ? "Eligible" : "Not Eligible"}
              </p>
            </div>
          </div>

          <p className="mt-6 text-xs text-gray-500">
            Formula used: EMI = (LoanAmount * 0.06) + (LoanAmount / 6)
          </p>

          <a
            href="/apply"
            className="mt-6 inline-flex rounded-xl px-6 py-3 text-white font-semibold"
            style={{ backgroundColor: BRAND_NAVY }}
          >
            Continue to Application
          </a>
        </div>
      </div>
    </section>
  );
};

export default EligibilityCheckPage;
