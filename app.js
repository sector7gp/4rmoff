import { setConfig } from "./src/db/indexeddb.js";
import { ensurePinInitialized, getDefaultPinInfo, updatePin, verifyPin } from "./src/auth/pin-auth.js";
import {
  addField,
  deleteField,
  ensureDefaultFields,
  listFields,
  moveField,
  updateField
} from "./src/fields/fields-config.js";
import {
  createRecord,
  deleteRecord,
  filterRecords,
  listRecords,
  sortRecords,
  updateRecord
} from "./src/records/records-service.js";
import { buildCsv, buildExportFilename, shareOrDownloadCsv } from "./src/export/csv-export.js";
import { setRoleUi } from "./src/ui/router.js";

const state = {
  role: "operator",
  fields: [],
  records: [],
  filteredRecords: [],
  search: "",
  sort: { key: null, direction: "asc" },
  editingRecordId: null
};

const refs = {
  captureForm: document.querySelector("#captureForm"),
  dynamicFields: document.querySelector("#dynamicFields"),
  captureTitle: document.querySelector("#captureTitle"),
  submitFormBtn: document.querySelector("#submitFormBtn"),
  clearFormBtn: document.querySelector("#clearFormBtn"),
  cancelEditBtn: document.querySelector("#cancelEditBtn"),
  toast: document.querySelector("#toast"),
  adminAccessBtn: document.querySelector("#adminAccessBtn"),
  adminPinDialog: document.querySelector("#adminPinDialog"),
  adminPinForm: document.querySelector("#adminPinForm"),
  adminPinInput: document.querySelector("#adminPinInput"),
  pinError: document.querySelector("#pinError"),
  closePinDialogBtn: document.querySelector("#closePinDialogBtn"),
  adminLogoutBtn: document.querySelector("#adminLogoutBtn"),
  searchInput: document.querySelector("#searchInput"),
  recordsCount: document.querySelector("#recordsCount"),
  recordsTableContainer: document.querySelector("#recordsTableContainer"),
  fieldsConfigList: document.querySelector("#fieldsConfigList"),
  newFieldForm: document.querySelector("#newFieldForm"),
  newFieldName: document.querySelector("#newFieldName"),
  newFieldType: document.querySelector("#newFieldType"),
  newFieldRequired: document.querySelector("#newFieldRequired"),
  exportAllBtn: document.querySelector("#exportAllBtn"),
  exportFilteredBtn: document.querySelector("#exportFilteredBtn"),
  changePinForm: document.querySelector("#changePinForm")
};

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.remove("hidden");
  window.setTimeout(() => {
    refs.toast.classList.add("hidden");
  }, 2200);
}

function showPinError(message) {
  refs.pinError.textContent = message;
  refs.pinError.classList.remove("hidden");
}

function clearPinError() {
  refs.pinError.textContent = "";
  refs.pinError.classList.add("hidden");
}

function formatLockTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function requireAdmin() {
  if (state.role !== "admin") {
    showToast("Accion disponible solo para administrador.");
    return false;
  }
  return true;
}

function fieldInputType(fieldType) {
  if (fieldType === "numero") return "number";
  if (fieldType === "email") return "email";
  if (fieldType === "telefono") return "tel";
  return "text";
}

function renderDynamicForm(prefillData = {}) {
  refs.dynamicFields.innerHTML = "";

  state.fields.forEach((field) => {
    const row = document.createElement("div");
    row.className = "field-row";

    const label = document.createElement("label");
    label.setAttribute("for", `field-${field.id}`);
    label.innerHTML = `${field.nombre}${field.obligatorio ? '<span class="required-mark">*</span>' : ""}`;

    const input = document.createElement("input");
    input.id = `field-${field.id}`;
    input.dataset.fieldId = field.id;
    input.dataset.fieldType = field.tipo;
    input.type = fieldInputType(field.tipo);
    input.value = String(prefillData[field.id] ?? "");
    if (field.obligatorio) {
      input.required = true;
    }
    if (field.tipo === "telefono") {
      input.placeholder = "Solo digitos y guiones";
    }

    row.append(label, input);
    refs.dynamicFields.appendChild(row);
  });
}

