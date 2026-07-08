const User = require("../models/Users");
const bcrypt = require("bcryptjs");

// Create a new user (Admin)
exports.createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, department } = req.body;
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Create user
    user = new User({
      firstName,
      lastName,
      email,

      password: hashedPassword,
      role,
      department: role === "admin" ? department : undefined,
    });
    await user.save();

    res
      .status(201)
      .json({ message: "User created successfully", userId: user._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all users (Admin)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "admin"}).select("-password");
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user (Admin)
exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, department } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    user.role = role || user.role;
    user.department = role === "admin" ? department : undefined;
    await user.save();
    res.json({ message: "User updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete user (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};