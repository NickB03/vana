#!/bin/bash
# VANA Environment Configuration Script
# This script helps set up the environment configuration for VANA.

# Set script to exit on error
set -e

# Default values
ENV_TYPE="development"
OUTPUT_FILE=".env"
TEMPLATE_DIR="config/templates"
FORCE=false
INTERACTIVE=true

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display help
show_help() {
    echo -e "${BLUE}VANA Environment Configuration Script${NC}"
    echo "This script helps set up the environment configuration for VANA."
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help                 Show this help message"
    echo "  -e, --env TYPE             Environment type (demo, development)"
    echo "  -o, --output FILE          Output file path (default: .env)"
    echo "  -f, --force                Force overwrite existing file"
    echo "  -n, --non-interactive      Run in non-interactive mode"
    echo ""
    echo "Examples:"
    echo "  $0 --env demo              Create a demo environment configuration"
    echo "  $0 --env development       Create a development environment configuration"
    echo "  $0 --output .env.local     Output to .env.local instead of .env"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -h|--help)
            show_help
            exit 0
            ;;
        -e|--env)
            ENV_TYPE="$2"
            shift
            shift
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -n|--non-interactive)
            INTERACTIVE=false
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment type
if [[ "$ENV_TYPE" != "demo" && "$ENV_TYPE" != "development" ]]; then
    echo -e "${RED}Error: Invalid environment type '$ENV_TYPE'${NC}"
    echo "Valid types are: demo, development"
    exit 1
fi

# Check if template file exists
TEMPLATE_FILE="$TEMPLATE_DIR/.env.$ENV_TYPE"
if [[ ! -f "$TEMPLATE_FILE" ]]; then
    echo -e "${RED}Error: Template file not found: $TEMPLATE_FILE${NC}"
    exit 1
fi

# Check if output file exists and handle accordingly
if [[ -f "$OUTPUT_FILE" && "$FORCE" != true ]]; then
    if [[ "$INTERACTIVE" == true ]]; then
        echo -e "${YELLOW}Warning: Output file already exists: $OUTPUT_FILE${NC}"
        read -p "Do you want to overwrite it? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Operation cancelled.${NC}"
            exit 0
        fi
    else
        echo -e "${RED}Error: Output file already exists: $OUTPUT_FILE${NC}"
        echo "Use --force to overwrite"
        exit 1
    fi
fi

# Copy template to output file
cp "$TEMPLATE_FILE" "$OUTPUT_FILE"
echo -e "${GREEN}Created environment configuration: $OUTPUT_FILE${NC}"

# Interactive mode: prompt for customization
if [[ "$INTERACTIVE" == true ]]; then
    echo -e "${BLUE}Do you want to customize the configuration? (y/N)${NC}"
    read -p "" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Prompt for key values
        echo -e "${BLUE}Google Cloud Project ID:${NC}"
        read -p "GOOGLE_CLOUD_PROJECT=" GOOGLE_CLOUD_PROJECT
        if [[ -n "$GOOGLE_CLOUD_PROJECT" ]]; then
            sed -i.bak "s/^GOOGLE_CLOUD_PROJECT=.*/GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT/" "$OUTPUT_FILE"
        fi

        echo -e "${BLUE}Google Cloud Location:${NC}"
        read -p "GOOGLE_CLOUD_LOCATION=" GOOGLE_CLOUD_LOCATION
        if [[ -n "$GOOGLE_CLOUD_LOCATION" ]]; then
            sed -i.bak "s/^GOOGLE_CLOUD_LOCATION=.*/GOOGLE_CLOUD_LOCATION=$GOOGLE_CLOUD_LOCATION/" "$OUTPUT_FILE"
        fi

        echo -e "${BLUE}Path to service account key file:${NC}"
        read -p "GOOGLE_APPLICATION_CREDENTIALS=" GOOGLE_APPLICATION_CREDENTIALS
        if [[ -n "$GOOGLE_APPLICATION_CREDENTIALS" ]]; then
            sed -i.bak "s|^GOOGLE_APPLICATION_CREDENTIALS=.*|GOOGLE_APPLICATION_CREDENTIALS=$GOOGLE_APPLICATION_CREDENTIALS|" "$OUTPUT_FILE"
        fi

        echo -e "${BLUE}Vector Search Endpoint ID:${NC}"
        read -p "VECTOR_SEARCH_ENDPOINT_ID=" VECTOR_SEARCH_ENDPOINT_ID
        if [[ -n "$VECTOR_SEARCH_ENDPOINT_ID" ]]; then
            sed -i.bak "s/^VECTOR_SEARCH_ENDPOINT_ID=.*/VECTOR_SEARCH_ENDPOINT_ID=$VECTOR_SEARCH_ENDPOINT_ID/" "$OUTPUT_FILE"

            # Also update the endpoint name if project ID is set
            if [[ -n "$GOOGLE_CLOUD_PROJECT" && -n "$GOOGLE_CLOUD_LOCATION" ]]; then
                ENDPOINT_NAME="projects/$GOOGLE_CLOUD_PROJECT/locations/$GOOGLE_CLOUD_LOCATION/indexEndpoints/$VECTOR_SEARCH_ENDPOINT_ID"
                sed -i.bak "s|^VECTOR_SEARCH_ENDPOINT_NAME=.*|VECTOR_SEARCH_ENDPOINT_NAME=$ENDPOINT_NAME|" "$OUTPUT_FILE"
            fi
        fi

        # Clean up backup file
        rm -f "$OUTPUT_FILE.bak"

        echo -e "${GREEN}Configuration customized successfully.${NC}"
    fi
fi

# Verify the configuration
echo -e "${BLUE}Verifying configuration...${NC}"
if grep -q "PLACEHOLDER" "$OUTPUT_FILE"; then
    echo -e "${YELLOW}Warning: Configuration contains placeholder values that need to be replaced.${NC}"
    echo "Edit $OUTPUT_FILE to replace placeholder values before using in production."
else
    echo -e "${GREEN}Configuration looks good!${NC}"
fi

echo -e "${GREEN}Environment configuration complete!${NC}"
echo "To use this configuration, run:"
echo "  export \$(grep -v '^#' $OUTPUT_FILE | xargs)"
echo "Or source it in your shell:"
echo "  source $OUTPUT_FILE"
