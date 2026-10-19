// For uptime monitors. Deliberately touches nothing else (no database), so it reveals nothing and works when other things don't.
export function GET() {
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
