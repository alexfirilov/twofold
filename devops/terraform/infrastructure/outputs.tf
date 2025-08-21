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