# Email Setup Guide for Time Counter Extension

## Overview
The Time Counter extension now includes email notification functionality that sends alerts when:
1. A password is changed
2. The "Clear" button is pressed to reset all tracking data

## Setup Instructions

### Option 1: Using EmailJS (Recommended)

1. **Create an EmailJS account**:
   - Go to [EmailJS.com](https://www.emailjs.com/)
   - Sign up for a free account

2. **Set up email service**:
   - Create a new email service (Gmail, Outlook, etc.)
   - Note down your Service ID

3. **Create email template**:
   - Create a new template with the following template variables:
     - `{{to_email}}` - Recipient email address
     - `{{username}}` - Username
     - `{{event_type}}` - Event type (password_change or clear_data)
     - `{{timestamp}}` - When the event occurred
     - `{{subject}}` - Email subject
     - `{{message}}` - Email message content

4. **Configure the extension**:
   - Open `util_email.js`
   - Replace the placeholder values in `EMAILJS_CONFIG`:
     ```javascript
     const EMAILJS_CONFIG = {
       serviceId: 'your_actual_service_id',
       templateId: 'your_actual_template_id',
       publicKey: 'your_actual_public_key'
     };
     ```

### Option 2: Using a Custom Webhook

1. **Set up a webhook service**:
   - Create a webhook endpoint that accepts POST requests
   - The endpoint should handle email sending (using services like SendGrid, Mailgun, etc.)

2. **Configure the extension**:
   - Open `util_email.js`
   - Update the `webhookUrl` in the `sendEmailWebhook` function:
     ```javascript
     const webhookUrl = 'https://your-webhook-service.com/send-email';
     ```

3. **Use webhook method**:
   - In `util_email.js`, modify the `sendEmailNotification` function to use `sendEmailWebhook` instead of the EmailJS approach

## Usage

1. **Set up email notifications**:
   - Open the extension options page
   - Enter your email address in the "Email (for notifications)" field
   - Save your credentials

2. **Email notifications will be sent when**:
   - You change your password (only if email is provided)
   - You press the "Clear" button to reset tracking data (requires authentication)

## Email Content

The extension sends different email templates based on the event:

### Password Change Notification
- **Subject**: "Time Counter - Password Changed"
- **Content**: Confirms password change with timestamp and security reminder

### Data Clear Notification
- **Subject**: "Time Counter - Data Cleared"
- **Content**: Confirms all tracking data has been cleared with timestamp

## Security Notes

- Email addresses are stored locally in the browser
- Email notifications are only sent to the email address you provide
- All email sending happens through your configured service (EmailJS or webhook)
- The extension does not store or transmit any email content to external servers

## Troubleshooting

1. **Emails not sending**:
   - Check your EmailJS configuration in `util_email.js`
   - Verify your email service is properly configured
   - Check browser console for error messages

2. **Permission errors**:
   - Ensure the extension has the necessary host permissions in `manifest.json`
   - The extension needs permission to access `https://api.emailjs.com/*` for EmailJS

3. **Template issues**:
   - Verify your EmailJS template uses the correct variable names
   - Test your template in the EmailJS dashboard

## Development Notes

- The email functionality is implemented in `util_email.js`
- Email sending is handled in the background service worker (`background.js`)
- Email triggers are implemented in `options.js` (password changes) and `popup.js` (clear button)
- All email operations are asynchronous and include error handling



service_tpxkdmb