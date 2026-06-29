# Security Specification for Community Hero AI

This document outlines the security architecture, data invariants, and access control matrices for the Firestore database of the Community Hero AI application.

## 1. Data Invariants

### Civic Issues (`issues`)
- **Public Readability**: Anyone (guests, citizens, administrators) can read, list, and query reported issues to ensure high visibility.
- **Creation Validation**: A reported issue must have a title, description, category, latitude/longitude coordinates, and reporter details.
- **Identity Integrity**: If a user is authenticated via Firebase Auth (`request.auth != null`), their UID must match `reporterUid`. If they are using the client-side sandbox bypass (mock user), we allow creation to support full-feature interactive testing.
- **Status Progression**: Status fields are updated strictly by administrators. Upvoting is performed by citizens.

### Comments (`comments`)
- **Public Readability**: Anyone can read comments attached to civic issues.
- **Creation Verification**: A comment must link to a valid issue document ID, and if the user is authenticated via Firebase Auth, their UID must match `userId`.

---

## 2. The "Dirty Dozen" (Attack Vector Payloads)

Here are 12 specific payloads designed to challenge the access controls of the application and how our security rules block them:

1. **Unsigned User Creating Issue with Spoofed Admin Credentials**
   - *Attack*: Guest attempts to create an issue claiming to be a system admin.
   - *Defense*: Rules block the request or validate fields appropriately.

2. **Authenticated User Spoofing another Citizen's UID**
   - *Attack*: Authenticated user `user_A` sets `reporterUid` to `user_B`.
   - *Defense*: Checked via `request.auth.uid == incoming().reporterUid`.

3. **Field Injection (The "Ghost Field" Attack)**
   - *Attack*: User injects an unauthorized field `isApprovedByCity: true` inside an issue payload.
   - *Defense*: Checked via strict schema verification / `affectedKeys().hasOnly()`.

4. **Resource Poisoning (Overly Large IDs)**
   - *Attack*: User creates or updates a document using a 1MB string as the document ID.
   - *Defense*: Checked via `isValidId(id)`.

5. **Privilege Escalation via Status Hijacking**
   - *Attack*: A regular citizen attempts to mark their own reported issue as "resolved" or "under_review" directly.
   - *Defense*: Under `update`, changing the `status` or `statusHistory` requires administrative privilege.

6. **Spamming and Denial-of-Wallet (DOW) via Gigantic Text Fields**
   - *Attack*: Attacker inserts a 1MB text into `title` or `description`.
   - *Defense*: Enforce `.size() <= 200` on titles and `.size() <= 2000` on descriptions.

7. **Tampering with Immortal Fields**
   - *Attack*: User attempts to update `createdAt` or `reporterUid` after an issue is created.
   - *Defense*: Checked via `incoming().createdAt == existing().createdAt` and `incoming().reporterUid == existing().reporterUid`.

8. **Falsifying Timestamps**
   - *Attack*: Attacker provides a back-dated or future-dated `createdAt` timestamp.
   - *Defense*: Verified using `request.time` where appropriate (or validated as string sizes).

9. **Injecting Garbage Types**
   - *Attack*: Setting `latitude` coordinate as a Boolean value or a string.
   - *Defense*: Enforced strict `is number` type safety check.

10. **Spoofing Upvotes**
    - *Attack*: Citizen `user_A` modifies the `upvotes` array to add `user_B`'s UID or clear other votes.
    - *Defense*: Changing `upvotes` array must strictly limit changes to adding or removing the current user's UID.

11. **Orphaned Comments**
    - *Attack*: Creating a comment for a non-existent civic issue ID.
    - *Defense*: Checked using `exists(/databases/$(database)/documents/issues/$(incoming().issueId))`.

12. **Comment Content Poisoning**
    - *Attack*: Citizen attempts to update another citizen's comment or inject junk fields in it.
    - *Defense*: Comments are immutable after creation, or updates are strictly restricted to the original author with text validation.
