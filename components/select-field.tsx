type Option = { value: string; label: string };

export function SelectField({
  id,
  label,
  options,
  defaultValue = "",
}: {
  id: string;
  label: string;
  options: readonly Option[];
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <select id={id} name={id} defaultValue={defaultValue} className="field">
        <option value="" disabled>
          Choose…
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
