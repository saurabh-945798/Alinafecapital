const Branches = () => {
  const branches = [
    {
      name: "Lilongwe Branch",
      address: "Area 3, Paul Kagame Road, Lilongwe",
      phone: "+265 999 000 001",
      hours: "Mon-Fri: 08:00 - 17:00",
    },
    {
      name: "Blantyre Branch",
      address: "Henderson Street, Blantyre",
      phone: "+265 999 000 002",
      hours: "Mon-Fri: 08:00 - 17:00",
    },
    {
      name: "Mzuzu Branch",
      address: "M1 Road, Mzuzu City Centre",
      phone: "+265 999 000 003",
      hours: "Mon-Fri: 08:00 - 17:00",
    },
  ];

  return (
    <section className="bg-gradient-to-b from-indigo-50 to-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-wide text-indigo-700">
            Our Branch Network
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            Visit an Alinafe Capital branch
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
            Talk to our team in person for loan advice, application support, and
            repayment guidance.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <article
              key={branch.name}
              className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900">
                {branch.name}
              </h2>
              <p className="mt-3 text-sm text-slate-600">{branch.address}</p>
              <p className="mt-2 text-sm text-slate-700">{branch.phone}</p>
              <p className="mt-2 text-sm text-slate-500">{branch.hours}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Branches;
