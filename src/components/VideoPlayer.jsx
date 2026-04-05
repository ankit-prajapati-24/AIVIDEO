import React from 'react';
import { Download } from 'lucide-react';

const VideoPlayer = ({ url }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 z-10 animate-in fade-in zoom-in duration-700">
      <div className="relative w-full max-w-[320px] aspect-[9/16] bg-black rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border-[6px] border-[#0f172a]">
        <video 
          controls 
          autoPlay 
          className="w-full h-full object-cover"
          key={url}
        >
          <source src={url} type="video/mp4" />
        </video>
      </div>
      
      <a 
        href={url} 
        download
        className="mt-8 flex items-center gap-2 text-[11px] font-bold tracking-widest text-[#06b6d4] uppercase hover:text-white transition-colors"
      >
        <Download size={14} /> SAVE TO LOCAL DISK
      </a>
    </div>
  );
};

export default VideoPlayer;