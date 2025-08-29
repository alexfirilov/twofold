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

# Private subnet CIDR blocks for RDS
variable "private_subnet_a_cidr_block" {
  description = "The CIDR block for the first private subnet (AZ a)"
  type        = string
}

variable "private_subnet_b_cidr_block" {
  description = "The CIDR block for the second private subnet (AZ b)"
  type        = string
}

# RDS Database Configuration
variable "db_instance_class" {
  description = "The RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "The name of the database to create"
  type        = string
  default     = "our_little_corner"
}

variable "db_allocated_storage" {
  description = "The allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "The maximum allocated storage in GB (for autoscaling)"
  type        = number
  default     = 100
}

variable "db_backup_retention_days" {
  description = "The backup retention period in days"
  type        = number
  default     = 7
}

variable "db_multi_az" {
  description = "Specifies if the RDS instance is multi-AZ"
  type        = bool
  default     = false
}

variable "db_performance_insights_enabled" {
  description = "Specifies whether Performance Insights is enabled"
  type        = bool
  default     = false
}

variable "db_monitoring_interval" {
  description = "The interval for collecting enhanced monitoring metrics (0 to disable)"
  type        = number
  default     = 0
}

variable "db_deletion_protection" {
  description = "If the DB instance should have deletion protection enabled"
  type        = bool
  default     = false
}

variable "db_max_connections" {
  description = "Maximum number of connections to the database"
  type        = string
  default     = "100"
}

# ECS Variables
variable "public_subnet_b_cidr_block" {
  description = "The CIDR block for the second public subnet (for ALB)"
  type        = string
}

variable "s3_bucket_name" {
  description = "The name of the S3 bucket for media storage"
  type        = string
}
