# Airtel Money Repayment Confirmation Rule

Airtel Money collection initiation can return HTTP `201` and a success-style API message before the customer has approved the prompt on the phone. This means the prompt/request was accepted by Airtel, not that the loan repayment has been paid.

## System rule

Loan balance and repayment schedule must update only after one of these confirms the payment:

- Airtel status check returns a transaction-level paid/success status.
- Airtel callback returns a transaction-level paid/success status.

The system must not reduce the loan balance immediately after `/merchant/v1/payments/` returns `201`.

## Repair command

If old tests accidentally reduced balances before customer approval, run:

```powershell
npm run airtel:repair-pending
```

This removes repayment entries linked to Airtel payments that are still `INITIATED`, `PENDING`, `FAILED`, `CANCELLED`, `UNKNOWN`, or were marked `PAID` from initiation only without a status/callback confirmation.
