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
- Financial installment creation uses a shared pure helper and one bulk insert into existing entries, preserving cent totals and calendar-month due dates without a separate installment schema.
- Financial debit creation passes the selected payment status through the shared installment helper to every generated entry; gasoline funding keeps its separate paid-entry rule.
- Account administration and delegation use authenticated server functions that revalidate the owner's immutable identity and verified email before listing accounts or privileged writes; the navigation uses the same owner-access check, while user_roles admin checks remain separate for financial permissions to prevent delegated privilege escalation.
- Module access is stored separately from roles, enforced by restrictive RLS and shared presentation filtering; owner-only server functions update permissions, and user-scoped polling plus realtime removes revoked views without deleting shared records.
- Purchase-to-stock and stock-to-shopping synchronization run through database triggers so automatic consistency does not depend on the acting user's visibility of the destination module; page code must not duplicate those side effects.
- Stock name corrections propagate atomically to group-matched current shopping items through a separate rename trigger, preserving quantities, prices, checked state and historical purchases; conflicting names are rejected rather than merged.
- Stock drag ordering uses a nullable position column and an atomic security-invoker RPC scoped to the group under existing RLS; quantity synchronization remains independent of ordering.
- Stale dynamic-import failures recover through one session-throttled document reload; other errors retain the normal boundary and repeated asset failures must not loop.
- Personal appearance is stored per authenticated user with owner-only RLS and private user-folder storage; signed images use the user's bounded opacity while dashboard information stays on solid surfaces.
- Custom appearance overrides use validated semantic color roles and a bounded photo opacity per user; data panels retain solid surfaces so personalization never changes financial logic or exposes another user's settings.
- Stock divisions are group-owned and use the stock module's access rules; a composite foreign key forbids cross-group assignments and deletion retains products, while sorting within divisions preserves the complete shared order.
- Manual stock registration passes an optional division through the shared stock insertion helper; existing products retain their division unless a new one is explicitly selected.
- Signed-out login styling is scoped to its own semantic tokens and bundled photography; preserve the existing authentication handlers and keep personal appearance isolated to signed-in accounts.
- The post-login welcome is triggered only by successful explicit password sign-in, not session restoration or token refresh; its isolated timer keeps authentication and group loading unchanged.
- Offline group CRUD goes through a separate IndexedDB journal partitioned by authenticated user and group; the generated client stays intact, and a security-invoker RPC atomically validates current RLS, checks changed-field conflicts and records idempotent operation receipts.
- Paid grocery finalization journals financial entry, snapshot deletion and purchase history as one transaction; database triggers remain the sole authoritative stock synchronization.
- Offline shell caching uses generateSW with NetworkFirst navigations and a single preview-safe registrar; auth, account administration and image uploads remain online-only, and cached access is presentation-only, never server authorization.
- The offline fallback is TanStack's prerendered public SPA shell; group gates must remain effect-driven so cached navigation HTML contains no private data, and PWA output targets the deployed client-assets directory.
