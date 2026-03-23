import React from "react";
import "./Backend.css";

const Backend = ({
  content,
  onContentChange,
  onSubmit,
  onReset,
  confidenceResult,
  contentScoreDetailed,
}) => {
  return (
    <section className="section-block">
      <h2 className="section-title">Backend</h2>

      {/* 3. Nội dung */}
      <div className="field-group">
        <div className="field-label">
          <span>3</span>
          <label>Nội dung</label>
        </div>
        <textarea
          className="content-textarea"
          rows="4"
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Chia sẻ cảm nghĩ của bạn..."
          maxLength={500}
        />
        <div className="char-counter">{content.length}/500 ký tự</div>
      </div>

      {/* Confidence Result */}
      {confidenceResult && (
        <div className="field-group">
          <div className="field-label">
            <span>✨</span>
            <label>Kết quả đánh giá</label>
          </div>
          <div
            className={`confidence-box confidence-${getConfidenceLevel(confidenceResult.confidence)}`}
          >
            <div className="confidence-main">
              <div className="confidence-value">
                {confidenceResult.confidence}%
              </div>
              <div className="confidence-message">
                {confidenceResult.message}
              </div>
            </div>

            <div className="confidence-breakdown">
              <h4>Chi tiết:</h4>
              {confidenceResult.breakdown.location !== undefined && (
                <div className="breakdown-row">
                  <span>📍 Vị trí</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${confidenceResult.breakdown.location}%`,
                      }}
                    ></div>
                  </div>
                  <span className="score">
                    {confidenceResult.breakdown.location}
                  </span>
                </div>
              )}
              {confidenceResult.breakdown.content !== undefined && (
                <div className="breakdown-row">
                  <span>📝 Nội dung</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${confidenceResult.breakdown.content}%`,
                      }}
                    ></div>
                  </div>
                  <span className="score">
                    {confidenceResult.breakdown.content}
                  </span>
                </div>
              )}
              {contentScoreDetailed && (
                <div className="keyword-details">
                  <div className="keyword-section">
                    <span className="keyword-label">🔴 Mạnh (2pts):</span>
                    {contentScoreDetailed.strongMatches.length > 0 ? (
                      <div className="keyword-list">
                        {contentScoreDetailed.strongMatches.map(
                          (match, idx) => (
                            <span key={idx} className="keyword-tag strong-tag">
                              {match.keyword} ×{match.count}
                            </span>
                          ),
                        )}
                      </div>
                    ) : (
                      <span className="keyword-none">Không tìm thấy</span>
                    )}
                  </div>
                  <div className="keyword-section">
                    <span className="keyword-label">🟡 Thường (1pt):</span>
                    {contentScoreDetailed.normalMatches.length > 0 ? (
                      <div className="keyword-list">
                        {contentScoreDetailed.normalMatches.map(
                          (match, idx) => (
                            <span key={idx} className="keyword-tag normal-tag">
                              {match.keyword} ×{match.count}
                            </span>
                          ),
                        )}
                      </div>
                    ) : (
                      <span className="keyword-none">Không tìm thấy</span>
                    )}
                  </div>
                  <div className="keyword-summary">
                    Tổng: {contentScoreDetailed.totalPoints}/18 điểm ={" "}
                    {contentScoreDetailed.score}%
                  </div>
                </div>
              )}
              {confidenceResult.breakdown.time !== undefined && (
                <div className="breakdown-row">
                  <span>🕐 Thời gian</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${confidenceResult.breakdown.time}%` }}
                    ></div>
                  </div>
                  <span className="score">
                    {confidenceResult.breakdown.time}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nút submit */}
      <div className="submit-area">
        <button type="submit" className="submit-btn" onClick={onSubmit}>
          ✨ Đăng bài viết
        </button>
        <button type="button" className="reset-btn" onClick={onReset}>
          Xóa form
        </button>
      </div>
    </section>
  );
};

function getConfidenceLevel(score) {
  if (score >= 90) return "excellent";
  if (score >= 80) return "good";
  if (score >= 70) return "ok";
  if (score >= 50) return "low";
  return "critical";
}

export default Backend;
