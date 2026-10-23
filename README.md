# 🌾 Farmer Connect 2.0

**Bolkar Record Karo. Saboot Ke Saath Hisaab Rakho. Sahi Mandi Chuno. Bharose Ke Saath Becho.**

A production-grade digital platform for Indian farmers — voice-based expense tracking, real-time mandi prices, transparent batai hisab, and QR-secured harvest passports.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or later
- MongoDB Atlas account (cluster active and IP whitelisted)
- Chrome or Edge (for voice features)

### Step 1 — Fix MongoDB Atlas Access (REQUIRED)

1. Go to https://cloud.mongodb.com → your project → **Network Access**
2. Click **+ ADD IP ADDRESS** → **ALLOW ACCESS FROM ANYWHERE** (0.0.0.0/0)
3. Click **Confirm** and wait ~30 seconds

### Step 2 — Start Backend

```bash
cd "d:\INDU GlOBAL\server"
node src/app.js
```

Server runs on **http://localhost:5000**  
Health check: http://localhost:5000/health

### Step 3 — Start Frontend

```bash
cd "d:\INDU GlOBAL\client"
npm run dev
```

App runs on **http://localhost:5173**

---

## 🏗️ Architecture

```
d:\INDU GlOBAL\
├── server/                    Node.js + Express 5 + MongoDB
│   ├── .env                   Credentials (never commit)
│   ├── src/
│   │   ├── app.js             Entry point
│   │   ├── config/db.js       MongoDB (auto-retry on fail)
│   │   ├── middleware/        Auth (JWT), Upload, Errors
│   │   ├── models/            15 Mongoose schemas
│   │   ├── routes/            14 Express routers
│   │   ├── services/          Gemini AI, Mandi, Weather, QR
│   │   └── utils/             Audit logger, Consistency engine
│   └── uploads/               Receipt/bill file storage
│
└── client/                    React 19 + Vite
    └── src/
        ├── pages/             19 pages across 9 feature areas
        ├── components/        12 reusable components
        ├── context/           JWT auth session
        ├── services/api.js    All 14 API modules
        └── hooks/             useVoice (Web Speech), useApi
```

---

## ✨ Features

### 🎙️ FarmGuard — Voice Farm Diary
- Speak expenses in Hindi/Hinglish: *"Aaj diesel ke 500 rupaye lage"*
- AI extracts category, amount, date, crop from voice
- Editable confirmation form before saving
- Receipt/bill photo attachment
- Append-only audit trail on every edit
- 14 expense categories (diesel, seeds, labour, etc.)

### 📊 Smart Mandi Timing
- Live mandi prices from **data.gov.in** API
- CSV import fallback for offline data
- Historical price charts with freshness indicators
- Multi-mandi comparison (up to 5 mandis)
- Net proceeds calculator (after transport, commission, labour)
- Transparent decision labels with full explanation

### 📋 Digital Khet Hisab (Batai Ledger)
- Farm → Plot → Season hierarchy
- Owner/operator agreement terms
- Receipt-linked expense entries
- Review → Acknowledge → Dispute workflow
- Settlement calculation with share breakdown
- Both party acknowledgements

### 🔑 QR Harvest Passport
- Secure unique QR per farm season
- Access-controlled (stakeholders_only / public_summary)
- Expiry + revocation support
- Public view at `/passport/:token` — no login required
- Evidence gallery + settlement summary
- IP-logged access trail

### 🤖 AI Krishi Mitra (Gemini)
- Hindi/Hinglish agricultural advice
- Crop recommendations by soil + NPK + pH
- Disease diagnosis with treatment plan
- Voice expense parsing

### 🌤️ Weather (Open-Meteo)
- 7-day forecast by district/state
- Farm advisories (e.g., avoid spraying if rain predicted)
- No API key needed

### 📜 Government Schemes
- PM-KISAN, PM Fasal Bima Yojana, KCC, and more
- State + category filters

### 🛒 Farmer Marketplace
- Direct farmer-to-buyer crop listings
- Quantity, quality, price, location
- Contact phone visible to interested buyers

---

## 🔑 Environment Variables (`server/.env`)

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `GEMINI_API_KEY` | Google Gemini AI API key |
| `DATAGOV_API_KEY` | data.gov.in API key for mandi prices |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `PORT` | Backend port (default: 5000) |
| `FRONTEND_URL` | Frontend URL for CORS (default: http://localhost:5173) |
| `MAX_FILE_SIZE` | Max file upload in bytes (default: 5MB) |
| `UPLOAD_PATH` | Local file storage path (default: ./uploads) |

---

## 📡 API Overview

Base URL: `http://localhost:5000/api`  
Auth: `Authorization: Bearer <token>`  
All money values in **paise** (÷100 = rupees)

| Module | Endpoints |
|---|---|
| Auth | POST /auth/register, /auth/login, GET /auth/me, PATCH /auth/me |
| Farms | GET/POST /farms, GET/PATCH /farms/:id, POST /farms/:id/plots |
| Seasons | GET/POST /seasons, GET/PATCH /seasons/:id, GET /seasons/:id/summary |
| Expenses | GET/POST /expenses, PATCH/DELETE /expenses/:id, POST /expenses/:id/attachments |
| Mandi | GET /mandi/observations, POST /mandi/fetch, POST /mandi/import |
| Mandi | GET /mandi/compare, GET /mandi/proceeds, GET /mandi/states |
| Harvest | POST/GET /harvest, PATCH /harvest/:id, POST /harvest/:id/sale |
| Settlement | GET /settlement/:seasonId, POST /settlement/:seasonId/calculate |
| QR | POST /qr/:seasonId/generate, GET /qr/:token/passport (public) |
| AI | POST /ai/chat, /ai/crop-recommend, /ai/disease, /ai/voice-parse |
| Weather | GET /weather?lat=&lon= |
| Schemes | GET /schemes |
| Marketplace | GET/POST /marketplace/listings |
| Audit | GET /audit/:entityType/:entityId |
| Consistency | GET/POST /consistency/:seasonId |

---

## ⚠️ Known Limitations

1. **Gemini API key**: Provided key format is unusual (`AQ.`). If AI features fail, get a fresh key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Voice recognition**: Requires Chrome/Edge browser. Not available in Firefox/Safari.
3. **File uploads**: Stored locally in `server/uploads/`. For production, migrate to S3 or Google Cloud Storage.
4. **QR URL**: Points to `http://localhost:5173` — update `FRONTEND_URL` in `.env` for production deployment.
5. **data.gov.in**: Free API may have rate limits. Historical data coverage varies by state/commodity.

---

## 🛡️ Security Notes

- Passwords hashed with bcryptjs (12 rounds)
- JWT tokens expire after 30 days
- File uploads: type + size validated, stored with UUID names
- Private farm records require authentication on every request
- QR tokens use UUID + crypto random bytes (unpredictable)
- QR revocation immediately blocks all future access
- Audit trail is append-only (no delete)
- Rate limiting: 100 req/15min general, 10 req/15min auth, 20 req/hour AI

---

## 📌 Implementation Status

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for full feature tracking.

---

*Built with ❤️ for Indian farmers — Khet Se Mandi Tak*
