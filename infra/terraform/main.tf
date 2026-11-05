# ==============================================================================
# BeaconPort Infrastructure as Code: Terraform Main Configuration
#
# Architecture:
# - Dedicated VPC with Internet Gateway & Public Subnets across 2 AZs
# - Security Group with ports 80 & 443 open; port 22 (SSH) strictly CLOSED
# - EC2 Instance (t3.micro, AL2023) with IAM Instance Profile
# - IAM Role: SSM Session Manager, ECR Image Pull, Parameter Store /beaconport/*
# - ECR Repository with automated scanning & lifecycle cleanup
# - CloudWatch Log Group with 14-day retention
# - GitHub Actions OIDC Role for zero-SSH continuous deployment
# ==============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ------------------------------------------------------------------------------
# Data Sources
# ------------------------------------------------------------------------------

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

# Fetch the latest official Amazon Linux 2023 x86_64 AMI
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# ------------------------------------------------------------------------------
# VPC & Networking Infrastructure
# ------------------------------------------------------------------------------

resource "aws_vpc" "beaconport_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc-${var.environment}"
  }
}

resource "aws_internet_gateway" "beaconport_igw" {
  vpc_id = aws_vpc.beaconport_vpc.id

  tags = {
    Name = "${var.project_name}-igw-${var.environment}"
  }
}

resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.beaconport_vpc.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet-${count.index + 1}-${var.environment}"
    Type = "Public"
  }
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.beaconport_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.beaconport_igw.id
  }

  tags = {
    Name = "${var.project_name}-public-rt-${var.environment}"
  }
}

resource "aws_route_table_association" "public_assoc" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public_rt.id
}

# ------------------------------------------------------------------------------
# Security Group (Zero Inbound SSH)
# ------------------------------------------------------------------------------

resource "aws_security_group" "ec2_sg" {
  name        = "${var.project_name}-ec2-sg-${var.environment}"
  description = "Security group for BeaconPort EC2 host with zero SSH ingress"
  vpc_id      = aws_vpc.beaconport_vpc.id

  # Inbound HTTP (Reverse proxy & Let's Encrypt / CloudFront)
  ingress {
    description = "Allow inbound HTTP from internet or CloudFront"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Inbound HTTPS (SSL/TLS direct termination)
  ingress {
    description = "Allow inbound HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # NOTE: Port 22 (SSH) is INTENTIONALLY EXCLUDED.
  # Administrative shell access is secured through AWS Systems Manager (SSM)
  # Session Manager, eliminating credential exposure and brute-force vectors.

  # Outbound All (ECR pull, SSM agent, MongoDB Atlas, CloudWatch)
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ec2-sg-${var.environment}"
  }
}

# ------------------------------------------------------------------------------
# Amazon ECR Repository (Container Registry)
# ------------------------------------------------------------------------------

resource "aws_ecr_repository" "beaconport_api" {
  name                 = var.ecr_repository_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name = "${var.project_name}-ecr-${var.environment}"
  }
}

resource "aws_ecr_lifecycle_policy" "beaconport_api_policy" {
  repository = aws_ecr_repository.beaconport_api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Retain maximum 10 latest tagged production images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ------------------------------------------------------------------------------
# Amazon CloudWatch Logs
# ------------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "beaconport_logs" {
  name              = "/aws/ec2/${var.project_name}"
  retention_in_days = var.log_retention_in_days

  tags = {
    Name = "${var.project_name}-logs-${var.environment}"
  }
}

# ------------------------------------------------------------------------------
# IAM Roles & Instance Profile for EC2 Host
# ------------------------------------------------------------------------------

