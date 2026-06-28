import { batchPut, getAll, put, remove } from "../db/indexeddb.js";

const ALLOWED_TYPES = new Set(["texto", "numero", "email", "dni", "telefono"]);

const DEFAULT_FIELDS = [
  { id: crypto.randomUUID(), nombre: "Nombre", tipo: "texto", obligatorio: true, orden: 0 },
  { id: crypto.randomUUID(), nombre: "Apellido", tipo: "texto", obligatorio: true, orden: 1 },
  { id: crypto.randomUUID(), nombre: "DNI", tipo: "dni", obligatorio: true, orden: 2 },
  { id: crypto.randomUUID(), nombre: "Email", tipo: "email", obligatorio: true, orden: 3 }
];

function normalizeOrder(fields) {
  return [...fields]
    .sort((a, b) => a.orden - b.orden)
    .map((field, index) => ({ ...field, orden: index }));
}

function validateFieldInput(field) {
  if (!field.nombre || !field.nombre.trim()) {
    throw new Error("El nombre del campo es obligatorio.");
  }
  if (!ALLOWED_TYPES.has(field.tipo)) {
    throw new Error("Tipo de campo invalido.");
  }
}

export async function ensureDefaultFields() {
  const existing = await getAll("fields");
  if (existing.length) {
    return;
  }
  await batchPut("fields", DEFAULT_FIELDS);
}

export async function listFields() {
  const fields = await getAll("fields");
  return normalizeOrder(fields);
}

export async function addField({ nombre, tipo, obligatorio }) {
  const fields = await listFields();
  const field = {
    id: crypto.randomUUID(),
    nombre: nombre.trim(),
    tipo,
    obligatorio: true,
    orden: fields.length
  };
  validateFieldInput(field);
  await put("fields", field);
  return field;
}

export async function updateField(fieldId, patch) {
  const fields = await listFields();
  const existing = fields.find((field) => field.id === fieldId);
  if (!existing) {
    throw new Error("Campo no encontrado.");
  }

  const updated = {
    ...existing,
    ...patch,
    nombre: patch.nombre !== undefined ? patch.nombre.trim() : existing.nombre,
    obligatorio: true
  };
  validateFieldInput(updated);
  await put("fields", updated);
  return updated;
}

export async function deleteField(fieldId) {
  await remove("fields", fieldId);
  const fields = await listFields();
  const normalized = normalizeOrder(fields);
  await batchPut("fields", normalized);
}

export async function moveField(fieldId, direction) {
  const fields = await listFields();
  const index = fields.findIndex((field) => field.id === fieldId);
  if (index === -1) {
    throw new Error("Campo no encontrado.");
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= fields.length) {
    return fields;
  }

  const swapped = [...fields];
  [swapped[index], swapped[targetIndex]] = [swapped[targetIndex], swapped[index]];
  const normalized = normalizeOrder(swapped);
  await batchPut("fields", normalized);
  return normalized;
}
