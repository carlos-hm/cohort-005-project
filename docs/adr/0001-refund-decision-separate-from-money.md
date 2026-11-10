# Approving a Refund Request records a decision, not a payment

Cadence has no payment provider yet, but Support Staff need to approve and decline Refund Requests now. We decided that approving only records the decision: the request becomes approved, `amountRefunded` is set to the full `amountPaid`, and the learner loses access to the course. No money moves, and nothing tracks whether the money was sent. `amountRefunded` is the amount Cadence has committed to return, not proof that it was returned. A Refund is always the full amount paid. Partial refunds are deliberately not supported.

## Considered Options

- **Decision only (chosen).** This unblocks Support Staff now and keeps the decision separate from the payment, so a payment that later fails never reverses an approval.
- **Decision plus manual "mark as Issued/Failed".** Rejected for now. Without a provider it would just record what staff claim happened outside the app.
- **Wait for a payment provider.** Rejected. Learners would stay stuck with Open Refund Requests.

## Consequences

- When a payment provider is added, it should hang Pending, Issued and Failed Refunds off an Approved Refund Request rather than change how approval works. A failed payment leaves the request approved.
- Until then, "approved" doesn't mean the learner has their money. Anyone reading `amountRefunded` (reports, analytics) must not treat it as cash that has gone out.
