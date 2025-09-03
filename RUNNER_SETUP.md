# GitHub Self-Hosted Runner Setup (Docker)

## Overview
This setup uses Docker to run a self-hosted GitHub Actions runner, providing unlimited CI/CD minutes for the Vana project.

## Prerequisites
- Docker Desktop for Mac (already installed: v28.3.3)
- GitHub Personal Access Token with `repo` scope
- macOS with Apple Silicon (M3)

## Quick Start

### 1. Generate GitHub Token
1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scope: `repo` (Full control of private repositories)
4. Save the token securely

### 2. Start the Runner
```bash
# Set your GitHub token
export GITHUB_TOKEN=your_token_here

# Start the runner
./scripts/runner-setup.sh
```

### 3. Verify Setup
- Check runner status: https://github.com/NickB03/vana/settings/actions/runners
- Runner should appear as `docker-runner-mac`

## Management Commands

### Basic Operations
```bash
# Check status
./scripts/runner-manage.sh status

# View logs
./scripts/runner-manage.sh logs

# Restart runner
./scripts/runner-manage.sh restart

# Stop runner
./scripts/runner-manage.sh stop

# Start runner
./scripts/runner-manage.sh start
```

### Advanced Operations
```bash
# Update runner image
./scripts/runner-manage.sh update

# Open shell in container
./scripts/runner-manage.sh shell

# Clean up everything
./scripts/runner-manage.sh clean
```

## File Structure
```
vana/
├── docker-compose.runner.yml   # Docker Compose configuration
├── scripts/
│   ├── runner-setup.sh        # Initial setup script
│   └── runner-manage.sh       # Management commands
└── .github/workflows/
    └── ci-local.yml           # CI workflow for self-hosted runner
```

## Workflow Configuration

Workflows should use the following runs-on labels:
```yaml
runs-on: [self-hosted, docker]
```

## Security Features

### Docker Container Isolation
- Runs with minimal privileges (`no-new-privileges`)
- Drops all capabilities except necessary ones
- Read-only mount of repository
- Isolated network

### Token Security
- Token is passed as environment variable
- Never committed to repository
- Can be rotated anytime

## Resource Management

### Container Limits
- Automatically restarts on failure
- Isolated from host system
- Uses dedicated volumes

### Monitoring
```bash
# Check resource usage
docker stats vana-runner

# View detailed logs
docker logs -f vana-runner --tail 100
```

## Troubleshooting

### Runner Not Appearing Online
1. Check token permissions
2. Verify Docker is running
3. Check container logs: `docker logs vana-runner`

### Container Won't Start
```bash
# Check Docker status
docker info

# Remove old containers
docker-compose -f docker-compose.runner.yml down -v

# Restart fresh
./scripts/runner-setup.sh
```

### Permission Issues
```bash
# Fix script permissions
chmod +x scripts/*.sh

# Fix Docker socket permissions
sudo chmod 666 /var/run/docker.sock
```

## Cost Optimization

### Why Docker Runner?
- **Unlimited minutes** (vs 3,000/month GitHub limit)
- **Local caching** for faster builds
- **No network transfer costs**
- **Full control** over environment

### Performance Tips
1. Use local caching for dependencies
2. Run parallel jobs when possible
3. Skip unnecessary steps for PRs
4. Use conditional workflows

## Maintenance

### Weekly Tasks
- Check for runner image updates
- Review container logs for errors
- Clean up old build artifacts

### Monthly Tasks
- Rotate GitHub token
- Update runner image
- Review resource usage

## Migration from GitHub-Hosted

To switch workflows from GitHub-hosted to self-hosted:

1. Update `runs-on` in workflows:
```yaml
# Before
runs-on: ubuntu-latest

# After
runs-on: [self-hosted, docker]
```

2. Commit and push changes
3. Monitor first runs for issues

## Support

- GitHub Runner Docs: https://docs.github.com/en/actions/hosting-your-own-runners
- Docker Image: https://github.com/myoung34/docker-github-runner
- Project Issues: https://github.com/NickB03/vana/issues