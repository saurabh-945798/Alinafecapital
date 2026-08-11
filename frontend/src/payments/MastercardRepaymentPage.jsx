import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, CreditCard, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { api } from "../services/api";
import RestockTechLogo, { RestockTechSignature } from "../components/Brand/RestockTechLogo.jsx";
import logoImage from "../../images/logo.png";
import visaMastercardImage from "../assets/visa-mastercard.png";

const scriptCache = new Map();

const loadExternalScript = (src) => {
  if (scriptCache.has(src)) return scriptCache.get(src);

  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (window.PaymentSession) return resolve();
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("The secure card form could not load."));
    document.body.appendChild(script);
  });

  scriptCache.set(src, promise);
  return promise;
};

const formatMoney = (amount, currency) =>
  `${currency || "MWK"} ${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const clearCardFieldValues = () => {
  ["cardholder-name", "card-number", "expiry-month", "expiry-year", "security-code"].forEach((id) => {
    const field = document.getElementById(id);
    if (field) {
      try {
        field.value = "";
      } catch {
        // Hosted fields may be controlled by Mastercard. Re-rendering below still resets the containers.
      }
    }
  });
};


const formatStatusLabel = (status) => {
  const normalized = String(status || "SESSION_CREATED").toUpperCase();
  const labels = {
    PAID: "Paid",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
    UNKNOWN: "Pending confirmation",
    PAYMENT_PROCESSING: "Processing",
    SESSION_CREATED: "Ready to pay",
  };
  return labels[normalized] || normalized.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

const statusClasses = {
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-800",
  FAILED: "border-rose-200 bg-rose-50 text-rose-800",
  CANCELLED: "border-amber-200 bg-amber-50 text-amber-800",
  UNKNOWN: "border-amber-200 bg-amber-50 text-amber-800",
  PAYMENT_PROCESSING: "border-blue-200 bg-blue-50 text-blue-800",
  SESSION_CREATED: "border-slate-200 bg-slate-50 text-slate-700",
};

export default function MastercardRepaymentPage() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const configuredRef = useRef(false);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scriptReady, setScriptReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [configureNonce, setConfigureNonce] = useState(0);
  const [cardFormKey, setCardFormKey] = useState(0);

  const isPaid = payment?.status === "PAID";
  const statusClass = statusClasses[payment?.status] || statusClasses.SESSION_CREATED;

  const isExpiredSessionMessage = (message = "") =>
    String(message || "").toLowerCase().includes("form session not found") ||
    String(message || "").toLowerCase().includes("expired");

  const refreshCardSession = async () => {
    setPaying(true);
    setError("");
    setStatusMessage("Refreshing the card form...");
    clearCardFieldValues();
    try {
      const { data } = await api.post(`/payments/mastercard/repayments/${paymentId}/refresh-session`);
      const nextPayment = data?.data || data;
      configuredRef.current = false;
      setPayment(nextPayment);
      setCardFormKey((value) => value + 1);
      setConfigureNonce((value) => value + 1);
      setStatusMessage("Card form refreshed. Please enter the card details again.");
      setTimeout(clearCardFieldValues, 0);
      return nextPayment;
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not refresh the card form.");
      return null;
    } finally {
      setPaying(false);
    }
  };

  const fetchPayment = async () => {
    const { data } = await api.get(`/payments/mastercard/repayments/${paymentId}`);
    const nextPayment = data?.data || data;
    setPayment(nextPayment);
    return nextPayment;
  };

  useEffect(() => {
    let active = true;

    const boot = async () => {
      setLoading(true);
      setError("");
      try {
        const nextPayment = await fetchPayment();
        const src = nextPayment?.session?.scriptUrl;
        if (!src) throw new Error("Payment setup is incomplete. Please contact support.");
        configuredRef.current = false;
        await loadExternalScript(src);
        if (!active) return;
        setScriptReady(true);
      } catch (err) {
        if (active) setError(err?.response?.data?.message || err?.message || "Could not load payment session.");
      } finally {
        if (active) setLoading(false);
      }
    };

    boot();
    return () => {
      active = false;
    };
  }, [paymentId]);

  useEffect(() => {
    if (!scriptReady || !payment?.session?.id || configuredRef.current || isPaid) return;
    if (!window.PaymentSession) {
      setError("The secure card form did not open. Please refresh and try again.");
      return;
    }

    try {
      clearCardFieldValues();
      window.PaymentSession.configure({
        session: String(payment.session.id || ""),
        fields: {
          card: {
            number: "#card-number",
            securityCode: "#security-code",
            expiryMonth: "#expiry-month",
            expiryYear: "#expiry-year",
            nameOnCard: "#cardholder-name",
          },
        },
        frameEmbeddingMitigation: ["javascript"],
        callbacks: {
          initialized: function (response) {
            if (response?.status && String(response.status).toUpperCase() === "ERROR") {
              const message = response?.message || response?.errors?.message || "The card form could not be prepared.";
              setError(message);
              return;
            }
            setStatusMessage("Card payment form is ready.");
          },
          formSessionUpdate: async function (response) {
            const responseStatus = String(response?.status || "").toUpperCase();
            if (responseStatus === "OK") {
              try {
                setPaying(true);
                setError("");
                setStatusMessage("Processing your repayment...");
                const { data } = await api.post(`/payments/mastercard/repayments/${paymentId}/pay`, {
                  sessionId: response?.session?.id || payment.session.id,
                });
                const nextPayment = data?.data || data;
                setPayment(nextPayment);
                if (nextPayment?.status === "PAID") {
                  setError("");
                  setStatusMessage("Repayment successful. Your loan account has been updated.");
                } else if (["FAILED", "CANCELLED"].includes(nextPayment?.status)) {
                  setStatusMessage("");
                  setError(nextPayment?.gatewayMessage || "Payment was not completed. Please try another card, another amount, or another payment method.");
                } else {
                  setStatusMessage("Payment is still pending confirmation. You may check the repayment status again shortly.");
                  setError("");
                }
              } catch (err) {
                setError(err?.response?.data?.message || err?.message || "Payment processing failed.");
              } finally {
                setPaying(false);
              }
              return;
            }

            const fieldMessages = [];
            if (response?.errors?.cardNumber) fieldMessages.push("Check the card number.");
            if (response?.errors?.expiryMonth) fieldMessages.push("Check the expiry month.");
            if (response?.errors?.expiryYear) fieldMessages.push("Check the expiry year.");
            if (response?.errors?.securityCode) fieldMessages.push("Check the CVV.");
            if (response?.errors?.cardholderName) fieldMessages.push("Check the cardholder name.");

            const message =
              response?.errors?.message ||
              response?.errors?.[0]?.message ||
              fieldMessages.join(" ") ||
              "Card details could not be accepted. Please check the details and try again.";

            if (isExpiredSessionMessage(message)) {
              await refreshCardSession();
              return;
            }

            setPaying(false);
            setError(message);
          },
        },
        interaction: {
          displayControl: {
            formatCard: "EMBOSSED",
            invalidFieldCharacters: "REJECT",
          },
        },
      });
      configuredRef.current = true;
    } catch (err) {
      setError(err?.message || "Could not prepare the secure card form.");
    }
  }, [scriptReady, payment, paymentId, isPaid, configureNonce]);

  const handlePay = () => {
    setError("");
    if (!window.PaymentSession || !configuredRef.current) {
      setError("The payment form is still loading. Please wait a moment and try again.");
      return;
    }
    setPaying(true);
    setStatusMessage("Submitting your payment...");
    try {
      window.PaymentSession.updateSessionFromForm("card");
    } catch (err) {
      setPaying(false);
      setError(err?.message || "Could not submit card details.");
    }
  };

  const refreshStatus = async () => {
    setChecking(true);
    setError("");
    try {
      const { data } = await api.post(`/payments/mastercard/repayments/${paymentId}/status`);
      const nextPayment = data?.data || data;
      setPayment(nextPayment);
      if (nextPayment?.status === "PAID") {
        setStatusMessage("Repayment confirmed. Your loan account has been updated.");
        setError("");
      } else if (["FAILED", "CANCELLED"].includes(nextPayment?.status)) {
        setStatusMessage("");
        setError(nextPayment?.gatewayMessage || "Payment was not completed. Please try another card, another amount, or another payment method.");
      } else {
        setStatusMessage("Status refreshed. This repayment is still pending confirmation.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not refresh payment status.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f8fbff_40%,#ffffff_74%)] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => navigate("/dashboard/repayments")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950"
          >
            <ArrowLeft size={16} /> Back to repayments
          </button>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            <ShieldCheck size={15} className="text-emerald-600" /> Card payment
          </span>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_80px_rgba(15,23,42,0.10)]">
          <div className="bg-gradient-to-r from-slate-950 via-[#002D5B] to-slate-800 px-6 py-7 text-white sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Loan repayment</p>
                <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Complete your card repayment</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/78">
                  Use your Visa or Mastercard to complete this repayment safely.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/15 bg-white px-4 py-3 text-slate-900 shadow-sm">
                <img src={logoImage} alt="Alinafe Capital" className="h-12 w-auto object-contain" />
                <div className="hidden sm:block">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-800">Alinafe Capital</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Repayment</p>
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-2xl bg-white px-4 py-2 shadow-sm">
                <img src={visaMastercardImage} alt="Visa and Mastercard" className="h-10 w-auto object-contain" />
              </div>
              <RestockTechSignature
                label="Powered by"
                tone="light"
                className="opacity-100"
                logoClassName="h-14 w-auto"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center px-6 py-10">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </div>
                <RestockTechSignature label="Powered by" logoClassName="h-10 w-auto" />
                <p className="mt-3 text-sm text-slate-500">Preparing your payment screen...</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
              <aside className="border-b border-slate-200 bg-slate-50 p-6 lg:border-b-0 lg:border-r sm:p-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Repayment summary</p>
                  <h2 className="mt-3 text-xl font-bold text-slate-900">{payment?.accountNumber || "Loan Account"}</h2>
                  <p className="mt-1 text-sm text-slate-500">{payment?.description || "Loan repayment"}</p>

                  <div className="mt-5 rounded-2xl bg-slate-950 px-4 py-4 text-white">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/60">Amount to repay</p>
                    <p className="mt-1 text-2xl font-bold">{formatMoney(payment?.amount, payment?.currency)}</p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <img src={visaMastercardImage} alt="Visa and Mastercard" className="h-10 w-auto object-contain" />
                  </div>

                  <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${statusClass}`}>
                    Status: {formatStatusLabel(payment?.status)}
                  </div>

                  {payment?.gatewayReceipt ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      Receipt: <span className="font-semibold">{payment.gatewayReceipt}</span>
                    </div>
                  ) : null}
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">Designed to make your repayment experience simple, clear and reliable.</p>
              </aside>

              <div className="p-6 sm:p-8">
                {error ? (
                  <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <XCircle className="mt-0.5 shrink-0" size={18} />
                    <span>{error}</span>
                  </div>
                ) : null}

                {statusMessage ? (
                  <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    <CreditCard className="mt-0.5 shrink-0" size={18} />
                    <span>{statusMessage}</span>
                  </div>
                ) : null}

                {isPaid ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                    <CheckCircle2 className="mx-auto text-emerald-600" size={54} />
                    <h2 className="mt-3 text-2xl font-bold text-slate-900">Repayment received</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Your card repayment has been confirmed and added to your loan account.
                    </p>
                    <Link
                      to="/dashboard/repayments"
                      className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      View repayments
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">Card payment details</h2>
                        <p className="mt-1 text-sm text-slate-500">Enter your card details below to continue.</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <img src={logoImage} alt="Alinafe Capital" className="h-9 w-auto object-contain" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Alinafe Capital</span>
                      </div>
                    </div>

                    <div key={cardFormKey} className="mt-5 grid gap-4">
                      <label className="text-sm font-semibold text-slate-700">
                        Cardholder Name
                        <input id="cardholder-name" className="mt-1 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-900" readOnly />
                      </label>
                      <label className="text-sm font-semibold text-slate-700">
                        Card Number
                        <input id="card-number" className="mt-1 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-900" readOnly />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <label className="text-sm font-semibold text-slate-700">
                          Expiry Month
                          <input id="expiry-month" className="mt-1 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-900" readOnly />
                        </label>
                        <label className="text-sm font-semibold text-slate-700">
                          Expiry Year
                          <input id="expiry-year" className="mt-1 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-900" readOnly />
                        </label>
                        <label className="text-sm font-semibold text-slate-700">
                          CVV
                          <input id="security-code" className="mt-1 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-900" readOnly />
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handlePay}
                      disabled={paying || !scriptReady}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#002D5B] to-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"
                    >
                      {paying ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <CreditCard size={18} />}
                      {paying ? "Processing..." : `Pay ${formatMoney(payment?.amount, payment?.currency)}`}
                    </button>

                    <button
                      type="button"
                      onClick={refreshStatus}
                      disabled={checking}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <RefreshCw size={16} className={checking ? "animate-spin" : ""} />
                      Check Repayment Status
                    </button>

                    <button
                      type="button"
                      onClick={refreshCardSession}
                      disabled={paying || checking}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60"
                    >
                      <RefreshCw size={16} className={paying ? "animate-spin" : ""} />
                      Clear and re-enter card details
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
