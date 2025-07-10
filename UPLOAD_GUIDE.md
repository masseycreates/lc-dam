# Upload Previous Selection Data

## Overview

The system now supports importing previous selection data from JSON files. This allows you to upload your historical lottery selections and merge them with your existing data for better tracking and analysis.

## How to Use

### 1. Access the Import Feature

1. Navigate to the **📈 Selection History** tab
2. In the **⚡ Quick Actions** section, click the **📤 Import Data** button
3. A dialog will open allowing you to select and upload your JSON file

### 2. Prepare Your Data

The system accepts JSON files in the following formats:

#### Format 1: Array of Selections
```json
[
    {
        "id": 1703123456789,
        "numbers": [5, 12, 23, 34, 45],
        "powerball": 18,
        "name": "My Selection 1",
        "source": "Manual Entry",
        "dateSaved": "2024-01-01T12:00:00.000Z",
        "datePlayed": "2024-01-03T20:00:00.000Z",
        "result": "loss",
        "winAmount": 0,
        "notes": "Test selection",
        "confidence": 75,
        "strategy": "Hot Numbers"
    }
]
```

#### Format 2: Object with Selections Array
```json
{
    "selections": [
        {
            "id": 1703123456789,
            "numbers": [5, 12, 23, 34, 45],
            "powerball": 18,
            "name": "My Selection 1",
            "source": "Manual Entry",
            "dateSaved": "2024-01-01T12:00:00.000Z",
            "result": "pending",
            "winAmount": 0
        }
    ],
    "savedSelections": [],
    "analytics": {
        "totalSelections": 1
    }
}
```

### 3. Field Descriptions

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `id` | No | Unique identifier (auto-generated if missing) | `1703123456789` |
| `numbers` | Yes | Array of 5 numbers (1-69) | `[5, 12, 23, 34, 45]` |
| `powerball` | Yes | Powerball number (1-26) | `18` |
| `name` | No | Display name for the selection | `"My Lucky Numbers"` |
| `source` | No | Where the selection came from | `"Manual Entry"` |
| `dateSaved` | No | When selection was saved (ISO string) | `"2024-01-01T12:00:00.000Z"` |
| `datePlayed` | No | When selection was played (ISO string) | `"2024-01-03T20:00:00.000Z"` |
| `result` | No | Result status | `"pending"`, `"win"`, `"loss"` |
| `winAmount` | No | Amount won (if any) | `4.00` |
| `notes` | No | Additional notes | `"Birthday numbers"` |
| `confidence` | No | Confidence score (0-100) | `75` |
| `strategy` | No | Strategy used | `"Hot Numbers"` |

### 4. Upload Process

1. Click **📤 Import Data** in the Selection History tab
2. Click **📁 Select File** or drag and drop your JSON file
3. The system will:
   - Validate the file format
   - Check for valid number ranges
   - Merge with existing data (avoiding duplicates)
   - Update your analytics
4. You'll see a success message with import details

### 5. Export Your Data

To create a backup or transfer data:

1. Go to the **📈 Selection History** tab
2. Click **💾 Export Data** in the Quick Actions section
3. A JSON file will be downloaded with all your selections

## Features

### Data Validation
- Validates number ranges (1-69 for main numbers, 1-26 for Powerball)
- Ensures required fields are present
- Skips invalid entries with detailed error reporting

### Duplicate Prevention
- Uses unique IDs to prevent duplicate imports
- Shows count of skipped duplicates in import results

### Data Merging
- Merges imported data with existing selections
- Preserves existing analytics and user preferences
- Updates total counts and statistics

### Cross-Device Sync
- Imported data syncs across devices when logged in
- Maintains data integrity across sessions

## File Limits

- **Maximum file size**: 10MB
- **Maximum selections**: 1000 per user (older entries removed if exceeded)
- **Supported format**: JSON only

## Troubleshooting

### Common Issues

1. **"Invalid JSON file"**
   - Ensure your file is valid JSON format
   - Check for missing commas, brackets, or quotes

2. **"No valid selections found"**
   - Verify number ranges (1-69 for main, 1-26 for Powerball)
   - Ensure `numbers` is an array of 5 integers
   - Check that `powerball` is a single integer

3. **"File too large"**
   - Split large files into smaller chunks
   - Remove unnecessary fields to reduce file size

4. **"Upload failed"**
   - Check your internet connection
   - Try refreshing the page and uploading again
   - Ensure the file isn't corrupted

### Getting Help

If you encounter issues:
1. Check the browser console for detailed error messages
2. Verify your JSON format using an online JSON validator
3. Try uploading a smaller test file first

## Testing

Use the test page at `/test-upload.html` to:
- Test the upload functionality
- Download sample files
- Verify API responses
- Debug upload issues

## Security

- Files are processed server-side with validation
- No executable code is processed from uploads
- Data is stored securely with user isolation
- File contents are not permanently stored on the server