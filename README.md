# AIMS - Attendance & Quiz Management System

See [frontend/README.md](./frontend/README.md) for features, local setup, API endpoints, and Android instructions.

## Production Deployment

Deploy the API and web frontend as separate services, and use a managed MongoDB database.

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

### Frontend

- Service root: `frontend`
- Install/build command: `npm ci && npm run build`
- Static publish directory: `build`
- Build environment: `REACT_APP_API_URL=https://<your-public-api-host>`

`REACT_APP_*` values are embedded in public browser code; do not put secrets in them. Configure the backend's `CLIENT_ORIGIN` to include the deployed frontend origin. For Android builds, use the HTTPS API URL as `REACT_APP_API_URL` before running Capacitor sync/build.

### Before Launch

1. Configure the managed database's network access for the backend host.
2. Set all required backend variables in the hosting provider; production startup fails fast if required values are missing or invalid.
3. Deploy the backend and confirm `https://<your-public-api-host>/health` returns HTTP 200 with `"status":"ok"`.
4. Build/deploy the frontend with its public API URL, then test registration, login, and core workflows on the deployed site.
5. Review dependency audit findings and upgrade vulnerable dependencies before handling real user data.