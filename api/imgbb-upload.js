const { Readable } = require('node:stream');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: { message: 'Method not allowed' } });
  }

  if (!process.env.IMGBB_API_KEY) {
    return res.status(500).json({
      success: false,
      error: { message: 'Missing Vercel environment variable: IMGBB_API_KEY' }
    });
  }

  try {
    const request = new Request(getRequestUrl(req), {
      method: 'POST',
      headers: req.headers,
      body: Readable.toWeb(req),
      duplex: 'half'
    });
    const incomingForm = await request.formData();
    const image = incomingForm.get('image');

    if (!image) {
      return res.status(400).json({
        success: false,
        error: { message: 'No image file provided' }
      });
    }

    const imgbbForm = new FormData();
    imgbbForm.append('image', image);

    const imgbbResponse = await fetch(
      `https://api.imgbb.com/1/upload?key=${encodeURIComponent(process.env.IMGBB_API_KEY)}`,
      { method: 'POST', body: imgbbForm }
    );
    const result = await imgbbResponse.json();

    if (!imgbbResponse.ok || !result.success) {
      return res.status(imgbbResponse.status || 502).json({
        success: false,
        error: { message: result?.error?.message || 'ImgBB upload failed' }
      });
    }

    return res.status(200).json({
      success: true,
      url: result.data.display_url || result.data.url
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Upload failed' }
    });
  }
};

function getRequestUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'localhost';
  return `${protocol}://${host}${req.url}`;
}
