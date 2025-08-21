# Bootstrap - S3 Backend Setup

This directory contains the Terraform configuration to create the S3 bucket and DynamoDB table needed for remote state management.

## What This Creates

- **S3 Bucket**: Stores Terraform state files with versioning and encryption
- **DynamoDB Table**: Provides state locking to prevent concurrent modifications

## Usage

```bash
# Run this once to set up your S3 backend
terraform init
terraform plan
terraform apply

# Get the outputs for your infrastructure configuration
terraform output backend_config
```

## Important Notes

- This itself uses **local state** (chicken and egg problem)
- Run this **before** setting up your main infrastructure
- Keep the local state files for this bootstrap configuration safe
- The S3 bucket name includes a random suffix to ensure global uniqueness

## Resources Created

- `aws_s3_bucket.terraform_state`
- `aws_s3_bucket_versioning.terraform_state`
- `aws_s3_bucket_server_side_encryption_configuration.terraform_state`
- `aws_s3_bucket_public_access_block.terraform_state`
- `aws_dynamodb_table.terraform_state_lock`