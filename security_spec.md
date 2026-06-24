# Security Specification for TrackerNote

## 1. Data Invariants

* **SyncProject Invariant**: A project must have a valid non-empty `userId` matching the authenticated creator's UID. The fields must exactly conform to standard types.
* **SyncNote Invariant**: A note must contain a valid `projectId` and `userId` that belongs to the authenticated user. Notes cannot be created without a parent project owned by the same user.
* **UserProfile Invariant**: A user record (`/users/{uid}`) must have a `username` string and `email` string, with the `uid` matching the document key and `request.auth.uid`.
* **Username Selection Invariant**: A record in `/usernames/{username}` must map to the exact `uid` of the authenticated user. Only one mapping is allowed, preventing dual mapping.

---

## 2. The "Dirty Dozen" Hack Payloads (Vulnerability Scenarios)

These payloads represents unauthorized malicious requests that are strictly blocked by the security guards (Permission Denied).

1. **Identity Spoofing on Projects**: authenticated user attempts to write a project with `userId` of a different user.
2. **Identity Spoofing on Notes**: authenticated user attempts to write a note with `userId` of a different user.
3. **Ghost Project Creation**: anonymous/unauthenticated client attempts to create a project document without an auth token.
4. **Project Hijacking (Update)**: user `A` attempts to modify projects belonging to user `B`.
5. **Orphaned Note Insert**: creating a note for a `projectId` that does not exist or belongs to another user.
6. **Self-Appointed Role / Privilege Escalation**: trying to inject fields like `isAdmin: true` into own user profile.
7. **Username Squatting / Hijacking**: user `A` attempts to create or update `usernames/{usernameB}` with user `A`'s UID to steal an existing username.
8. **Shadow Field Injection**: creating a user profile with extra unexpected properties (e.g. `isVerified: true`).
9. **Junk Username Path-Injection**: attempting to register a username with malicious long strings (`/usernames/super_long_junk_character_malicious_exploit`).
10. **Query Scrape (Unrestricted Client Lists)**: querying `/syncProjects` without filter bounds (`allow list: if isSignedIn()`).
11. **Bypassing Immutable Dates**: attempt to update a project's `createdAt` time.
12. **Malicious Empty Fields**: creating a project or note with empty title/content but valid field structure.

---

## 3. Test Cases Check

We enforce that all security rules validate:
* Authentication check (`request.auth != null`).
* Identity matching (`resource.data.userId == request.auth.uid`).
* Strict validation structures (`isValid[Entity]` helpers).
* No unbounded string reads or shadow updates.
* Path variable size boundaries.
