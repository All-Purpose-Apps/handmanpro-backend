import { google } from 'googleapis';

export const authenticateGoogleAPI = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    // Allow preflight OPTIONS requests to pass through
    next();
  } else {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1];

      // Set up OAuth2 client with the access token
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      // Attach oauth2Client to the request object
      req.oauth2Client = oauth2Client;

      next();
    } else {
      res.status(401).json({ msg: 'Unauthorized: No access token provided' });
    }
  }
};
