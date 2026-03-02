export default function KycStatusCard({ profile }) {
  const status = profile?.kycStatus || "not_started";

  return (
    <section className="border rounded p-4">
      <h2 className="font-semibold">KYC Status</h2>
      <p className="mt-1">{status}</p>
    </section>
  );
}
