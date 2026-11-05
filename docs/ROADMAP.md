# BeaconPort Roadmap (for the AI agent)

Read AGENTS.md first. Its safety and working rules apply to every phase. Work only on the phase the owner names. Each phase is one branch: Implementation Plan for approval, then the work, then the report described in AGENTS.md.

Owner-only tasks (remind the owner, do not attempt them):
- Check in the Render dashboard which GitHub repo and branch the backend deploys from.
- Add new environment variables (for example GOOGLE_CLIENT_ID, GEMINI_MODEL) in Render and Vercel.
- Create any real AWS resources and run any deployment command.

---

## Phase 0: Orientation (no edits)
- Read the whole repo. Controllers for teacher, notice, examination, schedule, salary, subject and chat history, plus student and teacher login, were only skimmed in an earlier review. Audit them for the bug classes listed in Phase 2: missing tenant scope on :id routes, password hashes in responses, mass assignment, unescaped regex, unbounded uploads.
- Output: findings (file and line), risks, questions for the owner, and a confirmed plan. Then stop.

## Phase 1: Repo hygiene and clone instructions
Branch: phase-1-repo-hygiene

1. README installation section. The clone URL points to kalviumcommunity/S86_Bhavdeep_Capstone_BeaconPort, which is the wrong repo. Replace the steps with:
   - `git clone https://github.com/Bhavdeep-Sai/BeaconPort.git`
   - `cd BeaconPort`
   - Backend: `cd Server && npm install && npm start`
   - Frontend (second terminal): `cd Client && npm install && npm run dev`
   The README uses lowercase `client` and `server`, but the real folders are `Client` and `Server`; lowercase breaks on case-sensitive file systems. Leave the rest of the README for Phase 7.
