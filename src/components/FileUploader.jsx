import React from 'react';
import { Image as ImgIcon, Music } from 'lucide-react';

const FileUploader = ({ label, accept, multiple, onChange, type }) => {
  return (
    <div className="mb-6">
      <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-[0.2em] mb-2">
        {label}
      </label>
      <div className="relative group">
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => onChange(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        />
        <div className="border border-[#1e293b] bg-[#020617]/50 rounded-2xl p-6 flex items-center gap-4 transition-all group-hover:border-[#06b6d4] group-hover:bg-[#06b6d4]/5">
          <div className="p-3 bg-[#0f172a] rounded-xl border border-[#1e293b] text-[#64748b] group-hover:text-[#06b6d4]">
            {type === 'audio' ? <Music size={20} /> : <ImgIcon size={20} />}
          </div>
          <div>
            <p className="text-sm text-[#94a3b8] font-medium">Click to browse</p>
            <p className="text-[11px] text-[#475569]">Supports {multiple ? 'JPG, PNG' : 'MP3, WAV'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;