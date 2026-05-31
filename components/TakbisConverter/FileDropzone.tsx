'use client';

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

/** Drag-and-drop + click-to-browse PDF upload zone. */
export default function FileDropzone({ onFiles, disabled }: Props) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const pdfs = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === 'application/pdf'
    );
    if (pdfs.length > 0) onFiles(pdfs);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-gray-400 transition-colors bg-white"
    >
      <div className="text-4xl mb-3">📄</div>
      <p className="text-gray-700 font-medium mb-1">PDF dosyalarını sürükleyin</p>
      <p className="text-gray-400 text-sm mb-4">veya</p>
      <label className={`cursor-pointer bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        Dosya Seç
        <input
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files) {
              const pdfs = Array.from(e.target.files).filter(
                (f) => f.type === 'application/pdf'
              );
              if (pdfs.length > 0) onFiles(pdfs);
            }
          }}
        />
      </label>
      <p className="text-xs text-gray-400 mt-3">
        Tek dosyada birden fazla belge desteklenir
      </p>
    </div>
  );
}
