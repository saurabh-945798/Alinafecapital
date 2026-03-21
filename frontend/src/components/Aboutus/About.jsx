const coreValues = [
  "Professionalism, Integrity and ethical conduct",
  "Transparency and accountability",
  "Prudent risk management",
  "Client protection and confidentiality",
];

const offerings = [
  "Personal loans for salaried and individual clients",
  "Business finance for working capital and growth",
  "Agriculture and seasonal lending solutions",
  "Simple repayment guidance before application",
];

const trustPoints = [
  "Transparent pricing and clear product communication",
  "Responsible lending with strong internal review",
  "Confidential handling of client data and documents",
  "Operational discipline focused on long-term trust",
];

const visionPoints = [
  "A trusted institution advancing inclusive growth through fair and transparent lending",
  "Simple access to finance for households, workers, and businesses",
  "Strong governance and accountability across all operations",
];

const boardMembers = [
  {
    name: "Board Chairperson",
    role: "Leads board governance, strategic oversight, and institutional direction.",
  },
  {
    name: "Independent Director",
    role: "Strengthens governance discipline, compliance thinking, and accountability.",
  },
  {
    name: "Non-Executive Director",
    role: "Supports growth planning, policy oversight, and board-level guidance.",
  },
];

const managementTeam = [
  {
    name: "Chief Executive Officer",
    role: "Leads overall business strategy, execution, and institutional growth.",
  },
  {
    name: "Operations Manager",
    role: "Oversees daily service delivery, workflow control, and process quality.",
  },
  {
    name: "Credit & Risk Lead",
    role: "Drives prudent underwriting, portfolio quality, and risk management discipline.",
  },
];

const SectionEyebrow = ({ children }) => (
  <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600 sm:text-xs">
    {children}
  </span>
);

const InfoCard = ({ title, text }) => (
  <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <h3 className="text-base font-bold text-slate-900">{title}</h3>
    <p className="mt-3 text-sm leading-relaxed text-slate-600">{text}</p>
  </div>
);

const InsightCard = ({ title, items, index, tone }) => {
  const toneMap = {
    slate: {
      shell: "border-slate-200 bg-white",
      chip: "border-slate-200 bg-slate-50 text-slate-700",
      line: "bg-slate-900",
      accent: "text-slate-400",
    },
    indigo: {
      shell: "border-indigo-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#eef2ff_100%)]",
      chip: "border-indigo-200 bg-indigo-50 text-indigo-700",
      line: "bg-indigo-700",
      accent: "text-indigo-200",
    },
    amber: {
      shell: "border-amber-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#fff7ed_100%)]",
      chip: "border-amber-200 bg-amber-50 text-amber-700",
      line: "bg-amber-700",
      accent: "text-amber-200",
    },
    emerald: {
      shell: "border-emerald-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#ecfdf5_100%)]",
      chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
      line: "bg-emerald-700",
      accent: "text-emerald-200",
    },
  };

  const styles = toneMap[tone] || toneMap.slate;

  return (
    <div className={`flex h-full flex-col rounded-[30px] border p-6 shadow-sm sm:p-8 ${styles.shell}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] sm:text-xs ${styles.chip}`}>
            {title}
          </span>
          <h2 className="mt-4 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{title}</h2>
        </div>
        <span className={`text-4xl font-semibold leading-none ${styles.accent}`}>{index}</span>
      </div>

      <div className="mt-6 grid flex-1 gap-4">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-4 border-b border-slate-200/70 pb-4 last:border-b-0 last:pb-0">
            <span className={`mt-2 inline-block h-8 w-1.5 rounded-full ${styles.line}`} />
            <p className="text-sm leading-7 text-slate-700">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const TeamCard = ({ name, role }) => (
  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
    <div className="flex items-start gap-4">
      <div className="shrink-0">
        <div className="relative h-20 w-20 overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)]">
          <div className="absolute inset-x-4 bottom-0 h-10 rounded-t-full bg-slate-300" />
          <div className="absolute left-1/2 top-4 h-10 w-10 -translate-x-1/2 rounded-full bg-slate-400" />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold text-slate-900">{name}</p>
        <p className="mt-3 text-sm leading-7 text-slate-600">{role}</p>
      </div>
    </div>
  </div>
);

const About = () => {
  return (
    <section className="bg-[linear-gradient(180deg,_#f8fafc_0%,_#ffffff_26%,_#f8fafc_100%)] py-14 sm:py-16 lg:py-24">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-14">
        <div className="rounded-[36px] border border-slate-200 bg-white/92 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8 lg:p-12 xl:p-14">
          <div>
            <SectionEyebrow>About Alinafe Capital</SectionEyebrow>
            <h1 className="mt-5 max-w-5xl text-2xl font-bold leading-tight text-slate-900 sm:text-3xl lg:text-4xl">
              A cleaner, more responsible way to access finance in Malawi
            </h1>
            <p className="mt-5 max-w-5xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Alinafe Capital is built around simple financial access, disciplined lending,
              and long-term client trust. We focus on practical products, transparent
              communication, and careful risk management so that customers understand both
              the opportunity and the responsibility that come with every loan.
            </p>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Company Identity
              </p>
              <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
                <div>
                  <p className="font-semibold text-slate-900">Company Name</p>
                  <p className="mt-1">ALINAFE CAPITAL</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Legal Form</p>
                  <p className="mt-1">Limited Company registered by the Registrar of Companies in Malawi</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Reg. Number</p>
                  <p className="mt-1">COY-7WULNGE</p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <InfoCard
                title="Our Mission"
                text="To expand access to practical finance through responsible lending, simple service, and client-first delivery."
              />
              <InfoCard
                title="Our Approach"
                text="We combine practical products, strong governance, and clear communication to make finance easier to understand."
              />
              <InfoCard
                title="Our Focus"
                text="Households, workers, and businesses that need fair, transparent, and well-managed lending support."
              />
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <InsightCard title="Vision" items={visionPoints} index="01" tone="slate" />
            <InsightCard title="Core Values" items={coreValues} index="02" tone="indigo" />
            <InsightCard title="What We Offer" items={offerings} index="03" tone="amber" />
            <InsightCard title="Why Clients Trust Us" items={trustPoints} index="04" tone="emerald" />
          </div>

          <div className="mt-12 grid gap-8 xl:grid-cols-2">
            <div className="rounded-[32px] border border-slate-200 bg-slate-50/80 p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <SectionEyebrow>Board of Directors</SectionEyebrow>
                  <h2 className="mt-4 text-2xl font-bold leading-tight text-slate-900">
                    Governance and strategic oversight
                  </h2>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                The board provides institutional oversight, strategic direction, and governance discipline
                to ensure sustainable growth, accountability, and sound decision-making.
              </p>

              <div className="mt-6 grid gap-4">
                {boardMembers.map((member) => (
                  <TeamCard key={member.name} name={member.name} role={member.role} />
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-slate-50/80 p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <SectionEyebrow>Management Team</SectionEyebrow>
                  <h2 className="mt-4 text-2xl font-bold leading-tight text-slate-900">
                    Operational leadership
                  </h2>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                The management team translates strategy into execution by overseeing service delivery,
                credit quality, internal process discipline, and day-to-day operational performance.
              </p>

              <div className="mt-6 grid gap-4">
                {managementTeam.map((member) => (
                  <TeamCard key={member.name} name={member.name} role={member.role} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
