// Test script for debugging email functionality
// This script can be run in multiple ways (see instructions below)

// Import functions (this will work in browser with module support)
import { testEmailJSConnection, sendEmailNotification, sendSimpleEmailNotification } from './util_email.js';

// Test EmailJS configuration
async function testEmailSetup() {
  console.log("=== Testing EmailJS Configuration ===");
  const result = await testEmailJSConnection();
  console.log("Test result:", result);
  
  if (!result.success) {
    console.error("EmailJS test failed:", result.error);
    console.log("Configuration issues:", result.details);
  }
  
  return result;
}

// Test simple email notification (fallback)
async function testSimpleEmail() {
  console.log("=== Testing Simple Email Notification ===");
  const result = await sendSimpleEmailNotification(
    "test_event",
    "test@example.com",
    "Test User"
  );
  console.log("Simple email result:", result);
  return result;
}

// Test actual email sending
async function testActualEmail(email = "your-email@example.com") {
  console.log("=== Testing Actual Email Sending ===");
  const result = await sendEmailNotification(
    "password_change",
    email,
    "Test User"
  );
  console.log("Email sending result:", result);
  return result;
}

// Run all tests
async function runAllTests() {
  console.log("Starting email functionality tests...");
  
  // Test 1: EmailJS configuration
  const configTest = await testEmailSetup();
  
  // Test 2: Simple email (always works)
  const simpleTest = await testSimpleEmail();
  
  // Test 3: Actual email (only if you provide a real email)
  // Uncomment the line below and replace with your email
  // const actualTest = await testActualEmail("your-email@example.com");
  
  console.log("=== Test Summary ===");
  console.log("Configuration test:", configTest.success ? "PASS" : "FAIL");
  console.log("Simple email test:", simpleTest.success ? "PASS" : "FAIL");
  // console.log("Actual email test:", actualTest.success ? "PASS" : "FAIL");
  
  return {
    config: configTest,
    simple: simpleTest,
    // actual: actualTest
  };
}

// Export functions for use in browser console
if (typeof window !== 'undefined') {
  window.testEmailSetup = testEmailSetup;
  window.testSimpleEmail = testSimpleEmail;
  window.testActualEmail = testActualEmail;
  window.runAllTests = runAllTests;
  console.log("Email test functions loaded. Use runAllTests() to start testing.");
}

// Auto-run if this script is executed directly
if (typeof window === 'undefined') {
  // Running in Node.js or similar environment
  console.log("Running email tests...");
  runAllTests().catch(console.error);
}
