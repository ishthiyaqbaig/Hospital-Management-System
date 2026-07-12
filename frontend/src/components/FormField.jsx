export default function FormField({
  label,
  name,
  onChange,
  options,
  required = true,
  type = "text",
  value,
}) {
  const inputClass =
    "mt-2 w-full rounded border border-cyan-100 bg-white px-3 py-2 text-sm outline-none transition focus:border-medical-teal focus:ring-2 focus:ring-medical-mint";

  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {type === "select" ? (
        <select
          className={inputClass}
          name={name}
          onChange={onChange}
          required={required}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={inputClass}
          name={name}
          onChange={onChange}
          required={required}
          type={type}
          value={value}
        />
      )}
    </label>
  );
}
