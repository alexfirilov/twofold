# ECS Migration Guide

This document describes the migration from manually managed EC2 instances with Docker to AWS ECS (Elastic Container Service) with EC2 instances.

## Migration Overview

### Before (Legacy)
- **Deployment**: Manual EC2 instances with Docker containers
- **Load Balancing**: Direct connection to EC2 instance IP
- **Scaling**: Manual instance management
- **Service Discovery**: Static IP addresses
- **Secrets**: Passed as environment variables via SSH
- **Workflow**: `deploy.yml`

### After (ECS)
- **Deployment**: ECS cluster with EC2 capacity provider
- **Load Balancing**: Application Load Balancer (ALB)
- **Scaling**: Auto Scaling Groups with ECS service scaling
- **Service Discovery**: ALB DNS name with target groups
- **Secrets**: AWS Secrets Manager integration
- **Workflow**: `deploy-ecs.yml`

## New Infrastructure Components

### 1. ECS Resources
- **ECS Cluster**: Manages container orchestration
- **ECS Service**: Defines desired state and scaling
- **ECS Task Definition**: Container configuration with secrets
- **Auto Scaling Group**: Manages EC2 instances for ECS

### 2. Load Balancing
- **Application Load Balancer**: Routes traffic to healthy containers
- **Target Group**: Health checking and load distribution
- **ALB Listener**: HTTP traffic routing (port 80)

### 3. Secrets Management
- **App Secrets**: New Secrets Manager secret for application configuration
- **Enhanced DB Secrets**: Updated to include connection URL
- **IAM Integration**: Task execution role for secrets access

### 4. Networking Updates
- **Additional Subnet**: Second public subnet for ALB availability zones
- **Security Groups**: Updated for ALB-to-ECS communication
- **Dynamic Ports**: ECS uses dynamic port mapping (32768-65535)

## Deployment Options

You now have two deployment workflows available:

### Option 1: ECS Deployment (Recommended)
```bash
# Use the new ECS workflow
.github/workflows/deploy-ecs.yml
```

**Features:**
- ✅ Managed container orchestration
- ✅ Auto-scaling capabilities
- ✅ Load balancer with health checks
- ✅ Secrets Manager integration
- ✅ Zero-downtime deployments
- ✅ Better monitoring and logging

### Option 2: Legacy EC2 Deployment
```bash
# Use the existing EC2 workflow
.github/workflows/deploy.yml
```

**Features:**
- ✅ Direct EC2 instance access
- ✅ SSH-based deployment
- ✅ Simpler architecture
- ❌ Manual scaling
- ❌ No load balancing
- ❌ Secrets passed via SSH

## Migration Process

### Phase 1: Infrastructure Setup
1. **Deploy ECS Infrastructure**
   ```bash
   # Run the ECS deployment workflow
   gh workflow run deploy-ecs.yml --ref main -f environment=DEV
   ```

2. **Verify Resources Created**
   - ECS Cluster: `{env}-app-cluster`
   - ALB: `{env}-alb`
   - Target Group: `{env}-app-tg`
   - Secrets: `{env}-app-secrets`

### Phase 2: Application Deployment
1. **Update Secrets Manager**
   - Application secrets are automatically populated
   - Database connection URL is generated
   - All Firebase and AWS credentials are stored securely

2. **Deploy Application**
   - ECS service starts with desired count of 1
   - ALB health checks ensure traffic only goes to healthy containers
   - Secrets are injected as environment variables

### Phase 3: Testing
1. **Health Checks**
   ```bash
   curl http://{alb-dns-name}/api/health
   ```

2. **Application Access**
   - Access via ALB DNS name instead of EC2 IP
   - Load balancer handles traffic distribution
   - Automatic failover if containers become unhealthy

## Key Differences

### URL Changes
- **Before**: `http://{ec2-ip-address}`
- **After**: `http://{alb-dns-name}`

### Secrets Management
- **Before**: Environment variables passed via SSH
- **After**: AWS Secrets Manager with IAM integration

