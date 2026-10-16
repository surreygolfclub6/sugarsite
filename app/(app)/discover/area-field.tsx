"use client";

import { useState } from "react";
import { PlacePicker } from "@/app/onboarding/place-picker";

export function AreaField({
  myArea,
  initialArea,
}: {
  myArea: string | null;
  initialArea: { id: number; text: string } | null;
}) {
  const [where, setWhere] = useState<"mine" | "other">(initialArea ? "other" : "mine");
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium">Search area</legend>
      <label className="flex items-center gap-2 text-sm">
        <input type="radio" name="where" value="mine" checked={where === "mine"} onChange={() => setWhere("mine")} />
        My area{myArea ? ` (${myArea})` : ""}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="radio" name="where" value="other" checked={where === "other"} onChange={() => setWhere("other")} />
        Somewhere else
      </label>
      {where === "other" && (
        <PlacePicker name="area" label="Town or city" initial={initialArea ?? undefined} hint="Search UK towns and cities." />
      )}
    </fieldset>
  );
}
