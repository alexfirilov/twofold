#!/bin/bash
# This script is run once when an EC2 instance is first launched.

# --- Log everything to a file for easier debugging ---
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "Starting user data script..."

# --- Install dependencies ---
apt-get update -y
apt-get install -y docker.io ec2-instance-connect

# --- Start and enable Docker ---
systemctl start docker
systemctl enable docker
usermod -aG docker ubuntu
echo "Docker installed and configured."

# --- ECR Login ---
# The IAM role provides the credentials, so we just need to log in.
# The variables like ${aws_region} are passed in from the Terraform templatefile function.
echo "Logging into ECR..."
aws ecr get-login-password --region ${aws_region} | docker login --username AWS --password-stdin ${aws_account_id}.dkr.ecr.${aws_region}.amazonaws.com
echo "ECR login successful."

# --- Pull and Run the Application Container ---
# This runs the specific image tag provided by Terraform variables
IMAGE_TO_RUN="${ecr_repo_url}:${image_tag}"
echo "Pulling container image: $IMAGE_TO_RUN"
docker pull $IMAGE_TO_RUN

echo "Running container..."
# Map container port 3000 (Next.js) to host port 80
docker run -d --name app-container -p 80:3000 --restart always $IMAGE_TO_RUN

echo "User data script finished successfully."


