const crypto = require("crypto");

// Must be 32 bytes (64 hex characters)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; 
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypt plain text using AES-256-CBC
 * @param {string} text - string to encrypt
 * @returns {string} encrypted string in the format "iv:encrypted"
 */
function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, "hex");
  const cipher = crypto.createCipheriv("aes-256-cbc", keyBuffer, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt cipher text using AES-256-CBC
 * @param {string} text - encrypted text in format "iv:encrypted"
 * @returns {string} decrypted plain text
 */
function decrypt(text) {
  if (!text) return null;
  const textParts = text.split(":");
  if (textParts.length !== 2) return null;
  
  const iv = Buffer.from(textParts.shift(), "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, "hex");
  
  const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuffer, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = {
  encrypt,
  decrypt
};
