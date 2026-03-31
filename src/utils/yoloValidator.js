/**
 * YOLO Pothole Detection Validator
 * Communicates with YOLO backend API to validate images
 */

import { YOLO_API_URL, YOLO_TIMEOUT, YOLO_RETRY_CONFIG } from "../config/yoloConfig";

/**
 * Validate image using YOLO pothole detection model
 * @param {File} imageFile - Image file from input
 * @returns {Promise<{success, num_potholes, damage_percentage, detections, image_base64, error>}
 */
export async function validateImageWithYolo(imageFile) {
  if (!imageFile) {
    console.warn("⚠️ Không có file ảnh để validate");
    return {
      success: false,
      error: "No image file provided",
    };
  }

  // Attempt with retries
  for (let attempt = 1; attempt <= YOLO_RETRY_CONFIG.maxRetries; attempt++) {
    try {
      console.log(`🤖 Gửi ảnh đến YOLO (lần thử ${attempt}/${YOLO_RETRY_CONFIG.maxRetries})...`);

      const formData = new FormData();
      formData.append("file", imageFile);

      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), YOLO_TIMEOUT);

      const response = await fetch(YOLO_API_URL, {
        method: "POST",
        body: formData,
        signal: controller.signal,
        headers: {
          // Don't set Content-Type, let browser set it with boundary
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "YOLO prediction failed");
      }

      console.log("✅ YOLO validation successful:", {
        num_potholes: data.num_potholes,
        damage_percentage: data.damage_percentage,
        detections: data.detections,
      });

      return {
        success: true,
        num_potholes: data.num_potholes || 0,
        damage_percentage: data.damage_percentage || 0,
        detections: data.detections || [],
        image_base64: data.image_base64,
        status: data.status,
      };
    } catch (error) {
      console.error(`❌ YOLO attempt ${attempt} failed:`, error.message);

      if (attempt === YOLO_RETRY_CONFIG.maxRetries) {
        // Last attempt failed
        console.error("🔴 YOLO validation failed after all retries");
        return {
          success: false,
          error: error.message,
          num_potholes: null,
          damage_percentage: null,
        };
      }

      // Wait before retry (exponential backoff)
      const delay = YOLO_RETRY_CONFIG.retryDelay * Math.pow(YOLO_RETRY_CONFIG.backoffMultiplier, attempt - 1);
      console.log(`⏳ Chờ ${delay}ms trước khi thử lại...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Calculate YOLO credibility score (0-100)
 * Based on damage_percentage detected by model
 * @param {number} damage_percentage - Damage percentage from YOLO (0-100)
 * @param {number} num_potholes - Number of potholes detected
 * @returns {number} YOLO score 0-100
 */
export function calculateYoloScore(damage_percentage, num_potholes) {
  // If YOLO didn't detect any potholes, score is 0
  if (num_potholes === 0 || num_potholes === null) {
    console.log("⚠️ YOLO không phát hiện ổ gà -> score = 0");
    return 0;
  }

  // Score based on damage percentage (more damage = higher confidence)
  // But we cap it to ensure it's not too extreme
  const score = Math.min(100, Math.max(0, damage_percentage));

  console.log("🤖 YOLO Score calculated:", {
    damage_percentage,
    num_potholes,
    score,
  });

  return Math.round(score);
}

/**
 * Check if YOLO server is available
 * @returns {Promise<boolean>}
 */
export async function isYoloServerAvailable() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(YOLO_API_URL.replace("/api/predict", "/api/health"), {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn("⚠️ YOLO server not available:", error.message);
    return false;
  }
}
