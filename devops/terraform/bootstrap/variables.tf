variable "aws_region" {
  description = "The AWS region for the S3 bucket and DynamoDB table"
  type        = string
  default     = "il-central-1"
}

variable "project_name" {
  description = "Name of the project for resource naming"
  type        = string
  default     = "our-little-corner"
}