# Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Ownership**: A `/userSettings/{userId}` document can only be read, created, updated, or deleted by the authenticated, email-verified user whose `request.auth.uid == userId`.
2. **Master Gate for Snapshots**: A snapshot in `/userSettings/{userId}/snapshots/{snapshotId}` cannot be created, read by ID, or deleted unless the parent `/userSettings/{userId}` document exists and belongs to `request.auth.uid`.
3. **Zero Shadow Fields**: Both `UserSettings` and `UserSettingsSnapshot` strictly enforce `keys().hasAll(...)` and `keys().hasOnly(...)` on create, and `affectedKeys().hasOnly(...)` on update.
4. **Immutable Ownership & Timestamps**: `ownerId` and `createdAt` can never be changed after creation; `createdAt` (on create) and `updatedAt` (on create/update) must strictly equal `request.time`.
5. **Immutable Snapshots**: Exported snapshots are write-once backups (`allow update: if false`).
6. **Bounded Values**: Every string enforces `.size()` limits, enums match exact allowlists (`system|light|dark`, `teal|emerald|indigo|amber|rose`, `sm|md|lg|xl`, `ar|en|fr`), and `codeFontSize` is an integer in `[12, 20]`.
7. **Secure List Queries**: Listing `/userSettings` is completely forbidden (`allow list: if false`); listing `/userSettings/{userId}/snapshots` requires verified ownership and enforces `resource.data.ownerId == request.auth.uid` without `get()` lookups.

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Read**: `GET /userSettings/uid_alice` with `auth = null`.
2. **Unverified Email Write**: `CREATE /userSettings/uid_alice` with `auth.uid = 'uid_alice'`, `email_verified = false`.
3. **Cross-User Read**: `GET /userSettings/uid_alice` as `auth.uid = 'uid_bob'` (`email_verified = true`).
4. **Identity Spoofing on Create**: `CREATE /userSettings/uid_alice` as `uid_alice` with `{ ownerId: 'uid_bob', ... }`.
5. **Shadow Field Injection**: `CREATE /userSettings/uid_alice` with extra field `{ isAdmin: true, ... }`.
6. **Immutable Field Tampering**: `UPDATE /userSettings/uid_alice` attempting to modify `ownerId` or `createdAt`.
7. **Client-Spoofed Timestamp**: `CREATE /userSettings/uid_alice` with client-provided `createdAt` != `request.time`.
8. **Enum Value Poisoning**: `UPDATE /userSettings/uid_alice` with `{ accentTheme: 'hacked-color' }` or `{ fontSize: '999px' }`.
9. **Numeric Out-of-Bounds**: `UPDATE /userSettings/uid_alice` with `{ codeFontSize: 500 }` or `{ codeFontSize: '14' }`.
10. **ID Poisoning (Resource Exhaustion)**: `CREATE /userSettings/uid_alice/snapshots/<200-char-invalid-id!@#>` with oversized or illegal characters.
11. **Orphaned Snapshot Write**: `CREATE /userSettings/uid_alice/snapshots/snap1` when parent `/userSettings/uid_alice` does not exist.
12. **Snapshot Mutation & Blanket List**: `UPDATE /userSettings/uid_alice/snapshots/snap1` or `LIST /userSettings` as any user.
