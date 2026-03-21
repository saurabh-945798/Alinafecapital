const Terms = () => {
  const sections = [
    {
      title: "1. Loan Agreement",
      text: "By accepting a loan offer, you agree to the approved amount, pricing, fees, and repayment dates shown in your loan summary.",
    },
    {
      title: "2. Repayment Responsibility",
      text: "You must repay on time using the agreed schedule. Late payments may lead to extra charges and impact future eligibility.",
    },
    {
      title: "3. Fees and Charges",
      text: "All fees are shown before acceptance. Processing fees, late fees, and other charges are disclosed in your offer details.",
    },
    {
      title: "4. Early Repayment",
      text: "You may repay early where allowed by product terms. Any applicable early settlement conditions will be shown clearly.",
    },
    {
      title: "5. Support and Complaints",
      text: "If you need help, contact customer support. You can also file a complaint through our official complaints channels.",
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
            Terms & Conditions
          </h1>
          <p className="mt-4 text-sm text-slate-600">
            Please read these terms before applying or accepting any loan
            offer.
          </p>

          <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm leading-6 text-slate-700">
            <p className="font-semibold text-slate-900">Legal Entity</p>
            <p className="mt-2">
              ALINAFE CAPITAL is a limited company registered by the Registrar of Companies in Malawi.
              Company No.: COY-7WULNGE.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {sections.map((section) => (
              <article
                key={section.title}
                className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4"
              >
                <h2 className="text-base font-semibold text-slate-900">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm text-slate-700">{section.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Terms;
