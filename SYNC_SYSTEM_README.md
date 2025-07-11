# Selection Sync System

This system provides automatic file-based synchronization for your Powerball selections across devices.

## Features

### 🔄 Automatic Synchronization
- **Auto-sync**: Automatically saves your selections to a sync file whenever you make changes
- **Cross-device compatibility**: Sync files can be shared between different devices
- **Conflict resolution**: Intelligent merging when the same selection exists on multiple devices

### 📁 File Management
- **Downloadable sync files**: Get your selections as JSON files you can save anywhere
- **Import/Export**: Import sync files from other devices or export your current data
- **Version history**: Keep track of multiple sync files with timestamps

### 🛡️ Data Safety
- **No data loss**: Merging preserves all selections from both local and remote sources
- **Backup system**: Every sync creates a backup file you can download
- **Local storage fallback**: Works even when sync is disabled

## How to Use

### Quick Start
1. **Enable Auto-sync**: Click the "Enable" button in the sync status indicator
2. **Make selections**: Your selections will automatically sync to a file
3. **Download sync file**: Use "Quick Sync" or visit the Sync Manager for more options

### Cross-Device Setup
1. **Device A**: Enable auto-sync and make some selections
2. **Download sync file**: Use the "Sync Manager" to download your latest sync file
3. **Device B**: Visit the Sync Manager and import the sync file
4. **Enable auto-sync on Device B**: Your selections will now sync on both devices

### Sync Manager
Access the full Sync Manager by clicking "🔄 Sync Manager" for advanced features:
- View all sync files with timestamps and device info
- Download specific sync files
- Import sync files from other devices
- Export current data
- Enable/disable auto-sync
- View sync statistics

## API Endpoints

### `/api/selection-sync`
- **GET**: Retrieve sync files
  - `?list=true`: List all available sync files
  - `?syncId=<id>`: Get specific sync file
- **POST**: Save new sync file
- **PUT**: Merge local and remote data

## File Format

Sync files are JSON with this structure:
```json
{
  "version": "1.0",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "deviceId": "device_abc123",
  "syncId": "unique_sync_id",
  "data": {
    "selections": [...],
    "savedSelections": [...],
    "totalCount": 10
  },
  "metadata": {
    "userAgent": "...",
    "source": "auto_sync",
    "lastModified": "..."
  }
}
```

## Storage

- **Local**: Uses localStorage for immediate access
- **Sync files**: Stored in `/data/lottery-sync/` (or temp directory in serverless)
- **Cleanup**: Automatically keeps only the last 10 sync files per user

## Security

- **User identification**: Based on browser fingerprint (user-agent, language, encoding)
- **No personal data**: Only lottery selections are stored
- **Local-first**: All data remains on your devices and chosen storage

## Troubleshooting

### Sync not working?
1. Check if auto-sync is enabled in the sync status indicator
2. Look for error messages in the browser console
3. Try manual sync with "Quick Sync" button

### Lost selections?
1. Visit the Sync Manager to see available sync files
2. Import the most recent sync file
3. Check localStorage in browser developer tools

### Cross-device issues?
1. Make sure you're using the same sync file on both devices
2. Import the sync file on the new device before enabling auto-sync
3. Check that both devices can access the sync API endpoints

## Files

- `api/selection-sync.js` - Main sync API endpoint
- `sync-manager.html` - Full-featured sync management interface
- `index.html` - Main app with integrated sync features

## Benefits

✅ **Never lose your selections** - Even if localStorage is cleared  
✅ **Work across devices** - Phone, tablet, desktop - all in sync  
✅ **Offline capable** - Sync files work without internet  
✅ **Privacy focused** - Your data stays under your control  
✅ **Easy backup** - Download your selections anytime  
✅ **Conflict-free** - Smart merging prevents data loss  