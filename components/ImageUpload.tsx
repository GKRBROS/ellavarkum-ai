"use client";

import { useCallback } from "react";

interface ImageUploadProps {
  onImageUpload: (file: File) => void;
}

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const isAllowedImageType = (file: File) => {
  return ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase());
};

export default function ImageUpload({ onImageUpload }: ImageUploadProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && isAllowedImageType(file)) {
        onImageUpload(file);
      }
    },
    [onImageUpload],
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isAllowedImageType(file)) {
      onImageUpload(file);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="border-4 border-dashed border-purple-500/50 rounded-xl p-16 text-center hover:border-purple-400 transition-colors cursor-pointer bg-gray-900/30"
    >
      <div className="space-y-4">
        <div className="flex justify-center">
          <svg
            className="w-24 h-24 text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-2xl font-semibold mb-2 text-white">
            Upload Your Image
          </h3>
          <p className="text-gray-400 mb-4">
            Drag and drop an image here, or click to select
          </p>
          <label className="inline-block">
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileInput}
              className="hidden"
            />
            <span className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg cursor-pointer transition-colors inline-block">
              Choose Image
            </span>
          </label>
        </div>
        <p className="text-sm text-gray-500">Supports PNG, JPEG/JPG, WEBP</p>
      </div>
    </div>
  );
}
