import { Percent, Clock, ShieldCheck, Briefcase } from "lucide-react";

const pricingRows = [
  {
    no: 1,
    loanName: "Civil Servant loans",
    interestRate: "5.0%",
    processingFee: "2.5%",
    adminFee: "2.5%",
    maxRepayment: "12",
  },
  {
    no: 2,
    loanName: "Private company loans",
    interestRate: "5.0%",
    processingFee: "2.5%",
    adminFee: "2.5%",
    maxRepayment: "12",
  },
  {
    no: 3,
    loanName: "Statutory company loans",
    interestRate: "5.0%",
    processingFee: "2.5%",
    adminFee: "2.5%",
    maxRepayment: "12",
  },
  {
    no: 4,
    loanName: "Business loans",
    interestRate: "7.5%",
    processingFee: "2.5%",
    adminFee: "2.5%",
    maxRepayment: "12",
  },
];

export default function InterestRates() {
  return (
    <section className="bg-gradient-to-b from-slate-50 to-white py-10 sm:py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[10px] sm:text-xs font-semibold text-blue-700">
            Loan Pricing Overview
          </span>

          <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 leading-tight">
            Interest Rates & Charges
          </h2>

          <p className="mt-3 text-xs sm:text-sm lg:text-base text-slate-600 leading-relaxed">
            Transparent loan pricing with fixed interest rates, minimal fees, and flexible repayment options.
          </p>
        </div>

        {/* STATS */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Percent className="h-5 w-5" />} title="Base Interest" value="5% / month" />
          <Stat icon={<Briefcase className="h-5 w-5" />} title="Business Rate" value="7.5%" />
          <Stat icon={<ShieldCheck className="h-5 w-5" />} title="Processing Fee" value="2.5%" />
          <Stat icon={<Clock className="h-5 w-5" />} title="Max Tenure" value="12 months" />
        </div>

        {/* TABLE */}
        <div className="mt-10 hidden md:block">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[980px] w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-4 lg:px-5">#</th>
                  <th className="px-4 py-4 lg:px-5">Loan Type</th>
                  <th className="px-4 py-4 lg:px-5">Interest / month</th>
                  <th className="px-4 py-4 lg:px-5">
                    Processing
                    <span className="block text-xs font-normal text-slate-500">(one time)</span>
                  </th>
                  <th className="px-4 py-4 lg:px-5">
                    Admin Fee
                    <span className="block text-xs font-normal text-slate-500">(one time)</span>
                  </th>
                  <th className="px-4 py-4 lg:px-5">Tenure</th>
                </tr>
              </thead>

              <tbody>
                {pricingRows.map((row) => (
                  <tr key={row.no} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-4 lg:px-5">{row.no}</td>
                    <td className="px-4 py-4 font-semibold lg:px-5">{row.loanName}</td>
                    <td className="px-4 py-4 lg:px-5">
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                        {row.interestRate}
                      </span>
                    </td>
                    <td className="px-4 py-4 lg:px-5">{row.processingFee}</td>
                    <td className="px-4 py-4 lg:px-5">{row.adminFee}</td>
                    <td className="px-4 py-4 lg:px-5">{row.maxRepayment} months</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MOBILE CARDS */}
        <div className="mt-10 space-y-4 md:hidden">
          {pricingRows.map((row) => (
            <div
              key={row.no}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  {row.loanName}
                </h3>
                <span className="text-xs text-slate-500">#{row.no}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <Info label="Interest" value={row.interestRate} highlight />
                <Info label="Processing" value={row.processingFee} />
                <Info label="Admin Fee" value={row.adminFee} />
                <Info label="Tenure" value={`${row.maxRepayment} months`} />
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:text-sm text-slate-600">
          Final approval and disbursement depend on internal review and KYC verification.
        </div>
      </div>
    </section>
  );
}

/* COMPONENTS */

function Stat({ icon, title, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mt-0.5 text-blue-600">{icon}</div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
        <p className="text-sm sm:text-base font-semibold text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function Info({ label, value, highlight }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p
        className={`font-semibold ${
          highlight ? "text-blue-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
