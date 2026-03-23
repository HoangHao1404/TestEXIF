/**
 * Scoring utility để tính độ tin cậy báo cáo
 * Dựa trên: Vị trí GPS, Nội dung (keywords), Thời gian
 */

// Keywords cho báo cáo pothole - Phương án 2 (Balanced) with weights
// Mạnh (Strong): 2 điểm mỗi từ
export const STRONG_KEYWORDS = [
  "pothole",
  "hole",
  "hố",
  "nứt",
  "crack",
  "gãy",
  "broken",
  "hazard",
  "nguy hiểm",
  "accident",
  "tai nạn",
  "damaged",
  "hư hỏng",
];

// Thường (Regular): 1 điểm mỗi từ
export const NORMAL_KEYWORDS = [
  "road",
  "đường",
  "asphalt",
  "nhựa",
  "pavement",
  "vỉa hè",
  "traffic",
  "giao thông",
  "repair",
  "sửa chữa",
  "unsafe",
  "không an toàn",
  "risk",
  "rủi ro",
  "deteriorated",
  "suy thoái",
];

/**
 * Tính điểm vị trí dựa trên khoảng cách GPS
 * - 0 km: 100 điểm
 * - 500 km: 0 điểm
 * - Linear interpolation
 * @param {object} exifLocation - {latitude, longitude}
 * @param {string} reportLocation - địa chỉ báo cáo
 * @returns {number} score 0-100, hoặc null nếu không có GPS
 */
export function calculateLocationScore(exifLocation, reportLocation) {
  if (!exifLocation || !exifLocation.latitude || !exifLocation.longitude) {
    return null; // Không có EXIF location
  }

  // Giả sử reportLocation có format "lat,lon" hoặc là string địa chỉ
  // Nếu là string địa chỉ (không có tọa độ), ta không thể so sánh -> return penalty
  const parts = reportLocation.trim().split(",");
  if (parts.length !== 2) {
    // Không phải tọa độ GPS, có thể là địa chỉ string
    // Trong trường hợp này, ta không tính điểm vị trí
    return 0;
  }

  const reportLat = parseFloat(parts[0].trim());
  const reportLon = parseFloat(parts[1].trim());

  if (isNaN(reportLat) || isNaN(reportLon)) {
    return 0;
  }

  // Tính khoảng cách Haversine (km)
  const distance = haversineDistance(
    exifLocation.latitude,
    exifLocation.longitude,
    reportLat,
    reportLon,
  );

  // Scoring: 0km = 100, 1km = 0, linear (Phương án 2: stricter)
  const maxDistance = 1; // km
  const score = Math.max(0, 100 - (distance / maxDistance) * 100);

  return Math.round(score);
}

/**
 * Tính khoảng cách Haversine giữa hai điểm GPS (km)
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Tính điểm nội dung dựa trên keyword weight (Phương án 2)
 * - Strong keywords (Mạnh): 2 điểm
 * - Normal keywords (Thường): 1 điểm
 * - Max score: 18 điểm = 100%
 * - Score = (totalPoints / 18) * 100
 * @param {string} reportContent - nội dung báo cáo
 * @returns {number} score 0-100
 */
export function calculateContentScore(reportContent) {
  if (!reportContent || reportContent.trim().length === 0) {
    return 0;
  }

  const contentLower = reportContent.toLowerCase();
  let totalPoints = 0;

  // Check strong keywords (2 pts)
  STRONG_KEYWORDS.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, "g");
    const matches = contentLower.match(regex);
    if (matches) {
      totalPoints += matches.length * 2; // 2 pts per match
    }
  });

  // Check normal keywords (1 pt)
  NORMAL_KEYWORDS.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, "g");
    const matches = contentLower.match(regex);
    if (matches) {
      totalPoints += matches.length * 1; // 1 pt per match
    }
  });

  // Score dựa trên max 18 điểm (Phương án 2)
  const maxPoints = 18;
  const score = Math.min(100, (totalPoints / maxPoints) * 100);

  return Math.round(score);
}

/**
 * Chi tiết tính điểm nội dung - bao gồm từ khóa và điểm
 * @param {string} reportContent - nội dung báo cáo
 * @returns {object} { score, totalPoints, strongMatches: [...], normalMatches: [...] }
 */
export function calculateContentScoreDetailed(reportContent) {
  if (!reportContent || reportContent.trim().length === 0) {
    return {
      score: 0,
      totalPoints: 0,
      strongMatches: [],
      normalMatches: [],
    };
  }

  const contentLower = reportContent.toLowerCase();
  let totalPoints = 0;
  const strongMatches = [];
  const normalMatches = [];

  // Check strong keywords (2 pts)
  STRONG_KEYWORDS.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, "g");
    const matches = contentLower.match(regex);
    if (matches) {
      const points = matches.length * 2;
      totalPoints += points;
      strongMatches.push({
        keyword,
        count: matches.length,
        points,
      });
    }
  });

  // Check normal keywords (1 pt)
  NORMAL_KEYWORDS.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, "g");
    const matches = contentLower.match(regex);
    if (matches) {
      const points = matches.length * 1;
      totalPoints += points;
      normalMatches.push({
        keyword,
        count: matches.length,
        points,
      });
    }
  });

  const maxPoints = 18;
  const score = Math.min(100, (totalPoints / maxPoints) * 100);

  return {
    score: Math.round(score),
    totalPoints,
    strongMatches,
    normalMatches,
  };
}

