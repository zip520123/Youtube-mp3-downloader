import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '../types';
import { Logger } from '../utils/logger.util';

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  Logger.error('Request error', err);

  // Default error response
  let statusCode = 500;
  let errorCode = ErrorCode.SERVER_ERROR;
  let message = 'An unexpected error occurred';

  // Map error codes to HTTP status codes and messages
  if (err.code) {
    switch (err.code) {
      case ErrorCode.INVALID_URL:
        statusCode = 400;
        errorCode = ErrorCode.INVALID_URL;
        message = err.message || 'Please provide a valid YouTube URL';
        break;

      case ErrorCode.VIDEO_UNAVAILABLE:
        statusCode = 404;
        errorCode = ErrorCode.VIDEO_UNAVAILABLE;
        message = err.message || 'Video is unavailable, private, or restricted';
        break;

      case ErrorCode.FILE_NOT_FOUND:
        statusCode = 404;
        errorCode = ErrorCode.FILE_NOT_FOUND;
        message = err.message || 'File not found or has expired';
        break;

      case ErrorCode.EXTRACTION_FAILED:
        statusCode = 500;
        errorCode = ErrorCode.EXTRACTION_FAILED;
        message = err.message || 'Failed to extract audio. Please try again';
        break;

      default:
        statusCode = 500;
        errorCode = ErrorCode.SERVER_ERROR;
        message = err.message || 'An unexpected error occurred';
    }
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message
    }
  });
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (
  _req: Request,
  res: Response
): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
};
