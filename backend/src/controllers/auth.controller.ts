
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import { UserRole } from '../types/types';

export const register = async (req: Request, res: Response) => {
  const { name, email, password, role, truckDetails, organizationDetails } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      truckDetails: role === 'DRIVER' ? truckDetails : undefined,
      organizationDetails: role === 'SENDER' ? organizationDetails : undefined,
    });

    await user.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password, role } = req.body; // Role is now expected

  try {
    const existingUser = await User.findOne({ email });
    if (!existingUser || !existingUser.password) {
      return res.status(404).json({ message: 'Invalid email or password' });
    }

    // Explicitly check if the user's role matches the portal they're logging into
    if (existingUser.role !== role) {
      return res.status(403).json({ message: `Access denied. Please use the ${existingUser.role} portal.` });
    }

    const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ email: existingUser.email, id: existingUser._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    res.status(200).json({ result: existingUser, token });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
