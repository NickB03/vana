#!/usr/bin/env python3
"""
Memory Health Status Update Script
Updates memory system health status after sync operations.

This script was created to resolve memory-sync workflow failures.
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def assess_memory_health() -> Dict[str, Any]:
    """
    Assess current memory system health status.
    
    Returns:
        Health assessment results
    """
    logger.info("🔍 Assessing memory system health...")
    
    health_status = {
        "timestamp": datetime.utcnow().isoformat(),
        "overall_status": "unknown",
        "components": {
            "local_chromadb": {"status": "unknown", "details": {}},
            "external_chromadb": {"status": "unknown", "details": {}},
            "memory_scripts": {"status": "unknown", "details": {}},
            "mcp_servers": {"status": "unknown", "details": {}}
        },
        "metrics": {
            "total_memory_size_mb": 0,
            "total_documents": 0,
            "last_sync_time": None,
            "error_count": 0
        },
        "recommendations": []
    }
    
    try:
        # Check local ChromaDB
        local_db = Path(".memory_db")
        if local_db.exists():
            health_status["components"]["local_chromadb"]["status"] = "active"
            
            # Get database size
            db_files = list(local_db.rglob("*"))
            total_size = sum(f.stat().st_size for f in db_files if f.is_file()) / (1024 * 1024)
            health_status["components"]["local_chromadb"]["details"] = {
                "size_mb": round(total_size, 2),
                "file_count": len(db_files)
            }
            health_status["metrics"]["total_memory_size_mb"] += total_size
            
        else:
            health_status["components"]["local_chromadb"]["status"] = "missing"
            health_status["recommendations"].append("Local ChromaDB not found - consider initializing")
        
        # Check external ChromaDB
        external_db = Path("/Users/nick/Development/chromadb")
        if external_db.exists():
            health_status["components"]["external_chromadb"]["status"] = "active"
            
            # Get database size and document count
            db_files = list(external_db.rglob("*.sqlite*"))
            if db_files:
                total_size = sum(f.stat().st_size for f in db_files) / (1024 * 1024)
                health_status["components"]["external_chromadb"]["details"] = {
                    "size_mb": round(total_size, 2),
                    "database_files": len(db_files)
                }
                health_status["metrics"]["total_memory_size_mb"] += total_size
                
                # Estimate document count (rough approximation)
                health_status["metrics"]["total_documents"] = int(total_size * 50)  # ~50 docs per MB
            
        else:
            health_status["components"]["external_chromadb"]["status"] = "missing"
        
        # Check memory scripts
        script_dir = Path("scripts")
        memory_scripts = [
            "extract_memory_context.py",
            "sync_to_vertex.py", 
            "memory_cleanup.py",
            "update_memory_health.py"
        ]
        
        existing_scripts = [s for s in memory_scripts if (script_dir / s).exists()]
        health_status["components"]["memory_scripts"]["status"] = "complete" if len(existing_scripts) == len(memory_scripts) else "partial"
        health_status["components"]["memory_scripts"]["details"] = {
            "total_scripts": len(memory_scripts),
            "existing_scripts": len(existing_scripts),
            "missing_scripts": [s for s in memory_scripts if s not in existing_scripts]
        }
        
        # Check MCP server configuration
        claude_config = Path("/Users/nick/.claude.json")
        if claude_config.exists():
            try:
                with open(claude_config, 'r') as f:
                    config = json.load(f)
                
                mcp_servers = config.get("mcpServers", {})
                memory_servers = [name for name in mcp_servers.keys() if "memory" in name.lower() or "chroma" in name.lower()]
                
                health_status["components"]["mcp_servers"]["status"] = "configured" if memory_servers else "missing"
                health_status["components"]["mcp_servers"]["details"] = {
                    "total_mcp_servers": len(mcp_servers),
                    "memory_related_servers": memory_servers
                }
                
            except Exception as e:
                health_status["components"]["mcp_servers"]["status"] = "error"
                health_status["components"]["mcp_servers"]["details"] = {"error": str(e)}
                health_status["metrics"]["error_count"] += 1
        
        # Determine overall status
        component_statuses = [comp["status"] for comp in health_status["components"].values()]
        
        if all(status in ["active", "complete", "configured"] for status in component_statuses):
            health_status["overall_status"] = "healthy"
        elif any(status in ["active", "complete", "configured"] for status in component_statuses):
            health_status["overall_status"] = "degraded"
        else:
            health_status["overall_status"] = "critical"
        
        # Generate recommendations
        if health_status["overall_status"] != "healthy":
            if health_status["components"]["local_chromadb"]["status"] == "missing":
                health_status["recommendations"].append("Initialize local ChromaDB for development")
            
            if health_status["components"]["external_chromadb"]["status"] == "missing":
                health_status["recommendations"].append("Setup external ChromaDB for VS Code integration")
            
            if health_status["components"]["memory_scripts"]["status"] != "complete":
                health_status["recommendations"].append("Ensure all memory scripts are present")
            
            if health_status["components"]["mcp_servers"]["status"] != "configured":
                health_status["recommendations"].append("Configure MCP servers for memory integration")
        
        logger.info(f"✅ Memory health assessment completed - Status: {health_status['overall_status']}")
        
    except Exception as e:
        logger.error(f"❌ Health assessment failed: {e}")
        health_status["overall_status"] = "error"
        health_status["metrics"]["error_count"] += 1
    
    return health_status

def update_health_status(commit_sha: str, sync_status: str, health_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update health status with sync information.
    
    Args:
        commit_sha: Git commit SHA
        sync_status: Status of sync operation
        health_data: Current health assessment
        
    Returns:
        Updated health status
    """
    logger.info(f"📝 Updating health status for commit: {commit_sha[:8]}")
    
    update_info = {
        "last_update": datetime.utcnow().isoformat(),
        "commit_sha": commit_sha,
        "sync_status": sync_status,
        "health_snapshot": health_data
    }
    
    # Write health status to file
    health_file = Path("memory_health_status.json")
    
    # Load existing status if available
    existing_status = []
    if health_file.exists():
        try:
            with open(health_file, 'r') as f:
                existing_status = json.load(f)
            if not isinstance(existing_status, list):
                existing_status = [existing_status]  # Convert single record to list
        except Exception as e:
            logger.warning(f"⚠️ Could not load existing health status: {e}")
    
    # Add new status update
    existing_status.append(update_info)
    
    # Keep only last 10 status updates
    existing_status = existing_status[-10:]
    
    # Write updated status
    with open(health_file, 'w') as f:
        json.dump(existing_status, f, indent=2)
    
    logger.info(f"📄 Health status updated in: {health_file}")
    return update_info

