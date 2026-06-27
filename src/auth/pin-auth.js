import { getConfig, setConfig } from "../db/indexeddb.js";

const DEFAULT_PIN = "1234";
const HASH_ALGO = "SHA-256";
const PBKDF2_ITERATIONS = 120000;
const LOCKOUT_WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function toBase64(bytes) {
  let str = "";
  bytes.forEach((byte) => {
    str += String.fromCharCode(byte);
  });
  return btoa(str);
}

function fromBase64(base64) {
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function deriveHash(pin, saltBase64, iterations = PBKDF2_ITERATIONS) {
  const encoder = new TextEncoder();
  const pinKey = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: fromBase64(saltBase64),
      iterations,
      hash: HASH_ALGO
    },
    pinKey,
    256
  );
  return toBase64(new Uint8Array(bits));
}

async function createPinHashPayload(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltBase64 = toBase64(salt);
  const hashBase64 = await deriveHash(pin, saltBase64);
  return {
    algo: "PBKDF2",
    hash: HASH_ALGO,
    iterations: PBKDF2_ITERATIONS,
    salt: saltBase64,
    value: hashBase64
  };
}

async function getPinData() {
  return getConfig("pin_hash");
}

async function setPinData(data) {
  return setConfig("pin_hash", data);
}

async function getLockState() {
  return (
    (await getConfig("lock_state", {
      failedAttempts: 0,
      lockedUntil: 0
    })) ?? {
      failedAttempts: 0,
      lockedUntil: 0
    }
  );
}

async function setLockState(state) {
  return setConfig("lock_state", state);
}

export async function ensurePinInitialized() {
  const existing = await getPinData();
  if (existing) {
    return;
  }
  const payload = await createPinHashPayload(DEFAULT_PIN);
  await setPinData(payload);
}

export async function verifyPin(pin) {
  const lockState = await getLockState();
  const now = Date.now();

  if (lockState.lockedUntil > now) {
    return {
      ok: false,
      locked: true,
      remainingMs: lockState.lockedUntil - now
    };
  }

  const pinData = await getPinData();
  if (!pinData) {
    return { ok: false, locked: false, error: "PIN no inicializado." };
  }

  const computedHash = await deriveHash(pin, pinData.salt, pinData.iterations);
  if (computedHash === pinData.value) {
    await setLockState({ failedAttempts: 0, lockedUntil: 0 });
    return { ok: true, locked: false };
  }

  const failedAttempts = (lockState.failedAttempts ?? 0) + 1;
  const shouldLock = failedAttempts >= MAX_ATTEMPTS;
  const lockedUntil = shouldLock ? now + LOCKOUT_WINDOW_MS : 0;

  await setLockState({
    failedAttempts: shouldLock ? 0 : failedAttempts,
    lockedUntil
  });

  return {
    ok: false,
    locked: shouldLock,
    remainingAttempts: shouldLock ? 0 : MAX_ATTEMPTS - failedAttempts,
    remainingMs: shouldLock ? LOCKOUT_WINDOW_MS : 0
  };
}

export async function updatePin(currentPin, newPin) {
  const currentValid = await verifyPin(currentPin);
  if (!currentValid.ok) {
    return { ok: false, error: "PIN actual incorrecto." };
  }

  const payload = await createPinHashPayload(newPin);
  await setPinData(payload);
  await setLockState({ failedAttempts: 0, lockedUntil: 0 });
  return { ok: true };
}

export function getDefaultPinInfo() {
  return DEFAULT_PIN;
}
