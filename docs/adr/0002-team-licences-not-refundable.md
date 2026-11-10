# Team Licences can't be refunded through a Refund Request

A Team Licence stores one `amountPaid` for all its seats, and seats can be claimed by other learners while a Refund Request is open. A full refund would leave claimed seats working after the money came back. A partial refund (unclaimed seats × price per seat) would break the rule that a Refund is always the full amount paid (see ADR-0001). It would also need a seat count on purchases and a way for a Team admin who isn't enrolled to ask, and the `/team` page has no UI for either. So learners can't raise Refund Requests on Team Licence purchases at all, and Team refunds are handled outside the app.

## Considered Options

- **Block Team Licence refunds (chosen).** Small, safe, and leaves no window for a refunded Team to keep usable seats.
- **Full refund only while no seat is claimed, voiding every seat on approval.** This was the old rule. Rejected because a seat could be claimed between request and decision, and Team admins usually aren't enrolled, so they couldn't reach the button anyway.
- **Partial refund for unclaimed seats.** Rejected for now as its own feature. It's the likely way forward if Teams need self-serve refunds.
