require('dotenv').config();

const app = require('./src/app');
const { startReminderScheduler } = require('./src/services/reminderScheduler');

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`TaskFlow API listening on port ${port}`);
  if (!process.env.VERCEL) {
    startReminderScheduler();
  }
});