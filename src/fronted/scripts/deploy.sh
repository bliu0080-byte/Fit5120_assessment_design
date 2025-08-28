#!/bin/bash

# ScamSafe Frontend Deployment Script
# This script automates the deployment process for different environments

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="ScamSafe Frontend"
VERSION=$(node -p "require('./package.json').version")
BUILD_DIR="dist"
BACKUP_DIR="backup"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required commands exist
check_dependencies() {
    log_info "Checking dependencies..."

    local deps=("node" "npm" "git")

    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "$dep is required but not installed."
            exit 1
        fi
    done

    log_success "All dependencies are available"
}

# Validate environment
validate_environment() {
    local env=$1

    case $env in
        "development"|"staging"|"production")
            log_info "Deploying to $env environment"
            ;;
        *)
            log_error "Invalid environment: $env"
            log_info "Valid environments: development, staging, production"
            exit 1
            ;;
    esac
}

# Create backup
create_backup() {
    if [ -d "$BUILD_DIR" ]; then
        log_info "Creating backup of existing build..."

        local timestamp=$(date +"%Y%m%d_%H%M%S")
        local backup_name="${BACKUP_DIR}/${timestamp}_${BUILD_DIR}"

        mkdir -p "$BACKUP_DIR"
        cp -r "$BUILD_DIR" "$backup_name"

        log_success "Backup created: $backup_name"
    fi
}

# Clean old builds
clean_build() {
    log_info "Cleaning previous build..."

    if [ -d "$BUILD_DIR" ]; then
        rm -rf "$BUILD_DIR"
    fi

    log_success "Build directory cleaned"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."

    if [ -f "package-lock.json" ]; then
        npm ci --production=false
    else
        npm install
    fi

    log_success "Dependencies installed"
}

# Run tests
run_tests() {
    log_info "Running tests..."

    npm test -- --watchAll=false --coverage=false

    log_success "Tests completed successfully"
}

# Run linting
run_linting() {
    log_info "Running code quality checks..."

    npm run lint

    log_success "Code quality checks passed"
}

# Build application
build_application() {
    local env=$1

    log_info "Building application for $env environment..."

    # Set environment variables
    export NODE_ENV=$env

    # Build the application
    npm run build

    if [ ! -d "$BUILD_DIR" ]; then
        log_error "Build failed - output directory not found"
        exit 1
    fi

    log_success "Application built successfully"
}

# Validate build
validate_build() {
    log_info "Validating build output..."

    # Check if critical files exist
    local critical_files=("index.html" "css" "js")

    for file in "${critical_files[@]}"; do
        if [ ! -e "$BUILD_DIR/$file" ]; then
            log_error "Critical file/directory missing: $file"
            exit 1
        fi
    done

    # Check file sizes
    local total_size=$(du -sh "$BUILD_DIR" | cut -f1)
    log_info "Total build size: $total_size"

    log_success "Build validation completed"
}

# Deploy to static hosting
deploy_static() {
    local env=$1

    log_info "Deploying to static hosting ($env)..."

    case $env in
        "development")
            # Local development server
            log_info "Starting local development server..."
            npm run preview
            ;;
        "staging")
            # Deploy to staging (example with rsync)
            if [ -n "$STAGING_HOST" ] && [ -n "$STAGING_PATH" ]; then
                log_info "Deploying to staging server..."
                rsync -avz --delete "$BUILD_DIR/" "$STAGING_HOST:$STAGING_PATH"
                log_success "Deployed to staging: $STAGING_HOST:$STAGING_PATH"
            else
                log_warning "Staging deployment skipped - STAGING_HOST and STAGING_PATH not configured"
            fi
            ;;
        "production")
            # Deploy to production (example with rsync)
            if [ -n "$PRODUCTION_HOST" ] && [ -n "$PRODUCTION_PATH" ]; then
                log_info "Deploying to production server..."
                rsync -avz --delete "$BUILD_DIR/" "$PRODUCTION_HOST:$PRODUCTION_PATH"
                log_success "Deployed to production: $PRODUCTION_HOST:$PRODUCTION_PATH"
            else
                log_warning "Production deployment skipped - PRODUCTION_HOST and PRODUCTION_PATH not configured"
            fi
            ;;
    esac
}

# Deploy with Docker
deploy_docker() {
    local env=$1

    log_info "Building Docker image for $env environment..."

    local image_tag="scamsafe-frontend:$VERSION-$env"

    # Build Docker image
    docker build -t "$image_tag" .

    # Tag as latest for the environment
    docker tag "$image_tag" "scamsafe-frontend:latest-$env"

    log_success "Docker image built: $image_tag"

    # Deploy based on environment
    case $env in
        "development")
            log_info "Starting development container..."
            docker run -d -p 8080:80 --name "scamsafe-dev" "$image_tag"
            log_success "Development container started on port 8080"
            ;;
        "staging"|"production")
            if [ -n "$DOCKER_REGISTRY" ]; then
                log_info "Pushing to Docker registry..."
                docker tag "$image_tag" "$DOCKER_REGISTRY/$image_tag"
                docker push "$DOCKER_REGISTRY/$image_tag"
                log_success "Image pushed to registry: $DOCKER_REGISTRY/$image_tag"
            else
                log_warning "Docker deployment skipped - DOCKER_REGISTRY not configured"
            fi
            ;;
    esac
}

