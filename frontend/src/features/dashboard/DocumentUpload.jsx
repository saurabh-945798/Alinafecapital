import { useMemo, useState } from "react";
import { CheckCircle2, FileText, LoaderCircle, Upload } from "lucide-react";
import { api } from "../../services/api";
import { useEffect } from "react";

export default function DocumentUpload({
  profile,
  onUploaded,
  setError,
  setSuccess,
  uploadUrl = "/profile/me/doc",
}) {
  const [uploadingType, setUploadingType] = useState("");
  const [successType, setSuccessType] = useState("");
  const [localDocuments, setLocalDocuments] = useState(
    Array.isArray(profile?.documents) ? profile.documents : []
  );

  useEffect(() => {
    setLocalDocuments(Array.isArray(profile?.documents) ? profile.documents : []);
  }, [profile?.documents]);

  const documents = localDocuments;
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
        {
          id: "kyc-security-offer",
          key: "security_offer",
          title: "Security Offer",
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
    security_offer: documents.find((doc) => doc?.type === "security_offer") || null,
    payslip_or_business_proof:
      documents.find((doc) => doc?.type === "payslip_or_business_proof") || null,
  };

  const uploadDoc = async (type, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", file);
    return api.post(uploadUrl, formData);
  };

  const uploadSingle = async (type, file) => {
    setError("");
    setSuccess("");
    setSuccessType("");
    try {
      if (!file) {
        setError("Choose a file before uploading.");
        return;
      }
      setUploadingType(type);
      const { data } = await uploadDoc(type, file);
      const nextProfile = data?.item ?? data?.data ?? null;
      if (Array.isArray(nextProfile?.documents)) {
        setLocalDocuments(nextProfile.documents);
      }
      setSuccessType(type);
      onUploaded?.(nextProfile);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to upload document");
    } finally {
      setUploadingType("");
    }
  };

  const getUploadedFileName = (doc) => {
    if (!doc?.fileUrl) return "";
    const cleanPath = String(doc.fileUrl).split("?")[0];
    const rawName = cleanPath.substring(cleanPath.lastIndexOf("/") + 1);
    const withoutStamp = rawName.replace(/^\d+-/, "");
    return decodeURIComponent(withoutStamp || rawName);
  };

  const handleFilePick = async (type, file) => {
    if (!file) return;
    await uploadSingle(type, file);
  };

  const renderPicker = ({ id, key, title }) => {
    const uploadedDoc = uploadedMap[key];
    const isUploading = uploadingType === key;
    const uploadedFileName = getUploadedFileName(uploadedDoc);
    const isSuccess = successType === key;

    return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="mt-1 text-xs text-slate-500">
        Allowed: PDF, JPG, JPEG, PNG
      </p>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <label
          htmlFor={id}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:w-auto"
        >
          <Upload size={14} />
          Choose File
        </label>
        <input
          id={id}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={(e) => {
            const nextFile = e.target.files?.[0] || null;
            handleFilePick(key, nextFile);
            e.target.value = "";
          }}
          className="hidden"
        />

        <span className="text-xs leading-5 text-slate-500">
          {isUploading ? "Uploading file..." : "Choose a file to upload instantly"}
        </span>
        </div>

        {isUploading ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            <LoaderCircle size={13} className="animate-spin" />
            Uploading...
          </div>
        ) : uploadedDoc ? (
          <div className="space-y-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <CheckCircle2 size={13} />
              Uploaded
            </span>
            {isSuccess ? (
              <p className="text-xs font-medium text-emerald-700">
                Uploaded successfully
              </p>
            ) : null}
            <p className="flex items-center gap-2 text-xs text-slate-600">
              <FileText size={13} />
              {uploadedFileName || "Document uploaded"}
            </p>
          </div>
        ) : (
          <span className="text-xs text-slate-500">No document uploaded yet</span>
        )}
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
