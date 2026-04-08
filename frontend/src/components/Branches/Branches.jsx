const mainBranch = {
  name: "Main Office",
  company: "ALINAFE Online Limited",
  addressLines: [
    "Plot No. Area 43/749",
    "P.O. Box 31245",
    "Lilongwe 3, Malawi",
  ],
  phone: "+265 997 031 941",
  hours: "Mon-Fri: 08:00 - 17:00",
};

const upcomingBranches = ["Blantyre Branch", "Mzuzu Branch"];

const Branches = () => {
  return (
    <section className="bg-gradient-to-b from-indigo-50 to-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-wide text-indigo-700">
            Our Branch Network
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            Visit our main office
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
            Connect with our team for loan guidance, application support, and repayment assistance.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-700">
              Office Address
            </p>
            <h2 className="mt-4 text-2xl font-bold text-slate-900">
              {mainBranch.name}
            </h2>
            <p className="mt-2 text-base font-medium text-slate-800">
              {mainBranch.company}
            </p>

            <div className="mt-6 space-y-2 text-sm leading-7 text-slate-600 sm:text-base">
              {mainBranch.addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-indigo-50/70 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-700">
                  Contact
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800 sm:text-base">
                  {mainBranch.phone}
                </p>
              </div>
              <div className="rounded-2xl bg-indigo-50/70 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-700">
                  Business Hours
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800 sm:text-base">
                  {mainBranch.hours}
                </p>
              </div>
            </div>
          </article>

          <div className="space-y-4">
            {upcomingBranches.map((branch) => (
              <article
                key={branch}
                className="rounded-3xl border border-dashed border-indigo-200 bg-white/80 p-6 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-slate-900">{branch}</h2>
                <p className="mt-3 text-sm font-medium text-indigo-700">
                  Other branches coming soon.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  We will share more branch locations as they become available.
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Branches;
