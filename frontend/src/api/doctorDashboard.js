import apiClient from "./client";

export async function getDoctorToday() {
  const response = await apiClient.get("/doctor-dashboard/today");
  return response.data;
}

export async function getPatientRecords(patientId) {
  const response = await apiClient.get(`/doctor-dashboard/patients/${patientId}/records`);
  return response.data;
}

export async function summarizePatientRecords(patientId) {
  const response = await apiClient.post(`/doctor-dashboard/patients/${patientId}/summary`);
  return response.data;
}

export async function createPrescription(payload) {
  const response = await apiClient.post("/prescriptions", payload);
  return response.data;
}
