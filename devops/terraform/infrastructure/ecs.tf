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

# ECS Cluster Capacity Providers
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["EC2"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "EC2"
  }
}

# Auto Scaling Group for ECS
resource "aws_launch_template" "ecs" {
  name_prefix   = "${terraform.workspace}-ecs-"
  image_id      = data.aws_ami.ecs_optimized.id
  instance_type = var.instance_type
  key_name      = aws_key_pair.deployment_key.key_name

  vpc_security_group_ids = [aws_security_group.ecs_instance_sg.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.ecs_instance_profile.name
  }

  user_data = base64encode(templatefile("${path.module}/ecs_user_data.sh.tpl", {
    cluster_name = aws_ecs_cluster.main.name
    aws_region   = var.aws_region
  }))

  # Root EBS volume configuration
  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = 30
      volume_type = "gp3"
      encrypted   = true
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${terraform.workspace}-ecs-instance"
      Environment = terraform.workspace
    }
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "ecs" {
  name                = "${terraform.workspace}-ecs-asg"
  vpc_zone_identifier = [aws_subnet.public.id]
  min_size            = 1
  max_size            = 3
  desired_capacity    = 1

  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
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
    value               = true
    propagate_at_launch = false
  }
}

# Get ECS Optimized AMI
data "aws_ami" "ecs_optimized" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-hvm-*-x86_64-ebs"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${terraform.workspace}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public.id, aws_subnet.public_b.id]

  enable_deletion_protection = false

  tags = {
    Name        = "${terraform.workspace}-alb"
    Environment = terraform.workspace
  }
}

# ALB Target Group
resource "aws_lb_target_group" "app" {
  name     = "${terraform.workspace}-app-tg"
  port     = 3000
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

# ALB Listener
resource "aws_lb_listener" "app" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# CloudWatch Log Group for ECS
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${terraform.workspace}-app"
  retention_in_days = 7

  tags = {
    Name        = "${terraform.workspace}-app-logs"
    Environment = terraform.workspace
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "${terraform.workspace}-app"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "${aws_ecr_repository.app.repository_url}:${var.image_tag}"
      
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 0
          protocol      = "tcp"
        }
      ]

      essential = true

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "NEXTAUTH_URL"
          value = "http://${aws_lb.main.dns_name}"
        },
        {
          name  = "NEXT_PUBLIC_APP_URL"
          value = "http://${aws_lb.main.dns_name}"
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

      memory = 1024
      cpu    = 512
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
    capacity_provider = "EC2"
    weight            = 100
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 3000
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 50
  }

  # Allow external changes without Terraform plan difference
  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  depends_on = [aws_lb_listener.app, aws_iam_role_policy_attachment.ecs_task_execution_role]

  tags = {
    Name        = "${terraform.workspace}-app-service"
    Environment = terraform.workspace
  }
}

# Additional subnet for ALB (ALB requires at least 2 subnets)
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

# Get availability zones
data "aws_availability_zones" "available" {
  state = "available"
}