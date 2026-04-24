# Security Specification (TDD) for Gemini Chat Pro

## 1. Data Invariants
- A `User` profile can only be created and modified by the user themselves.
- A `Chat` can only be created, read, or modified by the owner (`userId`).
- A `Message` can only be added to a `Chat` by the chat's owner.
- `userId` and `ownerId` fields are immutable after creation.
- All timestamps must be validated against `request.time`.

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Identity Theft (Create User)**: Authenticated user `A` tries to create a `User` profile for user `B`.
2. **Profile Escalation**: User tries to update their `User` profile with a `role: 'admin'` field (if we had admins).
3. **Ghost Message**: User `A` tries to add a message to User `B`'s `Chat`.
4. **Chat Hijacking**: User `A` tries to read User `B`'s `Chat` details.
5. **Timestamp Fraud**: User tries to set `createdAt` to a date in the past.
6. **Immutable Field Mutiny**: User tries to change their `userId` in a `Chat` document.
7. **Malformed Message**: User tries to send a message with a 1MB content string (hitting size limits).
8. **Invalid Enum**: User tries to set `role` to `hacker` in a `Message`.
9. **Chat Scraping**: Authenticated user tries to `list` all chats without a `userId` filter matching their own UID.
10. **Shadow Field Injection**: User tries to `create` a chat with an extra hidden field `isBot: true`.
11. **Path variable Injection**: User tries to use a 1.5KB string as chat ID.
12. **Spam Creation**: User tries to create thousands of chats per second (though rules can only check per-request).

## 3. Test Runner (Draft)
A `firestore.rules.test.ts` would verify these scenarios by ensuring `PERMISSION_DENIED` is returned.
