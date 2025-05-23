# Dashboard Customization (Legacy Flask/Bootstrap/Chart.js)

[Home](../../index.md) > [Development](../development/index.md) > [Archive](index.md) > Dashboard Customization (Legacy)

**Note: This document describes customizing a previous version of the VANA dashboard that was built using Flask, Bootstrap, and direct Chart.js integration in HTML templates. The current VANA dashboard uses a Streamlit frontend with a Flask API backend. For extending the current Streamlit dashboard, please refer to [Extending the VANA Monitoring Dashboard Guide](../../guides/extending-dashboard.md).**

This document provides guidance on customizing the Vector Search Health Monitoring Dashboard, including adding new visualizations, modifying the layout, and styling the dashboard.

## Overview

The Vector Search Health Monitoring Dashboard is built using Flask, Bootstrap, and Chart.js. It provides a web interface for monitoring the health status, metrics, and trends of the Vector Search system. This guide will walk you through the process of customizing the dashboard to meet your specific needs.

## Dashboard Architecture

The dashboard consists of the following components:

1. **Flask Application** (`dashboard/flask_app.py`)
   - Provides the web server and routing
   - Initializes the authentication system
   - Configures the application

2. **Route Handlers** (`dashboard/routes/vector_search_routes.py`)
   - Handle requests to the dashboard
   - Retrieve and format data for templates
   - Render templates with data

3. **Templates** (`dashboard/templates/vector_search_health.html`)
   - Define the HTML structure of the dashboard
   - Include CSS and JavaScript
   - Render data from route handlers

4. **Static Assets** (`dashboard/static/`)
   - CSS stylesheets
   - JavaScript files
   - Images and icons

## Adding New Visualizations

### Step 1: Update the Route Handler

Update the `health_dashboard` function in `dashboard/routes/vector_search_routes.py` to include the data for your new visualization:

```python
@vector_search_bp.route('/health')
@requires_auth(['admin', 'viewer'])
def health_dashboard():
    # ... existing code ...
    
    # Add data for new visualization
    template_data['custom_data'] = [1, 2, 3, 4, 5]
    
    # ... existing code ...
    
    return render_template('vector_search_health.html', **template_data)
```

### Step 2: Add the Visualization to the Template

Update the `vector_search_health.html` template to include your new visualization:

```html
<!-- Custom Visualization -->
<div class="row mb-4">
    <div class="col-md-12">
        <div class="card metric-card">
            <div class="card-body">
                <h5 class="card-title">Custom Visualization</h5>
                <div class="chart-container">
                    <canvas id="custom-chart"></canvas>
                </div>
            </div>
        </div>
    </div>
</div>
```

### Step 3: Add the JavaScript for the Visualization

Add the JavaScript code to initialize the chart:

```javascript
// Custom Chart
new Chart(document.getElementById('custom-chart'), {
    type: 'bar',
    data: {
        labels: ['A', 'B', 'C', 'D', 'E'],
        datasets: [{
            label: 'Custom Data',
            data: {{ custom_data|safe }},
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});
```

## Modifying the Layout

### Step 1: Understand the Template Structure

The `vector_search_health.html` template has the following structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Meta tags, title, and CSS -->
</head>
<body>
    <div class="dashboard-header">
        <!-- Header content -->
    </div>

    <div class="container">
        <!-- Overall Status -->
        <div class="row mb-4">
            <!-- Status card -->
        </div>

        <!-- Key Metrics -->
        <div class="row mb-4">
            <!-- Metric cards -->
        </div>

        <!-- Component Status -->
        <div class="row mb-4">
            <!-- Component status table -->
        </div>

        <!-- Charts -->
        <div class="row mb-4">
            <!-- Chart cards -->
        </div>

        <!-- Status Distribution -->
        <div class="row mb-4">
            <!-- Distribution chart and recommendations -->
        </div>
    </div>

    <script>
        <!-- JavaScript for charts -->
    </script>
