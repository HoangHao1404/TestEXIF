import React, { useState } from "react";
import { validateImageWithYolo } from "../../utils/yoloValidator";
import "./YoloResult.css";

const YoloResult = ({ yoloResult, imageFile, onResultUpdate, isValidating }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!imageFile || isRefreshing) return;

    setIsRefreshing(true);
    console.log("🔄 Revalidating image with YOLO...");

    const result = await validateImageWithYolo(imageFile);
    onResultUpdate(result);
    setIsRefreshing(false);
  };

  // If no result yet, show waiting state
  if (!yoloResult) {
    if (isValidating) {
      return (
        <div className="yolo-result-container validating">
          <div className="yolo-spinner">
            <div className="spinner"></div>
            <p>🤖 Đang xác thực ảnh bằng AI...</p>
          </div>
        </div>
      );
    }
    return null;
  }

  // If error occurred
  if (!yoloResult.success) {
    return (
      <div className="yolo-result-container error">
        <div className="yolo-error">
          <span className="error-icon">⚠️</span>
          <div className="error-content">
            <h4>❌ Xác thực AI thất bại</h4>
            <p>{yoloResult.error || "Không thể kết nối với YOLO server"}</p>
            <button
              type="button"
              className="btn-retry"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? "⏳ Đang thử lại..." : "🔄 Thử lại"}
            </button>
          </div>
        </div>
        <p className="error-note">
          💡 Ghi chú: Bạn vẫn có thể gửi báo cáo mà không cần xác thực AI
        </p>
      </div>
    );
  }

  // Show results
  const { num_potholes, damage_percentage, detections, image_base64 } = yoloResult;

  return (
    <div className="yolo-result-container">
      <div className="yolo-header">
        <h4>🤖 Kết quả phân tích AI</h4>
        <button
          type="button"
          className="btn-small"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Xác thực lại"
        >
          {isRefreshing ? "⏳" : "🔄"}
        </button>
      </div>

      <div className="yolo-stats">
        <div className="stat-box">
          <span className="stat-label">🕳️ Phát hiện:</span>
          <span className="stat-value">{num_potholes} ổ gà</span>
        </div>

        <div className="stat-box">
          <span className="stat-label">📊 Tỷ lệ hư hỏng:</span>
          <div className="damage-bar-container">
            <div className="damage-bar">
              <div
                className="damage-fill"
                style={{ width: `${damage_percentage}%` }}
              ></div>
            </div>
            <span className="stat-value">{damage_percentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Detections list */}
      {detections && detections.length > 0 && (
        <div className="detections-list">
          <h5>📍 Chi tiết phát hiện:</h5>
          {detections.map((detection, idx) => (
            <div key={idx} className="detection-item">
              <span className="detection-class">{detection.class}</span>
              <span className="detection-confidence">
                Độ tin cậy: {(detection.confidence * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Annotated image */}
      {image_base64 && (
        <div className="annotated-image-container">
          <h5>🖼️ Ảnh xác thực:</h5>
          <img src={image_base64} alt="YOLO annotated" className="annotated-image" />
        </div>
      )}

      {/* Warning if no potholes */}
      {num_potholes === 0 && (
        <div className="yolo-warning">
          <span className="warning-icon">⚠️</span>
          <p>
            AI không phát hiện ổ gà trong ảnh này. Vui lòng kiểm tra ảnh và thử
            lại hoặc gửi ảnh có chất lượng tốt hơn.
          </p>
        </div>
      )}
    </div>
  );
};

export default YoloResult;
