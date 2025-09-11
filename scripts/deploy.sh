#!/bin/bash

# Deployment script for 1GB Digital Ocean droplet
# Optimized for memory constraints and using GitHub Container Registry

set -e

# Configuration
REGISTRY="ghcr.io"
REPO_NAME="${GITHUB_REPOSITORY:-$(git config --get remote.origin.url | sed 's/.*\/\([^\/]*\)\.git/\1/')}"
IMAGE_NAME="${REGISTRY}/${REPO_NAME,,}"  # Convert to lowercase
CONTAINER_NAME="vana-app"
COMMIT_SHA="${GITHUB_SHA:-$(git rev-parse HEAD)}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Check available resources
check_resources() {
    log "Checking system resources..."
    
    # Check memory
    AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [ $AVAILABLE_MEM -lt 300 ]; then
        error "Insufficient memory available: ${AVAILABLE_MEM}MB (need at least 300MB)"
        exit 1
    fi
    
    # Check disk space
    AVAILABLE_DISK=$(df / | awk 'NR==2{print $4}')
    if [ $AVAILABLE_DISK -lt 1048576 ]; then  # 1GB in KB
        error "Insufficient disk space available"
        exit 1
    fi
    
    log "Resources check passed - Memory: ${AVAILABLE_MEM}MB available"
}

# Cleanup old containers and images
cleanup() {
    log "Cleaning up old containers and images..."
    
    # Stop and remove old container
    if docker ps -a | grep -q $CONTAINER_NAME; then
        log "Stopping existing container..."
        docker stop $CONTAINER_NAME || true
        docker rm $CONTAINER_NAME || true
    fi
    
    # Remove old images (keep last 2)
    log "Cleaning up old images..."
    docker images $IMAGE_NAME --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}" | \
        tail -n +4 | awk '{print $2}' | xargs -r docker rmi || true
    
    # System cleanup
    docker system prune -f --volumes
}

# Pull latest image
pull_image() {
    local tag="${1:-latest}"
    log "Pulling image: ${IMAGE_NAME}:${tag}"
    
    # Try to pull the specific commit first, fallback to latest
    if ! docker pull "${IMAGE_NAME}:${COMMIT_SHA}" 2>/dev/null; then
        warn "Could not pull commit-specific image, falling back to latest"
        docker pull "${IMAGE_NAME}:latest"
        IMAGE_TAG="latest"
    else
        IMAGE_TAG="${COMMIT_SHA}"
    fi
}

# Deploy new container
deploy() {
    log "Deploying new container..."
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        warn "No .env file found, creating template..."
        cat > .env << EOF
GOOGLE_API_KEY=your_google_api_key_here
NODE_ENV=production
COMMIT_SHA=${COMMIT_SHA}
GITHUB_REPOSITORY=${REPO_NAME}
EOF
    fi
    
    # Deploy using docker-compose for better resource management
    if [ -f docker-compose.prod.yml ]; then
        log "Using docker-compose for deployment..."
        COMMIT_SHA=$COMMIT_SHA docker-compose -f docker-compose.prod.yml up -d
    else
        # Fallback to direct docker run
        log "Using direct docker run for deployment..."
        docker run -d \
            --name $CONTAINER_NAME \
            --restart unless-stopped \
            --memory=400m \
            --memory-swap=400m \
            --cpus=0.5 \
            -p 8080:8080 \
            -e GOOGLE_API_KEY="${GOOGLE_API_KEY}" \
            -e NODE_ENV="production" \
            -e COMMIT_SHA="${COMMIT_SHA}" \
            "${IMAGE_NAME}:${IMAGE_TAG}"
    fi
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Wait for container to start
    sleep 15
    
    # Check if container is running
    if ! docker ps | grep -q $CONTAINER_NAME; then
        error "Container is not running!"
        docker logs $CONTAINER_NAME --tail 20
        exit 1
    fi
    
    # Check application health
    local retries=0
    local max_retries=10
    
    while [ $retries -lt $max_retries ]; do
        if curl -f http://localhost:8080/health > /dev/null 2>&1; then
            log "Health check passed!"
            return 0
        fi
        
        warn "Health check failed, retrying in 5 seconds... ($((retries + 1))/$max_retries)"
        sleep 5
        retries=$((retries + 1))
    done
    
    error "Health check failed after $max_retries attempts"
    docker logs $CONTAINER_NAME --tail 20
    exit 1
}

# Show deployment status
status() {
    log "Deployment status:"
    docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    log "Container logs (last 10 lines):"
    docker logs $CONTAINER_NAME --tail 10
    
    log "System resources after deployment:"
    free -h
    df -h
}

# Rollback function
rollback() {
    warn "Rolling back to previous version..."
    
    # Stop current container
    docker stop $CONTAINER_NAME || true
    docker rm $CONTAINER_NAME || true
    
    # Try to find and start previous image
    PREV_IMAGE=$(docker images $IMAGE_NAME --format "table {{.Repository}}:{{.Tag}}" | sed -n '3p' | awk '{print $1}')
    if [ -n "$PREV_IMAGE" ]; then
        log "Rolling back to: $PREV_IMAGE"
        docker run -d \
            --name $CONTAINER_NAME \
            --restart unless-stopped \
            --memory=400m \
            --memory-swap=400m \
            -p 8080:8080 \
            -e GOOGLE_API_KEY="${GOOGLE_API_KEY}" \
            -e NODE_ENV="production" \
            "$PREV_IMAGE"
    else
        error "No previous image found for rollback"
        exit 1
    fi
}

# Main deployment process
main() {
    log "Starting deployment process..."
    
    case "${1:-deploy}" in
        "deploy")
            check_resources
            cleanup
            pull_image
            deploy
            health_check
            status
            log "Deployment completed successfully!"
            ;;
        "rollback")
            rollback
            health_check
            status
            log "Rollback completed!"
            ;;
        "status")
            status
            ;;
        "cleanup")
            cleanup
            log "Cleanup completed!"
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|status|cleanup}"
            exit 1
            ;;
    esac
}

# Trap errors and attempt rollback
trap 'error "Deployment failed! Check logs above."; exit 1' ERR

main "$@"