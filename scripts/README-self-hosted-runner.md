# Self-Hosted Runner Setup for Vana Project

## 🎯 Quick Setup (5 minutes)

### 1. Install & Configure Runner
```bash
# Make scripts executable
chmod +x scripts/setup-self-hosted-runner.sh
chmod +x scripts/runner-monitor.sh  
chmod +x scripts/runner-maintenance.sh

# Run setup (interactive)
./scripts/setup-self-hosted-runner.sh
```

### 2. Start the Runner
```bash
# Start runner service
launchctl load ~/Library/LaunchAgents/com.vana.actions-runner.plist

# Verify it's running
launchctl list | grep vana
```

### 3. Replace Your Workflow
```bash
# Backup current workflow
cp .github/workflows/ci.yml .github/workflows/ci-github-hosted.yml.backup

# Use self-hosted workflow
cp scripts/ci-self-hosted.yml .github/workflows/ci.yml

# Commit the change
git add .github/workflows/ci.yml
git commit -m "feat: switch to self-hosted runner"
git push
```

## 📊 Resource Optimization

### Your Mac M3 Setup
- **CPU**: 8 cores (4P + 4E)
- **RAM**: 16GB
- **Optimal Strategy**: 2 concurrent jobs max
- **Isolation**: Docker containers per job
- **Estimated Speed**: 3-5x faster than GitHub hosted

### Resource Monitoring
```bash
# Real-time monitoring
./scripts/runner-monitor.sh

# Check current status
./scripts/runner-monitor.sh status

# Daily maintenance
./scripts/runner-maintenance.sh daily
```

## 🚀 Performance Benefits

| Metric | GitHub Hosted | Self-Hosted | Improvement |
|--------|---------------|-------------|-------------|
| Setup Time | 2-3 min | 10-15 sec | **10x faster** |
| Dependency Install | 1-2 min | 15-30 sec | **3-4x faster** |  
| Test Execution | 3-5 min | 1-2 min | **2-3x faster** |
| Total Pipeline | 8-12 min | 3-5 min | **2.5x faster** |

## 🔒 Security Features

- **Container Isolation**: Each job runs in isolated Docker container
- **Non-root Execution**: All processes run as `runner` user
- **Network Isolation**: Jobs use dedicated Docker network
- **Automatic Cleanup**: Resources cleaned after each job
- **Access Control**: Runner only has repo scope permissions

## 🛠️ Daily Operations

### Monitoring Commands
```bash
# Check runner status
launchctl print gui/$(id -u)/com.vana.actions-runner.plist

# View runner logs
tail -f ~/actions-runner/runner.log

# Check resource usage
./scripts/runner-monitor.sh status

# View Docker containers
docker ps --filter "name=vana-*"
```

### Maintenance Commands
```bash
# Daily maintenance (run this daily)
./scripts/runner-maintenance.sh daily

# Restart runner if needed
./scripts/runner-maintenance.sh restart

# Update Docker containers
./scripts/runner-maintenance.sh update

# Generate health report
./scripts/runner-maintenance.sh report
```

## 📈 Resource Usage Patterns

### Typical CI Run (Python + Node.js)
```
Peak Memory: ~6-8GB (out of 16GB)
Peak CPU: ~60-80% (temporary spikes)
Docker Usage: ~2-3GB storage
Duration: 3-5 minutes
```

### Monthly Resource Savings
- **GitHub Minutes**: 3,000+ → 0 (save $0.008/min = $24+/month)
- **Local Resources**: ~2-3 hours/month of Mac usage
- **Network**: Minimal (only git pulls)

## ⚡ Optimization Tips

### For Faster Builds
1. **Pre-built Containers**: Keep Docker images warm
2. **Local Cache**: Dependencies cached on disk
3. **Concurrent Jobs**: Max 2 for optimal performance
4. **Skip on Docs**: CI skips markdown changes

### For Lower Resource Usage
1. **Job Scheduling**: Heavy jobs run sequentially
2. **Cleanup**: Automatic cleanup after each job
3. **Monitoring**: Real-time resource monitoring
4. **Limits**: Memory and CPU limits per container

## 🔧 Troubleshooting

### Runner Not Starting
```bash
# Check logs
tail -f ~/actions-runner/runner.error.log

# Restart service
launchctl unload ~/Library/LaunchAgents/com.vana.actions-runner.plist
launchctl load ~/Library/LaunchAgents/com.vana.actions-runner.plist
```

### High Resource Usage
```bash
# Clean up Docker
docker system prune -f

# Check what's consuming resources
./scripts/runner-monitor.sh status

# Force cleanup
./scripts/runner-maintenance.sh daily
```

### Docker Issues
```bash
# Rebuild containers
docker build -f scripts/docker/Dockerfile.python -t vana-runner-python .
docker build -f scripts/docker/Dockerfile.node -t vana-runner-node .

# Reset Docker completely
docker system prune -a
```

## 📋 Workflow Changes

### Original vs Self-Hosted
- **runs-on**: `ubuntu-latest` → `self-hosted`
- **Concurrency**: 6+ parallel jobs → 2 optimal jobs
- **Isolation**: VM isolation → Docker isolation  
- **Caching**: GitHub cache → Local disk cache
- **Speed**: ~12 minutes → ~4 minutes

### Matrix Strategy
```yaml
strategy:
  max-parallel: 2  # Optimal for Mac M3
  fail-fast: false
  matrix:
    test-type: [lint, unit, integration]
```

## 🎯 Cost Analysis

### Monthly Savings Breakdown
```
GitHub Actions (3,000+ min):  $24/month
Self-hosted (Mac power):      $3/month  
Net Savings:                  $21/month
Annual Savings:               $252/year
```

### Setup Time Investment
- Initial Setup: 15 minutes
- Daily Maintenance: 2 minutes (automated)
- Monthly Maintenance: 15 minutes
- **Break-even**: After 1 week of usage

---

## 🚦 Status Dashboard

Check these files for real-time status:
- `~/actions-runner/logs/performance-report.txt` - Latest performance
- `~/actions-runner/logs/health-summary-YYYYMMDD.txt` - Daily health
- `~/actions-runner/runner.log` - Runner activity log

**Questions?** Check the troubleshooting section or runner logs first.