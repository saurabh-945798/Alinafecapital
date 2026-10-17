# Alinafe Capital - Loan Product Fee and Overdue Policy

Effective for the current loan-product configuration.

## Loan product fees

- **Processing Fee: 2.5%** of the approved/disbursed principal.
- **Administration Fee: 2.5%** of the approved/disbursed principal.
- Both fees are **one-time charges at the beginning of the loan**.
- They must **not recur every month** and must not be repeatedly added by the loan calculator.
- The calculator remains interactive for loan amount, tenure and the configured normal interest rate. It includes the two one-time fees in the first repayment/total loan cost only.

## Overdue penalty

- A **15% overdue penalty** applies automatically when a scheduled installment passes its due date without being fully paid.
- The penalty is calculated once against the amount of that installment that was still unpaid at its due date.
- The penalty is **non-compounding**: the system does not charge another 15% penalty on top of a penalty already applied to the same installment.
- The penalty is shown separately as penalty interest and is also included in the customer's total outstanding amount.
- The repayment schedule, customer repayment screen and Admin account view show overdue penalties where they have been triggered.

## Total amount due

For an overdue loan, the amount outstanding may therefore include:

1. unpaid principal;
2. normal loan interest;
3. the one-time Processing Fee and Administration Fee where still unpaid; and
4. any applicable 15% overdue penalty.

This note documents the implemented system behaviour and should be reflected in customer-facing terms and the approved Alinafe Capital lending manual before production use.
