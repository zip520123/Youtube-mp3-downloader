import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '../types';

/**
 * Validate extract audio request
 */
export const validateExtractRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { url } = req.body;

  if (!url) {
    res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.INVALID_URL,
        message: 'URL is required'
      }
    });
    return;
  }

  if (typeof url !== 'string') {
    res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.INVALID_URL,
        message: 'URL must be a string'
      }
    });
    return;
  }

  if (url.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.INVALID_URL,
        message: 'URL cannot be empty'
      }
    });
    return;
  }

  next();
};
