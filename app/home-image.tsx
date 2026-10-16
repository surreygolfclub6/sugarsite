import Image from "next/image";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Photos for the landing page live in public/images/home. Drop a file in with
// the expected name and it appears; until then the slot shows a quiet gradient.
const FALLBACKS = [
  "radial-gradient(120% 90% at 30% 20%, #6b2c45 0%, #3b1c33 45%, #1b1220 100%)",
  "radial-gradient(110% 90% at 70% 15%, #5a3a2c 0%, #33202a 50%, #1b1220 100%)",
  "radial-gradient(120% 100% at 20% 80%, #43284f 0%, #2a1a35 50%, #1b1220 100%)",
];

export function HomeImage({
  name,
  alt,
  sizes,
  priority = false,
  tone = 0,
  className = "",
}: {
  name: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  tone?: number;
  className?: string;
}) {
  const present = existsSync(join(process.cwd(), "public", "images", "home", name));
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: FALLBACKS[tone % FALLBACKS.length] }}
    >
      {present && (
        <Image
          src={`/images/home/${name}`}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      )}
    </div>
  );
}
