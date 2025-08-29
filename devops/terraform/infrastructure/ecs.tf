# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${terraform.workspace}-app-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${terraform.workspace}-app-cluster"
    Environment = terraform.workspace
  }
}

# ECS Capacity Provider (EC2)
resource "aws_ecs_capacity_provider" "main" {
  name = "${terraform.workspace}-capacity-provider"

  auto_scaling_group_provider {
    auto_scaling_group_arn         = aws_autoscaling_group.ecs_instances.arn
    managed_termination_protection = "ENABLED"

    managed_scaling {
      status          = "ENABLED"
      target_capacity = 80
    }
  }

  tags = {
    Name        = "${terraform.workspace}-capacity-provider"
    Environment = terraform.workspace
  }
}

# Cluster Capacity Provider Association
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = [aws_ecs_capacity_provider.main.name]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = aws_ecs_capacity_provider.main.name
  }
}

# Launch Template for ECS Instances
resource "aws_launch_template" "ecs_instances" {
  name_prefix   = "${terraform.workspace}-ecs-"
  image_id      = data.aws_ami.ecs_optimized.id
  instance_type = "t3.small"
  key_name      = aws_key_pair.deployment_key.key_name

  vpc_security_group_ids = [aws_security_group.ecs_instance_sg.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.ecs_instance_profile.name
  }

  user_data = base64encode(templatefile("${path.module}/ecs_user_data.sh.tpl", {
    cluster_name = aws_ecs_cluster.main.name
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${terraform.workspace}-ecs-instance"
      Environment = terraform.workspace
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Auto Scaling Group for ECS Instances
resource "aws_autoscaling_group" "ecs_instances" {
  name                = "${terraform.workspace}-ecs-asg"
  vpc_zone_identifier = [aws_subnet.public_a.id, aws_subnet.public_b.id]
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = 1
  max_size         = 3
  desired_capacity = 1

  launch_template {
    id      = aws_launch_template.ecs_instances.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${terraform.workspace}-ecs-instance"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = terraform.workspace
    propagate_at_launch = true
  }

  tag {
    key                 = "AmazonECSManaged"
    value               = "true"
    propagate_at_launch = false
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "${terraform.workspace}-app"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${aws_ecr_repository.app.repository_url}:latest"
      essential = true
      
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        }
      ]
      
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${aws_secretsmanager_secret.db_credentials.arn}:database_url::"
        },
        {
          name      = "APP_PASSWORD"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:APP_PASSWORD::"
        },
        {
          name      = "JWT_SECRET"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:JWT_SECRET::"
        },
        {
          name      = "NEXTAUTH_SECRET"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:NEXTAUTH_SECRET::"
        },
        {
          name      = "AWS_ACCESS_KEY_ID"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:AWS_ACCESS_KEY_ID::"
        },
        {
          name      = "AWS_SECRET_ACCESS_KEY"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:AWS_SECRET_ACCESS_KEY::"
        },
        {
          name      = "S3_BUCKET_NAME"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:S3_BUCKET_NAME::"
        },
        {
          name      = "NEXT_PUBLIC_FIREBASE_API_KEY"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:NEXT_PUBLIC_FIREBASE_API_KEY::"
        },
        {
          name      = "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN::"
        },
        {
          name      = "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:NEXT_PUBLIC_FIREBASE_PROJECT_ID::"
        },
        {
          name      = "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET::"
        },
        {
          name      = "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID::"
        },
        {
          name      = "NEXT_PUBLIC_FIREBASE_APP_ID"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:NEXT_PUBLIC_FIREBASE_APP_ID::"
        },
        {
          name      = "FIREBASE_ADMIN_PROJECT_ID"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:FIREBASE_ADMIN_PROJECT_ID::"
        },
        {
          name      = "FIREBASE_ADMIN_CLIENT_EMAIL"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:FIREBASE_ADMIN_CLIENT_EMAIL::"
        },
        {
          name      = "FIREBASE_ADMIN_PRIVATE_KEY"
          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:FIREBASE_ADMIN_PRIVATE_KEY::"
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "${terraform.workspace}-app-task"
    Environment = terraform.workspace
  }
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "${terraform.workspace}-app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.main.name
    weight            = 100
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.front_end]

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 50
  }

  tags = {
    Name        = "${terraform.workspace}-app-service"
    Environment = terraform.workspace
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${terraform.workspace}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  enable_deletion_protection = false

  tags = {
    Name        = "${terraform.workspace}-alb"
    Environment = terraform.workspace
  }
}

# Target Group
resource "aws_lb_target_group" "app" {
  name     = "${terraform.workspace}-app-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name        = "${terraform.workspace}-app-tg"
    Environment = terraform.workspace
  }
}

# Load Balancer Listener
resource "aws_lb_listener" "front_end" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# CloudWatch Log Group for ECS
resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/${terraform.workspace}-app"
  retention_in_days = 30

  tags = {
    Name        = "${terraform.workspace}-ecs-logs"
    Environment = terraform.workspace
  }
}

# Get the latest ECS-optimized AMI
data "aws_ami" "ecs_optimized" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-hvm-*-x86_64-ebs"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Second public subnet for ALB (requires 2 AZs)
resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_b_cidr_block
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true

  tags = {
    Name        = "${terraform.workspace}-public-subnet-b"
    Environment = terraform.workspace
  }
}

# Route table association for second public subnet
resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}

# Note: availability zones data source is already defined in vpc.tf
# Using the existing data.aws_availability_zones.available resource