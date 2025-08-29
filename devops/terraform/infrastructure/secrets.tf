# Secrets Manager Secret for Application Secrets
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${terraform.workspace}-app-secrets"
  description             = "Application secrets for Our Little Corner ${terraform.workspace} environment"
  recovery_window_in_days = 0 # For non-production, allow immediate deletion

  tags = {
    Name        = "${terraform.workspace}-app-secrets"
    Environment = terraform.workspace
  }
}

# Placeholder secret version for app secrets (to be updated by GitHub Actions)
resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    APP_PASSWORD                             = "placeholder"
    JWT_SECRET                              = "placeholder"
    NEXTAUTH_SECRET                         = "placeholder"
    AWS_ACCESS_KEY_ID                       = "placeholder"
    AWS_SECRET_ACCESS_KEY                   = "placeholder"
    S3_BUCKET_NAME                          = var.s3_bucket_name
    NEXT_PUBLIC_FIREBASE_API_KEY            = "placeholder"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        = "placeholder"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID         = "placeholder"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     = "placeholder"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "placeholder"
    NEXT_PUBLIC_FIREBASE_APP_ID             = "placeholder"
    FIREBASE_ADMIN_PROJECT_ID               = "placeholder"
    FIREBASE_ADMIN_CLIENT_EMAIL             = "placeholder"
    FIREBASE_ADMIN_PRIVATE_KEY              = "placeholder"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Note: Enhanced database secrets with connection URL are managed in rds.tf
# The existing aws_secretsmanager_secret_version.db_credentials resource in rds.tf
# already contains the necessary database connection information for ECS tasks