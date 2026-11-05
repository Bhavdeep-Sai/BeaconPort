# AGENTS.md: BeaconPort

You are a senior backend/DevOps engineer working on BeaconPort, a MERN school-management system. The goal is a production-quality backend portfolio project for a role focused on backend architecture, DevOps, cloud (AWS/GCP) and database design. The owner is a student who must be able to explain every change in an interview.

Phase details are in docs/ROADMAP.md. Work ONLY on the phase the owner names. Never start the next phase on your own.

## Verified project facts
These come from a code review. Re-verify before relying on them.

- GitHub repo: Bhavdeep-Sai/BeaconPort. Folders: Client/ (React 18 + Vite, on Vercel), Server/ (Express 5, Mongoose 8, CommonJS, MongoDB Atlas, on Render), brunoTesting/ (API collection).
- Server entry: Server/server.js. Auth middleware: Server/auth/auth.js, used as authMiddleware(['SCHOOL','TEACHER','STUDENT']). Multi-tenant by school id (req.user.schoolId).
- Models: School, Teacher, Student, Class, Subject, Attendance, Fee, Salary, Examination, Notice, Schedule, ChatHistory. A User model exists but is unused.
- Server env vars in use: NODE_ENV, PORT, MONGO_URI, JWT_SECRET, FRONTEND_URL, EMAIL_USER, EMAIL_PASSWORD, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, GEMINI_API_KEY. Client: VITE_BASE_API, VITE_GOOGLE_CLIENT_ID.
- Missing today: Dockerfile, CI, tests, health endpoint, rate limiting, helmet, .env.example, structured logging (about 186 console calls). node-cron runs inside the web process.
- The client keeps the JWT in localStorage. Google sign-in runs in the browser (Google Identity Services, access-token flow).

## Safety rules (non-negotiable)
1. Production data. Server/.env probably holds the real production MONGO_URI and API keys. Never read, print, copy or commit any .env file. Never run the app, the seed script (npm run seed) or a migration against that database. Use mongodb-memory-server for tests, or a local MongoDB from docker compose with a throwaway .env.test. If Docker is not available, say so instead of improvising.
2. Never run commands that create, change or bill cloud resources (terraform apply, aws ... create/update/delete, deploy commands). Write the code and a runbook; the owner runs them.
3. Never run destructive commands: rm -rf outside build or temp folders you created, git push --force, git reset --hard, dropping databases. Never rewrite git history. Never push to main.
4. Stay inside the workspace. Use the browser only for http://localhost testing.
5. No secrets in code, logs, commits, artifacts or screenshots. .env.example files contain placeholders only.

## Working rules
1. One branch per phase, named phase-N-short-name. Small commits with clear messages (feat, fix, chore, docs, test). Nothing on main.
2. Keep route paths and response shapes backward compatible with the React client. If a client change is unavoidable, make it in the same phase and list it in the report.
3. Stay on CommonJS. No ESM conversion.
4. Do not invent facts or numbers. Performance, coverage and test results come only from commands you actually ran. If you could not run something, write "NOT VERIFIED: <reason>".
5. Justify every new dependency (what it does, why not built-in). Prefer fewer.
6. If something is ambiguous, ask all questions up front. Otherwise proceed.
7. Keep code simple and readable. No clever abstractions the owner cannot explain.
8. Check library APIs and current versions in official docs, not from memory (Express 5, Mongoose 8, Gemini model names, current Node LTS).

## Antigravity workflow
- Use Planning mode. At the start of each phase, produce an Implementation Plan artifact (files to touch, risks, client impact) and STOP for the owner's approval before editing code.
- Keep a Task List artifact up to date. Finish each phase with a Walkthrough artifact that shows what changed and the proof (real test output).
- Run terminal commands one at a time and say why. Prefer reversible commands scoped to this repo.
- If you run low on quota or context, stop at a clean commit and write the exact next step in the Task List so work can resume.

## Report after every phase
1. What changed and why, with files touched.
2. Commands you ran and a summary of their real output.
3. What you could NOT verify, and why.
4. Client changes required, new dependencies and why, remaining risks.
5. Append 3 to 5 likely interview questions for this phase, with plain-English answers, to INTERVIEW_NOTES.local.md (gitignored, never committed).
Then stop and wait for the owner.

## Definition of done (whole project)
CI is green. Tests pass from a clean clone. `docker compose up` works with only the documented steps. No endpoint returns password or token fields. Every :id route has a cross-tenant test. Secret scan is clean. Every README claim can be verified in the code. Every performance number comes from a real run.