# Terraform Infrastructure

Simple multi-workspace Terraform configuration for Our Little Corner application.

## Architecture

- **VPC**: Single VPC with one public subnet
- **EC2**: Single instance running Docker containers
- **ECR**: Container registry for application images
- **Security**: Security group allowing HTTP/HTTPS traffic

## Workspaces

- **dev**: Development environment (t3.micro)
- **stage**: Staging environment (t3.small) 
- **prod**: Production environment (t3.medium)

## Usage

### Initialize and Setup Workspaces

```bash
# Initialize Terraform
terraform init

# Create and switch to dev workspace
terraform workspace new dev
terraform workspace select dev

# Create stage and prod workspaces
terraform workspace new stage
terraform workspace new prod
```

### Deploy to Different Environments

```bash
# Deploy to dev
terraform workspace select dev
terraform plan -var-file="dev.tfvars"
terraform apply -var-file="dev.tfvars"

# Deploy to stage
terraform workspace select stage
terraform plan -var-file="stage.tfvars"
terraform apply -var-file="stage.tfvars"

# Deploy to prod
terraform workspace select prod
terraform plan -var-file="prod.tfvars"
terraform apply -var-file="prod.tfvars"
```

### Get Outputs

```bash
# Get ECR repository URL for pushing images
terraform output ecr_repository_url

# Get instance public IP
terraform output instance_public_ip

# Get all outputs
terraform output
```

## Environment Variables

Each environment has its own `.tfvars` file with environment-specific settings:

- `dev.tfvars`: Development settings
- `stage.tfvars`: Staging settings  
- `prod.tfvars`: Production settings

## Deployment Process

1. Push Docker image to ECR repository
2. Update `image_tag` in the appropriate `.tfvars` file
3. Apply Terraform changes to update the instance

## Clean Up

```bash
# Destroy environment
terraform workspace select <workspace>
terraform destroy -var-file="<workspace>.tfvars"
```