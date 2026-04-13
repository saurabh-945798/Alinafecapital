const mainBranch = {
  company: "ALINAFE Capital Limited",
  addressLines: ["Plot No. Area 43/749", "P.O. Box 31245", "Lilongwe 3, Malawi"],
  phone: "+265 997 031 941",
  hours: "Mon-Fri: 08:00 - 17:00",
};

const branchLocations = ["Lilongwe Branch", "Blantyre Branch", "Mzuzu Branch"];

const officeMapEmbedUrl =
  "https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d940.5720083740964!2d33.81055289482015!3d-13.92699787058866!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTPCsDU1JzM3LjciUyAzM8KwNDgnNDAuMyJF!5e0!3m2!1sen!2sin!4v1775703827468!5m2!1sen!2sin";

const quickFacts = [
  { label: "Customer Support", value: mainBranch.phone },
  { label: "Business Hours", value: mainBranch.hours },
];

const Branches = () => {
  return (
    <section className="bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.45),_transparent_42%),linear-gradient(180deg,#f8fafc_0%,#ffffff_48%,#f8fafc_100%)] py-16 sm:py-20">
      <div className="mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2.25rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_90px_-40px_rgba(15,23,42,0.28)] backdrop-blur sm:p-8 lg:p-10 xl:p-12">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
              Branches
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Visit our Lilongwe office for direct support
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              Customers can visit our main office for loan guidance, application help, repayment
              support, and document assistance. The full section is centered so the address, contact
              details, and map feel balanced across the page.
            </p>
          </div>

          <div className="mt-10 rounded-[1.9rem] border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 sm:px-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Main Office
                </p>
                <h3 className="mt-4 text-2xl font-semibold text-slate-950">{mainBranch.company}</h3>
                <div className="mt-4 space-y-2 text-sm leading-7 text-slate-700 sm:text-base">
                  {mainBranch.addressLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>

              {quickFacts.map((card) => (
                <div
                  key={card.label}
                  className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 sm:px-6"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-4 text-base font-medium leading-7 text-slate-900">{card.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-[1.9rem] border border-dashed border-slate-300 bg-slate-50/80 p-6 sm:p-8">
            <div className="grid gap-4 md:grid-cols-3">
              {branchLocations.map((branch) => (
                <div
                  key={branch}
                  className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 text-center sm:text-left"
                >
                  <p className="text-base font-semibold text-slate-900">{branch}</p>
                  <p className="mt-2 text-sm text-slate-500">Coming soon.</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-[1.9rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
            <div className="mb-5 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-slate-500">
                Office Map
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Find our exact location
              </h3>
              <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                Use the map below for directions to our main office in Lilongwe.
              </p>
            </div>

            <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-50">
              <iframe
                title="Alinafe Capital Office Location"
                src={officeMapEmbedUrl}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                className="h-[320px] w-full border-0 sm:h-[420px] lg:h-[520px]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Branches;