</body>
</html>
```

### Step 2: Modify the Layout

You can modify the layout by rearranging the rows and columns:

```html
<div class="container">
    <!-- Custom Layout -->
    <div class="row mb-4">
        <!-- Left Column -->
        <div class="col-md-4">
            <!-- Overall Status -->
            <div class="card metric-card status-{{ status }} mb-4">
                <div class="card-body">
                    <h5 class="card-title">Overall Health Status</h5>
                    <h2 class="display-4 text-center" id="overall-status">{{ status }}</h2>
                </div>
            </div>
            
            <!-- Key Metrics -->
            <div class="card metric-card mb-4">
                <div class="card-body">
                    <h5 class="card-title">Key Metrics</h5>
                    <ul class="list-group">
                        <li class="list-group-item">Response Time: {{ response_time }} s</li>
                        <li class="list-group-item">Success Rate: {{ success_rate }}%</li>
                        <li class="list-group-item">Health Percentage: {{ health_percentage }}%</li>
                    </ul>
                </div>
            </div>
            
            <!-- Recommendations -->
            <div class="card metric-card">
                <div class="card-body">
                    <h5 class="card-title">Recommendations</h5>
                    <ul class="list-group" id="recommendations">
                        {% for rec in recommendations %}
                        <li class="list-group-item">
                            <span class="badge bg-{{ rec.priority }}">{{ rec.priority }}</span>
                            <strong>{{ rec.title }}</strong>: {{ rec.action }}
                        </li>
                        {% endfor %}
                    </ul>
                </div>
            </div>
        </div>
        
        <!-- Right Column -->
        <div class="col-md-8">
            <!-- Component Status -->
            <div class="card metric-card mb-4">
                <div class="card-body">
                    <h5 class="card-title">Component Status</h5>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Component</th>
                                    <th>Status</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody id="component-status">
                                {% for component, status in component_status.items() %}
                                <tr>
                                    <td>{{ component }}</td>
                                    <td class="status-{{ status }}">{{ status }}</td>
                                    <td>{{ component_details[component] }}</td>
                                </tr>
                                {% endfor %}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <!-- Charts -->
            <div class="card metric-card">
                <div class="card-body">
                    <h5 class="card-title">Performance Metrics</h5>
                    <ul class="nav nav-tabs" id="myTab" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="response-time-tab" data-bs-toggle="tab" data-bs-target="#response-time" type="button" role="tab">Response Time</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="success-rate-tab" data-bs-toggle="tab" data-bs-target="#success-rate" type="button" role="tab">Success Rate</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="status-distribution-tab" data-bs-toggle="tab" data-bs-target="#status-distribution" type="button" role="tab">Status Distribution</button>
                        </li>
                    </ul>
                    <div class="tab-content" id="myTabContent">
                        <div class="tab-pane fade show active" id="response-time" role="tabpanel">
                            <div class="chart-container">
                                <canvas id="response-time-chart"></canvas>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="success-rate" role="tabpanel">
                            <div class="chart-container">
                                <canvas id="success-rate-chart"></canvas>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="status-distribution" role="tabpanel">
                            <div class="chart-container">
                                <canvas id="status-distribution-chart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
```

## Styling the Dashboard

### Step 1: Understand the CSS Structure

The dashboard uses Bootstrap 5 for styling, with custom CSS for specific components:

```html
<style>
    .status-ok {
        background-color: #d4edda;
        color: #155724;
    }
    .status-warn {
        background-color: #fff3cd;
        color: #856404;
    }
    .status-error {
        background-color: #f8d7da;
        color: #721c24;
    }
    .status-critical {
        background-color: #dc3545;
        color: white;
        font-weight: bold;
    }
    .status-unknown {
        background-color: #d6d8d9;
        color: #1b1e21;
    }
    .metric-card {
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease;
    }
    .metric-card:hover {
        transform: translateY(-5px);
    }
    .trend-improving {
        color: #28a745;
    }
    .trend-degrading {
        color: #dc3545;
    }
    .trend-stable {
        color: #6c757d;
    }
    .dashboard-header {
        background-color: #f8f9fa;
        padding: 20px 0;
        margin-bottom: 20px;
        border-bottom: 1px solid #dee2e6;
    }
    .chart-container {
        position: relative;
        height: 300px;
        margin-bottom: 30px;
    }
