# DMA Hub email verification and account recovery (local-development milestone)

## Behavior

Backend email tokens are 32 random bytes encoded as 43-character base64url codes, stored only as SHA-256 hashes with an account ID, purpose and expiry. Email-verification codes expire after 24 hours; password-reset codes after one hour. A successful reset invalidates all active sessions and outstanding account tokens, and records an audit event.

The public requests for verification resend and password recovery return the same generic response for both known and unknown email addresses. In-memory per-IP and per-email throttling is used for local testing. A deployed service needs distributed throttling, durable alerts and abuse monitoring.

New registrations require email verification only when `REQUIRE_EMAIL_VERIFICATION=1`. This mode **fails closed** unless the sender is configured. With verification disabled, existing local demo login behavior is retained, and accounts are not falsely marked verified. Password recovery is unavailable until email delivery is configured.

## Configure transactional email (server only)

Resend API is supported without an extra npm dependency. This is optional and must be configured by an operator with a verified sending domain, not hard-coded into the project.

```bash
export RESEND_API_KEY='your-secret-api-key'
export MAIL_FROM='DMA Hub <security@your-verified-domain.example>'
export REQUIRE_EMAIL_VERIFICATION=1
npm run dev:api
```

The server uses `POST https://api.resend.com/emails`, an Authorization bearer header, and a plain-text template. Codes are sent only by the backend and never logged. Do not put `RESEND_API_KEY` into a `VITE_*` variable, GitHub Pages, or a frontend build.

On a new registration, the API issues an email code. Paste that code into Account → Verify email. For password recovery, use Account → Forgot password and paste the received recovery code.

## Production requirements still open

- Email sending-domain verification and deliverability monitoring
- Abuse-aware distributed rate limits (currently in-memory only)
- Queueing/retries and consistent retry handling for failed provider delivery
- Database encrypted backup/restore drills for verification state and token tables
- TLS, secure reverse proxy, intrusion monitoring and independent security assessment
- Session hardening, identity policy, tested support and recovery flows

**GitHub Pages cannot host this API or provider secrets. This code is not approved for public account registration yet.**
