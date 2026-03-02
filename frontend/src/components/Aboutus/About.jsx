const About = () => {
  return (
    <section className="bg-gradient-to-b from-indigo-50 to-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold tracking-wide text-indigo-700">
            About Alinafe Capital
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            Simple and trusted loans for Malawi
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600">
            We help individuals, workers, and small businesses access fair and
            clear loan products. Our focus is fast service, easy understanding,
            and responsible lending.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <h2 className="text-base font-semibold text-slate-900">
                Our Mission
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Empowering growth and improving daily lives through accessible
                microfinance.
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <h2 className="text-base font-semibold text-slate-900">
                What We Offer
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Personal, business, and seasonal lending options with transparent
                terms.
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:col-span-2 lg:col-span-1">
              <h2 className="text-base font-semibold text-slate-900">
                Why Clients Trust Us
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Clear pricing, human support, and repayment plans designed for
                real local needs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
