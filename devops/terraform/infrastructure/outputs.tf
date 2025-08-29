output "ecr_repository_url" {
  description = "The URL of the ECR repository"
  value       = aws_ecr_repository.app.repository_url
}

output "instance_public_ip" {
  description = "The public IP address of the EC2 instance"
  value       = aws_instance.app.public_ip
}

output "instance_public_dns" {
  description = "The public DNS name of the EC2 instance"
  value       = aws_instance.app.public_dns
}

output "vpc_id" {
  description = "The VPC ID"
  value       = aws_vpc.main.id
}

output "subnet_id" {
  description = "The public subnet ID"
  value       = aws_subnet.public.id
}

output "security_group_id" {
  description = "The security group ID for the instance"
  value       = aws_security_group.instance_sg.id
}

# RDS Outputs
output "rds_endpoint" {
  description = "The RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = false
}

output "rds_port" {
  description = "The RDS instance port"
  value       = aws_db_instance.main.port
}

output "rds_database_name" {
  description = "The name of the database"
  value       = aws_db_instance.main.db_name
}

output "rds_username" {
  description = "The master username for the database"
  value       = aws_db_instance.main.username
  sensitive   = false
}

output "database_url" {
  description = "The full PostgreSQL connection string"
  value       = "postgresql://${aws_db_instance.main.username}:[PASSWORD]@${aws_db_instance.main.endpoint}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}"
  sensitive   = false
}

output "secrets_manager_secret_name" {
  description = "The name of the AWS Secrets Manager secret containing database credentials"
  value       = aws_secretsmanager_secret.db_credentials.name
  sensitive   = false
}

output "private_subnet_a_id" {
  description = "The ID of the first private subnet"
  value       = aws_subnet.private_a.id
}

output "private_subnet_b_id" {
  description = "The ID of the second private subnet"
  value       = aws_subnet.private_b.id
}

output "rds_security_group_id" {
  description = "The security group ID for the RDS instance"
  value       = aws_security_group.rds_sg.id
}

# Monitoring Outputs
output "cloudwatch_dashboard_url" {
  description = "The URL to the CloudWatch dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "ec2_log_group" {
  description = "The name of the CloudWatch log group for EC2 logs"
  value       = aws_cloudwatch_log_group.ec2_logs.name
}

output "app_log_group" {
  description = "The name of the CloudWatch log group for application logs"
  value       = aws_cloudwatch_log_group.app_logs.name
}

# ECS Outputs
output "ecs_cluster_name" {
  description = "The name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "The ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "ecs_service_name" {
  description = "The name of the ECS service"
  value       = aws_ecs_service.app.name
}

output "ecs_service_arn" {
  description = "The ARN of the ECS service"
  value       = aws_ecs_service.app.id
}

output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "The zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "The ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "app_secrets_name" {
  description = "The name of the AWS Secrets Manager secret containing application secrets"
  value       = aws_secretsmanager_secret.app_secrets.name
}

output "target_group_arn" {
  description = "The ARN of the target group"
  value       = aws_lb_target_group.app.arn
}