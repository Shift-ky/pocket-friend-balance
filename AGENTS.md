<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Gasoline funding uses paid cash financial entries with a dedicated destination; Moto expenses live separately, so funding reduces available cash once and only actual expenses count as outflows on the panel.
- The index dashboard is analytical only; Finanças owns entry forms, pending accounts and monthly histories, while Carteiras manages balances and preserves the legacy Moto expense ledger.
- Grocery insertions share the finalized-purchase price selector; group purchase history supplies unit prices without duplicate storage.
- Installments use a shared pure helper and bulk insert preserving cents, monthly dates and selected payment status; gasoline remains a single paid entry.
- Account administration uses authenticated server functions revalidating owner identity and verified email; navigation shares that check. Financial user_roles checks stay separate to prevent delegated privilege escalation.
- Module access is stored separately from roles, enforced by restrictive RLS and shared presentation filtering; owner-only server functions update permissions, and user-scoped polling plus realtime removes revoked views without deleting shared records.
- Database triggers own purchase-to-stock and stock-to-shopping synchronization, independent of destination visibility; never duplicate these side effects in page code.
- A separate rename trigger atomically updates group-matched shopping names, preserving quantities, prices, checked state and history; reject conflicts rather than merge.
- Stock drag ordering uses a nullable position column and an atomic security-invoker RPC scoped to the group under existing RLS; quantity synchronization remains independent of ordering.
- Stale dynamic-import failures recover through one session-throttled document reload; other errors retain the normal boundary and repeated asset failures must not loop.
- Personal appearance uses owner-only RLS, private user-folder storage, signed images, bounded opacity and validated semantic colors; dashboard surfaces stay solid and financial logic remains unchanged.
- Stock divisions are group-owned and use the stock module's access rules; a composite foreign key forbids cross-group assignments and deletion retains products, while sorting within divisions preserves the complete shared order.
- Stock registration shares one insertion helper; change existing divisions only on explicit selection.
- Signed-out login styling is scoped to its own semantic tokens and bundled photography; preserve the existing authentication handlers and keep personal appearance isolated to signed-in accounts.
- Welcome follows explicit password sign-in only; its timer must not affect auth or group loading.
- Offline group CRUD goes through a separate IndexedDB journal partitioned by authenticated user and group; the generated client stays intact, and a security-invoker RPC atomically validates current RLS, checks changed-field conflicts and records idempotent operation receipts.
- Every new writable column on any offline-synced table must enter the sync RPC whitelist in the same migration; otherwise queued writes fail with "Campos inválidos".
- Grocery finalization journals finance, removal of fully purchased rows only for paid purchases, reset of retained purchased rows, and purchase history atomically; unbought rows survive and stock triggers remain authoritative for deficit quantities.
- Offline shell caching uses generateSW with NetworkFirst navigations and a single preview-safe registrar; auth, account administration and image uploads remain online-only, and cached access is presentation-only, never server authorization.
- The offline fallback is TanStack's prerendered public SPA shell; group gates must remain effect-driven so cached navigation HTML contains no private data, and PWA output targets the deployed client-assets directory.
- Recurring schedules use group/module RLS and offline journaling; a restricted generator runs on changes and one daily SQL job. Monthly receipts prevent duplicates even after entry deletion; edits never rewrite generated entries. Dates clamp to month-end in the Brazilian business timezone.
- Telegram is online-only with expiring one-use account binding and current group/finance checks. Private documents enter a user-owned queue; only the atomic authenticated approval RPC creates debits. Scheduled extraction persists AI denial pauses and never automatically replays failed reads.
- Telegram receipts use atomic owner approval for paid history, mapped/explicit-new stock and one debit; the purchase trigger alone adds stock and history supplies prices. Group-scoped De/Para links suggest mappings. Legacy imports remain isolated from full receipt approval.
- Telegram quick actions are service-role-only RPCs validating bound sender/chat and current modules; future boletos are cash pendencies, Moto creates only a Moto expense, and product receipts cannot bypass app review. Row locks prevent double approval.
- Mobile orb dragging is viewport-clamped and separate from clicks; never navigate or open menus while dragging.
- Dashboard histories share a pure monthly filter and newest-first creation timestamp ordering with Brazilian calendar dates and legacy date fallback; this filter stays independent of balances, analytical periods and pending due-date ordering.

- Wallets are additive group-owned records with nullable references on legacy entries; compatibility account keys and original permissions remain intact, and balances resolve legacy nulls without duplicating Moto funding.
- Internal transfers are paired journaled debits/credits validated by deferred database reconciliation; benefit, international and goal-linked wallets cannot transfer, and analytics exclude internal flows.
- Goals reference financial wallets and calculate suggested contributions from projected monthly financial surplus; automatic sources reject international and goal-linked wallets.
- Rates use authenticated functions, daily caching and Frankfurter; missing rates are excluded.
- Group history RPC edits launch/purchase wallets, never stock or private queue reads; Moto stays separate.
