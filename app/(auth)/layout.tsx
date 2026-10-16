import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
      <Link href="/" className="display text-2xl">
        {SITE_NAME}
      </Link>
      <main className="flex flex-1 flex-col justify-center py-10">{children}</main>
    </div>
  );
}
