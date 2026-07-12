import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { roleLabels } from "../utils/roles";
import {
  listAppointments,
  deleteAppointment,
  createEmergencyIntake,
  getDepartmentQueue,
  updateQueueStatus,
} from "../api/appointments";
import { listPrescriptions } from "../api/prescriptions";
import { listDepartments } from "../api/resources";
import { downloadPdf } from "../utils/reportExport";

export default function RoleHome({ role }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  // State for Patient & Receptionist
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // State specifically for Receptionist Queue
  const [departments, setDepartments] = useState([]);
  const [queueDeptId, setQueueDeptId] = useState("");
  const [liveQueue, setLiveQueue] = useState([]);
  const [triageForm, setTriageForm] = useState({
    patient_id: "",
    doctor_id: "",
    department_id: "",
    symptoms: "",
    vitals: "",
  });
  const [triageSuccess, setTriageSuccess] = useState("");
  const [triageError, setTriageError] = useState("");
  const [isTriaging, setIsTriaging] = useState(false);

  // Load basic receptionist config
  useEffect(() => {
    if (role === "receptionist" && activeTab === "queue") {
      listDepartments()
        .then((items) => {
          setDepartments(items);
          if (items.length && !queueDeptId) {
            setQueueDeptId(items[0].id);
          }
        })
        .catch(() => setActionError("Unable to load departments."));
    }
  }, [role, activeTab]);

  // Poll department queue for receptionist
  useEffect(() => {
    if (role !== "receptionist" || activeTab !== "queue" || !queueDeptId) {
      return undefined;
    }
    const fetchQueue = () => {
      getDepartmentQueue(queueDeptId)
        .then((data) => {
          setLiveQueue(data.items);
        })
        .catch(() => {});
    };
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [role, activeTab, queueDeptId]);

  // Load lists based on active tab
  useEffect(() => {
    setActionError("");
    setActionSuccess("");

    if (activeTab === "appointments") {
      setLoading(true);
      listAppointments()
        .then((data) => setAppointments(data.items))
        .catch(() => setActionError("Unable to load appointments."))
        .finally(() => setLoading(false));
    } else if (activeTab === "prescriptions" && role === "patient") {
      setLoading(true);
      listPrescriptions()
        .then((data) => setPrescriptions(data.items))
        .catch(() => setActionError("Unable to load prescriptions."))
        .finally(() => setLoading(false));
    }
  }, [activeTab, role]);

  // Cancel Appointment handler (receptionist)
  const handleCancelAppointment = async (id) => {
    setActionError("");
    setActionSuccess("");
    try {
      await deleteAppointment(id);
      setActionSuccess("Appointment cancelled successfully.");
      setAppointments((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setActionError(err.response?.data?.detail || "Failed to cancel appointment.");
    }
  };

  // Receptionist Queue Status change
  const handleQueueStatusChange = async (appointmentId, statusValue) => {
    try {
      await updateQueueStatus(appointmentId, statusValue);
      const data = await getDepartmentQueue(queueDeptId);
      setLiveQueue(data.items);
    } catch {
      setActionError("Failed to update queue status.");
    }
  };

  // Receptionist Triage Intake submission
  const handleTriageSubmit = async (event) => {
    event.preventDefault();
    setTriageError("");
    setTriageSuccess("");
    setIsTriaging(true);
    try {
      const payload = {
        patient_id: triageForm.patient_id,
        doctor_id: triageForm.doctor_id,
        symptoms: triageForm.symptoms,
        vitals: triageForm.vitals || undefined,
        department_id: triageForm.department_id || undefined,
      };
      const result = await createEmergencyIntake(payload);
      setTriageSuccess(`Emergency Intake registered successfully! Triage Urgency: ${result.emergency_urgency}/5.`);
      setTriageForm({ patient_id: "", doctor_id: "", department_id: "", symptoms: "", vitals: "" });
      
      // Refresh queue
      if (queueDeptId) {
        const data = await getDepartmentQueue(queueDeptId);
        setLiveQueue(data.items);
      }
    } catch (err) {
      setTriageError(err.response?.data?.detail || "Failed to complete emergency intake.");
    } finally {
      setIsTriaging(false);
    }
  };

  // Prescription PDF downloader
  const handleDownloadPrescription = (pres) => {
    const lines = [
      "MediFlow AI Hospital Prescription",
      "=================================",
      `Prescription ID: ${pres.id}`,
      `Date: ${new Date(pres.created_at).toLocaleDateString([], { dateStyle: "long" })}`,
      `Patient ID: ${pres.patient_id}`,
      `Prescribed by: ${pres.doctor_name || "Doctor"}`,
      `Status: ${pres.status}`,
      "",
      "Medications:",
    ];
    pres.medications.forEach((med) => {
      lines.push(`- ${med.name} (Dosage: ${med.dosage}, Frequency: ${med.frequency}${med.duration ? `, Duration: ${med.duration}` : ""})`);
    });
    if (pres.instructions) {
      lines.push("", "Instructions:", pres.instructions);
    }
    const content = lines.join("\n");
    downloadPdf(`prescription-${pres.id}.pdf`, content);
  };

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <header className="rounded-xl bg-gradient-to-r from-medical-navy via-medical-teal to-medical-cyan p-6 text-white shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wider text-medical-mint">
          {roleLabels[role]} Portal
        </p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
          Welcome back, {user?.name || "User"}
        </h2>
        <p className="mt-2 text-sm text-cyan-50 opacity-90 max-w-xl">
          Use the tabs below to navigate through your records, manage appointments, and access hospital services.
        </p>
      </header>

      {/* Tabs Layout */}
      <div className="flex border-b border-cyan-100 bg-white p-2 rounded-t-xl gap-2 shadow-sm">
        <TabButton active={activeTab === "profile"} onClick={() => setActiveTab("profile")} label="Overview" icon="profile" />
        
        {role === "receptionist" ? (
          <TabButton active={activeTab === "queue"} onClick={() => setActiveTab("queue")} label="Live Queue" icon="queue" />
        ) : null}

        <TabButton active={activeTab === "appointments"} onClick={() => setActiveTab("appointments")} label={role === "patient" ? "My Appointments" : "All Appointments"} icon="calendar" />

        {role === "patient" ? (
          <TabButton active={activeTab === "prescriptions"} onClick={() => setActiveTab("prescriptions")} label="My Prescriptions" icon="pill" />
        ) : null}
      </div>

      {/* Main Tab Content Panel */}
      <main className="min-h-[300px] rounded-b-xl border-x border-b border-cyan-100 bg-white p-6 shadow-soft">
        {actionError ? (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center gap-2">
            <span>⚠️</span> {actionError}
          </div>
        ) : null}
        {actionSuccess ? (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 flex items-center gap-2 animate-pulse">
            <span>✅</span> {actionSuccess}
          </div>
        ) : null}

        {/* Tab 1: Profile & Overview */}
        {activeTab === "profile" && (
          <section className="space-y-6">
            <h3 className="text-xl font-bold text-medical-navy border-b border-slate-100 pb-2">Profile Overview</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <ProfileCard label="Full Name" value={user?.name} icon="user" />
              <ProfileCard label="Email Address" value={user?.email} icon="mail" />
              <ProfileCard label="Phone Number" value={user?.phone || "Not added"} icon="phone" />
            </div>

            {/* Quick Actions Card */}
            <div className="rounded-xl bg-medical-ice border border-cyan-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
              <div>
                <h4 className="text-lg font-bold text-medical-navy">Need medical attention?</h4>
                <p className="text-sm text-slate-600 mt-1">Book an appointment online with our qualified doctors in minutes.</p>
              </div>
              <div className="flex gap-3">
                <Link
                  className="rounded-lg bg-medical-teal hover:bg-medical-blue transition text-white px-5 py-3 text-sm font-semibold shadow-md flex items-center gap-2"
                  to="/booking"
                >
                  Book Appointment Now
                </Link>
                {role === "receptionist" && (
                  <button
                    className="rounded-lg border border-medical-teal text-medical-teal hover:bg-medical-teal hover:text-white transition px-5 py-3 text-sm font-semibold"
                    onClick={() => setActiveTab("queue")}
                  >
                    Go to Queue Triage
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Tab 2: Live Queue (Receptionist only) */}
        {activeTab === "queue" && role === "receptionist" && (
          <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-medical-navy">Emergency Queue Triage</h3>
                <p className="text-sm text-slate-500 mt-1">Input patient symptoms to determine emergency priority score using AI.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Select Department:</span>
                <select
                  className="rounded-lg border border-cyan-100 px-3 py-2 text-sm outline-none focus:border-medical-teal focus:ring-2 focus:ring-medical-mint"
                  value={queueDeptId}
                  onChange={(e) => setQueueDeptId(e.target.value)}
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Triage Form Card */}
            <form onSubmit={handleTriageSubmit} className="rounded-xl border border-cyan-100 bg-medical-ice p-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block text-sm font-medium text-slate-700">
                  Patient ID *
                  <input
                    type="text"
                    required
                    placeholder="e.g. 64b8d7..."
                    value={triageForm.patient_id}
                    onChange={(e) => setTriageForm({ ...triageForm, patient_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-cyan-100 px-3 py-2 text-sm outline-none focus:bg-white"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Doctor ID *
                  <input
                    type="text"
                    required
                    placeholder="e.g. 64b8d9..."
                    value={triageForm.doctor_id}
                    onChange={(e) => setTriageForm({ ...triageForm, doctor_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-cyan-100 px-3 py-2 text-sm outline-none focus:bg-white"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Department ID (Optional)
                  <input
                    type="text"
                    placeholder="Defaults to doctor department"
                    value={triageForm.department_id}
                    onChange={(e) => setTriageForm({ ...triageForm, department_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-cyan-100 px-3 py-2 text-sm outline-none focus:bg-white"
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Symptoms Description *
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe chest pain, breathing difficulties, severity, etc."
                    value={triageForm.symptoms}
                    onChange={(e) => setTriageForm({ ...triageForm, symptoms: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-cyan-100 px-3 py-2 text-sm outline-none focus:bg-white resize-none"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Patient Vitals (Optional)
                  <textarea
                    rows={3}
                    placeholder="BP: 120/80, Temp: 98.6 F, Pulse: 72 bpm"
                    value={triageForm.vitals}
                    onChange={(e) => setTriageForm({ ...triageForm, vitals: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-cyan-100 px-3 py-2 text-sm outline-none focus:bg-white resize-none"
                  />
                </label>
              </div>

              {triageSuccess && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                  {triageSuccess}
                </div>
              )}
              {triageError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">
                  {triageError}
                </div>
              )}

              <button
                type="submit"
                disabled={isTriaging}
                className="rounded-lg bg-medical-teal hover:bg-medical-blue transition text-white px-5 py-2.5 text-sm font-semibold shadow disabled:opacity-50"
              >
                {isTriaging ? "Analyzing and Sorting..." : "Perform AI Triage & Queue"}
              </button>
            </form>

            {/* Department Queue List */}
            <div className="space-y-3">
              <h4 className="font-bold text-medical-navy text-lg">Active Queue Status</h4>
              <div className="overflow-hidden rounded-xl border border-cyan-100">
                {liveQueue.length > 0 ? (
                  liveQueue.map((item) => (
                    <div className="grid gap-4 border-b border-cyan-100 p-4 last:border-b-0 md:grid-cols-[100px_1fr_240px] items-center hover:bg-slate-50 transition" key={item.id}>
                      <div className="text-3xl font-extrabold text-medical-teal flex items-center justify-center bg-medical-mint rounded-lg py-2">
                        #{item.queue_position}
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-medical-navy text-base">Patient: {item.patient_name || item.patient_id}</p>
                        <p className="text-sm text-slate-500">
                          {new Date(item.scheduled_at).toLocaleString()} · {item.reason || "General visit"}
                        </p>
                        <div className="flex gap-2 items-center pt-1">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize border border-slate-200">
                            {item.queue_status}
                          </span>
                          {item.emergency_urgency && (
                            <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                              Urgency {item.emergency_urgency}/5
                            </span>
                          )}
                        </div>
                        {item.emergency_reasoning && (
                          <p className="text-xs text-slate-500 italic mt-1 bg-white p-2 rounded border border-slate-100">
                            <strong>AI Triage:</strong> {item.emergency_reasoning}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <button
                          onClick={() => handleQueueStatusChange(item.id, "waiting")}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                            item.queue_status === "waiting"
                              ? "bg-slate-200 border-slate-300 text-slate-800"
                              : "border-slate-200 text-slate-600 hover:border-slate-400"
                          }`}
                        >
                          Waiting
                        </button>
                        <button
                          onClick={() => handleQueueStatusChange(item.id, "in-progress")}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                            item.queue_status === "in-progress"
                              ? "bg-cyan-100 border-cyan-300 text-cyan-800"
                              : "border-slate-200 text-slate-600 hover:border-cyan-400"
                          }`}
                        >
                          In Progress
                        </button>
                        <button
                          onClick={() => handleQueueStatusChange(item.id, "done")}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                            item.queue_status === "done"
                              ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                              : "border-slate-200 text-slate-600 hover:border-emerald-400"
                          }`}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="p-6 text-center text-sm text-slate-500 bg-slate-50">No patients are currently queued in this department.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Tab 3: Appointments List */}
        {activeTab === "appointments" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xl font-bold text-medical-navy">Appointment Bookings</h3>
              <Link to="/booking" className="rounded-lg bg-medical-teal hover:bg-medical-blue transition text-white px-4 py-2 text-xs font-semibold shadow">
                + New Appointment
              </Link>
            </div>

            {loading ? (
              <p className="text-center py-10 text-sm text-slate-500 animate-pulse">Loading appointments list...</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-cyan-100">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="bg-medical-ice text-xs uppercase tracking-wide text-medical-navy font-bold">
                    <tr>
                      <th className="px-6 py-3 border-b border-cyan-100">Date & Time</th>
                      <th className="px-6 py-3 border-b border-cyan-100">{role === "patient" ? "Doctor" : "Patient"}</th>
                      <th className="px-6 py-3 border-b border-cyan-100">Reason</th>
                      <th className="px-6 py-3 border-b border-cyan-100">Queue Status</th>
                      <th className="px-6 py-3 border-b border-cyan-100">Appt Status</th>
                      {role === "receptionist" ? <th className="px-6 py-3 border-b border-cyan-100 text-right">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-50">
                    {appointments.length > 0 ? (
                      appointments.map((appt) => (
                        <tr className="hover:bg-slate-50 transition" key={appt.id}>
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            {new Date(appt.scheduled_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                          </td>
                          <td className="px-6 py-4">
                            {role === "patient" ? (
                              <span className="font-medium text-medical-navy">{appt.doctor_name || appt.doctor_id}</span>
                            ) : (
                              <span className="font-medium text-slate-700">{appt.patient_name || appt.patient_id}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-600">{appt.reason || "General Checkup"}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded text-xs font-semibold capitalize bg-medical-mint text-medical-teal border border-teal-200">
                              {appt.queue_status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize border ${
                              appt.status === "scheduled" ? "bg-cyan-50 border-cyan-200 text-cyan-700" :
                              appt.status === "checked_in" ? "bg-amber-50 border-amber-200 text-amber-700" :
                              appt.status === "completed" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                              "bg-rose-50 border-rose-200 text-rose-700"
                            }`}>
                              {appt.status}
                            </span>
                          </td>
                          {role === "receptionist" ? (
                            <td className="px-6 py-4 text-right">
                              {appt.status !== "cancelled" && appt.status !== "completed" ? (
                                <button
                                  onClick={() => handleCancelAppointment(appt.id)}
                                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 transition px-3 py-1.5 rounded-lg border border-rose-200"
                                >
                                  Cancel / Delete
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">Inactive</span>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={role === "receptionist" ? 6 : 5} className="px-6 py-10 text-center text-slate-500">
                          No appointments found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Tab 4: Prescriptions (Patient only) */}
        {activeTab === "prescriptions" && role === "patient" && (
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-medical-navy border-b border-slate-100 pb-2">Medical Prescriptions</h3>

            {loading ? (
              <p className="text-center py-10 text-sm text-slate-500 animate-pulse">Loading prescriptions...</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {prescriptions.length > 0 ? (
                  prescriptions.map((pres) => (
                    <div className="rounded-xl border border-cyan-100 bg-white p-5 shadow-sm space-y-4 hover:shadow-soft transition" key={pres.id}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-medical-navy text-base">Prescribed by {pres.doctor_name || "Doctor"}</h4>
                          <p className="text-xs text-slate-500">{new Date(pres.created_at).toLocaleDateString([], { dateStyle: "long" })}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${
                            pres.status === "active" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}>
                            {pres.status}
                          </span>
                          <button
                            onClick={() => handleDownloadPrescription(pres)}
                            className="text-xs font-semibold text-medical-teal hover:underline flex items-center gap-1"
                            type="button"
                          >
                            <span>⬇️</span> PDF
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-dashed border-cyan-50 pt-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Medications</p>
                        <ul className="space-y-2">
                          {pres.medications.map((med, index) => (
                            <li className="text-sm bg-medical-ice rounded p-2.5 border border-cyan-50/50 flex justify-between" key={index}>
                              <div>
                                <span className="font-bold text-medical-navy">{med.name}</span>
                                <span className="text-xs text-slate-500 block">Dosage: {med.dosage}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-semibold text-slate-600 block">{med.frequency}</span>
                                {med.duration && <span className="text-[10px] text-slate-400 block">{med.duration}</span>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {pres.instructions && (
                        <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 text-xs text-slate-700">
                          <strong>Instructions:</strong> {pres.instructions}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="col-span-2 py-10 text-center text-sm text-slate-500">No prescriptions found.</p>
                )}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

// Helper Components
function TabButton({ active, onClick, label, icon }) {
  const getIcon = () => {
    switch (icon) {
      case "profile":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        );
      case "queue":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
        );
      case "calendar":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        );
      case "pill":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-medical-teal text-white shadow-md"
          : "text-slate-600 hover:bg-slate-50 hover:text-medical-teal"
      }`}
    >
      {getIcon()}
      {label}
    </button>
  );
}

function ProfileCard({ label, value, icon }) {
  const getIcon = () => {
    switch (icon) {
      case "user":
        return (
          <svg className="w-5 h-5 text-medical-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        );
      case "mail":
        return (
          <svg className="w-5 h-5 text-medical-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
        );
      case "phone":
        return (
          <svg className="w-5 h-5 text-medical-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl border border-cyan-100 bg-medical-ice p-5 flex items-center gap-4 hover:shadow-soft transition">
      <div className="bg-white p-3 rounded-lg border border-cyan-50 shadow-sm flex items-center justify-center">
        {getIcon()}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-base font-bold text-medical-navy max-w-[200px] truncate">{value}</p>
      </div>
    </div>
  );
}
