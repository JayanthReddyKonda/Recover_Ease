# RecoverEase 🏥

> **AI-powered post-surgical recovery companion** — symptom tracking, real-time doctor-patient communication, WhatsApp integration, and intelligent escalation alerts.

[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://recovery-ease.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📸 Live Demo

**Frontend:** [https://recovery-ease.vercel.app/](https://recovery-ease.vercel.app/)

---

## ✨ Features

### Patient Side

- 📊 **Daily Symptom Logging** — pain, fatigue, mood, sleep, energy, appetite, temperature
- 🎤 **Smart Voice Input** — say "pain is 7, slept 6 hours" and fields auto-fill
- 🤖 **AI Recovery Insights** — Groq LLM analyzes last 7 logs and provides personalized feedback
- 💬 **AI Chat Assistant** — conversational recovery guidance powered by Groq
- 💬 **Doctor Chat** — real-time messaging with assigned doctors via WebSocket
- 🚨 **SOS Alerts** — one-tap emergency alert sends email + WhatsApp to all linked doctors
- 📱 **WhatsApp Logging** — patients can log symptoms by messaging the bot on WhatsApp
- 🏆 **Milestones** — recovery milestone tracking and streak badges
- 📈 **History & Trends** — 7/14/30-day charts, pain heatmaps, and progress visualization

### Doctor Side

- 👥 **Patient Dashboard** — view all linked patients with severity indicators
- 📋 **Patient Detail** — full symptom history, AI clinical summaries, trend charts
- 🔔 **Escalation Alerts** — email + WhatsApp notifications for critical symptoms and SOS events
- ✅ **Care Plan Tasks** — assign and track custom recovery tasks per patient
- 💬 **Real-time Chat** — accept/reject patient chat requests, real-time messaging
- 🔗 **Doctor Request System** — patients link to doctors via unique 6-character codes

### Infrastructure

- 🔐 JWT authentication with refresh
- ⚡ Real-time via Socket.IO
- 🗃️ PostgreSQL with Alembic migrations
- 🚀 Redis for session/rate limiting
- 🌐 ngrok for local-to-public tunnel
- 🐳 Fully Dockerized (4-container stack)
- 📧 Gmail SMTP email alerts
- 📲 Meta WhatsApp Business API integration

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Vercel)                    │
│          React + TypeScript + Vite + TailwindCSS        │
│              https://recovery-ease.vercel.app           │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / WSS
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   ngrok Tunnel                           │
│          sun-unupset-pursuingly.ngrok-free.dev          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Backend (FastAPI + Python)                  │
│                    Port 8000                             │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐    │
│  │ REST API │  │ Socket.IO│  │  Background Tasks  │    │
│  └──────────┘  └──────────┘  └────────────────────┘    │
└──────┬──────────────────────────────────┬───────────────┘
       │                                  │
       ▼                                  ▼
┌─────────────┐                  ┌────────────────┐
│  PostgreSQL │                  │     Redis      │
│  Port 5432  │                  │   Port 6379    │
└─────────────┘                  └────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Framer Motion |
| Backend | FastAPI, Python 3.12, SQLAlchemy, Alembic, Socket.IO |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| AI | Groq API (llama-3.3-70b-versatile) |
| Auth | JWT (HS256) |
| Email | Gmail SMTP |
| Messaging | Meta WhatsApp Business API |
| Tunnel | ngrok |
| Container | Docker + Docker Compose |
| Frontend Deploy | Vercel |
| Backend Deploy | Docker Hub (`jayanthreddyk/recompanion-backend`) |

---

## 📁 Project Structure

```
RecoverEase/
├── backend-python/               # FastAPI backend
│   ├── app/
│   │   ├── api/                  # Route handlers
│   │   │   ├── auth.py           # Register, login, /me
│   │   │   ├── patient.py        # Patient profile, SOS
│   │   │   ├── symptom.py        # Symptom logging & trends
│   │   │   ├── chat.py           # Doctor-patient & AI chat
│   │   │   ├── request.py        # Doctor link requests
│   │   │   ├── ai.py             # AI insight & summary
│   │   │   ├── care_plan.py      # Recovery tasks
│   │   │   └── webhook.py        # WhatsApp webhook
│   │   ├── core/                 # Config, DB, Redis, security
│   │   ├── middleware/           # Auth, error handler, rate limiter
│   │   ├── models/               # SQLAlchemy ORM models
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   ├── services/             # Business logic layer
│   │   └── socket/               # Socket.IO manager
│   ├── alembic/                  # Database migrations
│   ├── docker-compose.yml        # 4-container stack
│   ├── Dockerfile                # Multi-stage Python build
│   ├── requirements.txt
│   └── .env.example              # All required environment variables
│
├── frontend/                     # React frontend
│   ├── src/
│   │   ├── pages/                # Full-page route components
│   │   ├── components/           # Reusable UI components
│   │   ├── api/                  # Axios API clients
│   │   ├── hooks/                # useAuth, useSocket
│   │   ├── store/                # Zustand global store
│   │   └── types/                # TypeScript interfaces
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── Dockerfile
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- A [ngrok account](https://ngrok.com/) (free tier is fine)
- A [Groq API key](https://console.groq.com/) (free)
- Gmail account with [App Password](https://myaccount.google.com/apppasswords) enabled
- (Optional) [Meta WhatsApp Business API](https://developers.facebook.com/) credentials

### 1. Clone the repository

```bash
git clone https://github.com/JayanthReddyKonda/Recover_Ease.git
cd Recover_Ease
```

### 2. Configure environment variables

```bash
cd backend-python
cp .env.example .env
```

Edit `.env` and fill in all required values:

```env
# PostgreSQL
POSTGRES_USER=rc_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=recovery_companion

# JWT
JWT_SECRET=your_64_char_random_secret

# Groq AI
GROQ_API_KEY=gsk_...

# Gmail SMTP
SMTP_USER=yourmail@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx   # 16-char app password

# WhatsApp (optional)
WHATSAPP_TOKEN=EAAW...
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_VERIFY_TOKEN=any_secret_string

# Ngrok
NGROK_AUTHTOKEN=your_ngrok_auth_token
NGROK_DOMAIN=your-domain.ngrok-free.app
```

### 3. Start the backend stack

```bash
cd backend-python
docker compose --env-file .env up --build -d
```

This starts:

- `recoverease_postgres` — PostgreSQL database
- `recoverease_redis` — Redis cache
- `recoverease_backend` — FastAPI backend on port 8000
- `recoverease_ngrok` — ngrok tunnel (inspect at <http://localhost:4040>)

### 4. Configure WhatsApp Webhook (optional)

1. Go to Meta Developer Console → Your App → WhatsApp → Configuration
2. Set callback URL: `https://your-domain.ngrok-free.app/api/webhook/whatsapp`
3. Set verify token: value of `WHATSAPP_VERIFY_TOKEN` in your `.env`
4. Subscribe to the `messages` webhook field

### 5. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Or for production build:

```bash
npm run build
```

### Frontend Environment

Create `frontend/.env.local`:

```env
VITE_API_URL=https://your-domain.ngrok-free.app
```

---

## 🐳 Docker Hub

The backend image is published at:

```bash
docker pull jayanthreddyk/recompanion-backend:latest
```

---

## 📱 WhatsApp Symptom Logging

Patients can log symptoms by sending a WhatsApp message to the bot:

```
pain is 7, slept 6 hours, mood 4, energy 5
```

The bot will:

1. Parse the message using Groq AI
2. Save as a symptom log
3. Run the escalation engine
4. Reply with a confirmation summary

**SOS via WhatsApp:**

```
SOS I fell down and can't get up
```

This immediately triggers:

- Email alert to all linked doctors
- WhatsApp alert to all linked doctors

---

## 🔐 Environment Variables Reference

See [`backend-python/.env.example`](backend-python/.env.example) for the full list with descriptions.

---

## 📊 API Documentation

When the backend is running, visit:

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👤 Author

**Jayanth Reddy Konda**

- GitHub: [@JayanthReddyKonda](https://github.com/JayanthReddyKonda)

---

*Built with ❤️ for better post-surgical recovery outcomes.*
