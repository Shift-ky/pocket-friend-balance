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
- The index dashboard owns financial summaries and finance/Moto history management; finance and Moto routes contain entry forms only, keeping existing payment and permission rules unchanged.
- Grocery insertion paths share the finalized-purchase price selector; historical unit prices are derived from group-scoped purchase history to avoid duplicating price storage.
- Installments use a shared pure helper and bulk insert preserving cents, monthly dates and selected payment status; gasoline remains a single paid entry.
- Account administration and delegation use authenticated server functions that revalidate the owner's immutable identity and verified email before listing accounts or privileged writes; the navigation uses the same owner-access check, while user_roles admin checks remain separate for financial permissions to prevent delegated privilege escalation.
- Module access is stored separately from roles, enforced by restrictive RLS and shared presentation filtering; owner-only server functions update permissions, and user-scoped polling plus realtime removes revoked views without deleting shared records.
- Purchase-to-stock and stock-to-shopping synchronization run through database triggers so automatic consistency does not depend on the acting user's visibility of the destination module; page code must not duplicate those side effects.
- Stock name corrections propagate atomically to group-matched current shopping items through a separate rename trigger, preserving quantities, prices, checked state and historical purchases; conflicting names are rejected rather than merged.
- Stock drag ordering uses a nullable position column and an atomic security-invoker RPC scoped to the group under existing RLS; quantity synchronization remains independent of ordering.
- Stale dynamic-import failures recover through one session-throttled document reload; other errors retain the normal boundary and repeated asset failures must not loop.
- Personal appearance uses owner-only RLS, private user-folder storage, signed images, bounded opacity and validated semantic colors; dashboard surfaces stay solid and financial logic remains unchanged.
- Stock divisions are group-owned and use the stock module's access rules; a composite foreign key forbids cross-group assignments and deletion retains products, while sorting within divisions preserves the complete shared order.
- Stock registration uses the shared insertion helper; existing divisions change only when explicitly selected.
- Signed-out login styling is scoped to its own semantic tokens and bundled photography; preserve the existing authentication handlers and keep personal appearance isolated to signed-in accounts.
- Welcome runs only after explicit password sign-in; its isolated timer preserves auth and group loading.
- Offline group CRUD goes through a separate IndexedDB journal partitioned by authenticated user and group; the generated client stays intact, and a security-invoker RPC atomically validates current RLS, checks changed-field conflicts and records idempotent operation receipts.
- The offline sync RPC keeps a per-table whitelist of writable columns; whenever a new column is added to an offline-synced table (lancamentos, moto_despesas, feira_itens, feira_historico, estoque, estoque_divisoes, despesas), the whitelist must be updated in the same migration or queued changes fail with "Campos inválidos".
- Grocery finalization journals finance, removal of fully purchased rows only for paid purchases, reset of retained purchased rows, and purchase history atomically; unbought rows survive and stock triggers remain authoritative for deficit quantities.
- Offline shell caching uses generateSW with NetworkFirst navigations and a single preview-safe registrar; auth, account administration and image uploads remain online-only, and cached access is presentation-only, never server authorization.
- The offline fallback is TanStack's prerendered public SPA shell; group gates must remain effect-driven so cached navigation HTML contains no private data, and PWA output targets the deployed client-assets directory.
- Recurring schedules use group/module RLS and offline journaling; a restricted generator runs on changes and one daily SQL job. Monthly receipts prevent duplicates even after entry deletion; edits never rewrite generated entries. Dates clamp to month-end in the Brazilian business timezone.
- Telegram is online-only with expiring one-use account binding and current group/finance checks. Private documents enter a user-owned queue; only the atomic authenticated approval RPC creates debits. Scheduled extraction persists AI denial pauses and never automatically replays failed reads.
- Telegram receipt products use a separate atomic, idempotent reviewed import into one destination, enforcing its current module access; stock triggers remain authoritative and product imports never create financial entries or purchase history.
