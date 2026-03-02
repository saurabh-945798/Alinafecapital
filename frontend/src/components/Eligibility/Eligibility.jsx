const Eligibility = () => {
  const criteria = [
    "Age: 21 to 60 years",
    "Valid national ID or passport",
    "Stable income source (salary or business cashflow)",
    "Active mobile number for communication",
    "Good repayment history (where available)",
  ];

  const documents = [
    "National ID copy",
    "Latest 3 months bank statement or payslip",
    "Proof of address",
    "For business loans: business registration or trading evidence",
  ];

  return (
    <section className="bg-gradient-to-b from-indigo-50 to-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-wide text-indigo-700">
            Loan Eligibility
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            Check if you qualify
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
            Simple requirements to help you prepare before application.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Basic Criteria
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {criteria.map((item) => (
                <li key={item} className="rounded-lg bg-indigo-50/60 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Common Documents
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {documents.map((item) => (
                <li key={item} className="rounded-lg bg-indigo-50/60 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
};

export default Eligibility;
