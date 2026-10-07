const transporter = require('../config/email');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

async function sendWelcomeEmail({ name, email }) {
  const greetingName = escapeHtml(name || 'there');

  return transporter.sendMail({
    from: `"TaskFlow" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Welcome to TaskFlow ${String.fromCodePoint(0x1F680)}`,
    html: `
      <!doctype html>
      <html lang="en">
        <body style="margin:0;padding:32px 12px;background-color:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#23313d;">
          <table role="presentation" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse;background-color:#ffffff;border:1px solid #e1e8ed;border-radius:8px;">
            <tr>
              <td style="padding:32px 36px 12px;font-size:22px;font-weight:700;color:#176b63;">TaskFlow</td>
            </tr>
            <tr>
              <td style="padding:8px 36px 0;">
                <h1 style="margin:0 0 20px;font-size:26px;line-height:1.3;color:#1d2b36;">Welcome, ${greetingName}!</h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Your TaskFlow account is ready.</p>
                <p style="margin:0 0 26px;font-size:16px;line-height:1.6;color:#53636f;">TaskFlow helps you organize your work, keep track of priorities, and stay on top of your tasks.</p>
                <a href="http://localhost:5173" style="display:inline-block;padding:13px 20px;border-radius:5px;background-color:#176b63;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Start Managing Tasks</a>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 36px;font-size:12px;line-height:1.5;color:#77858e;">This is an automated email from TaskFlow. Please do not reply to this message.</td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}

async function verifyEmailConfiguration() {
  return transporter.verify();
}

async function sendDueDateReminderEmail({ name, email, task }) {
  const greetingName = escapeHtml(name || 'there');
  const taskTitle = escapeHtml(task.title);
  const taskDescription = task.description
    ? escapeHtml(task.description)
    : 'No description provided.';
  const taskStatus = escapeHtml(task.status);
  const dueDate = new Date(task.dueDate);
  const dueDateLabel = Number.isNaN(dueDate.getTime())
    ? 'within approximately 24 hours'
    : new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(dueDate);
  const subjectTitle = String(task.title).replace(/[\r\n]+/g, ' ').trim().slice(0, 180);

  return transporter.sendMail({
    from: `"TaskFlow" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `TaskFlow Reminder: ${subjectTitle} is due tomorrow`,
    html: `
      <!doctype html>
      <html lang="en">
        <body style="margin:0;padding:32px 12px;background-color:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#23313d;">
          <table role="presentation" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse;background-color:#ffffff;border:1px solid #e1e8ed;border-radius:8px;">
            <tr>
              <td style="padding:32px 36px 12px;font-size:22px;font-weight:700;color:#176b63;">TaskFlow</td>
            </tr>
            <tr>
              <td style="padding:8px 36px 0;">
                <h1 style="margin:0 0 20px;font-size:25px;line-height:1.3;color:#1d2b36;">A task is due soon</h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hello ${greetingName},</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#53636f;">Your task is due in approximately 24 hours. Here are the details to help you plan ahead.</p>
                <table role="presentation" style="width:100%;border-collapse:collapse;background-color:#f7f9fa;border:1px solid #e1e8ed;">
                  <tr><td style="padding:14px 16px 4px;font-size:12px;color:#71808a;">TASK</td></tr>
                  <tr><td style="padding:0 16px 12px;font-size:18px;font-weight:700;color:#1d2b36;">${taskTitle}</td></tr>
                  <tr><td style="padding:0 16px 4px;font-size:12px;color:#71808a;">DESCRIPTION</td></tr>
                  <tr><td style="padding:0 16px 12px;font-size:14px;line-height:1.5;color:#53636f;">${taskDescription}</td></tr>
                  <tr><td style="padding:0 16px 4px;font-size:12px;color:#71808a;">STATUS</td></tr>
                  <tr><td style="padding:0 16px 12px;font-size:14px;color:#23313d;">${taskStatus}</td></tr>
                  <tr><td style="padding:0 16px 4px;font-size:12px;color:#71808a;">DUE</td></tr>
                  <tr><td style="padding:0 16px 16px;font-size:14px;color:#23313d;">${escapeHtml(dueDateLabel)}</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 36px 32px;font-size:12px;line-height:1.5;color:#77858e;">This is an automated email from TaskFlow. Please do not reply to this message.</td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}

module.exports = {
  sendWelcomeEmail,
  sendDueDateReminderEmail,
  verifyEmailConfiguration,
};