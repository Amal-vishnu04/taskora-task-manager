# TaskFlow Backend

## Due-Date Reminders

The reminder worker checks hourly for non-completed tasks due between 23 and 25 hours from the database's current time. It joins each task to its owner, sends the reminder to that owner, and sets `reminder_sent` only after successful email delivery. The flag prevents later runs from sending the same reminder again. Task rows are locked with `SKIP LOCKED` while processing so concurrent workers do not send the same reminder simultaneously. Failed email sends leave the flag false for a later retry.

The local Express server runs the check once at startup and then hourly. This interval is not started when `VERCEL` is set.

For development or a manual run, send `POST /api/internal/reminders/process` with `Authorization: Bearer <REMINDER_CRON_SECRET>`. The endpoint also accepts `GET` for a future Vercel Cron integration. The secret is read from the environment and is never returned by the endpoint.

This repository has no Vercel serverless function entry point or `vercel.json`, so no Vercel Cron configuration is added. When deploying the backend as a Vercel Function, expose the reusable `processDueDateReminders()` service through an authenticated function route, configure Vercel Cron for an hourly schedule (for example, `0 * * * *`), and set `CRON_SECRET` and `REMINDER_CRON_SECRET` to the same deployment secret. Do not rely on `setInterval` in a serverless function.

## Task Images

The frontend uploads selected task images through the authenticated `POST /api/upload` endpoint, then saves the returned HTTPS URL on the task. Create without an image by omitting the image field; create with an image by uploading first and including the returned `imageUrl` in `POST /api/tasks`.

For `PUT /api/tasks/:id`, omitting `imageUrl`/`image_url` preserves the current image, a valid HTTP or HTTPS URL replaces it, and explicitly sending `image_url: null` removes it. The editor stages removal locally and only sends `null` when the task is saved; removal can be canceled before saving.

After a replacement or removal commits to the database, the backend attempts to delete the previous asset only when its URL maps safely to this application's configured Cloudinary cloud and the `taskflow/tasks` folder. External URLs, other Cloudinary clouds, and assets that cannot be safely mapped are not deleted. A Cloudinary cleanup failure does not roll back the database update; a generic server-side diagnostic is logged, and the task retains its new image value (or `NULL` when removed).