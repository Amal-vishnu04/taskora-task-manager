const { sendEmailJs } = require('./emailjsClient');

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

  return sendEmailJs({
    toEmail: email,
    subject: `Welcome to Taskora ${String.fromCodePoint(0x1F680)}`,
    html: `
      <!doctype html>
      <html lang="en">
        <body style="margin:0;padding:32px 12px;background-color:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#23313d;">
          <table role="presentation" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse;background-color:#ffffff;border:1px solid #e1e8ed;border-radius:8px;">
            <tr>
              <td style="padding:32px 36px 12px;font-size:22px;font-weight:700;color:#111111;">Taskora</td>
            </tr>
            <tr>
              <td style="padding:8px 36px 0;">
                <h1 style="margin:0 0 20px;font-size:26px;line-height:1.3;color:#1d2b36;">Welcome, ${greetingName}!</h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Your Taskora account is ready.</p>
                <p style="margin:0 0 26px;font-size:16px;line-height:1.6;color:#53636f;">Taskora helps you organize your work, keep track of priorities, and stay on top of your tasks.</p>
                <a href="${process.env.FRONTEND_URL}" style="display:inline-block;padding:13px 20px;border-radius:5px;background-color:#111111;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Start Managing Tasks</a>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 36px;font-size:12px;line-height:1.5;color:#77858e;">This is an automated email from Taskora. Please do not reply to this message.</td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}

async function verifyEmailConfiguration() {
  const { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY } = process.env;
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY) {
    throw new Error('EmailJS is not configured');
  }
  return true;
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

  return sendEmailJs({
    toEmail: email,
    subject: `Taskora Reminder: ${subjectTitle} is due tomorrow`,
    html: `
      <!doctype html>
      <html lang="en">
        <body style="margin:0;padding:32px 12px;background-color:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#23313d;">
          <table role="presentation" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse;background-color:#ffffff;border:1px solid #e1e8ed;border-radius:8px;">
            <tr>
              <td style="padding:32px 36px 12px;font-size:22px;font-weight:700;color:#111111;">Taskora</td>
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
              <td style="padding:28px 36px 32px;font-size:12px;line-height:1.5;color:#77858e;">This is an automated email from Taskora. Please do not reply to this message.</td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}

function isCloudinaryHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

const STATUS_BADGES = {
  pending: { label: 'Pending', background: '#fff4d6', color: '#8a5a00' },
  in_progress: { label: 'In Progress', background: '#e1efff', color: '#1d4f91' },
  completed: { label: 'Completed', background: '#dcf5e7', color: '#17663a' },
};

function buildEmailImageUrl(imageUrl) {
  return imageUrl.replace('/image/upload/', '/image/upload/c_fill,w_1200,h_600,q_auto,f_jpg/');
}

function detailRow(label, valueHtml) {
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #eef2f4;width:110px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:#71808a;vertical-align:top;">${label}</td>
      <td style="padding:12px 0;border-bottom:1px solid #eef2f4;font-size:15px;line-height:1.5;color:#23313d;vertical-align:top;">${valueHtml}</td>
    </tr>`;
}

async function sendTaskImageUploadedEmail({ name, email, task, taskUrl }) {
  if (!isCloudinaryHttpsUrl(task.imageUrl)) {
    throw new Error('Invalid image URL');
  }

  const greetingName = escapeHtml(name || 'there');
  const taskTitle = escapeHtml(task.title);
  const taskDescription = task.description
    ? escapeHtml(task.description)
    : '<span style="color:#9aa7b0;">No description provided.</span>';
  const badge = STATUS_BADGES[task.status] || STATUS_BADGES.pending;
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const dueDateLabel = dueDate && !Number.isNaN(dueDate.getTime())
    ? new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(dueDate)
    : 'No deadline';
  const subjectTitle = String(task.title).replace(/[\r\n]+/g, ' ').trim().slice(0, 180);
  const imageHref = escapeHtml(task.imageUrl);
  const heroSrc = escapeHtml(buildEmailImageUrl(task.imageUrl));
  const openTaskButton = taskUrl
    ? `<a href="${escapeHtml(taskUrl)}" style="display:inline-block;margin:0 0 8px 8px;padding:14px 24px;border-radius:8px;background-color:#ffffff;border:2px solid #111111;color:#111111;font-size:15px;font-weight:700;text-decoration:none;">Open Task</a>`
    : '';

  return sendEmailJs({
    toEmail: email,
    subject: `New image added to "${subjectTitle}"`,
    html: `
      <!doctype html>
      <html lang="en">
        <body style="margin:0;padding:32px 12px;background-color:#eef2f4;font-family:Arial,Helvetica,sans-serif;color:#23313d;">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;">An image was attached to ${taskTitle}.</div>
          <table role="presentation" align="center" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dde5ea;">
            <tr>
              <td style="padding:22px 32px;background-color:#111111;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.02em;">Taskora</td>
            </tr>
            <tr>
              <td style="padding:0;">
                <a href="${imageHref}" style="display:block;">
                  <img src="${heroSrc}" alt="Image attached to ${taskTitle}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;background-color:#f3f6f8;">
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#111111;">NEW IMAGE ATTACHED</p>
                <h1 style="margin:0 0 12px;font-size:26px;line-height:1.3;color:#1d2b36;">${taskTitle}</h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#53636f;">Hi ${greetingName}, an image was just added to this task.</p>
                <table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #eef2f4;">
                  ${detailRow('STATUS', `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background-color:${badge.background};color:${badge.color};font-size:13px;font-weight:700;">${badge.label}</span>`)}
                  ${detailRow('DEADLINE', escapeHtml(dueDateLabel))}
                  ${detailRow('DESCRIPTION', taskDescription)}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px;">
                <a href="${imageHref}" style="display:inline-block;margin:0 0 8px;padding:14px 24px;border-radius:8px;background-color:#111111;border:2px solid #111111;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">View Full Image</a>${openTaskButton}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f7f9fa;border-top:1px solid #eef2f4;font-size:12px;line-height:1.5;color:#77858e;">This is an automated email from Taskora. Please do not reply to this message.</td>
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
  sendTaskImageUploadedEmail,
  verifyEmailConfiguration,
};
