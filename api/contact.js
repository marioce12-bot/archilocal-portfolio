module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = await readJson(req);
    const firstName = clean(body.prenom);
    const lastName = clean(body.nom);
    const email = clean(body.email);
    const projectType = clean(body.typeProjet);
    const budget = clean(body.budget);
    const message = clean(body.message, 5000);
    const recipientEmail = await getRecipientEmail();

    if (!firstName || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Prénom, email et message sont requis.'
      });
    }

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email de réception indisponible.'
      });
    }

    const subject = `Nouvelle demande client ArchiLocal - ${firstName}${lastName ? ' ' + lastName : ''}`;
    const html = `
      <h2>Nouvelle demande client</h2>
      <p><strong>Prénom :</strong> ${escapeHtml(firstName)}</p>
      <p><strong>Nom :</strong> ${escapeHtml(lastName || '-')}</p>
      <p><strong>Email :</strong> ${escapeHtml(email)}</p>
      <p><strong>Type de projet :</strong> ${escapeHtml(projectType || '-')}</p>
      <p><strong>Budget :</strong> ${escapeHtml(budget || '-')}</p>
      <p><strong>Message :</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
    `;

    const response = process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL
      ? await sendWithResend({ recipientEmail, replyTo: email, subject, html })
      : await sendWithFormSubmit({ recipientEmail, subject, html, firstName, lastName, email, projectType, budget, message });

    const result = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: result?.message || 'Email sending failed'
      });
    }

    return res.status(200).json({ success: true, id: result.id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Contact request failed'
    });
  }
};

async function sendWithResend({ recipientEmail, replyTo, subject, html }) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL,
      to: recipientEmail,
      reply_to: replyTo,
      subject,
      html
    })
  });
}

async function sendWithFormSubmit({ recipientEmail, subject, firstName, lastName, email, projectType, budget, message }) {
  return fetch(`https://formsubmit.co/ajax/${encodeURIComponent(recipientEmail)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      _subject: subject,
      _template: 'table',
      _captcha: 'false',
      prenom: firstName,
      nom: lastName || '-',
      email,
      type_de_projet: projectType || '-',
      budget: budget || '-',
      message
    })
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 100000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function clean(value, maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength);
}

async function getRecipientEmail() {
  const settingsEmail = await getSettingsContactEmail();
  return settingsEmail || process.env.CONTACT_TO_EMAIL || '';
}

async function getSettingsContactEmail() {
  if (!process.env.FIREBASE_PROJECT_ID) return '';

  const settingsCollection = process.env.FIRESTORE_SETTINGS_COLLECTION || 'archilocal_settings';
  const settingsDocId = process.env.FIRESTORE_SITE_SETTINGS_DOC_ID || 'site';
  const encodedCollection = encodeURIComponent(settingsCollection);
  const encodedDoc = encodeURIComponent(settingsDocId);
  const apiKey = process.env.FIREBASE_API_KEY ? `?key=${encodeURIComponent(process.env.FIREBASE_API_KEY)}` : '';
  const url = `https://firestore.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${encodedCollection}/${encodedDoc}${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return '';

    const document = await response.json();
    return document?.fields?.contact?.mapValue?.fields?.email?.stringValue || '';
  } catch (error) {
    console.error(error);
    return '';
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}
