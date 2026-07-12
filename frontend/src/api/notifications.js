import apiClient from "./client";

export async function listNotifications(params = {}) {
  const response = await apiClient.get("/notifications", { params });
  return response.data;
}

export async function updateNotification(notificationId, payload) {
  const response = await apiClient.patch(`/notifications/${notificationId}`, payload);
  return response.data;
}
