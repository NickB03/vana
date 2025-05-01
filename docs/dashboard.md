# VANA Dashboard

The VANA Dashboard provides a comprehensive visualization and monitoring interface for the VANA agent system. It allows users to monitor agent status, memory usage, system health, and task execution in real-time.

## Overview

The dashboard is built using Streamlit and provides the following main components:

1. **Agent Status**: Monitor the status and performance of all agents in the system
2. **Memory Usage**: Track memory usage across vector search, knowledge graph, and cache components
3. **System Health**: Monitor system resources, service status, and alerts
4. **Task Execution**: Track task execution, performance, and agent workload

## Getting Started

### Prerequisites

- Python 3.8+
- Required packages (see `dashboard/requirements.txt`)

### Installation

1. Install the required packages:

```bash
pip install -r dashboard/requirements.txt
```

2. Run the dashboard:

```bash
./run_dashboard.sh
```

Or manually:

```bash
cd dashboard
streamlit run app.py
```

## Components

### Agent Status

The Agent Status component provides real-time monitoring of all agents in the VANA system. It includes:

- **Agent Status Cards**: Quick overview of each agent's status, response time, and activity
- **Performance Metrics**: Charts showing response times, error rates, and resource usage
- **Historical Activity**: Time-series data showing agent performance over time

### Memory Usage

The Memory Usage component tracks the usage and performance of the memory system, including:

- **Memory Overview**: Summary of vector search, knowledge graph, and cache usage
- **Component Details**: Detailed metrics for each memory component
- **Historical Metrics**: Time-series data showing memory usage over time
- **Recent Queries**: List of recent memory queries with performance metrics

### System Health

The System Health component monitors the overall health of the VANA system, including:

- **Resource Usage**: CPU, memory, disk, and network usage metrics
- **Service Status**: Status of all services in the system
- **System Alerts**: Recent alerts and warnings
- **Historical Performance**: Time-series data showing system performance over time

### Task Execution

The Task Execution component tracks the execution of tasks in the VANA system, including:

- **Task Summary**: Overview of task execution metrics
- **Task Timeline**: Gantt chart showing task execution over time
- **Task Distribution**: Charts showing task distribution by type and status
- **Agent Performance**: Metrics showing agent workload and performance
- **Recent Tasks**: List of recent tasks with details

## Data Sources

The dashboard currently uses mock data generators for development purposes. In production, it will connect to the following data sources:

- **Agent API**: Real-time agent status and performance data
- **Memory API**: Memory usage and performance metrics
- **System API**: System health and resource usage metrics
- **Task API**: Task execution and performance data

## Configuration

The dashboard can be configured using environment variables:

- `DASHBOARD_PORT`: Port to run the dashboard on (default: 8501)
- `DASHBOARD_HOST`: Host to run the dashboard on (default: localhost)
- `DASHBOARD_THEME`: Dashboard theme (default: light)
- `DASHBOARD_TITLE`: Dashboard title (default: VANA Dashboard)

## Development

### Adding New Components

To add a new component to the dashboard:

1. Create a new file in `dashboard/components/` with your component code
2. Add the component to `dashboard/app.py`
3. Update the navigation in `dashboard/app.py`

### Creating Mock Data

To create mock data for development:

1. Create a new file in `dashboard/api/` with your mock data generator
2. Use realistic data patterns and randomization for testing
3. Include proper error handling and logging

## Testing

The dashboard includes unit tests for all components. To run the tests:

```bash
cd dashboard
pytest
```

## Deployment

The dashboard can be deployed using Docker:

```bash
docker build -t vana-dashboard .
docker run -p 8501:8501 vana-dashboard
```

## Future Enhancements

Planned enhancements for the dashboard include:

- **User Authentication**: Add user authentication and role-based access control
- **Alerting System**: Add alerting capabilities for critical events
- **Custom Dashboards**: Allow users to create custom dashboards
- **Mobile Support**: Optimize the dashboard for mobile devices
- **Real-time Updates**: Add WebSocket support for real-time updates

## Troubleshooting

### Common Issues

- **Dashboard not loading**: Check that all required packages are installed
- **Charts not displaying**: Check browser console for JavaScript errors
- **Data not updating**: Check API connectivity and refresh rate

### Logging

The dashboard logs to `dashboard.log` by default. To change the log level:

```bash
export DASHBOARD_LOG_LEVEL=DEBUG
```

## Contributing

Contributions to the dashboard are welcome! Please follow these guidelines:

1. Create a new branch for your changes
2. Add tests for new features
3. Update documentation
4. Submit a pull request

## License

The VANA Dashboard is licensed under the MIT License.
