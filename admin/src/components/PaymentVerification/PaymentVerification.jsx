import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw, CheckCircle2, XCircle, MessageSquareWarning } from "lucide-react";
import { bankPaymentsApi } from "../../services/api/bankPayments.api";
import { protectedFilesApi } from "../../services/api/files.api.js";
import { getAdminUser } from "../../utils/adminAuth";
import { normalizeAdminRole } from "../../utils/adminRbac";

const money = (v) => `MWK ${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (v) => v ? new Date(v).toLocaleString("en-GB") : "-";
const statusLabel = (v) => String(v || "").replaceAll("_", " ");

export default function PaymentVerificationPage() {
  const role = normalizeAdminRole(getAdminUser()?.role);
  const canDecide = ["SUPER_ADMIN", "PAYMENT_VERIFIER"].includes(role);
  const [status, setStatus] = useState("ALL");
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const current = useMemo(() => selected || items.find((item) => String(item._id) === String(selectedId)) || null, [selected, items, selectedId]);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const data = await bankPaymentsApi.list(status);
      const list = Array.isArray(data?.items) ? data.items : [];
      setItems(list);
      setSelectedId((prev) => list.some((x)=>String(x._id)===String(prev)) ? prev : String(list[0]?._id || ""));
    } catch (err) { setError(err?.response?.data?.message || err?.message || "Could not load bank payments."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [status]);
  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }
    bankPaymentsApi.get(selectedId).then((data) => { setSelected(data); setNotes(""); setConfirmed(false); }).catch((err)=>setError(err?.response?.data?.message || err?.message || "Could not open payment."));
  }, [selectedId]);

  const decide = async (action) => {
    if (!current || saving) return;
    const reasonNeeded = action !== "VERIFY";
    const reason = reasonNeeded ? window.prompt(action === "REJECT" ? "Reason for rejecting this payment:" : "What clarification is required from the customer:") : "";
    if (reasonNeeded && !reason) return;
    if (action === "VERIFY" && !confirmed) { setError("Confirm that this transfer has been identified in the bank/reconciliation records first."); return; }
    if (action === "VERIFY" && notes.trim().length < 3) { setError("Enter verification notes before approving this payment."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const data = await bankPaymentsApi.decide(current._id, { action, reason, verificationNotes: notes, confirmedInBankRecords: confirmed });
      setNotice(action === "VERIFY" ? "Payment verified and posted to the loan account." : action === "REJECT" ? "Payment rejected and customer notified." : "Clarification requested from the customer.");
      setSelected(data?.payment || data);
      await load();
    } catch (err) { setError(err?.response?.data?.message || err?.message || "Could not update payment."); }
    finally { setSaving(false); }
  };

  const popUrl = current?.pop?.viewUrl || "";
  const loan = current?.loanAccountId && typeof current.loanAccountId === "object" ? current.loanAccountId : null;
  const customer = current?.userId && typeof current.userId === "object" ? current.userId : null;

  return <div className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-slate-500">Finance</p><h1 className="mt-1 text-2xl font-bold">Payment Verification</h1><p className="mt-1 text-sm text-slate-500">Review bank transfers and Proofs of Payment before updating loan balances.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold"><RefreshCw size={15}/>Refresh</button></header>
    {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
    {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div> : null}
    <div className="flex flex-wrap gap-2">{["ALL","PENDING_VERIFICATION","REQUIRES_CLARIFICATION","POSTED","REJECTED"].map((item)=><button key={item} onClick={()=>setStatus(item)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${status===item?"bg-slate-900 text-white":"bg-white"}`}>{statusLabel(item)}</button>)}</div>
    <div className="grid gap-5 xl:grid-cols-[370px,1fr]">
      <aside className="rounded-2xl border bg-white p-4 shadow-sm"><h2 className="font-semibold">Submitted bank payments</h2><div className="mt-3 max-h-[70vh] space-y-2 overflow-auto">{loading?<p className="text-sm text-slate-500">Loading...</p>:items.length?items.map((item)=><button key={item._id} onClick={()=>setSelectedId(String(item._id))} className={`w-full rounded-xl border p-3 text-left ${String(item._id)===String(selectedId)?"border-slate-900 bg-slate-50":"border-slate-200"}`}><div className="flex justify-between gap-2"><p className="font-semibold">{item.userId?.fullName || item.loanAccountId?.customerName || "Customer"}</p><span className="text-xs font-semibold">{statusLabel(item.status)}</span></div><p className="mt-1 text-xs text-slate-500">{item.paymentReference}</p><p className="mt-2 text-sm font-semibold">{money(item.amount)}</p></button>):<p className="text-sm text-slate-500">No payments in this view.</p>}</div></aside>
      {current?<main className="space-y-4">
        <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-bold">{customer?.fullName || loan?.customerName || "Customer"}</h2><p className="text-sm text-slate-500">{loan?.accountNumber || "Loan account"} · {current.paymentReference}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{statusLabel(current.status)}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Info label="Declared amount" value={money(current.amount)}/><Info label="Bank reference" value={current.bankTransactionReference}/><Info label="Payment date" value={date(current.paymentDate)}/><Info label="Submitted" value={date(current.createdAt || current.submittedAt)}/><Info label="Outstanding balance" value={money(loan?.outstandingBalance)}/><Info label="Next due date" value={date(loan?.nextDueDate)}/><Info label="Customer phone" value={customer?.phone || loan?.phone || "-"}/><Info label="Bank used" value={current.bankUsed || "-"}/></div></section>
        <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Proof of Payment</h3>{popUrl?<button type="button" onClick={async()=>{try{await protectedFilesApi.open(popUrl)}catch(err){setError(err?.response?.data?.message||err?.message||"Could not open Proof of Payment.")}}} className="mt-3 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"><ExternalLink size={15}/>View POP</button>:<p className="mt-2 text-sm text-slate-500">No POP found.</p>}<p className="mt-3 text-xs text-slate-500">Compare the POP to the bank transaction reference, amount and the bank/reconciliation records.</p></section>
        {current.clarificationMessage?<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><b>Clarification requested:</b> {current.clarificationMessage}{current.customerResponse?<p className="mt-2"><b>Customer response:</b> {current.customerResponse}</p>:null}</div>:null}
        {current.rejectionReason?<div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm"><b>Rejection reason:</b> {current.rejectionReason}</div>:null}
        {canDecide && !["POSTED"].includes(current.status)?<section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Verification decision</h3><label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(e)=>setConfirmed(e.target.checked)} className="mt-1"/><span>I have confirmed this payment in the relevant bank/reconciliation records.</span></label><label className="mt-3 block text-sm font-semibold">Verification notes<textarea rows={3} value={notes} onChange={(e)=>setNotes(e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" placeholder="What was checked and confirmed?"/></label><div className="mt-4 flex flex-wrap gap-2"><button disabled={saving} onClick={()=>decide("VERIFY")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"><CheckCircle2 size={15}/>Verify Payment</button><button disabled={saving} onClick={()=>decide("REQUEST_CLARIFICATION")} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"><MessageSquareWarning size={15}/>Request Clarification</button><button disabled={saving} onClick={()=>decide("REJECT")} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"><XCircle size={15}/>Reject</button></div></section>:null}
        {current.history?.length?<section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Payment history</h3><div className="mt-3 space-y-2">{[...current.history].reverse().map((h,i)=><div key={`${h.action}-${i}`} className="rounded-xl border bg-slate-50 p-3 text-sm"><div className="flex justify-between gap-3"><b>{statusLabel(h.action)}</b><span className="text-xs text-slate-500">{date(h.createdAt)}</span></div><p className="mt-1 text-slate-600">{h.note || "-"}</p></div>)}</div></section>:null}
      </main>:<div className="rounded-2xl border border-dashed bg-white p-10 text-sm text-slate-500">Select a bank payment.</div>}
    </div>
  </div>;
}
function Info({label,value}){return <div className="rounded-xl border bg-slate-50 p-3"><p className="text-[11px] uppercase text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value||"-"}</p></div>}
