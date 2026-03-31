import React, { useState } from "react";
import "./App.css";
import Frontend from "./components/Frontend/Frontend";
import Backend from "./components/Backend/Backend";
import {
  calculateLocationScore,
  calculateContentScore,
  calculateContentScoreDetailed,
  calculateTimeScore,
  calculateConfidence,
  parseReportLocation,
  isCoordinateLocation,
} from "./utils/scoring";
import { calculateYoloScore } from "./utils/yoloValidator";

const App = () => {
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [location, setLocation] = useState("");
  const [content, setContent] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [exifData, setExifData] = useState(null); // EXIF data state
  const [confidenceResult, setConfidenceResult] = useState(null); // Confidence score result
  const [contentScoreDetailed, setContentScoreDetailed] = useState(null); // Keyword matching details
  const [yoloResult, setYoloResult] = useState(null); // YOLO AI validation result
  const [yoloValidating, setYoloValidating] = useState(false); // YOLO validation in progress

  // Xử lý khi chọn file từ máy tính
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      alert("Vui lòng chọn file ảnh hợp lệ (jpg, png, ...)");
    }
  };



  // Xóa ảnh đã chọn
  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  // Lấy vị trí hiện tại
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("❌ Trình duyệt không hỗ trợ định vị");
      setIsGettingLocation(false);
      return;
    }

    setIsGettingLocation(true);
    setLocationStatus("📍 Đang yêu cầu quyền truy cập vị trí...");

    // Kiểm tra trạng thái quyền trước (nếu browser hỗ trợ)
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((permissionStatus) => {
          if (permissionStatus.state === "denied") {
            setLocationStatus(
              "🔒 Quyền vị trí đã bị từ chối. Vui lòng vào cài đặt để bật lại."
            );
            setIsGettingLocation(false);
            setTimeout(() => setLocationStatus(""), 5000);
            return;
          }
        })
        .catch(() => {
          // Permissions API không được hỗ trợ, vẫn tiếp tục
        });
    }

    const options = {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000, // Cache vị trí trong 1 phút
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log("📍 Vị trí lấy thành công:", {
          latitude,
          longitude,
          accuracy,
        });

        setLocationStatus(
          `✅ Đã lấy tọa độ (độ chính xác: ~${Math.round(accuracy)}m). Đang lấy địa chỉ...`
        );

        // Gọi reverse geocoding với timeout riêng
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=vi`,
          {
            signal: controller.signal,
            headers: { "User-Agent": "TestEXIF/1.0" },
          }
        )
          .then((res) => {
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then((data) => {
            let address = data.display_name;
            // Rút gọn địa chỉ nếu quá dài
            if (address && address.length > 100) {
              const parts = address.split(",");
              address = parts.slice(0, 3).join(",").trim();
            }
            setLocation(
              address ||
                `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            );
            setLocationStatus("✅ Đã lấy vị trí thành công!");
            setIsGettingLocation(false);
            setTimeout(() => setLocationStatus(""), 3000);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            console.warn("Reverse geocoding error:", error);
            // Fallback: dùng tọa độ
            setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            setLocationStatus(
              "⚠️ Đã lấy tọa độ (không lấy được địa chỉ chi tiết)"
            );
            setIsGettingLocation(false);
            setTimeout(() => setLocationStatus(""), 3000);
          });
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMsg = "";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg =
              "🔒 Bạn đã từ chối quyền vị trí. Vui lòng bật trong cài đặt trình duyệt.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg =
              "📡 Không thể xác định vị trí GPS. Vui lòng bật GPS/WiFi.";
            break;
          case error.TIMEOUT:
            errorMsg = "⏰ Quá thời gian chờ. Vui lòng thử lại.";
            break;
          default:
            errorMsg = `❌ Lỗi: ${error.message}`;
        }
        setLocationStatus(errorMsg);
        setIsGettingLocation(false);
        setTimeout(() => setLocationStatus(""), 5000);
      },
      options
    );
  };

  // Xử lý submit form (async để hỗ trợ geocoding)
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Kiểm tra dữ liệu
    if (!imageFile && !imagePreview) {
      alert("Vui lòng chọn hoặc chụp ảnh");
      return;
    }
    if (!location.trim()) {
      alert("Vui lòng nhập vị trí hoặc sử dụng nút lấy vị trí hiện tại");
      return;
    }
    if (!content.trim()) {
      alert("Vui lòng nhập nội dung");
      return;
    }

    // *** Tính Confidence Score ***
    let locationScore = null;
    let contentScore = null;
    let timeScore = null;

    // Xử lý location: convert từ địa chỉ text sang tọa độ nếu cần
    let reportCoords = null;
    if (exifData && exifData.gpsLocation) {
      console.log("🔄 Xử lý location báo cáo...");
      reportCoords = await parseReportLocation(location);
      
      if (reportCoords) {
        locationScore = calculateLocationScore(exifData.gpsLocation, reportCoords);
        console.log("📍 Location score calculated:", locationScore);
      } else {
        console.log(
          "⚠️ Không thể xác định tọa độ báo cáo. Skipping location scoring."
        );
      }
    } else {
      console.log("⚠️ Không có GPS từ EXIF. Skipping location scoring.");
    }

    // Tính content score chi tiết (luôn có vì có content)
    const contentScoreDetail = calculateContentScoreDetailed(content);
    contentScore = contentScoreDetail.score;
    setContentScoreDetailed(contentScoreDetail); // Lưu chi tiết keyword matching
    console.log("📝 Content score details:", {
      content,
      totalPoints: contentScoreDetail.totalPoints,
      score: contentScoreDetail.score,
      strongMatches: contentScoreDetail.strongMatches,
      normalMatches: contentScoreDetail.normalMatches,
    });

    // Tính time score (nếu có EXIF DateTime)
    if (exifData && exifData.dateTime) {
      timeScore = calculateTimeScore(exifData.dateTime, new Date());
      console.log("🕐 Time score calculated:", timeScore);
    }

    // Tính YOLO score từ AI validation (nếu có)
    let yoloScore = null;
    if (yoloResult && yoloResult.success) {
      yoloScore = calculateYoloScore(yoloResult.damage_percentage, yoloResult.num_potholes);
      console.log("🤖 YOLO score calculated:", yoloScore);
    } else if (yoloResult && !yoloResult.success) {
      console.log("⚠️ YOLO validation failed, skipping YOLO score");
    } else {
      console.log("ℹ️ YOLO not used");
    }

    // Tính overall confidence (với YOLO score nếu có)
    const result = calculateConfidence(locationScore, contentScore, timeScore, yoloScore);
    setConfidenceResult(result);

    // Tạo FormData để gửi lên server (nếu cần)
    const formData = new FormData();
    if (imageFile) {
      formData.append("image", imageFile);
    }
    formData.append("location", location);
    formData.append("reportCoords", reportCoords ? JSON.stringify(reportCoords) : null);
    formData.append("content", content);
    formData.append("confidence", result);
    if (yoloResult) {
      formData.append("yoloResult", JSON.stringify(yoloResult));
    }

    // Hiển thị thông tin chi tiết
    const breakdown = result.breakdown;
    let detailMsg = `✓ Báo cáo đã được tính điểm!\n\n`;
    detailMsg += `🎯 Độ tin cậy tổng: ${result.confidence}% (${result.message})\n\n`;
    detailMsg += `📊 Chi tiết điểm số:\n`;
    if (breakdown.location !== undefined) {
      detailMsg += `  • Vị trí: ${breakdown.location}/100\n`;
    }
    if (breakdown.content !== undefined) {
      detailMsg += `  • Nội dung: ${breakdown.content}/100\n`;
    }
    if (breakdown.time !== undefined) {
      detailMsg += `  • Thời gian: ${breakdown.time}/100\n`;
    }
    if (breakdown.yolo !== undefined) {
      detailMsg += `  • AI Pothole: ${breakdown.yolo}/100\n`;
    }

    alert(detailMsg);

    console.log("Dữ liệu form với confidence:", {
      image: imageFile ? imageFile.name : "ảnh từ camera",
      location,
      reportCoords,
      content,
      yoloResult,
      confidence: result,
    });

    // Có thể reset form nếu muốn
    // handleReset();
  };

  // Reset form
  const handleReset = () => {
    setImagePreview(null);
    setImageFile(null);
    setLocation("");
    setContent("");
    setLocationStatus("");
    setExifData(null);
    setConfidenceResult(null);
    setContentScoreDetailed(null);
    setYoloResult(null);
    setYoloValidating(false);
  };

  // Callback khi EXIF được extracted từ Frontend
  const handleExifExtracted = (exifInfo) => {
    setExifData(exifInfo);
  };

  // Callback khi YOLO validation hoàn thành
  const handleYoloResultUpdate = (result) => {
    setYoloResult(result);
    // Note: yoloValidating flag được quản lý trong Frontend component
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <div className="form-header">
          <h1>📝 Tạo bài viết mới</h1>
          <p>Chia sẻ khoảnh khắc của bạn</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-body">
            <Frontend
              imagePreview={imagePreview}
              imageFile={imageFile}
              location={location}
              isGettingLocation={isGettingLocation}
              locationStatus={locationStatus}
              exifData={exifData}
              yoloResult={yoloResult}
              yoloValidating={yoloValidating}
              onFileSelect={handleFileSelect}
              onRemoveImage={handleRemoveImage}
              onLocationChange={setLocation}
              onGetLocation={getCurrentLocation}
              onExifExtracted={handleExifExtracted}
              onYoloResultUpdate={handleYoloResultUpdate}
            />

            <Backend
              content={content}
              onContentChange={setContent}
              onSubmit={handleSubmit}
              onReset={handleReset}
              confidenceResult={confidenceResult}
              contentScoreDetailed={contentScoreDetailed}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
