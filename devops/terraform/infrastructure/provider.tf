terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.5.0"
  
  # S3 backend configuration - update these values after running bootstrap
  backend "s3" {
    bucket         = "our-little-corner-terraform-state-8a2b58c782578295"
    key            = "infrastructure/terraform.tfstate"
    region         = "il-central-1"
    dynamodb_table = "our-little-corner-terraform-state-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}
