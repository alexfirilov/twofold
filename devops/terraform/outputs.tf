output "ecr_repository_url" {
  description = "The URL of the ECR repository"
  value       = aws_ecr_repository.app.repository_url
}

output "ec2_instance_id" {
  description = "The ID of the EC2 instance"
  value       = aws_instance.app_server.id
}
