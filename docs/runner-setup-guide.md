# GitHub Actions Runner Setup Guide

## 🎯 Recommended Setup for Your Project

Based on your CI requirements and budget ($5/month max), here's the optimal setup:

### Your Situation
- **Current Issue**: Burned through GitHub Pro minutes due to stuck runner
- **Hardware**: M3 MacBook Air (16GB RAM)
- **Budget**: $5/month maximum
- **CI Needs**: Mix of standard tests AND Docker-based deployments

### ✅ Recommended: Hybrid Approach

1. **Local macOS Runner** (FREE) - For 90% of your CI
   - Runs tests, linting, builds
   - Uses your M3 Mac's power
   - Zero cost, fastest execution

2. **$4/mo Linux VPS** - For Docker operations only
   - Deploy workflows
   - Security scans
   - Container builds

## 💰 Cost Comparison

| Option | Monthly Cost | Pros | Cons |
|--------|-------------|------|------|
| **Local Mac Only** | $0 | Free, fast, always available | No Docker support |
| **Hetzner CAX11** | €3.79 (~$4) | ARM like your Mac, good perf | EU/US only |
| **DigitalOcean** | $4 | Global locations, reliable | Basic specs |
| **Oracle Free Tier** | $0 | 4 CPU, 24GB RAM free | Hard to get, ARM only |
| **Railway** | ~$5 | You already have it | NOT suitable for runners |

### Why Not Railway?
GitHub runners need to be always-on processes that poll for jobs. Railway's app-sleeping behavior and lack of privileged Docker access make it unsuitable for GitHub Actions runners.

## 🚀 Quick Setup Instructions

### Option A: Local macOS Runner (Start Here)

```bash
# Run the setup script
chmod +x scripts/runner-setup-macos.sh
./scripts/runner-setup-macos.sh
```

**Use in workflows:**
```yaml
runs-on: [self-hosted, macOS, ARM64, m3-local]
```

### Option B: Linux VPS Runner (For Docker Jobs)

#### 1. Get a VPS ($4/month)

**Hetzner (Recommended for ARM)**
- Go to: https://www.hetzner.com/cloud
- Choose: CAX11 (2 vCPU ARM, 4GB RAM) - €3.79/mo
- Location: Ashburn (US) or Falkenstein (EU)
- OS: Ubuntu 24.04

**DigitalOcean (Alternative)**
- Go to: https://www.digitalocean.com
- Choose: Basic Droplet - $4/mo (1 vCPU, 512MB RAM, 10GB SSD)
- Add 1GB swap during setup
- OS: Ubuntu 24.04

#### 2. Setup Runner

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Download and run setup script
curl -O https://raw.githubusercontent.com/NickB03/vana/main/scripts/runner-setup-linux.sh
chmod +x runner-setup-linux.sh
sudo ./runner-setup-linux.sh
```

**Use in workflows:**
```yaml
runs-on: [self-hosted, linux, docker]
```

## 🛡️ Preventing Runner Timeout Issues

Add these to ALL your workflows to prevent minute-burning:

```yaml
name: Your Workflow

# Prevent concurrent runs from stacking up
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  your-job:
    runs-on: [self-hosted, macOS, ARM64]
    timeout-minutes: 30  # Kill stuck jobs (default is 360!)
    
    steps:
      - uses: actions/checkout@v4
      # your steps...
```

## 📊 Workflow Router Pattern

Split your workflows by runner type:

**`.github/workflows/ci-local.yml`** (Tests, Builds)
```yaml
runs-on: [self-hosted, macOS, ARM64, m3-local]
```

**`.github/workflows/deploy.yml`** (Docker operations)
```yaml
runs-on: [self-hosted, linux, docker]
```

## 🔧 Runner Management Commands

### macOS Runner
```bash
# Status
cd ~/actions-runner && ./svc.sh status

# Logs
tail -f ~/actions-runner/_diag/Runner*.log

# Restart
cd ~/actions-runner
./svc.sh stop
./svc.sh start

# Prevent Mac from sleeping
sudo pmset -a disablesleep 1
```

### Linux VPS Runner
```bash
# Status
sudo /home/runner/actions-runner/svc.sh status

# Logs
journalctl -u actions.runner.* -f

# Restart
sudo /home/runner/actions-runner/svc.sh stop
sudo /home/runner/actions-runner/svc.sh start

# Monitor resources
htop  # or: docker stats
```

## 🚨 Security Best Practices

1. **Private Repos Only** - Self-hosted runners on public repos = security risk
2. **No Secrets in Code** - Use GitHub Secrets
3. **Regular Updates** - Update runner monthly
4. **Monitor Usage** - Check runner logs weekly
5. **Firewall VPS** - Only allow SSH + outbound HTTPS

## 📈 Monitoring & Alerts

### GitHub UI
- Check runners: https://github.com/NickB03/vana/settings/actions/runners
- Monitor usage: Insights → Actions

### Local Monitoring
```bash
# Create simple monitor script
cat > ~/check-runner.sh << 'EOF'
#!/bin/bash
if ! ~/actions-runner/svc.sh status | grep -q "Active: active"; then
    echo "Runner is down!"
    # Add notification here (pushover, email, etc)
fi
EOF

# Add to crontab (check every 5 min)
crontab -e
# Add: */5 * * * * /Users/[your-user]/check-runner.sh
```

## 💡 Pro Tips

1. **Start with Local Only** - Add VPS when you need Docker
2. **Use Labels** - Target specific runners for specific jobs
3. **Cache Aggressively** - Both runners support actions/cache
4. **Monitor Costs** - Set VPS provider spending alerts
5. **Backup Registration** - Save runner registration tokens securely

## 🔄 Migration Path

1. **Week 1**: Run local Mac runner for all non-Docker jobs
2. **Week 2**: If Docker needed, spin up $4 VPS
3. **Month 1**: Evaluate if you need the VPS continuously
4. **Future**: Consider GitHub's larger runners if project grows

## ❓ Troubleshooting

### Runner Shows Offline
- Mac: Check sleep settings (`pmset -g`)
- VPS: Check if service running (`systemctl status actions.runner.*`)

### Jobs Queued Forever
- Check runner labels match workflow
- Verify runner has correct permissions
- Check GitHub Actions status page

### High Memory Usage
- Add swap to VPS (included in setup script)
- Limit concurrent jobs in workflow
- Use `runs-on` matrix strategy

## 📚 Resources

- [GitHub Self-hosted Runners Docs](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Hetzner Cloud](https://www.hetzner.com/cloud)
- [DigitalOcean Droplets](https://www.digitalocean.com/products/droplets)
- [Runner Security](https://docs.github.com/en/actions/hosting-your-own-runners/about-self-hosted-runners#self-hosted-runner-security)