#!/bin/bash
# Launch VANA Environment with MCP Server
# This script launches the VANA environment with virtual environment and web server

# Configuration
BASE_DIR="$HOME/Development/vana"
VENV_DIR="$BASE_DIR/.venv"
MCP_DIR="$BASE_DIR/mcp-servers/n8n-mcp"
ADK_WEB_PORT=8000
MCP_SERVER_PORT=3000

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a process is running on a port
port_in_use() {
    lsof -i:"$1" >/dev/null 2>&1
}

# Function to print a message with timestamp
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Function to print an error message with timestamp
error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Function to print a warning message with timestamp
warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Function to start a new terminal window
start_terminal() {
    osascript -e "tell application \"Terminal\" to do script \"$1\""
}

# Check if we're in the right directory
if [ ! -d "$BASE_DIR" ]; then
    error "VANA directory not found at $BASE_DIR"
    exit 1
fi

# Change to the VANA directory
cd "$BASE_DIR" || exit 1
log "Changed to VANA directory: $BASE_DIR"

# Check if virtual environment exists
if [ ! -d "$VENV_DIR" ]; then
    warning "Virtual environment not found at $VENV_DIR"

    # Check if Python is installed
    if ! command_exists python3; then
        error "Python 3 is not installed. Please install Python 3.9+ and try again."
        exit 1
    fi

    # Create virtual environment
    log "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"

    if [ ! -d "$VENV_DIR" ]; then
        error "Failed to create virtual environment."
        exit 1
    fi

    log "Virtual environment created successfully."
fi

# Check if ports are already in use
if port_in_use "$ADK_WEB_PORT"; then
    warning "Port $ADK_WEB_PORT is already in use. ADK web interface may not start correctly."
fi

if port_in_use "$MCP_SERVER_PORT"; then
    warning "Port $MCP_SERVER_PORT is already in use. MCP server may not start correctly."
fi

# Check if MCP directory exists
if [ ! -d "$MCP_DIR" ]; then
    warning "MCP directory not found at $MCP_DIR"

    # Create MCP directory
    log "Creating MCP directory..."
    mkdir -p "$MCP_DIR"

    # Check if git is installed
    if ! command_exists git; then
        error "Git is not installed. Please install Git and try again."
        exit 1
    fi

    # Clone MCP server repository
    log "Cloning MCP server repository..."
    git clone https://github.com/leonardsellem/n8n-mcp-server.git "$MCP_DIR"

    if [ ! -d "$MCP_DIR" ]; then
        error "Failed to clone MCP server repository."
        exit 1
    fi

    log "MCP server repository cloned successfully."

    # Create start-mcp-server.sh script if it doesn't exist
    if [ ! -f "$MCP_DIR/start-mcp-server.sh" ]; then
        log "Creating start-mcp-server.sh script..."
        cat > "$MCP_DIR/start-mcp-server.sh" << 'EOF'
#!/bin/bash
# Start MCP server with Knowledge Graph support

# Check if Node.js is installed
if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is not installed. Please install Node.js v18.17.0 and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v)
if [[ ! "$NODE_VERSION" =~ ^v18 ]]; then
    echo "Node.js version $NODE_VERSION detected. MCP server requires Node.js v18.17.0."

    # Check if nvm is installed
    if command -v nvm >/dev/null 2>&1; then
        echo "Using nvm to switch to Node.js v18.17.0..."
        nvm use 18.17.0
    else
        echo "nvm not found. Please install Node.js v18.17.0 manually."
    fi
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the MCP server
echo "Starting MCP server with Knowledge Graph support..."
npm start
EOF
        chmod +x "$MCP_DIR/start-mcp-server.sh"
        log "start-mcp-server.sh script created successfully."
    fi
fi

# Start ADK web interface in a new terminal window
log "Starting ADK web interface..."
start_terminal "cd $BASE_DIR && source $VENV_DIR/bin/activate && cd adk-setup && adk web"

# Start MCP server in a new terminal window
log "Starting MCP server..."
start_terminal "cd $MCP_DIR && ./start-mcp-server.sh"

# Wait for servers to start
log "Waiting for servers to start..."
sleep 5

# Open browser to ADK web interface
log "Opening browser to ADK web interface..."
open "http://localhost:$ADK_WEB_PORT"

log "VANA environment launched successfully!"
log "ADK web interface: http://localhost:$ADK_WEB_PORT"
log "MCP server: http://localhost:$MCP_SERVER_PORT"
log "Terminal windows must remain open for the servers to continue running."
