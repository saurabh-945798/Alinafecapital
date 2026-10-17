# Alinafe Capital - Staff Role Assignment

Release date: 29 September 2026

This release adds multi-role access control so each staff account receives only the functions required for its approved job role(s). Existing single-role staff accounts remain compatible.

## Approved staff allocation

| Staff | Email | System roles |
|---|---|---|
| Moses Chirambo | moizmsanda@gmail.com | Super Administrator; Credit Authorizer |
| Billiat Chikalusa | billiatchikalusa@gmail.com | KYC Verification; Customer Service; Reporting & MIS |
| Kondwani Kadzakumanja | kondwanikadzakumanja2@gmail.com | KYC Verification; Customer Service |
| Emily Sikelo | emilysikelo@gmail.com | Loan Operations; Disbursement; Payment Verification; Reporting & MIS |
| John Kango | kangojohn2020@gmail.com | Risk Assessment; Collections & Recoveries |
| Precious Mkandawire | preciousmkandawire@gmail.com | Risk Assessment; Finance & Reconciliation |
| Akuzike Chidula | akuzikemalawi@gmail.com | Credit Approver only |
| Roselyn Milanzi | roselyncmchirambo@gmail.com | Disbursement; Payment Verification |
| Restock Tech | Configure `RESTOCK_TECH_SUPPORT_EMAIL` | Technical / System Support only |

## Important separation rule

Akuzike Chidula is deliberately **not** assigned Auditor access on the same account as Credit Approver. Auditor access is read-only and must be allocated to a separate independent staff account.

## Rights enforced by the system

- **Super Administrator:** staff roles/settings and broad administrative oversight.
- **KYC Verification:** identity/KYC review and the identity documents required for KYC; no credit approval, authorization or disbursement.
- **Loan Operations:** application processing and limited operational updates; no KYC verification, credit approval, authorization or disbursement authority.
- **Risk Assessment:** repayment/security/surety assessment and Risk Report functions; no credit approval or disbursement.
- **Credit Approver:** approval decision and decision pack; no authorization/disbursement rights unless separately assigned.
- **Credit Authorizer:** authorization of already-approved loans; cannot perform the original credit approval unless separately assigned.
- **Disbursement:** authorized disbursement information and actions; no KYC/risk/approval powers.
- **Payment Verification:** Bank POP/payment verification only; no loan approval/disbursement rights.
- **Finance & Reconciliation:** journal/reconciliation and finance review; no credit decision rights.
- **Collections & Recoveries:** overdue accounts and collection follow-up; no balance editing or credit approval.
- **Customer Service:** basic customer/application case information and complaints; no financial, KYC, risk or credit decision rights.
- **Reporting & MIS:** read-only analytics/reporting.
- **Auditor / Compliance:** read-only audit/decision information. Operational roles cannot be combined with Auditor.
- **Technical Support:** settings/technical support only; no customer financial or credit decisions.

Sensitive KYC documents are also checked at file-download level. Menu hiding alone is not used as the security control.

## Applying the role allocation

The supplied workbook contains emails but not the phone numbers and initial passwords required to create new users. The assignment script therefore updates **existing matching accounts only**. It does not create missing staff accounts.

From `backend/`:

```bash
npm run staff:roles
```

This is a dry run. It shows which accounts would be updated and which emails do not yet have an account.

After review, apply the approved allocation:

```bash
npm run staff:roles:apply
```

Role changes revoke the existing staff session. Affected users must sign in again before the new permissions take effect.

For the Restock Tech support account, set `RESTOCK_TECH_SUPPORT_EMAIL` in the private backend environment before applying roles.

## Creating missing accounts

Use **Admin > User Access** as Super Administrator. The new screen supports more than one role per staff account and blocks unsafe Auditor + operational-role combinations. Each new staff account still requires a valid phone number and strong initial password.
