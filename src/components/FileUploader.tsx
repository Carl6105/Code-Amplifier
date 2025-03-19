import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileCode,
  FolderOpen,
  XCircle,
  GripVertical,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
}

interface UploadedFile {
  file: File;
  path: string;
  size: number;
}

export function FileUploader({ onFilesSelected }: FileUploaderProps) {
  const [uploadMode, setUploadMode] = useState<"file" | "folder">("file");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setUploadProgress(0);

      const fileEntries = acceptedFiles.map(file => ({
        file,
        path: file.webkitRelativePath || file.name,
        size: file.size,
      }));

      setUploadedFiles(prev => [...prev, ...fileEntries]);
      onFilesSelected(acceptedFiles);

      // Simulated upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) clearInterval(interval);
      }, 200);
    },
    [onFilesSelected]
  );

  const removeFile = (index: number) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);
    onFilesSelected(updatedFiles.map(entry => entry.file));
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
    setUploadProgress(null);
    onFilesSelected([]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    noClick: false,
    noKeyboard: false,
    directory: uploadMode === "folder",
  });

  // Handle drag-and-drop sorting
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!active || !over) return;

    const oldIndex = uploadedFiles.findIndex(file => file.path === active.id);
    const newIndex = uploadedFiles.findIndex(file => file.path === over.id);
    
    if (oldIndex !== newIndex) {
      setUploadedFiles(prevFiles => arrayMove(prevFiles, oldIndex, newIndex));
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-200 dark:text-gray-200 light:text-gray-800">Upload Your Code</h2>
        <div className="flex gap-4">
          {["file", "folder"].map(mode => (
            <button
              key={mode}
              className={`px-4 py-2 rounded-lg transition-all ${
                uploadMode === mode 
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-[#1a1a1a] text-gray-400 border border-gray-800 hover:border-gray-700"
              }`}
              onClick={() => setUploadMode(mode as "file" | "folder")}
            >
              {mode === "file" ? "Upload Files" : "Upload Folder"}
            </button>
          ))}
        </div>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`p-12 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 flex flex-col items-center justify-center
          ${isDragActive 
            ? "border-blue-500/50 bg-blue-500/5" 
            : "border-gray-600 dark:border-gray-600 light:border-gray-300 hover:border-gray-500 dark:hover:border-gray-500 light:hover:border-gray-400 hover:bg-gray-800/30 dark:hover:bg-gray-800/30 light:hover:bg-gray-100/80"}
        `}
      >
        <input {...getInputProps()} webkitdirectory={uploadMode === "folder" ? "true" : undefined} />
        <div className="flex flex-col items-center text-center">
          {uploadMode === "folder" ? (
            <FolderOpen className="w-16 h-16 mb-4 text-blue-400" />
          ) : (
            <Upload className="w-16 h-16 mb-4 text-blue-400" />
          )}
          <p className="text-xl font-medium text-gray-300 dark:text-gray-300 light:text-gray-600">
            {isDragActive ? "Drop your files here" : `Drag & drop your ${uploadMode} here`}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 light:text-gray-400 mt-2">or click to browse</p>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress !== null && (
        <div className="bg-[#1a1a1a] dark:bg-[#1a1a1a] light:bg-gray-100 rounded-lg p-4 border border-gray-800 dark:border-gray-800 light:border-gray-200">
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2 overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }} 
            />
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-400 light:text-gray-500">{uploadProgress}% uploaded</p>
        </div>
      )}

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="bg-[#1a1a1a] dark:bg-[#1a1a1a] light:bg-white rounded-xl p-6 border border-gray-800 dark:border-gray-800 light:border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-200 dark:text-gray-200 light:text-gray-800">Uploaded Files ({uploadedFiles.length})</h3>
            <button 
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 dark:text-red-400 light:text-red-500 hover:text-red-300 dark:hover:text-red-300 light:hover:text-red-600 transition-colors" 
              onClick={clearAllFiles}
            >
              <Trash2 className="w-4 h-4" /> Clear All
            </button>
          </div>

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={uploadedFiles.map(file => file.path)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-dark">
                {uploadedFiles.map((file, index) => (
                  <SortableFileItem key={file.path} file={file} index={index} removeFile={removeFile} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

// Sortable file item component
function SortableFileItem({ file, index, removeFile }: { file: UploadedFile; index: number; removeFile: (index: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: file.path });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center justify-between px-3 py-2 glass-effect rounded-lg hover:neon-border transition-all duration-200"
    >
      <div className="flex items-center gap-2">
        <GripVertical {...listeners} {...attributes} className="w-4 h-4 text-gray-500 cursor-grab" />
        <FileCode className="w-5 h-5 text-gray-400" />
        <span className="text-sm text-gray-600 dark:text-gray-600 light:text-gray-500 truncate max-w-xs" title={file.path}>{file.path} ({(file.size / 1024).toFixed(1)} KB)</span>
      </div>
      <button onClick={() => removeFile(index)}>
        <XCircle className="w-5 h-5 text-red-500 hover:text-red-700" />
      </button>
    </div>
  );
}