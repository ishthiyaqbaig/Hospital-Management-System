import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getRoleRedirect } from "../utils/roles";

export default function Unauthorized() {
  const { user } = useAuth();

  return (
    <section className="rounded border border-cyan-100 bg-white p-6 shadow-soft">
      <p className="text-sm font-semibold uppercase tracking-wide text-medical-teal">
        Access
      </p>
      <h2 className="mt-2 text-2xl font-bold text-medical-navy">
        This area is not available for your role.
      </h2>
      <Link
        className="mt-6 inline-flex rounded bg-medical-teal px-4 py-2 text-sm font-semibold text-white hover:bg-medical-blue"
        to={getRoleRedirect(user?.role)}
      >
        Go to workspace
      </Link>
    </section>
  );
}