def generate_health_report(health_data: Dict[str, Any]) -> str:
    """Generate a formatted health report."""
    report = [
        "🏥 Memory System Health Report",
        "=" * 50,
        f"📅 Assessment Time: {health_data['timestamp']}",
        f"🎯 Overall Status: {health_data['overall_status'].upper()}",
        "",
        "🔧 Component Status:",
    ]
    
    for component, info in health_data["components"].items():
        status_emoji = {"active": "✅", "complete": "✅", "configured": "✅", 
                       "partial": "⚠️", "missing": "❌", "error": "❌", "unknown": "❓"}
        emoji = status_emoji.get(info["status"], "❓")
        component_name = component.replace("_", " ").title()
        report.append(f"   {emoji} {component_name}: {info['status']}")
        
        # Add details if available
        if info.get("details"):
            for key, value in info["details"].items():
                if isinstance(value, list) and value:
                    report.append(f"      • {key}: {', '.join(map(str, value))}")
                elif not isinstance(value, list):
                    report.append(f"      • {key}: {value}")
    
    report.extend([
        "",
        "📊 Metrics:",
        f"   • Total Memory Size: {health_data['metrics']['total_memory_size_mb']:.1f} MB",
        f"   • Estimated Documents: {health_data['metrics']['total_documents']:,}",
        f"   • Error Count: {health_data['metrics']['error_count']}",
    ])
    
    if health_data["recommendations"]:
        report.extend([
            "",
            "💡 Recommendations:",
        ])
        for rec in health_data["recommendations"]:
            report.append(f"   • {rec}")
    
    return "\n".join(report)

def main():
    parser = argparse.ArgumentParser(description="Update memory system health status")
    parser.add_argument("--commit-sha", required=True, help="Git commit SHA")
    parser.add_argument("--sync-status", required=True, help="Status of sync operation")
    parser.add_argument("--report-only", action="store_true", help="Generate report only")
    
    args = parser.parse_args()
    
    try:
        # Assess current health
        health_data = assess_memory_health()
        
        # Generate and display report
        report = generate_health_report(health_data)
        print(report)
        
        if not args.report_only:
            # Update health status
            update_info = update_health_status(args.commit_sha, args.sync_status, health_data)
            logger.info("✅ Memory health status updated successfully")
        else:
            logger.info("📋 Report-only mode - no status update written")
        
        # Exit with appropriate code based on health
        if health_data["overall_status"] in ["critical", "error"]:
            sys.exit(1)
        elif health_data["overall_status"] == "degraded":
            logger.warning("⚠️ Memory system health is degraded but operational")
            
    except Exception as e:
        logger.error(f"❌ Health status update failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()