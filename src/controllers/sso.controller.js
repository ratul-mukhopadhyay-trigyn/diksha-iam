const { generateSsoUrl } = require('../services/sso.service');

async function getSsoUrl(req, res, next) {
  try {
    const { email, phone } = req.query;
    const { ssoUrl } = await generateSsoUrl({ email, phone });

    res.set({
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
    });

    res.status(200).json({ ssoUrl });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSsoUrl,
};
