#!/usr/bin/env python3
"""
Hook Alerting and Monitoring System
===================================

Comprehensive alerting and real-time monitoring for the hook safety system.
Provides intelligent notifications, performance tracking, and automated
response coordination.
"""

import asyncio
import json
import logging
import smtplib
import threading
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any

try:
    from email.mime.multipart import MimeMultipart
    from email.mime.text import MimeText
    EMAIL_AVAILABLE = True
except ImportError:
    EMAIL_AVAILABLE = False
import sqlite3
import statistics
from collections import defaultdict, deque

import requests


class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class AlertStatus(Enum):
    """Alert status"""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


class NotificationChannel(Enum):
    """Available notification channels"""
    LOG = "log"
    FILE = "file"
    EMAIL = "email"
    WEBHOOK = "webhook"
    SLACK = "slack"
    DISCORD = "discord"
    CONSOLE = "console"


@dataclass
class Alert:
    """Alert data structure"""
    id: str
    name: str
    severity: AlertSeverity
    status: AlertStatus
    message: str
    details: dict[str, Any]
    triggered_at: datetime
    last_updated: datetime
    count: int = 1
    acknowledged_by: str | None = None
    acknowledged_at: datetime | None = None
    resolved_at: datetime | None = None
    suppressed_until: datetime | None = None
    tags: list[str] = None

    def __post_init__(self):
        if self.tags is None:
            self.tags = []


@dataclass
class NotificationTarget:
    """Notification target configuration"""
    channel: NotificationChannel
    config: dict[str, Any]
    enabled: bool = True
    severity_filter: list[AlertSeverity] = None

    def __post_init__(self):
        if self.severity_filter is None:
            self.severity_filter = list(AlertSeverity)


@dataclass
class MetricThreshold:
    """Metric threshold configuration"""
    name: str
    metric_name: str
    operator: str  # >, <, >=, <=, ==, !=
    threshold_value: float
    duration_minutes: int
    severity: AlertSeverity
    enabled: bool = True
    cooldown_minutes: int = 30


