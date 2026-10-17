# KYC Update and Repayment Schedule Actions

This patch makes two customer-side areas functional:

1. **Request KYC Update**
   - Verified customers are prompted before starting a KYC update.
   - When confirmed, the customer profile is reopened for updates.
   - The customer can update changed details or documents and submit them for admin review.
   - Customers should only use this when details or documents have changed.

2. **Repayment Schedule Actions**
   - Schedule data is loaded from the customer’s real loan account.
   - Pay buttons open the Repayments page for the selected account/installment.
   - Reminder preferences are interactive and saved locally on the device.
   - The schedule can be printed or saved as PDF using the browser print dialog.

The customer loan balance should still only update after card or Airtel Money repayment is confirmed as successful.
