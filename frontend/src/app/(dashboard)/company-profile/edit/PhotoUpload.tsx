import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Camera } from 'lucide-react';

interface PhotoUploadProps {
  currentPhoto?: string;
  onPhotoChange: (base64: string | null) => void;
  maxSizeInMB?: number;
  allowedTypes?: string[];
  className?: string;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  currentPhoto,
  onPhotoChange,
  maxSizeInMB = 5,
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  className = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhoto || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `Please upload a valid image file (${allowedTypes.map(type => type.split('/')[1]).join(', ')})`;
    }
    
    if (file.size > maxSizeInMB * 1024 * 1024) {
      return `File size must be less than ${maxSizeInMB}MB`;
    }
    
    return null;
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = useCallback(async (file: File) => {
    setError(null);
    setIsUploading(true);

    try {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      const base64 = await convertToBase64(file);
      setPreviewUrl(base64);
      onPhotoChange(base64);
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Failed to process the image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [onPhotoChange, maxSizeInMB, allowedTypes]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleRemovePhoto = () => {
    setPreviewUrl(null);
    setError(null);
    onPhotoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
        <Camera className="w-4 h-4 mr-2 text-blue-600" />
        Company Logo
      </label>

      <div
        className={`
          relative border-2 border-dashed rounded-xl transition-all duration-300 overflow-hidden
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : previewUrl 
              ? 'border-gray-200 bg-gray-50' 
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={!previewUrl ? openFileDialog : undefined}
      >
        {previewUrl ? (
          // Preview Mode
          <div className="relative group">
            <div className="aspect-video max-h-48 flex items-center justify-center p-4">
              <img
                src={previewUrl}
                alt="Company logo preview"
                className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
            
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFileDialog();
                  }}
                  className="bg-white text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors flex items-center space-x-1"
                >
                  <Upload className="w-4 h-4" />
                  <span>Change</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePhoto();
                  }}
                  className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center space-x-1"
                >
                  <X className="w-4 h-4" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Upload Mode
          <div className="aspect-video max-h-48 flex flex-col items-center justify-center p-6 pl-16 text-center">
            {isUploading ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600">Processing image...</p>
              </div>
            ) : (
              <>
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors
                  ${isDragOver ? 'bg-blue-100' : 'bg-gray-200'}
                `}>
                  <ImageIcon className={`w-6 h-6 ${isDragOver ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
                <div className="space-y-1 ">
                  <p className={`text-sm font-medium ${isDragOver ? 'text-blue-600' : 'text-gray-700'}`}>
                    {isDragOver ? 'Drop image here' : 'Upload company logo'}
                  </p>
                  <p className="text-xs text-gray-500 ">
                    Drag & drop or click to browse
                  </p>
                  <p className="text-xs text-gray-400">
                    PNG, JPG, WEBP up to {maxSizeInMB}MB
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
          <X className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Recommended: Square image (1:1 ratio) for best results
      </p>
    </div>
  );
};

export default PhotoUpload;