import FormField from "./FormField";

export const roles = [
  { value: "admin", label: "Admin" },
  { value: "doctor", label: "Doctor" },
  { value: "receptionist", label: "Receptionist" },
  { value: "patient", label: "Patient" },
];

export default function AuthForm({
  error,
  fields,
  isSubmitting,
  onChange,
  onSubmit,
  submitLabel,
  title,
  values,
  validationErrors = {},
}) {
  return (
    <section className="mx-auto max-w-md rounded border border-cyan-100 bg-white p-6 shadow-soft">
      <p className="text-sm font-semibold uppercase tracking-wide text-medical-teal">
        MediFlow AI
      </p>
      <h2 className="mt-2 text-2xl font-bold text-medical-navy">{title}</h2>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {fields.map((field) => (
          <div key={field.name}>
            <FormField
              {...field}
              onChange={onChange}
              value={values[field.name] || ""}
            />
            {validationErrors[field.name] ? (
              <p className="mt-1 text-xs text-red-600">{validationErrors[field.name]}</p>
            ) : null}
          </div>
        ))}

        {error ? (
          <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          className="w-full rounded bg-medical-teal px-4 py-3 text-sm font-semibold text-white transition hover:bg-medical-blue disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Please wait" : submitLabel}
        </button>
      </form>
    </section>
  );
}
