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
 * - 1 km: 0 điểm
 * - Linear interpolation
 * 
 * Hỗ trợ 2 format reportLocation:
 * 1. Tọa độ: "lat,lon" (e.g., "10.776234,106.710049")
 * 2. Địa chỉ text (sẽ tự động geocode)
 * 
 * @param {object} exifLocation - {latitude, longitude}
 * @param {object} reportCoords - {latitude, longitude} (giá trị đã được geocode)
 * @returns {number} score 0-100, hoặc null nếu không có GPS
 */
export function calculateLocationScore(exifLocation, reportCoords) {
  if (!exifLocation || !exifLocation.latitude || !exifLocation.longitude) {
    return null; // Không có EXIF location
  }

  // Nếu không có tọa độ báo cáo, không thể so sánh
  if (!reportCoords || !reportCoords.latitude || !reportCoords.longitude) {
    return null;
  }

  // Tính khoảng cách Haversine (km)
  const distance = haversineDistance(
    exifLocation.latitude,
    exifLocation.longitude,
    reportCoords.latitude,
    reportCoords.longitude,
  );

  // Scoring: 0km = 100, 5km = 0, linear
  const maxDistance = 5; // km
  const score = Math.max(0, 100 - (distance / maxDistance) * 100);

  console.log("📍 Location comparison:", {
    exifLocation,
    reportCoords,
    distanceKm: distance.toFixed(3),
    score: Math.round(score),
  });

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
 * Sửa: Dùng includes thay vì regex word boundary vì nó work chắc chắn hơn
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

  // Check strong keywords (2 pts) - Dùng includes để match chính xác
  STRONG_KEYWORDS.forEach((keyword) => {
    const keywordLower = keyword.toLowerCase();
    if (contentLower.includes(keywordLower)) {
      // Đếm số lần xuất hiện
      let count = 0;
      let lastIndex = 0;
      while ((lastIndex = contentLower.indexOf(keywordLower, lastIndex)) !== -1) {
        count++;
        lastIndex += keywordLower.length;
      }

      const points = count * 2;
      totalPoints += points;
      strongMatches.push({
        keyword,
        count,
        points,
      });
    }
  });

  // Check normal keywords (1 pt)
  NORMAL_KEYWORDS.forEach((keyword) => {
    const keywordLower = keyword.toLowerCase();
    if (contentLower.includes(keywordLower)) {
      let count = 0;
      let lastIndex = 0;
      while ((lastIndex = contentLower.indexOf(keywordLower, lastIndex)) !== -1) {
        count++;
        lastIndex += keywordLower.length;
      }

      const points = count * 1;
      totalPoints += points;
      normalMatches.push({
        keyword,
        count,
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
 * Tính tổng confidence dựa trên 4 điểm
 * @param {number} locationScore - 0-100 hoặc null
 * @param {number} contentScore - 0-100
 * @param {number} timeScore - 0-100 hoặc null
 * @param {number} yoloScore - 0-100 hoặc null (từ YOLO AI detection)
 * @returns {object} { confidence: 0-100, breakdown: {...}, weights: {...} }
 */
export function calculateConfidence(locationScore, contentScore, timeScore, yoloScore = null) {
  // Xác định trọng số (weights)
  // Nếu đầy đủ 4 tiêu chí: location 28%, content 28%, time 23%, yolo 21%
  // Không có YOLO: location 35%, content 35%, time 30%
  // Nếu thiếu location: content 40%, time 35%, yolo 25%
  // Nếu thiếu time: location 40%, content 40%, yolo 20%
  // Nếu chỉ có content: content 100%

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
  if (yoloScore !== null && yoloScore !== undefined) {
    validCount++;
    scores.yolo = yoloScore;
  }

  // Tính trọng số dựa trên số tiêu chí hợp lệ
  const hasYolo = yoloScore !== null && yoloScore !== undefined;

  if (hasYolo && validCount === 4) {
    // Đã đủ 4 tiêu chí
    weights = { location: 0.28, content: 0.28, time: 0.23, yolo: 0.21 };
  } else if (hasYolo && validCount === 3) {
    // Có YOLO + 2 tiêu chí khác
    if (locationScore === null) {
      weights = { content: 0.4, time: 0.35, yolo: 0.25 };
    } else if (timeScore === null) {
      weights = { location: 0.4, content: 0.4, yolo: 0.2 };
    } else {
      weights = { location: 0.35, content: 0.35, yolo: 0.3 };
    }
  } else if (hasYolo && validCount === 2) {
    // Chỉ có YOLO + 1 tiêu chí khác
    if (contentScore !== null) {
      weights = { content: 0.6, yolo: 0.4 };
    } else if (locationScore !== null) {
      weights = { location: 0.5, yolo: 0.5 };
    } else {
      weights = { time: 0.5, yolo: 0.5 };
    }
  } else if (!hasYolo) {
    // Không có YOLO, dùng weighting cũ cho 3 tiêu chí
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
    }
  }

  if (Object.keys(weights).length === 0) {
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
  if (confidence >= 90)
    return "🟢 Rất tin cậy - Thông tin chi tiết và chính xác";
  if (confidence >= 70)
    return "🟢 Tin cậy cao - Đủ thông tin để xử lý";
  if (confidence >= 50)
    return "🟡 Tin cậy trung bình - Cần bổ sung thông tin";
  if (confidence >= 30)
    return "🟡 Tin cậy thấp - Thiếu thông tin quan trọng";
  return "🔴 Không đủ tin cậy - Vui lòng cung cấp thêm chi tiết";
}

/**
 * Parse EXIF location từ piexif data
 * @param {object} exif - EXIF data từ piexif
 * @returns {object} { latitude, longitude } hoặc null
 */
export function extractGPSFromExif(exif) {
  try {
    if (!exif || !exif["GPS"]) {
      console.log("No GPS data in EXIF");
      return null;
    }

    const gps = exif["GPS"];
    const lat = gps[2]; // GPSLatitude
    const lon = gps[4]; // GPSLongitude
    const latRef = gps[1]; // GPSLatitudeRef
    const lonRef = gps[3]; // GPSLongitudeRef

    // Validate all required fields exist and have proper structure
    if (!lat || !lon) {
      console.log("Invalid GPS data structure:", { lat, lon, latRef, lonRef });
      return null;
    }

    // Convert Rational format [numerator, denominator] or [degrees, minutes, seconds]
    let latDecimal, lonDecimal;
    
    if (Array.isArray(lat) && lat.length >= 3) {
      // Format: [degrees, minutes, seconds] - each as Rational or number
      const latD = typeof lat[0] === 'object' ? lat[0][0] / lat[0][1] : lat[0];
      const latM = typeof lat[1] === 'object' ? lat[1][0] / lat[1][1] : lat[1];
      const latS = typeof lat[2] === 'object' ? lat[2][0] / lat[2][1] : lat[2];
      latDecimal = latD + latM / 60 + latS / 3600;
      
      const lonD = typeof lon[0] === 'object' ? lon[0][0] / lon[0][1] : lon[0];
      const lonM = typeof lon[1] === 'object' ? lon[1][0] / lon[1][1] : lon[1];
      const lonS = typeof lon[2] === 'object' ? lon[2][0] / lon[2][1] : lon[2];
      lonDecimal = lonD + lonM / 60 + lonS / 3600;
    } else {
      console.log("Unknown GPS format:", { lat, lon });
      return null;
    }

    // Áp dụng hướng (S, W là âm)
    const latitude = latRef === "S" ? -latDecimal : latDecimal;
    const longitude = lonRef === "W" ? -lonDecimal : lonDecimal;

    console.log("✅ GPS extracted:", { latitude, longitude, latRef, lonRef });
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
    if (!exif) {
      console.log("⚠️ Không có EXIF data");
      return null;
    }

    // piexif lưu EXIF trong exif["0th"] (IFD0)
    const exif0th = exif["0th"];
    if (!exif0th) {
      console.log("⚠️ Không có exif['0th']");
      return null;
    }

    const dateTimeTag = 306; // DateTime tag in EXIF

    if (!exif0th[dateTimeTag]) {
      console.log("⚠️ Không có DateTime tag (306) trong EXIF");
      console.log("🔍 Available tags:", Object.keys(exif0th).slice(0, 10));
      return null;
    }

    let dateTimeStr = exif0th[dateTimeTag];

    // piexif trả về bytes, cần decode thành string
    if (typeof dateTimeStr === "object" && dateTimeStr.length !== undefined) {
      dateTimeStr = String.fromCharCode.apply(null, dateTimeStr);
    }

    // Nếu vẫn là bytes array, convert to string
    if (Array.isArray(dateTimeStr)) {
      dateTimeStr = String.fromCharCode.apply(null, dateTimeStr);
    }

    dateTimeStr = dateTimeStr.trim();
    console.log("🕐 DateTime string from EXIF:", dateTimeStr);

    if (!dateTimeStr || dateTimeStr.length === 0) {
      console.log("⚠️ DateTime string trống");
      return null;
    }

    // Format từ EXIF: "2023:12:15 10:30:45" -> "2023-12-15T10:30:45"
    const parts = dateTimeStr.split(" ");
    if (parts.length < 2) {
      console.log("⚠️ DateTime format không hợp lệ:", dateTimeStr);
      return null;
    }

    const datePart = parts[0].replace(/:/g, "-");
    const timePart = parts[1];
    const formattedStr = `${datePart}T${timePart}`;

    console.log("📅 Formatted DateTime:", formattedStr);
    const dateObj = new Date(formattedStr);

    if (isNaN(dateObj.getTime())) {
      console.log("⚠️ Không thể convert thành Date:", formattedStr);
      return null;
    }

    console.log("✅ DateTime extracted successfully:", dateObj);
    return dateObj;
  } catch (error) {
    console.error("❌ Error extracting DateTime from EXIF:", error);
    return null;
  }
}

/**
 * Kiểm tra xem location có phải tọa độ GPS hay không
 * Format: "lat,lon" hoặc "lat, lon"
 * @param {string} location - location string
 * @returns {boolean} true nếu là tọa độ, false nếu là địa chỉ text
 */
export function isCoordinateLocation(location) {
  if (!location || typeof location !== "string") return false;
  const parts = location.trim().split(",");
  if (parts.length !== 2) return false;
  const lat = parseFloat(parts[0].trim());
  const lon = parseFloat(parts[1].trim());
  return (
    !isNaN(lat) &&
    !isNaN(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  );
}

/**
 * Chuyển đổi địa chỉ text thành tọa độ GPS
 * Sử dụng OpenStreetMap Nominatim API (miễn phí, không cần API key)
 * @param {string} address - địa chỉ (e.g., "Đại học Duy Tân, Đà Nẵng, Việt Nam")
 * @returns {Promise<{latitude, longitude} | null>} tọa độ hoặc null nếu không tìm thấy
 */
export async function geocodeAddress(address) {
  if (!address || address.trim().length === 0) {
    console.warn("⚠️ Địa chỉ không hợp lệ");
    return null;
  }

  try {
    console.log("🌐 Geocoding address:", address);
    
    // Use Nominatim API (no API key required)
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Pothole-Reporter-App", // Nominatim requires User-Agent
      },
    });

    if (!response.ok) {
      console.error("❌ Geocoding API error:", response.status);
      return null;
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.warn("⚠️ Địa chỉ không tìm thấy:", address);
      return null;
    }

    const result = data[0];
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);

    console.log("✅ Geocoding successful:", {
      address,
      latitude,
      longitude,
      displayName: result.display_name,
    });

    return { latitude, longitude };
  } catch (error) {
    console.error("❌ Geocoding error:", error);
    return null;
  }
}

/**
 * Xử lý location báo cáo - có thể là tọa độ hoặc địa chỉ text
 * Nếu là địa chỉ, convert sang tọa độ
 * @param {string} reportLocation - tọa độ hoặc địa chỉ
 * @returns {Promise<{latitude, longitude} | null>} tọa độ GPS hoặc null
 */
export async function parseReportLocation(reportLocation) {
  if (!reportLocation || typeof reportLocation !== "string") {
    return null;
  }

  // Kiểm tra xem có phải tọa độ rồi không
  if (isCoordinateLocation(reportLocation)) {
    const parts = reportLocation.trim().split(",");
    const lat = parseFloat(parts[0].trim());
    const lon = parseFloat(parts[1].trim());
    console.log("📍 Location là tọa độ:", { lat, lon });
    return { latitude: lat, longitude: lon };
  }

  // Nếu là địa chỉ text, geocode
  console.log("🏘️ Location là địa chỉ text, geocoding...");
  return await geocodeAddress(reportLocation);
}
