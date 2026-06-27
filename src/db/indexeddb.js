const DB_NAME = "4rmoff_db";
const DB_VERSION = 1;

const STORE_FIELDS = "campos_config";
const STORE_RECORDS = "registros";
const STORE_CONFIG = "config_app";

let dbPromise;

function openDatabase() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_FIELDS)) {
        db.createObjectStore(STORE_FIELDS, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        db.createObjectStore(STORE_RECORDS, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("No se pudo abrir IndexedDB"));
  });

  return dbPromise;
}

function txDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Error de transaccion"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Transaccion abortada"));
  });
}

function storeNamesFor(storeName) {
  return {
    fields: STORE_FIELDS,
    records: STORE_RECORDS,
    config: STORE_CONFIG
  }[storeName];
}

export async function getAll(storeName) {
  const db = await openDatabase();
  const store = storeNamesFor(storeName);
  const tx = db.transaction(store, "readonly");
  const request = tx.objectStore(store).getAll();
  const result = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error ?? new Error("Error al leer store"));
  });
  await txDone(tx);
  return result;
}

export async function getById(storeName, id) {
  const db = await openDatabase();
  const store = storeNamesFor(storeName);
  const tx = db.transaction(store, "readonly");
  const request = tx.objectStore(store).get(id);
  const result = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error ?? new Error("Error al buscar por id"));
  });
  await txDone(tx);
  return result;
}

export async function put(storeName, value) {
  const db = await openDatabase();
  const store = storeNamesFor(storeName);
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).put(value);
  await txDone(tx);
  return value;
}

export async function remove(storeName, id) {
  const db = await openDatabase();
  const store = storeNamesFor(storeName);
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).delete(id);
  await txDone(tx);
}

export async function clear(storeName) {
  const db = await openDatabase();
  const store = storeNamesFor(storeName);
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).clear();
  await txDone(tx);
}

export async function getConfig(key, fallback = null) {
  const entry = await getById("config", key);
  return entry ? entry.value : fallback;
}

export async function setConfig(key, value) {
  return put("config", { key, value });
}

export async function batchPut(storeName, values) {
  const db = await openDatabase();
  const store = storeNamesFor(storeName);
  const tx = db.transaction(store, "readwrite");
  const objectStore = tx.objectStore(store);
  values.forEach((value) => objectStore.put(value));
  await txDone(tx);
}
