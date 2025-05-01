# VANA Dashboard

The VANA Dashboard provides a comprehensive monitoring and visualization interface for the VANA agent system. It allows users to monitor agent status, memory usage, system health, and task execution in real-time.

## Features

- **Agent Status**: Monitor the status and performance of all VANA agents
- **Memory Usage**: Track memory usage across Vector Search, Knowledge Graph, and Local Cache
- **System Health**: Monitor system health metrics including CPU, memory, and disk usage
- **Task Execution**: Track task execution metrics and view task details
- **Settings**: Configure dashboard settings

## Installation

1. Install the required dependencies:

```bash
pip install -r requirements.txt
```

2. Configure the dashboard by editing the `dashboard/config/config.json` file.

## Usage

To start the dashboard:

```bash
streamlit run dashboard/app.py
```

This will start the dashboard on http://localhost:8501 by default.

## Testing

To run the dashboard tests:

```bash
./run_dashboard_tests.sh
```

This will start the dashboard, run the tests, and stop the dashboard when the tests are complete.

## Configuration

The dashboard can be configured by editing the `dashboard/config/config.json` file. The following configuration options are available:

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
  - **color_scheme**: Color scheme for charts (blues, greens, reds, etc.)
  - **animation**: Enable chart animations

- **alerts**: Alert settings
  - **enabled**: Enable alerts
  - **cpu_threshold**: CPU usage threshold for alerts (percentage)
  - **memory_threshold**: Memory usage threshold for alerts (percentage)
  - **disk_threshold**: Disk usage threshold for alerts (percentage)
  - **error_rate_threshold**: Error rate threshold for alerts (percentage)

## Architecture

The dashboard is built using the following components:

- **API**: Modules for retrieving data from various VANA components
  - `memory_api.py`: API client for memory data
  - `agent_api.py`: API client for agent data
  - `system_api.py`: API client for system data
  - `task_api.py`: API client for task data

- **Components**: UI components for displaying data
  - `agent_status.py`: Components for displaying agent status
  - `memory_usage.py`: Components for displaying memory usage
  - `system_health.py`: Components for displaying system health
  - `task_execution.py`: Components for displaying task execution

- **Utils**: Utility functions for data formatting and visualization
  - `config.py`: Configuration utilities
  - `data_formatter.py`: Data formatting utilities
  - `visualization_helpers.py`: Visualization helper functions

- **Pages**: Streamlit pages for the dashboard
  - `Home.py`: Home page
  - `Agent_Status.py`: Agent status page
  - `Memory_Usage.py`: Memory usage page
  - `System_Health.py`: System health page
  - `Task_Execution.py`: Task execution page
  - `Settings.py`: Settings page

## Development

To add a new visualization component:

1. Create a new module in the `components` directory
2. Implement the component using Streamlit
3. Add the component to the appropriate page in the `pages` directory
4. Update the `components/__init__.py` file to export the component

To add a new data source:

1. Create a new module in the `api` directory
2. Implement the API client for the data source
3. Update the `api/__init__.py` file to export the API client
4. Use the API client in the appropriate component
