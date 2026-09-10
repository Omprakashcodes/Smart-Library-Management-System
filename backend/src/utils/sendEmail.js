const sendEmail = async (options) => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      'accept': 'application/json'
    },
    body: JSON.stringify({
      sender: {
        name: 'Smart Library System',
        email: process.env.EMAIL_USER
      },
      to: [{ email: options.email }],
      subject: options.subject,
      htmlContent: options.html
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Brevo email failed: ${response.status} - ${errText}`);
  }

  console.log('[EMAIL] ✅ Sent via Brevo to:', options.email);
};

module.exports = sendEmail;