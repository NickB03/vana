"""
Enhanced Dashboard API for VANA System

This module provides unified API endpoints for dashboard data,
serving both React WebUI and Streamlit dashboard components.
"""

from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
import logging
import json
from typing import Dict, List, Any, Optional

# Import existing API modules
from dashboard.api.agent_api import agent_api
from dashboard.api.system_api import system_api
from dashboard.api.memory_api import memory_api
from dashboard.api.task_api import task_api

logger = logging.getLogger(__name__)

# Create blueprint for dashboard API
dashboard_bp = Blueprint('dashboard_api', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/health', methods=['GET'])
def dashboard_health():
    """Dashboard API health check"""
    try:
        return jsonify({
            "service": "dashboard-api",
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "components": {
                "agents": "operational",
                "system": "operational", 
                "memory": "operational",
                "tasks": "operational"
            }
        })
    except Exception as e:
        logger.error(f"Dashboard health check failed: {e}")
        return jsonify({
            "service": "dashboard-api",
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500

@dashboard_bp.route('/overview', methods=['GET'])
def dashboard_overview():
    """Get comprehensive dashboard overview data"""
    try:
        # Get data from existing APIs
        agent_data = agent_api.get_agent_status()
        system_data = system_api.get_system_health()
        memory_data = memory_api.get_memory_usage()
        task_data = task_api.get_recent_tasks()
        
        overview = {
            "timestamp": datetime.utcnow().isoformat(),
            "summary": {
                "total_agents": len(agent_data.get("agents", [])),
                "active_agents": len([a for a in agent_data.get("agents", []) if a.get("status") == "active"]),
                "system_health": system_data.get("overall_status", "unknown"),
                "memory_usage_percent": memory_data.get("usage_percent", 0),
                "recent_tasks": len(task_data.get("tasks", []))
            },
            "quick_stats": {
                "avg_response_time": calculate_avg_response_time(agent_data),
                "error_rate": calculate_error_rate(agent_data),
                "uptime_percent": system_data.get("uptime_percent", 0),
                "memory_efficiency": memory_data.get("efficiency_score", 0)
            },
            "alerts": get_active_alerts(agent_data, system_data, memory_data)
        }
        
        return jsonify(overview)
        
    except Exception as e:
        logger.error(f"Failed to get dashboard overview: {e}")
        return jsonify({"error": "Failed to retrieve dashboard overview"}), 500

@dashboard_bp.route('/agents', methods=['GET'])
def get_agents_dashboard():
    """Get agent data formatted for dashboard display"""
    try:
        # Get raw agent data
        raw_data = agent_api.get_agent_status()
        
        # Format for dashboard consumption
        dashboard_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "agents": [],
            "summary": {
                "total": 0,
                "active": 0,
                "inactive": 0,
                "error": 0
            },
            "performance": {
                "avg_response_time": 0,
                "total_requests": 0,
                "error_rate": 0
            }
        }
        
        if "agents" in raw_data:
            for agent in raw_data["agents"]:
                formatted_agent = {
                    "id": agent.get("id", "unknown"),
                    "name": agent.get("name", "Unknown Agent"),
                    "emoji": agent.get("emoji", "🤖"),
                    "status": agent.get("status", "unknown"),
                    "description": agent.get("description", ""),
                    "metrics": {
                        "response_time_ms": agent.get("response_time_ms", 0),
                        "requests_count": agent.get("requests_count", 0),
                        "error_count": agent.get("error_count", 0),
                        "success_rate": agent.get("success_rate", 0),
                        "last_activity": agent.get("last_activity", "")
                    },
                    "resources": {
                        "cpu_usage": agent.get("cpu_usage", 0),
                        "memory_usage_mb": agent.get("memory_usage_mb", 0),
                        "active_sessions": agent.get("active_sessions", 0)
                    }
                }
                dashboard_data["agents"].append(formatted_agent)
                
                # Update summary
                dashboard_data["summary"]["total"] += 1
                if agent.get("status") == "active":
                    dashboard_data["summary"]["active"] += 1
                elif agent.get("status") == "error":
                    dashboard_data["summary"]["error"] += 1
                else:
                    dashboard_data["summary"]["inactive"] += 1
        
        # Calculate performance metrics
        if dashboard_data["agents"]:
            total_response_time = sum(a["metrics"]["response_time_ms"] for a in dashboard_data["agents"])
            total_requests = sum(a["metrics"]["requests_count"] for a in dashboard_data["agents"])
            total_errors = sum(a["metrics"]["error_count"] for a in dashboard_data["agents"])
            
            dashboard_data["performance"]["avg_response_time"] = total_response_time / len(dashboard_data["agents"])
            dashboard_data["performance"]["total_requests"] = total_requests
            dashboard_data["performance"]["error_rate"] = (total_errors / max(total_requests, 1)) * 100
        
        return jsonify(dashboard_data)
        
    except Exception as e:
        logger.error(f"Failed to get agents dashboard data: {e}")
        return jsonify({"error": "Failed to retrieve agents data"}), 500

@dashboard_bp.route('/system', methods=['GET'])
def get_system_dashboard():
    """Get system health data formatted for dashboard display"""
    try:
        # Get raw system data
        raw_data = system_api.get_system_health()
        
        # Format for dashboard consumption
        dashboard_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_status": raw_data.get("status", "unknown"),
            "resources": {
                "cpu": {
                    "usage_percent": raw_data.get("cpu_percent", 0),
                    "cores": raw_data.get("cpu_cores", 0),
                    "load_average": raw_data.get("load_average", [])
                },
                "memory": {
                    "usage_percent": raw_data.get("memory_percent", 0),
                    "used_gb": raw_data.get("memory_used_gb", 0),
                    "total_gb": raw_data.get("memory_total_gb", 0),
                    "available_gb": raw_data.get("memory_available_gb", 0)
                },
                "disk": {
                    "usage_percent": raw_data.get("disk_percent", 0),
                    "used_gb": raw_data.get("disk_used_gb", 0),
                    "total_gb": raw_data.get("disk_total_gb", 0),
                    "free_gb": raw_data.get("disk_free_gb", 0)
                }
            },
            "network": {
                "bytes_sent": raw_data.get("network_bytes_sent", 0),
                "bytes_received": raw_data.get("network_bytes_received", 0),
                "packets_sent": raw_data.get("network_packets_sent", 0),
                "packets_received": raw_data.get("network_packets_received", 0)
            },
            "services": raw_data.get("services", {}),
            "uptime": {
                "seconds": raw_data.get("uptime_seconds", 0),
                "formatted": raw_data.get("uptime_formatted", "Unknown")
            }
        }
        
        return jsonify(dashboard_data)
        
    except Exception as e:
        logger.error(f"Failed to get system dashboard data: {e}")
        return jsonify({"error": "Failed to retrieve system data"}), 500

@dashboard_bp.route('/memory', methods=['GET'])
def get_memory_dashboard():
    """Get memory usage data formatted for dashboard display"""
    try:
        # Get raw memory data
        raw_data = memory_api.get_memory_usage()
        
        # Format for dashboard consumption
        dashboard_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "adk_memory": {
                "usage_mb": raw_data.get("adk_memory_mb", 0),
                "efficiency_score": raw_data.get("efficiency_score", 0),
                "cache_hit_rate": raw_data.get("cache_hit_rate", 0),
                "session_count": raw_data.get("active_sessions", 0)
            },
            "system_memory": {
                "usage_percent": raw_data.get("system_memory_percent", 0),
                "used_gb": raw_data.get("system_memory_used_gb", 0),
                "total_gb": raw_data.get("system_memory_total_gb", 0)
            },
            "cost_analysis": {
                "current_cost": raw_data.get("current_cost", 0),
                "projected_monthly": raw_data.get("projected_monthly_cost", 0),
                "cost_per_request": raw_data.get("cost_per_request", 0)
            },
            "performance": {
                "avg_response_time": raw_data.get("avg_response_time_ms", 0),
                "throughput_rps": raw_data.get("throughput_rps", 0),
                "error_rate": raw_data.get("error_rate_percent", 0)
            }
        }
        
        return jsonify(dashboard_data)
        
    except Exception as e:
        logger.error(f"Failed to get memory dashboard data: {e}")
        return jsonify({"error": "Failed to retrieve memory data"}), 500

