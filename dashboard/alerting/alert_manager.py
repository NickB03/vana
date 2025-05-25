"""
Alert Manager for VANA Dashboard

This module provides a backend alerting system for the VANA project.
It supports alert creation, storage, retrieval, and notification stubs.
"""

import os
import json
import threading
import datetime
from typing import List, Dict, Optional, Any

ALERTS_FILE = os.environ.get("VANA_ALERTS_FILE", "dashboard/alerting/alerts.json")
ALERTS_LOCK = threading.Lock()

class AlertStatus:
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    CLEARED = "cleared"

class AlertSeverity:
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

class AlertManager:
    def __init__(self, alerts_file: str = ALERTS_FILE):
        self.alerts_file = alerts_file
        self._ensure_alerts_file()

    def _ensure_alerts_file(self):
        if not os.path.exists(self.alerts_file):
            with open(self.alerts_file, "w") as f:
                json.dump([], f)

    def _load_alerts(self) -> List[Dict[str, Any]]:
        with ALERTS_LOCK:
            with open(self.alerts_file, "r") as f:
                return json.load(f)

    def _save_alerts(self, alerts: List[Dict[str, Any]]):
        with ALERTS_LOCK:
            with open(self.alerts_file, "w") as f:
                json.dump(alerts, f, indent=2)

    def create_alert(self, message: str, severity: str = AlertSeverity.INFO, source: str = "system", details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        alert = {
            "id": f"alert_{int(datetime.datetime.now().timestamp() * 1000)}",
            "timestamp": datetime.datetime.now().isoformat(),
            "message": message,
            "severity": severity,
            "status": AlertStatus.ACTIVE,
            "source": source,
            "details": details or {}
        }
        alerts = self._load_alerts()
        alerts.append(alert)
        self._save_alerts(alerts)
        # Notification stub (to be implemented)
        self._notify(alert)
        return alert

    def _notify(self, alert: Dict[str, Any]):
        """
        Send notification for critical alerts via email.
        Configured via environment variables:
        - VANA_SMTP_SERVER
        - VANA_SMTP_PORT
        - VANA_SMTP_USERNAME
        - VANA_SMTP_PASSWORD
        - VANA_ALERT_EMAIL_RECIPIENT
        """
        if alert.get("severity") != AlertSeverity.CRITICAL:
            return  # Only notify for critical alerts by default

    def get_alert_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Return the most recent alerts (active, acknowledged, cleared).
        """
        alerts = self._load_alerts()
        return sorted(alerts, key=lambda a: a["timestamp"], reverse=True)[:limit]

    def log_external_alert(self, message: str, severity: str, source: str, details: Optional[Dict[str, Any]] = None):
        """
        Log an alert from an external source (e.g., security, audit, test).
        """
        return self.create_alert(message, severity, source, details)
        smtp_server = os.environ.get("VANA_SMTP_SERVER")
        smtp_port = int(os.environ.get("VANA_SMTP_PORT", "587"))
        smtp_user = os.environ.get("VANA_SMTP_USERNAME")
        smtp_pass = os.environ.get("VANA_SMTP_PASSWORD")
        recipient = os.environ.get("VANA_ALERT_EMAIL_RECIPIENT")

        if not all([smtp_server, smtp_user, smtp_pass, recipient]):
            return  # Notification not configured

        import smtplib
        from email.mime.text import MIMEText

        subject = f"[VANA ALERT] {alert.get('message', '')}"
        body = (
            f"Severity: {alert.get('severity')}\n"
            f"Source: {alert.get('source')}\n"
            f"Time: {alert.get('timestamp')}\n"
            f"Message: {alert.get('message')}\n"
            f"Details: {json.dumps(alert.get('details', {}), indent=2)}\n"
        )
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = smtp_user
        msg["To"] = recipient

        try:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [recipient], msg.as_string())
        except Exception as e:
            # Log but do not raise
            print(f"Failed to send alert email: {e}")

    def get_active_alerts(self) -> List[Dict[str, Any]]:
        alerts = self._load_alerts()
        return [a for a in alerts if a["status"] == AlertStatus.ACTIVE]

    def acknowledge_alert(self, alert_id: str) -> bool:
        alerts = self._load_alerts()
        updated = False
        for alert in alerts:
            if alert["id"] == alert_id and alert["status"] == AlertStatus.ACTIVE:
                alert["status"] = AlertStatus.ACKNOWLEDGED
                updated = True
        if updated:
            self._save_alerts(alerts)
        return updated

    def clear_alert(self, alert_id: str) -> bool:
        alerts = self._load_alerts()
        updated = False
        for alert in alerts:
            if alert["id"] == alert_id and alert["status"] != AlertStatus.CLEARED:
                alert["status"] = AlertStatus.CLEARED
                updated = True
        if updated:
            self._save_alerts(alerts)
        return updated

    def _notify(self, alert: Dict[str, Any]):
        # Stub for notification (email, SMS, etc.)
        # To be implemented: send email/SMS based on severity and config
        pass

# Example usage:
if __name__ == "__main__":
    am = AlertManager()
    am.create_alert("Test alert: system health degraded", severity=AlertSeverity.WARNING, source="health_check")
    print("Active alerts:", am.get_active_alerts())