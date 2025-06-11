export const EDITOR_CONFIG = {
    ZOOM: {
        MIN: 1,
        MAX: 6,
        FACTOR: 0.1,
    },
    INTERACTION: {
        CLICK_TIMEOUT: 200,
        DRAG_THRESHOLD: 5,
    },
    VISUAL: {
        BACKGROUND_COLOR: '#ededed',
        ZOOM_TO_EXTENTS_PADDING: 30,
    },
    SELECTION_FRAME: {
        // Window selection (left-to-right) - blue theme
        WINDOW_FILL_COLOR: 0x0078D4,      // Light blue
        WINDOW_STROKE_COLOR: 0x005A9E,    // Darker blue

        // Crossing selection (right-to-left) - green theme  
        CROSSING_FILL_COLOR: 0x00B04F,    // Light green
        CROSSING_STROKE_COLOR: 0x00854A,  // Darker green

        // Common properties
        FILL_ALPHA: 0.1,                  // Very transparent fill
        STROKE_ALPHA: 0.8,                // More visible stroke
        STROKE_WIDTH: 1,                  // Thin stroke

        // Dashed line properties for crossing selection
        DASH_LENGTH: 8,                   // Length of each dash
        GAP_LENGTH: 4,                    // Length of gap between dashes
    },
} as const