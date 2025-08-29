# Security group for the EC2 instance
resource "aws_security_group" "instance_sg" {
  name        = "${terraform.workspace}-instance-sg"
  description = "Allow HTTP/HTTPS traffic to the EC2 instance"
  vpc_id      = aws_vpc.main.id

  # Allow HTTP from anywhere
  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow HTTPS from anywhere (if needed)
  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow SSH from anywhere (for GitHub Actions deployment)
  ingress {
    description = "SSH from anywhere"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow outbound traffic for updates, ECR pulls, etc.
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${terraform.workspace}-instance-sg"
  }
}

# Security group for ECS instances
resource "aws_security_group" "ecs_instance_sg" {
  name        = "${terraform.workspace}-ecs-instance-sg"
  description = "Security group for ECS EC2 instances"
  vpc_id      = aws_vpc.main.id

  # Allow dynamic port range from ALB
  ingress {
    description     = "Dynamic port range from ALB"
    from_port       = 32768
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  # Allow SSH from anywhere (for maintenance)
  ingress {
    description = "SSH from anywhere"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${terraform.workspace}-ecs-instance-sg"
    Environment = terraform.workspace
  }
}

# Security group for Application Load Balancer
resource "aws_security_group" "alb_sg" {
  name        = "${terraform.workspace}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  # Allow HTTP from anywhere
  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow HTTPS from anywhere (if needed in the future)
  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${terraform.workspace}-alb-sg"
    Environment = terraform.workspace
  }
}

# Security group for RDS PostgreSQL
resource "aws_security_group" "rds_sg" {
  name        = "${terraform.workspace}-rds-sg"
  description = "Security group for RDS PostgreSQL database"
  vpc_id      = aws_vpc.main.id

  # Allow PostgreSQL traffic from EC2 instances (legacy)
  ingress {
    description     = "PostgreSQL from EC2 instances"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.instance_sg.id]
  }

  # Allow PostgreSQL traffic from ECS instances
  ingress {
    description     = "PostgreSQL from ECS instances"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_instance_sg.id]
  }

  # No outbound rules needed for RDS (it's implicit)
  # RDS instances don't initiate outbound connections

  tags = {
    Name        = "${terraform.workspace}-rds-sg"
    Environment = terraform.workspace
  }
}