@dashboard_bp.route('/tasks', methods=['GET'])
def get_tasks_dashboard():
    """Get task execution data formatted for dashboard display"""
    try:
        # Get query parameters
        limit = request.args.get('limit', 50, type=int)
        status_filter = request.args.get('status', None)
        
        # Get raw task data
        raw_data = task_api.get_recent_tasks(limit=limit, status=status_filter)
        
        # Format for dashboard consumption
        dashboard_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "tasks": [],
            "summary": {
                "total": 0,
                "completed": 0,
                "running": 0,
                "failed": 0,
                "pending": 0
            },
            "performance": {
                "avg_execution_time": 0,
                "success_rate": 0,
                "tasks_per_hour": 0
            }
        }
        
        if "tasks" in raw_data:
            for task in raw_data["tasks"]:
                formatted_task = {
                    "id": task.get("id", "unknown"),
                    "name": task.get("name", "Unknown Task"),
                    "status": task.get("status", "unknown"),
                    "agent": task.get("agent", "Unknown"),
                    "created_at": task.get("created_at", ""),
                    "completed_at": task.get("completed_at", ""),
                    "execution_time_ms": task.get("execution_time_ms", 0),
                    "result": task.get("result", ""),
                    "error": task.get("error", "")
                }
                dashboard_data["tasks"].append(formatted_task)
                
                # Update summary
                dashboard_data["summary"]["total"] += 1
                status = task.get("status", "unknown")
                if status in dashboard_data["summary"]:
                    dashboard_data["summary"][status] += 1
        
        # Calculate performance metrics
        if dashboard_data["tasks"]:
            completed_tasks = [t for t in dashboard_data["tasks"] if t["status"] == "completed"]
            if completed_tasks:
                total_time = sum(t["execution_time_ms"] for t in completed_tasks)
                dashboard_data["performance"]["avg_execution_time"] = total_time / len(completed_tasks)
                dashboard_data["performance"]["success_rate"] = (len(completed_tasks) / len(dashboard_data["tasks"])) * 100
        
        return jsonify(dashboard_data)
        
    except Exception as e:
        logger.error(f"Failed to get tasks dashboard data: {e}")
        return jsonify({"error": "Failed to retrieve tasks data"}), 500

