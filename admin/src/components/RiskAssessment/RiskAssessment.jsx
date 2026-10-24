import { useEffect, useMemo, useState } from "react";
import { FileText, Printer, RefreshCw, Save, Send, ShieldCheck, X } from "lucide-react";
import { riskApi } from "../../services/api/risk.api";
import { getAdminUser } from "../../utils/adminAuth";
import { normalizeAdminRole } from "../../utils/adminRbac";

const SCORE_FIELDS = [
  ["repaymentCapacity", "Repayment capacity"],
  ["collateralQuality", "Security / collateral quality"],
  ["collateralCoverage", "Security value / coverage"],
  ["suretyStrength", "Surety / guarantor strength"],
  ["financialPosition", "Customer financial position"],
  ["documentationCompleteness", "Documentation / legal completeness"],
  ["additionalRisk", "Additional risk considerations"],
];

const emptyForm = {
  applicationType: "INQUIRY",
  scores: Object.fromEntries(SCORE_FIELDS.map(([key]) => [key, 0])),
  security: { securityType: "", description: "", ownership: "", estimatedValue: 0, verifiedValue: 0, forcedSaleValue: 0, coveragePercent: 0, condition: "", verificationNotes: "" },
  surety: { name: "", relationship: "", income: 0, obligations: 0, occupation: "", verificationStatus: "", notes: "" },
  repaymentCapacityNotes: "",
  customerFinancialPosition: "",
  legalDocumentNotes: "",
  strengths: "",
  weaknesses: "",
  identifiedRisks: "",
  conditions: "",
  additionalSecurityRequired: "",
  analystComments: "",
  recommendation: "",
};

