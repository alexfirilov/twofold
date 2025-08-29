# CloudWatch Monitoring Configuration for "Our Little Corner"
# This file sets up basic monitoring and alerting for the infrastructure

# CloudWatch Log Group for EC2 instance logs
resource "aws_cloudwatch_log_group" "ec2_logs" {
  name              = "/aws/ec2/${terraform.workspace}-our-little-corner"
  retention_in_days = 14

  tags = {
    Name        = "${terraform.workspace}-ec2-logs"
    Environment = terraform.workspace
  }
}

# CloudWatch Log Group for application logs
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/aws/application/${terraform.workspace}-our-little-corner"
  retention_in_days = 7

  tags = {
    Name        = "${terraform.workspace}-app-logs"
    Environment = terraform.workspace
  }
}

# CloudWatch Alarm for EC2 instance CPU utilization
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${terraform.workspace}-high-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors EC2 CPU utilization"
  alarm_actions       = []  # Add SNS topic ARN here for notifications

  dimensions = {
    InstanceId = aws_instance.app.id
  }

  tags = {
    Name        = "${terraform.workspace}-high-cpu-alarm"
    Environment = terraform.workspace
  }
}

# CloudWatch Alarm for RDS database CPU utilization
resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "${terraform.workspace}-rds-high-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = []  # Add SNS topic ARN here for notifications

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }

  tags = {
    Name        = "${terraform.workspace}-rds-high-cpu-alarm"
    Environment = terraform.workspace
  }
}

# CloudWatch Alarm for RDS database connections
resource "aws_cloudwatch_metric_alarm" "rds_high_connections" {
  alarm_name          = "${terraform.workspace}-rds-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "50"  # Adjust based on your db_max_connections
  alarm_description   = "This metric monitors RDS database connections"
  alarm_actions       = []  # Add SNS topic ARN here for notifications

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }

  tags = {
    Name        = "${terraform.workspace}-rds-high-connections-alarm"
    Environment = terraform.workspace
  }
}

# CloudWatch Dashboard for monitoring
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${terraform.workspace}-our-little-corner-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", aws_instance.app.id],
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.postgres.id]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "CPU Utilization"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", aws_db_instance.postgres.id],
            [".", "FreeableMemory", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Database Metrics"
        }
      }
    ]
  })
}

# IAM policy for CloudWatch Logs access from EC2
resource "aws_iam_policy" "cloudwatch_logs" {
  name        = "${terraform.workspace}-cloudwatch-logs-policy"
  description = "Policy for EC2 instance to write to CloudWatch Logs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = [
          aws_cloudwatch_log_group.ec2_logs.arn,
          "${aws_cloudwatch_log_group.ec2_logs.arn}:*",
          aws_cloudwatch_log_group.app_logs.arn,
          "${aws_cloudwatch_log_group.app_logs.arn}:*"
        ]
      }
    ]
  })

  tags = {
    Name        = "${terraform.workspace}-cloudwatch-logs-policy"
    Environment = terraform.workspace
  }
}

# Attach CloudWatch Logs policy to EC2 instance role
resource "aws_iam_role_policy_attachment" "cloudwatch_logs" {
  role       = aws_iam_role.instance_role.name
  policy_arn = aws_iam_policy.cloudwatch_logs.arn
}