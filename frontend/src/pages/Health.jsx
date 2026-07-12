import { useEffect, useState } from "react";

import { getHealth } from "../api/health";

export default function Health() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    getHealth()
      .then((data) => {
        if (isMounted) {
          setHealth(data);
          setError("");
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Backend health check is unavailable.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="rounded border border-cyan-100 bg-white p-6 shadow-soft">
      <p className="text-sm font-semibold uppercase tracking-wide text-medical-teal">
        Health Check
      </p>
      <h2 className="mt-2 text-2xl font-bold text-medical-navy">
        Backend Connection
      </h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatusItem label="Status" value={health?.status || "pending"} />
        <StatusItem label="Service" value={health?.service || "MediFlow AI"} />
        <StatusItem label="Version" value={health?.version || "0.1.0"} />
      </div>

      {error ? (
        <p className="mt-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function StatusItem({ label, value }) {
  return (
    <div className="rounded border border-cyan-100 bg-medical-ice p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold text-medical-navy">{value}</p>
    </div>
  );
}
