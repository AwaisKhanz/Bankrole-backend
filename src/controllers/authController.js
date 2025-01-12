require("dotenv").config();

const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Betting = require("../models/Bet");
const Bankroll = require("../models/Bankroll");
const crypto = require("crypto");
const stripe = require("../config/stripe");
const { sendEmail } = require("../utils/emailService");
const passwordResetTemplate = require("../utils/emailTemplates/passwordResetTemplate");

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ message: "Username already in use" });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const stripeCustomer = await stripe.customers.create({
      email,
      description: `Customer for ${email}`,
    });

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      subscription: { customerId: stripeCustomer.id },
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    const errorMessage = error.message || "An unknown error occurred";
    res.status(500).json({ message: errorMessage });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).json({ token });
  } catch (error) {
    const errorMessage = error.message || "An unknown error occurred";
    res.status(500).json({ message: errorMessage });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("-password").lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (error) {
    const errorMessage = error.message || "An unknown error occurred";
    res.status(500).json({ message: errorMessage });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { search = "", limit = 10, page = 1 } = req.query;

    // Convert limit and page to numbers
    const pageSize = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    // Build the search query
    const matchStage = search
      ? {
          $or: [
            { username: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Use aggregation to fetch users with bankrolls and bettings
    const usersWithDetails = await User.aggregate([
      { $match: matchStage }, // Apply search filter
      {
        $lookup: {
          from: "bankrolls",
          localField: "_id",
          foreignField: "userId",
          as: "bankrolls",
        },
      }, // Join bankrolls
      {
        $lookup: {
          from: "bets",
          localField: "_id",
          foreignField: "userId",
          as: "bettings",
        },
      }, // Join bettings
      { $skip: (currentPage - 1) * pageSize }, // Pagination skip
      { $limit: pageSize }, // Pagination limit
      {
        $project: {
          password: 0, // Exclude sensitive fields
        },
      },
    ]);

    // Calculate total count separately
    const totalUsers = await User.countDocuments(matchStage);

    // Respond with data
    res.status(200).json({
      users: usersWithDetails,
      totalUsers, // Total number of users matching the query
      totalPages: Math.ceil(totalUsers / pageSize), // Total number of pages
      currentPage, // Current page
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure the user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete the user
    await User.findByIdAndDelete(id);

    // Optionally, delete related data (bankrolls and bets)
    await Bankroll.deleteMany({ userId: id });
    await Betting.deleteMany({ userId: id });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour

    await user.save();

    // Reset password URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const emailContent = passwordResetTemplate(user.username, resetUrl);

    await sendEmail(user.email, "Password Reset Request", emailContent);

    res
      .status(200)
      .json({ message: "Password reset link sent to your email." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with matching token and valid expiry
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset fields
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({ message: "Username already in use" });
      }
      user.username = username;
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
      user.email = email;
    }

    await user.save();

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
