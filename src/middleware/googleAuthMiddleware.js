import { google } from 'googleapis';

export const authenticateGoogleAPI = async (req, res, next) => {
  if (req.method === 'OPTIONS') return next();

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('No valid Authorization header found');
    }

    const accessToken = authHeader.split(' ')[1];

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    });

    const { data: userInfo } = await oauth2.userinfo.get();
    const email = userInfo.email;

    const tenantId = email.split('@')[0];

    req.oauth2Client = oauth2Client;
    req.user = userInfo;
    req.tenantId = tenantId;

    next();
  } catch (error) {
    console.error(`at ${new Date().toLocaleString()} Google API Auth Error: ${error.message}`);
    res.status(401).json({ msg: 'Unauthorized: ' + error.message });
  }
};
