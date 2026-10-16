import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ places: [] }, { status: 401 });

  // Letters, spaces, apostrophes and hyphens only, so LIKE wildcards can't be injected.
  const q = (request.nextUrl.searchParams.get("q") ?? "").replace(/[^\p{L}\s'’-]/gu, "").trim().slice(0, 40);
  if (q.length < 2) return NextResponse.json({ places: [] });

  const { data, error } = await supabase.rpc("search_uk_places", { q });
  if (error) return NextResponse.json({ places: [] }, { status: 500 });
  return NextResponse.json({ places: data });
}
