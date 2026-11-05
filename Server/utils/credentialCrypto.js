const crypto = require("crypto");

/**
 * Returns a 32-byte key derived from process.env.CREDENTIAL_ENCRYPTION_KEY
 * or process.env.JWT_SECRET via SHA-256.
 */
function getEncryptionKey() {
  const secret =
    process.env.CREDENTIAL_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    "beaconport-fallback-development-credential-key-32b";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plaintext password using AES-256-GCM.
 * Output format: <iv-hex>:<authTag-hex>:<ciphertext-hex>
 *
 * @param {string} plainText
 * @returns {string}
 */
function encryptCredential(plainText) {
  if (!plainText || typeof plainText !== "string") {
    return null;
  }
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM packed credential string.
 *
 * @param {string} packedCiphertext - Format: <iv-hex>:<authTag-hex>:<ciphertext-hex>
 * @returns {string|null} - Decrypted plaintext or null if invalid/corrupt
 */
function decryptCredential(packedCiphertext) {
  if (!packedCiphertext || typeof packedCiphertext !== "string") {
    return null;
  }

  const parts = packedCiphertext.split(":");
  if (parts.length !== 3) {
    return null;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    return null;
  }
}

/**
 * Generates a default teacher password matching format: BPT-<4-digit number>
 * @returns {string} e.g. "BPT-7482"
 */
function generateTeacherPassword() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `BPT-${num}`;
}

/**
 * Generates a default student password matching format: BPS-<4-digit number>
 * @returns {string} e.g. "BPS-3912"
 */
function generateStudentPassword() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `BPS-${num}`;
}

module.exports = {
  getEncryptionKey,
  encryptCredential,
  decryptCredential,
  generateTeacherPassword,
  generateStudentPassword,
};

