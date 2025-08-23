#!/bin/bash
# This script is run once when an EC2 instance is first launched.
# It only sets up the basic infrastructure - deployment happens via GitHub Actions SSH

# --- Log everything to a file for easier debugging ---
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "Starting user data script..."

# --- Install dependencies ---
apt-get update -y
apt-get install -y docker.io ec2-instance-connect awscli

# --- Start and enable Docker ---
systemctl start docker
systemctl enable docker
usermod -aG docker ubuntu
echo "Docker installed and configured."

# --- ECR Login (for future deployments) ---
# The IAM role provides the credentials for ECR access
echo "Setting up ECR login capability..."
aws ecr get-login-password --region ${aws_region} | docker login --username AWS --password-stdin ${aws_account_id}.dkr.ecr.${aws_region}.amazonaws.com
echo "ECR login configured."

# --- Create deployment directory ---
mkdir -p /opt/deployment
chown ubuntu:ubuntu /opt/deployment

echo "EC2 instance setup complete. Ready for deployment via GitHub Actions."


