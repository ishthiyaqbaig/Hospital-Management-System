import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const readinessData = [
  { label: "Mon", readiness: 90 },
  { label: "Tue", readiness: 94 },
  { label: "Wed", readiness: 92 },
  { label: "Thu", readiness: 96 },
  { label: "Fri", readiness: 98 },
];

export default function Dashboard() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded border border-cyan-100 bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-wide text-medical-teal">
          System Overview
        </p>
        <h2 className="mt-2 text-3xl font-bold text-medical-navy">
          MediFlow AI skeleton is ready.
        </h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          The app is wired for routing, API calls, charting, Tailwind styling,
          JWT utilities, MongoDB connection management, and environment-based
          configuration.
        </p>
      </div>

      <div className="rounded border border-cyan-100 bg-white p-6 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-medical-navy">
            Readiness Preview
          </h2>
          <span className="rounded bg-medical-mint px-2 py-1 text-xs font-semibold text-medical-teal">
            Static
          </span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={readinessData} margin={{ left: -24, right: 8 }}>
              <CartesianGrid stroke="#d9f7ef" strokeDasharray="4 4" />
              <XAxis dataKey="label" stroke="#64748b" />
              <YAxis stroke="#64748b" domain={[80, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="readiness"
                stroke="#0f766e"
                strokeWidth={3}
                dot={{ r: 4, fill: "#1769aa" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
