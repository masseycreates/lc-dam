# Next Drawing Association Feature

## Overview
The Next Drawing Association feature allows users to save their lottery selections and automatically associate them with the next PowerBall drawing. This helps users track which selections they plan to play for specific drawings.

## Features

### 🎯 Automatic Next Drawing Detection
- Automatically calculates the next PowerBall drawing date and time
- Displays drawing information: date, time, and day of the week
- Updates in real-time based on PowerBall schedule (Monday, Wednesday, Saturday at 10:59 PM ET)

### 💾 Smart Selection Saving
- **Save for Next Drawing**: Opens a dialog with drawing association options
- **Quick Save**: Instantly saves selection for the next drawing without dialog
- **Custom Drawing Date**: Option to associate selections with future drawings

### 🎯 Next Drawing Tab
- Dedicated tab showing next drawing information
- Lists all selections saved for the next drawing
- Shows association details (auto-associated vs manual)
- Quick refresh and navigation options

### 📊 Enhanced Tracking
- Selections include drawing association metadata
- Visual indicators for next drawing selections in the status bar
- Filter saved selections by drawing date
- Track selection performance by specific drawings

## How to Use

### Saving Selections for Next Drawing

1. **Generate Selections**: Use any algorithm or AI to generate selections
2. **Save Options**:
   - Click "💾 Save for Next Drawing" to open the association dialog
   - Click "⚡ Quick Save" to instantly save for next drawing
3. **Association Dialog**:
   - Choose "Associate with next drawing" (default)
   - Or select "Choose specific drawing date" for future drawings
   - Add optional notes
   - Click "Save & Track"

### Viewing Next Drawing Selections

1. **Next Drawing Tab**: Click the "🎯 Next Drawing" tab
2. **View Information**: See next drawing date, time, and day
3. **Your Selections**: View all selections saved for the next drawing
4. **Status Indicator**: Check the status bar for selection count

### API Endpoints

#### Get Next Drawing Info
```
GET /api/selection-history?type=nextDrawing
```

#### Get Saved Selections for Next Drawing
```
GET /api/selection-history?type=saved&nextDrawing=true
```

#### Save Selection with Drawing Association
```
POST /api/selection-history
{
  "selection": {
    "numbers": [1, 2, 3, 4, 5],
    "powerball": 10,
    "targetDrawingDate": "2024-01-15",
    "isForNextDrawing": true
  },
  "saveType": "saved"
}
```

## Data Structure

### Drawing Association Data
```javascript
{
  "drawingInfo": {
    "targetDrawingDate": "2024-01-15",        // YYYY-MM-DD format
    "targetDrawingTimestamp": "2024-01-15T22:59:00.000Z",
    "drawingDay": "Monday",                   // Day of week
    "drawingDisplayDate": "Mon, Jan 15, 2024", // Formatted display
    "drawingTime": "10:59 PM ET",            // Display time
    "associatedAt": "2024-01-10T15:30:00.000Z", // When associated
    "isForNextDrawing": true,                // Auto-associated flag
    "autoAssociated": true                   // System vs user association
  }
}
```

## Benefits

1. **Better Organization**: Keep track of which selections are for which drawings
2. **Automatic Association**: No need to manually track drawing dates
3. **Performance Tracking**: Analyze selection performance by specific drawings
4. **User Experience**: Clear visual indicators and easy management
5. **Future Planning**: Save selections for future drawings in advance

## Technical Implementation

- **Backend**: Enhanced `selection-history.js` API with drawing calculation
- **Frontend**: New tab, save dialog updates, and status indicators
- **Data Storage**: Extended selection data structure with drawing metadata
- **Real-time Updates**: Automatic refresh of next drawing information

## Notes

- Drawing times are calculated in Eastern Time (PowerBall official timezone)
- Selections are automatically associated with the next available drawing
- Users can override automatic association with custom dates
- All drawing associations are preserved for historical tracking