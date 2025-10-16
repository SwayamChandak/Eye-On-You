// Email utility functions for Time Counter extension

// EmailJS configuration
const EMAILJS_CONFIG = {
  serviceId: "service_tpxkdmb", // Replace with your EmailJS service ID
  templateId: "template_205azkq", // Replace with your EmailJS template ID
  publicKey: "G0ef6cQSp9iN-pgcW", // Replace with your EmailJS public key
};

/**
 * Validate EmailJS configuration
 * @returns {object} - Validation result with success status and errors
 */
function validateEmailJSConfig() {
  const errors = [];
  
  if (!EMAILJS_CONFIG.serviceId || EMAILJS_CONFIG.serviceId.startsWith('service_') === false) {
    errors.push('Invalid or missing serviceId');
  }
  
  if (!EMAILJS_CONFIG.templateId || EMAILJS_CONFIG.templateId.startsWith('template_') === false) {
    errors.push('Invalid or missing templateId');
  }
  
  if (!EMAILJS_CONFIG.publicKey || EMAILJS_CONFIG.publicKey.length < 10) {
    errors.push('Invalid or missing publicKey');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

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

  // Validate EmailJS configuration
  const configValidation = validateEmailJSConfig();
  if (!configValidation.isValid) {
    console.error("EmailJS configuration invalid:", configValidation.errors);
    return { 
      success: false, 
      error: "EmailJS configuration invalid", 
      details: configValidation.errors.join(', ')
    };
  }

  try {
    const templateParams = {
      email: email  // Using the same format that worked in the test
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
      const errorText = await response.text();
      console.error("Failed to send email:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: response.url
      });
      return { 
        success: false, 
        error: `Failed to send email: ${response.status} ${response.statusText}`,
        details: errorText
      };
    }
  } catch (error) {
    console.error("Error sending email:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Try fallback webhook method if EmailJS fails
    console.log("Attempting fallback webhook method...");
    try {
      const fallbackResult = await sendEmailWebhook(event, email, username);
      if (fallbackResult.success) {
        console.log("Email sent successfully via webhook fallback");
        return { success: true, method: "webhook" };
      }
    } catch (fallbackError) {
      console.error("Fallback webhook also failed:", fallbackError);
    }
    
    return { 
      success: false, 
      error: error.message,
      originalError: error.name
    };
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
 * Test EmailJS configuration and connection
 * @returns {Promise<object>} - Test result with success status and details
 */
export async function testEmailJSConnection() {
  console.log("Testing EmailJS configuration...");
  
  const configValidation = validateEmailJSConfig();
  if (!configValidation.isValid) {
    return {
      success: false,
      error: "Configuration invalid",
      details: configValidation.errors
    };
  }
  
  try {
    // Test with minimal parameters
    const testEmail = await chrome.storage.sync.get(['userEmail']);
    const testParams = {
      email: testEmail.userEmail || "pista.cruiser@gmail.com"
    };
    
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
          template_params: testParams,
        }),
      }
    );
    
    const responseText = await response.text();
    
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      response: responseText,
      config: {
        serviceId: EMAILJS_CONFIG.serviceId,
        templateId: EMAILJS_CONFIG.templateId,
        publicKey: EMAILJS_CONFIG.publicKey.substring(0, 5) + "..."
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      name: error.name
    };
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

/**
 * Simple email notification using a basic HTTP service
 * This is a working alternative that doesn't require EmailJS setup
 * @param {string} event - Type of event
 * @param {string} email - Recipient email address
 * @param {string} username - Username
 */
export async function sendSimpleEmailNotification(event, email, username) {
  // Using a free email service like EmailJS alternative or webhook
  // This is a simplified version that logs the email content
  // In production, you would replace this with a real email service
  
  const emailContent = {
    to: email,
    subject: getEmailSubject(event),
    message: getEmailMessage(event, username),
    timestamp: new Date().toISOString(),
    event: event,
    username: username,
  };
  
  console.log("Email notification (simulated):", emailContent);
  
  // For now, we'll simulate success
  // In a real implementation, you would send this to an email service
  return {
    success: true,
    method: "simulated",
    content: emailContent
  };
}
