import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import pool from '../../config/db';
import { signToken } from '../../utils/jwt';
import { sendSuccess, sendError } from '../../utils/response';
import { isValidEmail, isValidRole } from '../../utils/validators';
import {
  SignupBody,
  LoginBody,
  UserRow,
  PublicUser,
  UserRole,
} from '../../types';

const BCRYPT_SALT_ROUNDS = 10; // between 8–12 per spec

/** Strip password from a UserRow before sending to client */
const toPublicUser = (user: UserRow): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  created_at: user.created_at,
  updated_at: user.updated_at,
});

// ---- POST /api/auth/signup ----
export const signup = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role }: SignupBody = req.body;

  // Validate required fields
  if (!name?.trim() || !email || !password) {
    sendError(res, 'Name, email, and password are required.', StatusCodes.BAD_REQUEST);
    return;
  }

  if (password.length < 8) {
    sendError(res, 'Password must be at least 8 characters.', StatusCodes.BAD_REQUEST);
    return;
  }

  if (!isValidEmail(email)) {
    sendError(res, 'Please provide a valid email address.', StatusCodes.BAD_REQUEST);
    return;
  }

  // Validate role if provided
  const assignedRole: UserRole = role ?? 'contributor';
  if (!isValidRole(assignedRole)) {
    sendError(
      res,
      'Role must be either "contributor" or "maintainer".',
      StatusCodes.BAD_REQUEST,
    );
    return;
  }

  // Check for existing email (unique constraint)
  const existingResult = await pool.query<UserRow>(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()],
  );
  if (existingResult.rows.length > 0) {
    sendError(res, 'An account with this email already exists.', StatusCodes.BAD_REQUEST);
    return;
  }

  // Hash password – never store or return plaintext
  const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const insertResult = await pool.query<UserRow>(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name.trim(), email.toLowerCase(), hashedPassword, assignedRole],
  );

  const newUser = insertResult.rows[0];
  sendSuccess(res, toPublicUser(newUser), 'User registered successfully', StatusCodes.CREATED);
};

// ---- POST /api/auth/login ----
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password }: LoginBody = req.body;

  if (!email || !password) {
    sendError(res, 'Email and password are required.', StatusCodes.BAD_REQUEST);
    return;
  }

  // Fetch user by email
  const result = await pool.query<UserRow>(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()],
  );

  if (result.rows.length === 0) {
    sendError(res, 'Invalid email or password.', StatusCodes.BAD_REQUEST);
    return;
  }

  const user = result.rows[0];

  // Compare plaintext password against stored hash
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    sendError(res, 'Invalid email or password.', StatusCodes.BAD_REQUEST);
    return;
  }

  // Sign JWT with id, name, and role (required by spec hint)
  const token = signToken({ id: user.id, name: user.name, role: user.role });

  sendSuccess(res, { token, user: toPublicUser(user) }, 'Login successful');
};
