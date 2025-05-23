#!/bin/bash
# Frontend setup script for VANA local development

# Set up colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up VANA frontend development environment...${NC}"

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python -m venv .venv
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
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install requirements.${NC}"
    exit 1
fi
echo -e "${GREEN}Requirements installed successfully.${NC}"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp ../../.env.example .env
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create .env file. Please create it manually.${NC}"
    else
        echo -e "${GREEN}.env file created. Please update it with your credentials.${NC}"
    fi
else
    echo -e "${YELLOW}.env file already exists.${NC}"
fi

# Create symbolic links to main project files
echo -e "${YELLOW}Creating symbolic links to main project files...${NC}"
ln -sf ../../dashboard .
ln -sf ../../config .
echo -e "${GREEN}Symbolic links created successfully.${NC}"

echo -e "${GREEN}Frontend setup complete!${NC}"
echo -e "${YELLOW}To activate the virtual environment, run:${NC}"
echo -e "    source .venv/bin/activate"
echo -e "${YELLOW}To start the frontend server, run:${NC}"
echo -e "    python run_frontend.py"