# Generate deployment report
generate_report() {
    local env=$1
    local deploy_type=$2

    log_info "Generating deployment report..."

    local report_file="deployment_report_$(date +%Y%m%d_%H%M%S).txt"

    cat > "$report_file" << EOF
ScamSafe Frontend Deployment Report
==================================

Project: $PROJECT_NAME
Version: $VERSION
Environment: $env
Deployment Type: $deploy_type
Date: $(date)
Git Commit: $(git rev-parse HEAD)
Git Branch: $(git branch --show-current)

Build Information:
- Build Directory: $BUILD_DIR
- Build Size: $(du -sh "$BUILD_DIR" | cut -f1)
- Files Count: $(find "$BUILD_DIR" -type f | wc -l)

Deployment Status: SUCCESS
EOF

    log_success "Deployment report generated: $report_file"
}

# Cleanup old backups
cleanup_backups() {
    log_info "Cleaning up old backups..."

    if [ -d "$BACKUP_DIR" ]; then
        # Keep only last 5 backups
        find "$BACKUP_DIR" -maxdepth 1 -type d -name "*_$BUILD_DIR" | sort -r | tail -n +6 | xargs rm -rf
        log_success "Old backups cleaned up"
    fi
}

# Show help
show_help() {
    cat << EOF
ScamSafe Frontend Deployment Script

Usage: $0 [OPTIONS] <environment> [deployment-type]

Environments:
  development   Deploy for local development
  staging       Deploy to staging environment
  production    Deploy to production environment

Deployment Types:
  static        Deploy as static files (default)
  docker        Deploy using Docker containers

Options:
  -h, --help         Show this help message
  -v, --version      Show version information
  --skip-tests       Skip running tests
  --skip-lint        Skip linting checks
  --no-backup        Don't create backup of existing build
  --cleanup          Clean up old backups after deployment

Examples:
  $0 development
  $0 staging static
  $0 production docker
  $0 --skip-tests staging
  $0 --no-backup production static

Environment Variables:
  STAGING_HOST       Staging server hostname
  STAGING_PATH       Staging server deployment path
  PRODUCTION_HOST    Production server hostname
  PRODUCTION_PATH    Production server deployment path
  DOCKER_REGISTRY    Docker registry URL
EOF
}

# Main deployment function
main() {
    local environment=""
    local deployment_type="static"
    local skip_tests=false
    local skip_lint=false
    local no_backup=false
    local cleanup_backups_flag=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--version)
                echo "$PROJECT_NAME v$VERSION"
                exit 0
                ;;
            --skip-tests)
                skip_tests=true
                shift
                ;;
            --skip-lint)
                skip_lint=true
                shift
                ;;
            --no-backup)
                no_backup=true
                shift
                ;;
            --cleanup)
                cleanup_backups_flag=true
                shift
                ;;
            development|staging|production)
                environment=$1
                shift
                ;;
            static|docker)
                deployment_type=$1
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # Validate required arguments
    if [ -z "$environment" ]; then
        log_error "Environment is required"
        show_help
        exit 1
    fi

    # Start deployment process
    log_info "Starting deployment of $PROJECT_NAME v$VERSION"
    log_info "Environment: $environment"
    log_info "Deployment Type: $deployment_type"

    # Check dependencies
    check_dependencies

    # Validate environment
    validate_environment "$environment"

    # Create backup (unless disabled)
    if [ "$no_backup" != true ]; then
        create_backup
    fi

    # Clean build directory
    clean_build

    # Install dependencies
    install_dependencies

    # Run tests (unless disabled)
    if [ "$skip_tests" != true ]; then
        run_tests
    fi

    # Run linting (unless disabled)
    if [ "$skip_lint" != true ]; then
        run_linting
    fi

    # Build application
    build_application "$environment"

    # Validate build
    validate_build

    # Deploy based on type
    case $deployment_type in
        "static")
            deploy_static "$environment"
            ;;
        "docker")
            deploy_docker "$environment"
            ;;
    esac

    # Generate deployment report
    generate_report "$environment" "$deployment_type"

    # Cleanup old backups (if requested)
    if [ "$cleanup_backups_flag" = true ]; then
        cleanup_backups
    fi

    log_success "Deployment completed successfully!"
    log_info "Version $VERSION deployed to $environment environment using $deployment_type"
}

# Run main function with all arguments
main "$@"