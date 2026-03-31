/**
 * YOLO Pothole Detection API Configuration
 * Connects to YOLO backend for image validation
 */

// API URL - Change this if YOLO server runs on different host/port
const YOLO_API_URL = import.meta.env.VITE_YOLO_API_URL || "http://localhost:5001/api/predict";

// Timeout for YOLO requests (ms)
const YOLO_TIMEOUT = 30000; // 30 seconds

// Retry configuration
const YOLO_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // ms
  backoffMultiplier: 2,
};

// Confidence threshold for pothole detection
const YOLO_CONFIDENCE_THRESHOLD = 0.5;

export {
  YOLO_API_URL,
  YOLO_TIMEOUT,
  YOLO_RETRY_CONFIG,
  YOLO_CONFIDENCE_THRESHOLD,
};
