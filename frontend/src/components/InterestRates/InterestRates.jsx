const InterestRates = () => {
  const rates = [
    {
      product: "Personal Loan",
      monthlyRate: "5.5% - 6.5%",
      tenure: "3 - 12 months",
      note: "Rate depends on risk profile and loan term.",
    },
    {
      product: "Business Loan",
      monthlyRate: "4.5% - 6.0%",
      tenure: "6 - 18 months",
      note: "Strong business cashflow can get better pricing.",
    },
    {
      product: "Agriculture Seasonal Loan",
      monthlyRate: "5.5% - 6.0%",
      tenure: "4 - 9 months",
      note: "Repayment may align with harvest cycle.",
    },
    {
      product: "Group Loan",
      monthlyRate: "Around 6.0% flat",
      tenure: "4 - 6 months",
      note: "Weekly or bi-weekly repayment structure.",
    },
  ];

  return (
    <section className="bg-gradient-to-b from-indigo-50 to-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-wide text-indigo-700">
            Pricing Guide
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            Interest rates and loan terms
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
            These are typical ranges. Final pricing is shown before loan
            acceptance.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
          <div className="grid grid-cols-1 border-b border-indigo-100 bg-indigo-50/70 p-4 text-sm font-semibold text-slate-800 md:grid-cols-4">
            <p>Loan Product</p>
            <p>Monthly Rate</p>
            <p>Repayment Period</p>
            <p>Notes</p>
          </div>
          {rates.map((item) => (
            <div
              key={item.product}
              className="grid grid-cols-1 gap-2 border-b border-slate-100 p-4 text-sm text-slate-700 last:border-b-0 md:grid-cols-4"
            >
              <p className="font-medium text-slate-900">{item.product}</p>
              <p>{item.monthlyRate}</p>
              <p>{item.tenure}</p>
              <p>{item.note}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Disclosure: This page is for guidance only. Fees and effective cost may
          differ by product and customer profile.
        </p>
      </div>
    </section>
  );
};

export default InterestRates;
