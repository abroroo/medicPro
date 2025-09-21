import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@shared/schema';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        firstName: string;
        lastName: string;
        clinicId: number;
        role: UserRole;
        isActive: boolean;
        createdAt: Date;
        lastLogin: Date | null;
      };
    }
  }
}

// Role hierarchy - higher roles inherit permissions from lower roles
const roleHierarchy: Record<UserRole, number> = {
  'user': 1,
  'receptionist': 2,
  'doctor': 3,
  'admin': 4,
};

// Check if user has required role or higher
function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.isActive) {
    return res.status(403).json({ error: 'Account is deactivated' });
  }

  next();
}

// Middleware to require specific role or higher
export function requireRole(requiredRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!hasRole(req.user.role, requiredRole)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: requiredRole,
        current: req.user.role
      });
    }

    next();
  };
}

// Middleware to check if user belongs to the same clinic as the resource
export function requireSameClinic(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // For now, this middleware just ensures the user is authenticated
  // The actual clinic checking happens in the storage layer methods
  // which already filter by clinicId
  next();
}

// Middleware to allow only admins or the user themselves
export function requireAdminOrSelf(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const targetUserId = parseInt(req.params.userId || req.params.id);

  if (req.user.role === 'admin' || req.user.id === targetUserId) {
    return next();
  }

  return res.status(403).json({
    error: 'Access denied. Admin role or self-access required.'
  });
}

// Convenience middleware combinations
export const requireUser = requireAuth;
export const requireReceptionist = [requireAuth, requireRole('receptionist')];
export const requireDoctor = [requireAuth, requireRole('doctor')];
export const requireAdmin = [requireAuth, requireRole('admin')];