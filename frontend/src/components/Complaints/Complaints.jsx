import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { api } from "../../services/api";

const channels = [
  { title: "Phone Support", detail: "+265 997 031 941" },
  { title: "Email", detail: "support@alinafecapital.com" },
  { title: "In Person", detail: "Visit our Lilongwe main office" },
];

const steps = [
  "Share your issue with your name, phone number, and complaint subject.",
  "Our team acknowledges and reviews your complaint.",
  "You receive follow-up with response details and next steps.",
  "If still unresolved, the case can move to a higher internal review.",
];

const contactOptions = [
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];

const initialForm = {
  fullName: "",
  phone: "",
  email: "",
  subject: "",
  preferredContact: "phone",
  message: "",
};

const Complaints = () => {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateComplaintForm = () => {
    if (String(form.fullName || "").trim().length < 2) {
      return "Please enter your full name.";
    }
    if (String(form.phone || "").trim().length < 6) {
      return "Please enter a valid phone number.";
    }
    if (String(form.subject || "").trim().length < 3) {
      return "Complaint subject must be at least 3 characters.";
    }
    if (String(form.message || "").trim().length < 10) {
      return "Complaint details must be at least 10 characters.";
    }
    return "";
  };

  const submitComplaint = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(null);

    try {
      const validationMessage = validateComplaintForm();
      if (validationMessage) {
        setError(validationMessage);
        return;
      }

      const complaintPayload = {
        fullName: String(form.fullName || "").trim(),
        phone: String(form.phone || "").trim(),
        email: String(form.email || "").trim(),
        subject: String(form.subject || "").trim(),
        preferredContact: form.preferredContact,
        message: String(form.message || "").trim(),
      };

      const { data } = await api.post("/complaints", complaintPayload);
      const responsePayload = data?.data || data;
      setSuccess(responsePayload);
      setForm(initialForm);
    } catch (err) {
      const details = err?.response?.data?.details;
      const detailMessage =
        Array.isArray(details) && details.length > 0 ? details[0]?.message : "";
      const networkMessage =
        err?.code === "ERR_NETWORK" || !err?.response
          ? "Complaint service is temporarily unavailable. Please check that the backend server is running on port 5000 and try again."
          : "";

      setError(
        detailMessage ||
          err?.response?.data?.message ||
          networkMessage ||
          "Failed to submit complaint."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-gradient-to-b from-slate-50 via-white to-white py-16 sm:py-20">
      <div className="mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2.25rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10 xl:p-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-slate-500">
              Complaints & Support
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Raise a complaint directly with our team
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">
              If something is not right, submit your complaint here. We review complaints fairly,
              confidentially, and keep the process clear.
            </p>
          </div>

          <div className="mt-10 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-6">
              <article className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-lg font-semibold text-slate-900">How to Contact Us</h2>
                <div className="mt-4 space-y-3">
                  {channels.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-slate-900">Complaint Process</h2>
                <ol className="mt-4 space-y-3 text-sm text-slate-700">
                  {steps.map((step, index) => (
                    <li key={step} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <span className="font-semibold text-slate-900">Step {index + 1}: </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </article>
            </div>

            <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Complaint Form</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Fill the details below and send your complaint directly to the admin team.
                </p>
              </div>

              {error ? (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold text-emerald-800">Complaint submitted successfully.</p>
                      <p className="mt-1">
                        Reference: <span className="font-semibold">{success.complaintCode || "-"}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <form onSubmit={submitComplaint} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">Full Name</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      value={form.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                      required
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">Phone Number</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      required
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">Email Address</span>
                    <input
                      type="email"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">Preferred Contact</span>
                    <select
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      value={form.preferredContact}
                      onChange={(e) => updateField("preferredContact", e.target.value)}
                    >
                      {contactOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Complaint Subject</span>
                  <input
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    value={form.subject}
                    onChange={(e) => updateField("subject", e.target.value)}
                    required
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Complaint Details</span>
                  <textarea
                    rows={6}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    value={form.message}
                    onChange={(e) => updateField("message", e.target.value)}
                    required
                  />
                </label>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting ? "Submitting..." : "Submit Complaint"}
                  </button>
                </div>
              </form>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Complaints;
