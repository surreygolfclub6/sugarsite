type Option = { value: string; label: string };

export function Pills({
  name,
  options,
  type,
  defaultValues = [],
}: {
  name: string;
  options: readonly Option[];
  type: "radio" | "checkbox";
  defaultValues?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input
            type={type}
            name={name}
            value={o.value}
            defaultChecked={defaultValues.includes(o.value)}
            className="peer sr-only"
          />
          <span className="block rounded-full border border-line px-4 py-2 text-sm peer-checked:border-garnet peer-checked:bg-garnet/20 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brass">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}