</style>
```

### Step 2: Modify the CSS

You can modify the CSS to customize the appearance of the dashboard:

```html
<style>
    /* Custom color scheme */
    :root {
        --primary-color: #3498db;
        --secondary-color: #2ecc71;
        --warning-color: #f39c12;
        --danger-color: #e74c3c;
        --light-color: #ecf0f1;
        --dark-color: #2c3e50;
    }
    
    /* Status colors */
    .status-ok {
        background-color: var(--secondary-color);
        color: white;
    }
    .status-warn {
        background-color: var(--warning-color);
        color: white;
    }
    .status-error {
        background-color: var(--danger-color);
        color: white;
    }
    .status-critical {
        background-color: var(--dark-color);
        color: white;
        font-weight: bold;
    }
    .status-unknown {
        background-color: var(--light-color);
        color: var(--dark-color);
    }
    
    /* Card styling */
    .metric-card {
        border-radius: 15px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        border: none;
        overflow: hidden;
    }
    .metric-card:hover {
        transform: translateY(-10px);
        box-shadow: 0 12px 20px rgba(0, 0, 0, 0.15);
    }
    .metric-card .card-body {
        padding: 25px;
    }
    .metric-card .card-title {
        color: var(--dark-color);
        font-weight: 600;
        margin-bottom: 20px;
        border-bottom: 2px solid var(--primary-color);
        padding-bottom: 10px;
    }
    
    /* Trend indicators */
    .trend-improving {
        color: var(--secondary-color);
        font-weight: bold;
    }
    .trend-degrading {
        color: var(--danger-color);
        font-weight: bold;
    }
    .trend-stable {
        color: var(--dark-color);
    }
    
    /* Header styling */
    .dashboard-header {
        background-color: var(--dark-color);
        padding: 30px 0;
        margin-bottom: 30px;
        border-bottom: none;
        color: white;
    }
    .dashboard-header h1 {
        font-weight: 700;
    }
    .dashboard-header p {
        color: rgba(255, 255, 255, 0.8);
    }
    
    /* Chart container */
    .chart-container {
        position: relative;
        height: 350px;
        margin-bottom: 30px;
    }
    
    /* Table styling */
    .table {
        border-collapse: separate;
        border-spacing: 0 5px;
    }
    .table thead th {
        border-bottom: 2px solid var(--primary-color);
        color: var(--dark-color);
        font-weight: 600;
    }
    .table tbody tr {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        border-radius: 10px;
    }
    .table tbody td {
        padding: 15px;
        vertical-align: middle;
    }
    
    /* Badge styling */
    .badge {
        padding: 8px 12px;
        border-radius: 30px;
        font-weight: 500;
    }
    .badge.bg-high {
        background-color: var(--danger-color);
    }
    .badge.bg-medium {
        background-color: var(--warning-color);
    }
    .badge.bg-low {
        background-color: var(--secondary-color);
    }
</style>
```

### Step 3: Create a Custom CSS File

For more extensive customization, create a custom CSS file:

1. Create a file at `dashboard/static/css/custom.css`:

```css
/* Custom color scheme */
:root {
    --primary-color: #3498db;
    --secondary-color: #2ecc71;
    --warning-color: #f39c12;
    --danger-color: #e74c3c;
    --light-color: #ecf0f1;
    --dark-color: #2c3e50;
}

/* Status colors */
.status-ok {
    background-color: var(--secondary-color);
    color: white;
}
.status-warn {
    background-color: var(--warning-color);
    color: white;
}
.status-error {
    background-color: var(--danger-color);
    color: white;
}
.status-critical {
    background-color: var(--dark-color);
    color: white;
    font-weight: bold;
}
.status-unknown {
    background-color: var(--light-color);
    color: var(--dark-color);
}

/* Card styling */
.metric-card {
    border-radius: 15px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    border: none;
    overflow: hidden;
}
.metric-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 12px 20px rgba(0, 0, 0, 0.15);
}
.metric-card .card-body {
    padding: 25px;
}
.metric-card .card-title {
    color: var(--dark-color);
    font-weight: 600;
    margin-bottom: 20px;
    border-bottom: 2px solid var(--primary-color);
    padding-bottom: 10px;
}

/* Trend indicators */
.trend-improving {
    color: var(--secondary-color);
    font-weight: bold;
}
.trend-degrading {
    color: var(--danger-color);
    font-weight: bold;
}
.trend-stable {
    color: var(--dark-color);
}

/* Header styling */
.dashboard-header {
    background-color: var(--dark-color);
    padding: 30px 0;
    margin-bottom: 30px;
    border-bottom: none;
    color: white;
}
.dashboard-header h1 {
    font-weight: 700;
}
.dashboard-header p {
    color: rgba(255, 255, 255, 0.8);
}

/* Chart container */
.chart-container {
    position: relative;
    height: 350px;
    margin-bottom: 30px;
}

/* Table styling */
.table {
    border-collapse: separate;
    border-spacing: 0 5px;
}
.table thead th {
    border-bottom: 2px solid var(--primary-color);
    color: var(--dark-color);
    font-weight: 600;
}
.table tbody tr {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    border-radius: 10px;
}
.table tbody td {
    padding: 15px;
    vertical-align: middle;
}

/* Badge styling */
.badge {
    padding: 8px 12px;
    border-radius: 30px;
    font-weight: 500;
}
.badge.bg-high {
    background-color: var(--danger-color);
}
.badge.bg-medium {
    background-color: var(--warning-color);
}
.badge.bg-low {
    background-color: var(--secondary-color);
}
```

2. Include the CSS file in the template:

```html
<head>
    <!-- ... existing code ... -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="{{ url_for('static', filename='css/custom.css') }}" rel="stylesheet">
    <!-- ... existing code ... -->