class AlertManager:
    """Comprehensive alert management system"""

    def __init__(self, db_path: str = None):
        self.db_path = db_path or str(Path.cwd() / ".claude_workspace" / "alerts.db")
        self.alerts_file = Path.cwd() / ".claude_workspace" / "active_alerts.json"

        # Alert storage
        self.active_alerts: dict[str, Alert] = {}
        self.alert_history = deque(maxlen=1000)
        self.notification_targets: list[NotificationTarget] = []
        self.metric_thresholds: list[MetricThreshold] = []

        # Rate limiting
        self.rate_limiter = defaultdict(deque)
        self.rate_limit_window = 300  # 5 minutes
        self.max_alerts_per_window = 20

        # Performance tracking
        self.metrics_buffer = deque(maxlen=1000)
        self.performance_stats = {}

        # Background processing
        self.processing_thread = None
        self.processing_active = False

        # Logger
        self.logger = logging.getLogger("hook_alerting")

        # Initialize
        self._setup_database()
        self._load_configuration()
        self._start_background_processing()

    def _setup_database(self):
        """Setup SQLite database for alert persistence"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Create tables
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    status TEXT NOT NULL,
                    message TEXT NOT NULL,
                    details TEXT,
                    triggered_at TEXT NOT NULL,
                    last_updated TEXT NOT NULL,
                    count INTEGER DEFAULT 1,
                    acknowledged_by TEXT,
                    acknowledged_at TEXT,
                    resolved_at TEXT,
                    suppressed_until TEXT,
                    tags TEXT
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    metric_name TEXT NOT NULL,
                    metric_value REAL NOT NULL,
                    tags TEXT
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    alert_id TEXT NOT NULL,
                    channel TEXT NOT NULL,
                    status TEXT NOT NULL,
                    sent_at TEXT NOT NULL,
                    error_message TEXT,
                    FOREIGN KEY (alert_id) REFERENCES alerts (id)
                )
            """)

            conn.commit()
            conn.close()

        except Exception as e:
            self.logger.error(f"Database setup failed: {e}")

    def _load_configuration(self):
        """Load alerting configuration"""
        # Default notification targets
        self.notification_targets = [
            NotificationTarget(
                channel=NotificationChannel.LOG,
                config={},
                severity_filter=[AlertSeverity.WARNING, AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY]
            ),
            NotificationTarget(
                channel=NotificationChannel.FILE,
                config={"file_path": str(Path.cwd() / ".claude_workspace" / "alerts.log")},
                severity_filter=list(AlertSeverity)
            ),
            NotificationTarget(
                channel=NotificationChannel.CONSOLE,
                config={},
                severity_filter=[AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY]
            )
        ]

        # Default metric thresholds
        self.metric_thresholds = [
            MetricThreshold(
                name="high_error_rate",
                metric_name="error_rate",
                operator=">=",
                threshold_value=0.2,
                duration_minutes=5,
                severity=AlertSeverity.WARNING
            ),
            MetricThreshold(
                name="critical_error_rate",
                metric_name="error_rate",
                operator=">=",
                threshold_value=0.5,
                duration_minutes=2,
                severity=AlertSeverity.CRITICAL
            ),
            MetricThreshold(
                name="slow_execution",
                metric_name="avg_execution_time_ms",
                operator=">=",
                threshold_value=5000.0,
                duration_minutes=5,
                severity=AlertSeverity.WARNING
            ),
            MetricThreshold(
                name="high_memory_usage",
                metric_name="memory_usage_mb",
                operator=">=",
                threshold_value=500.0,
                duration_minutes=10,
                severity=AlertSeverity.WARNING
            ),
            MetricThreshold(
                name="system_emergency",
                metric_name="consecutive_failures",
                operator=">=",
                threshold_value=10.0,
                duration_minutes=1,
                severity=AlertSeverity.EMERGENCY
            )
        ]

    def add_notification_target(self, target: NotificationTarget):
        """Add a notification target"""
        self.notification_targets.append(target)
        self.logger.info(f"Added notification target: {target.channel.value}")

    def configure_email_notifications(self, smtp_host: str, smtp_port: int,
                                    username: str, password: str,
                                    from_email: str, to_emails: list[str],
                                    severity_filter: list[AlertSeverity] = None):
        """Configure email notifications"""
        email_target = NotificationTarget(
            channel=NotificationChannel.EMAIL,
            config={
                "smtp_host": smtp_host,
                "smtp_port": smtp_port,
                "username": username,
                "password": password,
                "from_email": from_email,
                "to_emails": to_emails,
                "use_tls": True
            },
            severity_filter=severity_filter or [AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY]
        )
        self.add_notification_target(email_target)

    def configure_webhook_notifications(self, webhook_url: str,
                                      headers: dict[str, str] = None,
                                      severity_filter: list[AlertSeverity] = None):
        """Configure webhook notifications"""
        webhook_target = NotificationTarget(
            channel=NotificationChannel.WEBHOOK,
            config={
                "url": webhook_url,
                "headers": headers or {},
                "timeout": 30
            },
            severity_filter=severity_filter or [AlertSeverity.WARNING, AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY]
        )
        self.add_notification_target(webhook_target)

    def configure_slack_notifications(self, webhook_url: str,
                                    channel: str = "#alerts",
                                    username: str = "Hook Safety Bot",
                                    severity_filter: list[AlertSeverity] = None):
        """Configure Slack notifications"""
        slack_target = NotificationTarget(
            channel=NotificationChannel.SLACK,
            config={
                "webhook_url": webhook_url,
                "channel": channel,
                "username": username,
                "icon_emoji": ":warning:"
            },
            severity_filter=severity_filter or [AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY]
        )
        self.add_notification_target(slack_target)

    async def trigger_alert(self, name: str, severity: AlertSeverity,
                          message: str, details: dict[str, Any] = None,
                          tags: list[str] = None) -> str:
        """Trigger a new alert"""

        # Generate alert ID
        alert_id = f"{name}_{severity.value}_{int(time.time())}"

        # Check rate limiting
        if self._is_rate_limited(name):
            self.logger.warning(f"Alert rate limited: {name}")
            return None

        # Check if similar alert already exists
        existing_alert = self._find_similar_alert(name, severity)
        if existing_alert:
            # Update existing alert
            existing_alert.count += 1
            existing_alert.last_updated = datetime.now()
            existing_alert.details.update(details or {})
            alert_id = existing_alert.id
        else:
            # Create new alert
            alert = Alert(
                id=alert_id,
                name=name,
                severity=severity,
                status=AlertStatus.ACTIVE,
                message=message,
                details=details or {},
                triggered_at=datetime.now(),
                last_updated=datetime.now(),
                tags=tags or []
            )

            self.active_alerts[alert_id] = alert
            self.alert_history.append(alert)

        # Store in database
        await self._store_alert_in_db(self.active_alerts[alert_id])

        # Send notifications
        await self._send_notifications(self.active_alerts[alert_id])

        # Log alert
        self.logger.warning(f"Alert triggered: {name} ({severity.value}) - {message}")

        return alert_id

    def _find_similar_alert(self, name: str, severity: AlertSeverity) -> Alert | None:
        """Find similar active alert"""
        for alert in self.active_alerts.values():
            if (alert.name == name and
                alert.severity == severity and
                alert.status == AlertStatus.ACTIVE):
                return alert
        return None

    def _is_rate_limited(self, alert_name: str) -> bool:
        """Check if alert is rate limited"""
        now = time.time()
        window_start = now - self.rate_limit_window

        # Clean old entries
        while (self.rate_limiter[alert_name] and
               self.rate_limiter[alert_name][0] < window_start):
            self.rate_limiter[alert_name].popleft()

        # Check rate limit
        if len(self.rate_limiter[alert_name]) >= self.max_alerts_per_window:
            return True

        # Add current alert
        self.rate_limiter[alert_name].append(now)
        return False

    async def _store_alert_in_db(self, alert: Alert):
        """Store alert in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("""
                INSERT OR REPLACE INTO alerts 
                (id, name, severity, status, message, details, triggered_at, 
                 last_updated, count, acknowledged_by, acknowledged_at, 
                 resolved_at, suppressed_until, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                alert.id, alert.name, alert.severity.value, alert.status.value,
                alert.message, json.dumps(alert.details),
                alert.triggered_at.isoformat(), alert.last_updated.isoformat(),
                alert.count, alert.acknowledged_by,
                alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
                alert.resolved_at.isoformat() if alert.resolved_at else None,
                alert.suppressed_until.isoformat() if alert.suppressed_until else None,
                json.dumps(alert.tags)
            ))

            conn.commit()
            conn.close()

        except Exception as e:
            self.logger.error(f"Failed to store alert in database: {e}")

    async def _send_notifications(self, alert: Alert):
        """Send notifications for alert"""
        for target in self.notification_targets:
            if (target.enabled and
                alert.severity in target.severity_filter):

                try:
                    await self._send_notification(alert, target)
                except Exception as e:
                    self.logger.error(f"Notification failed for {target.channel.value}: {e}")

    async def _send_notification(self, alert: Alert, target: NotificationTarget):
        """Send notification to specific target"""

        if target.channel == NotificationChannel.LOG:
            self.logger.warning(f"ALERT: {alert.message}")

        elif target.channel == NotificationChannel.FILE:
            file_path = target.config.get("file_path")
            if file_path:
                with open(file_path, 'a') as f:
                    f.write(f"[{alert.triggered_at.isoformat()}] {alert.severity.value.upper()}: {alert.message}\n")

        elif target.channel == NotificationChannel.CONSOLE:
            severity_colors = {
                AlertSeverity.INFO: "\033[36m",      # Cyan
                AlertSeverity.WARNING: "\033[33m",   # Yellow
                AlertSeverity.CRITICAL: "\033[31m",  # Red
                AlertSeverity.EMERGENCY: "\033[35m"  # Magenta
            }
            color = severity_colors.get(alert.severity, "")
            reset = "\033[0m"
            print(f"{color}🚨 ALERT [{alert.severity.value.upper()}]: {alert.message}{reset}")

        elif target.channel == NotificationChannel.EMAIL:
            await self._send_email_notification(alert, target)

        elif target.channel == NotificationChannel.WEBHOOK:
            await self._send_webhook_notification(alert, target)

        elif target.channel == NotificationChannel.SLACK:
            await self._send_slack_notification(alert, target)

        # Record notification
        await self._record_notification(alert.id, target.channel, "sent", None)

    async def _send_email_notification(self, alert: Alert, target: NotificationTarget):
        """Send email notification"""
        if not EMAIL_AVAILABLE:
            self.logger.error("Email functionality not available")
            return

        config = target.config

        # Create message
        msg = MimeMultipart()
        msg['From'] = config['from_email']
        msg['To'] = ', '.join(config['to_emails'])
        msg['Subject'] = f"Hook Safety Alert: {alert.name} ({alert.severity.value.upper()})"

        # Email body
        body = f"""
Hook Safety System Alert

Alert: {alert.name}
Severity: {alert.severity.value.upper()}
Status: {alert.status.value}
Time: {alert.triggered_at.isoformat()}
Count: {alert.count}

Message: {alert.message}

Details:
{json.dumps(alert.details, indent=2)}

Tags: {', '.join(alert.tags)}

This is an automated message from the Hook Safety System.
        """

        msg.attach(MimeText(body, 'plain'))

        # Send email
        server = smtplib.SMTP(config['smtp_host'], config['smtp_port'])
        if config.get('use_tls', True):
            server.starttls()
        server.login(config['username'], config['password'])
        server.send_message(msg)
        server.quit()

    async def _send_webhook_notification(self, alert: Alert, target: NotificationTarget):
        """Send webhook notification"""
        config = target.config

        payload = {
            "alert_id": alert.id,
            "name": alert.name,
            "severity": alert.severity.value,
            "status": alert.status.value,
            "message": alert.message,
            "details": alert.details,
            "triggered_at": alert.triggered_at.isoformat(),
            "count": alert.count,
            "tags": alert.tags
        }

        headers = config.get('headers', {})
        headers.setdefault('Content-Type', 'application/json')

        response = requests.post(
            config['url'],
            json=payload,
            headers=headers,
            timeout=config.get('timeout', 30)
        )
        response.raise_for_status()

    async def _send_slack_notification(self, alert: Alert, target: NotificationTarget):
        """Send Slack notification"""
        config = target.config

        # Slack color mapping
        color_map = {
            AlertSeverity.INFO: "good",
            AlertSeverity.WARNING: "warning",
            AlertSeverity.CRITICAL: "danger",
            AlertSeverity.EMERGENCY: "#8B0000"  # Dark red
        }

        payload = {
            "channel": config.get('channel', '#alerts'),
            "username": config.get('username', 'Hook Safety Bot'),
            "icon_emoji": config.get('icon_emoji', ':warning:'),
            "attachments": [{
                "color": color_map.get(alert.severity, "warning"),
                "title": f"Hook Safety Alert: {alert.name}",
                "text": alert.message,
                "fields": [
                    {"title": "Severity", "value": alert.severity.value.upper(), "short": True},
                    {"title": "Status", "value": alert.status.value, "short": True},
                    {"title": "Count", "value": str(alert.count), "short": True},
                    {"title": "Time", "value": alert.triggered_at.strftime("%Y-%m-%d %H:%M:%S"), "short": True}
                ],
                "footer": "Hook Safety System",
                "ts": int(alert.triggered_at.timestamp())
            }]
        }

        response = requests.post(config['webhook_url'], json=payload, timeout=30)
        response.raise_for_status()

    async def _record_notification(self, alert_id: str, channel: NotificationChannel,
                                 status: str, error_message: str = None):
        """Record notification attempt"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO notifications (alert_id, channel, status, sent_at, error_message)
                VALUES (?, ?, ?, ?, ?)
            """, (alert_id, channel.value, status, datetime.now().isoformat(), error_message))

            conn.commit()
            conn.close()

        except Exception as e:
            self.logger.error(f"Failed to record notification: {e}")

    async def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> bool:
        """Acknowledge an alert"""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.status = AlertStatus.ACKNOWLEDGED
            alert.acknowledged_by = acknowledged_by
            alert.acknowledged_at = datetime.now()
            alert.last_updated = datetime.now()

            await self._store_alert_in_db(alert)
            self.logger.info(f"Alert acknowledged: {alert_id} by {acknowledged_by}")
            return True
        return False

    async def resolve_alert(self, alert_id: str) -> bool:
        """Resolve an alert"""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.status = AlertStatus.RESOLVED
            alert.resolved_at = datetime.now()
            alert.last_updated = datetime.now()

            await self._store_alert_in_db(alert)

            # Remove from active alerts
            del self.active_alerts[alert_id]

            self.logger.info(f"Alert resolved: {alert_id}")
            return True
        return False

    async def suppress_alert(self, alert_id: str, duration_minutes: int) -> bool:
        """Suppress an alert for a specified duration"""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.status = AlertStatus.SUPPRESSED
            alert.suppressed_until = datetime.now() + timedelta(minutes=duration_minutes)
            alert.last_updated = datetime.now()

            await self._store_alert_in_db(alert)
            self.logger.info(f"Alert suppressed: {alert_id} for {duration_minutes} minutes")
            return True
        return False

    async def record_metric(self, metric_name: str, value: float, tags: dict[str, str] = None):
        """Record a metric value"""
        metric_data = {
            "timestamp": datetime.now(),
            "metric_name": metric_name,
            "value": value,
            "tags": tags or {}
        }

        self.metrics_buffer.append(metric_data)

        # Store in database
        await self._store_metric_in_db(metric_data)

        # Check thresholds
        await self._check_metric_thresholds(metric_name, value)

    async def _store_metric_in_db(self, metric_data: dict[str, Any]):
        """Store metric in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO metrics (timestamp, metric_name, metric_value, tags)
                VALUES (?, ?, ?, ?)
            """, (
                metric_data["timestamp"].isoformat(),
                metric_data["metric_name"],
                metric_data["value"],
                json.dumps(metric_data["tags"])
            ))

            conn.commit()
            conn.close()

        except Exception as e:
            self.logger.error(f"Failed to store metric: {e}")

    async def _check_metric_thresholds(self, metric_name: str, current_value: float):
        """Check if metric thresholds are exceeded"""
        for threshold in self.metric_thresholds:
            if (threshold.enabled and
                threshold.metric_name == metric_name):

                # Get recent values for duration check
                cutoff_time = datetime.now() - timedelta(minutes=threshold.duration_minutes)
                recent_values = [
                    m["value"] for m in self.metrics_buffer
                    if (m["metric_name"] == metric_name and
                        m["timestamp"] > cutoff_time)
                ]

                if len(recent_values) == 0:
                    continue

                # Check threshold condition
                avg_value = statistics.mean(recent_values)
                threshold_exceeded = self._evaluate_threshold(
                    avg_value, threshold.operator, threshold.threshold_value
                )

                if threshold_exceeded:
                    await self.trigger_alert(
                        name=threshold.name,
                        severity=threshold.severity,
                        message=f"Metric threshold exceeded: {metric_name} {threshold.operator} {threshold.threshold_value} (current: {avg_value:.2f})",
                        details={
                            "metric_name": metric_name,
                            "current_value": current_value,
                            "average_value": avg_value,
                            "threshold_value": threshold.threshold_value,
                            "operator": threshold.operator,
                            "duration_minutes": threshold.duration_minutes,
                            "sample_count": len(recent_values)
                        },
                        tags=["metric_threshold", metric_name]
                    )

    def _evaluate_threshold(self, value: float, operator: str, threshold: float) -> bool:
        """Evaluate threshold condition"""
        if operator == ">":
            return value > threshold
        elif operator == "<":
            return value < threshold
        elif operator == ">=":
            return value >= threshold
        elif operator == "<=":
            return value <= threshold
        elif operator == "==":
            return value == threshold
        elif operator == "!=":
            return value != threshold
        else:
            return False

    def get_active_alerts(self) -> list[dict[str, Any]]:
        """Get all active alerts"""
        return [asdict(alert) for alert in self.active_alerts.values()]

    def get_alert_summary(self) -> dict[str, Any]:
        """Get alert summary statistics"""
        active_by_severity = defaultdict(int)
        total_alerts = len(self.alert_history)

        for alert in self.active_alerts.values():
            active_by_severity[alert.severity.value] += 1

        # Recent alert rate
        recent_cutoff = datetime.now() - timedelta(hours=1)
        recent_alerts = sum(1 for alert in self.alert_history if alert.triggered_at > recent_cutoff)

        return {
            "total_active_alerts": len(self.active_alerts),
            "active_by_severity": dict(active_by_severity),
            "total_historical_alerts": total_alerts,
            "recent_alert_rate_per_hour": recent_alerts,
            "notification_targets": len(self.notification_targets),
            "metric_thresholds": len(self.metric_thresholds)
        }

    def get_metric_statistics(self, metric_name: str, hours: int = 24) -> dict[str, Any]:
        """Get statistics for a specific metric"""
        cutoff_time = datetime.now() - timedelta(hours=hours)

        # Get values from buffer (recent) and database (historical)
        recent_values = [
            m["value"] for m in self.metrics_buffer
            if (m["metric_name"] == metric_name and m["timestamp"] > cutoff_time)
        ]

        if not recent_values:
            return {"error": "No data available"}

        return {
            "metric_name": metric_name,
            "sample_count": len(recent_values),
            "min_value": min(recent_values),
            "max_value": max(recent_values),
            "avg_value": statistics.mean(recent_values),
            "median_value": statistics.median(recent_values),
            "std_dev": statistics.stdev(recent_values) if len(recent_values) > 1 else 0,
            "time_range_hours": hours
        }

    def _start_background_processing(self):
        """Start background processing thread"""
        self.processing_active = True
        self.processing_thread = threading.Thread(target=self._background_processing_loop, daemon=True)
        self.processing_thread.start()
        self.logger.info("Background processing started")

    def _background_processing_loop(self):
        """Background processing loop"""
        while self.processing_active:
            try:
                # Clean up resolved alerts
                self._cleanup_old_alerts()

                # Check for suppressed alerts to reactivate
                self._check_suppressed_alerts()

                # Update performance statistics
                self._update_performance_stats()

                # Save active alerts to file
                self._save_active_alerts()

                time.sleep(60)  # Run every minute

            except Exception as e:
                self.logger.error(f"Background processing error: {e}")
                time.sleep(60)

    def _cleanup_old_alerts(self):
        """Remove old resolved alerts from history"""
        cutoff_time = datetime.now() - timedelta(days=7)

        # Keep only recent alerts in history
        self.alert_history = deque(
            (alert for alert in self.alert_history if alert.triggered_at > cutoff_time),
            maxlen=1000
        )

    def _check_suppressed_alerts(self):
        """Check for suppressed alerts that should be reactivated"""
        now = datetime.now()

        for alert in list(self.active_alerts.values()):
            if (alert.status == AlertStatus.SUPPRESSED and
                alert.suppressed_until and
                now > alert.suppressed_until):

                alert.status = AlertStatus.ACTIVE
                alert.suppressed_until = None
                alert.last_updated = now

                self.logger.info(f"Alert reactivated from suppression: {alert.id}")

    def _update_performance_stats(self):
        """Update performance statistics"""
        if len(self.metrics_buffer) > 0:
            recent_metrics = list(self.metrics_buffer)[-100:]  # Last 100 metrics

            # Group by metric name
            metrics_by_name = defaultdict(list)
            for metric in recent_metrics:
                metrics_by_name[metric["metric_name"]].append(metric["value"])

            # Calculate stats for each metric
            for metric_name, values in metrics_by_name.items():
                if len(values) > 0:
                    self.performance_stats[metric_name] = {
                        "count": len(values),
                        "avg": statistics.mean(values),
                        "min": min(values),
                        "max": max(values),
                        "last_updated": datetime.now().isoformat()
                    }

    def _save_active_alerts(self):
        """Save active alerts to file"""
        try:
            alerts_data = [asdict(alert) for alert in self.active_alerts.values()]

            with open(self.alerts_file, 'w') as f:
                json.dump(alerts_data, f, indent=2, default=str)

        except Exception as e:
            self.logger.error(f"Failed to save active alerts: {e}")

    def stop_processing(self):
        """Stop background processing"""
        self.processing_active = False
        if self.processing_thread:
            self.processing_thread.join(timeout=5)
        self.logger.info("Background processing stopped")


