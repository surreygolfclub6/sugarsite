import { redirect } from "next/navigation";
import { after, connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { touchActive } from "@/lib/activity";
import { shortTime } from "@/lib/people";
import { firstPhotos } from "../discover/search";
import { ConversationLink } from "./conversation-link";
import { RefreshOnMessage } from "./refresh-on-message";

type Row = {
  id: string;
  other_id: string;
  other_name: string;
  other_online: boolean;
  last_body: string;
  last_at: string;
  last_from_me: boolean;
  unread: number;
};

export async function ConversationList() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Recording activity is a write the page doesn't wait on, so it runs after the response is sent.
  after(() => touchActive(user.id));

  const { data } = await supabase.rpc("my_conversations");
  const rows = (data ?? []) as Row[];
  const photos = await firstPhotos(supabase, rows.map((r) => r.other_id));

  return (
    <>
      <RefreshOnMessage />
      <h1 className="display px-1 text-4xl lg:px-4 lg:pb-2 lg:pt-4 lg:text-3xl">Messages</h1>

      {rows.length === 0 ? (
        <p className="mt-10 px-1 text-dusk lg:mt-4 lg:px-4">
          No conversations yet. Open someone’s profile or tap the message icon on a search result to say hello.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line lg:mt-0" aria-label="Conversations">
          {rows.map((r) => (
            <li key={r.id} data-conversation={r.id}>
              <ConversationLink id={r.id}>
                <span className="relative size-14 shrink-0">
                  <span className="block size-full overflow-hidden rounded-full bg-velvet-2">
                    {photos.get(r.other_id)?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photos.get(r.other_id)!.url!} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="display grid size-full place-items-center text-xl text-dusk">{r.other_name.slice(0, 1)}</span>
                    )}
                  </span>
                  {r.other_online && <span role="img" aria-label="Online now" className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-night bg-emerald-500" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate ${r.unread ? "font-semibold" : "font-medium"}`}>{r.other_name}</span>
                    <span className="shrink-0 text-xs text-dusk">{shortTime(r.last_at)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${r.unread ? "text-pearl" : "text-dusk"}`}>
                      {r.last_from_me && "You: "}
                      {r.last_body || "Sent a photo"}
                    </span>
                    {r.unread > 0 && (
                      <span data-unread aria-label={`${r.unread} unread`} className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-garnet px-1.5 text-xs font-medium text-white">
                        {r.unread}
                      </span>
                    )}
                  </span>
                </span>
              </ConversationLink>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
