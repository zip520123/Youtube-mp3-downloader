# YouTube MP3 Downloader

A web application for extracting audio from YouTube videos and converting them to MP3 format. Built with vanilla HTML/CSS/JavaScript frontend and TypeScript/Express backend.

**⚠️ FOR EDUCATIONAL PURPOSES ONLY** - See [LEGAL_NOTICE.md](./LEGAL_NOTICE.md) for important legal and technical constraints.

## Features

- Clean, modern, mobile-responsive interface
- Real-time video metadata display (title, duration, thumbnail)
- Audio extraction using yt-dlp
- Automatic MP3 conversion with ffmpeg (320kbps quality)
- Error handling with user-friendly messages
- Rate limiting to prevent abuse
- Automatic file cleanup after 30 minutes
- Docker support for easy deployment

## Architecture

### Why Backend is Required

This application **requires a backend server** because:

1. **CORS Restrictions**: YouTube blocks direct API access from browsers due to Cross-Origin Resource Sharing policies
2. **Binary Tools**: yt-dlp (Python) and ffmpeg must run server-side - they cannot run in browsers
3. **Processing Power**: Audio extraction and conversion require significant CPU resources
4. **Security**: Rate limiting, validation, and file management need server-side control

### Technology Stack

**Frontend:**
- Vanilla HTML5
- CSS3 with mobile-first responsive design
- Pure JavaScript (ES6+) - no frameworks

**Backend:**
- Node.js 20+
- Express.js web framework
- TypeScript for type safety
- yt-dlp for YouTube audio extraction
- ffmpeg for MP3 conversion

**Deployment:**
- Docker containerization
- Docker Compose for orchestration

## Project Structure

```
youtubeMP3Downloader/
├── src/                          # Backend TypeScript code
│   ├── server.ts                 # Express server entry point
│   ├── config/
│   │   └── index.ts              # Application configuration
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces/types
│   ├── services/
│   │   ├── youtube.service.ts    # YouTube URL validation & metadata
│   │   └── audio.service.ts      # Audio extraction & conversion
│   ├── routes/
│   │   └── audio.routes.ts       # API route handlers
│   ├── middleware/
│   │   ├── validation.middleware.ts  # Request validation
│   │   └── error.middleware.ts       # Error handling
│   └── utils/
│       ├── logger.util.ts        # Logging utility
│       └── file-cleanup.util.ts  # Temp file management
├── public/                       # Frontend static files
│   ├── index.html                # Main HTML page
│   ├── css/
│   │   └── style.css             # Styles
│   └── js/
│       ├── api.js                # API client
│       ├── ui.js                 # UI controller
│       └── app.js                # Main application logic
├── temp/                         # Temporary MP3 files
├── package.json                  # Node.js dependencies
├── tsconfig.json                 # TypeScript configuration
├── Dockerfile                    # Docker image definition
├── docker-compose.yml            # Docker Compose configuration
├── LEGAL_NOTICE.md              # Legal constraints and disclaimers
└── README.md                     # This file
```

## API Documentation

### Endpoints

#### POST /api/extract-audio

Extract audio from YouTube URL and convert to MP3.

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "fileId": "uuid-string",
    "title": "Video Title",
    "duration": 180,
    "thumbnail": "https://thumbnail-url.jpg",
    "downloadUrl": "/api/download/uuid-string"
  }
}
```

**Error Response (400/404/500):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_URL" | "VIDEO_UNAVAILABLE" | "EXTRACTION_FAILED" | "SERVER_ERROR",
    "message": "Human-readable error message"
  }
}
```

#### GET /api/download/:fileId

Download the converted MP3 file.

**Response:**
- Content-Type: `audio/mpeg`
- Content-Disposition: `attachment; filename="video-title.mp3"`
- Body: MP3 file binary stream

#### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Setup Instructions

### Prerequisites

#### For Local Development (without Docker):
- Node.js 20+ and npm
- Python 3.8+
- ffmpeg
- yt-dlp

#### For Docker Deployment:
- Docker 20+
- Docker Compose 2+

### Installation

#### Option 1: Docker (Recommended)

1. **Clone or navigate to the project:**
```bash
cd /path/to/youtubeMP3Downloader
```

2. **Build and start the application:**
```bash
docker-compose up --build
```

3. **Access the application:**
   - Open your browser to http://localhost:3000
   - The Docker container includes all dependencies (Python, yt-dlp, ffmpeg)

4. **Stop the application:**
```bash
docker-compose down
```

#### Option 2: Local Development

1. **Install system dependencies:**

**macOS:**
```bash
brew install python ffmpeg
pip3 install yt-dlp
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install python3 python3-pip ffmpeg
pip3 install yt-dlp
```

