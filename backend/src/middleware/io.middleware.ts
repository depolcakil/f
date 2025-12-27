
import { Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';

export const attachIO = (io: Server) => (req: Request, res: Response, next: NextFunction) => {
  req.io = io;
  next();
};
