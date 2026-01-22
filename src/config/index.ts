export const config = {
  port: process.env.PORT || 3000,
  tempDir: './temp',
  maxFileSizeMB: 50,
  fileRetentionMinutes: 30,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }
};
