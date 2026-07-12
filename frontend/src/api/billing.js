import apiClient from "./client";

export async function listBilling(params = {}) {
  const response = await apiClient.get("/billing", { params });
  return response.data;
}

export async function updateBilling(billingId, payload) {
  const response = await apiClient.patch(`/billing/${billingId}`, payload);
  return response.data;
}

export async function downloadBillingReceipt(billingId) {
  const response = await apiClient.get(`/billing/${billingId}/receipt`, {
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `receipt-${billingId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
}
