import React, { useRef } from "react";
import piexif from "piexifjs";
import {
  extractGPSFromExif,
  extractDateTimeFromExif,
} from "../../utils/scoring";
import { validateImageWithYolo } from "../../utils/yoloValidator";
import YoloResult from "./YoloResult";
import "./Frontend.css";

const Frontend = ({
  imagePreview,
  imageFile,
  location,
  isGettingLocation,
  locationStatus,
  exifData,
  yoloResult,
  yoloValidating,
  onFileSelect,
  onRemoveImage,
  onLocationChange,
  onGetLocation,
  onExifExtracted,
  onYoloResultUpdate,
}) => {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const isGettingLocationRef = useRef(false);

  // Xử lý khi chọn file từ máy tính
  const handleFileSelectWithExif = async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      // Đọc file để xử lý preview ảnh
      const previewReader = new FileReader();
      previewReader.onloadend = () => {
        // Gọi onFileSelect để xử lý preview
        const previewEvent = {
          ...e,
          target: {
            ...e.target,
            files: {
              0: file,
              length: 1,
            },
          },
        };
        onFileSelect(previewEvent);
      };
      previewReader.readAsDataURL(file);

      // Đọc file dưới dạng binary string để extract EXIF
      const exifReader = new FileReader();
      exifReader.onloadend = () => {
        try {
          // piexifjs.load() cần binary string hoặc DataURL
          const binaryString = exifReader.result;
          const exif = piexif.load(binaryString);

          // Extract GPS location
          const gpsLocation = extractGPSFromExif(exif);

          // Extract DateTime
          const dateTime = extractDateTimeFromExif(exif);

          console.log("✅ EXIF extracted:", { gpsLocation, dateTime });

          // Gọi callback để lưu EXIF data vào App.jsx
          onExifExtracted({
            gpsLocation,
            dateTime,
            allExif: exif,
          });
        } catch (error) {
          console.error("❌ Error reading EXIF:", error);
          // Nếu không đọc được EXIF, vẫn tiếp tục xử lý ảnh
          onExifExtracted(null);
        }
      };
      exifReader.readAsBinaryString(file);

      // Validate với YOLO AI (async, không block EXIF extraction)
      if (onYoloResultUpdate) {
        console.log("🤖 Bắt đầu xác thực YOLO...");
        const yoloRes = await validateImageWithYolo(file);
        onYoloResultUpdate(yoloRes);
      }
    } else if (file) {
      alert("Vui lòng chọn file ảnh hợp lệ (jpg, png, ...)");
    }
  };

  return (
    <section className="section-block">
      <h2 className="section-title">Frontend</h2>

      {/* 1. Chụp ảnh / Up ảnh */}
      <div className="field-group">
        <div className="field-label">
          <span>1</span>
          <label>Chụp ảnh / Tải ảnh lên</label>
        </div>
        <div className="media-area">
          {imagePreview ? (
            <div className="image-preview-container">
              <img
                src={imagePreview}
                alt="Preview"
                className="preview-img-large"
              />
              <button
                type="button"
                className="remove-image-btn"
                onClick={onRemoveImage}
              >
                ✕ Xóa ảnh
              </button>
            </div>
          ) : (
            <div className="empty-preview">
              <div className="empty-icon">🖼️</div>
              <p>Chưa có ảnh nào</p>
            </div>
          )}

          <div className="button-group">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileSelectWithExif}
              style={{ display: "none" }}
              id="file-upload"
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileSelectWithExif}
              style={{ display: "none" }}
              id="camera-capture"
            />

            <button
              type="button"
              className="btn-outline"
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Tải ảnh lên
            </button>

            <button
              type="button"
              className="btn-outline"
              onClick={() => cameraInputRef.current?.click()}
            >
              📸 Chụp ảnh
            </button>
          </div>
          <p className="hint-text">
            Hỗ trợ JPG, PNG. Chụp ảnh trực tiếp từ camera thiết bị.
          </p>
          
          {/* YOLO Validation Result */}
          <YoloResult
            yoloResult={yoloResult}
            imageFile={imageFile}
            onResultUpdate={onYoloResultUpdate}
            isValidating={yoloValidating}
          />
        </div>
      </div>

      {/* 2. Vị trí hiện tại */}
      <div className="field-group">
        <div className="field-label">
          <span>2</span>
          <label>Vị trí hiện tại</label>
        </div>
        <div className="location-box">
          <div className="loc-input-wrapper">
            <span className="loc-icon">📍</span>
            <input
              type="text"
              id="locationInput"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="Nhập địa chỉ hoặc tọa độ..."
              autoComplete="off"
            />
            <button
              type="button"
              className="get-location-btn"
              onClick={() => {
                // Debounce: tránh gọi geolocation nhiều lần
                if (!isGettingLocationRef.current && !isGettingLocation) {
                  isGettingLocationRef.current = true;
                  onGetLocation();
                  // Reset flag sau 12s (timeout của geolocation + buffer)
                  setTimeout(() => {
                    isGettingLocationRef.current = false;
                  }, 12000);
                }
              }}
              disabled={isGettingLocation}
            >
              <span>🎯</span>
              {isGettingLocation ? "Đang lấy..." : "Lấy vị trí"}
            </button>
          </div>
          {locationStatus && (
            <div
              className={`loc-status ${
                locationStatus.includes("✓") ||
                locationStatus.includes("✅")
                  ? "success"
                  : "error"
              }`}
            >
              {locationStatus}
            </div>
          )}
          {locationStatus &&
            (locationStatus.includes("🔒") ||
              locationStatus.includes("từ chối")) && (
              <div className="location-help">
                <p>💡 Cách bật quyền vị trí:</p>
                <ul>
                  <li>🔒 Nhấn vào biểu tượng khóa bên cạnh URL</li>
                  <li>📍 Tìm mục "Location" và chọn "Allow"</li>
                  <li>🔄 Tải lại trang và thử lại</li>
                </ul>
                <button
                  type="button"
                  className="retry-btn"
                  onClick={onGetLocation}
                >
                  🔄 Thử lại sau khi đã bật quyền
                </button>
              </div>
            )}
        </div>
      </div>

      {/* EXIF Info */}
      {exifData && (
        <div className="field-group">
          <div className="field-label">
            <span>ℹ️</span>
            <label>Thông tin ảnh (EXIF)</label>
          </div>
          <div className="exif-info">
            {exifData.gpsLocation && (
              <div className="exif-row">
                <span className="exif-label">📍 GPS:</span>
                <span className="exif-value">
                  {exifData.gpsLocation.latitude.toFixed(6)},{" "}
                  {exifData.gpsLocation.longitude.toFixed(6)}
                </span>
              </div>
            )}
            {exifData.dateTime && (
              <div className="exif-row">
                <span className="exif-label">🕐 Thời gian:</span>
                <span className="exif-value">
                  {exifData.dateTime.toLocaleString("vi-VN")}
                </span>
              </div>
            )}
            {!exifData.gpsLocation && !exifData.dateTime && (
              <p className="exif-empty">Ảnh không chứa EXIF metadata</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default Frontend;
