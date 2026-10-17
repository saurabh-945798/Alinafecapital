# Legacy Customer Migration, Repayment Schedule Audit and Airtel Status Rules

## Purpose

This patch supports Alinafe Capital customers who already went through the manual process before the customer portal was introduced. It links existing admin-side loan records to customer-side accounts so those customers can log in, view their loans, and use Card or Airtel Money repayments.

## Recommended migration approach

For existing manual customers, do not ask them to apply again. The safest approach is:

1. Keep the approved/disbursed admin-side loan account as the source record.
2. Match the customer using phone number and/or email address.
3. Create or link a customer portal account.
4. Mark the customer profile as KYC verified when the admin-side record is already verified/disbursed.
5. Link the loan account to the customer using `userId`, while still preserving phone/email matching.
6. Audit the repayment schedule before customer communication.
7. Give the customer login/reset instructions.

## Commands

Dry run first:

```powershell
cd .\AlinafeCapital\backend
npm run legacy:link-customers
```

Apply after reviewing the dry-run summary:

```powershell
npm run legacy:link-customers:apply
```

After applying, the script writes:

```text
backend/reports/legacy-customer-login-invites.csv
```

This file lists accounts that were created and temporary passwords where applicable. Treat this file as confidential.

## Repayment schedule audit

Run:

```powershell
npm run repayments:audit-schedules
```

This checks whether:

- Total outstanding balance matches the sum of unpaid instalments.
- The next repayment amount comes from the oldest unpaid instalment.
- Paid/partial/overdue/upcoming status is calculated clearly.

## Screenshot review note

From the screenshot alone, the visible schedule is internally consistent because there are 2 remaining instalments of MWK 120,000 each. That implies MWK 240,000 still due, provided the account outstanding balance is also MWK 240,000. The screenshot does not show original disbursed amount, rate, total repayment, or prior repayments, so it cannot independently prove that the schedule matches the original loan plan. Use `npm run repayments:audit-schedules` to confirm against the system's actual account values.

## Airtel cancellation rule

Airtel collection initiation only means a prompt was sent. It must not reduce a loan balance. A loan balance changes only when Airtel returns a confirmed successful transaction status.

If the customer cancels, declines, lets the prompt expire, or Airtel returns failure wording, the customer side must show the payment as not successful and keep the balance unchanged.
