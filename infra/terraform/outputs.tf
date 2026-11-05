# ==============================================================================
# Terraform Outputs for BeaconPort Infrastructure
#
# These outputs provide the exact ARNs, IDs, and endpoints needed to configure
# GitHub Repository Secrets/Variables and connect via AWS SSM.
# ==============================================================================

output "aws_region" {
  description = "Configured AWS Region"
  value       = var.aws_region
}

output "ec2_instance_id" {
  description = "Target EC2 Instance ID. Set as GitHub Secret 'EC2_INSTANCE_ID'"
  value       = aws_instance.api_server.id
}

output "ec2_public_ip" {
  description = "Public IPv4 address of the EC2 instance (origin endpoint for CloudFront or DNS)"
  value       = aws_instance.api_server.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS hostname of the EC2 instance"
  value       = aws_instance.api_server.public_dns
}

output "ecr_repository_url" {
  description = "Amazon ECR Repository URL. Set as GitHub Variable 'ECR_REPOSITORY'"
  value       = aws_ecr_repository.beaconport_api.repository_url
}

output "github_oidc_role_arn" {
  description = "IAM Role ARN for GitHub Actions OIDC. Set as GitHub Secret 'AWS_ROLE_ARN'"
  value       = aws_iam_role.github_oidc_role.arn
}

output "cloudwatch_log_group_name" {
  description = "Amazon CloudWatch Log Group for application and host logs"
  value       = aws_cloudwatch_log_group.beaconport_logs.name
}

output "ssm_parameter_prefix" {
  description = "Prefix under which application secrets and configurations must be stored"
  value       = "/${var.project_name}/"
}

output "ssm_session_command" {
  description = "AWS CLI command to start a zero-SSH interactive shell session on the EC2 host"
  value       = "aws ssm start-session --target ${aws_instance.api_server.id} --region ${var.aws_region}"
}

