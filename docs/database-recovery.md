# Database migrations, backup and recovery — DMA Hub API

**Scope:** Local-development Node.js/SQLite service, schema version 3. This is an implemented recoverability foundation, **not** a production backup service.

## Migrations

The API now runs transactional SQLite `PRAGMA user_version` migrations at startup, preserving existing users, sessions, audit records and configuration profiles. Version 1 describes the original schema; version 2 adds `users.disabled_at` to support revoking access for disabled accounts; version 3 adds `users.email_verified_at` and hashed, expiring one-time verification/recovery tokens. Login and session lookups reject disabled accounts. There is no public endpoint for disabling accounts.

Unknown future versions, invalid table structures and failed migrations stop startup rather than resetting the database. Never downgrade by modifying `user_version` manually.

## Consistent backups

Use a Node.js version that supports `node:sqlite.backup()` (Node 22.16+). **Keep backups outside the repository and web-serving directories.**

```bash
# Start from a real local SQLite database created by the API
node apps/api/src/maintenance.mjs backup ./apps/api/data/dma-hub.sqlite ./backups/dma-hub-2026-10-27.sqlite
node apps/api/src/maintenance.mjs verify ./backups/dma-hub-2026-10-27.sqlite
```

The backup command uses SQLite's online backup API, verifies database integrity and schema, writes through a private temporary directory, limits file permissions to owner read/write, then atomically links the finished backup to its final name. It **refuses overwriting** a backup. A missing destination parent directory is an error; create the directory yourself with restricted permissions.

## Restore drill

1. Stop the API and prevent any concurrent writers. Confirm the backup is from a trusted source.
2. Run `verify` against the snapshot.
3. Copy the snapshot into a **new, empty** database path outside the live API directory.
4. Start the API against that copy (e.g. with `DB_PATH`) and verify user and profile records without exposing sensitive values.
5. For production recovery, plan maintenance downtime and safely retire/retain the old database and any WAL/SHM files; do not overwrite a running database.

CI tests perform this drill on a temporary SQLite database and verify that records survive migration, backup and restoration.

## Remaining production gates

- Encrypted off-host scheduled backups, retention and secret management
- Automated restore drills, recovery time and recovery point targets
- Managed database service and distributed rate limits
- Registration email verification, password recovery and operational alerting
- Documented rollback and disaster-recovery procedures