</head>
```

## Customizing Charts

### Step 1: Understand the Chart.js Configuration

The dashboard uses Chart.js for visualizations:

```javascript
// Response Time Chart
new Chart(document.getElementById('response-time-chart'), {
    type: 'line',
    data: {
        labels: {{ timestamps|safe }},
        datasets: [{
            label: 'Response Time (s)',
            data: {{ response_times|safe }},
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});
```

### Step 2: Customize Chart Appearance

You can customize the appearance of the charts:

```javascript
// Response Time Chart
new Chart(document.getElementById('response-time-chart'), {
    type: 'line',
    data: {
        labels: {{ timestamps|safe }},
        datasets: [{
            label: 'Response Time (s)',
            data: {{ response_times|safe }},
            borderColor: 'rgba(52, 152, 219, 1)',
            backgroundColor: 'rgba(52, 152, 219, 0.2)',
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: 'rgba(52, 152, 219, 1)',
            pointBorderColor: 'rgba(255, 255, 255, 1)',
            pointBorderWidth: 2,
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(44, 62, 80, 0.9)',
                titleFont: {
                    size: 16,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 14
                },
                padding: 12,
                cornerRadius: 8
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        size: 12
                    }
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    font: {
                        size: 12
                    }
                }
            }
        }
    }
});
```

### Step 3: Create Custom Chart Types

You can create custom chart types:

```javascript
// Custom Stacked Area Chart
new Chart(document.getElementById('custom-chart'), {
    type: 'line',
    data: {
        labels: {{ timestamps|safe }},
        datasets: [
            {
                label: 'OK',
                data: {{ ok_counts|safe }},
                backgroundColor: 'rgba(46, 204, 113, 0.6)',
                borderColor: 'rgba(46, 204, 113, 1)',
                borderWidth: 1,
                fill: true
            },
            {
                label: 'Warning',
                data: {{ warn_counts|safe }},
                backgroundColor: 'rgba(243, 156, 18, 0.6)',
                borderColor: 'rgba(243, 156, 18, 1)',
                borderWidth: 1,
                fill: true
            },
            {
                label: 'Error',
                data: {{ error_counts|safe }},
                backgroundColor: 'rgba(231, 76, 60, 0.6)',
                borderColor: 'rgba(231, 76, 60, 1)',
                borderWidth: 1,
                fill: true
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: 'Status Distribution Over Time',
                font: {
                    size: 18,
                    weight: 'bold'
                }
            }
        },
        scales: {
            x: {
                stacked: true
            },
            y: {
                stacked: true,
                beginAtZero: true
            }
        }
    }
});
```

## Using Templates and Inheritance

### Step 1: Create a Base Template

Create a base template at `dashboard/templates/base.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}VANA Dashboard{% endblock %}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="{{ url_for('static', filename='css/custom.css') }}" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    {% block head %}{% endblock %}
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="#">VANA Dashboard</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav me-auto">
                    <li class="nav-item">
                        <a class="nav-link" href="{{ url_for('index') }}">Home</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="{{ url_for('vector_search.health') }}">Vector Search</a>
                    </li>
                </ul>
                <ul class="navbar-nav">
                    <li class="nav-item">
                        <a class="nav-link" href="{{ url_for('auth.change_password') }}">Change Password</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="{{ url_for('auth.logout') }}">Logout</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <div class="container mt-4">
        {% block content %}{% endblock %}
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    {% block scripts %}{% endblock %}
</body>
</html>
```

### Step 2: Update the Dashboard Template

Update the `vector_search_health.html` template to extend the base template:

```html
{% extends "base.html" %}

{% block title %}Vector Search Health Dashboard{% endblock %}

{% block head %}
<style>
    /* Custom styles for this page */
</style>
{% endblock %}

{% block content %}
<div class="dashboard-header">
    <div class="row align-items-center">
        <div class="col-md-6">
            <h1>Vector Search Health Dashboard</h1>
            <p class="text-muted">Monitoring and metrics for Vector Search integration</p>
        </div>
        <div class="col-md-6 text-end">
            <p>Last updated: <span id="last-updated">{{ last_updated }}</span></p>
            <button class="btn btn-primary" onclick="refreshDashboard()">Refresh</button>
        </div>
    </div>
</div>

<!-- Dashboard content -->
{% endblock %}

{% block scripts %}
<script>
    // JavaScript for charts and dashboard functionality
</script>
{% endblock %}
```

## Best Practices

### Code Organization

- Keep related functionality in the same module
- Use templates for reusable components
- Follow the existing code style and patterns

### Performance

- Optimize JavaScript for performance
- Minimize DOM manipulations
- Use efficient CSS selectors
- Compress and minify static assets

### Accessibility

- Use semantic HTML
- Provide alternative text for images
- Ensure sufficient color contrast
- Make interactive elements keyboard accessible

### Responsive Design

- Test on different screen sizes
- Use responsive CSS units
- Implement mobile-friendly navigation
- Optimize charts for small screens

### Security

- Validate user input
- Use CSRF protection
- Implement proper access controls
- Sanitize data before rendering
