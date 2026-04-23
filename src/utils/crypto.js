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

function encryptOtpPayload(payload) {
  const plaintext = JSON.stringify(payload);
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    data: [
      ciphertext.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      key.toString('base64'),
    ].join('#&'),
    isEncryption: true,
  };
}

function decryptOtpPayload(payload) {
  if (!payload || payload.isEncryption !== true || typeof payload.data !== 'string') {
    throw new Error('Invalid OTP payload.');
  }

  const parts = payload.data.split('#&');
  if (parts.length !== 4) {
    throw new Error('Invalid OTP payload format.');
  }

  const [ciphertextBase64, ivBase64, authTagBase64, keyBase64] = parts;
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(keyBase64, 'base64'),
    Buffer.from(ivBase64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextBase64, 'base64')),
    decipher.final(),
  ]).toString('utf8');

  return JSON.parse(plaintext);
}

module.exports = {
  decryptOtpPayload,
  decryptStoredField,
  encryptOtpPayload,
  encryptLookupValue,
  encryptSsoPayload,
};
