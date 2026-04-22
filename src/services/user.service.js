const { execute } = require('../db/cassandra');
const { decryptStoredField, encryptLookupValue } = require('../utils/crypto');

const USER_LOOKUP_QUERY = `
  SELECT userid
  FROM user_lookup
  WHERE type = ? AND value = ?
`;

const USER_QUERY = `
  SELECT
    userid, username, firstname, middlename, lastname,
    email, maskedemail, phone, maskedphone,
    profileusertype, profileusertypes, usersubtype,
    rootorgid, experience, gender, profileimage,
    roles, framework, profilelocation
  FROM user
  WHERE id = ?
`;

const ORG_QUERY = `
  SELECT orgname
  FROM organisation
  WHERE id = ?
`;

const EXTERNAL_ID_QUERY = `
  SELECT idtype, provider, externalid, originalexternalid, originalidtype, originalprovider
  FROM usr_external_identity
  WHERE userid = ?
`;

async function lookupUserId({ email, phone }) {
  const lookupType = email ? 'email' : 'phone';
  const lookupValue = email || phone;
  const encryptedLookupValue = encryptLookupValue(lookupValue);

  const result = await execute(USER_LOOKUP_QUERY, [lookupType, encryptedLookupValue]);
  return result.rows[0]?.userid ?? null;
}

async function getUserById(userId) {
  const result = await execute(USER_QUERY, [userId]);
  const row = result.rows[0];
  if (!row) return null;

  row.email = decryptStoredField(row.email, 'email');
  row.phone = decryptStoredField(row.phone, 'phone');
  row.username = decryptStoredField(row.username, 'username');

  return row;
}

async function getRootOrgName(rootOrgId) {
  if (!rootOrgId) return null;
  const result = await execute(ORG_QUERY, [rootOrgId]);
  return result.rows[0]?.orgname ?? null;
}

async function getExternalIds(userId) {
  if (!userId) return null;
  const result = await execute(EXTERNAL_ID_QUERY, [userId]);
  if (result.rows.length === 0) return null;

  return result.rows.map(row => ({
    idType: row.idtype,
    provider: row.provider,
    id: row.externalid,
    originalId: row.originalexternalid,
    originalIdType: row.originalidtype,
    originalProvider: row.originalprovider,
  }));
}

module.exports = {
  getExternalIds,
  getRootOrgName,
  getUserById,
  lookupUserId,
};
