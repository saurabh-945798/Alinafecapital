import { api } from "../../services/api";

export default function KycSubmitButton({ profile, onSubmitted, setError, setSuccess }) {
  const completion = profile?.profileCompletion || 0;
  const status = profile?.kycStatus || "not_started";
  const disabled = status === "pending" || status === "verified";

  const submit = async () => {
    if (completion < 100) return;
    setError("");
    setSuccess("");
    try {
      await api.post("/profile/me/submit", {});
      setSuccess("KYC submitted");
      onSubmitted();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit KYC");
    }
  };

  return (
    <section className="border rounded p-4 space-y-2">
      <h2 className="font-semibold">KYC Submission</h2>
      {completion < 100 && <p>Complete profile to submit KYC</p>}
      <button className="border rounded px-3 py-2" type="button" onClick={submit} disabled={disabled || completion < 100}>
        Submit KYC
      </button>
    </section>
  );
}

