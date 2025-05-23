# Local MCP Server for VANA Development

This directory contains the Docker setup for running a local MCP (Model Context Protocol) server for VANA development.

## Prerequisites

- Docker
- Docker Compose

## Getting Started

1. Start the MCP server:

```bash
cd docker/mcp-server
docker-compose up -d
```

2. Verify the server is running:

```bash
curl http://localhost:5000/vana-dev/status
```

3. Configure VANA to use the local server by setting the following environment variables:

```
USE_LOCAL_MCP=true
MCP_ENDPOINT=http://localhost:5000
MCP_NAMESPACE=vana-dev
MCP_API_KEY=local_dev_key
```

## Data Persistence

The server data is stored in the `./data` directory, which is mounted as a volume in the Docker container. This ensures that your data persists across container restarts.

## Stopping the Server

To stop the server:

```bash
docker-compose down
```

## Troubleshooting

If you encounter issues with the MCP server:

1. Check the logs:

```bash
docker-compose logs
```

2. Restart the server:

```bash
docker-compose restart
```

3. Reset the server (this will delete all data):

```bash
docker-compose down
rm -rf data
docker-compose up -d
```
