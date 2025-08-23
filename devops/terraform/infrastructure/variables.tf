variable "aws_region" {
  description = "The AWS region to deploy resources in."
  type        = string
  default     = "il-central-1"
}

variable "vpc_cidr_block" {
  description = "The CIDR block for the VPC."
  type        = string
}

variable "subnet_cidr_block" {
  description = "The CIDR block for the public subnet."
  type        = string
}

variable "instance_type" {
  description = "The EC2 instance type."
  type        = string
  default     = "t3.micro"
}

variable "image_tag" {
  description = "The Docker image tag to deploy."
  type        = string
  default     = "latest"
}

variable "deployment_public_key" {
  description = "Public SSH key for GitHub Actions deployment access"
  type        = string
}
