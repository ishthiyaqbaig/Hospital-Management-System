import apiClient from "./client";

export async function listPrescriptions(params = {}) {
  const response = await apiClient.get("/prescriptions", { params });
  return response.data;
}
