import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as path from 'path';
import { config } from './config';
import { audioRouter } from './routes/audio.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { FileCleanupService } from './utils/file-cleanup.util';
import { Logger } from './utils/logger.util';

class Server {
  private app: Application;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Configure middleware
   */
  private setupMiddleware(): void {
    // Security headers
    this.app.use(helmet());

    // CORS
    this.app.use(cors({
      origin: config.corsOrigin,
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later'
        }
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    this.app.use('/api', limiter);

    // Body parser
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Serve static files from public directory
    this.app.use(express.static(path.join(__dirname, '../public')));

    Logger.info('Middleware configured');
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // API routes
    this.app.use('/api', audioRouter);

    // Serve index.html for root route
    this.app.get('/', (_req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    Logger.info('Routes configured');
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);

    Logger.info('Error handling configured');
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Clean up old temp files on startup
      await FileCleanupService.cleanupAllTempFiles();

      // Start file cleanup scheduler
      FileCleanupService.startCleanupSchedule();

      // Start listening
      this.app.listen(config.port, () => {
        Logger.info(`Server started on port ${config.port}`);
        Logger.info(`Access the application at http://localhost:${config.port}`);
        Logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      Logger.error('Failed to start server', error as Error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  private shutdown(): void {
    Logger.info('Shutting down server...');

    FileCleanupService.stopCleanupSchedule();

    process.exit(0);
  }
}

// Start server
const server = new Server();
server.start();
