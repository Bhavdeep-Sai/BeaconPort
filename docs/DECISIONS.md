# BeaconPort Architecture Decision Records (ADRs)

This document records the critical architectural, security, and infrastructure decisions made in BeaconPort, including context, options considered, trade-offs, and future migration paths.

---

## Table of Contents
- [ADR 001: Database Choice — MongoDB vs PostgreSQL for Multi-Tenancy](#adr-001-database-choice--mongodb-vs-postgresql-for-multi-tenancy)
- [ADR 002: Tenant Isolation Strategy — Centralized Query Scoping Helper (`withTenant`)](#adr-002-tenant-isolation-strategy--centralized-query-scoping-helper-withtenant)
- [ADR 003: Background Processing — Decoupled Host Systemd Timers vs Serverless AWS Lambda](#adr-003-background-processing--decoupled-host-systemd-timers-vs-serverless-aws-lambda)
- [ADR 004: HTTPS Edge Strategy — AWS CloudFront Distribution vs Host Certbot](#adr-004-https-edge-strategy--aws-cloudfront-distribution-vs-host-certbot)
- [ADR 005: Zero-SSH Deployment — GitHub Actions OIDC Federation & AWS Systems Manager (SSM)](#adr-005-zero-ssh-deployment--github-actions-oidc-federation--aws-systems-manager-ssm)

---

## ADR 001: Database Choice — MongoDB vs PostgreSQL for Multi-Tenancy

### Status
Accepted

### Context
BeaconPort is a multi-tenant school management system serving schools, administrators, teachers, and students. Educational entities have diverse and evolving schema requirements: examination grading structures vary by institution, timetables have flexible period arrangements, fee structures contain customizable line items, and unstructured AI tutor chat histories must be stored.

### Decision
We use **MongoDB (Document Database)** with Mongoose 8 for BeaconPort's operational datastore, enforcing tenant boundaries logically via compound indexing on `{ school: 1, ... }`.

### Consequences & Trade-offs
- **Advantages**:
  - Flexible document schemas for nested structures (e.g. subject lists inside classes, dynamic grading scales, AI chat transcripts).
  - High write throughput for event-driven tracking (daily attendance marking, chat messages).
  - Rapid prototyping and schema evolution without destructive relational migrations during early product cycles.
  - Native atomic updates via batched `bulkWrite` and document-level locking.
- **Disadvantages & Risks**:
  - Lack of cross-collection relational foreign key constraints at the database engine level (referential integrity must be enforced by application services).
  - Relational joins (`$lookup`) are more expensive in MongoDB than native SQL joins.
  - Multi-document transactions require replica set overhead and careful concurrency management.

### Where PostgreSQL Would Fit Better
In an enterprise-scale multi-tenant system with strict financial reporting, PostgreSQL would be superior:
1. **Row-Level Security (RLS)**: PostgreSQL supports native `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, enforcing tenant isolation at the database kernel level (`WHERE school_id = current_setting('app.current_school_id')`), eliminating the risk of developer omission in application queries.
2. **ACID Financial Transactions**: Complex fee billing, payroll ledgers, and invoice reconciliation benefit from native ACID table constraints, strict foreign key cascading, and table-level `CHECK` constraints (e.g. non-negative balances).
3. **Schema-per-Tenant Alternative**: PostgreSQL schemas (`CREATE SCHEMA school_123`) provide clean physical isolation and easy per-tenant data extraction/backups while sharing a single database instance.

---

## ADR 002: Tenant Isolation Strategy — Centralized Query Scoping Helper (`withTenant`)

### Status
Accepted

### Context
In a shared-database multi-tenant application, every data query must include the tenant identifier (`school: req.user.schoolId`). If an endpoint handler queries a document solely by its ID (e.g., `Class.findById(id)` or `Attendance.find({ student: id })`), an authenticated user from School A can access, modify, or delete records belonging to School B simply by submitting School B's resource ID (Insecure Direct Object Reference / IDOR).

### Decision
We introduced a centralized tenant scoping utility in [`Server/utils/tenant.js`](file:///w:/Projects/BeaconPort/Server/utils/tenant.js) (`withTenant(query, req)`) and paired it with Express middleware (`tenantContext`) that extracts and validates `req.user.schoolId`. All controllers and services MUST construct read, update, and delete queries by applying `withTenant(filter, req)`.

### Alternatives Considered
1. **Global Mongoose Query Middleware (`schema.pre('find', ...)` )**:
   - *Why rejected*: In Mongoose, global query hooks lack native access to the Express HTTP request context (`req`). Passing `req.user` into Mongoose queries requires thread-local storage (`AsyncLocalStorage`), which introduces debugging complexity, unhandled edge cases in background jobs, and silent query pollution.
2. **Manual Ad-Hoc `{ school: req.user.schoolId }` in every controller**:
   - *Why rejected*: High cognitive burden on developers. A single missed filter in one endpoint compromises tenant isolation for the entire system.
3. **Separate Database per School**:
   - *Why rejected*: Cost-prohibitive for small educational institutions and complex connection pool management on serverless or low-memory compute.

### Consequences
- Centralizes tenant scoping logic in a single, unit-tested function.
- Prevents accidental cross-tenant data leaks and enforces 403 Forbidden or 404 Not Found on cross-tenant ID queries.
- Backed by compound unique indexes (`{ school: 1, email: 1 }`, `{ school: 1, subjectCode: 1 }`).

---

## ADR 003: Background Processing — Decoupled Host Systemd Timers vs Serverless AWS Lambda

### Status
Accepted

### Context
BeaconPort requires daily automated background tasks:
1. `scheduleCleanup`: Deletes expired notices and timetable items older than 30 days.
2. `feeOverdue`: Evaluates unpaid student invoices past their due dates and updates statuses to `OVERDUE`.

Previously, these tasks ran inside the web server process using `node-cron`. In-process cron blocks the Node.js event loop during heavy execution, duplicates work across scaled web instances, and risks race conditions.

### Decision
We decoupled all scheduled jobs into a dedicated CLI runner ([`Server/jobs/run.js`](file:///w:/Projects/BeaconPort/Server/jobs/run.js)) and deployed them as **host-level systemd service and timer units** ([`infra/systemd/`](file:///w:/Projects/BeaconPort/infra/systemd/)) on the EC2 application host. Each job executes within an ephemeral Docker container using the cached production image (`beaconport-api:latest`) and local decrypted environment variables.

### The "MongoDB Atlas NAT Gateway Cost Trap" (Why Lambda Was Rejected)
We evaluated the serverless alternative: **Amazon EventBridge Scheduler triggering an AWS Lambda function**.
- To protect MongoDB Atlas, database access is restricted by IP allowlisting.
- AWS Lambda functions execute in AWS multi-tenant infrastructure and do NOT possess static IP addresses.
- If Lambda runs outside a VPC, MongoDB Atlas must be configured to allow `0.0.0.0/0` (anywhere), compromising database perimeter security.
- To use Atlas IP allowlisting with Lambda, Lambda must be placed inside a VPC private subnet routing through an **AWS NAT Gateway**.
- **An AWS NAT Gateway costs $0.045/hour (~$32.40/month)** plus data processing charges.
- Alternatively, MongoDB Atlas AWS VPC Peering or AWS PrivateLink eliminates the NAT Gateway, but requires an Atlas dedicated cluster (**M10 tier or higher, costing ~$57.00/month**).
- For a student portfolio project or lean production deployment, paying $32–$57/month for a 5-second daily cron job is unacceptable.

### Consequences
- **Cost**: **$0.00/month additional cost** (reuses existing EC2 host compute and cached Docker image layers).
- **Security**: The EC2 host has a known IP allowlisted in MongoDB Atlas; zero open public database access.
- **Isolation**: Each job runs in an isolated ephemeral container with `Persistent=true` ensuring missed executions during host restarts are caught up.

---

## ADR 004: HTTPS Edge Strategy — AWS CloudFront Distribution vs Host Certbot

### Status
Accepted

### Context
The BeaconPort React client is deployed on Vercel (`https://beaconport.vercel.app`) using HTTPS. Modern browser security mandates that HTTPS applications cannot query insecure HTTP endpoints (**Mixed Active Content** blocking). The backend API must serve traffic over HTTPS with valid SSL/TLS certificates.

### Decision
We provide **AWS CloudFront (Option A)** as the recommended production edge architecture in [`docs/DEPLOY.md`](file:///w:/Projects/BeaconPort/docs/DEPLOY.md) and [`infra/nginx/nginx.conf`](file:///w:/Projects/BeaconPort/infra/nginx/nginx.conf), while documenting **Let's Encrypt Certbot (Option B)** as a secondary alternative.

### Trade-off Comparison
| Feature | Option A: AWS CloudFront (Recommended) | Option B: Certbot on EC2 |
| :--- | :--- | :--- |
| **SSL Certificate Source** | Free AWS Certificate Manager (ACM) | Free Let's Encrypt |
| **Certificate Renewal** | Fully managed by AWS; zero maintenance | Automated via local cron/timer on EC2 |
| **Domain Requirement** | Optional (free `*.cloudfront.net` domain provided) | Mandatory (custom purchased domain required for DNS `A` record) |
| **DDoS Protection** | AWS Shield Standard included at edge | Host-level iptables / fail2ban only |
| **Static Caching** | Global edge distribution | Host-level Nginx cache only |
| **Failure Modes** | AWS edge service availability | Local Certbot renewal failure, DNS misconfiguration, Port 80 blocks |

### Consequences
- Eliminates the requirement for the repository owner to purchase a custom domain before demonstrating live HTTPS functionality.
- Offloads TLS termination from the single-core `t3.micro` EC2 CPU to AWS edge servers.
- Preserves the existing Render deployment fallback in `Client/src/environment.js` until production traffic migration is approved.

---

## ADR 005: Zero-SSH Deployment — GitHub Actions OIDC Federation & AWS Systems Manager (SSM)

### Status
Accepted

### Context
Traditional continuous deployment to cloud virtual machines relies on two insecure antipatterns:
1. Generating long-lived IAM User access keys (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) and storing them in GitHub Secrets.
2. Opening inbound Port 22 on security groups and storing a private SSH key in GitHub Secrets to execute remote rollout scripts.

### Decision
We implemented a zero-SSH, credential-less deployment pipeline:
1. **GitHub OpenID Connect (OIDC)**: GitHub Actions authenticates via cryptographic JWT token exchange with AWS STS (`sts:AssumeRoleWithWebIdentity`), obtaining temporary credentials valid for 1 hour only.
2. **AWS Systems Manager (SSM) Run Command**: Deployments are dispatched using `aws ssm send-command` targeting the EC2 instance ID with document `AWS-RunShellScript`. Port 22 remains **strictly closed** in the EC2 security group.

### Consequences
- **Zero Static Credentials**: No AWS access keys exist in GitHub Secrets to rotate, leak, or compromise.
- **Zero Inbound SSH Surface**: Port 22 is omitted from the security group, eliminating internet-wide port scans and brute-force SSH attacks.
- **Auditability**: Every deployment invocation is logged with complete stdout/stderr in AWS CloudTrail and Systems Manager history.

