#!/bin/bash

# ECS Deployment Validation Script
# This script validates that the ECS deployment is working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
AWS_REGION="il-central-1"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    print_status $GREEN "✅ $1"
}

print_error() {
    print_status $RED "❌ $1"
}

print_warning() {
    print_status $YELLOW "⚠️  $1"
}

print_info() {
    print_status $BLUE "ℹ️  $1"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --environment ENV    Environment to validate (default: dev)"
            echo "  -r, --region REGION      AWS region (default: il-central-1)"
            echo "  -h, --help               Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

print_header "ECS Deployment Validation for ${ENVIRONMENT} environment"

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
    print_error "jq not found. Please install jq first."
    exit 1
fi

# Set AWS region
export AWS_DEFAULT_REGION=$AWS_REGION

print_info "Using AWS region: $AWS_REGION"
print_info "Validating environment: $ENVIRONMENT"

# Test 1: Check ECS Cluster
print_header "1. ECS Cluster Validation"
CLUSTER_NAME="${ENVIRONMENT}-app-cluster"
CLUSTER_STATUS=$(aws ecs describe-clusters --clusters $CLUSTER_NAME --query 'clusters[0].status' --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$CLUSTER_STATUS" == "ACTIVE" ]; then
    print_success "ECS cluster '$CLUSTER_NAME' is active"
    
    # Get cluster details
    RUNNING_TASKS=$(aws ecs describe-clusters --clusters $CLUSTER_NAME --query 'clusters[0].runningTasksCount' --output text)
    PENDING_TASKS=$(aws ecs describe-clusters --clusters $CLUSTER_NAME --query 'clusters[0].pendingTasksCount' --output text)
    ACTIVE_SERVICES=$(aws ecs describe-clusters --clusters $CLUSTER_NAME --query 'clusters[0].activeServicesCount' --output text)
    
    print_info "Running tasks: $RUNNING_TASKS"
    print_info "Pending tasks: $PENDING_TASKS"
    print_info "Active services: $ACTIVE_SERVICES"
else
    print_error "ECS cluster '$CLUSTER_NAME' not found or not active (Status: $CLUSTER_STATUS)"
    exit 1
fi

# Test 2: Check ECS Service
print_header "2. ECS Service Validation"
SERVICE_NAME="${ENVIRONMENT}-app-service"
SERVICE_STATUS=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --query 'services[0].status' --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$SERVICE_STATUS" == "ACTIVE" ]; then
    print_success "ECS service '$SERVICE_NAME' is active"
    
    # Get service details
    DESIRED_COUNT=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --query 'services[0].desiredCount' --output text)
    RUNNING_COUNT=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --query 'services[0].runningCount' --output text)
    PENDING_COUNT=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --query 'services[0].pendingCount' --output text)
    
    print_info "Desired count: $DESIRED_COUNT"
    print_info "Running count: $RUNNING_COUNT"
    print_info "Pending count: $PENDING_COUNT"
    
    if [ "$DESIRED_COUNT" == "$RUNNING_COUNT" ] && [ "$PENDING_COUNT" == "0" ]; then
        print_success "Service is stable with all tasks running"
    else
        print_warning "Service may be deploying or have issues"
    fi
else
    print_error "ECS service '$SERVICE_NAME' not found or not active (Status: $SERVICE_STATUS)"
    exit 1
fi

