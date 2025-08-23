# RDS PostgreSQL Configuration for "Our Little Corner"
# This file manages the PostgreSQL RDS instances for multi-tenant architecture

# Get availability zones for the current region
data "aws_availability_zones" "available" {
  state = "available"
}

# DB Subnet Group for RDS - spans multiple AZs for high availability
resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "${terraform.workspace}-rds-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name        = "${terraform.workspace}-rds-subnet-group"
    Environment = terraform.workspace
  }
}

# DB Parameter Group for PostgreSQL optimization
resource "aws_db_parameter_group" "postgres_params" {
  family = "postgres15"
  name   = "${terraform.workspace}-postgres15-params"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking more than 1 second
  }

  parameter {
    name  = "max_connections"
    value = var.db_max_connections
  }

  tags = {
    Name        = "${terraform.workspace}-postgres15-params"
    Environment = terraform.workspace
  }
}

# Random password for database master user
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# AWS Secrets Manager secret for database credentials
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${terraform.workspace}/rds/our-little-corner/master"
  
  tags = {
    Name        = "${terraform.workspace}-db-credentials"
    Environment = terraform.workspace
  }
}

# Store the database credentials in Secrets Manager
resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = "postgres"
    password = random_password.db_password.result
    engine   = "postgres"
    host     = aws_db_instance.postgres.endpoint
    port     = aws_db_instance.postgres.port
    dbname   = aws_db_instance.postgres.db_name
  })
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgres" {
  identifier = "${terraform.workspace}-our-little-corner-db"
  
  # Engine configuration
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class
  
  # Database configuration
  db_name  = var.db_name
  username = "postgres"
  password = random_password.db_password.result
  
  # Storage configuration
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  
  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  publicly_accessible    = false
  
  # High availability (only for non-dev environments)
  multi_az = var.db_multi_az
  
  # Backup configuration
  backup_retention_period = var.db_backup_retention_days
  backup_window          = "03:00-04:00"  # UTC
  maintenance_window     = "sun:04:00-sun:05:00"  # UTC
  
  # Monitoring
  performance_insights_enabled = var.db_performance_insights_enabled
  monitoring_interval         = var.db_monitoring_interval
  monitoring_role_arn         = var.db_monitoring_interval > 0 ? aws_iam_role.rds_monitoring[0].arn : null
  
  # Parameter group
  parameter_group_name = aws_db_parameter_group.postgres_params.name
  
  # Deletion protection
  deletion_protection = var.db_deletion_protection
  skip_final_snapshot = !var.db_deletion_protection
  final_snapshot_identifier = var.db_deletion_protection ? "${terraform.workspace}-our-little-corner-db-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null
  
  # Enable automated minor version upgrades
  auto_minor_version_upgrade = true
  
  tags = {
    Name        = "${terraform.workspace}-our-little-corner-db"
    Environment = terraform.workspace
    Application = "our-little-corner"
  }
}

# IAM role for RDS Enhanced Monitoring (conditional)
resource "aws_iam_role" "rds_monitoring" {
  count = var.db_monitoring_interval > 0 ? 1 : 0
  name  = "${terraform.workspace}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${terraform.workspace}-rds-monitoring-role"
    Environment = terraform.workspace
  }
}

# Attach the AWS managed policy for RDS monitoring
resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count      = var.db_monitoring_interval > 0 ? 1 : 0
  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch Log Group for PostgreSQL logs
resource "aws_cloudwatch_log_group" "postgresql" {
  name              = "/aws/rds/instance/${aws_db_instance.postgres.identifier}/postgresql"
  retention_in_days = 30

  tags = {
    Name        = "${terraform.workspace}-postgresql-logs"
    Environment = terraform.workspace
  }
}

# IAM policy for EC2 instances to access database secrets
resource "aws_iam_policy" "secrets_access" {
  name        = "${terraform.workspace}-db-secrets-access"
  description = "Policy for accessing database secrets from Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = aws_secretsmanager_secret.db_credentials.arn
      }
    ]
  })

  tags = {
    Name        = "${terraform.workspace}-db-secrets-access"
    Environment = terraform.workspace
  }
}

# Attach secrets access policy to the EC2 instance role
resource "aws_iam_role_policy_attachment" "secrets_access" {
  role       = aws_iam_role.instance_role.name
  policy_arn = aws_iam_policy.secrets_access.arn
}

# Null resource for database initialization
resource "null_resource" "db_initialization" {
  depends_on = [aws_db_instance.postgres, aws_secretsmanager_secret_version.db_credentials]

  # Trigger on database endpoint changes
  triggers = {
    db_endpoint = aws_db_instance.postgres.endpoint
  }

  # Initialize database schema using psql
  provisioner "local-exec" {
    command = <<-EOF
      # Wait for RDS instance to be available
      echo "Waiting for RDS instance to be ready..."
      aws rds wait db-instance-available --db-instance-identifier ${aws_db_instance.postgres.identifier} --region ${var.aws_region}
      
      # Get database credentials from secrets manager
      DB_SECRETS=$(aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.db_credentials.name} --region ${var.aws_region} --query SecretString --output text)
      DB_HOST=$(echo $DB_SECRETS | jq -r .host)
      DB_PASSWORD=$(echo $DB_SECRETS | jq -r .password)
      DB_NAME=$(echo $DB_SECRETS | jq -r .dbname)
      
      # Set PGPASSWORD for psql
      export PGPASSWORD="$DB_PASSWORD"
      
      # Check if schema is already initialized
      TABLES_COUNT=$(psql -h "$DB_HOST" -U postgres -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
      
      if [ "$TABLES_COUNT" -eq "0" ]; then
        echo "Initializing database schema..."
        psql -h "$DB_HOST" -U postgres -d "$DB_NAME" -f "${path.module}/../../../database/multi-tenant-schema.sql"
        echo "Database schema initialized successfully"
      else
        echo "Database schema already exists, skipping initialization"
      fi
    EOF
  }
}