import apiClient from "./client";

export async function getAdminAnalytics() {
  const response = await apiClient.get("/admin-dashboard/analytics");
  return response.data;
}

export async function generateAdminReport() {
  const response = await apiClient.post("/admin-dashboard/report");
  return response.data;
}
