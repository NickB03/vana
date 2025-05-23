# Scheduled Tasks Guide

[Home](../../index.md) > [Guides](../index.md) > Scheduled Tasks

This guide explains how to set up and manage scheduled tasks in VANA, with a primary focus on the `ScheduledVectorSearchMonitor` script (`scripts/scheduled_vector_search_monitor.py`). Scheduled tasks are essential for automating routine operations like health checks and monitoring.

## 1. Overview of Scheduled Tasks in VANA

Currently, the main scheduled task in VANA is the periodic health monitoring of the Vertex AI Vector Search service. This is performed by the `ScheduledVectorSearchMonitor` script. The goal is to run this script automatically at regular intervals.

## 2. `ScheduledVectorSearchMonitor` Script

*   **Purpose:** This script automatically performs health checks on the Vector Search integration at defined intervals. It uses the `VectorSearchHealthChecker` to conduct these checks.
*   **Location:** `scripts/scheduled_vector_search_monitor.py`
*   **Key Functionalities:**
    *   Runs health checks periodically (e.g., every 15 minutes, 1 hour).
    *   Logs the results of each health check.
    *   Can be configured to trigger alerts (e.g., via email, Slack, or other notification systems - specific alert mechanisms depend on implementation within the script or integrated alerting tools) if issues are detected.
    *   The interval and alert methods are typically configurable via command-line arguments.

### 2.1. Command-Line Arguments (Example)

The script likely accepts command-line arguments to control its behavior. Common arguments might include:
*   `--interval MINUTES`: The time interval in minutes between health checks (e.g., `15` for 15 minutes).
*   `--mode {basic|detailed}`: The level of detail for the health check (similar to `test_vector_search_health.py`).
*   `--alert-method {log|email|slack|all}`: How to send alerts if issues are found (specific options depend on implementation).
*   `--config PATH_TO_CONFIG`: Path to a specific configuration file if not solely relying on `.env`.

Example usage from the command line (manual run):
```bash
# Ensure virtual environment is activated
source .venv/bin/activate

# Run with a 30-minute interval, detailed checks, and log-based alerting
python scripts/scheduled_vector_search_monitor.py --interval 30 --mode detailed --alert-method log
```
*Always check the script's help message for the most up-to-date arguments:*
```bash
python scripts/scheduled_vector_search_monitor.py --help
```

## 3. Setting Up Scheduled Execution

To run `ScheduledVectorSearchMonitor` (or other future VANA scripts) automatically, you need to use a task scheduling mechanism provided by your operating system or a dedicated scheduling tool.

### 3.1. Using `cron` (Linux/macOS)

`cron` is a time-based job scheduler in Unix-like operating systems.

1.  **Open your crontab for editing:**
    ```bash
    crontab -e
    ```

2.  **Add a new cron job entry.** A cron job entry has five time-and-date fields, followed by the command to be run.
    ```
    # ┌───────────── minute (0 - 59)
    # │ ┌───────────── hour (0 - 23)
    # │ │ ┌───────────── day of the month (1 - 31)
    # │ │ │ ┌───────────── month (1 - 12)
    # │ │ │ │ ┌───────────── day of the week (0 - 6) (Sunday to Saturday; 7 is also Sunday on some systems)
    # │ │ │ │ │
    # │ │ │ │ │
    # * * * * *  command_to_execute
    ```

3.  **Example Cron Job Entry:**
    To run the `ScheduledVectorSearchMonitor` every 15 minutes, with detailed mode and log alerting:
    ```cron
    */15 * * * * /usr/bin/python3 /full/path/to/vana/scripts/scheduled_vector_search_monitor.py --interval 15 --mode detailed --alert-method log >> /full/path/to/vana/logs/scheduled_monitor.log 2>&1
    ```
    **Explanation of the example:**
    *   `*/15 * * * *`: Runs the command every 15 minutes.
    *   `/usr/bin/python3`: **Use the absolute path to your Python interpreter (preferably the one from your project's virtual environment if you can ensure it's sourced correctly, or a system Python that has access to the necessary libraries if the script is self-contained or manages its venv activation).**
        *   **Important for Virtual Environments:** Running Python scripts from `cron` with virtual environments can be tricky. The `cron` environment is minimal and won't have your virtual environment activated by default.
        *   **Option 1 (Recommended for venv):** Create a wrapper shell script that activates the venv and then runs the Python script.
            ```bash
            # wrapper_monitor.sh - place this in your vana/scripts/ directory
            #!/bin/bash
            cd /full/path/to/vana/
            source .venv/bin/activate
            python scripts/scheduled_vector_search_monitor.py --interval 15 --mode detailed --alert-method log
            deactivate # Optional: good practice
            ```
            Make `wrapper_monitor.sh` executable (`chmod +x scripts/wrapper_monitor.sh`). Then your cron job would be:
            ```cron
            */15 * * * * /full/path/to/vana/scripts/wrapper_monitor.sh >> /full/path/to/vana/logs/scheduled_monitor.log 2>&1
            ```
        *   **Option 2:** Directly use the Python interpreter from the virtual environment:
            ```cron
            */15 * * * * /full/path/to/vana/.venv/bin/python /full/path/to/vana/scripts/scheduled_vector_search_monitor.py --interval 15 --mode detailed --alert-method log >> /full/path/to/vana/logs/scheduled_monitor.log 2>&1
            ```
    *   `/full/path/to/vana/scripts/scheduled_vector_search_monitor.py`: **Use the absolute path to your script.**
    *   `--interval 15 --mode detailed --alert-method log`: Command-line arguments for the script.
    *   `>> /full/path/to/vana/logs/scheduled_monitor.log 2>&1`: Redirects standard output (`stdout`) and standard error (`stderr`) to a log file. This is crucial for debugging. Ensure the `logs` directory exists and is writable.

