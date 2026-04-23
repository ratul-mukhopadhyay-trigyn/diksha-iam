require('dotenv').config();
const https = require('https');
const { URL } = require('url');
const { decryptOtpPayload, encryptOtpPayload } = require('../utils/crypto');
const { HttpError } = require('./sso.service');

const INTERNAL_API_BASE_URL = process.env.INTERNAL_API_BASE_URL;
const OTP_REQUEST_TIMEOUT_MS = Number(process.env.OTP_REQUEST_TIMEOUT_MS || 10000);

const ALLOWED_TYPES = new Set([
  'email',
  'phone',
  'prevUsedEmail',
  'prevUsedPhone',
  'recoveryEmail',
  'recoveryPhone',
]);

const ALLOWED_TEMPLATE_IDS = new Set([
  'resetPasswordWithOtp',
  'wardLoginOTP',
  'otpContactUpdateTemplate',
  'deleteUserAccountTemplate',
  '1307171619784284292',
]);

function validateRequestEnvelope(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }

  if (!body.request || typeof body.request !== 'object' || Array.isArray(body.request)) {
    throw new HttpError(400, 'Request body must include a "request" object.');
  }

  return body.request;
}

function validateGeneratePayload(body) {
  const request = validateRequestEnvelope(body);
  validateCommonPayload(request);

  if (request.templateId != null && !ALLOWED_TEMPLATE_IDS.has(String(request.templateId))) {
    throw new HttpError(400, 'Invalid "templateId" value.');
  }
}

function validateVerifyPayload(body) {
  const request = validateRequestEnvelope(body);
  validateCommonPayload(request);

  if (typeof request.otp !== 'string' || !request.otp.trim()) {
    throw new HttpError(400, 'Provide a non-empty "request.otp" value.');
  }
}

function validateCommonPayload(request) {
  if (typeof request.key !== 'string' || !request.key.trim()) {
    throw new HttpError(400, 'Provide a non-empty "request.key" value.');
  }

  if (typeof request.type !== 'string' || !ALLOWED_TYPES.has(request.type)) {
    throw new HttpError(400, 'Provide a valid "request.type" value.');
  }

  if (request.userId != null && (typeof request.userId !== 'string' || !request.userId.trim())) {
    throw new HttpError(400, 'If provided, "request.userId" must be a non-empty string.');
  }
}

async function generateOtp(body) {
  validateGeneratePayload(body);
  return callOtpApi('/learner/otp/v1/generate', body);
}

async function verifyOtp(body) {
  validateVerifyPayload(body);
  return callOtpApi('/learner/otp/v1/verify', body);
}

async function callOtpApi(pathname, body) {
  if (!INTERNAL_API_BASE_URL) {
    throw new HttpError(500, 'Missing INTERNAL_API_BASE_URL configuration.');
  }

  const url = new URL(pathname, ensureTrailingSlash(INTERNAL_API_BASE_URL));
  const encryptedPayload = encryptOtpPayload(body);
  const requestBody = JSON.stringify(encryptedPayload);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: 'POST',
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
        },
      },
      (res) => {
        let rawData = '';
        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          rawData += chunk;
        });

        res.on('end', () => {
          try {
            const parsedBody = parseJsonSafely(rawData);
            const responseBody = maybeDecryptOtpResponse(parsedBody);

            resolve({
              statusCode: res.statusCode || 502,
              body: responseBody,
            });
          } catch (err) {
            reject(new HttpError(502, `Failed to process OTP upstream response: ${err.message}`));
          }
        });
      },
    );

    req.setTimeout(OTP_REQUEST_TIMEOUT_MS, () => {
      req.destroy(new HttpError(504, 'OTP upstream request timed out.'));
    });

    req.on('error', (err) => {
      if (err instanceof HttpError) {
        reject(err);
        return;
      }

      reject(new HttpError(502, `OTP upstream request failed: ${err.message}`));
    });

    req.write(requestBody);
    req.end();
  });
}

function maybeDecryptOtpResponse(payload) {
  if (payload && typeof payload === 'object' && payload.isEncryption === true && typeof payload.data === 'string') {
    return decryptOtpPayload(payload);
  }

  return payload;
}

function parseJsonSafely(rawData) {
  if (!rawData) {
    return {};
  }

  try {
    return JSON.parse(rawData);
  } catch (err) {
    throw new Error('Upstream response was not valid JSON.');
  }
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

module.exports = {
  ALLOWED_TEMPLATE_IDS,
  ALLOWED_TYPES,
  generateOtp,
  verifyOtp,
};
