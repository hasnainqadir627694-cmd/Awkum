import React, { useState } from 'react';
import {
  X,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  FileText,
  Check,
  Calendar,
  User,
  ShieldCheck,
} from 'lucide-react';
import { DocumentItem } from '../../data/portalData';

interface DocumentPreviewModalProps {
  document: DocumentItem | null;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  onClose,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!document) return null;

  const totalPages = document.totalPages || 12;

  const handleDownload = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E6D8C7] bg-[#F8F0E5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FDE8E4] text-[#C84B31] font-bold text-xs uppercase flex items-center justify-center shrink-0">
              {document.fileType}
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#38271C] line-clamp-1">
                {document.title}
              </h3>
              <p className="text-[11px] text-[#806A56]">
                {document.subjectName} · {document.fileSize}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#668064]" />
                  <span>Downloaded</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#806A56] hover:text-[#38271C] hover:bg-[#EFE3D3] rounded-lg transition-colors ml-1"
              aria-label="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Zoom & Page navigation */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-[#E6D8C7] text-xs text-[#806A56]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-[#F8F0E5] disabled:opacity-30"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-[#38271C]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-[#F8F0E5] disabled:opacity-30"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
              className="p-1 rounded hover:bg-[#F8F0E5]"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px] w-10 text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
              className="p-1 rounded hover:bg-[#F8F0E5]"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Simulated Document Viewer Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#EBE3D7]/60 flex justify-center">
          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="w-full max-w-xl bg-white rounded-xl shadow-md border border-[#E6D8C7] p-6 sm:p-8 space-y-4 transition-transform duration-100"
          >
            {/* Document Header Letterhead */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#806A56]">
                  Abdul Wali Khan University Mardan
                </span>
                <h4 className="text-sm font-bold text-[#38271C]">
                  {document.subjectName} · Course Materials
                </h4>
              </div>
              <span className="text-[10px] font-mono text-gray-400">
                Doc Ref: AWKUM-{document.subjectId.toUpperCase()}-{currentPage}
              </span>
            </div>

            {/* Document Body */}
            <div>
              <h2 className="text-base font-bold text-[#38271C] mb-2">
                {document.title}
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                {document.description}
              </p>

              <div className="p-4 bg-[#F8F0E5]/60 border border-[#E6D8C7] rounded-xl space-y-2 text-xs text-[#38271C]">
                <h5 className="font-bold text-[11px] uppercase tracking-wide text-[#806A56]">
                  Lecture Syllabus & Focus Points:
                </h5>
                {document.previewSnippet.map((line, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-[#668064] font-bold">›</span>
                    <span className="leading-snug">{line}</span>
                  </div>
                ))}
              </div>

              {/* Code or Formula Sample */}
              <div className="mt-4 p-3 bg-gray-900 text-gray-100 rounded-xl font-mono text-[11px] overflow-x-auto">
                <span className="text-gray-400">// Sample Demonstration Snippet</span>
                <br />
                <span className="text-emerald-400">#include</span> <span className="text-amber-300">&lt;iostream&gt;</span>
                <br />
                <span className="text-blue-400">using namespace</span> std;
                <br />
                <br />
                <span className="text-purple-400">int</span> <span className="text-yellow-300">main</span>() &#123;
                <br />
                &nbsp;&nbsp;cout &lt;&lt; <span className="text-green-300">"AWKUM ClassHub — {document.subjectName}"</span> &lt;&lt; endl;
                <br />
                &nbsp;&nbsp;<span className="text-blue-400">return</span> 0;
                <br />
                &#125;
              </div>
            </div>

            {/* Document Footer */}
            <div className="pt-6 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
              <span>Uploaded by {document.uploader}</span>
              <span>Published {document.uploadDate}</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Info */}
        <div className="p-3 bg-[#FFF9F1] border-t border-[#E6D8C7] flex items-center justify-between text-xs text-[#806A56]">
          <div className="flex items-center gap-1 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#668064]" />
            <span>Verified course document for Spring/Fall semester</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#F8F0E5] hover:bg-[#EFE3D3] text-[#38271C] font-semibold rounded-lg text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