# Helper functions
def calculate_avg_response_time(agent_data: Dict) -> float:
    """Calculate average response time across all agents"""
    if not agent_data.get("agents"):
        return 0.0
    
    total_time = sum(agent.get("response_time_ms", 0) for agent in agent_data["agents"])
    return total_time / len(agent_data["agents"])

def calculate_error_rate(agent_data: Dict) -> float:
    """Calculate overall error rate across all agents"""
    if not agent_data.get("agents"):
        return 0.0
    
    total_requests = sum(agent.get("requests_count", 0) for agent in agent_data["agents"])
    total_errors = sum(agent.get("error_count", 0) for agent in agent_data["agents"])
    
    if total_requests == 0:
        return 0.0
    
    return (total_errors / total_requests) * 100

def get_active_alerts(agent_data: Dict, system_data: Dict, memory_data: Dict) -> List[Dict]:
    """Get list of active system alerts"""
    alerts = []
    
    # Check for high error rates
    error_rate = calculate_error_rate(agent_data)
    if error_rate > 5.0:  # 5% error rate threshold
        alerts.append({
            "type": "error",
            "message": f"High error rate detected: {error_rate:.1f}%",
            "severity": "high" if error_rate > 10 else "medium"
        })
    
    # Check for high memory usage
    memory_usage = system_data.get("memory_percent", 0)
    if memory_usage > 80:
        alerts.append({
            "type": "warning",
            "message": f"High memory usage: {memory_usage}%",
            "severity": "high" if memory_usage > 90 else "medium"
        })
    
    # Check for high CPU usage
    cpu_usage = system_data.get("cpu_percent", 0)
    if cpu_usage > 80:
        alerts.append({
            "type": "warning", 
            "message": f"High CPU usage: {cpu_usage}%",
            "severity": "high" if cpu_usage > 90 else "medium"
        })
    
    return alerts
