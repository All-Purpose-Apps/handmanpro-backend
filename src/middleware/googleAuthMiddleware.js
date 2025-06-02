import { google } from 'googleapis';

export const authenticateGoogleAPI = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    // Allow preflight OPTIONS requests to pass through
    next();
  } else {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const accessToken = authHeader.split(' ')[1];

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });

        req.oauth2Client = oauth2Client;
        next();
      } else {
        throw new Error('No valid Authorization header found');
      }
    } catch (error) {
      console.error('Google API Auth Error:', error.message);
      res.status(401).json({ msg: 'Unauthorized: ' + error.message });
    }
  }
};
