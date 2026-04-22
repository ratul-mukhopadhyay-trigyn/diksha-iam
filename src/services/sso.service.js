require('dotenv').config();
const { encryptSsoPayload } = require('../utils/crypto');
const { formatText } = require('../utils/formatText');
const { fetchLocationObject } = require('./location.service');
const {
  getExternalIds,
  getRootOrgName,
  getUserById,
  lookupUserId,
} = require('./user.service');

const LMS_SSO_BASE_URL = process.env.LMS_SSO_BASE_URL;

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function removeSpaces(value) {
  return value ? value.trim().replace(/ /g, '') : value;
}

function mapToUserDataObject(row, rootOrgName, externalIds, locationObject) {
  return {
    userid: removeSpaces(row.userid),
    userName: removeSpaces(row.username),
    firstname: row.firstname,
    middleName: row.middlename,
    firstMidName: row.middlename ? `${row.firstname} ${row.middlename}` : row.firstname,
    lastname: row.lastname,
    emailid: removeSpaces(row.email),
    maskedEmail: row.maskedemail,
    phone: removeSpaces(row.phone),
    maskedPhone: row.maskedphone,
    profileUserType: row.profileusertype?.type ?? row.profileusertype,
    profileUserSubType: (row.profileusertype?.subType || row.usersubtype || '').toUpperCase(),
    rootOrgId: row.rootorgid,
    rootOrgName,
    experience: row.experience,
    gender: row.gender,
    profileImage: row.profileimage,
    userRoles: row.roles,
    board: row.framework?.board?.[0] ?? null,
    medium: row.framework?.medium?.[0] ?? null,
    class: row.framework?.gradeLevel?.[0] ?? null,
    externalIds,
    ...locationObject,
  };
}

function normalizeUserData(userDataObject) {
  const normalized = {};
  Object.keys(userDataObject).forEach((key) => {
    normalized[key] = userDataObject[key] ?? '';
  });

  if (normalized.state) {
    normalized.state = formatText(normalized.state);
  }
  if (normalized.board) {
    normalized.board = formatText(normalized.board);
  }

  return normalized;
}

async function generateSsoUrl({ email, phone }) {
  if ((!email && !phone) || (email && phone)) {
    throw new HttpError(400, 'Provide exactly one of "email" or "phone".');
  }

  const userId = await lookupUserId({ email, phone });
  if (!userId) {
    throw new HttpError(404, 'User not found for the provided identifier.');
  }

  const row = await getUserById(userId);
  if (!row) {
    throw new HttpError(404, 'User row not found.');
  }

  if (!row.email && !row.phone) {
    throw new HttpError(422, 'User data incomplete: neither email nor phone exists.');
  }

  const [rootOrgName, externalIds, locationObject] = await Promise.all([
    getRootOrgName(row.rootorgid),
    getExternalIds(row.userid),
    fetchLocationObject(row.profilelocation),
  ]);

  const userDataObject = mapToUserDataObject(row, rootOrgName, externalIds, locationObject);
  const normalizedUserData = normalizeUserData(userDataObject);
  const encryptedToken = encryptSsoPayload(normalizedUserData);
  const ssoUrl = `${LMS_SSO_BASE_URL}?token=${encodeURIComponent(encryptedToken)}`;

  return {
    ssoUrl,
    userDataObject: normalizedUserData,
    userId,
  };
}

module.exports = {
  HttpError,
  generateSsoUrl,
};
