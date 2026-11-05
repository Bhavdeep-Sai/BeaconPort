# BeaconPort Production Deployment Runbook

This runbook guides repository owners through deploying BeaconPort to a secure, production-grade AWS environment using **Terraform (Infrastructure as Code)**, **Amazon ECR**, **AWS Systems Manager (SSM)**, **Nginx**, and **GitHub Actions OIDC**.

---

## Architecture Overview

```
                                      +------------------------------------+
                                      |           GitHub Actions           |
                                      |     (CI Tests + OIDC CD Deploy)    |
                                      +------------------+-----------------+
                                                         | (OIDC Token)
                                                         v
                                              +----------+---------+
                                              |   AWS IAM OIDC     |
                                              |   Federated Role   |
                                              +----+-------------+-+
                                                   |             |
                                  (Push Image)     |             | (SSM RunCommand)
                                                   v             v
+------------------------+             +-----------+----+   +----+-------------+
| Vercel Client (HTTPS)  |             |   Amazon ECR   |   |   AWS Systems    |
| beaconport.vercel.app  |             | beaconport-api |   |     Manager      |
+-----------+------------+             +-----------+----+   +----+-------------+
            |                                      |             |
     (HTTPS API Calls)                             | (Docker     | (Deploy &
            |                                      |  Pull)      |  Manage)
            v                                      v             v
+-----------+----------------------------------------------------+-------------+
| AWS EC2 Host (Amazon Linux 2023 - t3.micro in Dedicated VPC)                 |
|                                                                              |
|  Security Group: Port 80 & 443 Inbound | Port 22 (SSH) STRICTLY CLOSED       |
|                                                                              |
|  +------------------------------------------------------------------------+  |
|  | Nginx Reverse Proxy (Port 80 / 443)                                    |  |
|  | - SSL Termination / CloudFront Origin Headers                          |  |
|  | - Security Headers, Request ID Tracing, 10MB Body Buffer               |  |
|  +-----------------------------------+------------------------------------+  |
|                                      | (proxy_pass http://127.0.0.1:5000)    |
|                                      v                                       |
|  +------------------------------------------------------------------------+  |
|  | Docker Container: beaconport-api (Node 22 LTS Alpine, Non-Root)        |  |
|  | - Express 5 Layered Services Architecture                              |  |
|  | - Environment: /etc/beaconport/.env (chmod 0600 from SSM)              |  |
|  | - Endpoints: /health (Liveness), /ready (Readiness), /api/...          |  |
|  +------------------------------------------------------------------------+  |
|                                                                              |
|  +------------------------------------------------------------------------+  |
|  | Systemd Timers (Decoupled Background Jobs)                             |  |
|  | - beaconport-schedule-cleanup.timer -> node jobs/run.js scheduleCleanup |  |
|  | - beaconport-fee-overdue.timer      -> node jobs/run.js feeOverdue     |  |
|  +------------------------------------------------------------------------+  |
+------------------------------------+-----------------------------------------+
                                     |
              +----------------------+----------------------+
              |                      |                      |
              v                      v                      v
     +--------+--------+    +--------+--------+    +--------+--------+
     |  MongoDB Atlas  |    |  Cloudinary API |    | Google Gemini AI|
     |   M0 Free / M10 |    | (Image Storage) |    |  (Study Tutor)  |
     +-----------------+    +-----------------+    +-----------------+
```

### Core Security Principles
1. **Zero-SSH Ingress**: Port 22 is completely omitted from security groups. All remote administrative tasks run through **AWS Systems Manager (SSM) Session Manager**, and all CD rollouts run through **SSM Run Command**.
2. **Zero Long-Lived Cloud Credentials**: GitHub Actions mints a short-lived cryptographically signed OpenID Connect (OIDC) token (`sts:AssumeRoleWithWebIdentity`). No static `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` exist in GitHub secrets.
3. **Decoupled Secret Management**: Database URIs and encryption keys are stored exclusively in **AWS Systems Manager Parameter Store** as `SecureString` parameters. Secrets **never** appear in Git commits, Docker images, Terraform configuration files, or Terraform state files.
4. **Least-Privilege IAM**: EC2 instance profile permits only pulling images from its designated ECR repository, reading its designated parameter path (`/beaconport/*`), and pushing to its CloudWatch log group.

---

## Prerequisites & Local Tooling

