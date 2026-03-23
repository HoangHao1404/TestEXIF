import React, { useState, useRef } from "react";
import "./App.css";
import Frontend from "./components/Frontend/Frontend";
import Backend from "./components/Backend/Backend";
import {
  calculateLocationScore,
  calculateContentScore,
  calculateContentScoreDetailed,
  calculateTimeScore,
  calculateConfidence,
} from "./utils/scoring";

const App = () => {
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [location, setLocation] = useState("");
  const [content, setContent] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [exifData, setExifData] = useState(null); // Thêm EXIF data state
  const [confidenceResult, setConfidenceResult] = useState(null); // Tính toán confidence
  const [contentScoreDetailed, setContentScoreDetailed] = useState(null); // Chi tiết keyword matching

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

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

  // Xử lý chụp ảnh từ camera
  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  // Xóa ảnh đã chọn
  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // Lấy vị trí hiện tại
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Trình duyệt không hỗ trợ định vị");
      return;
    }

    setIsGettingLocation(true);
    setLocationStatus("Đang lấy vị trí...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Gọi reverse geocoding để lấy tên địa điểm (sử dụng Nominatim OpenStreetMap)
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        )
          .then((res) => res.json())
          .then((data) => {
            const address = data.display_name || `${latitude}, ${longitude}`;
            setLocation(address);
            setLocationStatus("✓ Đã lấy vị trí");
            setTimeout(() => setLocationStatus(""), 2000);
          })
          .catch(() => {
            // Fallback: hiển thị tọa độ nếu không lấy được địa chỉ
            setLocation(`${latitude}, ${longitude}`);
            setLocationStatus("✓ Đã lấy tọa độ");
            setTimeout(() => setLocationStatus(""), 2000);
          })
          .finally(() => setIsGettingLocation(false));
      },
      (error) => {
        console.error("Lỗi định vị:", error);
        let errorMsg = "";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = "Bạn đã từ chối quyền truy cập vị trí";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = "Không thể xác định vị trí";
            break;
          case error.TIMEOUT:
            errorMsg = "Quá thời gian chờ lấy vị trí";
            break;
          default:
            errorMsg = "Không thể lấy vị trí";
        }
        setLocationStatus(errorMsg);
        setIsGettingLocation(false);
        setTimeout(() => setLocationStatus(""), 3000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  // Xử lý submit form
  const handleSubmit = (e) => {
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

    // Tính location score (nếu có EXIF GPS)
    if (exifData && exifData.gpsLocation) {
      locationScore = calculateLocationScore(exifData.gpsLocation, location);
    }

    // Tính content score chi tiết (luôn có vì có content)
    const contentScoreDetail = calculateContentScoreDetailed(content);
    contentScore = contentScoreDetail.score;
    setContentScoreDetailed(contentScoreDetail); // Lưu chi tiết keyword matching

    // Tính time score (nếu có EXIF DateTime)
    if (exifData && exifData.dateTime) {
      timeScore = calculateTimeScore(exifData.dateTime, new Date());
    }

    // Tính overall confidence
    const result = calculateConfidence(locationScore, contentScore, timeScore);
    setConfidenceResult(result);

    // Tạo FormData để gửi lên server (nếu cần)
    const formData = new FormData();
    if (imageFile) {
      formData.append("image", imageFile);
    }
    formData.append("location", location);
    formData.append("content", content);
    formData.append("confidence", result);

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

    alert(detailMsg);

    console.log("Dữ liệu form với confidence:", {
      image: imageFile ? imageFile.name : "ảnh từ camera",
      location,
      content,
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
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    setLocationStatus("");
    setExifData(null);
    setConfidenceResult(null);
    setContentScoreDetailed(null);
  };

  // Callback khi EXIF được extracted từ Frontend
  const handleExifExtracted = (exifInfo) => {
    setExifData(exifInfo);
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
              location={location}
              isGettingLocation={isGettingLocation}
              locationStatus={locationStatus}
              exifData={exifData}
              onFileSelect={handleFileSelect}
              onCameraCapture={handleCameraCapture}
              onRemoveImage={handleRemoveImage}
              onLocationChange={setLocation}
              onGetLocation={getCurrentLocation}
              onExifExtracted={handleExifExtracted}
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
