# ==============================================================================
# Terraform & Provider Version Constraints for BeaconPort Infrastructure
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # NOTE: In production teams, configure an S3 backend with DynamoDB state locking:
  # backend "s3" {
  #   bucket         = "beaconport-terraform-state-<account-id>"
  #   key            = "production/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "beaconport-terraform-locks"
  #   encrypt        = true
  # }
}

