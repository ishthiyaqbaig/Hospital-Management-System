export const roleLabels = {
  admin: "Admin",
  doctor: "Doctor",
  receptionist: "Receptionist",
  patient: "Patient",
};

export const roleRedirects = {
  admin: "/admin",
  doctor: "/doctor",
  receptionist: "/receptionist",
  patient: "/patient",
};

export function getRoleRedirect(role) {
  return roleRedirects[role] || "/login";
}
