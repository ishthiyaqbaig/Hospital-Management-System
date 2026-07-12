import apiClient from "./client";

export async function bookAppointment(payload) {
  const response = await apiClient.post("/appointments/book", payload);
  return response.data;
}

export async function createEmergencyIntake(payload) {
  const response = await apiClient.post("/appointments/emergency-intake", payload);
  return response.data;
}

export async function getDepartmentQueue(departmentId, page = 1, pageSize = 50) {
  const response = await apiClient.get(`/appointments/queue/${departmentId}`, {
    params: { page, page_size: pageSize },
  });
  return response.data;
}

export async function updateQueueStatus(appointmentId, queueStatus) {
  const response = await apiClient.patch(
    `/appointments/${appointmentId}/queue-status`,
    { queue_status: queueStatus }
  );
  return response.data;
}

export async function listAppointments(params = {}) {
  const response = await apiClient.get("/appointments", { params });
  return response.data;
}

export async function deleteAppointment(appointmentId) {
  const response = await apiClient.delete(`/appointments/${appointmentId}`);
  return response.data;
}

export async function updateAppointment(appointmentId, payload) {
  const response = await apiClient.patch(`/appointments/${appointmentId}`, payload);
  return response.data;
}