resource "aws_iam_role" "ec2_role" {
  name        = "${var.project_name}-ec2-role-${var.environment}"
  description = "IAM role attached to BeaconPort EC2 instance"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# Attach AWS Managed Policy for Systems Manager Session Manager & Run Command
resource "aws_iam_role_policy_attachment" "ssm_core_attach" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Custom Policy: ECR Image Pull, Parameter Store Read, CloudWatch Logs
resource "aws_iam_policy" "ec2_custom_policy" {
  name        = "${var.project_name}-ec2-policy-${var.environment}"
  description = "Policy granting ECR pull, SSM Parameter Store read, and CloudWatch write"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAuthorizationToken"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Sid    = "ECRImagePull"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = aws_ecr_repository.beaconport_api.arn
      },
      {
        Sid    = "SSMParameterStoreRead"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/*"
      },
      {
        Sid    = "KMSDecryptSSM"
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = "*"
      },
      {
        Sid    = "CloudWatchLogsWrite"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "${aws_cloudwatch_log_group.beaconport_logs.arn}:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_custom_attach" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.ec2_custom_policy.arn
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.project_name}-ec2-profile-${var.environment}"
  role = aws_iam_role.ec2_role.name
}

# ------------------------------------------------------------------------------
# GitHub Actions OIDC IAM Role (Zero Static AWS Credentials)
# ------------------------------------------------------------------------------

# OIDC Identity Provider for GitHub Actions
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58775b0d771400dd4f98106263adfa774d90f2"
  ]
}

resource "aws_iam_role" "github_oidc_role" {
  name        = "${var.project_name}-github-oidc-role-${var.environment}"
  description = "IAM Role assumed by GitHub Actions via OIDC token exchange"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
          }
        }
      }
    ]
  })
}

# Permissions for GitHub Actions: ECR Push + SSM Run Command Dispatch
resource "aws_iam_policy" "github_oidc_policy" {
  name        = "${var.project_name}-github-oidc-policy-${var.environment}"
  description = "Permissions for GitHub Actions to push images to ECR and deploy via SSM"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAuthToken"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Sid    = "ECRPushImage"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = aws_ecr_repository.beaconport_api.arn
      },
      {
        Sid    = "SSMRunCommandExecute"
        Effect = "Allow"
        Action = [
          "ssm:SendCommand"
        ]
        Resource = [
          "arn:aws:ssm:${data.aws_region.current.name}::document/AWS-RunShellScript",
          "arn:aws:ec2:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:instance/${aws_instance.api_server.id}"
        ]
      },
      {
        Sid    = "SSMCommandStatusCheck"
        Effect = "Allow"
        Action = [
          "ssm:GetCommandInvocation",
          "ssm:DescribeInstanceInformation"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "github_oidc_attach" {
  role       = aws_iam_role.github_oidc_role.name
  policy_arn = aws_iam_policy.github_oidc_policy.arn
}

# ------------------------------------------------------------------------------
# EC2 Application Server (Single Host Architecture)
# ------------------------------------------------------------------------------

resource "aws_instance" "api_server" {
  ami                         = data.aws_ami.amazon_linux_2023.id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public[0].id
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name
  associate_public_ip_address = true

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true

    tags = {
      Name = "${var.project_name}-root-ebs-${var.environment}"
    }
  }

  user_data = <<-EOF
              #!/bin/bash
              set -euo pipefail

              echo "=== Starting BeaconPort EC2 Host Bootstrap ==="

              # 1. Update OS packages and install dependencies
              dnf update -y
              dnf install -y docker nginx aws-cli

              # 2. Enable and start Docker service
              systemctl enable --now docker
              usermod -aG docker ec2-user

              # 3. Create secure directory structure for secrets and jobs
              mkdir -p /etc/beaconport
              chmod 700 /etc/beaconport
              mkdir -p /opt/beaconport/systemd
              mkdir -p /var/log/nginx

              # 4. Provision SSM Parameter Store Sync Script
              cat << 'SYNCSCRIPT' > /opt/beaconport/sync-env.sh
              #!/bin/bash
              set -euo pipefail
              echo "Fetching production parameters from AWS SSM Parameter Store (/beaconport/*)..."
              TARGET_FILE="/etc/beaconport/.env"
              TMP_FILE="/etc/beaconport/.env.tmp"

              # Query all parameters under /beaconport/ path with decrypted values
              aws ssm get-parameters-by-path \
                --path "/beaconport" \
                --with-decryption \
                --recursive \
                --query "Parameters[*].[Name,Value]" \
                --output text | while read -r name value; do
                  # Strip prefix /beaconport/
                  VAR_NAME="$${name#/beaconport/}"
                  echo "$${VAR_NAME}=$${value}"
                done > "$TMP_FILE"

              # Secure permissions before moving into place
              chmod 600 "$TMP_FILE"
              mv "$TMP_FILE" "$TARGET_FILE"
              echo "Environment file successfully synced at $TARGET_FILE (mode 0600)"
              SYNCSCRIPT

              chmod +x /opt/beaconport/sync-env.sh

              # 5. Enable and start Nginx
              systemctl enable --now nginx

              echo "=== BeaconPort EC2 Host Bootstrap Complete ==="
              EOF

  tags = {
    Name = "${var.project_name}-ec2-${var.environment}"
  }
}

