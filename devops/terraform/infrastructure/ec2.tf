# Find the latest Ubuntu LTS AMI for our region
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical's official account ID

  filter {
    name   = "name"
    values = [
      "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*",
      "ubuntu/images/hvm-ssd/ubuntu-noble-24.04-amd64-server-*"
    ]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  
  filter {
    name   = "state"
    values = ["available"]
  }
}

# Get the current AWS Account ID for use in ARNs and repository URLs
data "aws_caller_identity" "current" {}


# --- IAM for EC2 Instances ---

# Define the IAM role that our EC2 instances will assume
resource "aws_iam_role" "instance_role" {
  name = "${terraform.workspace}-ec2-instance-role"

  # Trust policy allowing EC2 instances to assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${terraform.workspace}-ec2-instance-role"
  }
}

# Attach the AWS-managed policy that allows instances to pull images from ECR
resource "aws_iam_role_policy_attachment" "ecr_readonly" {
  role       = aws_iam_role.instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# Attach the AWS-managed policy required for SSM to function correctly
resource "aws_iam_role_policy_attachment" "ssm_managed_instance" {
  role       = aws_iam_role.instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Create an instance profile to pass the role to the EC2 instances
resource "aws_iam_instance_profile" "instance_profile" {
  name = "${terraform.workspace}-ec2-instance-profile"
  role = aws_iam_role.instance_role.name
}


# EC2 Instance
resource "aws_instance" "app" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.instance_sg.id]
  
  # Associate public IP for direct access
  associate_public_ip_address = true
  
  # Pass the IAM role to the instance
  iam_instance_profile = aws_iam_instance_profile.instance_profile.name

  # Root EBS volume configuration
  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  # User data script to bootstrap the instance
  user_data = base64encode(templatefile("${path.module}/user_data.sh.tpl", {
    aws_region       = var.aws_region
    ecr_repo_url     = aws_ecr_repository.app.repository_url
    image_tag        = var.image_tag
    aws_account_id   = data.aws_caller_identity.current.account_id
  }))

  tags = {
    Name        = "${terraform.workspace}-app-server"
    Environment = terraform.workspace
  }
}
