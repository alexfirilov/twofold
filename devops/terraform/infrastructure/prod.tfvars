# Production Environment Variables
aws_region = "il-central-1"

# Network Configuration
vpc_cidr_block    = "10.2.0.0/16"
subnet_cidr_block = "10.2.1.0/24"

# Private subnets for RDS
private_subnet_a_cidr_block = "10.2.10.0/24"
private_subnet_b_cidr_block = "10.2.11.0/24"

# Instance Configuration
instance_type = "t3.medium"

# Application Configuration
image_tag = "prod-latest"

# Deployment Configuration (will be overridden by GitHub Actions)
deployment_public_key = "placeholder"

# RDS Configuration for Production
db_instance_class = "db.t3.medium"
db_name           = "our_little_corner"
db_allocated_storage = 50
db_max_allocated_storage = 500
db_backup_retention_days = 30
db_multi_az = true
db_performance_insights_enabled = true
db_monitoring_interval = 60
db_deletion_protection = true
db_max_connections = "500"