const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

function getConfig() {
  const {
    EMAILJS_SERVICE_ID: serviceId,
    EMAILJS_TEMPLATE_ID: templateId,
    EMAILJS_PUBLIC_KEY: publicKey,
    EMAILJS_PRIVATE_KEY: privateKey,
  } = process.env;

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    throw new Error('EmailJS is not configured');
  }

  return { serviceId, templateId, publicKey, privateKey };
}

async function sendEmailJs({ toEmail, subject, html }) {
  const { serviceId, templateId, publicKey, privateKey } = getConfig();

  const response = await fetch(EMAILJS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: {
        to_email: toEmail,
        subject,
        message_html: html,
      },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 200);
    throw new Error(`EmailJS request failed (${response.status}) ${detail}`);
  }

  return true;
}

module.exports = { sendEmailJs };
