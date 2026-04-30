const crypto = require('crypto');
const { execute } = require('../db/cassandra');
const { encryptLookupValue, encryptStoredField } = require('../utils/crypto');
const { HttpError } = require('./sso.service');

const LOOKUP_USER_QUERY = `
  SELECT userid
  FROM user_lookup
  WHERE type = ? AND value = ?
`;

const USER_BY_ID_QUERY = `
  SELECT *
  FROM user
  WHERE id = ?
`;

const USERNAME_CANDIDATES_PER_ITERATION = 10;
const USERNAME_MAX_ITERATIONS = 10;

function nowUtcString() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '+0000');
}

function toCanonicalId(inputId) {
  if (inputId && typeof inputId === 'string') {
    return inputId.trim();
  }
  return crypto.randomUUID();
}

function normalizeForLookup(value) {
  return String(value).trim().toLowerCase();
}

function normalizeForStorage(value, field) {
  if (value == null) return value;
  const stringValue = String(value).trim();
  if (field === 'email' || field === 'username') {
    return stringValue.toLowerCase();
  }
  return stringValue;
}

function getUsernameSuffixLength() {
  const configured =
    process.env.sunbird_username_num_digits ?? process.env.SUNBIRD_USERNAME_NUM_DIGITS ?? '4';
  const parsed = Number.parseInt(String(configured).trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 4;
}

function slugifyName(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function normalizeUsernameBase(firstname, lastname) {
  const fullName = `${firstname ?? ''} ${lastname ?? ''}`.trim();
  const slug = slugifyName(fullName).replace(/-+/g, '');
  return slug;
}

function randomAlphaNumericLower(length) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  let output = '';
  for (let i = 0; i < bytes.length; i += 1) {
    output += alphabet[bytes[i] % alphabet.length];
  }
  return output;
}

function generateUsernameCandidates(base, suffixLength) {
  const candidates = [];
  for (let i = 0; i < USERNAME_CANDIDATES_PER_ITERATION; i += 1) {
    candidates.push(`${base}_${randomAlphaNumericLower(suffixLength)}`);
  }
  return candidates;
}

function mapEncryptedUserFields(data) {
  const next = { ...data };
  ['email', 'phone', 'username'].forEach((field) => {
    if (next[field] != null) {
      const normalized = normalizeForStorage(next[field], field);
      next[field] = encryptStoredField(normalized);
    }
  });
  return next;
}

async function fetchUserById(id) {
  const result = await execute(USER_BY_ID_QUERY, [id]);
  return result.rows[0] ?? null;
}

async function lookupUserIdByTypeValue(type, value) {
  const encryptedLookupValue = encryptLookupValue(normalizeForLookup(value));
  const result = await execute(LOOKUP_USER_QUERY, [type, encryptedLookupValue]);
  return result.rows[0]?.userid ?? null;
}

async function ensureLookupIsUnique(type, value, currentUserId = null) {
  if (value == null || value === '') return;
  const existingUserId = await lookupUserIdByTypeValue(type, value);
  if (!existingUserId) return;
  if (currentUserId && existingUserId === currentUserId) return;
  throw new HttpError(409, 'User exist');
}

async function resolveUsernameForCreate(payload) {
  if (payload.username != null && String(payload.username).trim() !== '') {
    const providedUsername = normalizeForStorage(payload.username, 'username');
    await ensureLookupIsUnique('username', providedUsername);
    return providedUsername;
  }

  const base = normalizeUsernameBase(payload.firstname, payload.lastname);
  if (!base) {
    throw new HttpError(400, 'firstname is required for username generation.');
  }

  const suffixLength = getUsernameSuffixLength();
  for (let i = 0; i < USERNAME_MAX_ITERATIONS; i += 1) {
    const candidates = generateUsernameCandidates(base, suffixLength);
    for (const candidate of candidates) {
      const existingUserId = await lookupUserIdByTypeValue('username', candidate);
      if (!existingUserId) {
        return candidate;
      }
    }
  }

  throw new HttpError(500, 'Unable to generate unique username, please retry.');
}

async function upsertLookup(type, value, userId) {
  if (value == null || value === '') return null;
  const encryptedLookupValue = encryptLookupValue(normalizeForLookup(value));
  await execute(
    'INSERT INTO user_lookup (type, value, userid) VALUES (?, ?, ?)',
    [type, encryptedLookupValue, userId],
  );
  return encryptedLookupValue;
}

async function deleteLookup(type, encryptedValue) {
  if (!encryptedValue) return;
  await execute('DELETE FROM user_lookup WHERE type = ? AND value = ?', [type, encryptedValue]);
}

function buildInsertUserStatement(data) {
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const query = `INSERT INTO user (${keys.join(', ')}) VALUES (${placeholders})`;
  const params = keys.map((key) => data[key]);
  return { query, params };
}

function buildUpdateUserStatement(id, data) {
  const keys = Object.keys(data);
  if (keys.length === 0) {
    throw new HttpError(400, 'No editable fields provided.');
  }
  const setClause = keys.map((key) => `${key} = ?`).join(', ');
  const query = `UPDATE user SET ${setClause} WHERE id = ?`;
  const params = keys.map((key) => data[key]);
  params.push(id);
  return { query, params };
}

function applyDobMirror(data) {
  const next = { ...data };
  if (next.dob != null && next.dateofbirth == null) {
    next.dateofbirth = next.dob;
  } else if (next.dateofbirth != null && next.dob == null) {
    next.dob = next.dateofbirth;
  }
  return next;
}

function rejectImmutableFields(data) {
  if (Object.prototype.hasOwnProperty.call(data, 'id') || Object.prototype.hasOwnProperty.call(data, 'userid')) {
    throw new HttpError(400, 'id and userid are immutable.');
  }
}

async function createUser(payload = {}) {
  const id = toCanonicalId(payload.id);
  const timestamp = nowUtcString();
  const resolvedUsername = await resolveUsernameForCreate(payload);

  await ensureLookupIsUnique('email', payload.email);
  await ensureLookupIsUnique('phone', payload.phone);

  const basePayload = {
    ...payload,
    id,
    userid: id,
    status: payload.status ?? 1,
    isdeleted: payload.isdeleted ?? false,
    createddate: payload.createddate ?? timestamp,
    updateddate: payload.updateddate ?? timestamp,
    createdby: payload.createdby ?? null,
    updatedby: payload.updatedby ?? id,
    username: resolvedUsername,
  };

  const mirrored = applyDobMirror(basePayload);
  const encrypted = mapEncryptedUserFields(mirrored);
  const { query, params } = buildInsertUserStatement(encrypted);
  await execute(query, params);

  await upsertLookup('email', payload.email, id);
  await upsertLookup('phone', payload.phone, id);
  await upsertLookup('username', resolvedUsername, id);

  return {
    userId: id,
    email: encrypted.email ?? null,
  };
}

async function getUser({ id, email, phone }) {
  let userId = id;
  if (!userId && email) {
    userId = await lookupUserIdByTypeValue('email', email);
  }
  if (!userId && phone) {
    userId = await lookupUserIdByTypeValue('phone', phone);
  }

  if (!userId) {
    throw new HttpError(404, 'User not found.');
  }

  const user = await fetchUserById(userId);
  if (!user || user.isdeleted === true) {
    throw new HttpError(404, 'User not found.');
  }
  return user;
}

async function updateUser(id, payload = {}) {
  rejectImmutableFields(payload);
  const existing = await fetchUserById(id);
  if (!existing || existing.isdeleted === true) {
    throw new HttpError(404, 'User not found.');
  }

  await ensureLookupIsUnique('email', payload.email, id);
  await ensureLookupIsUnique('phone', payload.phone, id);
  await ensureLookupIsUnique('username', payload.username, id);

  const oldEmailEncrypted = existing.email;
  const oldPhoneEncrypted = existing.phone;
  const oldUsernameEncrypted = existing.username;

  const updatePayload = {
    ...payload,
    updateddate: nowUtcString(),
    updatedby: id,
  };

  const mirrored = applyDobMirror(updatePayload);
  const encrypted = mapEncryptedUserFields(mirrored);
  const { query, params } = buildUpdateUserStatement(id, encrypted);
  await execute(query, params);

  let newEmailEncrypted = null;
  let newPhoneEncrypted = null;
  let newUsernameEncrypted = null;
  if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
    newEmailEncrypted = await upsertLookup('email', payload.email, id);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
    newPhoneEncrypted = await upsertLookup('phone', payload.phone, id);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'username')) {
    const normalizedUsername = normalizeForStorage(payload.username, 'username');
    newUsernameEncrypted = await upsertLookup('username', normalizedUsername, id);
  }

  if (newEmailEncrypted && oldEmailEncrypted && newEmailEncrypted !== oldEmailEncrypted) {
    await deleteLookup('email', oldEmailEncrypted);
  }
  if (newPhoneEncrypted && oldPhoneEncrypted && newPhoneEncrypted !== oldPhoneEncrypted) {
    await deleteLookup('phone', oldPhoneEncrypted);
  }
  if (newUsernameEncrypted && oldUsernameEncrypted && newUsernameEncrypted !== oldUsernameEncrypted) {
    await deleteLookup('username', oldUsernameEncrypted);
  }

  const updated = await fetchUserById(id);
  return {
    userId: id,
    email: updated?.email ?? null,
  };
}

async function softDeleteUser(id) {
  const existing = await fetchUserById(id);
  if (!existing || existing.isdeleted === true) {
    throw new HttpError(404, 'User not found.');
  }

  await execute(
    'UPDATE user SET isdeleted = ?, updateddate = ?, updatedby = ? WHERE id = ?',
    [true, nowUtcString(), id, id],
  );
  return { userId: id };
}

module.exports = {
  createUser,
  getUser,
  softDeleteUser,
  updateUser,
};
