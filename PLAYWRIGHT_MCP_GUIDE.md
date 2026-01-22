# Playwright MCP Server - Debugging Guide

## Installation Complete

✅ Installed: `@playwright/mcp` (v0.0.56)
✅ Configured: `~/.config/claude/mcp_settings.json`

## What is Playwright MCP?

The Playwright MCP server gives Claude Code the ability to:
- Launch and control real browsers
- Navigate to web pages
- Click buttons, fill forms, take screenshots
- Intercept network requests
- Execute JavaScript in the browser
- Debug browser automation issues

## How to Activate

1. **Restart Claude Code** or run `/mcp` to reload MCP servers
2. The Playwright server should appear in available tools
3. Claude can now use browser automation tools directly

## Available Tools (Once Active)

### Browser Control
- `playwright_navigate` - Navigate to a URL
- `playwright_click` - Click elements
- `playwright_fill` - Fill form inputs
- `playwright_screenshot` - Take screenshots
- `playwright_evaluate` - Execute JavaScript

### Network Monitoring
- Can intercept and log network requests
- See what URLs are being fetched
- Monitor response sizes and types

## How This Helps Debug YouTube Downloads

With Playwright MCP, I can:

1. **Navigate to a YouTube video** interactively
2. **Monitor network requests** as the video plays
3. **See exactly what googlevideo.com URLs** are being requested
4. **Check response sizes** to verify we're getting real chunks
5. **Execute JavaScript** to control video playback
6. **Take screenshots** to see what's happening visually
7. **Debug why only 1 chunk** is being captured

## Usage Example

Once activated, I could do something like:

```
1. playwright_navigate to https://www.youtube.com/watch?v=jNQXAC9IVRw
2. playwright_screenshot to see the page
3. Monitor network requests to see googlevideo.com URLs
4. playwright_evaluate to play the video
5. See what chunks are actually being downloaded
6. Debug why our current approach only gets 1 chunk
```

## Current Issue

Right now, our browser downloader is:
- ✅ Launching successfully
- ✅ Navigating to YouTube
- ✅ Finding the video player
- ✅ Playing the video
- ❌ **Only capturing 1 chunk** (should be 10-20+)

The issue is likely:
- Chunks are being downloaded but not captured by our response listener
- YouTube is using a different streaming method we're not detecting
- The chunk URLs don't match our filters
- Timing issues (chunks download before we start listening)

## Next Steps

1. **Restart Claude Code** to activate Playwright MCP
2. **Use interactive debugging** to see what's really happening
3. **Fix the chunk capture logic** based on what we learn
4. **Get multiple chunks** to create valid audio files

## Alternative Approach

If we can't capture chunks reliably, we might need to:
- Use a different library (e.g., `ytdl-core` for Node.js)
- Use YouTube's IFrame API differently
- Record the audio stream directly
- Use a completely different approach

## Configuration File

Location: `~/.config/claude/mcp_settings.json`

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"]
    }
  }
}
```

## Troubleshooting

If Playwright MCP doesn't appear:
- Restart Claude Code completely
- Check that npx is in PATH
- Verify @playwright/mcp is installed globally
- Run `npx @playwright/mcp` manually to test

## Let's Debug!

Once you restart Claude Code and Playwright MCP is active, I can:
1. Interactively navigate to YouTube
2. Monitor exactly what network requests happen
3. See why we're only getting 1 chunk
4. Fix the issue properly with real data

This will be much better than guessing! 🔍
