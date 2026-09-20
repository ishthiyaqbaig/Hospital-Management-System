import { useEffect, useState } from "react";
import { getHealth } from "../api/health";

export default function Health() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const runCheck = () => {
    setChecking(true);
    getHealth()
      .then((data) => {
        setHealth(data);
        setError("");
      })
      .catch(() => {
        setError("Backend health check is unavailable.");
      })
      .finally(() => {
        setChecking(false);
      });
  };

  useEffect(() => {
    runCheck();
  }, []);

  const isHealthy = health?.status === "ok" || health?.status === "healthy";
  const checks = health?.checks || {};
  const apiCheck = checks.api;
  const databaseCheck = checks.database;
  const geminiCheck = checks.gemini;

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-cyan-100 pb-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-medical-teal">
            DevOps Console
          </p>
          <h2 className="mt-1 text-3xl font-extrabold text-medical-navy">
            System Operations & Status
          </h2>
        </div>
        <button
          onClick={runCheck}
          disabled={checking}
          className="rounded-lg bg-medical-teal hover:bg-medical-blue disabled:opacity-50 transition text-white px-4 py-2.5 text-xs font-semibold shadow flex items-center gap-1.5"
          type="button"
        >
          {checking ? "Refreshing..." : "Run Health Diagnosis"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      ) : null}

      {/* Main Status Indicators */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatusCard
          label="Gateway API Status"
          value={apiCheck ? statusLabel(apiCheck.status) : health ? (isHealthy ? "Operational" : "Degraded") : "Connecting..."}
          tone={toneFor(apiCheck?.status || (isHealthy ? "ok" : "pending"))}
          desc={apiCheck?.message || "FastAPI backend application gateway."}
        />
        <StatusCard
          label="Primary Datastore"
          value={databaseCheck ? statusLabel(databaseCheck.status) : "Connecting..."}
          tone={toneFor(databaseCheck?.status)}
          desc={databaseCheck?.message || "MongoDB cloud atlas database cluster."}
        />
        <StatusCard
          label="LLM Intelligence Agent"
          value={geminiCheck ? statusLabel(geminiCheck.status) : "Connecting..."}
          tone={toneFor(geminiCheck?.status)}
          desc={geminiCheck?.message || "Google AI developer api endpoint."}
        />
      </div>

      {/* Detailed Diagnostics Table */}
      <div className="rounded-2xl border border-cyan-100 bg-white p-6 shadow-soft space-y-4">
        <h3 className="text-lg font-bold text-medical-navy">Gateway System Details</h3>
        
        <div className="overflow-x-auto rounded-xl border border-cyan-50">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-medical-ice text-xs uppercase tracking-wide text-medical-navy font-bold">
              <tr>
                <th className="px-6 py-3">Property</th>
                <th className="px-6 py-3">Value</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-50 text-slate-700">
              <tr>
                <td className="px-6 py-4 font-semibold">Service Name</td>
                <td className="px-6 py-4 font-mono text-xs">{health?.service || "MediFlow Hospital Intelligence Core"}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Static
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-semibold">Service Version</td>
                <td className="px-6 py-4 font-mono text-xs">{health?.version || "0.1.0"}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Release
                  </span>
                </td>
              </tr>
              <DiagnosticRow label="API Runtime" check={apiCheck} fallback="Waiting for backend response." />
              <DiagnosticRow label="MongoDB Client State" check={databaseCheck} fallback="Waiting for database diagnosis." />
              <DiagnosticRow label="Gemini API Target" check={geminiCheck} fallback="Waiting for Gemini diagnosis." />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DiagnosticRow({ label, check, fallback }) {
  return (
    <tr>
      <td className="px-6 py-4 font-semibold">{label}</td>
      <td className="px-6 py-4 text-xs">{check?.message || fallback}</td>
      <td className="px-6 py-4">
        <StatusPill status={check?.status} />
      </td>
    </tr>
  );
}

function StatusPill({ status }) {
  const tone = toneFor(status);
  const style =
    tone === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : tone === "error"
        ? "bg-rose-50 border-rose-200 text-rose-700"
        : tone === "warning"
          ? "bg-amber-50 border-amber-200 text-amber-700"
          : "bg-slate-50 border-slate-200 text-slate-600";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${style}`}>
      {statusLabel(status)}
    </span>
  );
}

function statusLabel(status) {
  if (status === "ok") {
    return "Online";
  }
  if (status === "error") {
    return "Error";
  }
  if (status === "degraded") {
    return "Degraded";
  }
  return "Unknown";
}

function toneFor(status) {
  if (status === "ok") {
    return "success";
  }
  if (status === "error") {
    return "error";
  }
  if (status === "degraded") {
    return "warning";
  }
  return "pending";
}

function StatusCard({ label, value, tone, desc }) {
  const getColors = () => {
    switch (tone) {
      case "success":
        return {
          bg: "bg-emerald-50/50 border-emerald-200",
          text: "text-emerald-800",
          badge: "bg-emerald-500",
        };
      case "warning":
        return {
          bg: "bg-amber-50/50 border-amber-200",
          text: "text-amber-800",
          badge: "bg-amber-500",
        };
      case "error":
        return {
          bg: "bg-rose-50/50 border-rose-200",
          text: "text-rose-800",
          badge: "bg-rose-500",
        };
      default:
        return {
          bg: "bg-slate-50/50 border-slate-200",
          text: "text-slate-500",
          badge: "bg-slate-400",
        };
    }
  };

  const colors = getColors();

  return (
    <div className={`rounded-2xl border p-5 space-y-4 hover:shadow-soft transition ${colors.bg}`}>
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <span className={`h-2.5 w-2.5 rounded-full ${colors.badge} animate-pulse`}></span>
      </div>
      <div>
        <h4 className={`text-2xl font-bold tracking-tight ${colors.text}`}>{value}</h4>
        <p className="text-xs text-slate-500 mt-1 leading-normal">{desc}</p>
      </div>
    </div>
  );
}
