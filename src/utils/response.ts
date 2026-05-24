import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

/**
 * Send a standardised success response.
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = StatusCodes.OK,
): void => {
  res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    data,
  });
};

/**
 * Send a standardised error response.
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
  errors?: unknown,
): void => {
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors !== undefined && { errors }),
  });
};
