# Lovira Interaction Automation Test Report

- **Started:** 2026-08-29T11:44:13.085Z
- **Finished:** 2026-08-29T11:44:26.936Z
- **Executed tests:** 159
- **Passed:** 159
- **Failed:** 0
- **Skipped:** 0
- **Weighted suitability score:** **100/100**
- **Grade:** **EXCELLENT**
- **P0 failures:** **0**

## Scoring policy

- P0 = weight 5: safety, consent, wrong-session/context mutation, destructive actions.
- P1 = weight 3: key UX/intent/context quality.
- P2 = weight 1: polish/type completeness.
- Any P0 failure prevents GOOD/EXCELLENT status.

## Category summary

| Category | Tests | Pass | Fail | Score |
|---|---:|---:|---:|---:|
| ai-fallback | 4 | 4 | 0 | 100% |
| callback-dependencies | 1 | 1 | 0 | 100% |
| clear-chat-pending | 1 | 1 | 0 | 100% |
| confirmation-safety | 15 | 15 | 0 | 100% |
| context-isolation | 3 | 3 | 0 | 100% |
| datetime | 3 | 3 | 0 | 100% |
| global-chat-memory | 2 | 2 | 0 | 100% |
| global-chat-ui | 1 | 1 | 0 | 100% |
| goal-extraction | 4 | 4 | 0 | 100% |
| intent-negative | 12 | 12 | 0 | 100% |
| intent-positive | 76 | 76 | 0 | 100% |
| life-event-routing | 12 | 12 | 0 | 100% |
| page-context | 1 | 1 | 0 | 100% |
| pending-scope | 1 | 1 | 0 | 100% |
| persistence | 4 | 4 | 0 | 100% |
| reminder-multiturn | 4 | 4 | 0 | 100% |
| reminder-target-safety | 4 | 4 | 0 | 100% |
| session-consent | 8 | 8 | 0 | 100% |
| session-consent-ui | 2 | 2 | 0 | 100% |
| validator-security | 1 | 1 | 0 | 100% |

## Failed tests

No failed tests.

## Required P0 acceptance scenarios

1. `Mai chú phải đi khám bệnh` must not create a session.
2. Selecting `Nhắc chú` must collect date, event time, and reminder lead time before CREATE_REMINDER.
3. Selecting `Hỗ trợ từng bước` must ask explicit confirmation before CREATE_SESSION.
4. `Không tạo`, `không xóa`, `không kết thúc`, `chưa hoàn thành` must never execute the destructive action.
5. Global Chat must not use an old LifeSession as semantic/action context.
6. Global Chat reminder creation must not attach to an unrelated old active session.
7. Global conversation history must be provided to AI fallback, not merely displayed/persisted in UI.
8. Persisted PendingInteraction must be scoped so it cannot intercept speech on an unrelated page/session.

## Recommended CI command

```bash
npx tsx scripts/test-lovira-interactions.ts
```

Recommended package.json entry:

```json
"test:interactions": "tsx scripts/test-lovira-interactions.ts"
```

Then make the project gate:

```json
"check": "npm run lint && npm run test:local-brain && npm run test:interactions && npm run build"
```
