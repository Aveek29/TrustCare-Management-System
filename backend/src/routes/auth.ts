import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, AuthLog } from '../models/index';

const router = Router();

const logAuthEvent = async (
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'REGISTER_SUCCESS' | 'REGISTER_FAILED',
  status: 'SUCCESS' | 'FAILED',
  data: {
    userId?: string;
    email?: string;
    role?: string;
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }
) => {
  try {
    await AuthLog.create({
      ...data,
      action,
      status
    });
  } catch (error) {
    console.error('Failed to save auth log:', error);
  }
};

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, location, phone } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    console.log(`[${new Date().toISOString()}] Registration attempt for: ${email}, role: ${role || 'CUSTOMER'}`);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`[${new Date().toISOString()}] Registration failed - email exists: ${email}`);
      
      await logAuthEvent('REGISTER_FAILED', 'FAILED', {
        email,
        ipAddress,
        userAgent,
        errorMessage: 'Email already registered'
      });
      
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'CUSTOMER',
      location,
      phone
    });

    await user.save();
    console.log(`[${new Date().toISOString()}] User registered successfully: ${email}, ID: ${user._id}`);

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'trustcare-secret-key',
      { expiresIn: '7d' }
    );

    await logAuthEvent('REGISTER_SUCCESS', 'SUCCESS', {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      ipAddress,
      userAgent,
      metadata: { name }
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    await logAuthEvent('REGISTER_FAILED', 'FAILED', {
      email: req.body.email,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      errorMessage: 'Server error'
    });
    
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    console.log(`[${new Date().toISOString()}] Login attempt for: ${email}`);

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[${new Date().toISOString()}] Login failed - user not found: ${email}`);
      
      await logAuthEvent('LOGIN_FAILED', 'FAILED', {
        email,
        ipAddress,
        userAgent,
        errorMessage: 'User not found'
      });
      
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[${new Date().toISOString()}] Login failed - invalid password for: ${email}`);
      
      await logAuthEvent('LOGIN_FAILED', 'FAILED', {
        userId: user._id.toString(),
        email,
        role: user.role,
        ipAddress,
        userAgent,
        errorMessage: 'Invalid password'
      });
      
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'trustcare-secret-key',
      { expiresIn: '7d' }
    );

    console.log(`[${new Date().toISOString()}] Login successful for: ${email}, role: ${user.role}, ID: ${user._id}`);

    await logAuthEvent('LOGIN_SUCCESS', 'SUCCESS', {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      ipAddress,
      userAgent
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    
    await logAuthEvent('LOGIN_FAILED', 'FAILED', {
      email: req.body.email,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      errorMessage: 'Server error'
    });
    
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/google', async (req: Request, res: Response) => {
  try {
    const { googleId, email, name, avatar } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    console.log(`[${new Date().toISOString()}] Google login attempt for: ${email}`);

    let user = await User.findOne({ email });

    if (!user) {
      const hashedPassword = await bcrypt.hash(googleId + Date.now(), 10);
      user = new User({
        name,
        email,
        password: hashedPassword,
        role: 'CUSTOMER',
        avatar,
        googleId,
        isVerified: true
      });
      await user.save();

      await logAuthEvent('REGISTER_SUCCESS', 'SUCCESS', {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        ipAddress,
        userAgent,
        metadata: { name, provider: 'google' }
      });
    } else {
      if (googleId) {
        user.googleId = googleId;
        if (avatar) user.avatar = avatar;
        await user.save();
      }

      await logAuthEvent('LOGIN_SUCCESS', 'SUCCESS', {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        ipAddress,
        userAgent,
        metadata: { provider: 'google' }
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'trustcare-secret-key',
      { expiresIn: '7d' }
    );

    console.log(`[${new Date().toISOString()}] Google login successful for: ${email}`);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