/**
 * Tính điểm thời gian dựa trên sai khác giờ
 * - 0 giờ sai khác: 100 điểm
 * - Sai khác 24 giờ: 0 điểm
 * - Linear interpolation
 * @param {Date} exifTime - thời gian từ EXIF
 * @param {Date} reportTime - thời gian báo cáo (hiện tại)
 * @returns {number} score 0-100, hoặc null nếu không có EXIF time
 */
export function calculateTimeScore(exifTime, reportTime) {
  if (!exifTime || !(exifTime instanceof Date)) {
    return null; // Không có EXIF time
  }

  if (!reportTime || !(reportTime instanceof Date)) {
    reportTime = new Date(); // Mặc định là hiện tại
  }

  // Tính sai khác giờ
  const timeDiffMs = Math.abs(reportTime - exifTime);
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

  // Scoring: 0h = 100, 6h = 0, linear (Phương án 2: stricter)
  const maxHours = 6;
  const score = Math.max(0, 100 - (timeDiffHours / maxHours) * 100);

  return Math.round(score);
}

/**
 * Tính tổng confidence dựa trên 3 điểm
 * @param {number} locationScore - 0-100 hoặc null
 * @param {number} contentScore - 0-100
 * @param {number} timeScore - 0-100 hoặc null
 * @returns {object} { confidence: 0-100, breakdown: {...}, weights: {...} }
 */
export function calculateConfidence(locationScore, contentScore, timeScore) {
  // Xác định trọng số (weights)
  // Nếu đầy đủ 3 tiêu chí: location 30%, content 40%, time 30%
  // Nếu thiếu location: content 50%, time 50%
  // Nếu thiếu time: location 40%, content 60%
  // Nếu thiếu cả: content 100%

  let weights = {};
  let scores = {};
  let validCount = 0;

  if (locationScore !== null) {
    validCount++;
    scores.location = locationScore;
  }
  if (contentScore !== null) {
    validCount++;
    scores.content = contentScore;
  }
  if (timeScore !== null) {
    validCount++;
    scores.time = timeScore;
  }

  // Tính trọng số dựa trên số tiêu chí hợp lệ (Phương án 2: 35/35/30)
  if (validCount === 3) {
    weights = { location: 0.35, content: 0.35, time: 0.3 };
  } else if (validCount === 2) {
    if (locationScore === null) {
      weights = { content: 0.55, time: 0.45 };
    } else if (timeScore === null) {
      weights = { location: 0.45, content: 0.55 };
    } else {
      weights = { location: 0.45, content: 0.55 };
    }
  } else if (validCount === 1) {
    if (contentScore !== null) {
      weights = { content: 1.0 };
    } else if (locationScore !== null) {
      weights = { location: 1.0 };
    } else {
      weights = { time: 1.0 };
    }
  } else {
    // Không có tiêu chí nào -> confidence 0
    return {
      confidence: 0,
      breakdown: scores,
      weights: {},
      message: "Không đủ dữ liệu để tính confidence",
    };
  }

  // Tính confidence trung bình có trọng số
  let totalConfidence = 0;
  Object.keys(weights).forEach((key) => {
    totalConfidence += (scores[key] || 0) * weights[key];
  });

  const confidence = Math.round(totalConfidence);

  return {
    confidence,
    breakdown: scores,
    weights,
    message: getConfidenceMessage(confidence),
  };
}

/**
 * Đánh giá mức độ tin cậy
 */
function getConfidenceMessage(confidence) {
  if (confidence >= 90) return "🟢 Rất tin cậy";
  if (confidence >= 80) return "🟢 Tin cậy cao";
  if (confidence >= 70) return "🟡 Tin cậy trung bình";
  if (confidence >= 50) return "🟡 Tin cậy thấp";
  return "🔴 Không đủ tin cậy";
}

/**
 * Parse EXIF location từ piexif data
 * @param {object} exif - EXIF data từ piexif
 * @returns {object} { latitude, longitude } hoặc null
 */
export function extractGPSFromExif(exif) {
  try {
    if (!exif || !exif["GPS"]) return null;

    const gps = exif["GPS"];
    const lat = gps[2]; // GPSLatitude
    const lon = gps[4]; // GPSLongitude
    const latRef = gps[1]; // GPSLatitudeRef
    const lonRef = gps[3]; // GPSLongitudeRef

    if (!lat || !lon) return null;

    // Convert từ [degrees, minutes, seconds] thành decimal
    const latDecimal = lat[0] + lat[1] / 60 + lat[2] / 3600;
    const lonDecimal = lon[0] + lon[1] / 60 + lon[2] / 3600;

    // Áp dụng hướng (S, W là âm)
    const latitude = latRef === "S" ? -latDecimal : latDecimal;
    const longitude = lonRef === "W" ? -lonDecimal : lonDecimal;

    return { latitude, longitude };
  } catch (error) {
    console.error("Error extracting GPS from EXIF:", error);
    return null;
  }
}

/**
 * Parse EXIF datetime từ piexif data
 * @param {object} exif - EXIF data từ piexif
 * @returns {Date} hoặc null
 */
export function extractDateTimeFromExif(exif) {
  try {
    if (!exif || !exif["0th"]) return null;

    const exif0th = exif["0th"];
    const dateTimeTag = 306; // DateTime tag

    if (!exif0th[dateTimeTag]) return null;

    const dateTimeStr = exif0th[dateTimeTag]; // Format: "2023:12:15 10:30:45"
    // Convert to Date object
    const dateObj = new Date(dateTimeStr.replace(/:/g, "-"));

    if (isNaN(dateObj.getTime())) return null;

    return dateObj;
  } catch (error) {
    console.error("Error extracting DateTime from EXIF:", error);
    return null;
  }
}
