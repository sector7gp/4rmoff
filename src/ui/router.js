export function setRoleUi(role) {
  const adminSection = document.querySelector("#adminSection");
  const roleBadge = document.querySelector("#roleBadge");

  const isAdmin = role === "admin";

  adminSection.classList.toggle("hidden", !isAdmin);
  roleBadge.textContent = isAdmin ? "Administrador" : "Operador";
  roleBadge.classList.toggle("badge-admin", isAdmin);
  roleBadge.classList.toggle("badge-operator", !isAdmin);
}
