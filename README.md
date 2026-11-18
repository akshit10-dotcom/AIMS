# AIMS - Attendance & Quiz Management System

See [frontend/README.md](./frontend/README.md) for features, local setup, API endpoints, and Android instructions.

## Production Deployment

Deploy the API and web frontend as separate services, and use a managed MongoDB database.

### One Render Web Service (Frontend + Backend)

The backend serves the production React build, so Render can run both from the repository root in one Web Service:

- Root Directory: leave blank
- Build Command: `npm run build`
- Start Command: `npm start`
- Health Check Path: `/health`

Set the backend environment variables listed below in Render. For `CLIENT_ORIGIN`, use the service's public URL. The frontend uses same-origin API requests in production unless `REACT_APP_API_URL` is explicitly set.

### Backend API

- Service root: `backend`
- Runtime: Node.js **20.19 or newer** (required by Mongoose)
- Install command: `npm ci`
- Start command: `npm start`
- Health check: `/health`

Configure these environment variables in the backend host:

| Variable | Required | Value |
|---|---|---|
| `NODE_ENV` | Yes | `production` |
| `MONGO_URI` | Yes | Managed MongoDB connection string |
| `JWT_SECRET` | Yes | Unique random secret, at least 32 characters |
| `CLIENT_ORIGIN` | Yes | Frontend origin(s), comma-separated, no trailing slash |
| `TEACHER_REGISTRATION_CODE` | Yes | Strong, private code for teacher registration |
| `JWT_EXPIRES_IN` | No | Token lifetime; defaults to `24h` |
| `GEMINI_API_KEY` | No | Backend-only key for AI quiz generation |
| `PORT` | Platform-set | Use the port provided by the hosting platform |

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend on Netlify

- The root [`netlify.toml`](./netlify.toml) sets the base directory to `frontend`, builds with `npm ci && npm run build`, and publishes `build`.
- In Netlify, connect this Git repository and set `REACT_APP_API_URL` to the backend's public HTTPS URL under **Site configuration → Environment variables**. Trigger a new deploy after setting it.
- The frontend is a static site; host the API separately on a Node.js host.

`REACT_APP_*` values are embedded in public browser code; do not put secrets in them. Configure the backend's `CLIENT_ORIGIN` to include the deployed frontend origin. For Android builds, use the HTTPS API URL as `REACT_APP_API_URL` before running Capacitor sync/build.

### Before Launch

1. Configure the managed database's network access for the backend host.
2. Set all required backend variables in the API host; production startup fails fast if required values are missing or invalid.
3. Deploy the backend and confirm `https://<your-public-api-host>/health` returns HTTP 200 with `"status":"ok"`.
4. Connect this repository to Netlify, set `REACT_APP_API_URL` to the deployed API URL, and deploy. Confirm registration, login, and core workflows on the deployed site.
5. Review dependency audit findings and upgrade vulnerable dependencies before handling real user data.