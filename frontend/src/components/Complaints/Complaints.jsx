const Complaints = () => {
  const channels = [
    {
      title: "Phone Support",
      detail: "+265 997 031 941",
    },
    {
      title: "Email",
      detail: "support@alinafecapital.com",
    },
    {
      title: "In Person",
      detail: "Visit your nearest Alinafe Capital branch",
    },
  ];

  const steps = [
    "Share your issue with your name, phone number, and loan reference.",
    "Our team reviews and acknowledges your complaint.",
    "You receive a response with actions and next steps.",
    "If unresolved, request escalation to compliance support.",
  ];

  return (
    <section className="bg-gradient-to-b from-indigo-50 to-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-wide text-indigo-700">
            Complaints & Support
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            We are ready to help
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
            If something is not right, report it quickly. We treat all complaints
            fairly and confidentially.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              How to Contact Us
            </h2>
            <div className="mt-4 space-y-3">
              {channels.map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg bg-indigo-50/60 px-4 py-3"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Complaint Process
            </h2>
            <ol className="mt-4 space-y-2 text-sm text-slate-700">
              {steps.map((step, index) => (
                <li key={step} className="rounded-lg bg-indigo-50/60 px-4 py-3">
                  <span className="font-semibold text-indigo-700">
                    Step {index + 1}:{" "}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </article>
        </div>
      </div>
    </section>
  );
};

export default Complaints;
