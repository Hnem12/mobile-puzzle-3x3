import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    jwt.verify(token, process.env.JWT_SECRET || "change-me");
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}
