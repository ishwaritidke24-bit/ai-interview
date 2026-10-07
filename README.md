# AI Interview Prep Kit

## Project Overview
TODO: Provide an overview of the AI Interview Prep Kit.

## Tech Stack
- Frontend: Next.js + Tailwind CSS
- Backend: Node.js + Express
- Database: MongoDB
- Language: JavaScript

## Architecture
TODO: Describe the high-level architecture.

## Environment Variables
See \`.env.example\` for required variables.

## Local Setup
1. Clone the repository
2. Run \`npm install\` in the root, \`frontend\`, and \`backend\` directories, or run \`npm run install:all\` in root.
3. Start the dev servers with \`npm run dev\` from the root.

## Research Pipeline
The backend uses a targeted crawling engine (\`src/services/retrieval\`) to research a company before generating the kit.
- **SSRF Protection:** \`urlSafety.js\` blocks localhost, private IPs (10.x.x.x, 192.168.x.x), and restricts to HTTP/HTTPS.
- **Robots.txt:** The system checks \`/robots.txt\` and respects blocks before fetching pages.
- **Fetching & Rate Limiting:** Uses `fetch` with an `AbortController` (15s timeout) and an exponential backoff wrapper handling 429 and 5xx responses. Restricts by content-type and size.
- **Extraction:** Cleans HTML using `cheerio` to strip out scripts, styles, svgs, and navs, keeping pure readable text.
- **Link Discovery & Ranking:** Parses links and resolves relative paths securely. Ranks links based on anchor text, path keywords, and depth. Hiring and team pages score highest; login/cart pages are heavily penalized.
- **Crawl Strategy:** Uses a bounded crawl (MAX_PAGES = 5). Partial failures do not crash the pipeline, they are recorded in `failed_sources`.

## LLM Integration & Extraction
- **Provider:** Google Gemini (`gemini-1.5-flash`) was chosen for its generous free tier and fast JSON extraction capabilities.
- **Structured JSON Strategy:** The LLM client strictly enforces JSON extraction. It strips markdown blocks, parses the JSON, and structurally validates it against required schemas. If the model fails or returns malformed JSON, the pipeline catches it, retries up to 2 times with exponential backoff, and ultimately handles the error safely.
- **Security / Untrusted Data:** Web crawled text and the Job Description are treated as untrusted data. They are structurally isolated from system instructions using strict delimiters (`--- UNTRUSTED DATA START ---`) and explicit instructions forbidding the LLM from executing commands found within the text.
- **Company Brief & Requirement Extraction:** JD requirements are extracted strictly based on the text (no hallucination). "Required" skills map to priority `must`, while "Preferred" map to `nice`. They are categorized as `technical`, `behavioural`, or `domain`. Thin JDs produce correctly thin outputs. The company brief is generated entirely independently from the JD to prevent contamination.
## Kit Structure
See \`shared/schema.js\` for the canonical Kit definition.

## Batch Evaluation
Run batch evaluation using: \`npm run evaluate -- --input <cases.json> --output <kits.json>\`

## Testing
TODO: Describe testing strategy.

## Deployment
TODO: Describe deployment strategy (Vercel, Render, etc.).

## Design Decisions
TODO: Outline major design decisions.

## Known Limitations
TODO: Outline limitations.
