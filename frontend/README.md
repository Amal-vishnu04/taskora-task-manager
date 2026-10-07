# TASKORA

Organize. Focus. Complete.

## Development

Install the frontend dependencies with `npm install`, then start the local development server with `npm run dev`.

Set `VITE_API_URL` to the public Taskora API base URL when it is not available at the default local address. Do not place server credentials or secrets in frontend environment variables.

## Verification

- `npm run lint` checks the frontend source.
- `npm test` runs frontend API error-handling tests.
- `npm run build` creates the production frontend bundle.

## End-to-End Tests

Install the Playwright browser once with `npx playwright install chromium`, then run `npm run test:e2e` (or `npm run test:e2e:ci` for single-worker CI output). The suite uses `E2E_BASE_URL` when set and reuses an already-running local frontend. The local API must also be running for authenticated tests.

Set `E2E_EMAIL` and `E2E_PASSWORD` in the local shell to run authenticated task workflows. Use a dedicated existing E2E account; the suite never registers accounts. If one is needed, create it once through the normal UI and account for its one-time welcome email. Without those variables, authenticated workflows are reported as skipped. The Cloudinary test is separately opt-in with `E2E_CLOUDINARY_ENABLED=true` and `E2E_IMAGE_PATH` pointing to a small local image. No credential values belong in source control or frontend configuration.
