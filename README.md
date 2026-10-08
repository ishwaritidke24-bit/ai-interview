# The AI Interview Prep Kit 🚀

An end-to-end, multi-stage AI-powered interview preparation platform. It deterministically analyzes job descriptions alongside public company data to generate focused study requirements, robust question banks, schedules, and interactive flashcards.

## 🏗️ Architecture

This project is decoupled into two primary architectures:
1. **Frontend (Next.js 14)**: Uses App Router, Server Components, and Tailwind CSS.
2. **Backend (Node.js/Express)**: Uses Puppeteer/Cheerio for web crawling, Mongoose for persistence, and deeply integrates LLM generation pipelines.

### Data Flow Pipeline (The "Full Generation Flow")
1. **Initial Research**: Deeply crawls the company URL (bypassing SSRF/private networks).
2. **Company Brief & JD Extraction**: LLMs convert raw HTML and Job Descriptions into structural briefs and prioritized (`must`/`nice`) requirements.
3. **Interview Research**: Crawls public hiring sub-pages looking for specific technical interview formats.
4. **Question Generation**: Two-pass deterministic generation.
5. **Coverage Gap Checker**: Evaluates if the LLM successfully generated questions covering 100% of the `must` requirements. If gaps exist, executes Pass 2 explicitly bridging the gaps.
6. **Study Schedule Allocator**: Deterministic math distributes the finalized question load across the candidate's available days via arithmetic constraints.
7. **Flashcards**: Generates interactive quick-hit study cards.

---

## 🔐 Security, Edge Cases & UX
- **Asynchronous Generation & Polling**: Generating a kit is a heavy background task. The initial HTTP request (`POST /api/kits`) immediately queues the job and returns a kit ID. The frontend asynchronously polls a `GET /api/kits/:id/status` endpoint to stream deterministic stage-by-stage progress (e.g. `Extracting role requirements...`, `Generating questions...`) directly to the user, ensuring the browser never hangs or times out on long LLM pipelines.
- **Resilience & Duplicate Protection**: Submitting identical jobs yields the existing queued/generating kit, preventing duplicate background storms. If the LLM pipeline ultimately fails, users can trigger a clean retry via `POST /api/kits/:id/retry` without re-entering form data.
- **SSRF (Server-Side Request Forgery) Protection**: Crawler aggressively blocks loops to `localhost`, `127.0.0.1`, `10.x`, `192.168.x` internal ranges.
- **Prompt Injection Defense**: All user JD text and crawled HTML are securely fenced in `--- UNTRUSTED DATA START ---` tags, explicitly directing the LLM to ignore embedded commands.
- **LLM Output Failures / Retries**: Implements robust recursive `JSON.parse` validations. If output is garbled, it exponentially backs off and rewrites prompts up to `MAX_RETRIES`.
- **"Thin" Content**: Fluidly scales down requirements, questions, and schedules dynamically when JDs are abnormally short or hiring pages are non-existent (fails silently with warnings).

---

## 🛠️ Environment Setup & Installation

Ensure you have Node.js 18+ and MongoDB installed.

### 1. Clone & Install
```bash
git clone https://github.com/ishwaritidke24-bit/ai-interview.git
cd ai-interview

# Install Backend
cd backend
npm install

# Install Frontend
cd ../frontend
npm install
```

### 2. Configure Environment Variables
Create `.env` in the `backend/` folder:
```env
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/ai_interview_prep
SESSION_SECRET=your_secure_random_string
FRONTEND_URL=http://localhost:3000
LLM_API_KEY=YOUR_API_KEY_HERE
LLM_MODEL=gemini-1.5-flash
```

Create `.env.local` in the `frontend/` folder:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Run Locally
```bash
# Terminal 1 (Backend)
cd backend
npm run dev

# Terminal 2 (Frontend)
cd frontend
npm run dev
```
Navigate to `http://localhost:3000`.

---

## 🧪 Testing & Evaluation

### Unit & System Tests
We leverage Jest for comprehensive coverage of SSRF blockades, authorization spoofing, and schedule arithmetic algorithms.
```bash
cd backend
npm test
```

### Mandatory Batch Evaluator (Appendix B)
To trigger the automated background evaluator bypassing the frontend:
```bash
cd backend
npm run evaluate -- --input cases.json --output results.json
```
The script structurally executes the complete pipeline, capturing unhandled runtime crashes securely, and outputs the finished `Kit` arrays mapping success metrics to JSON.

---

## 🚀 Deployment Guide

### Backend (Render / Heroku / Fly.io)
1. Provision a MongoDB Atlas cluster.
2. Deploy the `backend/` directory as a Node.js Web Service.
3. Set Environment Variables (`MONGODB_URI`, `FRONTEND_URL`, `GEMINI_API_KEY`, etc.).
4. **Important**: Since the backend uses Puppeteer, you may need to specify a buildpack or install chromium dependencies (e.g., `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` and use a cloud browser, or deploy via Docker).

### Frontend (Vercel)
1. Import the repository into Vercel.
2. Change the "Root Directory" to `frontend`.
3. Add Environment Variable: `NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api`
4. Deploy!
