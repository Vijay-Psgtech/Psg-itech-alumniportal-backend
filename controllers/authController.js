// backend/controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const axios = require("axios");
const User = require("../models/Users");
const Alumni = require("../models/Alumni");

// Initialize OAuth clients
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const FACEBOOK_VERIFY_URL = "https://graph.facebook.com/me";

// ══════════════════════════════════════════════════════════════════════════
// HELPER: Generate JWT Token
// ══════════════════════════════════════════════════════════════════════════
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role || "alumni",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ══════════════════════════════════════════════════════════════════════════
// REGISTER
// ══════════════════════════════════════════════════════════════════════════
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Check if user exists
    const existingUser = await Alumni.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new Alumni({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      alumniId: req.body.alumniId,
      isApproved: false,
    });

    await newUser.save();

    res.status(201).json({
      message: "Registration successful. Pending admin approval.",
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: "alumni",
        isApproved: newUser.isApproved,
      },
    });
  } catch (error) {
    console.error("❌ Register error:", error);
    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════
// LOGIN (Email/Password)
// ══════════════════════════════════════════════════════════════════════════
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Check both User (admin) and Alumni tables
    let user = await User.findOne({ email });
    let isAdmin = !!user;

    if (!user) {
      user = await Alumni.findOne({ email });
      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Check if alumni is approved (for alumni only)
    if (!isAdmin && !user.isApproved) {
      return res.status(403).json({
        message: "Your account is pending admin approval",
      });
    }

    // Generate JWT
    const token = generateToken(user);

    // Set HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log(`✅ User logged in: ${user.email}`);

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: isAdmin ? user.role : "alumni",
        isApproved: user.isApproved ?? true,
        profileImage: user.profileImage || null,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════
// SOCIAL LOGIN (Google & Facebook)
// ══════════════════════════════════════════════════════════════════════════
const socialLogin = async (req, res) => {
  try {
    const { provider, idToken, accessToken } = req.body;

    if (!provider) {
      return res.status(400).json({
        message: "Provider is required",
      });
    }

    let userData;

    // ═══════════════════════════════════════════════════════════════════════
    // GOOGLE VERIFICATION
    // ═══════════════════════════════════════════════════════════════════════
    if (provider === "google") {
      if (!idToken) {
        return res.status(400).json({
          message: "No ID token provided",
        });
      }

      try {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const nameParts = (payload.name || "").split(" ");

        userData = {
          email: payload.email,
          firstName: payload.given_name || nameParts[0] || "User",
          lastName: payload.family_name || nameParts[1] || "",
          googleId: payload.sub,
          profileImage: payload.picture || null,
          provider: "google",
        };

        console.log("✅ Google token verified for:", userData.email);
      } catch (error) {
        console.error("❌ Google token verification failed:", error.message);
        return res.status(401).json({
          message: "Invalid Google token",
          error: error.message,
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FACEBOOK VERIFICATION
    // ═══════════════════════════════════════════════════════════════════════
    else if (provider === "facebook") {
      if (!accessToken) {
        return res.status(400).json({
          message: "No access token provided",
        });
      }

      try {
        const response = await axios.get(FACEBOOK_VERIFY_URL, {
          params: {
            access_token: accessToken,
            fields: "id,name,email,picture.type(large)",
          },
        });

        const facebookData = response.data;

        if (!facebookData.id) {
          throw new Error("No user ID in Facebook response");
        }

        const nameParts = (facebookData.name || "").split(" ");

        userData = {
          email:
            facebookData.email ||
            `fb_${facebookData.id}@facebook.local`,
          firstName: nameParts[0] || "User",
          lastName: nameParts[1] || "",
          facebookId: facebookData.id,
          profileImage: facebookData.picture?.data?.url || null,
          provider: "facebook",
        };

        console.log(
          "✅ Facebook token verified for:",
          userData.email
        );
      } catch (error) {
        console.error(
          "❌ Facebook token verification failed:",
          error.message
        );
        return res.status(401).json({
          message: "Invalid Facebook token",
          error: error.message,
        });
      }
    } else {
      return res.status(400).json({
        message: `Unsupported provider: ${provider}`,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FIND OR CREATE USER (Alumni)
    // ═══════════════════════════════════════════════════════════════════════
    let user = await Alumni.findOne({ email: userData.email });

    if (user) {
      // Link social account to existing user
      const socialIdField = userData.provider + "Id";
      if (!user[socialIdField]) {
        user[socialIdField] = userData[socialIdField];
        if (userData.profileImage && !user.profileImage) {
          user.profileImage = userData.profileImage;
        }
        await user.save();
        console.log(
          `✅ Linked ${userData.provider}Id to existing user:`,
          user.email
        );
      }
    } else {
      // Create new user
      user = new Alumni({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImage: userData.profileImage,
        googleId:
          userData.provider === "google"
            ? userData.googleId
            : null,
        facebookId:
          userData.provider === "facebook"
            ? userData.facebookId
            : null,
        password: null, // No password for social logins
        role: "alumni",
        isApproved: false, // Pending admin approval
      });

      await user.save();
      console.log(
        `✅ New user created via ${userData.provider}:`,
        user.email
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GENERATE JWT & SET COOKIE
    // ═══════════════════════════════════════════════════════════════════════
    const token = generateToken(user);

    // Set HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log(
      `✅ ${userData.provider} social login successful:`,
      user.email
    );

    res.status(200).json({
      message: `${provider} login successful`,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: "alumni",
        isApproved: user.isApproved ?? false,
        profileImage: user.profileImage || null,
      },
    });
  } catch (error) {
    console.error("❌ Social login error:", error);
    res.status(500).json({
      message: "Social login failed",
      error: error.message,
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════
// GET PROFILE
// ══════════════════════════════════════════════════════════════════════════
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check both User (admin) and Alumni tables
    let user = await User.findById(userId).select("-password");
    let isAdmin = !!user;

    if (!user) {
      user = await Alumni.findById(userId).select("-password");
      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }
    }

    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: isAdmin ? user.role : "alumni",
        isApproved: user.isApproved ?? true,
        profileImage: user.profileImage || null,
      },
    });
  } catch (error) {
    console.error("❌ Get profile error:", error);
    res.status(500).json({
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════
// LOGOUT
// ══════════════════════════════════════════════════════════════════════════
const logout = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({
      message: "Logout successful",
    });
  } catch (error) {
    console.error("❌ Logout error:", error);
    res.status(500).json({
      message: "Logout failed",
      error: error.message,
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════
// CHANGE PASSWORD
// ══════════════════════════════════════════════════════════════════════════
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message:
          "Current password and new password are required",
      });
    }

    // Check both tables
    let user = await User.findById(userId);
    if (!user) {
      user = await Alumni.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    // Hash and update new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({
      message: "Password change failed",
      error: error.message,
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD
// ══════════════════════════════════════════════════════════════════════════
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    // Check both tables
    let user = await User.findOne({ email });
    if (!user) {
      user = await Alumni.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({
        message:
          "If email exists, password reset link has been sent",
      });
    }

    // Generate OTP
    const otp = Math.random().toString().slice(2, 8);
    user.resetOtp = otp;
    user.resetOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // TODO: Send OTP to email
    console.log(`✅ OTP generated for ${email}: ${otp}`);

    res.status(200).json({
      message: "OTP sent to your email",
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({
      message: "Forgot password failed",
      error: error.message,
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════
// VERIFY OTP
// ══════════════════════════════════════════════════════════════════════════
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    // Check both tables
    let user = await User.findOne({ email });
    if (!user) {
      user = await Alumni.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Verify OTP
    if (
      user.resetOtp !== otp ||
      user.resetOtpExpiry < Date.now()
    ) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    res.status(200).json({
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("❌ Verify OTP error:", error);
    res.status(500).json({
      message: "OTP verification failed",
      error: error.message,
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════
// RESET PASSWORD
// ══════════════════════════════════════════════════════════════════════════
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        message:
          "Email, OTP, and new password are required",
      });
    }

    // Check both tables
    let user = await User.findOne({ email });
    if (!user) {
      user = await Alumni.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Verify OTP
    if (
      user.resetOtp !== otp ||
      user.resetOtpExpiry < Date.now()
    ) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    // Hash and update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    await user.save();

    console.log(`✅ Password reset successful for:`, user.email);

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({
      message: "Password reset failed",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
  socialLogin,  // ✅ NEW
};