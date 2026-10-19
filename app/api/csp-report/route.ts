// Collects browser reports about content the Content-Security-Policy would block. They land in the Vercel runtime logs
// ("csp-report"). Nothing is stored, and the body is capped so the endpoint can't be used to fill the logs.
export async function POST(request: Request) {
  const text = (await request.text()).slice(0, 4000);
  if (text) console.warn("csp-report", text);
  return new Response(null, { status: 204 });
}
