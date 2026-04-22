require('dotenv').config();
const https = require('https');

const LOCATION_API_URL = `${process.env.LOCATION_API_BASE_URL}/api/data/v1/location/search`;
const LOCATION_API_TOKEN = process.env.LOCATION_API_TOKEN;

function fetchLocationObject(profileLocation = []) {
  return new Promise((resolve) => {
    const ids = Array.from(profileLocation).map(item => item.id).filter(Boolean);
    if (ids.length === 0) {
      resolve({});
      return;
    }

    const body = JSON.stringify({
      request: {
        filters: { id: ids },
        sort_by: { code: 'asc' },
        limit: 1000,
      },
    });

    const url = new URL(LOCATION_API_URL);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOCATION_API_TOKEN}`,
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const locations = parsed?.result?.response ?? [];
          const locationObject = locations.reduce((acc, location) => {
            acc[location.type] = location.name;
            if (location.type === 'school') {
              acc.code = location.code;
            }
            return acc;
          }, {});
          resolve(locationObject);
        } catch {
          resolve({});
        }
      });
    });

    req.on('error', () => resolve({}));
    req.write(body);
    req.end();
  });
}

module.exports = {
  fetchLocationObject,
};
