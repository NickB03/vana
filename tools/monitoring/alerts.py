"""
Alert Manager for VANA

This module provides alert management functionality for the VANA project,
including alert generation, notification, and tracking.
"""

import os
import json
import time
import logging
import datetime
import uuid
from typing import Dict, Any, List, Optional, Callable
from pathlib import Path

# Set up logging
logger = logging.getLogger(__name__)

class AlertSeverity:
    """Alert severity constants."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class AlertManager:
    """Manager for VANA alerts."""
    
    def __init__(self, data_dir: Optional[str] = None):
        """
        Initialize an alert manager.
        
        Args:
            data_dir: Directory for alert data (optional, defaults to data/alerts)
        """
        # Create data directory if it doesn't exist
        self.data_dir = data_dir or os.path.join(os.environ.get("VANA_DATA_DIR", "data"), "alerts")
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Alert handlers
        self.alert_handlers = {}
        
        # Active alerts
        self.active_alerts = []
        self.last_update_time = 0
        self.update_interval = 60  # 1 minute
    
    def register_handler(self, alert_type: str, 
                        handler_function: Callable[[Dict[str, Any]], None]) -> None:
        """
        Register an alert handler.
        
        Args:
            alert_type: Type of alert to handle
            handler_function: Function to handle the alert
        """
        self.alert_handlers[alert_type] = handler_function
        logger.info(f"Registered alert handler for type: {alert_type}")
    
    def create_alert(self, alert_type: str, component: str, message: str,
                    severity: str = AlertSeverity.WARNING,
                    details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create a new alert.
        
        Args:
            alert_type: Type of alert
            component: Component that generated the alert
            message: Alert message
            severity: Alert severity (default: WARNING)
            details: Additional alert details (optional)
            
        Returns:
            Created alert
        """
        # Create alert
        alert = {
            "id": str(uuid.uuid4()),
            "type": alert_type,
            "component": component,
            "message": message,
            "severity": severity,
            "details": details or {},
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat(),
            "status": "active"
        }
        
        # Save alert
        self._save_alert(alert)
        
        # Add to active alerts
        self.active_alerts.append(alert)
        
        # Handle alert
        self._handle_alert(alert)
        
        return alert
    
    def update_alert(self, alert_id: str, status: str,
                    message: Optional[str] = None,
                    details: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """
        Update an existing alert.
        
        Args:
            alert_id: ID of the alert to update
            status: New alert status
            message: New alert message (optional)
            details: New alert details (optional)
            
        Returns:
            Updated alert or None if not found
        """
        # Find alert
        alert = None
        
        for a in self.active_alerts:
            if a["id"] == alert_id:
                alert = a
                break
        
        if not alert:
            # Try to load from file
            alert_file = os.path.join(self.data_dir, f"alert_{alert_id}.json")
            
            if os.path.exists(alert_file):
                try:
                    with open(alert_file, "r") as f:
                        alert = json.load(f)
                except Exception as e:
                    logger.error(f"Error loading alert from {alert_file}: {str(e)}")
                    return None
            else:
                logger.warning(f"Alert {alert_id} not found")
                return None
        
        # Update alert
        alert["status"] = status
        alert["updated_at"] = datetime.datetime.now().isoformat()
        
        if message:
            alert["message"] = message
        
        if details:
            alert["details"].update(details)
        
        # Save alert
        self._save_alert(alert)
        
        # Update active alerts
        if status == "resolved":
            self.active_alerts = [a for a in self.active_alerts if a["id"] != alert_id]
        else:
            for i, a in enumerate(self.active_alerts):
                if a["id"] == alert_id:
                    self.active_alerts[i] = alert
                    break
        
        return alert
    
    def get_active_alerts(self, component: Optional[str] = None,
                         severity: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get active alerts.
        
        Args:
            component: Filter by component (optional)
            severity: Filter by severity (optional)
            
        Returns:
            List of active alerts
        """
        # Update active alerts
        self._update_active_alerts()
        
        # Filter alerts
        filtered_alerts = self.active_alerts
        
        if component:
            filtered_alerts = [a for a in filtered_alerts if a["component"] == component]
        
        if severity:
            filtered_alerts = [a for a in filtered_alerts if a["severity"] == severity]
        
        return filtered_alerts
    
    def get_alert_history(self, component: Optional[str] = None,
                         severity: Optional[str] = None,
                         start_time: Optional[str] = None,
                         end_time: Optional[str] = None,
                         limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get alert history.
        
        Args:
            component: Filter by component (optional)
            severity: Filter by severity (optional)
            start_time: Filter by start time (ISO format, optional)
            end_time: Filter by end time (ISO format, optional)
            limit: Maximum number of alerts to return
            
        Returns:
            List of alerts
        """
        # Get all alert files
        alert_files = sorted(Path(self.data_dir).glob("alert_*.json"))
        
        # Convert times to datetime objects
        start_datetime = None
        end_datetime = None
        
        if start_time:
            start_datetime = datetime.datetime.fromisoformat(start_time)
        
        if end_time:
            end_datetime = datetime.datetime.fromisoformat(end_time)
        
        # Load and filter alerts
        alerts = []
        
        for alert_file in reversed(alert_files):
            try:
                with open(alert_file, "r") as f:
                    alert = json.load(f)
                
                # Filter by component
                if component and alert["component"] != component:
                    continue
                
                # Filter by severity
                if severity and alert["severity"] != severity:
                    continue
                
                # Filter by time
                alert_datetime = datetime.datetime.fromisoformat(alert["created_at"])
                
                if start_datetime and alert_datetime < start_datetime:
                    continue
                
                if end_datetime and alert_datetime > end_datetime:
                    continue
                
                alerts.append(alert)
                
                # Check limit
                if len(alerts) >= limit:
                    break
            except Exception as e:
                logger.error(f"Error loading alert from {alert_file}: {str(e)}")
        
        return alerts
    
    def get_component_alerts(self, component: str) -> List[Dict[str, Any]]:
        """
        Get alerts for a specific component.
        
        Args:
            component: Component name
            
        Returns:
            List of alerts for the component
        """
        return self.get_active_alerts(component=component)
    
    def _save_alert(self, alert: Dict[str, Any]) -> None:
        """
        Save an alert to a file.
        
        Args:
            alert: Alert to save
        """
        alert_file = os.path.join(self.data_dir, f"alert_{alert['id']}.json")
        
        try:
            with open(alert_file, "w") as f:
                json.dump(alert, f, indent=2)
            
            logger.debug(f"Alert saved to {alert_file}")
        except Exception as e:
            logger.error(f"Error saving alert: {str(e)}")
    
    def _handle_alert(self, alert: Dict[str, Any]) -> None:
        """
        Handle an alert.
        
        Args:
            alert: Alert to handle
        """
        # Log alert
        log_message = f"Alert: {alert['message']} (type: {alert['type']}, component: {alert['component']}, severity: {alert['severity']})"
        
        if alert["severity"] == AlertSeverity.CRITICAL:
            logger.critical(log_message)
        elif alert["severity"] == AlertSeverity.ERROR:
            logger.error(log_message)
        elif alert["severity"] == AlertSeverity.WARNING:
            logger.warning(log_message)
        else:
            logger.info(log_message)
        
        # Call handler
        if alert["type"] in self.alert_handlers:
            try:
                handler = self.alert_handlers[alert["type"]]
                handler(alert)
            except Exception as e:
                logger.error(f"Error handling alert: {str(e)}")
    
    def _update_active_alerts(self) -> None:
        """Update the list of active alerts."""
        current_time = time.time()
        
        # Check if we need to update
        if current_time - self.last_update_time < self.update_interval:
            return
        
        # Get all alert files
        alert_files = sorted(Path(self.data_dir).glob("alert_*.json"))
        
        # Load active alerts
        active_alerts = []
        
        for alert_file in alert_files:
            try:
                with open(alert_file, "r") as f:
                    alert = json.load(f)
                
                if alert["status"] == "active":
                    active_alerts.append(alert)
            except Exception as e:
                logger.error(f"Error loading alert from {alert_file}: {str(e)}")
        
        # Update active alerts
        self.active_alerts = active_alerts
        self.last_update_time = current_time
