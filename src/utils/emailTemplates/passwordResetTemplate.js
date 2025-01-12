const passwordResetTemplate = (username, resetUrl) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
  <style>
    /* Reset some basic elements */
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
    }

    /* Container styling */
    .container {
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      text-align: center;
    }

    /* Header section */
    .header {
      background-color: #2e75ba; /* Matches your website's primary color */
      padding: 20px;
      border-radius: 12px 12px 0 0;
    }

    .header img {
      width: 150px;
      height: auto;
      object-fit: cover;
    }

    /* Content styling */
    h2 {
      color: #333333;
      margin-top: 20px;
    }

    p {
      color: #555555;
      line-height: 1.6;
      font-size: 16px;
    }

    /* Button styling */
    a.button {
      display: inline-block;
      padding: 12px 24px;
      margin-top: 20px;
      background-color: #007bff; /* Button color */
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      font-size: 16px;
    }

    a.button:hover {
      background-color: #0056b3;
    }

    /* Footer */
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #777777;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header with Logo -->
    <div class="header">
      <img src="https://ik.imagekit.io/Quantara/logo_black.png?updatedAt=1736687139451" alt="Company Logo">
    </div>

    <!-- Main Content -->
    <h2>Password Reset Request</h2>
    <p>Hello <strong>${username}</strong>,</p>
    <p>You recently requested to reset your password. Click the button below to reset it:</p>
    
    <a href="${resetUrl}" class="button">Reset Password</a>
    
    <p>If you didn't request this, you can safely ignore this email.</p>
    <p>This link will expire in 1 hour.</p>

    <!-- Footer -->
    <div class="footer">
      <p>© ${new Date().getFullYear()} Quantara. All rights reserved.</p>
      <p><a href="https://bankrole-frontend.onrender.com/" style="color: #2e75ba;">Visit our website</a></p>
    </div>
  </div>
</body>
</html>
`;

module.exports = passwordResetTemplate;
