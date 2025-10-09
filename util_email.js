// Email utility functions for Time Counter extension

// EmailJS configuration
const EMAILJS_CONFIG = {
  serviceId: "service_your_service_id", // Replace with your EmailJS service ID
  templateId: "template_your_template_id", // Replace with your EmailJS template ID
  publicKey: "your_public_key", // Replace with your EmailJS public key
};

/**
 * Send email notification using EmailJS
 * @param {string} event - Type of event (password_change, clear_data)
 * @param {string} email - Recipient email address
 * @param {string} username - Username associated with the event
 */
export async function sendEmailNotification(event, email, username) {
  if (!email || !isValidEmail(email)) {
    console.error("Invalid email address:", email);
    return { success: false, error: "Invalid email address" };
  }

  try {
    const templateParams = {
      to_email: email,
      username: username || "User",
      event_type: event,
      timestamp: new Date().toLocaleString(),
      subject: getEmailSubject(event),
      message: getEmailMessage(event, username),
    };

    // For Chrome extension, we'll use a simple fetch approach
    // Note: This is a basic implementation. In production, you'd want to use
    // a more secure method like a backend service or EmailJS SDK
    const response = await fetch(
      "https://api.emailjs.com/api/v1.0/email/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: EMAILJS_CONFIG.serviceId,
          template_id: EMAILJS_CONFIG.templateId,
          user_id: EMAILJS_CONFIG.publicKey,
          template_params: templateParams,
        }),
      }
    );

    if (response.ok) {
      console.log("Email sent successfully");
      return { success: true };
    } else {
      console.error("Failed to send email:", response.statusText);
      return { success: false, error: "Failed to send email" };
    }
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get email subject based on event type
 * @param {string} event - Event type
 * @returns {string} - Email subject
 */
function getEmailSubject(event) {
  switch (event) {
    case "password_change":
      return "Time Counter - Password Changed";
    case "clear_data":
      return "Time Counter - Data Cleared";
    default:
      return "Time Counter - Notification";
  }
}

/**
 * Get email message based on event type
 * @param {string} event - Event type
 * @param {string} username - Username
 * @returns {string} - Email message
 */
function getEmailMessage(event, username) {
  const timestamp = new Date().toLocaleString();

  switch (event) {
    case "password_change":
      return `Hello ${username || "User"},

Your password for the Time Counter extension has been successfully changed.

Time: ${timestamp}

If you did not make this change, please secure your account immediately.

Best regards,
Time Counter Extension`;

    case "clear_data":
      return `Hello ${username || "User"},

All tracking data in your Time Counter extension has been cleared.

Time: ${timestamp}

This action was performed using your credentials. If you did not authorize this action, please check your account security.

Best regards,
Time Counter Extension`;

    default:
      return `Hello ${username || "User"},

A notification event has occurred in your Time Counter extension.

Event: ${event}
Time: ${timestamp}

Best regards,
Time Counter Extension`;
  }
}

/**
 * Alternative method using a simple webhook approach
 * This is a fallback method that doesn't require EmailJS
 * @param {string} event - Type of event
 * @param {string} email - Recipient email address
 * @param {string} username - Username
 */
export async function sendEmailWebhook(event, email, username) {
  // This is a placeholder for a webhook-based email service
  // You would replace this with your actual webhook URL
  const webhookUrl = "https://your-webhook-service.com/send-email";

  try {
    const payload = {
      to: email,
      subject: getEmailSubject(event),
      message: getEmailMessage(event, username),
      timestamp: new Date().toISOString(),
      event: event,
      username: username,
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return {
      success: response.ok,
      error: response.ok ? null : response.statusText,
    };
  } catch (error) {
    console.error("Webhook email error:", error);
    return { success: false, error: error.message };
  }
}
