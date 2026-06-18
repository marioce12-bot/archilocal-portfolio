module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Missing Vercel environment variable: RESEND_API_KEY'
    });
  }

  if (!process.env.CONTACT_TO_EMAIL || !process.env.CONTACT_FROM_EMAIL) {
    return res.status(500).json({
      success: false,
      error: 'Missing CONTACT_TO_EMAIL or CONTACT_FROM_EMAIL'
    });
  }

  try {
    const body = await readJson(req);
    const firstName = clean(body.prenom);
    const lastName = clean(body.nom);
    const email = clean(body.email);
    const projectType = clean(body.typeProjet);
    const budget = clean(body.budget);
    const message = clean(body.message, 5000);

    if (!firstName || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Prénom, email et message sont requis.'
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

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL,
        to: process.env.CONTACT_TO_EMAIL,
        reply_to: email,
        subject,
        html
      })
    });

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

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}
