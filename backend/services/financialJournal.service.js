import { FinancialJournal } from "../models/FinancialJournal.model.js";

export const postRepaymentJournal = async ({
  loanAccount,
  userId = null,
  sourceType,
  sourceId,
  reference = "",
  amount,
  actor = null,
  metadata = {},
}) => {
  const journalKey = `REPAYMENT:${sourceType}:${String(sourceId)}`;
  return FinancialJournal.findOneAndUpdate(
    { journalKey },
    {
      $setOnInsert: {
        journalKey,
        entryType: "REPAYMENT",
        loanAccountId: loanAccount._id,
        userId: userId || loanAccount.userId || null,
        sourceType,
        sourceId: String(sourceId),
        reference,
        amount: Number(amount || 0),
        currency: "MWK",
        description: `Loan repayment received via ${sourceType}`,
        postedBy: actor?._id || null,
        postedByName: actor?.fullName || actor?.email || "",
        postedAt: new Date(),
        metadata,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};
