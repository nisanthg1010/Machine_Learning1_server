/**
 * User Controller
 * Handles user authentication and profile management
 */

const User = require('../models/User');
const jwt = require('jsonwebtoken');

// In-memory storage for when DB is unavailable
let inMemoryUsers = [];
let useInMemory = false;

// Check if we should use in-memory storage
const mongoose = require('mongoose');
setTimeout(() => {
    useInMemory = mongoose.connection.readyState !== 1;
    if (useInMemory) {
        console.log('📝 User controller using in-memory storage');
    }
}, 2000);

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please provide name, email, and password'
            });
        }

        if (useInMemory || mongoose.connection.readyState !== 1) {
            // In-memory storage
            const userExists = inMemoryUsers.find(u => u.email === email);
            if (userExists) {
                return res.status(400).json({
                    success: false,
                    error: 'User already exists'
                });
            }

            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = {
                _id: Date.now().toString(),
                name,
                email,
                password: hashedPassword,
                role: 'user',
                createdAt: new Date()
            };
            inMemoryUsers.push(newUser);

            return res.status(201).json({
                success: true,
                data: {
                    _id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                    token: generateToken(newUser._id)
                }
            });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                error: 'User already exists'
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password
        });

        res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please provide email and password'
            });
        }

        if (useInMemory || mongoose.connection.readyState !== 1) {
            // In-memory storage
            const user = inMemoryUsers.find(u => u.email === email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }

            const bcrypt = require('bcryptjs');
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    token: generateToken(user._id)
                }
            });
        }

        // Check user
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.status(200).json({
                success: true,
                data: {
                    _id: updatedUser._id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    token: generateToken(updatedUser._id)
                }
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
