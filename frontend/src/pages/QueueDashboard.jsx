import { useEffect, useState } from "react";

import { createEmergencyIntake, getDepartmentQueue, updateQueueStatus } from "../api/appointments";
import { listDepartments } from "../api/resources";

const statuses = ["waiting", "in-progress", "done"];

export default function QueueDashboard() {
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ patient_id: "", doctor_id: "", department_id: "", symptoms: "", vitals: "" });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    listDepartments()
      .then((items) => {
        setDepartments(items);
        setDepartmentId(items[0]?.id || "");
      })
      .catch(() => setError("Unable to load departments."));
  }, []);

  useEffect(() => {
    if (!departmentId) {
      return undefined;
    }
    const refresh = () => {
      getDepartmentQueue(departmentId)
        .then((data) => {
          setQueue(data.items);
          setError("");
        })
        .catch(() => setError("Unable to load live queue."));
    };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [departmentId]);

  const handleStatus = async (appointmentId, queueStatus) => {
    await updateQueueStatus(appointmentId, queueStatus);
    const data = await getDepartmentQueue(departmentId);
    setQueue(data.items);
  };

  const handleEmergencySubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const result = await createEmergencyIntake({ ...form, department_id: form.department_id || undefined });
      setNotice(`Emergency intake added. Urgency ${result.emergency_urgency}/5.`);
      const data = await getDepartmentQueue(departmentId);
      setQueue(data.items);
      setForm({ patient_id: "", doctor_id: "", department_id: "", symptoms: "", vitals: "" });
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to create emergency intake.");
    }
  };

  return (
    <section className="rounded border border-cyan-100 bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-medical-teal">
            Reception Queue
          </p>
          <h2 className="mt-2 text-2xl font-bold text-medical-navy">Live department queue</h2>
        </div>
        <select
          className="rounded border border-cyan-100 px-3 py-2 text-sm outline-none focus:border-medical-teal focus:ring-2 focus:ring-medical-mint"
          onChange={(event) => setDepartmentId(event.target.value)}
          value={departmentId}
        >
          {departments.map((department) => (
            <option key={department.id} value={department.id}>{department.name}</option>
          ))}
        </select>
      </div>
      {error ? <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}
      <form className="mt-6 rounded border border-cyan-100 bg-medical-ice p-4" onSubmit={handleEmergencySubmit}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-medical-teal">Emergency Intake</p>
            <h3 className="text-lg font-bold text-medical-navy">Front-desk triage</h3>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input className="rounded border border-cyan-100 px-3 py-2 text-sm" onChange={(event) => setForm((current) => ({ ...current, patient_id: event.target.value }))} placeholder="Patient ID" required value={form.patient_id} />
          <input className="rounded border border-cyan-100 px-3 py-2 text-sm" onChange={(event) => setForm((current) => ({ ...current, doctor_id: event.target.value }))} placeholder="Doctor ID" required value={form.doctor_id} />
          <input className="rounded border border-cyan-100 px-3 py-2 text-sm" onChange={(event) => setForm((current) => ({ ...current, department_id: event.target.value }))} placeholder="Department ID (optional)" value={form.department_id} />
          <textarea className="md:col-span-2 min-h-24 rounded border border-cyan-100 px-3 py-2 text-sm" onChange={(event) => setForm((current) => ({ ...current, symptoms: event.target.value }))} placeholder="Patient symptoms" required value={form.symptoms} />
          <textarea className="md:col-span-2 min-h-20 rounded border border-cyan-100 px-3 py-2 text-sm" onChange={(event) => setForm((current) => ({ ...current, vitals: event.target.value }))} placeholder="Vitals" value={form.vitals} />
        </div>
        <button className="mt-4 rounded bg-medical-teal px-4 py-2 text-sm font-semibold text-white" type="submit">Assess & queue</button>
      </form>
      <div className="mt-6 overflow-hidden rounded border border-cyan-100">
        {queue.map((appointment) => (
          <div className="grid gap-3 border-b border-cyan-100 p-4 last:border-b-0 md:grid-cols-[80px_1fr_220px]" key={appointment.id}>
            <div className="text-2xl font-bold text-medical-teal">#{appointment.queue_position}</div>
            <div>
              <p className="font-semibold text-medical-navy">Patient {appointment.patient_id}</p>
              <p className="text-sm text-slate-600">
                {new Date(appointment.scheduled_at).toLocaleString()} · {appointment.reason || "General visit"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{appointment.queue_status}</p>
                {appointment.emergency_urgency ? (
                  <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                    Urgency {appointment.emergency_urgency}/5
                  </span>
                ) : null}
              </div>
              {appointment.emergency_reasoning ? (
                <p className="mt-2 text-xs text-slate-600">{appointment.emergency_reasoning}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              {statuses.map((status) => (
                <button
                  className="rounded border border-cyan-100 px-3 py-2 text-xs font-semibold text-medical-navy hover:border-medical-teal hover:text-medical-teal"
                  key={status}
                  onClick={() => handleStatus(appointment.id, status)}
                  type="button"
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        ))}
        {!queue.length ? <p className="p-6 text-sm text-slate-600">No active queue items.</p> : null}
      </div>
    </section>
  );
}
