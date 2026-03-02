import { useState } from "react";

export default function DashboardContactOfficerPage() {
  const [message, setMessage] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setStatus("Please enter your message.");
      return;
    }

    // Replace with API later
    setStatus("Message sent successfully.");
    setMessage("");
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <section className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-800">
          Contact Officer
        </h1>
        <p className="text-sm text-slate-500">
          Get help from your assigned loan officer.
        </p>
      </section>

      {/* OFFICER CARD */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-base font-semibold text-slate-800">
          Your Loan Officer
        </h2>

        <div className="space-y-1 text-sm text-slate-600">
          <p><span className="font-medium">Name:</span> John Banda</p>
          <p><span className="font-medium">Phone:</span> +265 XXX XXX XXX</p>
          <p><span className="font-medium">Email:</span> officer@alinafe.com</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-3">
          <ActionButton label="Call Officer" />
          <ActionButton label="WhatsApp" />
          <ActionButton label="Send Email" />
        </div>
      </section>

      {/* MESSAGE FORM */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-800">
          Send a Message
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            rows="4"
            placeholder="Write your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
          />

          <select
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            className="w-full border rounded-xl px-4 py-2 text-sm"
          >
            <option value="">Preferred contact time (optional)</option>
            <option>Morning (8AM – 12PM)</option>
            <option>Afternoon (12PM – 4PM)</option>
            <option>Evening (4PM – 6PM)</option>
          </select>

          <button
            type="submit"
            className="w-full sm:w-auto rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 transition"
          >
            Send Message
          </button>
        </form>

        {status && (
          <p className="text-sm text-slate-600">{status}</p>
        )}
      </section>

      {/* OFFICE HOURS */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-2">
        <h3 className="text-base font-semibold text-slate-800">
          Support Hours
        </h3>
        <p className="text-sm text-slate-600">
          Monday – Friday, 8:00 AM – 5:00 PM
        </p>
        <p className="text-xs text-slate-500">
          Average response time: 6–12 hours.
        </p>
      </section>

      {/* EMERGENCY STRIP */}
      <section className="rounded-xl border bg-amber-50 border-amber-200 p-4 text-sm text-amber-700">
        If your repayment is urgent or overdue, please call support immediately.
      </section>

    </div>
  );
}

function ActionButton({ label }) {
  return (
    <button className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-100 transition w-full sm:w-auto">
      {label}
    </button>
  );
}