function resetCaptureMode() {
  state.editingRecordId = null;
  refs.captureTitle.textContent = "Nuevo registro";
  refs.submitFormBtn.textContent = "Guardar";
  refs.cancelEditBtn.classList.add("hidden");
  renderDynamicForm();
}

function setEditMode(record) {
  state.editingRecordId = record.id;
  refs.captureTitle.textContent = "Editar registro";
  refs.submitFormBtn.textContent = "Guardar cambios";
  refs.cancelEditBtn.classList.remove("hidden");
  renderDynamicForm(record.datos);
}

function collectFormData() {
  const data = {};
  refs.dynamicFields.querySelectorAll("input").forEach((input) => {
    data[input.dataset.fieldId] = input.value.trim();
  });
  return data;
}

function validateByFieldType(field, value) {
  if (!value) {
    return null;
  }
  if (field.tipo === "email") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return `El campo ${field.nombre} no tiene formato de email valido.`;
    }
  }
  if (field.tipo === "telefono") {
    const phoneRegex = /^[0-9-]+$/;
    if (!phoneRegex.test(value)) {
      return `El campo ${field.nombre} solo acepta digitos y guiones.`;
    }
  }
  return null;
}

function validateRecordData(data) {
  for (const field of state.fields) {
    const value = String(data[field.id] ?? "").trim();
    if (field.obligatorio && !value) {
      return `El campo obligatorio ${field.nombre} no puede estar vacio.`;
    }
    const typeValidation = validateByFieldType(field, value);
    if (typeValidation) {
      return typeValidation;
    }
  }
  return null;
}

function computeFilteredRecords() {
  const filtered = filterRecords(state.records, state.fields, state.search);
  state.filteredRecords = sortRecords(filtered, state.fields, state.sort);
}