const asLines = (value) => Array.isArray(value) ? value.join("\n") : String(value || "");
const money = (v) => `MWK ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const escapeHtml = (value = "") => String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
const lineText = (value) => Array.isArray(value) ? value.join("; ") : String(value || "");

export default function RiskAssessmentPage() {
  const role = normalizeAdminRole(getAdminUser()?.role);
  const canEdit = ["SUPER_ADMIN", "RISK_ANALYST"].includes(role);
  const [queue, setQueue] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [context, setContext] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showReport, setShowReport] = useState(false);

  const selected = useMemo(() => queue.find((item) => String(item.applicationId) === String(selectedId)) || null, [queue, selectedId]);

  const loadQueue = async () => {
    setLoading(true); setError("");
    try {
      const data = await riskApi.queue();
      const items = Array.isArray(data?.items) ? data.items : [];
      setQueue(items);
      setSelectedId((prev) => prev || String(items[0]?.applicationId || ""));
    } catch (err) { setError(err?.response?.data?.message || err?.message || "Could not load risk queue."); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadQueue(); }, []);

  useEffect(() => {
    if (!selectedId) { setContext(null); return; }
    let active = true;
    riskApi.get(selectedId).then((data) => {
      if (!active) return;
      setContext(data);
      const a = data?.assessment;
      if (!a) { setForm(emptyForm); return; }
      setForm({
        applicationType: a.applicationType || "INQUIRY",
        scores: { ...emptyForm.scores, ...(a.scores || {}) },
        security: { ...emptyForm.security, ...(a.security || {}) },
        surety: { ...emptyForm.surety, ...(a.surety || {}) },
        repaymentCapacityNotes: a.repaymentCapacityNotes || "",
        customerFinancialPosition: a.customerFinancialPosition || "",
        legalDocumentNotes: a.legalDocumentNotes || "",
        strengths: asLines(a.strengths), weaknesses: asLines(a.weaknesses), identifiedRisks: asLines(a.identifiedRisks), conditions: asLines(a.conditions),
        additionalSecurityRequired: a.additionalSecurityRequired || "", analystComments: a.analystComments || "", recommendation: a.recommendation || "",
      });
    }).catch((err) => active && setError(err?.response?.data?.message || err?.message || "Could not open risk assessment."));
    return () => { active = false; };
  }, [selectedId]);

  const config = context?.config;
  const assessment = context?.assessment;
  const isSubmitted = assessment?.status === "SUBMITTED";
  const total = SCORE_FIELDS.reduce((sum, [key]) => sum + Number(form.scores?.[key] || 0), 0);

  const updateScore = (key, value) => setForm((prev) => ({ ...prev, scores: { ...prev.scores, [key]: Number(value || 0) } }));
  const updateNested = (section, key, value) => setForm((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));

  const save = async (submit = false) => {
    if (!selectedId || !canEdit || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const payload = { ...form, applicationType: "INQUIRY" };
      const data = submit ? await riskApi.submit(selectedId, payload) : await riskApi.save(selectedId, payload);
      setContext((prev) => ({ ...(prev || {}), assessment: data }));
      setNotice(submit ? "Risk Assessment submitted and locked." : "Risk Assessment draft saved.");
      await loadQueue();
    } catch (err) { setError(err?.response?.data?.message || err?.message || "Could not save risk assessment."); }
    finally { setSaving(false); }
  };

  const reopen = async () => {
    const reason = window.prompt("Reason for reopening this submitted Risk Assessment:");
    if (!reason) return;
    try { await riskApi.reopen(selectedId, reason); setNotice("Assessment reopened for correction."); const data = await riskApi.get(selectedId); setContext(data); }
    catch (err) { setError(err?.response?.data?.message || err?.message || "Could not reopen assessment."); }
  };

  const printReport = () => {
    if (!assessment) return;
    const app = context?.application || {};
    const customer = app.customer || {};
    const loan = app.loan || {};
    const reportWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!reportWindow) {
      setError("Your browser blocked the printable Risk Report. Allow pop-ups for the Admin Portal and try again.");
      return;
    }
    const rows = SCORE_FIELDS.map(([key, label]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(assessment?.scores?.[key] ?? 0)}</td></tr>`).join("");
    reportWindow.document.write(`<!doctype html><html><head><title>Alinafe Capital Risk Report</title><style>body{font-family:Arial,sans-serif;color:#0f172a;margin:32px}h1{margin:0}h2{margin-top:24px;font-size:16px}table{width:100%;border-collapse:collapse;margin-top:10px}td,th{border:1px solid #cbd5e1;padding:8px;text-align:left}.muted{color:#64748b}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.card{border:1px solid #cbd5e1;border-radius:8px;padding:12px}@media print{button{display:none}}</style></head><body><h1>ALINAFE CAPITAL - RISK ASSESSMENT REPORT</h1><p class="muted">Application ${escapeHtml(app.applicationCode || selected?.applicationCode || selectedId)} · ${escapeHtml(assessment.status || "DRAFT")}</p><div class="grid"><div class="card"><b>Customer</b><br/>${escapeHtml(customer.fullName || selected?.customer?.fullName || "-")}<br/>${escapeHtml(customer.email || "")}<br/>${escapeHtml(customer.phone || "")}</div><div class="card"><b>Loan</b><br/>${escapeHtml(loan.productName || "-")}<br/>${escapeHtml(money(loan.requestedAmount || 0))}<br/>${escapeHtml(loan.tenureMonths || 0)} month(s)</div></div><h2>Scoring</h2><table><thead><tr><th>Area</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table><p><b>Total:</b> ${escapeHtml(assessment.scoreTotal ?? 0)}/100 &nbsp; <b>Classification:</b> ${escapeHtml(String(assessment.classification || "").replaceAll("_", " "))}</p><h2>Security / Collateral</h2><p>${escapeHtml(assessment.security?.securityType || "-")} — ${escapeHtml(assessment.security?.description || "")}</p><h2>Surety / Guarantor</h2><p>${escapeHtml(assessment.surety?.name || "-")} — ${escapeHtml(assessment.surety?.relationship || "")}</p><h2>Assessment</h2><p><b>Strengths:</b> ${escapeHtml(lineText(assessment.strengths) || "-")}</p><p><b>Weaknesses:</b> ${escapeHtml(lineText(assessment.weaknesses) || "-")}</p><p><b>Identified risks:</b> ${escapeHtml(lineText(assessment.identifiedRisks) || "-")}</p><p><b>Conditions:</b> ${escapeHtml(lineText(assessment.conditions) || "-")}</p><p><b>Analyst comments:</b> ${escapeHtml(assessment.analystComments || "-")}</p><p><b>Recommendation:</b> ${escapeHtml(String(assessment.recommendation || "-").replaceAll("_", " "))}</p><p class="muted">Analyst: ${escapeHtml(assessment.analystName || assessment.analystEmail || "-")} · Submitted: ${escapeHtml(assessment.submittedAt ? new Date(assessment.submittedAt).toLocaleString() : "Not submitted")}</p><button onclick="window.print()">Print / Save as PDF</button></body></html>`);
    reportWindow.document.close();
    reportWindow.focus();
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-slate-500">Credit Risk</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Risk Assessment</h1><p className="mt-1 text-sm text-slate-500">Assess security, surety and repayment strength before approval.</p></div>
        <div className="flex flex-wrap gap-2">
          {assessment ? <button onClick={()=>setShowReport(true)} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold"><FileText size={15}/>View Risk Report</button> : null}
          <button onClick={loadQueue} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold"><RefreshCw size={15}/>Refresh</button>
        </div>
      </header>
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[320px,1fr]">
        <aside className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Applications for review</h2>
          <div className="mt-3 space-y-2 max-h-[70vh] overflow-auto">
            {loading ? <p className="text-sm text-slate-500">Loading...</p> : queue.length ? queue.map((item) => (
              <button key={item.applicationId} onClick={() => setSelectedId(String(item.applicationId))} className={`w-full rounded-xl border p-3 text-left ${String(item.applicationId) === String(selectedId) ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
                <p className="font-semibold text-slate-900">{item.customer?.fullName || "Customer"}</p>
                <p className="mt-1 text-xs text-slate-500">{item.applicationCode}</p>
                <div className="mt-2 flex justify-between text-xs"><span>{money(item.loan?.requestedAmount)}</span><span>{item.riskAssessment?.status || "Not started"}</span></div>
              </button>
            )) : <p className="text-sm text-slate-500">No KYC-verified applications require review.</p>}
          </div>
        </aside>

        {selected ? <main className="space-y-4">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{context?.application?.customer?.fullName || selected.customer?.fullName}</h2><p className="text-sm text-slate-500">{context?.application?.applicationCode || selected.applicationCode}</p></div><div className="text-right"><p className="text-2xl font-bold">{total}/100</p><p className="text-xs text-slate-500">Current score</p></div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <Info label="Requested" value={money(context?.application?.loan?.requestedAmount)} /><Info label="Product" value={context?.application?.loan?.productName || "-"}/><Info label="KYC" value={context?.application?.customer?.kycStatus || "-"}/><Info label="Monthly income" value={money(context?.application?.customer?.monthlyIncome)}/>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><ShieldCheck size={18}/><h2 className="font-bold">100-point assessment</h2></div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {SCORE_FIELDS.map(([key,label]) => { const max = Number(config?.weights?.[key] ?? 0); return <label key={key} className="rounded-xl border bg-slate-50 p-3 text-sm"><span className="flex justify-between font-semibold"><span>{label}</span><span>/ {max}</span></span><input disabled={!canEdit || isSubmitted} type="number" min="0" max={max} step="0.5" value={form.scores[key]} onChange={(e)=>updateScore(key,e.target.value)} className="mt-2 h-10 w-full rounded-lg border bg-white px-3"/></label>; })}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Panel title="Security / Collateral">
              <TextInput label="Security type" value={form.security.securityType} disabled={!canEdit||isSubmitted} onChange={(v)=>updateNested("security","securityType",v)}/>
              <TextArea label="Description / condition" value={form.security.description} disabled={!canEdit||isSubmitted} onChange={(v)=>updateNested("security","description",v)}/>
              <TextInput label="Ownership" value={form.security.ownership} disabled={!canEdit||isSubmitted} onChange={(v)=>updateNested("security","ownership",v)}/>
              <div className="grid grid-cols-2 gap-2"><NumberInput label="Verified value" value={form.security.verifiedValue} disabled={!canEdit||isSubmitted} onChange={(v)=>updateNested("security","verifiedValue",Number(v||0))}/><NumberInput label="Forced-sale value" value={form.security.forcedSaleValue} disabled={!canEdit||isSubmitted} onChange={(v)=>updateNested("security","forcedSaleValue",Number(v||0))}/></div>
              <NumberInput label="Coverage %" value={form.security.coveragePercent} disabled={!canEdit||isSubmitted} onChange={(v)=>updateNested("security","coveragePercent",Number(v||0))}/>
            </Panel>
            <Panel title="Surety / Guarantor">
              <TextInput label="Name" value={form.surety.name} disabled={!canEdit||isSubmitted} onChange={(v)=>updateNested("surety","name",v)}/>
              <TextInput label="Relationship" value={form.surety.relationship} disabled={!canEdit||isSubmitted} onChange={(v)=>updateNested("surety","relationship",v)}/>
              <div className="grid grid-cols-2 gap-2"><NumberInput label="Income" value={form.surety.income} disabled={!canEdit||isSubmitted} onChange={(v)=>updateNested("surety","income",Number(v||0))}/><NumberInput label="Obligations" value={form.surety.obligations} disabled={!canEdit||isSubmitted} onChange={(v)=>updateNested("surety","obligations",Number(v||0))}/></div>
              <TextInput label="Verification status" value={form.surety.verificationStatus} disabled={!canEdit||isSubmitted} onChange={(v)=>updateNested("surety","verificationStatus",v)}/>
              <TextArea label="Notes" value={form.surety.notes} disabled={!canEdit||isSubmitted} onChange={(v)=>updateNested("surety","notes",v)}/>
            </Panel>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm grid gap-3">
            <TextArea label="Strengths (one per line)" value={form.strengths} disabled={!canEdit||isSubmitted} onChange={(v)=>setForm(p=>({...p,strengths:v}))}/>
            <TextArea label="Weaknesses (one per line)" value={form.weaknesses} disabled={!canEdit||isSubmitted} onChange={(v)=>setForm(p=>({...p,weaknesses:v}))}/>
            <TextArea label="Identified risks (one per line)" value={form.identifiedRisks} disabled={!canEdit||isSubmitted} onChange={(v)=>setForm(p=>({...p,identifiedRisks:v}))}/>
            <TextArea label="Conditions / additional security" value={form.conditions} disabled={!canEdit||isSubmitted} onChange={(v)=>setForm(p=>({...p,conditions:v}))}/>
            <TextArea label="Analyst comments and reasoning" value={form.analystComments} disabled={!canEdit||isSubmitted} onChange={(v)=>setForm(p=>({...p,analystComments:v}))}/>
            <label className="text-sm font-semibold">Final recommendation<select disabled={!canEdit||isSubmitted} value={form.recommendation} onChange={(e)=>setForm(p=>({...p,recommendation:e.target.value}))} className="mt-2 h-11 w-full rounded-xl border px-3"><option value="">Use score-based recommendation</option><option value="RECOMMEND">Recommend</option><option value="RECOMMEND_WITH_CONDITIONS">Recommend with Conditions</option><option value="REFER_FOR_FURTHER_REVIEW">Refer for Further Review</option><option value="DO_NOT_RECOMMEND">Do Not Recommend</option></select></label>
            <div className="flex flex-wrap gap-2 pt-2">
              {canEdit && !isSubmitted ? <><button onClick={()=>save(false)} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"><Save size={15}/>Save Draft</button><button onClick={()=>save(true)} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"><Send size={15}/>Submit & Lock Report</button></> : null}
              {role === "SUPER_ADMIN" && isSubmitted ? <button onClick={reopen} className="rounded-xl border px-4 py-2 text-sm font-semibold">Reopen with reason</button> : null}
              {isSubmitted ? <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Submitted report · {assessment?.classification?.replaceAll("_"," ")} · {assessment?.scoreTotal}/100</span> : null}
            </div>
          </section>
        </main> : <div className="rounded-2xl border border-dashed bg-white p-10 text-sm text-slate-500">Select an application to begin.</div>}
      </div>
      {showReport && assessment ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-label="Risk Assessment Report">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-slate-500">Alinafe Capital</p><h2 className="text-xl font-bold">Risk Assessment Report</h2><p className="text-sm text-slate-500">{context?.application?.applicationCode || selected?.applicationCode}</p></div>
              <button type="button" onClick={()=>setShowReport(false)} className="rounded-lg border p-2 text-slate-600" aria-label="Close Risk Report"><X size={18}/></button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Info label="Customer" value={context?.application?.customer?.fullName || selected?.customer?.fullName || "-"}/>
              <Info label="Score" value={`${assessment.scoreTotal ?? total}/100`}/>
              <Info label="Classification" value={String(assessment.classification || "-").replaceAll("_"," ")}/>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Panel title="Recommendation"><p className="text-sm">{String(assessment.recommendation || "-").replaceAll("_"," ")}</p><p className="mt-2 text-sm text-slate-600">{assessment.analystComments || "No analyst comments recorded."}</p></Panel>
              <Panel title="Security & Surety"><p className="text-sm"><b>Security:</b> {assessment.security?.securityType || "-"}</p><p className="mt-2 text-sm"><b>Surety:</b> {assessment.surety?.name || "-"}</p></Panel>
            </div>
            <div className="mt-4"><Panel title="Identified Risks"><p className="whitespace-pre-wrap text-sm">{lineText(assessment.identifiedRisks) || "No identified risks recorded."}</p></Panel></div>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={printReport} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"><Printer size={16}/>Print / Save as PDF</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Panel({title,children}) { return <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">{title}</h3><div className="mt-4 grid gap-3">{children}</div></section>; }
function Info({label,value}) { return <div className="rounded-xl border bg-slate-50 p-3"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
function TextInput({label,value,onChange,disabled}) { return <label className="text-sm font-semibold">{label}<input disabled={disabled} value={value||""} onChange={(e)=>onChange(e.target.value)} className="mt-1 h-10 w-full rounded-lg border px-3 font-normal disabled:bg-slate-50"/></label>; }
function NumberInput({label,value,onChange,disabled}) { return <label className="text-sm font-semibold">{label}<input disabled={disabled} type="number" min="0" value={value??0} onChange={(e)=>onChange(e.target.value)} className="mt-1 h-10 w-full rounded-lg border px-3 font-normal disabled:bg-slate-50"/></label>; }
function TextArea({label,value,onChange,disabled}) { return <label className="text-sm font-semibold">{label}<textarea disabled={disabled} value={value||""} onChange={(e)=>onChange(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border p-3 font-normal disabled:bg-slate-50"/></label>; }
