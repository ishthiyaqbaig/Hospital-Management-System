import apiClient from "./client";

export async function listDepartments() {
  const response = await apiClient.get("/departments", {
    params: { page: 1, page_size: 100 },
  });
  return response.data.items;
}

export async function listDoctors() {
  const response = await apiClient.get("/doctors", {
    params: { page: 1, page_size: 100 },
  });
  return response.data.items;
}
