"""
DevOps Monitoring Configuration Templates

This module contains monitoring configuration templates extracted from devops_tools.py
to improve code organization and reduce function complexity.
"""

PROMETHEUS_CONFIG = """## Prometheus & Grafana Monitoring Stack

### Prometheus Configuration (prometheus.yml)
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - "alerts/*.yml"

scrape_configs:
  # Application metrics
  - job_name: 'application'
    static_configs:
      - targets: ['app:8080']
    metrics_path: '/metrics'
  
  # Node exporter for system metrics
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
  
  # Container metrics
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
  
  # Database metrics
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
  
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Alert Rules (alerts/basic.yml)
```yaml
groups:
  - name: basic_alerts
    interval: 30s
    rules:
      # High CPU usage
      - alert: HighCPUUsage
        expr: 100 - (avg(rate(node_cpu_seconds_total{{mode="idle"}}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80% (current value: {{{{ $value }}}}%)"
      
      # High memory usage
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 85% (current value: {{{{ $value }}}}%)"
      
      # Service down
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{{{ $labels.job }}}} is down"
          description: "{{{{ $labels.instance }}}} of job {{{{ $labels.job }}}} has been down for more than 1 minute"
```

### Grafana Dashboard Example
```json
{{
  "dashboard": {{
    "title": "Application Metrics",
    "panels": [
      {{
        "title": "Request Rate",
        "targets": [
          {{
            "expr": "rate(http_requests_total[5m])",
            "refId": "A"
          }}
        ],
        "type": "graph"
      }},
      {{
        "title": "Response Time",
        "targets": [
          {{
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)",
            "refId": "A"
          }}
        ],
        "type": "graph"
      }}
    ]
  }}
}}
```"""

DATADOG_CONFIG = """## Datadog Monitoring Configuration

### Agent Configuration (datadog.yaml)
```yaml
api_key: ${DD_API_KEY}
site: datadoghq.com
hostname: ${HOSTNAME}

tags:
  - env:production
  - service:api
  - version:${VERSION}

logs_enabled: true
apm_enabled: true
process_config:
  enabled: true

# Custom metrics
dogstatsd_metrics_stats_enable: true
```

### Application Integration
```python
# Python example
from datadog import initialize, statsd
import time

# Initialize
options = {
    'statsd_host': '127.0.0.1',
    'statsd_port': 8125
}
initialize(**options)

# Custom metrics
def track_request(func):
    def wrapper(*args, **kwargs):
        start = time.time()
        try:
            result = func(*args, **kwargs)
            statsd.increment('api.request.success')
            return result
        except Exception as e:
            statsd.increment('api.request.error')
            raise
        finally:
            duration = time.time() - start
            statsd.histogram('api.request.duration', duration)
    return wrapper
```

### Monitors Configuration
```json
{
  "name": "High Error Rate",
  "type": "query alert",
  "query": "avg(last_5m):sum:api.request.error{env:production}.as_rate() > 0.05",
  "message": "Error rate is above 5%! @slack-alerts",
  "thresholds": {
    "critical": 0.05,
    "warning": 0.03
  }
}
```"""

CLOUDWATCH_CONFIG = """## AWS CloudWatch Configuration

### CloudWatch Agent Config
```json
{
  "metrics": {
    "namespace": "MyApp",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_iowait",
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "metrics_collection_interval": 60,
        "totalcpu": false
      },
      "disk": {
        "measurement": [
          "used_percent",
          "inodes_free"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/application/*.log",
            "log_group_name": "/aws/ec2/application",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 30
          }
        ]
      }
    }
  }
}
```

### CloudFormation Alarms
```yaml
HighCPUAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmDescription: "Triggers when CPU exceeds 80%"
    MetricName: CPUUtilization
    Namespace: AWS/EC2
    Statistic: Average
    Period: 300
    EvaluationPeriods: 2
    Threshold: 80
    ComparisonOperator: GreaterThanThreshold
    AlarmActions:
      - !Ref SNSTopic
```"""

DEFAULT_CONFIG_TEMPLATE = """## Monitoring Configuration

**Stack**: {stack}
**Metrics Type**: {metrics_type}

### Essential Metrics to Monitor

1. **System Metrics**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network traffic

2. **Application Metrics**
   - Request rate
   - Error rate
   - Response time
   - Active users

3. **Business Metrics**
   - Conversion rate
   - Revenue
   - User engagement
   - Feature adoption

### Recommended Tools
- **Open Source**: Prometheus + Grafana, ELK Stack
- **Cloud**: CloudWatch (AWS), Stackdriver (GCP), Azure Monitor
- **SaaS**: Datadog, New Relic, AppDynamics

### Best Practices
- Set up alerts for critical metrics
- Use dashboards for visualization
- Implement distributed tracing
- Store metrics for trend analysis
- Regular review and optimization"""

# Configuration mapping
MONITORING_CONFIGS = {"prometheus": PROMETHEUS_CONFIG, "datadog": DATADOG_CONFIG, "cloudwatch": CLOUDWATCH_CONFIG}
