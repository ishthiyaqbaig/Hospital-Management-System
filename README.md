# MediFlow AI

Full-stack skeleton for an AI-assisted hospital management system.

## Stack

- Backend: FastAPI, Motor, Pydantic v2, python-dotenv, python-jose, passlib
- Frontend: React, Vite, Tailwind CSS, React Router, Axios, Recharts
- Database: MongoDB via `MONGO_URI`

## Environment

Copy `.env.example` to `.env` and fill in real values. Secrets are read from environment variables only and should never be hardcoded.

Required backend variables:

- `MONGO_URI`
- `GEMINI_API_KEY`
- `JWT_SECRET`

Optional:

- `CORS_ORIGINS`, comma-separated frontend origins

For the frontend, copy `frontend/.env.example` to `frontend/.env` if the backend URL differs from the default.

## Run Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health check:

```text
GET http://localhost:8000/health
```

Auth routes:

```text
POST http://localhost:8000/auth/register
POST http://localhost:8000/auth/login
GET  http://localhost:8000/auth/me
```

Supported roles:

```text
admin, doctor, receptionist, patient
```

CRUD collections:

```text
/patients
/doctors
/departments
/appointments
/medical-records
/prescriptions
/lab-reports
/billing
/notifications
```

Each collection supports:

```text
POST /collection
GET /collection?page=1&page_size=20
GET /collection/{id}
PATCH /collection/{id}
DELETE /collection/{id}
```

Role guard highlights:

```text
receptionist: creates appointments and billing
doctor: writes medical records, prescriptions, and lab reports
admin: manages doctors, departments, and destructive deletes
patient: read-only access where patient-facing data is enabled
```

Appointment booking flow:

```text
POST  /appointments/book
GET   /appointments/queue/{department_id}?page=1&page_size=20
PATCH /appointments/{appointment_id}/queue-status
```

Doctor availability supports simple rules such as:

```text
monday
monday:09:00-17:00
09:00-17:00
```

Booking checks the selected doctor's availability, rejects an already-booked
doctor/slot pair, and assigns the next queue position for the department on
that appointment date.

AI service:

```text
backend/app/services/ai_service.py
```

Reusable Gemini-backed functions:

```text
predict_queue_time(department, current_queue_len, avg_consult_time)
suggest_appointment_slot(doctor_schedule, patient_urgency)
summarize_patient_history(medical_records_list)
prioritize_emergency(symptom_text)
generate_report(hospital_stats)
```

The service reads `GEMINI_API_KEY` from env, supports optional `GEMINI_MODEL`,
requests JSON-only Gemini responses, retries failed calls, and stores completed
or failed runs in the `ai_reports` MongoDB collection.

Patient chat:

```text
POST /chat
```

The chat endpoint is patient-only. It sends Gemini only this patient context:

```text
name
upcoming appointments
recent prescriptions
```

Responses are restricted to hospital-related Q&A. The prompt blocks diagnosis
and treatment advice, and redirects medical questions to consult the patient's
doctor. Exchanges are stored in `chat_history`.

Doctor dashboard:

```text
GET  /doctor-dashboard/today
GET  /doctor-dashboard/patients/{patient_id}/records
POST /doctor-dashboard/patients/{patient_id}/summary
POST /prescriptions
```

The doctor dashboard shows today's appointments, a read-only patient record
side panel, an AI summary action backed by `summarize_patient_history`, and a
prescription form linked to the selected patient and appointment.

Admin dashboard:

```text
GET  /admin-dashboard/analytics
POST /admin-dashboard/report
```

Analytics are computed with MongoDB aggregation pipelines for patient volume,
doctor utilization, department load, average wait time, and billing revenue.
The report endpoint sends the aggregated stats to `generate_report`; the
frontend renders the summary and supports text/PDF downloads.

## Run Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Project Layout

```text
backend/
  app/
    models/
    routers/
    services/
    utils/
frontend/
  src/
    api/
    components/
    pages/
    routes/
```
