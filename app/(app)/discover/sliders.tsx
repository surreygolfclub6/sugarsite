"use client";

import { useState } from "react";

type Kind = "age" | "miles" | "height";

function format(kind: Kind, value: number, max: number) {
  if (kind === "age") return value >= max ? `${value}+` : String(value);
  if (kind === "miles") return value >= max ? "Anywhere in the UK" : `${value} miles`;
  const inches = Math.round(value / 2.54);
  return `${value} cm (${Math.floor(inches / 12)}'${inches % 12}")`;
}

const pct = (v: number, min: number, max: number) => ((v - min) / (max - min)) * 100;

export function RangeField({
  name,
  label,
  kind,
  min,
  max,
  step,
  defaultValue,
}: {
  name: string;
  label: string;
  kind: Kind;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <label htmlFor={name} className="font-medium">{label}</label>
        <output htmlFor={name} className="text-dusk">{format(kind, value, max)}</output>
      </div>
      <div className="range">
        <div className="range-track" />
        <div className="range-fill" style={{ left: 0, width: `${pct(value, min, max)}%` }} />
        <input id={name} name={name} type="range" min={min} max={max} step={step} value={value} onChange={(e) => setValue(Number(e.target.value))} />
      </div>
    </div>
  );
}

export function DualRangeField({
  nameMin,
  nameMax,
  label,
  minLabel,
  maxLabel,
  kind,
  min,
  max,
  step,
  defaultMin,
  defaultMax,
}: {
  nameMin: string;
  nameMax: string;
  label: string;
  minLabel: string;
  maxLabel: string;
  kind: Kind;
  min: number;
  max: number;
  step: number;
  defaultMin: number;
  defaultMax: number;
}) {
  const [lo, setLo] = useState(defaultMin);
  const [hi, setHi] = useState(defaultMax);
  return (
    <div role="group" aria-label={label}>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <output className="text-dusk">
          {format(kind, lo, max)} to {format(kind, hi, max)}
        </output>
      </div>
      <div className="range">
        <div className="range-track" />
        <div className="range-fill" style={{ left: `${pct(lo, min, max)}%`, width: `${pct(hi, min, max) - pct(lo, min, max)}%` }} />
        <input
          name={nameMin}
          type="range"
          aria-label={minLabel}
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => setLo(Math.min(Number(e.target.value), hi))}
        />
        <input
          name={nameMax}
          type="range"
          aria-label={maxLabel}
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => setHi(Math.max(Number(e.target.value), lo))}
        />
      </div>
    </div>
  );
}
