"use client";

import { useCallback, useRef, useState } from "react";
import type { FieldProps } from "./types";

export default function FileField({ field, value, onChange, error }: FieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const files = value
    ? Array.isArray(value)
      ? (value as File[])
      : [value as File]
    : [];

  const handleFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) return;
      const fileArray = Array.from(incoming);
      onChange(fileArray.length === 1 ? fileArray[0] : fileArray);
    },
    [onChange],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div className="w-full">
      <label className="text-sm font-medium mb-1 block">
        {field.label}
        {field.is_required && <span className="text-danger ml-1">*</span>}
      </label>
      <div
        role="button"
        tabIndex={0}
        className={`flex flex-col items-center justify-center rounded-medium border-2 border-dashed p-6 transition-colors cursor-pointer
          ${isDragging ? "border-primary bg-primary/10" : "border-default-300 hover:border-default-400"}
          ${error ? "border-danger" : ""}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p className="text-default-500 text-sm">
          Drag and drop files here, or click to browse
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {files.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {files.map((file, idx) => (
            <p key={idx} className="text-sm text-default-600 truncate">
              {file.name}
            </p>
          ))}
        </div>
      )}
      {field.helper_text && (
        <p className="text-default-400 text-xs mt-1">{field.helper_text}</p>
      )}
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
    </div>
  );
}
