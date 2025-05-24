#!/bin/bash
# Backend setup script for VANA local development

# Set up colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up VANA backend development environment...${NC}"

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv .venv
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create virtual environment. Please make sure python3 is installed.${NC}"
        exit 1
    fi
    echo -e "${GREEN}Virtual environment created successfully.${NC}"
else
    echo -e "${YELLOW}Virtual environment already exists.${NC}"
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source .venv/bin/activate
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to activate virtual environment.${NC}"
    exit 1
fi
echo -e "${GREEN}Virtual environment activated.${NC}"

# Install requirements
echo -e "${YELLOW}Installing requirements...${NC}"
pip install -r $(dirname "$0")/requirements.txt
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install requirements.${NC}"
    exit 1
fi
echo -e "${GREEN}Requirements installed successfully.${NC}"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    # Check if .env.example exists in the project root
    if [ -f "../../.env.example" ]; then
        cp ../../.env.example .env
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to copy .env.example. Creating a basic .env file.${NC}"
            cat > .env << EOL
# VANA Backend Environment Variables
BACKEND_PORT=5000
FLASK_DEBUG=true
EOL
        else
            echo -e "${GREEN}.env file created from example. Please update it with your credentials.${NC}"
        fi
    else
        # Create a basic .env file
        echo -e "${YELLOW}No .env.example found. Creating a basic .env file.${NC}"
        cat > .env << EOL
# VANA Backend Environment Variables
BACKEND_PORT=5000
FLASK_DEBUG=true
EOL
        echo -e "${GREEN}Basic .env file created. Please update it with your credentials.${NC}"
    fi
else
    echo -e "${YELLOW}.env file already exists.${NC}"
fi

# Create symbolic links to main project files
echo -e "${YELLOW}Creating symbolic links to main project files...${NC}"
ln -sf ../../agent .
ln -sf ../../tools .
ln -sf ../../config .
ln -sf ../../scripts .
ln -sf ../../tests .
echo -e "${GREEN}Symbolic links created successfully.${NC}"

echo -e "${GREEN}Backend setup complete!${NC}"
echo -e "${YELLOW}To activate the virtual environment, run:${NC}"
echo -e "    source .venv/bin/activate"
echo -e "${YELLOW}To start the backend server, run:${NC}"
echo -e "    python run_backend.py"