function renderRecordsTable() {
  computeFilteredRecords();
  refs.recordsCount.textContent = `${state.filteredRecords.length} registros`;

  const headers = state.fields
    .map(
      (field) =>
        `<th><button type="button" data-sort-key="${field.id}">${field.nombre}${state.sort.key === field.id ? (state.sort.direction === "asc" ? " ↑" : " ↓") : ""}</button></th>`
    )
    .join("");

  const rows = state.filteredRecords
    .map((record) => {
      const cols = state.fields.map((field) => `<td>${String(record.datos[field.id] ?? "")}</td>`).join("");
      const modified = new Date(record.fecha_modificacion).toLocaleString();
      return `
        <tr>
          ${cols}
          <td>${modified}</td>
          <td>
            <button class="ghost-btn" type="button" data-action="edit-record" data-record-id="${record.id}">Editar</button>
            <button class="danger-btn" type="button" data-action="delete-record" data-record-id="${record.id}">Eliminar</button>
          </td>
        </tr>
      `;
    })
    .join("");

  refs.recordsTableContainer.innerHTML = `
    <table>
      <thead>
        <tr>
          ${headers}
          <th><button type="button" data-sort-key="fecha_modificacion">Ultima modificacion${state.sort.key === "fecha_modificacion" ? (state.sort.direction === "asc" ? " ↑" : " ↓") : ""}</button></th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="${state.fields.length + 2}" class="muted">Sin registros.</td></tr>`}
      </tbody>
    </table>
  `;
}

function renderFieldConfig() {
  refs.fieldsConfigList.innerHTML = state.fields
    .map(
      (field) => `
      <div class="field-config-item" data-field-id="${field.id}">
        <strong>#${field.orden + 1}</strong>
        <input type="text" data-edit="nombre" value="${field.nombre}" />
        <select data-edit="tipo">
          <option value="texto" ${field.tipo === "texto" ? "selected" : ""}>Texto</option>
          <option value="numero" ${field.tipo === "numero" ? "selected" : ""}>Numero</option>
          <option value="email" ${field.tipo === "email" ? "selected" : ""}>Email</option>
          <option value="telefono" ${field.tipo === "telefono" ? "selected" : ""}>Telefono</option>
        </select>
        <label class="checkbox-label">
          <input type="checkbox" data-edit="obligatorio" ${field.obligatorio ? "checked" : ""} />
          Obligatorio
        </label>
        <div class="field-actions">
          <button class="ghost-btn" type="button" data-action="save-field">Guardar</button>
          <button class="ghost-btn" type="button" data-action="move-up">↑</button>
          <button class="ghost-btn" type="button" data-action="move-down">↓</button>
          <button class="danger-btn" type="button" data-action="delete-field">Eliminar</button>
        </div>
      </div>
    `
    )
    .join("");
}

async function reloadStateAndRender() {
  state.fields = await listFields();
  state.records = await listRecords();
  renderDynamicForm();
  renderFieldConfig();
  renderRecordsTable();
}

async function onSubmitCaptureForm(event) {
  event.preventDefault();
  const data = collectFormData();
  const validationError = validateRecordData(data);
  if (validationError) {
    showToast(validationError);
    return;
  }

  if (state.editingRecordId) {
    if (!requireAdmin()) return;
    await updateRecord(state.editingRecordId, data);
    showToast("Registro actualizado.");
    resetCaptureMode();
  } else {
    await createRecord(data);
    showToast("Registro guardado.");
    refs.captureForm.reset();
  }

  await reloadStateAndRender();
}

async function onAdminPinSubmit(event) {
  event.preventDefault();
  clearPinError();

  const pin = refs.adminPinInput.value.trim();
  if (!pin) {
    showPinError("Ingresa un PIN.");
    return;
  }

  const result = await verifyPin(pin);
  if (result.ok) {
    state.role = "admin";
    setRoleUi("admin");
    refs.adminPinInput.value = "";
    refs.adminPinDialog.close();
    showToast("Modo administrador activado.");
    return;
  }

  if (result.locked) {
    showPinError(`Acceso bloqueado por ${formatLockTime(result.remainingMs)}.`);
    return;
  }

  showPinError(`PIN incorrecto. Intentos restantes: ${result.remainingAttempts}.`);
}

async function onFieldConfigClick(event) {
  const action = event.target.dataset.action;
  if (!action) {
    return;
  }
  if (!requireAdmin()) return;

  const item = event.target.closest("[data-field-id]");
  const fieldId = item?.dataset.fieldId;
  if (!fieldId) {
    return;
  }

  if (action === "save-field") {
    const nombre = item.querySelector('[data-edit="nombre"]').value;
    const tipo = item.querySelector('[data-edit="tipo"]').value;
    const obligatorio = item.querySelector('[data-edit="obligatorio"]').checked;
    await updateField(fieldId, { nombre, tipo, obligatorio });
    showToast("Campo actualizado.");
  } else if (action === "move-up") {
    await moveField(fieldId, "up");
  } else if (action === "move-down") {
    await moveField(fieldId, "down");
  } else if (action === "delete-field") {
    if (state.records.length > 0) {
      const confirmed = window.confirm("Eliminar este campo tambien eliminara esa columna de futuras cargas. Continuar?");
      if (!confirmed) return;
    }
    await deleteField(fieldId);
    showToast("Campo eliminado.");
  }

  await reloadStateAndRender();
}

async function onRecordsTableClick(event) {
  const sortKey = event.target.dataset.sortKey;
  if (sortKey) {
    if (!requireAdmin()) return;
    const sameKey = state.sort.key === sortKey;
    state.sort = { key: sortKey, direction: sameKey && state.sort.direction === "asc" ? "desc" : "asc" };
    renderRecordsTable();
    return;
  }

  const action = event.target.dataset.action;
  if (!action) {
    return;
  }
  if (!requireAdmin()) return;

  const recordId = event.target.dataset.recordId;
  const record = state.records.find((item) => item.id === recordId);
  if (!record) {
    return;
  }

  if (action === "edit-record") {
    setEditMode(record);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (action === "delete-record") {
    const confirmed = window.confirm("Confirma eliminar el registro seleccionado.");
    if (!confirmed) {
      return;
    }
    await deleteRecord(recordId);
    showToast("Registro eliminado.");
    await reloadStateAndRender();
  }
}

async function onCreateField(event) {
  event.preventDefault();
  if (!requireAdmin()) return;

  await addField({
    nombre: refs.newFieldName.value,
    tipo: refs.newFieldType.value,
    obligatorio: refs.newFieldRequired.checked
  });

  refs.newFieldForm.reset();
  showToast("Campo agregado.");
  await reloadStateAndRender();
}

async function onChangePin(event) {
  event.preventDefault();
  if (!requireAdmin()) return;

  const currentPin = document.querySelector("#currentPin").value.trim();
  const newPin = document.querySelector("#newPin").value.trim();
  const confirmPin = document.querySelector("#confirmPin").value.trim();

  if (newPin.length < 4) {
    showToast("El nuevo PIN debe tener al menos 4 digitos.");
    return;
  }
  if (newPin !== confirmPin) {
    showToast("La confirmacion de PIN no coincide.");
    return;
  }

  const result = await updatePin(currentPin, newPin);
  if (!result.ok) {
    showToast(result.error);
    return;
  }

  refs.changePinForm.reset();
  showToast("PIN actualizado correctamente.");
}

async function onExport(records) {
  if (!requireAdmin()) return;
  const csv = buildCsv(state.fields, records);
  const filename = buildExportFilename();
  try {
    const mode = await shareOrDownloadCsv(filename, csv);
    showToast(mode === "shared" ? "CSV compartido." : "CSV descargado.");
  } catch {
    showToast("No fue posible compartir o descargar el CSV.");
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      showToast("Service Worker no disponible.");
    });
  }
}

function bindEvents() {
  refs.captureForm.addEventListener("submit", onSubmitCaptureForm);
  refs.clearFormBtn.addEventListener("click", () => {
    refs.captureForm.reset();
    if (state.editingRecordId) {
      resetCaptureMode();
    }
  });
  refs.cancelEditBtn.addEventListener("click", resetCaptureMode);

  refs.adminAccessBtn.addEventListener("click", () => {
    clearPinError();
    refs.adminPinInput.value = "";
    refs.adminPinDialog.showModal();
  });
  refs.closePinDialogBtn.addEventListener("click", () => refs.adminPinDialog.close());
  refs.adminPinForm.addEventListener("submit", onAdminPinSubmit);
  refs.adminLogoutBtn.addEventListener("click", () => {
    state.role = "operator";
    setRoleUi("operator");
    resetCaptureMode();
    showToast("Sesion admin finalizada.");
  });

  refs.searchInput.addEventListener("input", (event) => {
    if (!requireAdmin()) return;
    state.search = event.target.value;
    renderRecordsTable();
  });

  refs.recordsTableContainer.addEventListener("click", onRecordsTableClick);
  refs.newFieldForm.addEventListener("submit", onCreateField);
  refs.fieldsConfigList.addEventListener("click", onFieldConfigClick);
  refs.changePinForm.addEventListener("submit", onChangePin);
  refs.exportAllBtn.addEventListener("click", () => onExport(state.records));
  refs.exportFilteredBtn.addEventListener("click", () => onExport(state.filteredRecords));
}

async function bootstrap() {
  registerServiceWorker();
  await ensurePinInitialized();
  await ensureDefaultFields();
  await setConfig("version_esquema", 1);
  await reloadStateAndRender();
  setRoleUi("operator");
  bindEvents();
  showToast(`App lista. PIN inicial de fabrica: ${getDefaultPinInfo()}`);
}

bootstrap().catch((error) => {
  console.error(error);
  showToast("Error al iniciar la aplicacion.");
});
