# ec2.tf

# Find the latest Ubuntu 24.04 LTS AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical's account ID

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# IAM Role for EC2 to access ECR
resource "aws_iam_role" "instance_role" {
  name = "${terraform.workspace}-ec2-role"
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
}

# Attach the AWS-managed policy that allows pulling from ECR
resource "aws_iam_role_policy_attachment" "ecr_readonly" {
  role       = aws_iam_role.instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "instance_profile" {
  name = "${terraform.workspace}-ec2-profile"
  role = aws_iam_role.instance_role.name
}

# The EC2 Instance
resource "aws_instance" "app_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.instance_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.instance_profile.name
  
  root_block_device {
    volume_size = 10
    volume_type = "gp3"
    encrypted   = false
  }

  tags = {
    Name = "${terraform.workspace}-app-server"

  user_data = <<-EOF
              #!/bin/bash
              sudo apt-get update -y
              sudo apt-get install -y docker.io
              sudo systemctl start docker
              sudo systemctl enable docker
              sudo usermod -aG docker ubuntu

              # Install EC2 Instance Connect
              sudo apt-get install -y ec2-instance-connect

              # Login to ECR, pull and run the image
              # The region and account ID are dynamically found
              aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com
              docker pull ${aws_ecr_repository.app.repository_url}:${terraform.workspace}
              docker run -d -p 80:3000 ${aws_ecr_repository.app.repository_url}:${terraform.workspace}
              EOF
  
  }
}

data "aws_caller_identity" "current" {}
