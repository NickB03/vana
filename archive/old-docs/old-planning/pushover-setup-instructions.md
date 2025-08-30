# Pushover Setup for CodeRabbit Notifications

## Step 1: Create Application Token on Pushover

1. Go to https://pushover.net/apps/build
2. Create a new application with these settings:
   - **Name**: CodeRabbit Notifier (or any name you prefer)
   - **Description**: GitHub CodeRabbit review completion notifications
   - **URL**: https://github.com/NickB03/vana (optional)
   - **Icon**: Upload a CodeRabbit or GitHub icon (optional)
3. Click "Create Application"
4. Copy the **API Token/Key** that appears (looks like: `azGDORePK8gMaC0QOYAMyEEuzJnyUi`)

## Step 2: Add Secrets to GitHub Repository

Go to: https://github.com/NickB03/vana/settings/secrets/actions/new

Add these two secrets:
1. **Name**: `PUSHOVER_TOKEN`
   **Value**: [Your App API Token from Step 1]

2. **Name**: `PUSHOVER_USER`
   **Value**: [Your User Key that you already have]

## Step 3: Create the GitHub Action Workflow

The workflow file has been created at:
`.github/workflows/coderabbit-pushover.yml`

This workflow will:
- Trigger when CodeRabbit posts a comment
- Check if it's a review completion (contains "Summary by CodeRabbit")
- Send a Pushover notification with:
  - Title: "🐰 CodeRabbit Review Complete"
  - Message: PR title and number
  - Priority: Normal (can be changed to high for sound/vibration)
  - URL: Direct link to the PR

## Step 4: Test the System

1. Create a test PR or wait for your next real PR
2. CodeRabbit will automatically review it
3. When CodeRabbit posts its summary, you'll get a Pushover notification
4. The notification will include a link to jump directly to the PR

## Customization Options

You can modify the workflow to:
- Change notification priority (add `-d "priority=1"` for high priority with sound)
- Add custom sounds (add `-d "sound=cosmic"` or other Pushover sounds)
- Include more PR details in the message
- Filter for specific types of reviews

## Troubleshooting

- **No notification received**: Check GitHub Actions tab for workflow runs and errors
- **Authentication failed**: Verify your PUSHOVER_TOKEN and PUSHOVER_USER secrets
- **Workflow not triggering**: Ensure the workflow file is in the default branch
- **Multiple notifications**: This shouldn't happen as we filter for the summary comment only