# Test 3: Check Application Load Balancer
print_header "3. Load Balancer Validation"
ALB_NAME="${ENVIRONMENT}-alb"
ALB_ARN=$(aws elbv2 describe-load-balancers --names $ALB_NAME --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$ALB_ARN" != "NOT_FOUND" ]; then
    print_success "Application Load Balancer '$ALB_NAME' found"
    
    ALB_DNS=$(aws elbv2 describe-load-balancers --names $ALB_NAME --query 'LoadBalancers[0].DNSName' --output text)
    ALB_STATE=$(aws elbv2 describe-load-balancers --names $ALB_NAME --query 'LoadBalancers[0].State.Code' --output text)
    
    print_info "ALB DNS: $ALB_DNS"
    print_info "ALB State: $ALB_STATE"
    
    if [ "$ALB_STATE" == "active" ]; then
        print_success "Load balancer is active"
    else
        print_warning "Load balancer is not active (State: $ALB_STATE)"
    fi
else
    print_error "Application Load Balancer '$ALB_NAME' not found"
    exit 1
fi

# Test 4: Check Target Group Health
print_header "4. Target Group Health"
TG_NAME="${ENVIRONMENT}-app-tg"
TG_ARN=$(aws elbv2 describe-target-groups --names $TG_NAME --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$TG_ARN" != "NOT_FOUND" ]; then
    print_success "Target group '$TG_NAME' found"
    
    # Check target health
    TARGET_HEALTH=$(aws elbv2 describe-target-health --target-group-arn $TG_ARN --output json)
    HEALTHY_TARGETS=$(echo $TARGET_HEALTH | jq -r '.TargetHealthDescriptions[] | select(.TargetHealth.State == "healthy") | .Target.Id' | wc -l)
    TOTAL_TARGETS=$(echo $TARGET_HEALTH | jq -r '.TargetHealthDescriptions[].Target.Id' | wc -l)
    
    print_info "Healthy targets: $HEALTHY_TARGETS/$TOTAL_TARGETS"
    
    if [ "$HEALTHY_TARGETS" -gt 0 ]; then
        print_success "At least one target is healthy"
    else
        print_error "No healthy targets found"
        echo "Target health details:"
        echo $TARGET_HEALTH | jq -r '.TargetHealthDescriptions[] | "\(.Target.Id): \(.TargetHealth.State) - \(.TargetHealth.Description)"'
    fi
else
    print_error "Target group '$TG_NAME' not found"
    exit 1
fi

# Test 5: Check Secrets Manager
print_header "5. Secrets Manager Validation"
APP_SECRET_NAME="${ENVIRONMENT}-app-secrets"
DB_SECRET_NAME="${ENVIRONMENT}-db-credentials"

# Check app secrets
APP_SECRET_STATUS=$(aws secretsmanager describe-secret --secret-id $APP_SECRET_NAME --query 'Name' --output text 2>/dev/null || echo "NOT_FOUND")
if [ "$APP_SECRET_STATUS" != "NOT_FOUND" ]; then
    print_success "App secrets '$APP_SECRET_NAME' found"
else
    print_error "App secrets '$APP_SECRET_NAME' not found"
fi

# Check DB secrets
DB_SECRET_STATUS=$(aws secretsmanager describe-secret --secret-id $DB_SECRET_NAME --query 'Name' --output text 2>/dev/null || echo "NOT_FOUND")
if [ "$DB_SECRET_STATUS" != "NOT_FOUND" ]; then
    print_success "Database secrets '$DB_SECRET_NAME' found"
else
    print_error "Database secrets '$DB_SECRET_NAME' not found"
fi

# Test 6: Application Health Check
print_header "6. Application Health Check"
if [ "$ALB_DNS" != "" ]; then
    HEALTH_URL="http://$ALB_DNS/api/health"
    print_info "Testing health endpoint: $HEALTH_URL"
    
    # Try health check with timeout
    HTTP_STATUS=$(curl -s -w "%{http_code}" "$HEALTH_URL" -o /tmp/health_response.txt --connect-timeout 10 --max-time 30 || echo "TIMEOUT")
    
    if [ "$HTTP_STATUS" == "200" ]; then
        print_success "Application health check passed"
        print_info "Response: $(cat /tmp/health_response.txt | head -c 200)"
    elif [ "$HTTP_STATUS" == "TIMEOUT" ]; then
        print_error "Health check timed out - application may not be ready"
    else
        print_error "Health check failed with HTTP status: $HTTP_STATUS"
        if [ -f /tmp/health_response.txt ]; then
            print_info "Response: $(cat /tmp/health_response.txt | head -c 200)"
        fi
    fi
    
    # Clean up temp file
    rm -f /tmp/health_response.txt
else
    print_error "ALB DNS not available for health check"
fi

# Test 7: Recent ECS Events
print_header "7. Recent ECS Service Events"
RECENT_EVENTS=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --query 'services[0].events[:5]' --output json)
if [ "$RECENT_EVENTS" != "null" ] && [ "$RECENT_EVENTS" != "[]" ]; then
    echo "Recent service events:"
    echo $RECENT_EVENTS | jq -r '.[] | "\(.createdAt) - \(.message)"' | head -5
else
    print_info "No recent service events found"
fi

# Summary
print_header "Validation Summary"
if [ "$CLUSTER_STATUS" == "ACTIVE" ] && [ "$SERVICE_STATUS" == "ACTIVE" ] && [ "$ALB_STATE" == "active" ] && [ "$HEALTHY_TARGETS" -gt 0 ]; then
    print_success "ECS deployment validation completed successfully!"
    print_info "Application URL: http://$ALB_DNS"
    print_info "All core components are healthy and running"
else
    print_warning "ECS deployment has some issues that need attention"
    print_info "Check the failed tests above for details"
fi

print_header "Next Steps"
echo "1. Access your application at: http://$ALB_DNS"
echo "2. Monitor ECS service: aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME"
echo "3. Check logs: aws logs tail /ecs/$ENVIRONMENT-app --follow"
echo "4. Monitor ALB: aws elbv2 describe-target-health --target-group-arn $TG_ARN"