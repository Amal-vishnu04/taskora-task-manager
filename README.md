<div align="center">
✅ Taskora

Organize. Focus. Complete.

A full-stack task manager with secure per-user workspaces, image attachments, and automated email reminders, deployed end-to-end on the cloud.

Live Demo API Health

</div>
🔗 Links
Service	URL
Frontend	https://taskora-task-manager-xoai.vercel.app
Backend API	https://taskora-task-manager.vercel.app
Health check	https://taskora-task-manager.vercel.app/api/health
💡 What is Taskora?

Taskora is a clean, distraction-free workspace where every user sees only their own tasks. Sign up with a Gmail address, create tasks with due dates and images, track progress from Pending → In Progress → Completed, and get an email nudge before a deadline slips.

✨ Features

🔐 Authentication & Security

Register / login with Gmail-only email validation
Passwords hashed with bcrypt
Stateless JWT auth with protected API routes
Strict per-user data isolation (every query is scoped by user_id)

📋 Task Management

Full CRUD: create, view, edit, delete
Status tracking: Pending, In Progress, Completed
Descriptions, due dates, and overdue highlighting
Search and filter by status

📊 Dashboard

Live counters: total, pending, in-progress, completed
Responsive task cards with quick edit and delete

🖼️ Image Attachments (Cloudinary)

Upload JPEG, PNG, or WEBP (max 5 MB)
Preview, replace, and remove images
Images served via CDN; only the URL is stored in the database
Cloudinary asset is cleaned up when a task or image is removed

📧 Email Automation (Nodemailer + Gmail SMTP)

Welcome email on registration
Due-date reminder roughly 24 hours before a deadline
FRONTEND_URL keeps production emails from linking to localhost

🎨 UX Details

Light and dark themes with saved preference
Toast notifications, confirmation dialogs, loading and empty states
Mobile-friendly layout, accessible form controls, reduced-motion support
🧰 Tech Stack
Layer	Technology
Frontend	React, Vite, React Router, Axios, Lucide React, CSS
Backend	Node.js, Express.js
Auth	JWT, bcrypt
Database	PostgreSQL (Neon)
Media	Cloudinary, Multer
Email	Nodemailer, Gmail SMTP
Testing	Playwright
Hosting	Vercel
🏗️ Architecture
HTTPS / REST
👤 User: Browser / Mobile
React + Vite Frontend
Express.js API
JWT Middleware
Auth & Task Controllers
PostgreSQL on Neon
Cloudinary CDN
Email Service
Gmail SMTP
Reminder Service
📁 Project Structure
text
taskora-task-manager/
├── backend/
│   ├── api/index.js              # Vercel serverless entry
│   ├── db/schema.sql             # Database schema
│   ├── src/
│   │   ├── config/               # db.js, cloudinary.js
│   │   ├── controllers/          # authController.js, taskController.js
│   │   ├── middleware/           # authMiddleware.js
│   │   ├── routes/               # authRoutes.js, taskRoutes.js
│   │   ├── services/             # emailService.js, reminderService.js
│   │   └── utils/                # validation.js
│   ├── server.js
│   ├── vercel.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/                # auth/, dashboard/
│   │   ├── services/
│   │   ├── utils/
│   │   └── App.jsx
│   └── vite.config.js
└── README.md
🚀 Getting Started
Prerequisites
Node.js 18+
A PostgreSQL database (Neon or local)
A Cloudinary account
A Gmail account with an App Password
1. Clone
bash
git clone https://github.com/<your-username>/taskora-task-manager.git
cd taskora-task-manager
2. Set up the database
bash
psql "$DATABASE_URL" -f backend/db/schema.sql
3. Run the backend
bash
cd backend
npm install
cp .env.example .env
npm run dev

API runs at http://localhost:5000.

4. Run the frontend
bash
cd frontend
npm install
npm run dev

App runs at http://localhost:5173.

🔑 Environment Variables

backend/.env

env
PORT=5000
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=your_gmail_app_password

FRONTEND_URL=https://taskora-task-manager-xoai.vercel.app

frontend/.env

env
VITE_API_URL=https://taskora-task-manager.vercel.app/api

Note: Never commit real .env files. Gmail SMTP needs an App Password, not your normal password.

📡 API Reference

Base path: /api. Protected routes need this header:

http
Authorization: Bearer <your_jwt_token>
Method	Endpoint	Description	Auth
GET	/health	Service health check	No
POST	/auth/register	Create account (Gmail only)	No
POST	/auth/login	Login and receive JWT	No
GET	/tasks	List the current user's tasks	Yes
POST	/tasks	Create a task (multipart, optional image)	Yes
PUT	/tasks/:id	Update a task	Yes
DELETE	/tasks/:id	Delete a task and its image	Yes

Example: register

json
POST /api/auth/register
{
  "name": "Amal",
  "email": "amal@gmail.com",
  "password": "StrongPass@123"
}

Example: create task

json
POST /api/tasks
{
  "title": "Finish internship project",
  "description": "Deploy and write the README",
  "status": "pending",
  "due_date": "2026-10-15"
}
☁️ Deployment (Vercel)

Backend

Create a new Vercel project and set Root Directory to backend.
vercel.json routes all traffic to api/index.js.
Add all backend environment variables in the Vercel dashboard.
Deploy and verify /api/health.

Frontend

Create another Vercel project with Root Directory set to frontend.
Framework preset: Vite.
Add VITE_API_URL pointing to your backend /api.
Deploy.

If the backend URL changes, update VITE_API_URL, FRONTEND_URL, and the CORS allowed origin.

🧪 Testing
bash
cd frontend
npx playwright install
npx playwright test
🧠 Design Decisions
Cloudinary over database blobs: keeps PostgreSQL lean and serves images through a CDN.
Scoped queries: every task query filters by the authenticated user_id, so users can never read each other's data.
Env-driven email links: FRONTEND_URL guarantees production emails never point to localhost.
Serverless-ready backend: a dedicated api/index.js entry lets Express run on Vercel.
🗺️ Roadmap
 Task categories and tags
 Drag-and-drop status board
 Password reset via email
 Push notifications
👤 Author

Amal Final-year B.E. CSE student and MERN stack developer

