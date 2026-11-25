<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- `src/lib/supabase.ts` re-exports the integration-managed Supabase client so login, route guards, and bearer attachment share one session and preview storage.
- Profile functions query only the verified caller's profile with authenticated RLS; the owner dashboard revalidates its role on the server on every route load, without privileged clients.
- Keep the signed-in dashboard under the client-only `_authenticated` layout and the login public; local browser sessions cannot be read during SSR.
- Pre-optimize dependencies introduced by code-split routes in Vite when runtime discovery invalidates modules during first navigation; keep route components code-split.
- OWNER dashboard and section functions share the server-side active-owner check; read-only menu destinations use a validated dynamic section route with paginated RLS-scoped queries.
- Dashboard days follow the stored business timezone; revenue sums completed transactions using paginated reads, counts use exact head queries, and read errors must not masquerade as empty zero data.
- Service create and update functions share constraint-specific error classification in service rules so duplicate names have consistent, safe feedback without exposing other database errors.
