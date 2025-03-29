const welcomeTemplate = (username, email, password) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Quantara</title>
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

    /* Credentials styling */
    .credentials {
      text-align: left;
      margin: 20px auto;
      max-width: 400px;
      padding: 10px;
      background-color: #f9f9f9;
      border-radius: 6px;
    }

    .credentials p {
      margin: 5px 0;
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
      <img src="https://ik.imagekit.io/Quantara/logo_black.png?updatedAt=1736687139451" alt="Quantara Logo">
    </div>

    <!-- Main Content -->
    <h2>Welcome to Quantara, ${username}!</h2>
    <p>Hello <strong>${username}</strong>,</p>
    <p>We’re excited to have you on board! Your account has been created by an administrator. Below are your login details:</p>
    
    <div class="credentials">
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Password:</strong> ${password}</p>
    </div>
    
    <p>Please log in and change your password for security purposes:</p>
    <a href="${process.env.FRONTEND_URL}/login" class="button">Log In Now</a>
    
    <p>If you have any questions, feel free to contact our support team.</p>

    <!-- Footer -->
    <div class="footer">
      <p>© ${new Date().getFullYear()} Quantara. All rights reserved.</p>
      <p><a href="https://bankrole-frontend.onrender.com/" style="color: #2e75ba;">Visit our website</a></p>
    </div>
  </div>
</body>
</html>
`;

module.exports = welcomeTemplate;
