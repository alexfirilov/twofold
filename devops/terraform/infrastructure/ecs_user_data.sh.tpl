#!/bin/bash

# Log everything to a file for easier debugging
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "Starting ECS user data script..."

# Configure ECS agent
echo "ECS_CLUSTER=${cluster_name}" >> /etc/ecs/ecs.config
echo "ECS_BACKEND_HOST=" >> /etc/ecs/ecs.config

# Install additional packages
yum update -y
yum install -y awscli jq

# Start ECS agent
start ecs

echo "ECS instance setup complete."