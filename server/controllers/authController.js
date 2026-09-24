const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT Helper
const generateToken = (user) => {
    return jwt.sign(
        { user: { id: user.id } }, 
        process.env.JWT_SECRET, 
        { expiresIn: '7d' } // Token lasts 7 days
    );
};

// 1. Register User
exports.register = async (req, res) => {
    try {
        const { username, password, role = 'recruiter', displayName = '', companyName = '', email = '' } = req.body;
        if (!['recruiter', 'candidate'].includes(role)) return res.status(400).json({ message: 'Select a valid account type.' });
        if (role === 'recruiter' && !companyName.trim()) return res.status(400).json({ message: 'Company name is required for recruiter accounts.' });

        // Check if user exists
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create User
        user = new User({
            username,
            password: hashedPassword,
            role,
            displayName: displayName.trim(),
            companyName: companyName.trim(),
            email: email.trim()
        });

        await user.save();

        // Return Token
        const token = generateToken(user);
        
        // Return user data (excluding password)
        res.status(201).json({ 
            token, 
            user: { 
                id: user.id, 
                username: user.username,
                role: user.role,
                displayName: user.displayName,
                companyName: user.companyName,
                email: user.email,
                hasApiKey: false 
            } 
        });

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// 2. Login User
exports.login = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Check User
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const effectiveRole = role && ['recruiter', 'candidate'].includes(role) ? role : user.role;
        if (user.role !== effectiveRole) {
            user.role = effectiveRole;
            await user.save();
        }

        // Return Token
        const token = generateToken(user);
        
        // Check if they have an API key saved
        const hasApiKey = !!(user.geminiApiKey && user.geminiApiKey.content);

        res.json({ 
            token, 
            user: { 
                id: user.id, 
                username: user.username,
                role: user.role,
                displayName: user.displayName,
                companyName: user.companyName,
                email: user.email,
                hasApiKey 
            } 
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// 3. Get Current User (Load User on Refresh)
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        const hasApiKey = !!(user.geminiApiKey && user.geminiApiKey.content);
        
        res.json({ 
            id: user.id, 
            username: user.username,
            role: user.role || 'recruiter',
            displayName: user.displayName,
            companyName: user.companyName,
            email: user.email,
            phone: user.phone,
            location: user.location,
            headline: user.headline,
            bio: user.bio,
            skills: user.skills,
            companyWebsite: user.companyWebsite,
            industry: user.industry,
            hasApiKey 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
