import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Join" };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
