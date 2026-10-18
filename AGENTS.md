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
- Account administration and delegation use authenticated server functions that revalidate the owner's immutable identity and verified email before listing accounts or privileged writes; the navigation uses the same owner-access check, while user_roles admin checks remain separate for financial permissions to prevent delegated privilege escalation.
