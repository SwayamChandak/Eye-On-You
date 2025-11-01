// Email utility for browser extension
// Sends emails directly using EmailJS from the browser

// EmailJS configuration
const EMAILJS_CONFIG = {
  serviceId: "service_tpxkdmb",
  templateId: "template_205azkq",
  publicKey: "G0ef6cQSp9iN-pgcW",
};

/**
 * Validate EmailJS configuration
 * @returns {object} - Validation result with success status and errors
 */
function validateEmailJSConfig() {
  const errors = [];

  if (
    !EMAILJS_CONFIG.serviceId ||
    EMAILJS_CONFIG.serviceId.startsWith("service_") === false
  ) {
    errors.push("Invalid or missing serviceId");
  }

  if (
    !EMAILJS_CONFIG.templateId ||
    EMAILJS_CONFIG.templateId.startsWith("template_") === false
  ) {
    errors.push("Invalid or missing templateId");
  }

  if (!EMAILJS_CONFIG.publicKey || EMAILJS_CONFIG.publicKey.length < 10) {
    errors.push("Invalid or missing publicKey");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
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
 * Send email notification directly using EmailJS
 * @param {string} event - Event type (e.g., 'clear_data', 'password_change')
 * @param {string} email - Recipient email address
 * @param {string} username - Username for the notification
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendEmailNotification(event, email, username) {
  if (!email || !isValidEmail(email)) {
    console.error("Invalid email address:", email);
    return { success: false, error: "Invalid email address" };
  }

  // Validate EmailJS configuration
  const configValidation = validateEmailJSConfig();
  if (!configValidation.isValid) {
    console.error("EmailJS configuration invalid:", configValidation.errors);
    return {
      success: false,
      error: "EmailJS configuration invalid",
      details: configValidation.errors.join(", "),
    };
  }

  try {
    const templateParams = {
      email: email,  // EmailJS template expects 'email' parameter
      username: username || "User",
      event: event,
      timestamp: new Date().toLocaleString(),
    };

    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
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
    });

    if (response.ok) {
      console.log("Email sent successfully");
      return { success: true };
    } else {
      const errorText = await response.text();
      console.error("Failed to send email:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return {
        success: false,
        error: `Failed to send email: ${response.status} ${response.statusText}`,
        details: errorText,
      };
    }
  } catch (error) {
    console.error("Error sending email:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    return {
      success: false,
      error: error.message,
      originalError: error.name,
    };
  }
}