Before deploying, ensure you have installed and configured:
1. **AWS CLI (v2.x)**: [AWS CLI Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
   ```bash
   aws --version
   aws sts get-caller-identity
   ```
2. **Terraform CLI (>= 1.5.0)**: [Terraform Installation Guide](https://developer.hashicorp.com/terraform/downloads)
   ```bash
   terraform -version
   ```
3. **GitHub Repository Admin Access**: Permission to configure repository secrets and variables in `Bhavdeep-Sai/BeaconPort`.
4. **Active MongoDB Atlas Cluster**: MongoDB Atlas connection URI with a user possessing read/write permissions.

---

## Step 1: AWS Budgets Setup (Cost Guardrail)

To prevent accidental cloud billing charges, create an AWS Budget with automatic email threshold alerts before provisioning any resources.

### Option A: AWS CLI Command
Replace `your-email@domain.com` and `YOUR_ACCOUNT_ID`:
```bash
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query "Account" --output text) \
  --budget '{
    "BudgetName": "BeaconPort-Monthly-Max-Budget",
    "BudgetLimit": {
      "Amount": "5.0",
      "Unit": "USD"
    },
    "CostTypes": {
      "IncludeTax": true,
      "IncludeSubscription": true,
      "UseBlended": false,
      "IncludeRefund": false,
      "IncludeCredit": false,
      "IncludeUpfront": true,
      "IncludeRecurring": true,
      "IncludeOtherSubscription": true,
      "IncludeSupport": true,
      "IncludeDiscount": true,
      "UseAmortized": false
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80.0,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {
          "SubscriptionType": "EMAIL",
          "Address": "your-email@domain.com"
        }
      ]
    },
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 100.0,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {
          "SubscriptionType": "EMAIL",
          "Address": "your-email@domain.com"
        }
      ]
    }
  ]'
```

### Option B: AWS Management Console
1. Navigate to **Billing and Cost Management** -> **Budgets** -> **Create budget**.
2. Select **Cost budget (recommended)**.
3. Budget name: `BeaconPort-Monthly-Max-Budget`.
4. Period: **Monthly**, Budgeted amount: **$5.00**.
5. Alert 1: Trigger at **80% ($4.00)** of budgeted amount -> enter your email.
6. Alert 2: Trigger at **100% ($5.00)** of budgeted amount -> enter your email.

---

## Step 2: Store Application Secrets in AWS SSM Parameter Store

All production backend environment variables must be stored in SSM Parameter Store under the `/beaconport/` prefix.

Run each of the following commands in your local terminal. Replace the placeholder values with your real credentials:

```bash
# General Server Configuration
aws ssm put-parameter --name "/beaconport/NODE_ENV" --type "String" --value "production" --overwrite
aws ssm put-parameter --name "/beaconport/PORT" --type "String" --value "5000" --overwrite
aws ssm put-parameter --name "/beaconport/ENABLE_IN_PROCESS_CRON" --type "String" --value "false" --overwrite
aws ssm put-parameter --name "/beaconport/FRONTEND_URL" --type "String" --value "https://beaconport.vercel.app" --overwrite

# Database & Security Secrets (SecureString - Encrypted via AWS KMS)
aws ssm put-parameter --name "/beaconport/MONGO_URI" --type "SecureString" --value "mongodb+srv://<user>:<password>@cluster0.mongodb.net/beaconport?retryWrites=true&w=majority" --overwrite
aws ssm put-parameter --name "/beaconport/JWT_SECRET" --type "SecureString" --value "$(openssl rand -hex 32)" --overwrite

# Email Notification Credentials
aws ssm put-parameter --name "/beaconport/EMAIL_USER" --type "SecureString" --value "notifications@yourdomain.com" --overwrite
aws ssm put-parameter --name "/beaconport/EMAIL_PASSWORD" --type "SecureString" --value "your-app-specific-email-password" --overwrite

# Cloudinary Storage Credentials
aws ssm put-parameter --name "/beaconport/CLOUDINARY_CLOUD_NAME" --type "String" --value "your_cloud_name" --overwrite
aws ssm put-parameter --name "/beaconport/CLOUDINARY_API_KEY" --type "SecureString" --value "your_api_key" --overwrite
aws ssm put-parameter --name "/beaconport/CLOUDINARY_API_SECRET" --type "SecureString" --value "your_api_secret" --overwrite

# Google Gemini AI Tutor Credential
aws ssm put-parameter --name "/beaconport/GEMINI_API_KEY" --type "SecureString" --value "your_gemini_api_key" --overwrite
```

Verify that all 12 parameters exist:
```bash
aws ssm get-parameters-by-path --path "/beaconport" --query "Parameters[*].Name" --output table
```

---

## Step 3: Deploy Cloud Infrastructure via Terraform

Provision the VPC, subnets, security group, IAM roles, ECR repository, CloudWatch log group, and EC2 instance.

1. Navigate to the Terraform directory:
   ```bash
   cd infra/terraform
   ```
2. Create your `terraform.tfvars` from the template:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```
3. Initialize Terraform providers:
   ```bash
   terraform init
   ```
4. Review the planned infrastructure additions:
   ```bash
   terraform plan -out=tfplan
   ```
5. Apply the plan to provision resources:
   ```bash
   terraform apply tfplan
   ```
6. Capture the output values:
   ```bash
   terraform output
   ```
   Save the displayed values for:
   - `github_oidc_role_arn`
   - `ec2_instance_id`
   - `ecr_repository_url`
   - `ec2_public_ip`

---

## Step 4: Configure GitHub Actions Secrets & Variables

Navigate to your GitHub repository:
**Settings** -> **Secrets and variables** -> **Actions**

### Add Repository Variables (`New repository variable`):
| Variable Name | Example Value | Description |
| :--- | :--- | :--- |
| `AWS_REGION` | `us-east-1` | Target AWS region from Terraform |
| `ECR_REPOSITORY` | `beaconport-api` | ECR repository name |

### Add Repository Secrets (`New repository secret`):
| Secret Name | Value | Description |
| :--- | :--- | :--- |
| `AWS_ROLE_ARN` | `arn:aws:iam::<ACCOUNT_ID>:role/beaconport-github-oidc-role-production` | `github_oidc_role_arn` from Terraform output |
| `EC2_INSTANCE_ID` | `i-0123456789abcdef0` | `ec2_instance_id` from Terraform output |

---

## Step 5: EC2 Host Setup & Zero-SSH Management

Because port 22 is closed, all administrative shell sessions use AWS Systems Manager.

1. Start an SSM Session on the EC2 host:
   ```bash
   aws ssm start-session --target <EC2_INSTANCE_ID>
   ```
   *(You are now securely logged in as `ssm-user` with root elevation via `sudo su -`).*

2. Verify that Docker, Nginx, and AWS CLI are running:
   ```bash
   sudo docker --version
   sudo systemctl status docker
   sudo systemctl status nginx
   ```

3. Sync application secrets from SSM Parameter Store:
   ```bash
   sudo /opt/beaconport/sync-env.sh
   # Verify the file was written with restricted permissions:
   sudo ls -l /etc/beaconport/.env
   # Should display: -rw------- 1 root root ... /etc/beaconport/.env
   ```

4. Install Nginx configuration:
   Copy [`infra/nginx/nginx.conf`](file:///w:/Projects/BeaconPort/infra/nginx/nginx.conf) to `/etc/nginx/nginx.conf` on the EC2 host:
   ```bash
   sudo systemctl restart nginx
   ```

5. Install and enable systemd timers for decoupled background jobs:
   Copy the unit files from [`infra/systemd/`](file:///w:/Projects/BeaconPort/infra/systemd/) to `/etc/systemd/system/`:
   ```bash
   # Enable and start the timer units
   sudo systemctl daemon-reload
   sudo systemctl enable --now beaconport-schedule-cleanup.timer
   sudo systemctl enable --now beaconport-fee-overdue.timer

   # Verify active timers
   sudo systemctl list-timers | grep beaconport
   ```

---

## Step 6: Triggering Continuous Deployment (CD)

With infrastructure provisioned and secrets linked, deploy the application code:

1. Commit your changes and push to `main` branch, or trigger manually in GitHub Actions:
   - Navigate to **Actions** -> **CD Deploy Pipeline** -> **Run workflow** (branch: `main`).
2. GitHub Actions will:
   - Authenticate to AWS via OIDC (`Configure AWS Credentials`).
   - Log in to Amazon ECR.
   - Build the multi-stage Docker image and push tags (`<commit-sha>` and `latest`).
   - Dispatch an SSM Run Command (`AWS-RunShellScript`) to the EC2 instance.
   - The EC2 host pulls the new image from ECR, replaces the container, and verifies `GET /health`.
   - The workflow polls SSM command execution and confirms success.

---

## Step 7: Production HTTPS Options

Because the React client is hosted over HTTPS on Vercel (`https://beaconport.vercel.app`), browser security standards strictly block plain HTTP API requests as **Mixed Active Content**.

### Option A: AWS CloudFront (Recommended & Simplest)
CloudFront places AWS's global edge network in front of your EC2 instance.
- **Why it's recommended**:
  - Provides a free SSL certificate from **AWS Certificate Manager (ACM)** (`*.cloudfront.net` or custom domain).
  - Terminates HTTPS at the edge and forwards HTTP traffic to your EC2 instance port 80.
  - Zero certbot cron jobs or SSL renewal maintenance on EC2.
  - Built-in DDoS protection via AWS Shield Standard.
- **Setup Steps**:
  1. Go to AWS Console -> **CloudFront** -> **Create distribution**.
  2. Origin domain: Enter the `ec2_public_dns` from Terraform output.
  3. Protocol: **HTTP only** (port 80).
  4. Allowed HTTP methods: **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE**.
  5. Cache policy: **CachingDisabled** (for dynamic API endpoints).
  6. Origin request policy: **AllViewerExceptHostHeader** (forwards headers including `X-Forwarded-For`).
  7. Copy your CloudFront distribution domain name (e.g. `d1234abcd.cloudfront.net`).
  8. Update `VITE_BASE_API` in Vercel to `https://d1234abcd.cloudfront.net`.

### Option B: Custom Domain + Let's Encrypt (Certbot on EC2)
If you own a custom domain (e.g. `api.yourdomain.com`):
1. In your DNS provider (e.g., Route 53, Cloudflare, Namecheap), create an `A` record pointing `api.yourdomain.com` to the EC2 `ec2_public_ip`.
2. Connect to the EC2 host via SSM:
   ```bash
   aws ssm start-session --target <EC2_INSTANCE_ID>
   ```
3. Install Certbot and obtain an SSL certificate:
   ```bash
   sudo dnf install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```
4. Verify automated renewal timer:
   ```bash
   sudo systemctl status certbot-renew.timer
   ```

> [!NOTE]
> Per roadmap guidelines, the existing Render deployment and fallback in `Client/src/environment.js` remain active until the owner completes production DNS cutover.

---

## Step 8: Scheduled Background Jobs & Network Architecture

BeaconPort features two automated background maintenance tasks:
1. `scheduleCleanup`: Purges notices and schedule events older than 30 days.
2. `feeOverdue`: Iterates pending fee invoices past their due date and transitions their status to `OVERDUE`.

### Architectural Comparison: Host Systemd Timers vs Serverless Lambda

| Architectural Attribute | Host Systemd Timers (BeaconPort Approach) | EventBridge + AWS Lambda |
| :--- | :--- | :--- |
| **MongoDB Atlas IP Whitelisting** | Uses the fixed EC2 IP (or Elastic IP). Security perimeter remains strictly locked down. | Lambda uses ephemeral dynamic IPs from AWS pool. Requires whitelisting `0.0.0.0/0` (compromising database perimeter security). |
| **VPC NAT Gateway Requirement** | **Not required**. EC2 resides in a public subnet with direct internet routing. | To use Atlas IP whitelisting, Lambda must reside in a private subnet routing through an **AWS NAT Gateway**. |
| **Additional Monthly Cost** | **$0.00 / month** (re-uses existing EC2 host & cached image). | **$32.40 / month** for AWS NAT Gateway ($0.045/hr) + data processing fees. |
| **MongoDB Atlas Alternative** | Standard Atlas Free Tier (M0) or shared tier. | Requires **Atlas VPC Peering** or **PrivateLink**, available only on Atlas **M10+ dedicated tiers (~$57.00/month)**. |
| **Execution Simplicity** | Container image is already cached on the host; zero startup latency. | Requires bundling database drivers and models into Lambda zip / container image. |

**Conclusion**: For a student portfolio project or startup on a lean budget, running scheduled jobs via systemd timers on the EC2 host is the most cost-effective and secure architecture.

---

## Step 9: Verification & Smoke Testing

After deployment completes, verify application integrity:

1. **Liveness Probe**:
   ```bash
   curl -i http://<EC2_PUBLIC_IP>/health
   # Expected Response: HTTP/200 OK {"status":"ok","uptime":...}
   ```

2. **Readiness Probe (Database Connectivity)**:
   ```bash
   curl -i http://<EC2_PUBLIC_IP>/ready
   # Expected Response: HTTP/200 OK {"status":"ready","database":"connected"}
   ```

3. **Verify Port 22 Closure**:
   ```bash
   nc -zv -w 3 <EC2_PUBLIC_IP> 22
   # Expected: Connection timed out / refused. Port 22 is completely closed.
   ```

4. **Verify CloudWatch Log Streaming**:
   ```bash
   aws logs tail /aws/ec2/beaconport --follow
   ```

5. **Verify Scheduled Jobs Execution**:
   ```bash
   aws ssm start-session --target <EC2_INSTANCE_ID>
   # Manually trigger a job run to test:
   sudo docker run --rm --network host --env-file /etc/beaconport/.env beaconport-api:latest node jobs/run.js scheduleCleanup
   ```

---

## Step 10: Itemized Cost Breakdown

BeaconPort is engineered to qualify for the **AWS Free Tier** for the first 12 months, and maintain minimal costs thereafter.

| Cloud Resource | Specification | AWS Free Tier (Months 1-12) | Standard On-Demand Cost |
| :--- | :--- | :--- | :--- |
| **EC2 Compute** | 1x `t3.micro` (2 vCPU, 1GB RAM) | 750 hours/month free | ~$7.49 / month |
| **EBS Storage** | 20 GB GP3 encrypted volume | 30 GB/month free | ~$1.60 / month |
| **Amazon ECR** | Container image storage (< 1 GB) | 500 MB/month free | ~$0.10 / month |
| **CloudWatch Logs** | Ingestion & 14-day retention (< 2 GB) | 5 GB ingestion free | ~$0.20 / month |
| **AWS Systems Manager** | Session Manager & Run Command | Free tier included | $0.00 / month |
| **GitHub Actions OIDC** | IAM OIDC Identity Provider | Free tier included | $0.00 / month |
| **Amazon CloudFront** | CDN distribution & free ACM SSL | 1 TB data transfer free | $0.00 / month |
| **AWS Budgets** | 1 Budget with threshold alerts | 2 free budgets | $0.00 / month |
| **Total Estimated Cost** | | **$0.00 / month** | **~$9.39 / month** |

---

## Step 11: Teardown & Clean Destruction

When you finish demonstrating the project or want to dismantle the infrastructure to guarantee zero lingering charges:

1. **Delete Container Images in Amazon ECR**:
   Terraform cannot delete an ECR repository that contains container images:
   ```bash
   aws ecr batch-delete-image \
     --repository-name beaconport-api \
     --image-ids "$(aws ecr list-images --repository-name beaconport-api --query 'imageIds[*]' --output json)"
   ```

2. **Destroy AWS Infrastructure via Terraform**:
   ```bash
   cd infra/terraform
   terraform destroy -auto-approve
   ```

3. **Delete SSM Parameters**:
   ```bash
   aws ssm delete-parameters --names \
     "/beaconport/NODE_ENV" \
     "/beaconport/PORT" \
     "/beaconport/ENABLE_IN_PROCESS_CRON" \
     "/beaconport/FRONTEND_URL" \
     "/beaconport/MONGO_URI" \
     "/beaconport/JWT_SECRET" \
     "/beaconport/EMAIL_USER" \
     "/beaconport/EMAIL_PASSWORD" \
     "/beaconport/CLOUDINARY_CLOUD_NAME" \
     "/beaconport/CLOUDINARY_API_KEY" \
     "/beaconport/CLOUDINARY_API_SECRET" \
     "/beaconport/GEMINI_API_KEY"
   ```

4. **Delete CloudWatch Log Group**:
   ```bash
   aws logs delete-log-group --log-group-name "/aws/ec2/beaconport"
   ```

5. **Confirm Clean State**:
   Verify no active EC2 instances remain:
   ```bash
   aws ec2 describe-instances --filters "Name=tag:Project,Values=beaconport" "Name=instance-state-name,Values=running" --query "Reservations[*].Instances[*].[InstanceId,State.Name]" --output table
   ```

