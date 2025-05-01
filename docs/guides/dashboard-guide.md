# VANA Dashboard Guide

The VANA Dashboard provides visualization and monitoring capabilities for the VANA system. It displays memory usage, agent performance, system health, and task execution metrics.

## Features

- **Agent Status**: Monitor the status and performance of all agents in the system
- **Memory Usage**: Track memory usage across Vector Search, Knowledge Graph, and Local Cache
- **System Health**: Monitor system health metrics including CPU, memory, and disk usage
- **Task Execution**: Track task execution metrics and view task details

## Installation

1. Install the required dependencies:

```bash
pip install -r dashboard/requirements.txt
```

2. Configure the dashboard by editing `dashboard/config.json` (optional)

## Usage

Run the dashboard using the provided script:

```bash
./run_dashboard.sh
```

Or run it directly with Streamlit:

```bash
cd dashboard
streamlit run app.py
```

This will start the dashboard on http://localhost:8501 by default.

## Configuration

The dashboard can be configured by editing the `dashboard/config.json` file. The following configuration options are available:

- **dashboard**: General dashboard settings
  - **title**: Dashboard title
  - **refresh_interval**: Data refresh interval in seconds
  - **theme**: Dashboard theme (light or dark)
  - **debug**: Enable debug mode

- **data_sources**: Data source settings
  - **use_mock_data**: Use mock data instead of real data
  - **memory_api_url**: URL for memory API
  - **agent_api_url**: URL for agent API
  - **system_api_url**: URL for system API
  - **task_api_url**: URL for task API

- **visualization**: Visualization settings
  - **chart_height**: Default chart height
  - **chart_width**: Default chart width
  - **color_scheme**: Default color scheme
  - **animation**: Enable chart animations

- **alerts**: Alert settings
  - **enabled**: Enable alerts
  - **cpu_threshold**: CPU usage threshold for alerts
  - **memory_threshold**: Memory usage threshold for alerts
  - **disk_threshold**: Disk usage threshold for alerts
  - **error_rate_threshold**: Error rate threshold for alerts

## Dashboard Pages

### Agent Status

The Agent Status page displays the status and performance of all agents in the system. It includes:

- Agent status cards with key metrics
- Performance charts for response time, success rate, and task count
- Activity timeline showing agent activities over time
- Recent activities table

### Memory Usage

The Memory Usage page displays memory usage metrics across different components. It includes:

- Memory usage charts over time
- Memory usage breakdown by component
- Memory operation counts and breakdown
- Cache metrics

### System Health

The System Health page displays system health metrics. It includes:

- CPU, memory, and disk usage gauges
- System performance charts over time
- Service status cards
- Error logs

### Task Execution

The Task Execution page displays task execution metrics. It includes:

- Task summary metrics
- Task status breakdown
- Task execution timeline
- Recent tasks table

## Development

### Adding a New Visualization Component

To add a new visualization component:

1. Create a new module in the `dashboard/components` directory
2. Implement the component using Streamlit
3. Add the component to the main application in `dashboard/app.py`

### Adding a New Data Source

To add a new data source:

1. Create a new module in the `dashboard/api` directory
2. Implement the API client for the data source
3. Add the API client to the main application in `dashboard/app.py`
