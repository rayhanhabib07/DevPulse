import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { signup, login } from './auth.controller';

const authRouter = Router();

// POST /api/auth/signup
authRouter.post('/signup', asyncHandler(signup));

// POST /api/auth/login
authRouter.post('/login', asyncHandler(login));

export default authRouter;