**Windows:**
- Install Python from [python.org](https://www.python.org/)
- Install ffmpeg from [ffmpeg.org](https://ffmpeg.org/)
- Run: `pip install yt-dlp`

2. **Install Node.js dependencies:**
```bash
npm install
```

3. **Build TypeScript:**
```bash
npm run build
```

4. **Start development server:**
```bash
npm run dev
```

5. **Access the application:**
   - Open your browser to http://localhost:3000

6. **Stop the development server:**

**If running in foreground:**
```bash
# Press Ctrl+C in the terminal
```

**If running in background:**
```bash
# Find the Node.js process
lsof -ti:3000 | xargs kill -9

# Or find and kill by process name
pkill -f "node.*server"

# Or using ps and grep
ps aux | grep "node.*server" | grep -v grep | awk '{print $2}' | xargs kill
```

### Verification

Test that the server is running:

```bash
# Health check
curl http://localhost:3000/api/health

# Expected response:
# {"success":true,"data":{"status":"healthy","timestamp":"..."}}
```

## Usage

1. **Open the application** in your web browser at http://localhost:3000

2. **Paste a YouTube URL** into the input field:
   - Standard format: `https://www.youtube.com/watch?v=VIDEO_ID`
   - Short format: `https://youtu.be/VIDEO_ID`

3. **Click "Extract Audio"** and wait for processing (usually 10-60 seconds depending on video length)

4. **View the result** with video thumbnail, title, and duration

5. **Click "Download MP3"** to save the audio file to your device

## Configuration

Edit `src/config/index.ts` to customize:

```typescript
export const config = {
  port: 3000,                    // Server port
  tempDir: './temp',             // Temporary file directory
  maxFileSizeMB: 50,            // Maximum output file size
  fileRetentionMinutes: 30,     // File cleanup interval
  corsOrigin: '*',              // CORS allowed origins
  rateLimit: {
    windowMs: 15 * 60 * 1000,   // Rate limit window (15 min)
    max: 10                      // Max requests per window
  }
};
```

## Limitations

- **Single videos only** - Playlist support not implemented
- **File size limit** - Maximum 50MB output file
- **Rate limiting** - 10 requests per 15 minutes per IP
- **Temporary storage** - Files automatically deleted after 30 minutes
- **No queue system** - One request at a time per session
- **yt-dlp dependency** - May break if YouTube changes their API

## Troubleshooting

### "yt-dlp: command not found"

```bash
# Install or update yt-dlp
pip3 install --upgrade yt-dlp
```

### "ffmpeg: command not found"

```bash
# macOS
brew install ffmpeg

# Linux
sudo apt install ffmpeg
```

### "Video unavailable" error

- Video may be private, deleted, or region-restricted
- Video may have age restrictions
- Try a different video URL

### "Extraction failed" error

- yt-dlp may need updating: `pip3 install --upgrade yt-dlp`
- YouTube may have changed their API
- Check server logs for detailed error messages

### Docker build fails

```bash
# Clear Docker cache and rebuild
docker-compose down
docker system prune -a
docker-compose up --build
```

## Development

### Available Scripts

```bash
# Development mode with auto-reload
npm run dev

# Build TypeScript
npm run build

# Production mode
npm start

# Clean build artifacts and temp files
npm run clean
```

### TypeScript Compilation

The project uses TypeScript with strict mode enabled. Source files in `src/` are compiled to `dist/`.

### File Cleanup

- Files are automatically deleted 30 minutes after creation
- Cleanup runs on server start and every 30 minutes
- Orphaned files in `temp/` directory are also cleaned

## Security Considerations

- **Rate limiting** prevents abuse (10 requests per 15 minutes)
- **Input validation** sanitizes YouTube URLs
- **Helmet.js** adds security headers
- **CORS** restricts cross-origin requests
- **File size limits** prevent resource exhaustion
- **Temporary storage** reduces disk usage

## Legal and Ethical Considerations

**⚠️ IMPORTANT:** This application is for **educational purposes only**.

- Downloading YouTube content violates YouTube's Terms of Service
- Most YouTube content is copyrighted - downloading without permission is illegal
- Use this tool only for learning web development concepts
- Do not deploy to production or use for commercial purposes
- See [LEGAL_NOTICE.md](./LEGAL_NOTICE.md) for complete details

## Legal Alternatives

Instead of using this tool, consider:

- **YouTube Premium** - Legal offline playback
- **YouTube's download feature** - Where available from creators
- **Creator-provided downloads** - Check video descriptions
- **Licensed music services** - Spotify, Apple Music, etc.

## Contributing

This is an educational project. If you're learning from this code:

1. Understand the architecture and design patterns
2. Study the TypeScript/Express backend implementation
3. Examine the vanilla JavaScript frontend approach
4. Learn about Docker containerization
5. Explore API design principles

## License

MIT License - See LICENSE file for details.

**Disclaimer:** The developers are not responsible for misuse of this software. By using this application, you accept full responsibility for compliance with applicable laws and terms of service.

## Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - YouTube video downloader
- [ffmpeg](https://ffmpeg.org/) - Audio/video processing
- [Express](https://expressjs.com/) - Web framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## Questions?

- Review [LEGAL_NOTICE.md](./LEGAL_NOTICE.md) for legal constraints
- Check the [API Documentation](#api-documentation) for usage details
- See [Troubleshooting](#troubleshooting) for common issues

---

**Remember:** This is a learning tool. Use it responsibly and respect copyright laws.