4.  **Save and exit the crontab editor.** The cron daemon will automatically pick up the changes.

5.  **Verify:** You can list your cron jobs using `crontab -l`. Check the log file (`/full/path/to/vana/logs/scheduled_monitor.log`) after the first scheduled run to ensure it's working.

### 3.2. Using Task Scheduler (Windows)

Windows uses Task Scheduler for automating tasks.

1.  Open **Task Scheduler** (search for it in the Start Menu).
2.  In the Actions pane, click **Create Basic Task...** or **Create Task...** (for more advanced options).
3.  **Name and Description:** Give your task a name (e.g., "VANA Vector Search Monitor") and description.
4.  **Trigger:** Define when the task should run (e.g., Daily, Weekly, At startup, On a schedule). For periodic runs like every 15 minutes:
    *   Choose "Daily" or set it up to repeat.
    *   You might need to set it to run once, and then in the task properties, set it to repeat every X minutes for a duration of 24 hours.
5.  **Action:**
    *   Select "Start a program".
    *   **Program/script:** Specify the absolute path to the Python interpreter in your virtual environment (e.g., `C:\path\to\vana\.venv\Scripts\python.exe`).
    *   **Add arguments (optional):** Enter the absolute path to your script followed by its arguments (e.g., `C:\path\to\vana\scripts\scheduled_vector_search_monitor.py --interval 15 --mode detailed --alert-method log`).
    *   **Start in (optional):** Set this to the VANA project root directory (e.g., `C:\path\to\vana\`) to ensure the script runs with the correct working directory, especially for relative paths and `.env` loading.
6.  **Conditions and Settings:** Configure other settings as needed (e.g., run whether user is logged on or not, power settings).
7.  **Save the task.** You might be prompted for user credentials if the task needs to run with specific permissions.

### 3.3. Using Other Scheduling Tools (e.g., systemd timers, Supervisor, cloud schedulers)

*   **systemd timers (Linux):** A more modern alternative to `cron` on systemd-based Linux distributions. Involves creating a `.service` file and a `.timer` file.
*   **Supervisor:** A process control system that can manage and monitor long-running scripts. You could configure it to always keep your monitor script running.
*   **Cloud Schedulers (GCP Cloud Scheduler, AWS EventBridge):** If VANA is deployed in the cloud, use cloud-native schedulers to trigger your monitoring script (e.g., by invoking a Cloud Function or Cloud Run service that runs the script).

## 4. Logging and Monitoring Scheduled Tasks

*   **Output Redirection:** As shown in the `cron` example, always redirect `stdout` and `stderr` of your scheduled script to a log file. This is essential for troubleshooting.
    ```bash
    ... your_command >> /path/to/your_script.log 2>&1
    ```
*   **Application Logging:** The `ScheduledVectorSearchMonitor` script itself should use VANA's standard logging (`tools/logging/`) to record its activities, successes, and failures. These logs would go to the configured VANA log files.
*   **Alerting:** Ensure the alerting mechanism configured for the script (e.g., email, Slack) is working correctly so you are notified of issues.
*   **Regular Checks:** Periodically check the logs and the VANA Monitoring Dashboard to ensure the scheduled tasks are running as expected and the system remains healthy.

## 5. Environment Variables for Scheduled Tasks

*   Scheduled tasks often run in a minimal environment. Ensure that all necessary environment variables (from your `.env` file) are available to the script.
*   **`.env` Loading:** The `config/environment.py` module in VANA should load the `.env` file. If the script is run with the project root as its working directory, this usually works.
*   **Absolute Paths:** Use absolute paths for files and scripts in your scheduler configuration to avoid issues with working directories.
*   **Permissions:** Ensure the user account under which the scheduled task runs has the necessary permissions to read configuration files, write logs, and access network resources (like GCP).

By setting up scheduled execution for `ScheduledVectorSearchMonitor`, you automate a critical aspect of maintaining VANA's operational health.
