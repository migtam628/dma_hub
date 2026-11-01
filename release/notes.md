# DMA Hub v0.2.0-alpha.27

**Private authenticated Support Center and staff ticket queue. No hosted public support backend or notification delivery.**

## New in alpha.27

- SQLite schema v17: persist customer-owned support tickets, versioned status transitions, immutable messages and immutable event history with audit records.
- Customer **Support** workspace now supports creating categorized real API tickets, viewing only their own records and private thread, and posting new replies.
- **Admin → Support Tickets** provides a real operator queue, private thread viewing, replies, and versioned workflow states (awaiting staff/customer, resolved, closed).
- Server enforces identity and role scoping, returns 404 for other customers' ticket IDs, checks If-Match versions for replies and status changes, validates body lengths, caps active tickets and message counts, and refuses replies to closed tickets.
- Tests verify authorized and unauthorized access, state transitions, stale version conflicts, closure, private thread isolation, and append-only audit/message integrity.
- Readable responsive thread/admin UI, database backup migration coverage, README/API documentation and roadmap updated.

## Deployment and limitations

This is a **local, opt-in Node.js + SQLite API**; GitHub Pages remains static and cannot accept authenticated support requests by itself. Customer data stays in the configured API database, and no email, Discord, attachments, phone notifications, guaranteed 24/7 staffing, or response-time SLA is configured.

Release assets: static web ZIP/checksum, followed by an independently built and verified **unsigned** Windows preview installer/checksum.

No functional game cheat software, independent game/hardware compatibility certification, approved customer software distribution, commercial licensing or verified production payment fulfillment is included.

See [local API and support endpoints](docs/api.md), [project roadmap](docs/project-roadmap.md), and [setup planner](https://dma.moobee.lol/#/setup).
