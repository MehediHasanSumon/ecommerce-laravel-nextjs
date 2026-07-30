# IP Blocking Management Database Design

## Compatibility

The schema is implemented by
`database/migrations/2026_07_30_000001_create_ip_blocking_tables.php`.
It uses portable Laravel column types and avoids database-native ENUM and INET
types, so the same migration works with MySQL, PostgreSQL, and the SQLite test
environment.

All addresses are normalized by `App\Support\Security\IpAddress` before
storage. IPv4-mapped IPv6 values are converted to IPv4, IPv6 is compressed and
lowercase, and zone identifiers are rejected.

## Tables

### `security_settings`

Singleton automatic-block configuration keyed by the unique `scope=global`
value. It stores thresholds for login, password reset, OTP, registration, API,
checkout, contact, invalid authentication, payment failure, 404, and bot
activity, plus the time window, temporary duration, and permanent threshold.

### `ip_access_rules`

Normalized IPv4, IPv6, or CIDR whitelist and blacklist entries. A unique
address/network constraint prevents duplicate and conflicting rows under
concurrent writes. The application also rejects the same normalized network in
both lists.

### `security_trusted_proxies`

Normalized trusted proxy CIDRs and optional labels. Forwarded headers are
ignored unless the direct peer belongs to one of these networks or an
environment-configured trusted network.

### `ip_blocks`

Current state for one canonical IP address:

- unique canonical `ip_address`
- `ip_version`, `type`, `status`, `reason`, and notes
- `blocked_at`, nullable `expires_at`, and `last_activity_at`
- re-block counter
- optional country, city, ISP, user-agent, device, browser, and OS metadata
- creator and updater user references
- timestamps and soft deletion

Composite indexes support active expiry checks, type/status filters, country
and reason reporting, activity ordering, and stable newest/oldest pagination.
The middleware always verifies both `status=active` and the expiry timestamp,
so a delayed maintenance job cannot extend a restriction.

### `ip_block_events`

Append-only audit history with immutable IP, type, reason, actor snapshots,
request correlation ID, sanitized JSON metadata, and microsecond event time.
The block foreign key is nullable so history remains available after a current
record is deleted.

### `security_attempts`

Retention-controlled security evidence for suspicious events. High-volume API
and bot counters remain in atomic cache; database telemetry is retained for
security events and threshold crossings. Identifier and user-agent values are
stored as hashes rather than raw credentials.

## Request-Time Query Shape

Normal requests use one cache key derived from the canonical IP. Positive and
negative results are cached. On a miss, the service checks cached access rules
and performs an indexed exact lookup against `ip_blocks`. Writes invalidate
the affected cache key only after the transaction commits.

Blacklist rules always block. Whitelist rules bypass automatic blocks and
automatic counters, while an explicit manual block still applies. Loopback
addresses always bypass blocking.

## Concurrency and Retention

Block, re-block, update, and automatic-block operations use transactions and
row locks. The unique IP constraint remains the final race guard. Audit rows
are written in the same transaction as state changes.

`security:maintain-ip-blocking` marks naturally expired rows inactive, records
expiry events, invalidates cache after commit, and deletes old attempt
telemetry in bounded primary-key batches. The scheduler runs it once per
minute with overlap protection.
