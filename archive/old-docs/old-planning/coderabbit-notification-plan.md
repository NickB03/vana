# CodeRabbit Review Completion Notification Plan

## Overview
Simple plan to receive notifications (SMS or Push) when CodeRabbit finishes reviewing PRs on the `NickB03/vana` repository.

## Current Setup
- **Repository**: NickB03/vana (private)
- **CodeRabbit**: Already integrated as GitHub App
- **Need**: Notification ONLY when review completes (not when it starts)

## Notification Options

### Option 1: Push Notifications (Recommended - Free & Simple)
**Tools**: GitHub Mobile App + GitHub Actions

#### Setup Steps:
1. **Install GitHub Mobile App**
   - iOS: Download from App Store
   - Android: Download from Google Play
   - Sign in with your GitHub account
   - Enable push notifications for your account

2. **Create GitHub Action Workflow**
   ```yaml
   # .github/workflows/coderabbit-notify.yml
   name: CodeRabbit Review Notification
   
   on:
     issue_comment:
       types: [created]
     pull_request_review_comment:
       types: [created]
   
   jobs:
     notify:
       if: github.event.comment.user.login == 'coderabbitai'
       runs-on: ubuntu-latest
       steps:
         - name: Check if review complete
           if: contains(github.event.comment.body, 'Summary by CodeRabbit')
           uses: actions/github-script@v7
           with:
             script: |
               await github.rest.issues.createComment({
                 owner: context.repo.owner,
                 repo: context.repo.repo,
                 issue_number: context.issue.number,
                 body: '🔔 @NickB03 CodeRabbit review complete!'
               })
   ```

3. **Enable Notifications**
   - Go to GitHub Settings → Notifications
   - Enable "Participating" notifications
   - GitHub Mobile will push notify when @mentioned

### Option 2: SMS Notifications (Costs Money)
**Tools**: GitHub Actions + Twilio

#### Setup Steps:
1. **Create Twilio Account**
   - Sign up at twilio.com
   - Get phone number ($1/month)
   - Note Account SID, Auth Token, Phone Number

2. **Add GitHub Secrets**
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_FROM=+1234567890
   TWILIO_PHONE_TO=+0987654321
   ```

3. **Create GitHub Action**
   ```yaml
   # .github/workflows/coderabbit-sms.yml
   name: CodeRabbit SMS Alert
   
   on:
     issue_comment:
       types: [created]
     pull_request_review_comment:
       types: [created]
   
   jobs:
     send-sms:
       if: github.event.comment.user.login == 'coderabbitai'
       runs-on: ubuntu-latest
       steps:
         - name: Check for review completion
           if: contains(github.event.comment.body, 'Summary by CodeRabbit')
           uses: twilio-labs/actions-sms@v1
           with:
             fromPhoneNumber: ${{ secrets.TWILIO_PHONE_FROM }}
             toPhoneNumber: ${{ secrets.TWILIO_PHONE_TO }}
             message: |
               CodeRabbit finished reviewing PR #${{ github.event.issue.number }}
               ${{ github.event.issue.title }}
           env:
             TWILIO_ACCOUNT_SID: ${{ secrets.TWILIO_ACCOUNT_SID }}
             TWILIO_AUTH_TOKEN: ${{ secrets.TWILIO_AUTH_TOKEN }}
   ```

### Option 3: Email-to-SMS (Free with Carrier)
**Tools**: GitHub Actions + Carrier Email Gateway

#### Setup Steps:
1. **Find Your Carrier's Email-to-SMS Gateway**
   - AT&T: `number@txt.att.net`
   - Verizon: `number@vtext.com`
   - T-Mobile: `number@tmomail.net`
   - Sprint: `number@messaging.sprintpcs.com`

2. **Create GitHub Action**
   ```yaml
   # .github/workflows/coderabbit-email-sms.yml
   name: CodeRabbit Email to SMS
   
   on:
     issue_comment:
       types: [created]
   
   jobs:
     email-sms:
       if: github.event.comment.user.login == 'coderabbitai' && 
           contains(github.event.comment.body, 'Summary by CodeRabbit')
       runs-on: ubuntu-latest
       steps:
         - name: Send Email to SMS
           uses: dawidd6/action-send-mail@v3
           with:
             server_address: smtp.gmail.com
             server_port: 465
             username: ${{ secrets.EMAIL_USERNAME }}
             password: ${{ secrets.EMAIL_PASSWORD }}
             subject: CR Done
             to: 1234567890@vtext.com  # Your number@carrier
             from: GitHub Actions
             body: |
               PR #${{ github.event.issue.number }} reviewed
   ```

### Option 4: Pushover (Simple Push - $5 one-time)
**Tools**: Pushover App + GitHub Actions

#### Setup Steps:
1. **Get Pushover**
   - Buy app ($4.99 one-time)
   - Create account at pushover.net
   - Get User Key and create App Token

2. **Create GitHub Action**
   ```yaml
   # .github/workflows/coderabbit-pushover.yml
   name: CodeRabbit Pushover Alert
   
   on:
     issue_comment:
       types: [created]
   
   jobs:
     pushover:
       if: github.event.comment.user.login == 'coderabbitai' && 
           contains(github.event.comment.body, 'Summary by CodeRabbit')
       runs-on: ubuntu-latest
       steps:
         - name: Send Pushover notification
           run: |
             curl -s -X POST https://api.pushover.net/1/messages.json \
               -d "token=${{ secrets.PUSHOVER_TOKEN }}" \
               -d "user=${{ secrets.PUSHOVER_USER }}" \
               -d "title=CodeRabbit Review Complete" \
               -d "message=PR #${{ github.event.issue.number }} reviewed" \
               -d "url=${{ github.event.issue.html_url }}" \
               -d "url_title=View PR"
   ```

## Detection Logic

CodeRabbit completion indicators to watch for:
- Comment contains `"Summary by CodeRabbit"`
- Comment from user `coderabbitai`
- Comment contains review metrics/stats
- Comment has the characteristic CodeRabbit footer

## Quick Implementation Guide

### Fastest Setup (5 minutes):
1. Install GitHub Mobile App
2. Add workflow file to `.github/workflows/`
3. Push to repository
4. Test with a PR

### Most Reliable:
- Use Option 1 (GitHub Mobile) or Option 4 (Pushover)
- Both have native push support
- No SMS carrier issues

### Most Cost-Effective:
- Option 1: Free with GitHub Mobile
- Option 3: Free with carrier email gateway

## Testing

1. Create a test PR
2. Wait for CodeRabbit to review
3. Verify notification received
4. Adjust detection logic if needed

## Troubleshooting

- **No notification**: Check GitHub Action logs
- **Wrong timing**: Refine the detection logic
- **Multiple notifications**: Add debouncing logic
- **SMS not received**: Check carrier gateway address

## Next Steps

1. Choose notification method based on preferences
2. Create the workflow file in repository
3. Configure secrets if needed
4. Test with a real PR
5. Adjust as needed