# Global alert manager instance
_alert_manager_instance = None


def get_alert_manager() -> AlertManager:
    """Get or create the global alert manager instance"""
    global _alert_manager_instance
    if _alert_manager_instance is None:
        _alert_manager_instance = AlertManager()
    return _alert_manager_instance


# CLI interface
if __name__ == "__main__":
    import asyncio
    import sys

    async def main():
        if len(sys.argv) < 2:
            print("Usage: python hook_alerting_system.py <command> [args...]")
            print("Commands:")
            print("  alerts                    - List active alerts")
            print("  summary                   - Show alert summary")
            print("  ack <alert_id> <user>     - Acknowledge alert")
            print("  resolve <alert_id>        - Resolve alert")
            print("  suppress <alert_id> <min> - Suppress alert")
            print("  metric <name> <value>     - Record metric")
            print("  stats <metric_name>       - Show metric stats")
            print("  test-alert                - Trigger test alert")
            return

        command = sys.argv[1]
        alert_manager = get_alert_manager()

        if command == "alerts":
            alerts = alert_manager.get_active_alerts()
            print(json.dumps(alerts, indent=2, default=str))

        elif command == "summary":
            summary = alert_manager.get_alert_summary()
            print(json.dumps(summary, indent=2))

        elif command == "ack" and len(sys.argv) >= 4:
            alert_id = sys.argv[2]
            user = sys.argv[3]
            success = await alert_manager.acknowledge_alert(alert_id, user)
            print(f"Alert {'acknowledged' if success else 'not found'}: {alert_id}")

        elif command == "resolve" and len(sys.argv) >= 3:
            alert_id = sys.argv[2]
            success = await alert_manager.resolve_alert(alert_id)
            print(f"Alert {'resolved' if success else 'not found'}: {alert_id}")

        elif command == "suppress" and len(sys.argv) >= 4:
            alert_id = sys.argv[2]
            minutes = int(sys.argv[3])
            success = await alert_manager.suppress_alert(alert_id, minutes)
            print(f"Alert {'suppressed' if success else 'not found'}: {alert_id}")

        elif command == "metric" and len(sys.argv) >= 4:
            metric_name = sys.argv[2]
            value = float(sys.argv[3])
            await alert_manager.record_metric(metric_name, value)
            print(f"Metric recorded: {metric_name} = {value}")

        elif command == "stats" and len(sys.argv) >= 3:
            metric_name = sys.argv[2]
            stats = alert_manager.get_metric_statistics(metric_name)
            print(json.dumps(stats, indent=2))

        elif command == "test-alert":
            alert_id = await alert_manager.trigger_alert(
                name="test_alert",
                severity=AlertSeverity.WARNING,
                message="This is a test alert from the CLI",
                details={"source": "cli", "test": True},
                tags=["test", "cli"]
            )
            print(f"Test alert triggered: {alert_id}")

        else:
            print(f"Unknown command: {command}")

    asyncio.run(main())
