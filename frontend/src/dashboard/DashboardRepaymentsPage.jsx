import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CreditCard, RefreshCw, Smartphone, WalletCards } from "lucide-react";
import { api } from "../services/api";
import { formatMoneyInput, parseMoneyInput } from "../utils/moneyInput";
import { RestockTechSignature } from "../components/Brand/RestockTechLogo.jsx";
import visaMastercardImage from "../assets/visa-mastercard.png";
import airtelMoneyImage from "../assets/airtel-money.jpg";

const formatMoney = (amount, currency = "MWK") =>
  `${currency} ${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
};

const getStatusChip = (status) => {
  const normalized = String(status || "").toLowerCase();
  const base = "px-2 py-1 text-xs font-semibold rounded-full border capitalize";
  if (normalized === "paid") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (normalized === "partial") return `${base} bg-blue-50 text-blue-700 border-blue-200`;
  if (normalized === "overdue") return `${base} bg-red-50 text-red-700 border-red-200`;
  return `${base} bg-amber-50 text-amber-700 border-amber-200`;
};

export default function DashboardRepaymentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const scheduleRequest = location.state || {};
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [airtelPhone, setAirtelPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [airtelPayment, setAirtelPayment] = useState(null);

  const selectedAccount = useMemo(
    () => accounts.find((item) => String(item._id) === String(selectedAccountId)) || accounts[0] || null,
    [accounts, selectedAccountId]
  );

  const currency = selectedAccount?.currency || "MWK";
  const nextInstallment = useMemo(
    () => selectedAccount?.schedule?.find((item) => item.paymentStatus !== "paid") || null,
    [selectedAccount]
  );
  const outstandingBalance = Number(selectedAccount?.outstandingBalance || 0);
  const nextDueAmount = Number(nextInstallment?.remainingAmount || 0);
  const customAmountNumber = useMemo(() => parseMoneyInput(customAmount, 0), [customAmount]);
  const customAmountIsValid = customAmountNumber > 0 && customAmountNumber <= outstandingBalance;
  const customAmountEntered = customAmountNumber > 0;
  const selectedRepaymentAmount = customAmountEntered ? customAmountNumber : nextDueAmount;
  const selectedRepaymentLabel = customAmountEntered ? "Custom Amount" : "Next Due";
  const primaryRepaymentDisabled =
    paying ||
    !selectedRepaymentAmount ||
    selectedRepaymentAmount <= 0 ||
    (customAmountEntered && !customAmountIsValid) ||
    (!customAmountEntered && !nextInstallment);

  const refreshAccounts = async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.get("/accounts/mine");
      const items = data?.data?.items || data?.items || [];
      setAccounts(items);
      const requestedAccountId = String(scheduleRequest?.accountId || "");
      const fallbackAccountId = String(items[0]?._id || "");
      setSelectedAccountId((prev) => prev || requestedAccountId || fallbackAccountId);
      setCustomAmount((prev) => prev || "");
      if (scheduleRequest?.source === "schedule") {
        setNotice("Repayment schedule opened. Choose Card or Airtel Money, then continue with the selected installment.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Unable to load your loan repayments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAccounts();
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    setCustomAmount("");
  }, [selectedAccountId]);

  useEffect(() => {
    if (!accounts.length || !scheduleRequest?.accountId) return;
    setSelectedAccountId(String(scheduleRequest.accountId));
  }, [accounts.length, scheduleRequest?.accountId]);

  const validateSelectedAmount = () => {
    const amount = customAmountEntered ? customAmountNumber : nextDueAmount;
    if (!amount || amount <= 0) {
      throw new Error("Please enter the amount you would like to repay.");
    }
    if (amount > outstandingBalance) {
      throw new Error("The repayment amount cannot be more than your outstanding balance.");
    }
    return amount;
  };

  const startCardRepayment = async ({ repaymentType = "custom", repaymentMonth = null } = {}) => {
    if (!selectedAccount) return;
    setPaying(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        accountId: selectedAccount._id,
        repaymentType,
        repaymentMonth,
      };

      if (repaymentType === "custom") {
        const amount = parseMoneyInput(customAmount, 0);
        if (!amount || amount <= 0) throw new Error("Please enter the amount you would like to repay.");
        if (amount > outstandingBalance) throw new Error("The custom amount cannot be more than your outstanding balance.");
        payload.amount = amount;
        setNotice(`Preparing card repayment for ${formatMoney(amount, currency)}...`);
      }

      const { data } = await api.post("/payments/mastercard/repayments/session", payload);
      const payment = data?.data || data;
      if (!payment?.paymentId) throw new Error("The repayment could not start. Please try again.");
      navigate(`/payments/mastercard/repayments/${payment.paymentId}`);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not start card repayment.");
    } finally {
      setPaying(false);
    }
  };

  const startAirtelRepayment = async ({ repaymentType = "custom", repaymentMonth = null } = {}) => {
    if (!selectedAccount) return;
    setPaying(true);
    setError("");
    setNotice("");
    setAirtelPayment(null);
    try {
      const phone = airtelPhone.trim();
      if (!phone) throw new Error("Please enter the Airtel Money number you would like to use.");

      const payload = {
        accountId: selectedAccount._id,
        repaymentType,
        repaymentMonth,
        airtelPhone: phone,
      };

      if (repaymentType === "custom") {
        const amount = validateSelectedAmount();
        payload.amount = amount;
      }

      const { data } = await api.post("/payments/airtel/repayments/collection", payload);
      const payment = data?.data || data;
      if (!payment?.paymentId) throw new Error("The Airtel Money repayment could not start. Please try again.");
      setAirtelPayment(payment);
      setNotice(
        payment.status === "PAID"
          ? `Airtel Money repayment of ${formatMoney(payment.amount, payment.currency || currency)} was confirmed. Your balance has been updated.`
          : `Airtel Money request sent to ${phone}. Your balance will stay the same until the payment is approved on the phone and confirmed here.`
      );
      if (payment.status === "PAID") await refreshAccounts();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not start Airtel Money repayment.");
    } finally {
      setPaying(false);
    }
  };

  const checkAirtelStatus = async () => {
    if (!airtelPayment?.paymentId) {
      setError("Start an Airtel Money repayment first, then check the status.");
      return;
    }
    setPaying(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post(`/payments/airtel/repayments/${airtelPayment.paymentId}/status`);
      const payment = data?.data || data;
      setAirtelPayment(payment);
      if (payment.status === "PAID") {
        setNotice("Airtel Money repayment confirmed. Your balance has been updated.");
        await refreshAccounts();
      } else if (["FAILED", "CANCELLED", "UNKNOWN"].includes(payment.status)) {
        setError(
          payment.gatewayMessage ||
            "Payment not successful. Your balance has not changed. You may try again or choose another repayment method."
        );
        await refreshAccounts();
      } else {
        setNotice(payment.gatewayMessage || "Payment is still pending. Your balance has not changed. Please approve the prompt on your phone and check again.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not check Airtel Money repayment status.");
    } finally {
      setPaying(false);
    }
  };

  const startSelectedRepayment = (options) => {
    if (paymentMethod === "airtel") {
      startAirtelRepayment(options);
      return;
    }
    startCardRepayment(options);
  };

  const startPrimaryCardRepayment = () => {
    if (customAmountEntered) {
      startSelectedRepayment({ repaymentType: "custom" });
      return;
    }

    startSelectedRepayment({ repaymentType: "next_due", repaymentMonth: nextInstallment?.month || null });
  };

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
        <RestockTechSignature label="Powered by" logoClassName="h-10 w-auto" />
        <p className="mt-3 text-sm text-slate-600">Loading your repayment account...</p>
      </div>
    );
  }

  if (!selectedAccount) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-dashed bg-white p-10 text-center shadow-sm space-y-4">
          <p className="text-sm text-slate-600">No active repayment account was found for your profile.</p>
          <p className="text-xs text-slate-500">
            A repayment account will appear here after a loan has been approved and disbursed.
          </p>
          <Link to="/apply" className="inline-flex rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 transition">
            Apply for a loan
          </Link>
        </section>
      </div>
    );
  }

  const overdueAmount =
    selectedAccount.schedule
      ?.filter((row) => row.paymentStatus === "overdue" || row.paymentStatus === "partial")
      ?.reduce((sum, row) => sum + Number(row.remainingAmount || 0), 0) || 0;

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Loan account</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Repayments</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              View your repayment schedule, choose how much to pay, then select your preferred repayment method.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshAccounts}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{notice}</div>
      ) : null}

      {accounts.length > 1 ? (
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <label className="text-sm font-semibold text-slate-700">
            Select loan account
            <select
              value={selectedAccountId}
              onChange={(event) => setSelectedAccountId(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border px-3 text-sm outline-none focus:border-slate-900"
            >
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.accountNumber} - {account.loanProductName || "Loan"}
                </option>
              ))}
            </select>
          </label>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Outstanding Balance" value={formatMoney(selectedAccount.outstandingBalance, currency)} />
        <SummaryCard label="Next Due Amount" value={formatMoney(nextInstallment?.remainingAmount || 0, currency)} />
        <SummaryCard label="Next Due Date" value={formatDate(nextInstallment?.dueDate || selectedAccount.nextDueDate)} />
        <SummaryCard label="Overdue Amount" value={formatMoney(overdueAmount, currency)} highlight={overdueAmount > 0} />
      </div>

      <section className={`rounded-2xl border p-4 ${overdueAmount > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
        <p className="text-sm font-medium">
          {overdueAmount > 0 ? "You have overdue payments. Please make a repayment as soon as possible." : "You are on track with your repayments."}
        </p>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Choose repayment method</h3>
            <p className="text-sm text-slate-500">Select how you would like to make this repayment.</p>
          </div>
          <WalletCards className="text-slate-500" />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <PaymentChoice
            active={paymentMethod === "card"}
            icon={CreditCard}
            imageSrc={visaMastercardImage}
            imageAlt="Visa and Mastercard"
            title="Card Payment"
            description="Use Visa or Mastercard to make this repayment."
            actionLabel="Continue with Card"
            onClick={() => {
              setPaymentMethod("card");
              setNotice("");
            }}
          />
          <PaymentChoice
            active={paymentMethod === "airtel"}
            icon={Smartphone}
            imageSrc={airtelMoneyImage}
            imageAlt="Airtel Money"
            title="Airtel Money"
            description="Receive a payment prompt on your Airtel Money phone and approve the repayment."
            actionLabel="Choose Airtel Money"
            onClick={() => {
              setPaymentMethod("airtel");
              setError("");
              setNotice("Airtel Money selected. Enter the phone number to receive the payment prompt.");
            }}
          />
        </div>

        {paymentMethod === "card" ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="grid gap-3 lg:grid-cols-3">
              <button
                type="button"
                onClick={startPrimaryCardRepayment}
                disabled={primaryRepaymentDisabled}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {paying ? "Starting..." : `Pay ${selectedRepaymentLabel} ${formatMoney(selectedRepaymentAmount || 0, currency)}`}
              </button>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <label className="text-xs font-semibold text-slate-600">Custom amount</label>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(formatMoneyInput(event.target.value))}
                    className="h-10 min-w-0 flex-1 rounded-lg border px-3 text-sm outline-none focus:border-slate-900"
                    placeholder="Enter amount"
                  />
                  <button
                    type="button"
                    onClick={() => startSelectedRepayment({ repaymentType: "custom" })}
                    disabled={paying || !customAmountIsValid}
                    className="rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {paying ? "Starting..." : "Pay"}
                  </button>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-slate-500">
                  {customAmountNumber > outstandingBalance
                    ? "This amount is more than your outstanding balance."
                    : customAmountNumber > 0
                      ? `Selected amount: ${formatMoney(customAmountNumber, currency)}`
                      : "Enter a different amount, or leave this blank to pay the next due amount."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => startSelectedRepayment({ repaymentType: "full_settlement" })}
                disabled={paying || Number(selectedAccount.outstandingBalance || 0) <= 0}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Settle Full Balance
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {selectedRepaymentAmount > 0
                  ? `Card repayment amount selected: ${formatMoney(selectedRepaymentAmount, currency)}. Your balance and schedule will update after the payment is confirmed.`
                  : "Use your Visa or Mastercard to complete this repayment safely."}
              </span>
              <img src={visaMastercardImage} alt="Visa and Mastercard" className="h-10 w-auto rounded-lg bg-white object-contain px-2 py-1 shadow-sm" />
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50/40 p-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <label className="text-sm font-semibold text-slate-700">
                Airtel Money number
                <input
                  type="tel"
                  value={airtelPhone}
                  onChange={(event) => setAirtelPhone(event.target.value)}
                  className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-[#e4002b]"
                  placeholder="Example: 0999 000 000 or 999 000 000"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Amount to request
                <input
                  type="text"
                  inputMode="decimal"
                  value={customAmount}
                  onChange={(event) => setCustomAmount(formatMoneyInput(event.target.value))}
                  className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-[#e4002b]"
                  placeholder={`Default: ${formatMoney(nextDueAmount || 0, currency)}`}
                />
              </label>
              <button
                type="button"
                onClick={startPrimaryCardRepayment}
                disabled={paying || primaryRepaymentDisabled || !airtelPhone.trim()}
                className="rounded-xl bg-[#e4002b] px-5 py-3 text-sm font-bold text-white shadow-sm hover:brightness-95 disabled:opacity-50"
              >
                {paying ? "Sending..." : "Send Prompt"}
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-red-100 bg-white px-4 py-3 text-xs leading-5 text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Airtel Money amount selected: {formatMoney(selectedRepaymentAmount || 0, currency)}. Your balance will remain the same until Airtel confirms the payment as successful.
              </span>
              <img src={airtelMoneyImage} alt="Airtel Money" className="h-12 w-12 rounded-xl object-cover shadow-sm" />
            </div>

            {airtelPayment ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">Airtel Money request awaiting approval</p>
                    <p className="text-xs text-slate-500">Reference: {airtelPayment.reference || "-"}</p>
                    <p className="text-xs text-slate-500">Transaction ID: {airtelPayment.transactionId || "-"}</p>
                    <p className="mt-1 text-xs text-slate-500">Status: {airtelPayment.status}</p>
                    {airtelPayment.gatewayMessage ? (
                      <p className="mt-1 text-xs text-slate-500">Airtel response: {airtelPayment.gatewayMessage}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={checkAirtelStatus}
                      disabled={paying}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RefreshCw size={14} /> Check Status
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAirtelPayment(null); setNotice(""); }}
                      disabled={paying}
                      className="inline-flex items-center justify-center rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Try another number
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <div className="hidden overflow-x-auto rounded-2xl border bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-4 text-left">Installment</th>
              <th className="p-4 text-left">Due Date</th>
              <th className="p-4 text-left">Amount</th>
              <th className="p-4 text-left">Paid</th>
              <th className="p-4 text-left">Remaining</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {(selectedAccount.schedule || []).map((item) => (
              <tr key={item.month} className="border-t hover:bg-slate-50">
                <td className="p-4">#{item.month}</td>
                <td className="p-4">{formatDate(item.dueDate)}</td>
                <td className="p-4">{formatMoney(item.installment, currency)}</td>
                <td className="p-4">{formatMoney(item.paidAmount, currency)}</td>
                <td className="p-4">{formatMoney(item.remainingAmount, currency)}</td>
                <td className="p-4"><span className={getStatusChip(item.paymentStatus)}>{item.paymentStatus}</span></td>
                <td className="p-4">
                  {item.paymentStatus === "paid" ? (
                    <span className="text-slate-400">Paid</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startSelectedRepayment({ repaymentType: "next_due", repaymentMonth: item.month })}
                      className="font-semibold text-slate-800 hover:underline"
                    >
                      Pay Installment
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {(selectedAccount.schedule || []).map((item) => (
          <div key={item.month} className="rounded-2xl border bg-white p-4 shadow-sm space-y-2">
            <div className="flex justify-between items-center">
              <p className="font-semibold">Installment #{item.month}</p>
              <span className={getStatusChip(item.paymentStatus)}>{item.paymentStatus}</span>
            </div>
            <p className="text-sm text-slate-600">Due: {formatDate(item.dueDate)}</p>
            <p className="text-sm">Amount: {formatMoney(item.installment, currency)}</p>
            <p className="text-sm">Remaining: {formatMoney(item.remainingAmount, currency)}</p>
            {item.paymentStatus !== "paid" ? (
              <button
                type="button"
                onClick={() => startSelectedRepayment({ repaymentType: "next_due", repaymentMonth: item.month })}
                className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-slate-100 transition"
              >
                Pay Installment
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-base font-semibold text-slate-800">Recent Payments</h3>
        {(selectedAccount.repaymentEntries || []).length ? (
          [...(selectedAccount.repaymentEntries || [])]
            .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
            .map((payment) => (
              <div key={payment._id || `${payment.reference}-${payment.paymentDate}`} className="flex justify-between gap-4 text-sm border-t pt-2">
                <div>
                  <p>{formatDate(payment.paymentDate)}</p>
                  <p className="text-slate-500">{payment.method === "card" ? "Card Payment" : payment.method === "mobile_money" ? "Airtel Money" : payment.method}</p>
                </div>
                <div className="text-right">
                  <p>{formatMoney(payment.amount, currency)}</p>
                  <p className="text-slate-400">{payment.reference || "-"}</p>
                </div>
              </div>
            ))
        ) : (
          <p className="text-sm text-slate-500">No repayments recorded yet.</p>
        )}
      </section>
    </div>
  );
}

function PaymentChoice({ active, icon: Icon, imageSrc, imageAlt, title, description, actionLabel, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group overflow-hidden rounded-[1.5rem] border text-left transition duration-200",
        active
          ? "border-[#002D5B] bg-[#002D5B]/5 shadow-sm ring-2 ring-[#002D5B]/10"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
      ].join(" ")}
    >
      <div className="flex min-h-[8.5rem] items-center justify-center bg-slate-50 px-6 py-5">
        {imageSrc ? (
          <img src={imageSrc} alt={imageAlt || title} className="max-h-20 w-full max-w-[16rem] object-contain" />
        ) : (
          <span className={["flex h-14 w-14 items-center justify-center rounded-2xl", active ? "bg-[#002D5B] text-white" : "bg-slate-100 text-slate-700"].join(" ")}>
            <Icon size={24} />
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={["flex h-9 w-9 items-center justify-center rounded-xl", active ? "bg-[#002D5B] text-white" : "bg-slate-100 text-slate-700"].join(" ")}>
              <Icon size={18} />
            </span>
            <h4 className="text-sm font-bold text-slate-900">{title}</h4>
          </div>
          {badge ? <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">{badge}</span> : null}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
        <span className={["mt-4 inline-flex rounded-full px-3 py-2 text-xs font-bold transition", active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white"].join(" ")}>
          {actionLabel || "Choose option"}
        </span>
      </div>
    </button>
  );
}

function SummaryCard({ label, value, highlight = false }) {
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${highlight ? "border-red-200 bg-red-50" : ""}`}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${highlight ? "text-red-700" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}
