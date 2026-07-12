from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.utils.config import get_settings

from app.routers import (
    admin_dashboard,
    appointments,
    auth,
    billing,
    chat,
    departments,
    doctor_dashboard,
    doctors,
    health,
    lab_reports,
    medical_records,
    notifications,
    patients,
    prescriptions,
)
from app.services.database import close_database, connect_database
from app.services.users import ensure_user_indexes


@asynccontextmanager
async def lifespan(_: FastAPI):
    await connect_database()
    await ensure_user_indexes()
    try:
        yield
    finally:
        await close_database()


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin_dashboard.router)
app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(departments.router)
app.include_router(appointments.router)
app.include_router(medical_records.router)
app.include_router(prescriptions.router)
app.include_router(lab_reports.router)
app.include_router(billing.router)
app.include_router(notifications.router)
app.include_router(chat.router)
app.include_router(doctor_dashboard.router)
app.include_router(health.router)
