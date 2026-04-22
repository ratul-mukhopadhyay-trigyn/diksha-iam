require('dotenv').config();
const crypto = require('crypto');

const SUNBIRD_AES_ECB_KEY = Buffer.from('ThisAsISerceKtey');
const SUNBIRD_ENCRYPTION_SALT = process.env.SUNBIRD_ENCRYPTION_SALT;
const SSO_AES_KEY = Buffer.from(process.env.AES_KEY_BASE64, 'base64');

function toJavaBase64(buf) {
  const base64 = buf.toString('base64');
  return base64.match(/.{1,76}/g).join('\n');
}

function encryptLookupValue(inputValue) {
  if (!inputValue) return inputValue;

  let value = String(inputValue).toLowerCase();
  for (let i = 0; i < 3; i++) {
    const cipher = crypto.createCipheriv('aes-128-ecb', SUNBIRD_AES_ECB_KEY, null);
    const encrypted = Buffer.concat([
      cipher.update(`${SUNBIRD_ENCRYPTION_SALT}${value}`, 'utf8'),
      cipher.final(),
    ]);
    value = toJavaBase64(encrypted);
  }

  return value;
}

function decryptStoredField(encryptedValue, fieldName = 'unknown') {
  if (!encryptedValue) return encryptedValue;

  let value = String(encryptedValue).replace(/\\n/g, '').replace(/\s+/g, '');
  try {
    for (let i = 0; i < 3; i++) {
      const decipher = crypto.createDecipheriv('aes-128-ecb', SUNBIRD_AES_ECB_KEY, null);
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(value, 'base64')),
        decipher.final(),
      ]);
      value = decrypted.toString('utf8').substring(SUNBIRD_ENCRYPTION_SALT.length);
    }
    return value;
  } catch (err) {
    console.warn(`Could not decrypt field "${fieldName}": ${err.message}`);
    return encryptedValue;
  }
}

function encryptSsoPayload(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', SSO_AES_KEY, iv);
  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, authTag]).toString('base64');
}

module.exports = {
  decryptStoredField,
  encryptLookupValue,
  encryptSsoPayload,
};
