import { useEffect, useMemo, useState } from "react";

import { bookAppointment } from "../api/appointments";
import { listDepartments, listDoctors } from "../api/resources";
import { useAuth } from "../context/AuthContext";
import { buildSlots, getNextAvailableDate, isSlotAllowed } from "../utils/availability";

export default function Booking() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    patient_id: user?.role === "patient" ? user.id : "",
    department_id: "",
    doctor_id: "",
    date: new Date().toISOString().slice(0, 10),
    scheduled_at: "",
    reason: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([listDepartments(), listDoctors()])
      .then(([departmentItems, doctorItems]) => {
        setDepartments(departmentItems);
        setDoctors(doctorItems);
      })
      .catch(() => setError("Unable to load booking data."));
  }, []);

  const availableDoctors = useMemo(
    () =>
      form.department_id
        ? doctors.filter((doctor) => doctor.department_id === form.department_id)
        : doctors,
    [doctors, form.department_id]
  );
  const selectedDoctor = useMemo(() => {
    const matchedDoctor = availableDoctors.find((doctor) => doctor.id === form.doctor_id);
    return matchedDoctor || availableDoctors[0] || null;
  }, [availableDoctors, form.doctor_id]);
  const doctorAvailability = selectedDoctor?.availability || [];
  const effectiveDate = useMemo(() => getNextAvailableDate(form.date, doctorAvailability), [form.date, doctorAvailability]);

  useEffect(() => {
    if (!availableDoctors.length) {
      if (form.doctor_id) {
        setForm((current) => ({ ...current, doctor_id: "" }));
      }
      return;
    }

    if (!form.doctor_id || !availableDoctors.some((doctor) => doctor.id === form.doctor_id)) {
      setForm((current) => ({ ...current, doctor_id: availableDoctors[0].id, scheduled_at: "" }));
    }
  }, [availableDoctors, form.doctor_id]);

  useEffect(() => {
    if (!doctorAvailability.length) {
      return;
    }
    if (form.date !== effectiveDate) {
      setForm((current) => ({ ...current, date: effectiveDate, scheduled_at: "" }));
    }
  }, [doctorAvailability.length, effectiveDate, form.date]);

  const slots = buildSlots(effectiveDate).filter((slot) => isSlotAllowed(slot, doctorAvailability));

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!form.scheduled_at) {
      setError("Select an available slot before booking.");
      return;
    }
    try {
      const appointment = await bookAppointment({
        patient_id: form.patient_id,
        doctor_id: form.doctor_id,
        department_id: form.department_id || undefined,
        scheduled_at: form.scheduled_at,
        reason: form.reason || undefined,
      });
      setMessage(`Booked. Queue position ${appointment.queue_position}.`);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to book appointment.");
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <form className="rounded border border-cyan-100 bg-white p-6 shadow-soft" onSubmit={handleSubmit}>
        <p className="text-sm font-semibold uppercase tracking-wide text-medical-teal">
          Appointment Booking
        </p>
        <h2 className="mt-2 text-2xl font-bold text-medical-navy">Select doctor and slot</h2>
        <div className="mt-6 space-y-4">
          <BookingInput label="Patient ID" name="patient_id" onChange={handleChange} value={form.patient_id} />
          <BookingSelect label="Department" name="department_id" onChange={handleChange} value={form.department_id}>
            <option value="">Use doctor department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </BookingSelect>
          <BookingSelect label="Doctor" name="doctor_id" onChange={handleChange} required value={form.doctor_id}>
            <option value="">Select doctor</option>
            {availableDoctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{doctor.name} - {doctor.specialization}</option>
            ))}
          </BookingSelect>
          <BookingInput label="Date" name="date" onChange={handleChange} type="date" value={form.date} />
          <BookingInput label="Reason" name="reason" onChange={handleChange} required={false} value={form.reason} />
        </div>
        {error ? <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
        <button className="mt-5 w-full rounded bg-medical-teal px-4 py-3 text-sm font-semibold text-white hover:bg-medical-blue" type="submit">
          Book appointment
        </button>
      </form>

      <div className="rounded border border-cyan-100 bg-white p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-medical-navy">Available slots</h2>
        <p className="mt-2 text-sm text-slate-500">
          {selectedDoctor
            ? `Showing slots for ${selectedDoctor.name} on ${new Date(effectiveDate).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}.`
            : "Select a doctor to view available time slots."}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {slots.map((slot) => (
            <button
              className={`rounded border px-3 py-3 text-sm font-semibold transition ${
                form.scheduled_at === slot
                  ? "border-medical-teal bg-medical-teal text-white"
                  : "border-cyan-100 bg-medical-ice text-medical-navy hover:border-medical-teal"
              }`}
              key={slot}
              onClick={() => setForm((current) => ({ ...current, scheduled_at: slot }))}
              type="button"
            >
              {new Date(slot).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function BookingInput({ label, required = true, type = "text", ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input className="mt-2 w-full rounded border border-cyan-100 px-3 py-2 text-sm outline-none focus:border-medical-teal focus:ring-2 focus:ring-medical-mint" required={required} type={type} {...props} />
    </label>
  );
}

function BookingSelect({ children, label, required = false, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select className="mt-2 w-full rounded border border-cyan-100 px-3 py-2 text-sm outline-none focus:border-medical-teal focus:ring-2 focus:ring-medical-mint" required={required} {...props}>
        {children}
      </select>
    </label>
  );
}