### Scaling
- **Before**: Manual EC2 instance management
- **After**: ECS service scaling + Auto Scaling Groups

### Deployment Process
- **Before**: SSH to EC2 → Docker commands → Manual container management
- **After**: Update task definition → ECS service update → Rolling deployment

### Health Monitoring
- **Before**: Manual health checks via SSH
- **After**: ALB target group health checks + ECS service monitoring

## Configuration Changes

### New Variables Required
```hcl
# In {env}.tfvars
public_subnet_b_cidr_block = "10.0.2.0/24"  # Second AZ for ALB
s3_bucket_name = "our-little-corner-{env}-media"
```

### New Terraform Resources
- `ecs.tf` - ECS cluster, service, and task definitions
- `ecs_iam.tf` - IAM roles for ECS tasks and execution
- `secrets.tf` - Enhanced secrets management
- Updated security groups for ALB communication

### New Outputs
- `ecs_cluster_name` - For ECS deployments
- `ecs_service_name` - For service updates
- `alb_dns_name` - Application access URL
- `app_secrets_name` - Secrets Manager secret name

## Rollback Plan

If you need to rollback to the legacy deployment:

1. **Use Legacy Workflow**
   ```bash
   gh workflow run deploy.yml --ref main -f environment=DEV
   ```

2. **Update DNS/Load Balancer**
   - Point traffic back to EC2 instance IP
   - Update any external references

3. **Clean Up ECS Resources** (Optional)
   ```bash
   # Scale down ECS service
   aws ecs update-service --cluster {env}-app-cluster --service {env}-app-service --desired-count 0
   
   # Or destroy via Terraform (removes all ECS resources)
   terraform destroy -target=aws_ecs_service.app
   terraform destroy -target=aws_ecs_cluster.main
   ```

## Monitoring and Troubleshooting

### ECS Service Monitoring
```bash
# Check service status
aws ecs describe-services --cluster {env}-app-cluster --services {env}-app-service

# View service events
aws ecs describe-services --cluster {env}-app-cluster --services {env}-app-service \
  --query 'services[0].events[*].[createdAt,message]' --output table

# Check task health
aws ecs list-tasks --cluster {env}-app-cluster --service-name {env}-app-service
```

### ALB Health Checks
```bash
# Check target health
aws elbv2 describe-target-health --target-group-arn {target-group-arn}

# View ALB access logs (if enabled)
aws logs filter-log-events --log-group-name /aws/applicationelb/{alb-name}
```

### Application Logs
```bash
# View ECS task logs
aws logs tail /ecs/{env}-app --follow

# Check CloudWatch logs
aws logs describe-log-streams --log-group-name /ecs/{env}-app
```

## Benefits of ECS Migration

### Operational Benefits
- **Managed Infrastructure**: AWS handles container placement and scheduling
- **Auto Scaling**: Automatic scaling based on metrics
- **Health Management**: Automatic container replacement on failure
- **Rolling Deployments**: Zero-downtime updates

### Security Benefits
- **Secrets Manager**: Secure secret injection without SSH
- **IAM Integration**: Fine-grained permissions for containers
- **Network Isolation**: Improved security group management

### Cost Optimization
- **Resource Efficiency**: Better resource utilization across instances
- **Auto Scaling**: Scale down during low traffic periods
- **Managed Services**: Reduced operational overhead

### Developer Experience
- **Simplified Deployments**: No SSH key management
- **Better Logging**: Centralized CloudWatch logs
- **Service Discovery**: Consistent ALB endpoints
- **Environment Parity**: Identical infrastructure across environments

## Next Steps

1. **Test ECS Deployment**: Run the new workflow in DEV environment
2. **Validate Application**: Ensure all features work with ALB
3. **Monitor Performance**: Compare ECS vs EC2 performance metrics
4. **Plan Migration**: Schedule migration for STAGE and PROD environments
5. **Update Documentation**: Update any references to EC2 IP addresses

The ECS migration provides a more robust, scalable, and maintainable infrastructure while preserving all existing application functionality.