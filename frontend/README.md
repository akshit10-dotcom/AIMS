# AIMS - Attendance & Quiz Management System

A full-stack web and Android app for managing student attendance, lectures, and quizzes with AI-powered quiz generation.

## Tech Stack

- **Frontend:** React 19 (Create React App), Capacitor 8 (Android)
- **Backend:** Node.js, Express 5, MongoDB (Mongoose)
- **Auth:** JWT (JSON Web Tokens) with bcrypt password hashing
- **AI:** Google Gemini API for automatic quiz generation

## Features

### Teacher
- 📝 Create quizzes manually or generate with AI
- 📅 Schedule and manage lectures
- ✅ Mark attendance (single or bulk) for any date
- 📈 View all student quiz results with student names

### Student
- ✅ View personal attendance percentage with visual chart
- 📝 Take quizzes with instant feedback
- 📅 View today's lecture schedule
- 📈 Track quiz results and scores

### Security
- JWT authentication with secure session persistence
- Role-based access control (teacher vs student)
- IDOR protection (students can only access their own data)
- MongoDB injection sanitization
- Rate limiting to prevent brute-force attacks
- Helmet security headers
- Strong password policy enforcement
- Password never returned in API responses

## Getting Started

### Prerequisites

- Node.js 20.19 or newer
- MongoDB (local or Atlas)
- Android Studio (for building the Android app)

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory (see `.env.example`):

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/schoolApp
JWT_SECRET=your_very_long_random_secret
JWT_EXPIRES_IN=24h
CLIENT_ORIGIN=http://localhost:3000
TEACHER_REGISTRATION_CODE=optional_teacher_only_code
GEMINI_API_KEY=your_gemini_api_key_optional
```

Start the server:

```bash
npm start
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory (see `.env.example`):

```env
REACT_APP_API_URL=http://localhost:5000
```

Start the dev server:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Deployment

Deploy the backend and frontend separately. Netlify serves the frontend; the API needs a Node.js host and the database needs a managed MongoDB service.

1. **Backend API:** Use `backend` as the service root, Node.js 20.19 or newer, `npm ci` to install, and `npm start` to run. Configure `NODE_ENV=production`, `MONGO_URI`, a random `JWT_SECRET` of at least 32 characters, `CLIENT_ORIGIN` with the exact deployed Netlify site origin(s), and a strong `TEACHER_REGISTRATION_CODE`. `PORT` is assigned by most hosting platforms. `GEMINI_API_KEY` is optional and must only be configured on the backend. Configure the platform health check to use `/health`.
2. **Frontend on Netlify:** The root `netlify.toml` sets the base directory (`frontend`), build command (`npm ci && npm run build`), and publish directory (`build`). Connect the Git repository in Netlify, set `REACT_APP_API_URL` to the backend's public HTTPS URL in the site's environment variables, and deploy.
3. **Database:** Use a reachable managed MongoDB deployment, allow network access from the backend host, and provide its connection string as `MONGO_URI`.

Set `CLIENT_ORIGIN` to comma-separated origins without trailing slashes, including your Netlify URL (for example `https://your-site.netlify.app`). CRA embeds `REACT_APP_*` values into public JavaScript; never put secrets there. The root README contains a deployment checklist and verification commands.

### 3. Building for Production

```bash
cd frontend
npm run build
```

### 4. Android App (Capacitor)

```bash
cd frontend
npx cap sync android
npx cap open android
```

> **Note:** For Android, set `REACT_APP_API_URL` to `http://10.0.2.2:5000` (emulator) or your machine's LAN IP (physical device) before building.

## Project Structure

```
├── backend/               # Express API server
│   ├── middleware/        # auth, roleAuth, validate, sanitize, errorHandler
│   ├── models/            # Mongoose models (User, Attendance, Quiz, Submission, Lecture)
│   ├── routes/            # auth, attendance, quiz, lecture routes
│   └── services/          # AI quiz generator service
├── frontend/              # React frontend
│   ├── public/            # Static assets
│   └── src/               # Components, styles, API module
└── android/               # Capacitor Android project
```

## API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/register` | Register a new user | Public |
| POST | `/auth/login` | Login and get JWT | Public |
| POST | `/attendance/mark` | Mark single attendance | Teacher |
| POST | `/attendance/bulk-mark` | Bulk mark attendance | Teacher |
| GET | `/attendance/students-list` | List students with status | Teacher |
| GET | `/attendance/percentage/:studentId` | Student attendance % | Own/Teacher |
| GET | `/attendance/all/:studentId` | Student attendance records | Own/Teacher |
| POST | `/quiz/create` | Create quiz | Teacher |
| POST | `/quiz/ai-generate` | AI quiz generation | Teacher |
| GET | `/quiz` | List quizzes (no answers) | All |
| DELETE | `/quiz/:id` | Delete quiz | Teacher |
| POST | `/quiz/submit` | Submit quiz answer | Student |
| GET | `/quiz/results/:studentId` | Student results | Own/Teacher |
| GET | `/quiz/all-results` | All results (with names) | Teacher |
| POST | `/lecture/add` | Add lecture | Teacher |
| GET | `/lecture/:date` | Get lectures by date | All |
| DELETE | `/lecture/:id` | Delete lecture | Teacher |

## License

Private project.

