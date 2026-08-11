import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import { LoanInquiry } from "../models/LoanInquiry.model.js";
import { normalizeEmail, normalizePhone } from "../utils/normalize.js";
import { calculateProfileCompletion } from "../utils/profileCompletion.js";

const clean = (value = "") => String(value || "").trim();

const PROFILE_DOC_TYPES = new Set([
  "national_id",
  "bank_statement_3_months",
  "security_offer",
  "guarantor_national_id",
  "payslip_or_business_proof",
  "address_proof",
]);

const toProfileDocuments = (documents = []) =>
  (Array.isArray(documents) ? documents : [])
    .filter((doc) => PROFILE_DOC_TYPES.has(String(doc?.type || "")))
    .map((doc) => ({
      type: String(doc.type || ""),
      fileUrl: String(doc.fileUrl || ""),
      filePath: String(doc.filePath || ""),
      mime: String(doc.mime || "application/octet-stream"),
      uploadedAt: doc.uploadedAt || new Date(),
    }))
    .filter((doc) => doc.type && doc.fileUrl && doc.filePath && doc.mime);

const buildIdentityFilter = ({ email = "", phone = "" } = {}) => {
  const filters = [];
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = phone ? normalizePhone(phone) : "";

  if (normalizedEmail) filters.push({ email: normalizedEmail });
  if (normalizedPhone) filters.push({ phone: normalizedPhone });

  return filters.length ? { $or: filters } : null;
};

const mapInquiryToProfileFields = (inquiry, user) => {
  const profileLike = {
    fullName: inquiry.fullName || user?.fullName || "",
    email: normalizeEmail(inquiry.email || user?.email || ""),
    phone: normalizePhone(inquiry.phone || user?.phone || ""),
    addressLine1: inquiry.addressLine1 || inquiry.address || "",
    city: inquiry.city || "",
    district: inquiry.district || inquiry.residenceDistrict || "",
    country: inquiry.country || "Malawi",
    employmentType: inquiry.employmentType || "",
    businessName: inquiry.businessName || "",
    employerNameOrBusinessAddress: inquiry.employerNameOrBusinessAddress || "",
    businessActivityNature: inquiry.businessActivityNature || "",
    jobTitle: inquiry.jobTitle || inquiry.applicantOccupation || "",
    employmentNumber: inquiry.employmentNumber || "",
    employmentStatus: inquiry.employmentStatus || "",
    contractDurationYears: inquiry.contractDurationYears ?? null,
    contractDurationMonths: inquiry.contractDurationMonths ?? null,
    durationWorkedYears: inquiry.durationWorkedYears ?? null,
    durationWorkedMonths: inquiry.durationWorkedMonths ?? null,
    hrContactPhone: inquiry.hrContactPhone || "",
    governmentId: inquiry.governmentId || inquiry.applicantNationalIdNumber || "",
    salaryDate: inquiry.salaryDate || "",
    monthlyIncome: inquiry.monthlyIncome ?? undefined,
    bankName: inquiry.bankName || "",
    accountNumber: inquiry.accountNumber || "",
    branchCode: inquiry.branchCode || "",
    reference1Name: inquiry.reference1Name || "",
    reference1Phone: inquiry.reference1Phone || "",
    reference2Name: inquiry.reference2Name || "",
    reference2Phone: inquiry.reference2Phone || "",
    guarantorRelationship: inquiry.guarantorRelationship || "",
    guarantorNationalId: inquiry.guarantorNationalId || "",
    guarantorOccupation: inquiry.guarantorOccupation || "",
    guarantorHomeVillage: inquiry.guarantorHomeVillage || "",
    avatarUrl: inquiry.avatarUrl || "",
    avatarPath: inquiry.avatarPath || "",
    documents: toProfileDocuments(inquiry.documents),
    kycStatus: inquiry.kycStatus || "not_started",
    kycRemarks: inquiry.kycRemarks || "",
    submittedAt: inquiry.submittedAt || null,
    verifiedAt: inquiry.verifiedAt || null,
    rejectedAt: inquiry.rejectedAt || null,
  };

  profileLike.profileCompletion = calculateProfileCompletion(profileLike);
  if (Number.isFinite(Number(inquiry.profileCompletion))) {
    profileLike.profileCompletion = Math.max(
      Number(inquiry.profileCompletion || 0),
      Number(profileLike.profileCompletion || 0)
    );
  }

  // Once admin has verified KYC on the inquiry, the customer dashboard should
  // reflect that same approved state. This prevents the customer side from
  // showing 0% / KYC not submitted after an admin has already approved the KYC.
  if (String(inquiry.kycStatus || "").toLowerCase() === "verified") {
    profileLike.kycStatus = "verified";
    profileLike.profileCompletion = 100;
    profileLike.verifiedAt = inquiry.verifiedAt || inquiry.updatedAt || new Date();
  }

  Object.keys(profileLike).forEach((key) => {
    if (profileLike[key] === undefined) delete profileLike[key];
  });

  return profileLike;
};

export const findLatestInquiryForUser = async (user) => {
  const identityFilter = buildIdentityFilter(user || {});
  if (!identityFilter) return null;

  return LoanInquiry.findOne(identityFilter).sort({ updatedAt: -1, createdAt: -1 });
};

export const syncInquiryToCustomerProfile = async (inquiry, options = {}) => {
  if (!inquiry) return null;

  const doc = inquiry.toObject ? inquiry : await LoanInquiry.findById(inquiry._id || inquiry);
  if (!doc) return null;

  let user = options.user || null;
  if (!user) {
    const identityFilter = buildIdentityFilter({ email: doc.email, phone: doc.phone });
    user = identityFilter ? await User.findOne(identityFilter) : null;
  }

  if (!user) return null;

  const profileFields = mapInquiryToProfileFields(doc, user);
  const profile = await UserProfile.findOneAndUpdate(
    { userId: user._id },
    {
      $set: profileFields,
      $setOnInsert: { userId: user._id },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return profile;
};

export const syncLatestInquiryToCustomerProfile = async (user) => {
  if (!user) return null;
  const inquiry = await findLatestInquiryForUser(user);
  if (!inquiry) return null;
  return syncInquiryToCustomerProfile(inquiry, { user });
};

export const buildCustomerIdentityFilter = buildIdentityFilter;
