import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, Admin as SelectAdmin, insertUserSchema } from "@shared/schema";
import { ENV } from "./config";

declare global {
  namespace Express {
    interface User extends SelectUser {
      userType?: 'user';
    }
    interface Admin extends SelectAdmin {
      userType: 'admin';
    }
  }
}

type AuthenticatedUser = (SelectUser & { userType?: 'user' }) | (SelectAdmin & { userType: 'admin' });

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: ENV.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: ENV.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: ENV.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    }, async (email, password, done) => {
      // First check admins table
      const admin = await storage.getAdminByEmail(email);
      if (admin && (await comparePasswords(password, admin.password))) {
        await storage.updateAdminLastLogin(admin.id);
        return done(null, { ...admin, userType: 'admin' as const });
      }

      // Then check users table
      const user = await storage.getUserByEmail(email);
      if (user && (await comparePasswords(password, user.password))) {
        await storage.updateUserLastLogin(user.id);
        return done(null, { ...user, userType: 'user' as const });
      }

      return done(null, false);
    }),
  );

  passport.serializeUser((user: AuthenticatedUser, done) => {
    done(null, { id: user.id, userType: user.userType });
  });

  passport.deserializeUser(async (serialized: { id: number, userType: 'user' | 'admin' }, done) => {
    try {
      if (serialized.userType === 'admin') {
        const admin = await storage.getAdminById(serialized.id);
        done(null, admin ? { ...admin, userType: 'admin' as const } : null);
      } else {
        const user = await storage.getUserById(serialized.id);
        done(null, user ? { ...user, userType: 'user' as const } : null);
      }
    } catch (error) {
      done(error, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate request body
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid input", 
          details: validation.error.errors 
        });
      }

      const existingUser = await storage.getUserByEmail(validation.data.email);
      if (existingUser) {
        return res.status(409).json({ error: "Email already in use" });
      }

      const user = await storage.createUser({
        username: validation.data.email, // Map email to username for backward compatibility
        email: validation.data.email,
        password: await hashPassword(validation.data.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
