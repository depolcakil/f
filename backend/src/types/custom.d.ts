
interface JwtPayload {
  id: string;
  role: string;
}

declare namespace Express {
  export interface Request {
    user?: JwtPayload;
    io?: import('socket.io').Server;
  }
}
