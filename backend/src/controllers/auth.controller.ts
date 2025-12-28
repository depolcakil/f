
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import { UserRole, RegistrationStatus } from '../types/types';

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
  const { email, password, role } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(404).json({ message: 'Invalid email or password' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Role and Status checks
    if (user.role === 'ADMIN') {
      if (role !== 'ADMIN') {
        return res.status(403).json({ message: 'Access denied. Please use the Admin portal.' });
      }
    } else { // For DRIVER and SENDER
      if (user.role !== role) {
        return res.status(403).json({ message: `Access denied. Please use the ${user.role} portal.` });
      }
      if (user.status !== RegistrationStatus.APPROVED) {
        if (user.status === RegistrationStatus.PENDING) {
          return res.status(401).json({ message: 'Account pending approval. Please wait for an administrator to review your application.' });
        }
        if (user.status === RegistrationStatus.REJECTED) {
          return res.status(401).json({ message: 'Your application has been rejected. Please contact support for more information.' });
        }
      }
    }

    const token = jwt.sign({ email: user.email, id: user._id }, 'secret', { expiresIn: '1h' });

    res.status(200).json({ result: user, token });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
