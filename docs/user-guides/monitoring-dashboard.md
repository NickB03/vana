# Monitoring Dashboard User Guide

[Home](../index.md) > [User Guides](index.md) > Monitoring Dashboard

This guide provides step-by-step instructions for accessing and using the Vector Search Health Monitoring Dashboard.

## Overview

The Vector Search Health Monitoring Dashboard provides a comprehensive view of the health status, metrics, and trends of the Vector Search system. It allows you to:

- Monitor the overall health status of Vector Search
- View detailed metrics and trends
- Identify and troubleshoot issues
- Receive actionable recommendations
- Track historical performance

## Accessing the Dashboard

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Valid dashboard credentials (username and password)
- Network access to the dashboard server

### Login

1. Open your web browser and navigate to the dashboard URL:
   ```
   http://localhost:5000/
   ```

2. You will be redirected to the login page:

   ![Login Page](../images/dashboard-login.png)

3. Enter your username and password, then click "Log In".

4. If this is your first login with default credentials, you will be prompted to change your password.

## Dashboard Overview

The dashboard is organized into several sections:

![Dashboard Overview](../images/dashboard-overview.png)

1. **Header**: Contains the dashboard title, last update time, and refresh button.
2. **Status Card**: Shows the overall health status of Vector Search.
3. **Key Metrics**: Displays important metrics like response time and success rate.
4. **Component Status**: Shows the status of individual components.
5. **Charts**: Visualizes historical data and trends.
6. **Recommendations**: Provides actionable recommendations for issues.

## Monitoring Health Status

### Overall Status

The overall health status is displayed prominently at the top of the dashboard:

![Health Status](../images/health-status.png)

The status can be one of the following:

- **OK** (Green): All components are functioning properly.
- **Warning** (Yellow): Some components have minor issues.
- **Error** (Red): One or more components have critical issues.
- **Critical** (Dark Red): Multiple critical issues detected.
- **Unknown** (Gray): Status cannot be determined.

### Component Status

The component status section shows the status of individual components:

![Component Status](../images/component-status.png)

Each component has its own status indicator and details:

- **Environment**: Configuration and environment variables
- **Authentication**: Authentication status with Google Cloud
- **Embedding**: Embedding generation functionality
- **Search**: Search functionality and results

Click on a component to view detailed information about its status and metrics.

## Analyzing Metrics

### Key Metrics

The key metrics section displays important performance metrics:

![Key Metrics](../images/key-metrics.png)

- **Response Time**: Time taken to complete a health check
- **Success Rate**: Percentage of successful checks
- **Health Percentage**: Percentage of "OK" status over time

Each metric includes a trend indicator:

- **Improving** (Green Up Arrow): Metric is improving
- **Degrading** (Red Down Arrow): Metric is degrading
- **Stable** (Gray Right Arrow): Metric is stable

### Historical Charts

The charts section visualizes historical data and trends:

![Historical Charts](../images/historical-charts.png)

- **Response Time History**: Shows response time over time
- **Success Rate History**: Shows success rate over time
- **Status Distribution**: Shows distribution of status values

Use the time range selector to adjust the time period displayed in the charts.

## Understanding Recommendations

The recommendations section provides actionable recommendations for issues:

![Recommendations](../images/recommendations.png)

Each recommendation includes:

- **Priority**: High (Red), Medium (Orange), or Low (Yellow)
- **Title**: Brief description of the issue
- **Action**: Recommended action to resolve the issue

Click on a recommendation to view detailed information about the issue and how to resolve it.

## Common Tasks

### Refreshing the Dashboard

To refresh the dashboard with the latest data:

1. Click the "Refresh" button in the top-right corner of the dashboard.
2. The dashboard will reload with the latest data.

### Running a Health Check

To run a manual health check:

1. Click the "Run Health Check" button in the top-right corner of the dashboard.
2. The dashboard will display a progress indicator while the health check is running.
3. Once complete, the dashboard will update with the latest results.

### Changing Your Password

To change your password:

1. Click on your username in the top-right corner of the dashboard.
2. Select "Change Password" from the dropdown menu.
3. Enter your current password and new password.
4. Click "Change Password" to save your changes.

### Logging Out

To log out of the dashboard:

1. Click on your username in the top-right corner of the dashboard.
2. Select "Logout" from the dropdown menu.
3. You will be redirected to the login page.

## Alert Levels and Recommended Actions

### OK Status

- **Description**: All components are functioning properly.
- **Recommended Action**: No action required.

### Warning Status

- **Description**: Some components have minor issues.
- **Recommended Action**: Review the recommendations and address them at your convenience.

### Error Status

- **Description**: One or more components have critical issues.
- **Recommended Action**: Address the issues as soon as possible to prevent service disruption.

### Critical Status

- **Description**: Multiple critical issues detected.
- **Recommended Action**: Immediate action required to restore service.

## Troubleshooting

### Login Issues

If you cannot log in to the dashboard:

1. Verify that you are using the correct username and password.
2. Check that the dashboard server is running.
3. Clear your browser cache and cookies.
4. Contact your administrator if the issue persists.

### No Data Displayed

If the dashboard does not display any data:

1. Check that the Vector Search system is running.
2. Verify that the monitoring service is running.
3. Check the logs for any errors.
4. Run a manual health check to refresh the data.

### Slow Dashboard Performance

If the dashboard is slow to load:

1. Check your network connection.
2. Reduce the time range for historical data.
3. Close other browser tabs and applications.
4. Clear your browser cache.

### Incorrect Status

If the dashboard displays an incorrect status:

1. Run a manual health check to refresh the data.
2. Check the component status for more details.
3. Verify that the Vector Search system is configured correctly.
4. Check the logs for any errors.

## Advanced Features

### API Access

The dashboard provides an API for programmatic access:

1. See the [Monitoring API](../api/monitoring-api.md) documentation for details.
2. Use the API to integrate with other monitoring systems.
3. Build custom dashboards and alerts.

### Custom Time Ranges

To view data for a custom time range:

1. Click the time range selector in the top-right corner of the charts.
2. Select a predefined range or specify a custom range.
3. Click "Apply" to update the charts.

### Exporting Data

To export dashboard data:

1. Click the "Export" button in the top-right corner of the dashboard.
2. Select the data format (JSON, CSV, or PDF).
3. Choose the time range for the export.
4. Click "Export" to download the data.

## Getting Help

If you need help with the dashboard:

1. Click the "Help" button in the top-right corner of the dashboard.
2. Review the documentation and FAQs.
3. Contact your administrator for assistance.
4. Submit a support ticket if the issue persists.
