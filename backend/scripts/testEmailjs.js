require('dotenv').config();
const { sendEmailJs } = require('../src/services/emailjsClient');

const toEmail = process.argv[2];

if (!toEmail) {
  console.error('Usage: node scripts/testEmailjs.js your-email@example.com');
  process.exit(1);
}

sendEmailJs({
  toEmail,
  subject: 'Taskora EmailJS test',
  html: '<h2>EmailJS works</h2><p>This is a test email from the Taskora backend.</p>',
})
  .then(() => console.log('Test email sent. Check your inbox.'))
  .catch((error) => {
    console.error('Test email failed:', error.message);
    process.exit(1);
  });
