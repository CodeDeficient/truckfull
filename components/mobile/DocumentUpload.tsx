import React, { useState, useRef, useCallback } from 'react';
import { logError } from '@/lib/logging';

interface DocumentUploadProps {
  onUpload?: (file: File) => void;
  accept?: string;
  label?: string;
  title?: string;
  maxFileSize?: number; // in bytes
  allowedFileTypes?: string[]; // array of allowed file extensions
  className?: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUpload,
  accept = 'image/*',
  label = 'Upload Document',
  title,
  maxFileSize = 5 * 1024 * 1024, // 5MB default
  allowedFileTypes = ['.jpg', '.jpeg', '.png', '.pdf'],
  className = '',
}) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxFileSize) {
      logError(`File size exceeds limit: ${maxFileSize} bytes`);
      return false;
    }

    // Check file type
    const fileExtension = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
    if (!allowedFileTypes.some((type) => fileExtension === type.toLowerCase())) {
      logError(`File type not allowed: ${fileExtension}`);
      return false;
    }

    return true;
  };

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setFileName(file.name);

        if (validateFile(file)) {
          if (onUpload) {
            onUpload(file);
            setUploadStatus('success');
          }
        } else {
          setUploadStatus('error');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      }
    },
    [onUpload, maxFileSize, allowedFileTypes],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        setFileName(file.name);

        if (validateFile(file)) {
          if (onUpload) {
            onUpload(file);
            setUploadStatus('success');
          }
        } else {
          setUploadStatus('error');
        }
      }
    },
    [onUpload, maxFileSize, allowedFileTypes],
  );

  const handleUploadClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const getBorderClass = () => {
    if (isDragging) {
      return 'border-[var(--primary-color)] bg-[var(--primary-color)]/[0.05]';
    }
    if (uploadStatus === 'error') {
      return 'border-red-500';
    }
    return 'border-gray-300';
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors ${getBorderClass()} ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="form"
      aria-label={title ?? 'Document upload'}
    >
      <div className="mb-4 p-3 bg-gray-100 rounded-full">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>
      <p className="text-gray-600 mb-2">{label}</p>
      <p className="text-sm text-gray-500 mb-4">Accepts: {accept}</p>
      {fileName && (
        <p
          className="text-sm mb-2 truncate max-w-full"
          aria-live="polite"
          aria-label={`Selected file: ${fileName}`}
        >
          Selected: {fileName}
        </p>
      )}
      {uploadStatus === 'error' && (
        <p className="text-sm text-red-500 mb-2" aria-live="polite" role="alert">
          Invalid file. Please check file type and size.
        </p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        id="document-upload"
        aria-label="Select document to upload"
      />
      <button
        type="button"
        onClick={handleUploadClick}
        className="px-4 py-2 bg-[var(--primary-color)] text-white rounded-md cursor-pointer hover:bg-[var(--primary-color)]/90 transition-colors"
        aria-label="Choose file to upload"
      >
        Choose File
      </button>
    </div>
  );
};

export default React.memo(DocumentUpload);
