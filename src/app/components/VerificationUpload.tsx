/**
 * Verification Document Upload Component
 * For farmers to upload farming certificate when using credit payment
 */

import { useState } from "react";
import { Upload, FileText, X, ExternalLink, AlertCircle } from "lucide-react";

interface VerificationUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  preview: string | null;
  error?: string;
}

export function VerificationUpload({
  onFileSelect,
  selectedFile,
  preview,
  error,
}: VerificationUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file ảnh (JPG, PNG, WebP)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Kích thước file không được vượt quá 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      onFileSelect(file);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onFileSelect(null);
  };

  return (
    <div className="space-y-4">
      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-2">
              Giấy xác nhận sản xuất nông nghiệp
            </h4>
            <p className="text-sm text-blue-800 mb-3">
              Để được duyệt thanh toán trả sau, bạn cần tải lên giấy xác nhận
              trực tiếp sản xuất nông nghiệp. Giấy này xác nhận bạn là nông dân
              đang hoạt động sản xuất.
            </p>
            <a
              href="https://luatvietnam.vn/bieu-mau/mau-giay-xac-nhan-truc-tiep-san-xuat-nong-nghiep-571-91809-article.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Xem mẫu giấy xác nhận
            </a>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      {!selectedFile ? (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center
            transition-colors cursor-pointer
            ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
            }
            ${error ? "border-red-500 bg-red-50" : ""}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          <input
            id="file-upload"
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleChange}
            aria-label="Chọn file ảnh giấy xác nhận"
          />

          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-700 font-medium mb-2">
            Kéo thả ảnh vào đây hoặc click để chọn file
          </p>
          <p className="text-sm text-gray-500">PNG, JPG, WebP (Tối đa 5MB)</p>

          {error && (
            <div className="mt-4 flex items-center justify-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="border-2 border-green-500 bg-green-50 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              {preview && (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded border border-green-300"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-green-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-green-700">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <FileText className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-600">
                    File đã sẵn sàng tải lên
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleRemove}
              className="p-2 hover:bg-green-100 rounded-lg transition-colors"
              title="Xóa file"
            >
              <X className="w-5 h-5 text-green-700" />
            </button>
          </div>
        </div>
      )}

      {/* Note */}
      <div className="text-xs text-gray-600 space-y-1">
        <p>
          <strong>Lưu ý:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Ảnh phải rõ ràng, đầy đủ thông tin</li>
          <li>Doanh nghiệp sẽ xem xét và duyệt giấy tờ của bạn</li>
          <li>Đơn hàng chỉ được xác nhận sau khi doanh nghiệp duyệt</li>
        </ul>
      </div>
    </div>
  );
}
