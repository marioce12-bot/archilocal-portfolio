const requiredFirebaseEnv = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const missing = requiredFirebaseEnv.filter(name => !process.env[name]);
  if (missing.length) {
    return res.status(500).json({
      error: `Missing Vercel environment variables: ${missing.join(', ')}`
    });
  }

  return res.status(200).json({
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID
    },
    projectCollection: process.env.FIRESTORE_PROJECTS_COLLECTION || 'archilocal_portfolio_projects',
    imgbbUploadAvailable: Boolean(process.env.IMGBB_API_KEY)
  });
};
