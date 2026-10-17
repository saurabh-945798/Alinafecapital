import { ApiError } from "../utils/ApiError.js";
import { findProhibitedCardData } from "../utils/paymentSecurity.js";

/**
 * Prevents accidental submission of cardholder data to Alinafe Capital backend.
 * Card details must be captured only by Mastercard's browser-side payment session.
 */
export const rejectCardholderData = (req, _res, next) => {
  const findings = findProhibitedCardData(req.body || {});
  if (findings.length) {
    return next(
      new ApiError(
        400,
        "Card details must not be sent to Alinafe Capital. Please enter them only on the secure card payment form and try again.",
        "CARD_DATA_NOT_ALLOWED",
        {
          blockedFields: findings.slice(0, 10),
          policy: "Do not send cardNumber, CVV, expiry, cardholderName, sourceOfFunds or full PAN values to backend APIs.",
        }
      )
    );
  }
  return next();
};
