import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import AuthForm from "../components/AuthForm";
import { useAuth } from "../context/AuthContext";
import { getRoleRedirect } from "../utils/roles";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

const loginFields = [
  { label: "Email", name: "email", type: "email" },
  { label: "Password", name: "password", type: "password" },
];

export default function Login() {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "" });
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
    const parsed = loginSchema.safeParse(values);
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
      const user = await login(values);
      navigate(location.state?.from?.pathname || getRoleRedirect(user.role), {
        replace: true,
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageFooter cta="Create account" to="/register">
      <AuthForm
        error={error}
        fields={loginFields}
        isSubmitting={isSubmitting}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitLabel="Sign in"
        title="Sign in"
        validationErrors={validationErrors}
        values={values}
      />
    </AuthPageFooter>
  );
}

function AuthPageFooter({ children, cta, to }) {
  return (
    <div>
      {children}
      <p className="mt-4 text-center text-sm text-slate-600">
        <Link className="font-semibold text-medical-teal hover:text-medical-blue" to={to}>
          {cta}
        </Link>
      </p>
    </div>
  );
}
