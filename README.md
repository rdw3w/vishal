# TechVishalBoss API Wrapper 🔮

A production-ready, secure API wrapper that converts the TechVishalBoss number lookup service into a modern REST API with a sleek frontend dashboard.

## 🎯 Features

- ✅ **Secure API Wrapper** - POST endpoint for number lookups
- ✅ **Input Validation & Sanitization** - Prevent injection attacks
- ✅ **Rate Limiting** - 100 requests per 15 minutes
- ✅ **HTML Parsing** - Extract structured data from responses
- ✅ **Batch Processing** - Look up multiple numbers at once
- ✅ **Glassmorphic UI** - Modern dark theme dashboard
- ✅ **Search History** - LocalStorage-based history (5 last searches)
- ✅ **Copy to Clipboard** - Quick result sharing
- ✅ **Mobile Responsive** - Works on all devices
- ✅ **CORS Support** - Safe cross-origin requests
- ✅ **Security Headers** - Helmet.js integration

## 🚀 Quick Start

### Local Development

```bash
git clone https://github.com/rdw3w/vishal.git
cd vishal
npm install
cp .env.example .env
npm run dev
```

Server runs on `http://localhost:3000`

### Production Deployment (Vercel)

```bash
npm install -g vercel
vercel
```

## 📡 API Endpoints

### Health Check
```bash
GET /api/health
```

### Single Number Lookup
```bash
POST /api/number-info
Content-Type: application/json

{"number": "9876543210"}
```

### Batch Processing
```bash
POST /api/batch-numbers
Content-Type: application/json

{"numbers": ["9876543210", "8765432109"]}
```

## 🔐 Security Features

- Input Validation (7-15 digits only)
- Rate Limiting (100 req/15 min)
- CORS Protection
- Security Headers (Helmet.js)
- HTML Escaping
- No Sensitive Logging

## 📦 Tech Stack

- Backend: Node.js, Express.js
- Frontend: Vanilla JavaScript, HTML5, CSS3
- Parsing: Cheerio.js
- Validation: Validator.js
- Security: Helmet.js, Express-rate-limit
- HTTP: Axios
- Deployment: Vercel

## 📁 Project Structure

```
vishal/
├── server.js
├── package.json
├── .env
├── vercel.json
├── README.md
└── public/
    └── index.html
```

## 🧪 Testing

```bash
curl http://localhost:3000/api/health

curl -X POST http://localhost:3000/api/number-info \
  -H "Content-Type: application/json" \
  -d '{"number": "9876543210"}'
```

## 🌐 Frontend Features

- Dark Glassmorphic Theme
- Real-time Loading Animation
- Error Handling
- Search History (5 items)
- Copy to Clipboard
- Mobile Responsive

## 🚀 Deployment

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy automatically

---

**Author:** Vishal (@rdw3w)
**License:** MIT
