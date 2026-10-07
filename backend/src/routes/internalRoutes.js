const crypto = require('node:crypto');
const express = require('express');
const { processDueDateReminders } = require('../services/reminderService');

const router = express.Router();

function isAuthorized(req) {
  const match = /^Bearer\s+(\S+)$/i.exec(req.get('Authorization') || '');
  const expectedSecret = process.env.REMINDER_CRON_SECRET;

  if (!match || !expectedSecret) {
    return false;
  }

  const supplied = Buffer.from(match[1]);
  const expected = Buffer.from(expectedSecret);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

async function processReminders(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  try {
    const result = await processDueDateReminders();
    return res.status(200).json({
      success: true,
      message: 'Reminder processing completed',
      result,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Unable to process reminders',
    });
  }
}

router.post('/reminders/process', processReminders);
router.get('/reminders/process', processReminders);

module.exports = router;