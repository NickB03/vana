"""Performance monitoring dashboard and visualization system."""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from .alerting import AlertLevel, AlertManager, get_alert_manager
from .cache_optimizer import CacheOptimizer, get_cache_optimizer
from .metrics_collector import (
    MetricsCollector,
    get_metrics_collector,
)

logger = logging.getLogger(__name__)


@dataclass
class DashboardWidget:
    """Dashboard widget configuration."""

    widget_id: str
    title: str
    widget_type: str  # chart, gauge, table, alert_list, etc.
    data_source: str  # metrics, cache, alerts
    config: dict[str, Any] = field(default_factory=dict)
    position: dict[str, int] = field(
        default_factory=lambda: {"x": 0, "y": 0, "w": 4, "h": 3}
    )


@dataclass
class DashboardLayout:
    """Dashboard layout configuration."""

    dashboard_id: str
    name: str
    description: str
    widgets: list[DashboardWidget] = field(default_factory=list)
    refresh_interval: int = 5  # seconds
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class PerformanceDashboard:
    """Performance monitoring dashboard with real-time updates."""

    def __init__(
        self,
        metrics_collector: MetricsCollector | None = None,
        cache_optimizer: CacheOptimizer | None = None,
        alert_manager: AlertManager | None = None,
    ):
        self.metrics_collector = metrics_collector or get_metrics_collector()
        self.cache_optimizer = cache_optimizer or get_cache_optimizer()
        self.alert_manager = alert_manager or get_alert_manager()

        # Dashboard state
        self.layouts: dict[str, DashboardLayout] = {}
        self.active_connections: list[WebSocket] = []

        # Default layouts
        self._create_default_layouts()

        # Background tasks
        self._broadcast_task: asyncio.Task | None = None
        self._running = False

    def start(self) -> None:
        """Start the dashboard."""
        if self._running:
            return

        self._running = True
        self._broadcast_task = asyncio.create_task(self._broadcast_loop())
        logger.info("Performance dashboard started")

    def stop(self) -> None:
        """Stop the dashboard."""
        self._running = False
        if self._broadcast_task:
            self._broadcast_task.cancel()
        logger.info("Performance dashboard stopped")

    async def websocket_endpoint(self, websocket: WebSocket) -> None:
        """WebSocket endpoint for real-time updates."""
        await websocket.accept()
        self.active_connections.append(websocket)

        try:
            while True:
                # Keep connection alive and handle client messages
                data = await websocket.receive_text()
                message = json.loads(data)

                if message.get("type") == "subscribe":
                    dashboard_id = message.get("dashboard_id", "overview")
                    await self._send_dashboard_data(websocket, dashboard_id)
                elif message.get("type") == "refresh":
                    dashboard_id = message.get("dashboard_id", "overview")
                    await self._send_dashboard_data(websocket, dashboard_id)

        except WebSocketDisconnect:
            pass
        finally:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def get_dashboard_data(
        self, dashboard_id: str = "overview"
    ) -> dict[str, Any]:
        """Get dashboard data for specified layout."""
        if dashboard_id not in self.layouts:
            dashboard_id = "overview"

        layout = self.layouts[dashboard_id]
        data = {
            "dashboard": {
                "id": layout.dashboard_id,
                "name": layout.name,
                "description": layout.description,
                "refresh_interval": layout.refresh_interval,
            },
            "widgets": {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Collect data for each widget
        for widget in layout.widgets:
            widget_data = await self._get_widget_data(widget)
            data["widgets"][widget.widget_id] = {
                "title": widget.title,
                "type": widget.widget_type,
                "position": widget.position,
                "data": widget_data,
            }

        return data

    async def get_metrics_summary(self) -> dict[str, Any]:
        """Get metrics summary for API endpoint."""
        metrics = self.metrics_collector.get_current_metrics()
        cache_metrics = await self.cache_optimizer.get_metrics()
        active_alerts = self.alert_manager.get_active_alerts()

        return {
            "performance": {
                "requests_per_second": metrics.requests_per_second,
                "avg_response_time": metrics.avg_response_time,
                "p95_response_time": metrics.p95_response_time,
                "error_rate": metrics.error_rate,
                "concurrent_requests": metrics.concurrent_requests,
            },
            "system": {
                "cpu_usage": metrics.cpu_usage,
                "memory_usage": metrics.memory_usage,
                "disk_usage": metrics.disk_usage,
                "active_agents": metrics.active_agents,
            },
            "cache": {
                "hit_rate": cache_metrics.hit_rate,
                "entry_count": cache_metrics.entry_count,
                "memory_usage": cache_metrics.memory_usage,
            },
            "alerts": {
                "total_active": len(active_alerts),
                "critical": len(
                    [a for a in active_alerts if a.level == AlertLevel.CRITICAL]
                ),
                "warning": len(
                    [a for a in active_alerts if a.level == AlertLevel.WARNING]
                ),
            },
        }

    def create_custom_dashboard(self, layout: DashboardLayout) -> None:
        """Create a custom dashboard layout."""
        self.layouts[layout.dashboard_id] = layout
        logger.info(f"Created custom dashboard: {layout.name}")

    def get_available_dashboards(self) -> list[dict[str, str]]:
        """Get list of available dashboards."""
        return [
            {
                "id": layout.dashboard_id,
                "name": layout.name,
                "description": layout.description,
            }
            for layout in self.layouts.values()
        ]

    async def export_dashboard_config(self, dashboard_id: str) -> dict[str, Any] | None:
        """Export dashboard configuration."""
        if dashboard_id not in self.layouts:
            return None

        layout = self.layouts[dashboard_id]
        return {
            "dashboard_id": layout.dashboard_id,
            "name": layout.name,
            "description": layout.description,
            "refresh_interval": layout.refresh_interval,
            "widgets": [
                {
                    "widget_id": w.widget_id,
                    "title": w.title,
                    "widget_type": w.widget_type,
                    "data_source": w.data_source,
                    "config": w.config,
                    "position": w.position,
                }
                for w in layout.widgets
            ],
        }

    def import_dashboard_config(self, config: dict[str, Any]) -> bool:
        """Import dashboard configuration."""
        try:
            widgets = []
            for widget_config in config.get("widgets", []):
                widget = DashboardWidget(
                    widget_id=widget_config["widget_id"],
                    title=widget_config["title"],
                    widget_type=widget_config["widget_type"],
                    data_source=widget_config["data_source"],
                    config=widget_config.get("config", {}),
                    position=widget_config.get(
                        "position", {"x": 0, "y": 0, "w": 4, "h": 3}
                    ),
                )
                widgets.append(widget)

            layout = DashboardLayout(
                dashboard_id=config["dashboard_id"],
                name=config["name"],
                description=config["description"],
                widgets=widgets,
                refresh_interval=config.get("refresh_interval", 5),
            )

            self.layouts[layout.dashboard_id] = layout
            logger.info(f"Imported dashboard: {layout.name}")
            return True

        except Exception as e:
            logger.error(f"Failed to import dashboard config: {e}")
            return False

    async def _get_widget_data(self, widget: DashboardWidget) -> dict[str, Any]:
        """Get data for a specific widget."""
        if widget.data_source == "metrics":
            return await self._get_metrics_widget_data(widget)
        elif widget.data_source == "cache":
            return await self._get_cache_widget_data(widget)
        elif widget.data_source == "alerts":
            return await self._get_alerts_widget_data(widget)
        else:
            return {"error": f"Unknown data source: {widget.data_source}"}

    async def _get_metrics_widget_data(self, widget: DashboardWidget) -> dict[str, Any]:
        """Get metrics data for widget."""
        metrics = self.metrics_collector.get_current_metrics()

        if widget.widget_type == "gauge":
            metric_name = widget.config.get("metric", "cpu_usage")
            value = getattr(metrics, metric_name, 0)
            return {
                "value": value,
                "min": widget.config.get("min", 0),
                "max": widget.config.get("max", 100),
                "unit": widget.config.get("unit", "%"),
                "thresholds": widget.config.get("thresholds", []),
            }

        elif widget.widget_type == "chart":
            metric_name = widget.config.get("metric", "response_time")
            duration = widget.config.get("duration", 300)  # 5 minutes

            history = self.metrics_collector.get_metrics_history(duration)

            data_points = []
            for metric in history[-50:]:  # Last 50 points
                value = getattr(metric, metric_name, 0)
                data_points.append(
                    {"timestamp": metric.timestamp.isoformat(), "value": value}
                )

            return {
                "data_points": data_points,
                "metric_name": metric_name,
                "unit": widget.config.get("unit", "ms"),
            }

        elif widget.widget_type == "table":
            return {
                "columns": ["Metric", "Value", "Unit"],
                "rows": [
                    ["Requests/sec", f"{metrics.requests_per_second:.2f}", "req/s"],
                    ["Avg Response Time", f"{metrics.avg_response_time:.2f}", "ms"],
                    ["P95 Response Time", f"{metrics.p95_response_time:.2f}", "ms"],
                    ["Error Rate", f"{metrics.error_rate:.2%}", "%"],
                    ["CPU Usage", f"{metrics.cpu_usage:.1f}", "%"],
                    ["Memory Usage", f"{metrics.memory_usage:.1f}", "%"],
                ],
            }

        return {"error": f"Unknown widget type: {widget.widget_type}"}

    async def _get_cache_widget_data(self, widget: DashboardWidget) -> dict[str, Any]:
        """Get cache data for widget."""
        cache_metrics = await self.cache_optimizer.get_metrics()

        if widget.widget_type == "gauge":
            return {
                "value": cache_metrics.hit_rate * 100,
                "min": 0,
                "max": 100,
                "unit": "%",
                "thresholds": [
                    {"value": 50, "color": "red"},
                    {"value": 80, "color": "yellow"},
                    {"value": 95, "color": "green"},
                ],
            }

        elif widget.widget_type == "table":
            return {
                "columns": ["Metric", "Value"],
                "rows": [
                    ["Hit Rate", f"{cache_metrics.hit_rate:.2%}"],
                    ["Hits", str(cache_metrics.hits)],
                    ["Misses", str(cache_metrics.misses)],
                    ["Entries", str(cache_metrics.entry_count)],
                    [
                        "Memory Usage",
                        f"{cache_metrics.memory_usage / 1024 / 1024:.1f} MB",
                    ],
                ],
            }

        return {"error": f"Unknown widget type: {widget.widget_type}"}

    async def _get_alerts_widget_data(self, widget: DashboardWidget) -> dict[str, Any]:
        """Get alerts data for widget."""
        if widget.widget_type == "alert_list":
            widget.config.get("hours", 24)
            level = widget.config.get("level")

            if level:
                level = AlertLevel(level)

            alerts = self.alert_manager.get_active_alerts(level)

            alert_list = []
            for alert in alerts[:20]:  # Limit to 20 most recent
                alert_list.append(
                    {
                        "id": alert.alert_id,
                        "level": alert.level.value,
                        "message": alert.message,
                        "timestamp": alert.timestamp.strftime("%H:%M:%S"),
                        "metric": alert.metric_name,
                        "value": alert.metric_value,
                        "acknowledged": alert.context.get("acknowledged", False),
                    }
                )

            return {"alerts": alert_list}

        elif widget.widget_type == "alert_summary":
            stats = self.alert_manager.get_alert_statistics(24)
            return {
                "total": stats["total_alerts"],
                "by_level": stats["by_level"],
                "acknowledged": stats["acknowledged_count"],
                "suppressed": stats["suppressed_count"],
            }

        return {"error": f"Unknown widget type: {widget.widget_type}"}

    def _create_default_layouts(self) -> None:
        """Create default dashboard layouts."""
        # Overview Dashboard
        overview_widgets = [
            DashboardWidget(
                widget_id="cpu_gauge",
                title="CPU Usage",
                widget_type="gauge",
                data_source="metrics",
                config={"metric": "cpu_usage", "unit": "%", "max": 100},
                position={"x": 0, "y": 0, "w": 3, "h": 3},
            ),
            DashboardWidget(
                widget_id="memory_gauge",
                title="Memory Usage",
                widget_type="gauge",
                data_source="metrics",
                config={"metric": "memory_usage", "unit": "%", "max": 100},
                position={"x": 3, "y": 0, "w": 3, "h": 3},
            ),
            DashboardWidget(
                widget_id="cache_hit_rate",
                title="Cache Hit Rate",
                widget_type="gauge",
                data_source="cache",
                position={"x": 6, "y": 0, "w": 3, "h": 3},
            ),
            DashboardWidget(
                widget_id="response_time_chart",
                title="Response Time Trend",
                widget_type="chart",
                data_source="metrics",
                config={"metric": "avg_response_time", "duration": 600, "unit": "ms"},
                position={"x": 0, "y": 3, "w": 6, "h": 4},
            ),
            DashboardWidget(
                widget_id="active_alerts",
                title="Active Alerts",
                widget_type="alert_list",
                data_source="alerts",
                config={"hours": 24},
                position={"x": 6, "y": 3, "w": 6, "h": 4},
            ),
            DashboardWidget(
                widget_id="metrics_table",
                title="Key Metrics",
                widget_type="table",
                data_source="metrics",
                position={"x": 0, "y": 7, "w": 12, "h": 3},
            ),
        ]

        overview_layout = DashboardLayout(
            dashboard_id="overview",
            name="System Overview",
            description="High-level system performance overview",
            widgets=overview_widgets,
        )

        self.layouts["overview"] = overview_layout

        # Performance Dashboard
        performance_widgets = [
            DashboardWidget(
                widget_id="rps_chart",
                title="Requests per Second",
                widget_type="chart",
                data_source="metrics",
                config={
                    "metric": "requests_per_second",
                    "duration": 600,
                    "unit": "req/s",
                },
                position={"x": 0, "y": 0, "w": 6, "h": 4},
            ),
            DashboardWidget(
                widget_id="response_time_p95",
                title="P95 Response Time",
                widget_type="chart",
                data_source="metrics",
                config={"metric": "p95_response_time", "duration": 600, "unit": "ms"},
                position={"x": 6, "y": 0, "w": 6, "h": 4},
            ),
            DashboardWidget(
                widget_id="error_rate_chart",
                title="Error Rate",
                widget_type="chart",
                data_source="metrics",
                config={"metric": "error_rate", "duration": 600, "unit": "%"},
                position={"x": 0, "y": 4, "w": 6, "h": 4},
            ),
            DashboardWidget(
                widget_id="concurrent_requests",
                title="Concurrent Requests",
                widget_type="gauge",
                data_source="metrics",
                config={"metric": "concurrent_requests", "unit": "reqs", "max": 1000},
                position={"x": 6, "y": 4, "w": 3, "h": 3},
            ),
        ]

        performance_layout = DashboardLayout(
            dashboard_id="performance",
            name="Performance Metrics",
            description="Detailed performance monitoring",
            widgets=performance_widgets,
        )

        self.layouts["performance"] = performance_layout

    async def _send_dashboard_data(
        self, websocket: WebSocket, dashboard_id: str
    ) -> None:
        """Send dashboard data to WebSocket client."""
        try:
            data = await self.get_dashboard_data(dashboard_id)
            await websocket.send_text(
                json.dumps({"type": "dashboard_data", "data": data})
            )
        except Exception as e:
            logger.error(f"Error sending dashboard data: {e}")

    async def _broadcast_loop(self) -> None:
        """Background loop to broadcast updates to all connected clients."""
        while self._running:
            try:
                if self.active_connections:
                    # Get data for all dashboards
                    dashboard_data = {}
                    for dashboard_id in self.layouts.keys():
                        dashboard_data[dashboard_id] = await self.get_dashboard_data(
                            dashboard_id
                        )

                    # Broadcast to all connections
                    message = json.dumps(
                        {"type": "dashboard_update", "data": dashboard_data}
                    )

                    # Send to all connected clients
                    disconnected = []
                    for websocket in self.active_connections:
                        try:
                            await websocket.send_text(message)
                        except:
                            disconnected.append(websocket)

                    # Remove disconnected clients
                    for websocket in disconnected:
                        self.active_connections.remove(websocket)

                await asyncio.sleep(5)  # Update every 5 seconds

            except Exception as e:
                logger.error(f"Error in dashboard broadcast: {e}")
                await asyncio.sleep(5)


class DashboardManager:
    """Manager for multiple dashboard instances."""

    def __init__(self):
        self.dashboards: dict[str, PerformanceDashboard] = {}

    def create_dashboard(self, name: str, **kwargs) -> PerformanceDashboard:
        """Create a new dashboard instance."""
        dashboard = PerformanceDashboard(**kwargs)
        self.dashboards[name] = dashboard
        return dashboard

    def get_dashboard(self, name: str) -> PerformanceDashboard | None:
        """Get dashboard by name."""
        return self.dashboards.get(name)

    def list_dashboards(self) -> list[str]:
        """List all dashboard names."""
        return list(self.dashboards.keys())

    def remove_dashboard(self, name: str) -> bool:
        """Remove a dashboard."""
        if name in self.dashboards:
            dashboard = self.dashboards[name]
            dashboard.stop()
            del self.dashboards[name]
            return True
        return False


# Global dashboard manager
_dashboard_manager: DashboardManager | None = None


def get_dashboard_manager() -> DashboardManager:
    """Get the global dashboard manager."""
    global _dashboard_manager
    if _dashboard_manager is None:
        _dashboard_manager = DashboardManager()
    return _dashboard_manager
