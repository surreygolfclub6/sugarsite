import { NextResponse, type NextRequest } from "next/server";
import { requestOrigin } from "@/lib/origin";

// A member's invite link: /join?ref=CODE. The code is kept for 30 days and attached when the visitor signs up.
// The page they land on says nothing about who invited them.
const CODE = /^[A-HJKMNP-Z2-9]{8}$/;

export function GET(request: NextRequest) {
  const origin = requestOrigin(request);
  const code = (request.nextUrl.searchParams.get("ref") ?? "").trim().toUpperCase();
  const valid = CODE.test(code);
  const response = NextResponse.redirect(`${origin}/signup${valid ? "?invited=1" : ""}`);
  response.headers.set("Cache-Control", "no-store");
  if (valid) {
    response.cookies.set("ref", code, { maxAge: 60 * 60 * 24 * 30, path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  }
  return response;
}
