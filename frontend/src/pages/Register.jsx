import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import AuthForm, { roles } from "../components/AuthForm";
import { useAuth } from "../context/AuthContext";
import { getRoleRedirect } from "../utils/roles";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Please enter a valid email address."),
  phone: z.string().optional().or(z.literal("")),
  role: z.enum(["admin", "doctor", "receptionist", "patient"]),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const registerFields = [
  { label: "Name", name: "name" },
  { label: "Email", name: "email", type: "email" },
  { label: "Phone", name: "phone", required: false, type: "tel" },
  { label: "Role", name: "role", options: roles, type: "select" },
  { label: "Password", name: "password", type: "password" },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    role: "patient",
    password: "",
  });
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    setValues((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      const formatted = Object.fromEntries(
        parsed.error.issues.map((issue) => [issue.path[0], issue.message])
      );
      setValidationErrors(formatted);
      return;
    }
    setValidationErrors({});
    setIsSubmitting(true);

    try {
      const user = await register(values);
      navigate(getRoleRedirect(user.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <AuthForm
        error={error}
        fields={registerFields}
        isSubmitting={isSubmitting}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitLabel="Create account"
        title="Create account"
        validationErrors={validationErrors}
        values={values}
      />
      <p className="mt-4 text-center text-sm text-slate-600">
        <Link className="font-semibold text-medical-teal hover:text-medical-blue" to="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
