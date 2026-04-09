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
const officeMapEmbedUrl =
  "https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d940.5720083740964!2d33.81055289482015!3d-13.92699787058866!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTPCsDU1JzM3LjciUyAzM8KwNDgnNDAuMyJF!5e0!3m2!1sen!2sin!4v1775703827468!5m2!1sen!2sin";

const Branches = () => {
  return (
    <section className="bg-gradient-to-b from-indigo-50 to-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold tracking-wide text-indigo-700">
            Our Branch Network
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            Visit our main office
          </h1>
          <p className="mx-auto mt-4 text-base text-slate-600">
            Connect with our team for loan guidance, application support, and repayment assistance.
          </p>  
        </div>

        <article className="mt-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            <div className="p-6 sm:p-8 lg:p-10">
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-700">
                    Contact
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-800 sm:text-base">
                    {mainBranch.phone}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-700">
                    Business Hours
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-800 sm:text-base">
                    {mainBranch.hours}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5 lg:border-l lg:border-t-0">
              <div className="mb-4">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-700">
                  Office Map
                </p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">
                  Find our main office location
                </h2>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <iframe
                  title="Alinafe Capital Office Location"
                  src={officeMapEmbedUrl}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-[320px] w-full border-0 sm:h-[380px] lg:h-[100%] lg:min-h-[460px]"
                />
              </div>
            </div>
          </div>
        </article>

        <div className="mt-6 rounded-[2rem] border border-dashed border-indigo-200 bg-white/90 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-700">
            Upcoming Branches
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {upcomingBranches.map((branch) => (
              <div
                key={branch}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <p className="text-base font-semibold text-slate-900">{branch}</p>
                <p className="mt-1 text-sm text-slate-500">Coming soon.</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Branches;
