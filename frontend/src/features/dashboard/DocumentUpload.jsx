import { useMemo, useState } from "react";
import { CheckCircle2, FileText, LoaderCircle, Upload } from "lucide-react";
import { api } from "../../services/api";

export default function DocumentUpload({ profile, onUploaded, setError, setSuccess }) {
  const [nationalId, setNationalId] = useState(null);
  const [bankStatement, setBankStatement] = useState(null);
  const [incomeProof, setIncomeProof] = useState(null);
  const [uploadingType, setUploadingType] = useState("");

  const documents = Array.isArray(profile?.documents) ? profile.documents : [];
  const employmentType = String(profile?.employmentType || "").trim().toLowerCase();
  const useTwoDocumentFlow =
    employmentType === "farmer" || employmentType === "self-employed";
  const docTypes = useMemo(
    () =>
      [
        {
          id: "kyc-national-id",
          key: "national_id",
          title: "National ID Malawi",
        },
        {
          id: "kyc-bank-statement",
          key: "bank_statement_3_months",
          title: "Bank Statement (Last 3 months)",
        },
        ...(!useTwoDocumentFlow
          ? [
              {
                id: "kyc-income-proof",
                key: "payslip_or_business_proof",
                title: "Payslip",
              },
            ]
          : []),
      ],
    [useTwoDocumentFlow]
  );
  const uploadedMap = {
    national_id: documents.find((doc) => doc?.type === "national_id") || null,
    bank_statement_3_months:
      documents.find((doc) => doc?.type === "bank_statement_3_months") || null,
    payslip_or_business_proof:
      documents.find((doc) => doc?.type === "payslip_or_business_proof") || null,
  };

  const uploadDoc = async (type, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", file);
    await api.post("/profile/me/doc", formData);
  };

  const uploadSingle = async (type, file) => {
    setError("");
    setSuccess("");
    try {
      if (!file) {
        setError("Choose a file before uploading.");
        return;
      }
      setUploadingType(type);
      await uploadDoc(type, file);
      setSuccess("Document uploaded successfully.");
      onUploaded();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to upload document");
    } finally {
      setUploadingType("");
    }
  };

  const fileByType = {
    national_id: nationalId,
    bank_statement_3_months: bankStatement,
    payslip_or_business_proof: incomeProof,
  };

  const setFileByType = {
    national_id: setNationalId,
    bank_statement_3_months: setBankStatement,
    payslip_or_business_proof: setIncomeProof,
  };

  const renderPicker = ({ id, key, title }) => {
    const file = fileByType[key];
    const setFile = setFileByType[key];
    const uploadedDoc = uploadedMap[key];
    const isUploading = uploadingType === key;

    return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="mt-1 text-xs text-slate-500">
        Allowed: PDF, JPG, JPEG, PNG
      </p>

      <div className="mt-2 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label
          htmlFor={id}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <Upload size={14} />
          Choose File
        </label>
        <input
          id={id}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
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

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {uploadedDoc ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <CheckCircle2 size={13} />
              Uploaded
            </span>
          ) : (
            <span className="text-xs text-slate-500">Not uploaded yet</span>
          )}

          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => uploadSingle(key, file)}
            type="button"
            disabled={!file || isUploading}
          >
            {isUploading ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploadedDoc ? "Replace Document" : "Upload Document"}
          </button>
        </div>
      </div>
    </div>
    );
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 p-4">
      <h2 className="font-semibold text-slate-800">Upload KYC Documents</h2>

      {docTypes.map((doc) => renderPicker(doc))}
    </section>
  );
}
