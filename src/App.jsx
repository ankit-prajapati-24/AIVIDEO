import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Sparkles, Loader2, PlayCircle } from 'lucide-react';
import FileUploader from './components/FileUploader';
import VideoPlayer from './components/VideoPlayer';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const App = () => {
  const [images, setImages] = useState([]);
  const [audio, setAudio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [prepMessages, setPrepMessages] = useState([]);
  const [renderingStarted, setRenderingStarted] = useState(false);
  const [renderPhase, setRenderPhase] = useState(1);
  const [planMode, setPlanMode] = useState('simple');
  const renderingStartedRef = useRef(false);
  const lastRenderPercentRef = useRef(null);
  const renderPhaseRef = useRef(1);
  const socketRef = useRef(null);
  const currentTaskIdRef = useRef(null);

  useEffect(() => {
    const socket = io(BACKEND_URL);
    socketRef.current = socket;

    socket.on('progress', (data) => {
      if (!data) return;
      console.log(`Task ${data.task_id}: ${data.message} - ${data.percent}%`);
      if (currentTaskIdRef.current && data.task_id !== currentTaskIdRef.current) return;
      if (data.message) {
        setStatusMessage(data.message);
        const isRenderingMessage = String(data.message).toLowerCase().startsWith('rendering');
        if (!isRenderingMessage) {
          setPrepMessages((prev) => {
            if (prev[prev.length - 1] === data.message) return prev;
            return [...prev, data.message];
          });
        } else {
          renderingStartedRef.current = true;
          setRenderingStarted(true);
        }
      }
      if (typeof data.percent === 'number') {
        if (renderingStartedRef.current || String(data.message || '').toLowerCase().startsWith('rendering')) {
          const last = lastRenderPercentRef.current;
          const isReset = typeof last === 'number' && last >= 90 && data.percent <= 5;
          if (isReset) {
            renderPhaseRef.current += 1;
            setRenderPhase(renderPhaseRef.current);
            setProgress(0);
          }
          lastRenderPercentRef.current = data.percent;
          setProgress((prev) => (data.percent > prev ? data.percent : prev));
        }
      }
      if (data.completed) {
        setLoading(false);
        setProgress(100);
        renderingStartedRef.current = true;
        setRenderingStarted(true);
        if (data.file_url) {
          setVideoUrl(data.file_url);
        } else if (data.output_path) {
          const fileName = String(data.output_path).split(/[\\/]/).pop();
          setVideoUrl(`${BACKEND_URL}/static/${fileName}`);
        }
      }
    });

    return () => {
      socket.off('progress');
      socket.disconnect();
    };
  }, []);

  const getAudioDuration = (file) =>
    new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No audio file provided'));
      const audioEl = document.createElement('audio');
      const objectUrl = URL.createObjectURL(file);
      audioEl.preload = 'metadata';
      audioEl.src = objectUrl;
      audioEl.onloadedmetadata = () => {
        const duration = Number.isFinite(audioEl.duration) ? audioEl.duration : 0;
        URL.revokeObjectURL(objectUrl);
        if (duration > 0) resolve(duration);
        else reject(new Error('Invalid audio duration'));
      };
      audioEl.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to read audio metadata'));
      };
    });

  const handleGenerate = async () => {
    if (!images.length || !audio) return alert("Please select images and audio!");

    setLoading(true);
    setProgress(0);
    setVideoUrl(null);
    setStatusMessage('');
    setPrepMessages([]);
    setRenderingStarted(false);
    setRenderPhase(1);
    renderingStartedRef.current = false;
    renderPhaseRef.current = 1;
    lastRenderPercentRef.current = null;
    currentTaskIdRef.current = null;
    const startTime = Date.now();
    const formData = new FormData();

    // Append files
    // Array.from(images).forEach((file) => formData.append('images', file));
    formData.append('audio', audio);
    formData.append('output_name', `aivid_${Date.now()}.mp4`);
    Array.from(images).forEach((file) => formData.append('images', file));
    formData.append('plan_mode', planMode);

    // Request Settings
    let settings = {
      transition_type: "random",
      motion_type: "zoom_in",
      motion_speed: 0.8,
      layout_mode: "blur_bg",
      frame_size: [1080, 1920],
      plan_mode: planMode
    };

    try {
      const durationSeconds = await getAudioDuration(audio);

      if (planMode === 'ai') {
        console.info(
          'AI planning must be performed by the backend. The frontend no longer sends provider API keys or makes direct LLM calls.'
        );
      }

      formData.append('settings_json', JSON.stringify(settings));

      const response = await axios.post(`${BACKEND_URL}/generate-video-upload`, formData);

      if (response.data.task_id) {
        currentTaskIdRef.current = response.data.task_id;
      }
      if (response.data.status === 'ok' && response.data.file_url) {
        setVideoUrl(response.data.file_url);
        setProgress(100);
        setLoading(false);
      }
      const actualSeconds = (Date.now() - startTime) / 1000;
      const nextFactor = actualSeconds / durationSeconds;
      if (Number.isFinite(nextFactor) && nextFactor > 0) {
        localStorage.setItem('render_factor', String(nextFactor));
      }
    } catch (error) {
      console.error(error);
      alert("Backend Connection Failed. Is your Python server at :8000?");
    } finally {
      if (!currentTaskIdRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans">
      {/* Header */}
      <nav className="p-6 border-b border-[#1e293b] bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-[#06b6d4] p-2 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              <Sparkles className="text-white" size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase">AIVID</span>
          </div>
          <div className="px-3 py-1 bg-[#1e293b] rounded-full text-[10px] text-[#94a3b8] font-mono border border-[#334155]">
            AGENT v1.0 • ONLINE
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left Side: Uploads */}
        <section className="space-y-6">
          <div className="bg-[#0f172a] p-8 rounded-3xl border border-[#1e293b] shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-[#f8fafc]">Configuration</h2>

            <div className="mb-6">
              <div className="text-xs font-semibold tracking-widest text-[#94a3b8] mb-2">
                PLANNING MODE
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPlanMode('simple')}
                  className={`py-3 rounded-xl text-xs font-bold tracking-widest border transition-all ${planMode === 'simple'
                      ? 'bg-white text-black border-white'
                      : 'bg-[#0b1220] text-[#94a3b8] border-[#1e293b] hover:border-[#334155]'
                    }`}
                >
                  SIMPLE
                </button>
                <button
                  type="button"
                  onClick={() => setPlanMode('ai')}
                  className={`py-3 rounded-xl text-xs font-bold tracking-widest border transition-all ${planMode === 'ai'
                      ? 'bg-[#06b6d4] text-white border-[#06b6d4]'
                      : 'bg-[#0b1220] text-[#94a3b8] border-[#1e293b] hover:border-[#334155]'
                    }`}
                >
                  AI-BASED
                </button>
              </div>
              <div className="mt-2 text-[11px] text-[#64748b]">
                {planMode === 'simple'
                  ? 'Uses fixed transitions and motion settings.'
                  : 'Requests AI planning from the backend service so API keys stay off the client.'}
              </div>
            </div>

            <FileUploader
              label="Select Multiple Images"
              accept="image/*"
              multiple
              type="image"
              onChange={(files) => setImages(files)}
            />

            <FileUploader
              label="Select Single Audio"
              accept="audio/*"
              type="audio"
              onChange={(files) => setAudio(files[0])}
            />

            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`w-full py-5 rounded-2xl font-black text-sm tracking-widest transition-all ${loading
                  ? 'bg-[#1e293b] text-[#475569] cursor-wait'
                  : 'bg-white text-black hover:bg-[#06b6d4] hover:text-white active:scale-95 shadow-lg'
                }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} /> PROCESSING ASSETS...
                </span>
              ) : "RENDER VIDEO"}
            </button>
            {statusMessage && (
              <div className="mt-4 text-xs text-[#94a3b8] font-mono">
                {statusMessage}
              </div>
            )}
            {renderingStarted && (
              <div className="mt-2 text-[11px] text-[#64748b] font-mono">
                {renderPhase === 1 ? 'RENDER PHASE: MERGING' : 'RENDER PHASE: FRAMES'}
              </div>
            )}
            {!renderingStarted && prepMessages.length > 0 && (
              <div className="mt-3 text-xs text-[#64748b] space-y-1">
                {prepMessages.map((msg, idx) => (
                  <div key={`${idx}-${msg}`} className="flex items-start gap-2">
                    <span className="mt-[2px] h-1.5 w-1.5 rounded-full bg-[#06b6d4]" />
                    <span>{msg}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-[#0b1220] border border-[#1e293b] overflow-hidden">
                <div
                  className="h-full bg-[#06b6d4] transition-[width] duration-150 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] text-[#64748b] font-mono">
                {progress === 100 ? 'COMPLETE' : `RENDERING ${Math.floor(progress)}%`}
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Preview */}
        <section className="bg-[#020617] rounded-3xl border border-[#1e293b] flex items-center justify-center min-h-[500px] relative overflow-hidden group">
          {/* Subtle Glow Background */}
          <div className="absolute inset-0 bg-[#06b6d4]/5 blur-[100px] rounded-full pointer-events-none" />

          {videoUrl ? (
            <VideoPlayer url={videoUrl} />
          ) : (
            <div className="text-center z-10">
              <div className="w-16 h-16 bg-[#0f172a] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#1e293b]">
                <PlayCircle className="text-[#334155]" size={32} />
              </div>
              <p className="text-[#475569] font-medium italic">Waiting for AI synthesis...</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
