# 🤖 VANA - Multi-Agent AI System

[![Python 3.13+](https://img.shields.io/badge/python-3.13+-blue.svg)](https://www.python.org/downloads/)
[![Infrastructure Status](https://img.shields.io/badge/infrastructure-46.2%25%20working-yellow.svg)](./docs/validation/GROUND_TRUTH_VALIDATION_REPORT.md)
[![Core Tools](https://img.shields.io/badge/core%20tools-100%25%20working-green.svg)](./docs/tools/tool-reference.md)
[![Documentation](https://img.shields.io/badge/documentation-complete-green.svg)](./docs/)
[![Security](https://img.shields.io/badge/security-vulnerability%20reporting-blue.svg)](./SECURITY.md)

> **Development Status**: Partially Operational (46.2% Infrastructure Working)  
> **Documentation Status**: Complete Professional Documentation  
> **Last Validation**: 2025-07-01

## ⚠️ Important Notice

This documentation has been completely rewritten to accurately reflect the system's current state. All guides have been tested and verified. Please refer to the [Ground Truth Validation Report](docs/validation/GROUND_TRUTH_VALIDATION_REPORT.md) for actual system status.

## 🚨 Critical Requirements

### ✅ Python 3.13+ Mandatory
```bash
# Verify Python version (MUST be 3.13+)
python3 --version  # Should show Python 3.13.x
poetry env info    # Virtualenv Python should be 3.13.x
```

**Why Python 3.13 is Required:**
- Modern async patterns required by Google ADK
- SSL/TLS compatibility for production services
- Performance optimizations critical for agent coordination

### 📦 Dependencies Status
- ✅ **psutil v7.0.0** - Available (contrary to previous claims)
- ✅ **google-adk** - Google Agent Development Kit integration
- ✅ **fastapi** - Web framework functional
- ⚠️ **Docker** - Optional (fallback mode available)

### ⚠️ Known Issues
- **Critical Bug**: `coordinated_search_tool` (lib/_tools/search_coordinator.py:425)
- **Vector search** infrastructure not configured
- **Memory service** using in-memory fallback
- See [Troubleshooting Guide](./docs/troubleshooting/README.md) for solutions

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Install dependencies (Python 3.13+ required)
poetry install

# Verify environment
poetry run python main.py --version
```

### 2. Basic Usage
```bash
# Start the system (local development)
python main.py

# In a separate terminal, start the UI development server
cd mission_control_ui
npm run dev
```

### 3. Accessing the UI
- **VANA Backend**: `http://localhost:8081`
- **Mission Control UI**: `http://localhost:8080`

# Test core functionality
curl http://localhost:8081/health
# Returns: {"status": "healthy", "agent": "vana", "mcp_enabled": true}
```

### 3. What Works Today
- **✅ Core Development Tools** - File operations, search, system monitoring
- **✅ Agent Coordination** - Multi-agent task delegation
- **✅ MCP Integration** - Time, filesystem, specialist tools
- **⚠️ Web Features** - Requires GOOGLE_API_KEY configuration

See [What Works Today](./docs/user-guide/WHAT_WORKS_TODAY.md) for complete functionality list.

## 📊 System Status Dashboard

| Component | Status | Success Rate | Notes |
|-----------|--------|--------------|-------|
| **Core Tools** | ✅ Working | 100% | All base ADK tools functional |
| **Agent System** | ✅ Working | 100% | All agents load successfully |
| **API Endpoints** | ⚠️ Partial | 80.6% | Most components tested working |
| **Infrastructure** | ⚠️ Limited | 46.2% | Vector search not configured |
| **Dependencies** | ✅ Complete | 100% | All required packages available |

**Last Validated**: 2025-07-01 with comprehensive documentation quality initiative

### 🔧 Agent Architecture
- **VANA Orchestrator** - Main coordinator with comprehensive toolset
- **Code Execution Specialist** - Secure sandboxed execution (fallback mode)
- **Data Science Specialist** - Data analysis and ML capabilities
- **Proxy Agents** - Memory/Orchestration delegate to VANA

## 📚 Documentation

### 📖 User Guides
- **[What Works Today](./docs/user-guide/WHAT_WORKS_TODAY.md)** - Tested functionality with success rates
- **[Getting Started](./docs/getting-started/installation.md)** - Real setup requirements
- **[Troubleshooting](./docs/troubleshooting/README.md)** - Common issues with solutions

### 🏗️ Developer Resources
- **[Architecture Overview](./docs/architecture/README.md)** - System design and patterns
- **[API Reference](./docs/api/README.md)** - Complete tool documentation
- **[Developer Guide](./docs/guides/developer-guide.md)** - Development setup and patterns

### 🚀 Deployment
- **[Cloud Deployment](./docs/deployment/cloud-deployment.md)** - Google Cloud Run setup
- **[Local Setup](./docs/deployment/local-setup.md)** - Development environment
- **[Security Guide](./docs/deployment/security-guide.md)** - Security best practices

## 🤝 Contributing

We welcome contributions! Please see our:
- **[Code of Conduct](./CODE_OF_CONDUCT.md)** - Community standards
- **[Security Policy](./SECURITY.md)** - Vulnerability reporting
- **[Changelog](./CHANGELOG.md)** - Recent changes and versions

### 📝 Reporting Issues
- **Bug Reports**: Use [GitHub Issues](https://github.com/NickB03/vana/issues)
- **Security Vulnerabilities**: Use [GitHub Security Advisories](https://github.com/NickB03/vana/security/advisories)
- **Documentation Errors**: Help us improve accuracy

## 📞 Support

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Comprehensive guides and examples
- **API Reference**: Complete tool documentation with examples

## 📝 License

[License information to be added]

---

**Built with Google Agent Development Kit (ADK) • Multi-Agent Coordination • Comprehensive Tool Integration**
