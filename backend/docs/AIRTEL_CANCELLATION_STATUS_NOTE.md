# Airtel Cancelled/Declined Prompt Handling

Airtel may return a successful HTTP response when a collection request is created, but that is only initiation. It is not payment confirmation.

This patch improves status parsing so that customer-side cancellations, declined prompts, expired prompts, insufficient funds, timeout, or other failure messages are treated as unsuccessful outcomes.

Correct flow:

```text
Send Airtel prompt -> Pending
Customer approves and Airtel confirms success -> Paid and balance updates
Customer cancels/declines/expires -> Not successful and balance remains unchanged
```
