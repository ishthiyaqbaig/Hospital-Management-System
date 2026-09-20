import { useEffect, useState } from "react";

import {
  createMedicalRecord,
  createPrescription,
  getDoctorToday,
  getPatientRecords,
  summarizePatientRecords,
} from "../api/doctorDashboard";
import { updateAppointment } from "../api/appointments";

const emptyMedication = { name: "", dosage: "", frequency: "", duration: "" };
const emptyClinicalRecord = { diagnosis: "", symptoms: "", notes: "" };

export default function DoctorDashboard() {
  const [doctorId, setDoctorId] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState({ patient: null, records: [] });
  const [summary, setSummary] = useState(null);
  const [clinicalRecord, setClinicalRecord] = useState(emptyClinicalRecord);
  const [medication, setMedication] = useState(emptyMedication);
  const [instructions, setInstructions] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    getDoctorToday()
      .then((data) => {
        setDoctorId(data.doctor_id);
        setAppointments(data.appointments);
        if (data.appointments[0]) {
          selectAppointment(data.appointments[0]);
        }
      })
      .catch((err) => setError(err.response?.data?.detail || "Unable to load dashboard."));
  }, []);

  const selectAppointment = async (appointment) => {
    setSelected(appointment);
    setSummary(null);
    setNotice("");
    setError("");
    try {
      setHistory(await getPatientRecords(appointment.patient_id));
    } catch {
      setHistory({ patient: null, records: [] });
      setError("Unable to load patient records.");
    }
  };

  const handleSummary = async () => {
    if (!selected) {
      return;
    }
    setIsSummarizing(true);
    setError("");
    try {
      const data = await summarizePatientRecords(selected.patient_id);
      setSummary(data.summary);
    } catch {
      setError("Unable to generate AI summary.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleMedicationChange = (event) => {
    setMedication((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleClinicalRecordChange = (event) => {
    setClinicalRecord((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleClinicalRecord = async (event) => {
    event.preventDefault();
    if (!selected) {
      return;
    }
    setError("");
    setNotice("");
    try {
      const symptoms = clinicalRecord.symptoms
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      await createMedicalRecord({
        patient_id: selected.patient_id,
        doctor_id: doctorId,
        appointment_id: selected.id,
        diagnosis: clinicalRecord.diagnosis,
        symptoms,
        notes: clinicalRecord.notes || undefined,
      });
      setClinicalRecord(emptyClinicalRecord);
      setSummary(null);
      setHistory(await getPatientRecords(selected.patient_id));
      setNotice("Medical history record saved.");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to save medical history record.");
    }
  };

  const handlePrescription = async (event) => {
    event.preventDefault();
    if (!selected) {
      return;
    }
    setError("");
    setNotice("");
    try {
      await createPrescription({
        patient_id: selected.patient_id,
        doctor_id: doctorId,
        appointment_id: selected.id,
        medications: [medication],
        instructions: instructions || undefined,
      });
      setMedication(emptyMedication);
      setInstructions("");
      setNotice("Prescription saved.");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to save prescription.");
    }
  };

  const handleCompleteAppointment = async () => {
    if (!selected) {
      return;
    }
    setError("");
    setNotice("");
    try {
      const updated = await updateAppointment(selected.id, { status: "completed" });
      setNotice("Consultation marked as completed. Billing invoice has been generated.");
      setSelected(updated);
      setAppointments((current) =>
        current.map((appt) => (appt.id === selected.id ? { ...appt, status: "completed" } : appt))
      );
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to complete appointment.");
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="rounded border border-cyan-100 bg-white p-6 shadow-soft">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-medical-teal">
            Doctor Dashboard
          </p>
          <h2 className="mt-2 text-2xl font-bold text-medical-navy">
            Active & Upcoming Appointments
          </h2>
        </div>
        {error ? <StatusMessage tone="error" text={error} /> : null}
        <div className="overflow-hidden rounded border border-cyan-100">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-medical-ice text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr
                  className={`cursor-pointer border-t border-cyan-100 hover:bg-cyan-50 ${
                    selected?.id === appointment.id ? "bg-medical-mint" : ""
                  }`}
                  key={appointment.id}
                  onClick={() => selectAppointment(appointment)}
                >
                  <td className="px-4 py-3 font-semibold text-medical-navy">
                    {formatTime(appointment.scheduled_at)}
                  </td>
                  <td className="px-4 py-3">
                    {appointment.patient_name || appointment.patient_id}
                  </td>
                  <td className="px-4 py-3">{appointment.reason || "General visit"}</td>
                  <td className="px-4 py-3">{appointment.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!appointments.length ? (
            <p className="p-6 text-sm text-slate-600">No appointments scheduled today.</p>
          ) : null}
        </div>
      </div>

      <aside className="rounded border border-cyan-100 bg-white p-5 shadow-soft">
        {!selected ? (
          <p className="text-sm text-slate-600">Select an appointment to view records.</p>
        ) : (
          <>
            <h3 className="text-lg font-bold text-medical-navy">
              {history.patient?.name || selected.patient_name || "Patient"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{selected.patient_id}</p>

            <div className="mt-3 flex items-center justify-between gap-2 border-b border-cyan-50 pb-3">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border ${
                selected.status === "completed"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : selected.status === "cancelled"
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : "bg-cyan-50 border-cyan-200 text-cyan-700"
              }`}>
                Status: {selected.status}
              </span>
              {selected.status !== "completed" && selected.status !== "cancelled" ? (
                <button
                  onClick={handleCompleteAppointment}
                  className="rounded bg-emerald-600 hover:bg-emerald-700 transition text-white px-3 py-1.5 text-xs font-semibold shadow"
                  type="button"
                >
                  Complete Consultation
                </button>
              ) : null}
            </div>
            {notice ? <StatusMessage text={notice} tone="success" /> : null}

            <div className="mt-5 flex items-center justify-between gap-3">
              <h4 className="font-semibold text-medical-navy">History</h4>
              <button
                className="rounded border border-cyan-100 px-3 py-2 text-xs font-semibold text-medical-navy hover:border-medical-teal hover:text-medical-teal disabled:opacity-60"
                disabled={isSummarizing || !history.records.length}
                onClick={handleSummary}
                type="button"
              >
                {isSummarizing ? "Summarizing" : "AI summary"}
              </button>
            </div>

            {summary ? <SummaryPanel summary={summary} /> : null}
            <RecordList records={history.records} />

            <form className="mt-6 border-t border-cyan-100 pt-5" onSubmit={handleClinicalRecord}>
              <h4 className="font-semibold text-medical-navy">Add clinical history</h4>
              <div className="mt-3 grid gap-3">
                <FormInput
                  label="Diagnosis"
                  name="diagnosis"
                  onChange={handleClinicalRecordChange}
                  value={clinicalRecord.diagnosis}
                />
                <FormInput
                  label="Symptoms"
                  name="symptoms"
                  onChange={handleClinicalRecordChange}
                  placeholder="Comma separated"
                  required={false}
                  value={clinicalRecord.symptoms}
                />
                <label className="text-sm font-medium text-slate-700">
                  Notes
                  <textarea
                    className="mt-2 min-h-20 w-full rounded border border-cyan-100 px-3 py-2 text-sm outline-none focus:border-medical-teal focus:ring-2 focus:ring-medical-mint"
                    name="notes"
                    onChange={handleClinicalRecordChange}
                    value={clinicalRecord.notes}
                  />
                </label>
              </div>
              <button className="mt-4 w-full rounded border border-medical-teal px-4 py-3 text-sm font-semibold text-medical-teal hover:bg-medical-teal hover:text-white" type="submit">
                Save history record
              </button>
            </form>

            <form className="mt-6 border-t border-cyan-100 pt-5" onSubmit={handlePrescription}>
              <h4 className="font-semibold text-medical-navy">Write prescription</h4>
              <div className="mt-3 grid gap-3">
                <FormInput label="Medication" name="name" onChange={handleMedicationChange} value={medication.name} />
                <FormInput label="Dosage" name="dosage" onChange={handleMedicationChange} value={medication.dosage} />
                <FormInput label="Frequency" name="frequency" onChange={handleMedicationChange} value={medication.frequency} />
                <FormInput label="Duration" name="duration" onChange={handleMedicationChange} required={false} value={medication.duration} />
                <label className="text-sm font-medium text-slate-700">
                  Instructions
                  <textarea
                    className="mt-2 min-h-20 w-full rounded border border-cyan-100 px-3 py-2 text-sm outline-none focus:border-medical-teal focus:ring-2 focus:ring-medical-mint"
                    onChange={(event) => setInstructions(event.target.value)}
                    value={instructions}
                  />
                </label>
              </div>
              <button className="mt-4 w-full rounded bg-medical-teal px-4 py-3 text-sm font-semibold text-white hover:bg-medical-blue" type="submit">
                Save prescription
              </button>
            </form>
          </>
        )}
      </aside>
    </section>
  );
}

function RecordList({ records }) {
  if (!records.length) {
    return <p className="mt-3 rounded bg-medical-ice p-3 text-sm text-slate-600">No medical records found.</p>;
  }
  return (
    <div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
      {records.map((record) => (
        <article className="rounded border border-cyan-100 p-3 text-sm" key={record.id}>
          <p className="font-semibold text-medical-navy">{record.diagnosis}</p>
          <p className="mt-1 text-slate-600">{record.notes || "No notes"}</p>
          <p className="mt-2 text-xs text-slate-500">{formatDate(record.created_at)}</p>
        </article>
      ))}
    </div>
  );
}

function SummaryPanel({ summary }) {
  return (
    <div className="mt-3 rounded border border-cyan-100 bg-medical-ice p-3 text-sm text-slate-700">
      <p className="font-semibold text-medical-navy">{summary.summary || "Summary ready"}</p>
      {["key_conditions", "medications", "risks"].map((key) =>
        summary[key]?.length ? (
          <p className="mt-2" key={key}>
            <span className="font-semibold">{key.replace("_", " ")}:</span>{" "}
            {summary[key].join(", ")}
          </p>
        ) : null
      )}
    </div>
  );
}

function FormInput({ label, required = true, ...props }) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input
        className="mt-2 w-full rounded border border-cyan-100 px-3 py-2 text-sm outline-none focus:border-medical-teal focus:ring-2 focus:ring-medical-mint"
        required={required}
        {...props}
      />
    </label>
  );
}

function StatusMessage({ text, tone = "error" }) {
  const style =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";
  return <p className={`mt-4 rounded border p-3 text-sm ${style}`}>{text}</p>;
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}
