# Alinafe Capital - Sanitized Update Package

Release date: 29 September 2026

This package contains the current Alinafe Capital customer portal, admin portal and backend source with the September 29 staff-role and access-control update.

## September 29 staff role / limited-access update

- Added true multi-role staff access while retaining compatibility with existing single-role accounts.
- Added restricted roles for Loan Operations, Finance & Reconciliation, Collections & Recoveries, Customer Service, Reporting & MIS, and Technical Support.
- Added a Super Admin User Access screen that can assign multiple approved roles to one staff account.
- Auditor access is enforced as read-only and cannot be combined with operational roles (except read-only Reporting/MIS).
- Application, customer, account, finance, payment, complaint, report and KYC routes now enforce role access on the backend.
- Sensitive application fields are filtered by role before responses are returned. Customer Service, KYC, Risk, Loan Operations and Disbursement users no longer receive the same full record.
- KYC/document downloads are checked by role and document type, rather than relying only on hidden menu items.
- Application detail editing is limited to Super Admin; KYC document replacement/removal is limited to Super Admin/KYC Verifier.
- Payment Verification, manual finance posting, Risk Assessment, audit access and technical settings are separated by role.
- Added an approved staff-role assignment script based on the supplied Alinafe Capital staff emails. It is dry-run by default and updates existing accounts only when explicitly run with `--apply`.
- Akuzike Chidula is assigned Credit Approver only; Auditor must be assigned to a separate independent account.
- Added `STAFF_ROLE_ASSIGNMENT_README.md` with the approved mapping and deployment commands.

## September 16 loan product, overdue and UI update

- Processing Fee fixed at **2.5%** and charged once at loan commencement.
- Administration Fee fixed at **2.5%** and charged once at loan commencement; it no longer recurs monthly.
- Added an automatic **15% overdue penalty** when a scheduled installment passes its due date without being fully cleared. The penalty is applied once to the unpaid scheduled amount and does not compound on itself.
- Customer repayment totals and Admin account views now show penalty interest separately and include it in the outstanding amount.
- Enhanced the repayment schedule List View with clearer principal, interest, fees, paid amount, outstanding amount and overdue-penalty indicators.
- Apply for a New Loan now returns to the Customer Dashboard when Back to Dashboard is selected.
- Customer and Admin dashboards received subtle Alinafe-brand colour refinements without changing the approved layout.
- Profile Completion and KYC Status are now presented as separate functions: profile completion covers customer details, while KYC Status tracks identity-verification review.
- Admin Loan Products now formats Minimum Amount and Maximum Amount with comma separators and two decimals and uses higher-visibility input styling.
- Loan Product pages and the interactive calculator clearly state that Processing and Administration fees are one-time charges.
- Added `LOAN_PRODUCT_POLICY_MANUAL_NOTE.md` to document the fee and overdue policy for the operating manual/UAT reference.

## September 15 customer-data and homepage image hotfix

- Fixed the case where a customer could see a repayment Loan Account but not see the matching disbursed item under My Applications.
- My Applications now resolves applications through the linked Loan Account/inquiry relationship and shows an Open Loan Account action.
- Fixed the verified-KYC/profile-completion inconsistency that could show KYC Not Submitted / 0% for a customer who already has a properly verified disbursed loan.
- Prevented verified KYC from being silently downgraded by a newer incomplete inquiry unless the customer deliberately starts a KYC update.
- New disbursements now link the Loan Account to the matching portal user where possible.
- Replaced the broken externally hosted Local Support hero image with a packaged local image and added a local fallback for any hero image that fails to load.

## Main updates in this release

- Full Risk Assessment Team workflow with configurable 100-point scoring and formal recommendations.
- Risk Analyst, Payment Verifier and Auditor access roles.
- Improved Admin Applications visibility with role-based access to loan information.
- Bank Payment option using National Bank account 1006477832 / Alinafe Online Limited.
- National Bank logo integrated into the customer repayment screen.
- Mandatory Proof of Payment (POP) upload for bank payments.
- Finance verification, rejection and clarification workflow for bank payments.
- Loan balances update only after an authorised bank-payment verification.
- Duplicate bank-payment protection plus Financial Journal and Audit Trail recording.
- Controlled customer and admin overdue-payment alerts.
- Stronger customer/staff password requirements and password guidance.
- Customer/KYC/Application/Loan/Repayment relationship corrections to prevent inconsistent dashboard information.

## Included

- `frontend/` - customer website/dashboard
- `admin/` - staff/admin portal
- `backend/` - API, database models, payment logic, risk assessment, KYC/document protection, audit/finance modules and tests
- `.env.example` files - safe setup templates only

## Deliberately excluded

- `.git` history
- `node_modules`
- live `.env` files and credentials
- uploaded KYC/POP/customer documents
- customer CSV exports
- logs and caches
- `dist` / build output

## Setup after extraction

Run separately inside `backend`, `frontend` and `admin`:

```bash
npm ci
```

Create the required private `.env` files from the supplied `.env.example` templates.

Start the backend:

```bash
npm start
```

Build the customer and admin portals:

```bash
npm run build
```

## Validation completed

- 123 backend JavaScript files passed syntax checks.
- Financial and risk regression tests passed 9/9.
- 39 customer/admin `.js` files passed Node syntax checks.
- 126 customer/admin JavaScript/JSX files were included in the source review.
- 318 local customer/admin import paths were checked with no missing project files.
- Package manifests and lockfiles match in all three applications.
- Final privacy scan found no live environment files, private keys or embedded database passwords in the release source.

## Final deployment note

The validation environment could not complete a clean frontend package installation because package retrieval timed out. Therefore run `npm ci` and `npm run build` on the actual test/deployment computer before live deployment. This package is the sanitized source release for that final local/UAT stage.
