const Privacy = () => {
  const points = [
    {
      title: "Information We Collect",
      text: "We collect details you provide during inquiry or application, including contact and financial information needed for loan assessment.",
    },
    {
      title: "How We Use Information",
      text: "Your data is used to assess eligibility, process loans, manage repayments, improve service quality, and meet legal requirements.",
    },
    {
      title: "Data Sharing",
      text: "We only share data with authorized partners, service providers, and regulators where required by law or service delivery.",
    },
    {
      title: "Data Security",
      text: "We apply administrative and technical safeguards to protect your personal information against unauthorized access.",
    },
    {
      title: "Your Rights",
      text: "You may request correction of incorrect data and ask questions about how your data is handled through our support channels.",
    },
  ];

  return (
    <section className="bg-gradient-to-b from-indigo-50 to-white py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold tracking-wide text-indigo-700">
            Legal
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-slate-600">
            This page explains how Alinafe Capital collects, uses, and protects
            your personal information.
          </p>

          <div className="mt-8 space-y-4">
            {points.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4"
              >
                <h2 className="text-base font-semibold text-slate-900">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm text-slate-700">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Privacy;
