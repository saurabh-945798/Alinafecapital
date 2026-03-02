import { useState } from "react";
import { FileText, Upload } from "lucide-react";
import { api } from "../../services/api";

export default function DocumentUpload({ onUploaded, setError, setSuccess }) {
  const [nationalId, setNationalId] = useState(null);
  const [bankStatement, setBankStatement] = useState(null);
  const [incomeProof, setIncomeProof] = useState(null);

  const uploadDoc = async (type, file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      throw new Error("Only PDF files are allowed.");
    }
    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", file);
    await api.post("/profile/me/doc", formData);
  };

  const uploadAll = async () => {
    setError("");
    setSuccess("");
    try {
      await uploadDoc("national_id", nationalId);
      await uploadDoc("bank_statement_3_months", bankStatement);
      await uploadDoc("payslip_or_business_proof", incomeProof);
      setSuccess("Documents uploaded successfully.");
      onUploaded();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to upload document");
    }
  };

  const hasAllFiles = nationalId && bankStatement && incomeProof;

  const renderPicker = ({ id, title, file, setFile }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-sm font-medium text-slate-700">{title}</p>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label
          htmlFor={id}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <Upload size={14} />
          Choose PDF
        </label>
        <input
          id={id}
          type="file"
          accept=".pdf,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
        />

        {file ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <FileText size={13} />
            {file.name}
          </span>
        ) : (
          <span className="text-xs text-slate-500">No file selected</span>
        )}
      </div>
    </div>
  );

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 p-4">
      <h2 className="font-semibold text-slate-800">Upload KYC Documents (PDF only)</h2>

      {renderPicker({
        id: "kyc-national-id",
        title: "1) National ID Malawi (PDF)",
        file: nationalId,
        setFile: setNationalId,
      })}

      {renderPicker({
        id: "kyc-bank-statement",
        title: "2) Bank Statement (Last 3 months) (PDF)",
        file: bankStatement,
        setFile: setBankStatement,
      })}

      {renderPicker({
        id: "kyc-income-proof",
        title: "3) Payslip OR Business Proof (PDF)",
        file: incomeProof,
        setFile: setIncomeProof,
      })}

      <button
        className="rounded-lg border border-slate-300 bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        onClick={uploadAll}
        type="button"
        disabled={!hasAllFiles}
      >
        Upload Documents
      </button>
    </section>
  );
}

