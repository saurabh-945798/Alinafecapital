import UserProfile from "../models/UserProfile.js";

const toPublicProfile = (profile) => {
  if (!profile) return null;
  const obj = profile.toObject ? profile.toObject() : profile;
  return {
    ...obj,
    documents: (obj.documents || []).map((d) => ({
      type: d.type,
      fileUrl: d.fileUrl,
      mime: d.mime,
      uploadedAt: d.uploadedAt,
    })),
  };
};

export async function listKyc(req, res, next) {
  try {
    res.set("Cache-Control", "no-store");

    const status = req.query.status ? String(req.query.status).trim() : "pending";
    const q = String(req.query.q || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const filter = {};
    if (status && status !== "all") filter.kycStatus = status;
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = { $regex: safe, $options: "i" };
      filter.$or = [{ fullName: rx }, { email: rx }, { phone: rx }, { district: rx }];
    }

    const [total, docs] = await Promise.all([
      UserProfile.countDocuments(filter),
      UserProfile.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    ]);
    const items = docs.map(toPublicProfile);

    return res.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function verifyKyc(req, res, next) {
  try {
    const { userId } = req.params;
    const profile = await UserProfile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
        code: "NOT_FOUND",
      });
    }

    profile.kycStatus = "verified";
    profile.kycRemarks = "";
    profile.verifiedAt = new Date();
    profile.rejectedAt = null;
    await profile.save();

    return res.json({
      success: true,
      data: toPublicProfile(profile),
    });
  } catch (error) {
    return next(error);
  }
}

export async function rejectKyc(req, res, next) {
  try {
    const { userId } = req.params;
    const remarks = String(req.body.remarks || "").trim().slice(0, 500);

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
        code: "NOT_FOUND",
      });
    }

    profile.kycStatus = "rejected";
    profile.kycRemarks = remarks;
    profile.rejectedAt = new Date();
    profile.verifiedAt = null;
    await profile.save();

    return res.json({
      success: true,
      data: toPublicProfile(profile),
    });
  } catch (error) {
    return next(error);
  }
}
