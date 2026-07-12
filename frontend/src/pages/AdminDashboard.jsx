import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { generateAdminReport, getAdminAnalytics } from "../api/adminDashboard";
import { listUsers } from "../api/auth";
import { downloadPdf, downloadText, reportToText } from "../utils/reportExport";

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [report, setReport] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    getAdminAnalytics()
      .then(setAnalytics)
      .catch(() => setError("Unable to load admin analytics."));

    listUsers()
      .then((data) => setUsers(data.items || []))
      .catch(() => setError("Unable to load users directory."));
  }, []);

  const handleReport = async () => {
    setIsGenerating(true);
    setError("");
    try {
      const data = await generateAdminReport();
      setReport(data.report);
      setAnalytics(data.stats);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to generate AI report.");
    } finally {
      setIsGenerating(false);
    }
  };

  const reportText = reportToText(report);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded border border-cyan-100 bg-white p-6 shadow-soft">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-medical-teal">
            Admin Dashboard
          </p>
          <h2 className="mt-2 text-2xl font-bold text-medical-navy">
            Hospital analytics
          </h2>
        </div>
        <button
          className="rounded bg-medical-teal px-4 py-3 text-sm font-semibold text-white hover:bg-medical-blue disabled:opacity-60"
          disabled={isGenerating || !analytics}
          onClick={handleReport}
          type="button"
        >
          {isGenerating ? "Generating" : "Generate Report"}
        </button>
      </div>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {analytics ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Patients" value={analytics.totals.patients} />
            <Metric label="Today's appointments" value={analytics.totals.appointments_today} />
            <Metric label="Avg wait" value={`${analytics.totals.average_wait_minutes} min`} />
            <Metric label="Paid revenue" value={`$${analytics.totals.paid_revenue.toFixed(2)}`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartPanel title="Patient volume trends">
              <LineChart data={analytics.patient_volume}>
                <CartesianGrid stroke="#d9f7ef" strokeDasharray="4 4" />
                <XAxis dataKey="label" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Line dataKey="patients" stroke="#0f766e" strokeWidth={3} type="monotone" />
              </LineChart>
            </ChartPanel>
            <ChartPanel title="Revenue from billing">
              <BarChart data={analytics.revenue}>
                <CartesianGrid stroke="#d9f7ef" strokeDasharray="4 4" />
                <XAxis dataKey="label" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="amount" fill="#1769aa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartPanel>
            <ChartPanel title="Doctor utilization">
              <BarChart data={analytics.doctor_utilization}>
                <CartesianGrid stroke="#d9f7ef" strokeDasharray="4 4" />
                <XAxis dataKey="label" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="utilization" fill="#1aa6b7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartPanel>
            <ChartPanel title="Department load">
              <BarChart data={analytics.department_load}>
                <CartesianGrid stroke="#d9f7ef" strokeDasharray="4 4" />
                <XAxis dataKey="label" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="appointments" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartPanel>
            <ChartPanel title="Average wait time">
              <BarChart data={analytics.average_wait_time}>
                <CartesianGrid stroke="#d9f7ef" strokeDasharray="4 4" />
                <XAxis dataKey="label" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="avg_wait_minutes" fill="#12355b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartPanel>
          </div>
        </>
      ) : (
        <p className="rounded border border-cyan-100 bg-white p-6 text-sm text-slate-600 shadow-soft">
          Loading analytics.
        </p>
      )}

      {report ? (
        <div className="rounded border border-cyan-100 bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-medical-navy">AI report</h3>
            <div className="flex gap-2">
              <button className="rounded border border-cyan-100 px-3 py-2 text-sm font-semibold text-medical-navy hover:border-medical-teal" onClick={() => downloadText("mediflow-report.txt", reportText)} type="button">
                Text
              </button>
              <button className="rounded border border-cyan-100 px-3 py-2 text-sm font-semibold text-medical-navy hover:border-medical-teal" onClick={() => downloadPdf("mediflow-report.pdf", reportText)} type="button">
                PDF
              </button>
            </div>
          </div>
          <pre className="mt-4 whitespace-pre-wrap rounded bg-medical-ice p-4 text-sm text-slate-700">
            {reportText}
          </pre>
        </div>
      ) : null}

      {/* User Accounts Directory */}
      <div className="rounded border border-cyan-100 bg-white p-6 shadow-soft">
        <h3 className="text-lg font-bold text-medical-navy mb-4">User Accounts Directory</h3>
        <div className="overflow-x-auto rounded-xl border border-cyan-50">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-medical-ice text-xs uppercase tracking-wide text-medical-navy font-bold">
              <tr>
                <th className="px-6 py-3 border-b border-cyan-50">Name</th>
                <th className="px-6 py-3 border-b border-cyan-50">Email</th>
                <th className="px-6 py-3 border-b border-cyan-50">Phone</th>
                <th className="px-6 py-3 border-b border-cyan-50">Role</th>
                <th className="px-6 py-3 border-b border-cyan-50">Date Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-50">
              {users.length > 0 ? (
                users.map((item) => (
                  <tr className="hover:bg-slate-50 transition" key={item.email}>
                    <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
                    <td className="px-6 py-4 text-slate-600">{item.email}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{item.phone || "Not added"}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border ${
                        item.role === "admin" ? "bg-purple-50 border-purple-200 text-purple-700" :
                        item.role === "doctor" ? "bg-cyan-50 border-cyan-200 text-cyan-700" :
                        item.role === "receptionist" ? "bg-amber-50 border-amber-200 text-amber-700" :
                        "bg-teal-50 border-teal-200 text-teal-700"
                      }`}>
                        {item.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleDateString([], { dateStyle: "medium" })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded border border-cyan-100 bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-medical-navy">{value}</p>
    </div>
  );
}

function ChartPanel({ children, title }) {
  return (
    <div className="rounded border border-cyan-100 bg-white p-5 shadow-soft">
      <h3 className="mb-4 text-lg font-semibold text-medical-navy">{title}</h3>
      <div className="h-72">
        <ResponsiveContainer height="100%" width="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
