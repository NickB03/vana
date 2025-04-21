# VANA Startup Scripts

These scripts provide an easy way to start the VANA Multi-Agent System with a single click.

## Setup Instructions

### For macOS Users

1. Copy the `start_vana.command` file to your VANA project root directory (where the `.env` file is located)
2. Make sure the script is executable:
   ```bash
   chmod +x start_vana.command
   ```
3. Create a shortcut to this file on your desktop:
   - Right-click on `start_vana.command`
   - Select "Make Alias"
   - Drag the alias to your desktop

4. Double-click the shortcut on your desktop to start the VANA system

### For Windows Users

1. Copy the `start_vana.bat` file to your VANA project root directory (where the `.env` file is located)
2. Create a shortcut to this file on your desktop:
   - Right-click on `start_vana.bat`
   - Select "Create shortcut"
   - Drag the shortcut to your desktop

3. Double-click the shortcut on your desktop to start the VANA system

## What the Scripts Do

These startup scripts perform the following actions:

1. Navigate to the VANA project directory
2. Check if Python is installed and verify its version
3. Create a virtual environment if it doesn't exist
4. Activate the virtual environment
5. Install or update required packages
6. Verify the existence of the `.env` file
7. Check if the service account key for Vector Search is available
8. Start the ADK web interface on http://localhost:8000

## Troubleshooting

If you encounter any issues:

1. Make sure the script is in the correct location (VANA project root directory)
2. Verify that Python 3.9 or higher is installed and in your PATH
3. Check that your `.env` file exists and contains the correct configuration
4. Ensure the service account key file is in the `secrets` directory
5. If the ADK web interface fails to start, check that port 8000 is not already in use

## Customization

You can modify these scripts to:

- Change the port number (modify the `adk web` command)
- Add additional checks or setup steps
- Customize the appearance of the terminal window
