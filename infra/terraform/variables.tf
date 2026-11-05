# ==============================================================================
# Terraform Input Variables for BeaconPort Infrastructure
# ==============================================================================

variable "aws_region" {
  description = "Target AWS region for infrastructure deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment name (e.g. production, staging)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name prefix used for resource naming and tagging"
  type        = string
  default     = "beaconport"
}

variable "vpc_cidr" {
  description = "CIDR block for the dedicated BeaconPort VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets distributed across availability zones"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "instance_type" {
  description = "EC2 instance type (t3.micro is AWS Free Tier eligible on x86_64)"
  type        = string
  default     = "t3.micro"
}

variable "github_repo" {
  description = "GitHub repository (owner/repo) permitted to assume the deployment OIDC IAM role"
  type        = string
  default     = "Bhavdeep-Sai/BeaconPort"
}

variable "ecr_repository_name" {
  description = "Name of the Amazon ECR repository for BeaconPort container images"
  type        = string
  default     = "beaconport-api"
}

variable "log_retention_in_days" {
  description = "Retention period in days for CloudWatch log events"
  type        = number
  default     = 14
}

