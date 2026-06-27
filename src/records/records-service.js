import { getAll, put, remove } from "../db/indexeddb.js";

function nowIso() {
  return new Date().toISOString();
}

export async function createRecord(datos) {
  const timestamp = nowIso();
  const record = {
    id: crypto.randomUUID(),
    datos,
    fecha_creacion: timestamp,
    fecha_modificacion: timestamp
  };
  await put("records", record);
  return record;
}

export async function updateRecord(recordId, datos) {
  const records = await getAll("records");
  const existing = records.find((record) => record.id === recordId);
  if (!existing) {
    throw new Error("Registro no encontrado.");
  }
  const updated = {
    ...existing,
    datos,
    fecha_modificacion: nowIso()
  };
  await put("records", updated);
  return updated;
}

export async function deleteRecord(recordId) {
  await remove("records", recordId);
}

export async function listRecords() {
  const records = await getAll("records");
  return records.sort((a, b) => (a.fecha_creacion < b.fecha_creacion ? 1 : -1));
}

export function filterRecords(records, fields, query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return records;
  }

  return records.filter((record) =>
    fields.some((field) => String(record.datos[field.id] ?? "").toLowerCase().includes(q))
  );
}

export function sortRecords(records, fields, sortConfig) {
  const { key, direction } = sortConfig;
  if (!key) {
    return records;
  }
  const multiplier = direction === "desc" ? -1 : 1;
  return [...records].sort((a, b) => {
    const field = fields.find((item) => item.id === key);
    let valueA = "";
    let valueB = "";

    if (field) {
      valueA = String(a.datos[key] ?? "");
      valueB = String(b.datos[key] ?? "");
    } else if (key === "fecha_modificacion") {
      valueA = a.fecha_modificacion;
      valueB = b.fecha_modificacion;
    }

    if (valueA === valueB) {
      return 0;
    }
    return valueA > valueB ? multiplier : -1 * multiplier;
  });
}
