
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/user.model';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      if (!decoded || !decoded.id) {
        return res.status(401).json({ message: 'Not authorized, token invalid' });
      }
      // validate ObjectId to avoid casting undefineds
      if (!mongoose.Types.ObjectId.isValid(String(decoded.id))) {
        return res.status(401).json({ message: 'Not authorized, token id invalid' });
      }
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) return res.status(401).json({ message: 'Not authorized, user not found' });
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
};

export const admin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && (req.user as any).role === 'ADMIN') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};
