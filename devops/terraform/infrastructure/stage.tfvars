# Staging Environment Variables
aws_region = "il-central-1"

# Network Configuration
vpc_cidr_block    = "10.1.0.0/16"
subnet_cidr_block = "10.1.1.0/24"

# Private subnets for RDS
private_subnet_a_cidr_block = "10.1.10.0/24"
private_subnet_b_cidr_block = "10.1.11.0/24"

# Instance Configuration
instance_type = "t3.small"

# Application Configuration
image_tag = "stage-latest"

# Deployment Configuration (will be overridden by GitHub Actions)
deployment_public_key = "placeholder"

# RDS Configuration for Staging
db_instance_class = "db.t3.small"
db_name           = "our_little_corner"
db_allocated_storage = 20
db_max_allocated_storage = 100
db_backup_retention_days = 7
db_multi_az = false
db_performance_insights_enabled = true
db_monitoring_interval = 60
db_deletion_protection = false
db_max_connections = "200"