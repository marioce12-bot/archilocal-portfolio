const requiredFirebaseEnv = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

function env(name, fallback = '') {
  return process.env[name] || fallback;
}

function social(label, icon, url) {
  return url ? { label, icon, url } : null;
}

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
    imgbbUploadAvailable: Boolean(process.env.IMGBB_API_KEY),
    site: {
      brandName: env('SITE_BRAND_NAME', 'ArchiLocal'),
      pageTitle: env('SITE_PAGE_TITLE', 'ArchiLocal'),
      hero: {
        eyebrow: env('SITE_HERO_EYEBROW'),
        titleMain: env('SITE_HERO_TITLE_MAIN'),
        titleAccent: env('SITE_HERO_TITLE_ACCENT'),
        subtitle: env('SITE_HERO_SUBTITLE')
      },
      about: {
        titleMain: env('SITE_ABOUT_TITLE_MAIN'),
        titleAccent: env('SITE_ABOUT_TITLE_ACCENT'),
        paragraphs: [
          env('SITE_ABOUT_PARAGRAPH_1'),
          env('SITE_ABOUT_PARAGRAPH_2'),
          env('SITE_ABOUT_PARAGRAPH_3')
        ].filter(Boolean),
        stats: [
          { number: env('SITE_STAT_1_NUMBER'), label: env('SITE_STAT_1_LABEL') },
          { number: env('SITE_STAT_2_NUMBER'), label: env('SITE_STAT_2_LABEL') },
          { number: env('SITE_STAT_3_NUMBER'), label: env('SITE_STAT_3_LABEL') },
          { number: env('SITE_STAT_4_NUMBER'), label: env('SITE_STAT_4_LABEL') }
        ].filter(item => item.number || item.label)
      },
      approach: {
        titleMain: env('SITE_APPROACH_TITLE_MAIN'),
        titleAccent: env('SITE_APPROACH_TITLE_ACCENT'),
        description: env('SITE_APPROACH_DESCRIPTION'),
        pillars: [
          { title: env('SITE_PILLAR_1_TITLE'), text: env('SITE_PILLAR_1_TEXT') },
          { title: env('SITE_PILLAR_2_TITLE'), text: env('SITE_PILLAR_2_TEXT') },
          { title: env('SITE_PILLAR_3_TITLE'), text: env('SITE_PILLAR_3_TEXT') }
        ].filter(item => item.title || item.text)
      },
      contact: {
        titleMain: env('SITE_CONTACT_TITLE_MAIN'),
        titleAccent: env('SITE_CONTACT_TITLE_ACCENT'),
        heading: env('SITE_CONTACT_HEADING'),
        text: env('SITE_CONTACT_TEXT'),
        email: env('CONTACT_DISPLAY_EMAIL'),
        location: env('CONTACT_LOCATION'),
        formNote: env('SITE_CONTACT_FORM_NOTE'),
        successTitle: env('SITE_CONTACT_SUCCESS_TITLE'),
        successMessage: env('SITE_CONTACT_SUCCESS_MESSAGE')
      },
      socials: [
        social('Facebook', 'f', env('SOCIAL_FACEBOOK_URL')),
        social('Instagram', 'ig', env('SOCIAL_INSTAGRAM_URL')),
        social('ComeUp', 'cu', env('SOCIAL_COMEUP_URL')),
        social('Clariv Africa', 'ca', env('SOCIAL_CLARIV_AFRICA_URL')),
        social('LinkedIn', 'in', env('SOCIAL_LINKEDIN_URL'))
      ].filter(Boolean)
    }
  });
};