2. Add Server/.env.example and Client/.env.example with the variable names from AGENTS.md and placeholder values. The README references .env.example but none exists.
3. Add a root .gitignore: .env, .env.*, !.env.example, node_modules, dist, coverage, uploads/, INTERVIEW_NOTES.local.md.
4. Dependencies (grep to confirm each is unused before removing): passport, passport-github2, passport-google-oauth20, express-session, connect-mongo, and the "crypto" npm package (Node's built-in crypto is what the code uses). Keep only one of bcrypt and bcryptjs, whichever the code imports, and unify. Move nodemon to devDependencies and add a "dev" script. Remove the startup code in server.js that creates an unused uploads/ folder after confirming nothing reads it. Remove the unused User model after confirming no references.
5. Prove the server still starts, using a throwaway .env.test and a local or in-memory MongoDB. Never use the real .env.

## Phase 2: Security fixes and test harness
Branch: phase-2-security

Setup first: split server.js into app.js (builds and exports the Express app, no listen) and server.js (connects to the database and listens), so Supertest can import the app. Add Jest, Supertest and mongodb-memory-server, with helpers that create two schools, each with a teacher and a student. Mock axios for Google and Gemini calls. For each fix below, write a failing test first, then fix.

2.1 Google login (critical). Today Client/src/Client/components/Login/Login.jsx gets a Google access token in the browser, calls Google's userinfo itself, and POSTs only { email, provider } to /api/school/login/oauth. loginSchoolGoogle in Server/controllers/schoolController.js then issues a 7-day JWT for that email with no verification, so anyone who knows a Google-registered school's email can log in as it. Fix: the client sends the access_token; the server verifies it with Google (look up the right endpoint in Google's current docs), checks that the audience equals GOOGLE_CLIENT_ID and that the email is verified, then matches on oauthId and email. Apply the same audience check in registerSchoolGoogle. New env var: GOOGLE_CLIENT_ID. Note in the report that old clients will fail Google login until the client is redeployed.

2.2 Cross-tenant access. GET /api/attendance/:id (getAttendance) loads the student with Student.findById and no school or ownership check, so any logged-in user can read any student's records in any school. STUDENT may read only themselves; TEACHER and SCHOOL are scoped to req.user.schoolId. Audit every route with an :id for the same flaw. In markAttendance and markBulkAttendance, also verify that classId and every studentId belong to the caller's school.

2.3 Password hashes in responses. The attendance endpoint, getStudentsWithQuery, getStudentOwnData and possibly others return student documents including password. Set select:false on password in the School, Student and Teacher schemas, and use .select('+password') only in login and reset code. Add a test that scans every response body for a "password" key.

2.4 GET /api/school/all is public and lists every school's name, email and owner. Grep the client to see whether it is needed. If yes, return only id, schoolName and schoolImg; if not, remove it.

2.5 Mass assignment. updateClassWithId does $set: req.body. Whitelist fields there and in every other update handler.

2.6 Abuse protection. Add express-rate-limit (strict on login, register and forgot-password; a separate limiter for the AI endpoint), helmet, strict CORS and a JSON body size limit. Make login and forgot-password errors generic (today: "Email not found" vs "Password is incorrect"). Store only a SHA-256 hash of the password-reset token. Replace bcrypt hashSync and compareSync with async calls.

2.7 AI tutor (Server/controllers/aiTutorController.js). Add a server-side per-user rate limit and daily quota; the only current limiter is the browser's localStorage. Cap message length and the count and size of previous_messages. Send the API key in a header, not the URL. Read the model name from a GEMINI_MODEL env var. The hardcoded gemini-1.5-flash-latest is retired: look up currently supported models in Google's docs, do not guess. Handle upstream errors cleanly and never log prompts.

2.8 Escape user input before using it in $regex (student, notice and chat-history search) and cap its length.

2.9 Uploads. Add maxFileSize and a file-type allowlist to every formidable form (studentController and teacherController have none). Do not trust the client-supplied mimetype alone.

2.10 Plaintext password in the browser. With "Remember me" ticked, Login.jsx saves `rememberedPassword_<role>` in localStorage and reads it back to prefill the form. Never store the password. Remember only the email, use proper autocomplete attributes so the browser's password manager does the job, and remove any existing rememberedPassword_* keys on load.

Required tests: Google login rejects missing and invalid tokens; every :id route returns 403 or 404 across tenants; no password key in any response; mass-assignment attempts are ignored; 429 on rate limit; AI input caps and per-user limit.

## Phase 3: Database design
Branch: phase-3-database

3.1 Replace `createdAt: { default: new Date() }` with Date.now or timestamps:true in School, Student, Teacher, Class and Subject. The value is currently fixed when the server boots. Fix the `createAt` typo in Class and `ref: "school"` in Teacher (should be "School"). Check client usage before renaming any field.
3.2 Add indexes: Student {school, studentClass}; unique {school, email} for Student and Teacher; Class {school}; Subject {school, subjectCode}; Salary unique {school, teacher, month, year}. Write a migration script that reports existing duplicates before the unique indexes are created.
3.3 Attendance: stop using server-local setHours. Store a school-local dateKey (YYYY-MM-DD) or a normalised UTC date. Compute summaries with a $group aggregation instead of loading and filtering in JavaScript. Make bulk marking atomic (bulkWrite) and return 409 on duplicates instead of 500.
3.4 Add backward-compatible pagination (page, limit, sensible default, metadata) to list endpoints, starting with students. Use .lean() and field selection on read paths.
3.5 Rewrite bulkGenerateFees to use batched bulkWrite upserts instead of Promise.all with a find and a create per student. It must be idempotent and safe under concurrent calls.
3.6 Add npm scripts for migrations and for an explain() report on the key queries. Save before and after output in docs/perf/. Stretch: store money as integer minor units with a migration; if skipped, list it as a known limitation.

## Phase 4: Architecture
Branch: phase-4-architecture

4.1 Introduce layers incrementally (routes, controllers, services, data access), starting with the largest controllers (schoolController, noticeController, ExaminationController). Controllers handle HTTP only.
4.2 Add one tenant-scoping helper or middleware so the school filter is applied in one place and cannot be forgotten.
4.3 Add: env validation at startup (fail fast with a clear message), a central error handler and async wrapper, request validation on write endpoints (Zod or Joi), pino with pino-http and request IDs (redact authorization and password), GET /health (liveness), GET /ready (checks the database), and graceful shutdown on SIGTERM. Replace the console calls.
4.4 Move scheduled work out of the web process. Create job functions in Server/jobs/ (schedule cleanup, fee overdue marking) with a CLI entry (node jobs/run.js <name>). Keep an ENABLE_IN_PROCESS_CRON flag that defaults to false. Remove the write-on-read overdue update from the GET fee overview handler.
4.5 Stretch, only if everything else is green: a short-lived access token plus a rotating refresh token in an httpOnly cookie. List every client change it needs.

## Phase 5: Containers, CI, observability
Branch: phase-5-devops

5.1 Server/Dockerfile: multi-stage, current Node LTS (verify the version), npm ci --omit=dev, non-root user, HEALTHCHECK on /health. Add .dockerignore.
5.2 docker-compose.yml for local development: API plus MongoDB with a volume, driven by .env. If Docker is not available in this environment, write the files and mark them NOT VERIFIED.
5.3 GitHub Actions ci.yml on pull requests and pushes: install with cache, lint, test with coverage, npm audit for production dependencies, secret scan (gitleaks), docker build. Add Dependabot config.
5.4 deploy.yml: after CI passes on main, build and push the image to ECR using GitHub OIDC (no long-lived AWS keys), then deploy to the EC2 host with SSM Run Command (no open SSH port). Use placeholders for account id and region and document the required repository variables.

## Phase 6: AWS deliverables (code and runbook only)
Branch: phase-6-aws

6.1 Terraform in infra/terraform: VPC with subnets, security groups (80 and 443 inbound, no SSH), one small EC2 instance with an instance profile (SSM, ECR pull, read access to SSM Parameter Store path /beaconport/*, CloudWatch Logs), an ECR repository, a CloudWatch log group, and the GitHub OIDC role. Secrets are SecureString parameters the owner creates by hand; never put secret values in Terraform files or state.
6.2 Nginx reverse proxy config. The frontend is HTTPS on Vercel, so the API must be HTTPS too or browsers block it as mixed content. Offer the simplest option (CloudFront in front of the EC2 origin, or a domain plus certbot), document the trade-offs, and update the CORS allowlist. Do not remove the existing Render setup or the fallback URL in Client/src/environment.js until the owner decides.
6.3 Scheduled jobs: default to a systemd timer on the EC2 host running the job container. Optional: EventBridge Scheduler plus Lambda; if included, document the MongoDB Atlas network-access trade-off (Lambda has no static IP without a NAT).
6.4 docs/DEPLOY.md: exact commands for the owner to run, a cost estimate, an AWS Budgets alarm setup, and a teardown procedure (terraform destroy).

## Phase 7: Documentation
Branch: phase-7-docs

- Rewrite README.md so every claim is true: accurate stack (CommonJS, not ESM), a Mermaid architecture diagram, a Mermaid ER diagram, a roles and permissions matrix, the tenant-isolation model, an env var table, local setup with docker compose, how to run tests, CI/CD and deployment overview, and known limitations. Remove claims about Cypress or any feature that does not exist.
- Add docs/DECISIONS.md with short entries on key trade-offs: why MongoDB here and where PostgreSQL would fit better, tenant scoping, jobs outside the web process, the HTTPS approach.
- Add an OpenAPI 3 file built from the routes and the Bruno collection, and update the Bruno collection for changed endpoints.
- Final check: every README claim against the code, and every number in docs against a real run.