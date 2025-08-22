"""Advanced alerting and notification system for performance monitoring."""

import asyncio
import json
import logging
import smtplib
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from enum import Enum
from typing import Any

import aiohttp
from jinja2 import Template

logger = logging.getLogger(__name__)


class AlertLevel(Enum):
    """Alert severity levels."""

    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class AlertChannel(Enum):
    """Alert notification channels."""

    EMAIL = "email"
    SLACK = "slack"
    WEBHOOK = "webhook"
    LOG = "log"
    SMS = "sms"


@dataclass
class Alert:
    """Alert representation."""

    level: AlertLevel
    message: str
    metric_name: str
    metric_value: float
    threshold: float
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    alert_id: str = field(
        default_factory=lambda: f"alert_{int(datetime.now().timestamp())}"
    )
    source: str = "vana_monitor"
    tags: dict[str, str] = field(default_factory=dict)
    context: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert alert to dictionary."""
        return {
            "alert_id": self.alert_id,
            "level": self.level.value,
            "message": self.message,
            "metric_name": self.metric_name,
            "metric_value": self.metric_value,
            "threshold": self.threshold,
            "timestamp": self.timestamp.isoformat(),
            "source": self.source,
            "tags": self.tags,
            "context": self.context,
        }


@dataclass
class AlertRule:
    """Alert rule configuration."""

    name: str
    metric_name: str
    threshold: float
    operator: str  # >, <, >=, <=, ==, !=
    level: AlertLevel
    channels: list[AlertChannel]
    cooldown_minutes: int = 15
    consecutive_violations: int = 1
    enabled: bool = True
    tags: dict[str, str] = field(default_factory=dict)

    def evaluate(self, metric_value: float) -> bool:
        """Evaluate if the rule is violated."""
        if not self.enabled:
            return False

        if self.operator == ">":
            return metric_value > self.threshold
        elif self.operator == "<":
            return metric_value < self.threshold
        elif self.operator == ">=":
            return metric_value >= self.threshold
        elif self.operator == "<=":
            return metric_value <= self.threshold
        elif self.operator == "==":
            return metric_value == self.threshold
        elif self.operator == "!=":
            return metric_value != self.threshold
        else:
            logger.error(f"Unknown operator: {self.operator}")
            return False


@dataclass
class NotificationConfig:
    """Notification channel configuration."""

    channel: AlertChannel
    config: dict[str, Any]
    enabled: bool = True
    rate_limit: int | None = None  # Max notifications per hour


class AlertManager:
    """Advanced alert management and notification system."""

    def __init__(self, config_file: str | None = None):
        self.rules: dict[str, AlertRule] = {}
        self.notification_configs: dict[AlertChannel, NotificationConfig] = {}
        self.alert_history: list[Alert] = []
        self.suppressed_alerts: set[str] = set()
        self.rule_violations: dict[str, list[datetime]] = {}

        # Rate limiting
        self.notification_counts: dict[AlertChannel, list[datetime]] = {}

        # Template system
        self.templates = self._load_templates()

        # Background tasks
        self._cleanup_task: asyncio.Task | None = None
        self._running = False

        # Load configuration if provided
        if config_file:
            self.load_config(config_file)

    async def start(self) -> None:
        """Start the alert manager."""
        if self._running:
            return

        self._running = True
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("Alert manager started")

    async def stop(self) -> None:
        """Stop the alert manager."""
        self._running = False
        if self._cleanup_task:
            self._cleanup_task.cancel()
        logger.info("Alert manager stopped")

    def add_rule(self, rule: AlertRule) -> None:
        """Add an alert rule."""
        self.rules[rule.name] = rule
        logger.info(f"Added alert rule: {rule.name}")

    def remove_rule(self, rule_name: str) -> bool:
        """Remove an alert rule."""
        if rule_name in self.rules:
            del self.rules[rule_name]
            logger.info(f"Removed alert rule: {rule_name}")
            return True
        return False

    def configure_notification(self, config: NotificationConfig) -> None:
        """Configure a notification channel."""
        self.notification_configs[config.channel] = config
        logger.info(f"Configured notification channel: {config.channel.value}")

    async def evaluate_metrics(self, metrics: dict[str, float]) -> list[Alert]:
        """Evaluate metrics against all rules and generate alerts."""
        alerts = []

        for rule_name, rule in self.rules.items():
            if rule.metric_name not in metrics:
                continue

            metric_value = metrics[rule.metric_name]

            if rule.evaluate(metric_value):
                # Check consecutive violations
                now = datetime.now(timezone.utc)
                if rule_name not in self.rule_violations:
                    self.rule_violations[rule_name] = []

                self.rule_violations[rule_name].append(now)

                # Clean old violations (older than 5 minutes)
                cutoff = now - timedelta(minutes=5)
                self.rule_violations[rule_name] = [
                    t for t in self.rule_violations[rule_name] if t > cutoff
                ]

                # Check if we have enough consecutive violations
                if len(self.rule_violations[rule_name]) >= rule.consecutive_violations:
                    # Check cooldown
                    if not self._is_in_cooldown(rule_name, now):
                        alert = Alert(
                            level=rule.level,
                            message=f"Rule '{rule.name}' violated: {rule.metric_name} = {metric_value} {rule.operator} {rule.threshold}",
                            metric_name=rule.metric_name,
                            metric_value=metric_value,
                            threshold=rule.threshold,
                            tags=rule.tags,
                            context={
                                "rule_name": rule.name,
                                "consecutive_violations": len(
                                    self.rule_violations[rule_name]
                                ),
                            },
                        )

                        alerts.append(alert)
                        await self.send_alert(alert)

            else:
                # Reset violations if metric is normal
                if rule_name in self.rule_violations:
                    del self.rule_violations[rule_name]

        return alerts

    async def send_alert(self, alert: Alert) -> None:
        """Send alert through configured channels."""
        # Add to history
        self.alert_history.append(alert)

        # Check if alert is suppressed
        if self._is_suppressed(alert):
            logger.info(f"Alert suppressed: {alert.alert_id}")
            return

        # Find applicable notification channels
        channels = self._get_alert_channels(alert)

        # Send through each channel
        for channel in channels:
            if channel in self.notification_configs:
                config = self.notification_configs[channel]
                if config.enabled and not self._is_rate_limited(channel):
                    try:
                        await self._send_to_channel(alert, channel, config)
                        self._record_notification(channel)
                    except Exception as e:
                        logger.error(f"Failed to send alert to {channel.value}: {e}")

    def suppress_alert(self, alert_id: str, duration_minutes: int = 60) -> None:
        """Suppress an alert for a specified duration."""
        self.suppressed_alerts.add(alert_id)

        # Auto-remove suppression after duration
        async def remove_suppression():
            await asyncio.sleep(duration_minutes * 60)
            self.suppressed_alerts.discard(alert_id)

        asyncio.create_task(remove_suppression())  # noqa: RUF006

    def acknowledge_alert(self, alert_id: str, user: str, notes: str = "") -> bool:
        """Acknowledge an alert."""
        for alert in self.alert_history:
            if alert.alert_id == alert_id:
                alert.context["acknowledged"] = True
                alert.context["acknowledged_by"] = user
                alert.context["acknowledged_at"] = datetime.now(
                    timezone.utc
                ).isoformat()
                alert.context["acknowledgment_notes"] = notes
                logger.info(f"Alert {alert_id} acknowledged by {user}")
                return True
        return False

    def get_active_alerts(self, level: AlertLevel | None = None) -> list[Alert]:
        """Get active (unacknowledged) alerts."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

        active_alerts = [
            alert
            for alert in self.alert_history
            if alert.timestamp > cutoff and not alert.context.get("acknowledged", False)
        ]

        if level:
            active_alerts = [alert for alert in active_alerts if alert.level == level]

        return sorted(active_alerts, key=lambda a: a.timestamp, reverse=True)

    def get_alert_statistics(self, hours: int = 24) -> dict[str, Any]:
        """Get alert statistics for the specified time period."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        recent_alerts = [
            alert for alert in self.alert_history if alert.timestamp > cutoff
        ]

        stats = {
            "total_alerts": len(recent_alerts),
            "by_level": {},
            "by_metric": {},
            "by_hour": {},
            "acknowledged_count": 0,
            "suppressed_count": len(self.suppressed_alerts),
        }

        # Count by level
        for level in AlertLevel:
            stats["by_level"][level.value] = len(
                [a for a in recent_alerts if a.level == level]
            )

        # Count by metric
        for alert in recent_alerts:
            metric = alert.metric_name
            stats["by_metric"][metric] = stats["by_metric"].get(metric, 0) + 1

            if alert.context.get("acknowledged", False):
                stats["acknowledged_count"] += 1

        # Count by hour
        for alert in recent_alerts:
            hour = alert.timestamp.strftime("%H:00")
            stats["by_hour"][hour] = stats["by_hour"].get(hour, 0) + 1

        return stats

    def load_config(self, config_file: str) -> None:
        """Load configuration from file."""
        try:
            with open(config_file) as f:
                config = json.load(f)

            # Load rules
            for rule_config in config.get("rules", []):
                rule = AlertRule(
                    name=rule_config["name"],
                    metric_name=rule_config["metric_name"],
                    threshold=rule_config["threshold"],
                    operator=rule_config["operator"],
                    level=AlertLevel(rule_config["level"]),
                    channels=[AlertChannel(ch) for ch in rule_config["channels"]],
                    cooldown_minutes=rule_config.get("cooldown_minutes", 15),
                    consecutive_violations=rule_config.get("consecutive_violations", 1),
                    enabled=rule_config.get("enabled", True),
                    tags=rule_config.get("tags", {}),
                )
                self.add_rule(rule)

            # Load notification configs
            for channel_config in config.get("notifications", []):
                notification_config = NotificationConfig(
                    channel=AlertChannel(channel_config["channel"]),
                    config=channel_config["config"],
                    enabled=channel_config.get("enabled", True),
                    rate_limit=channel_config.get("rate_limit"),
                )
                self.configure_notification(notification_config)

            logger.info(f"Loaded configuration from {config_file}")

        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")

    def _is_in_cooldown(self, rule_name: str, now: datetime) -> bool:
        """Check if a rule is in cooldown period."""
        if rule_name not in self.rules:
            return False

        rule = self.rules[rule_name]
        cooldown_period = timedelta(minutes=rule.cooldown_minutes)

        # Check recent alerts for this rule
        cutoff = now - cooldown_period
        recent_alerts = [
            alert
            for alert in self.alert_history
            if alert.timestamp > cutoff and alert.context.get("rule_name") == rule_name
        ]

        return len(recent_alerts) > 0

    def _is_suppressed(self, alert: Alert) -> bool:
        """Check if an alert is suppressed."""
        return alert.alert_id in self.suppressed_alerts

    def _is_rate_limited(self, channel: AlertChannel) -> bool:
        """Check if a notification channel is rate limited."""
        if channel not in self.notification_configs:
            return False

        config = self.notification_configs[channel]
        if not config.rate_limit:
            return False

        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=1)

        if channel not in self.notification_counts:
            self.notification_counts[channel] = []

        # Clean old notifications
        self.notification_counts[channel] = [
            t for t in self.notification_counts[channel] if t > cutoff
        ]

        return len(self.notification_counts[channel]) >= config.rate_limit

    def _record_notification(self, channel: AlertChannel) -> None:
        """Record a notification for rate limiting."""
        if channel not in self.notification_counts:
            self.notification_counts[channel] = []

        self.notification_counts[channel].append(datetime.now(timezone.utc))

    def _get_alert_channels(self, alert: Alert) -> list[AlertChannel]:
        """Get notification channels for an alert."""
        # Find the rule that generated this alert
        rule_name = alert.context.get("rule_name")
        if rule_name and rule_name in self.rules:
            return self.rules[rule_name].channels

        # Default channels based on alert level
        if alert.level == AlertLevel.EMERGENCY:
            return [AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.SMS]
        elif alert.level == AlertLevel.CRITICAL:
            return [AlertChannel.EMAIL, AlertChannel.SLACK]
        elif alert.level == AlertLevel.WARNING:
            return [AlertChannel.SLACK, AlertChannel.LOG]
        else:
            return [AlertChannel.LOG]

    async def _send_to_channel(
        self, alert: Alert, channel: AlertChannel, config: NotificationConfig
    ) -> None:
        """Send alert to specific notification channel."""
        if channel == AlertChannel.EMAIL:
            await self._send_email(alert, config)
        elif channel == AlertChannel.SLACK:
            await self._send_slack(alert, config)
        elif channel == AlertChannel.WEBHOOK:
            await self._send_webhook(alert, config)
        elif channel == AlertChannel.LOG:
            await self._send_log(alert, config)
        elif channel == AlertChannel.SMS:
            await self._send_sms(alert, config)

    async def _send_email(self, alert: Alert, config: NotificationConfig) -> None:
        """Send alert via email."""
        smtp_config = config.config

        msg = MIMEMultipart()
        msg["From"] = smtp_config["from"]
        msg["To"] = ", ".join(smtp_config["to"])
        msg["Subject"] = f"[{alert.level.value.upper()}] {alert.message}"

        # Render email template
        template = self.templates.get("email", Template("Alert: {{ alert.message }}"))
        body = template.render(alert=alert)

        msg.attach(MIMEText(body, "html"))

        # Send email
        with smtplib.SMTP(smtp_config["host"], smtp_config["port"]) as server:
            if smtp_config.get("tls"):
                server.starttls()
            if smtp_config.get("username"):
                server.login(smtp_config["username"], smtp_config["password"])
            server.send_message(msg)

    async def _send_slack(self, alert: Alert, config: NotificationConfig) -> None:
        """Send alert to Slack."""
        webhook_url = config.config["webhook_url"]

        # Choose color based on alert level
        color_map = {
            AlertLevel.INFO: "#36a64f",
            AlertLevel.WARNING: "#ff9500",
            AlertLevel.CRITICAL: "#ff0000",
            AlertLevel.EMERGENCY: "#8b0000",
        }

        payload = {
            "attachments": [
                {
                    "color": color_map.get(alert.level, "#808080"),
                    "title": f"{alert.level.value.upper()} Alert",
                    "text": alert.message,
                    "fields": [
                        {"title": "Metric", "value": alert.metric_name, "short": True},
                        {
                            "title": "Value",
                            "value": str(alert.metric_value),
                            "short": True,
                        },
                        {
                            "title": "Threshold",
                            "value": str(alert.threshold),
                            "short": True,
                        },
                        {
                            "title": "Time",
                            "value": alert.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
                            "short": True,
                        },
                    ],
                    "footer": "Vana Monitoring",
                    "ts": int(alert.timestamp.timestamp()),
                }
            ]
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(webhook_url, json=payload) as response:
                if response.status != 200:
                    raise Exception(f"Slack webhook returned {response.status}")

    async def _send_webhook(self, alert: Alert, config: NotificationConfig) -> None:
        """Send alert to webhook."""
        webhook_url = config.config["url"]
        headers = config.config.get("headers", {})

        payload = alert.to_dict()

        async with aiohttp.ClientSession() as session:
            async with session.post(
                webhook_url, json=payload, headers=headers
            ) as response:
                if response.status not in (200, 201, 202):
                    raise Exception(f"Webhook returned {response.status}")

    async def _send_log(self, alert: Alert, config: NotificationConfig) -> None:
        """Send alert to log."""
        level_map = {
            AlertLevel.INFO: logging.INFO,
            AlertLevel.WARNING: logging.WARNING,
            AlertLevel.CRITICAL: logging.ERROR,
            AlertLevel.EMERGENCY: logging.CRITICAL,
        }

        log_level = level_map.get(alert.level, logging.INFO)
        logger.log(log_level, f"ALERT: {alert.message} (ID: {alert.alert_id})")

    async def _send_sms(self, alert: Alert, config: NotificationConfig) -> None:
        """Send alert via SMS (placeholder implementation)."""
        # This would integrate with SMS providers like Twilio, AWS SNS, etc.
        logger.info(f"SMS alert would be sent: {alert.message}")

    def _load_templates(self) -> dict[str, Template]:
        """Load notification templates."""
        email_template = Template("""
        <html>
        <body>
            <h2 style="color: {% if alert.level.value == 'critical' %}red{% elif alert.level.value == 'warning' %}orange{% else %}blue{% endif %};">
                {{ alert.level.value.upper() }} Alert
            </h2>
            <p><strong>Message:</strong> {{ alert.message }}</p>
            <p><strong>Metric:</strong> {{ alert.metric_name }}</p>
            <p><strong>Current Value:</strong> {{ alert.metric_value }}</p>
            <p><strong>Threshold:</strong> {{ alert.threshold }}</p>
            <p><strong>Time:</strong> {{ alert.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC') }}</p>

            {% if alert.context %}
            <h3>Additional Context:</h3>
            <ul>
            {% for key, value in alert.context.items() %}
                <li><strong>{{ key }}:</strong> {{ value }}</li>
            {% endfor %}
            </ul>
            {% endif %}

            <p><em>Alert ID: {{ alert.alert_id }}</em></p>
        </body>
        </html>
        """)

        return {"email": email_template}

    async def _cleanup_loop(self) -> None:
        """Background cleanup of old alerts and data."""
        while self._running:
            try:
                # Clean old alerts (older than 7 days)
                cutoff = datetime.now(timezone.utc) - timedelta(days=7)
                self.alert_history = [
                    alert for alert in self.alert_history if alert.timestamp > cutoff
                ]

                # Clean old notification counts
                notification_cutoff = datetime.now(timezone.utc) - timedelta(hours=2)
                for channel in self.notification_counts:
                    self.notification_counts[channel] = [
                        t
                        for t in self.notification_counts[channel]
                        if t > notification_cutoff
                    ]

                await asyncio.sleep(3600)  # Run every hour

            except Exception as e:
                logger.error(f"Error in alert cleanup: {e}")
                await asyncio.sleep(3600)


# Global alert manager instance
_alert_manager: AlertManager | None = None


def get_alert_manager() -> AlertManager:
    """Get the global alert manager instance."""
    global _alert_manager
    if _alert_manager is None:
        _alert_manager = AlertManager()
    return _alert_manager
