import slugify from "slugify";
import { LoanProduct } from "../models/LoanProduct.model.js";
import { ApiError } from "../utils/ApiError.js";

const makeSlug = (input) =>
  slugify(String(input), { lower: true, strict: true, trim: true });

export const loanProductService = {
  async create(payload) {
    // Business validations
    if (payload.maxAmount < payload.minAmount) {
      throw new ApiError(400, "maxAmount must be >= minAmount", "INVALID_RANGE");
    }
    if (payload.maxTenureMonths < payload.minTenureMonths) {
      throw new ApiError(400, "maxTenureMonths must be >= minTenureMonths", "INVALID_RANGE");
    }

    const slug = makeSlug(payload.slug || payload.name);

    const exists = await LoanProduct.findOne({ slug }).lean();
    if (exists) throw new ApiError(409, "Loan product slug already exists", "DUPLICATE_SLUG");

    const created = await LoanProduct.create({ ...payload, slug });
    return created;
  },

  async listPublic(query) {
    const filter = {};

    // default active only
    const status = query.status || "active";
    filter.status = status;

    if (query.featured === "true") filter.featured = true;
    if (query.featured === "false") filter.featured = false;

    // Optional range filters: minAmount<=x, maxAmount>=y style
    // We support: amount=xxx -> product where minAmount<=amount<=maxAmount
    if (query.amount) {
      const amount = Number(query.amount);
      if (!Number.isNaN(amount)) {
        filter.minAmount = { $lte: amount };
        filter.maxAmount = { $gte: amount };
      }
    }

    const items = await LoanProduct.find(filter)
      .sort({ featured: -1, createdAt: -1 })
      .lean();

    return items;
  },

  async getBySlugPublic(slug) {
    const item = await LoanProduct.findOne({ slug: String(slug).toLowerCase(), status: "active" }).lean();
    if (!item) throw new ApiError(404, "Loan product not found", "NOT_FOUND");
    return item;
  },

  async adminListAll(query = {}) {
    const includeInactive = String(query.includeInactive || "").toLowerCase() === "true";
    const filter = includeInactive ? {} : { status: { $ne: "inactive" } };

    if (query.status) {
      filter.status = String(query.status);
    }

    return LoanProduct.find(filter).sort({ createdAt: -1 }).lean();
  },

  async adminGetById(id) {
    const item = await LoanProduct.findById(id);
    if (!item) throw new ApiError(404, "Loan product not found", "NOT_FOUND");
    return item;
  },

  async adminUpdate(id, payload) {
    // If name/slug changes, regenerate slug safely
    if (payload.name && !payload.slug) {
      payload.slug = makeSlug(payload.name);
    }
    if (payload.slug) payload.slug = makeSlug(payload.slug);

    if (payload.minAmount != null && payload.maxAmount != null) {
      if (payload.maxAmount < payload.minAmount) {
        throw new ApiError(400, "maxAmount must be >= minAmount", "INVALID_RANGE");
      }
    }
    if (payload.minTenureMonths != null && payload.maxTenureMonths != null) {
      if (payload.maxTenureMonths < payload.minTenureMonths) {
        throw new ApiError(400, "maxTenureMonths must be >= minTenureMonths", "INVALID_RANGE");
      }
    }

    // If slug provided, ensure uniqueness
    if (payload.slug) {
      const exists = await LoanProduct.findOne({ slug: payload.slug, _id: { $ne: id } }).lean();
      if (exists) throw new ApiError(409, "Loan product slug already exists", "DUPLICATE_SLUG");
    }

    const updated = await LoanProduct.findByIdAndUpdate(id, payload, {
      returnDocument: "after",
    });
    if (!updated) throw new ApiError(404, "Loan product not found", "NOT_FOUND");
    return updated;
  },

  async adminSoftDelete(id) {
    const updated = await LoanProduct.findByIdAndUpdate(
      id,
      { status: "inactive" },
      { returnDocument: "after" }
    );
    if (!updated) throw new ApiError(404, "Loan product not found", "NOT_FOUND");
    return updated;
  },
};
