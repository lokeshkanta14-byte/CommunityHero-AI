import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream?: MediaStream | null;
  isRecording: boolean;
  color?: string; // Hex color or CSS color
  barCount?: number;
  height?: number;
}

export default function AudioVisualizer({
  stream = null,
  isRecording,
  color = '#10b981', // Default emerald-500
  barCount = 18,
  height = 36
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use Web Audio API if a real stream is passed
    if (isRecording && stream) {
      let audioCtx: AudioContext | null = null;
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContextClass();
        audioCtxRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64; // Low fftSize for responsive, fat equalizer bars
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        sourceRef.current = source;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const drawRealtime = () => {
          if (!canvasRef.current) return;
          animationRef.current = requestAnimationFrame(drawRealtime);

          analyser.getByteFrequencyData(dataArray);

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const spacing = 3;
          const totalSpacing = spacing * (barCount - 1);
          const barWidth = (canvas.width - totalSpacing) / barCount;
          
          for (let i = 0; i < barCount; i++) {
            // Map the data frequency bins to our smaller bar count
            const dataIndex = Math.floor((i / barCount) * bufferLength);
            const value = dataArray[dataIndex] || 0;
            
            // Normalize value (0 to 255) to canvas height
            const rawHeight = (value / 255) * canvas.height * 0.95;
            // Add a tiny random flicker so it feels alive even at low volumes
            const flicker = isRecording ? Math.random() * 2 : 0;
            const finalHeight = Math.max(3, rawHeight + flicker);

            const x = i * (barWidth + spacing);
            const y = (canvas.height - finalHeight) / 2;

            // Rounded bar drawing
            ctx.fillStyle = color;
            drawRoundedRect(ctx, x, y, barWidth, finalHeight, 2);
          }
        };

        drawRealtime();
      } catch (err) {
        console.error("Failed to initialize live AudioContext, falling back to simulated visuals:", err);
        // Fallback to simulation if audio context fails
        runSimulation(ctx, canvas);
      }

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        if (audioCtx && audioCtx.state !== 'closed') {
          audioCtx.close().catch(() => {});
        }
      };
    } else if (isRecording) {
      // Run the dynamic pseudo-random frequency simulation (SpeechRecognition fallback)
      runSimulation(ctx, canvas);
    } else {
      // Not recording: Draw elegant flat line
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const spacing = 3;
      const totalSpacing = spacing * (barCount - 1);
      const barWidth = (canvas.width - totalSpacing) / barCount;
      
      ctx.fillStyle = `${color}40`; // 25% opacity
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + spacing);
        const y = (canvas.height - 3) / 2;
        drawRoundedRect(ctx, x, y, barWidth, 3, 1.5);
      }
    }

    // Helper to run simulated organic audio wave movement
    function runSimulation(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
      const heights = Array(barCount).fill(3);
      const targetHeights = Array(barCount).fill(3);
      let time = 0;

      const drawSimulated = () => {
        if (!canvasRef.current) return;
        animationRef.current = requestAnimationFrame(drawSimulated);
        time += 0.15;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const spacing = 3;
        const totalSpacing = spacing * (barCount - 1);
        const barWidth = (canvas.width - totalSpacing) / barCount;

        for (let i = 0; i < barCount; i++) {
          // Organic voice frequencies have higher amplitudes in lower-middle bands
          const frequencyWeight = i < barCount * 0.4 ? 1.0 : (i < barCount * 0.75 ? 0.7 : 0.4);
          
          // Generate an elegant multi-octave wave pattern
          const baseWave = Math.sin(time + i * 0.6) * 0.4 + 0.5;
          const secondaryWave = Math.sin(time * 1.7 - i * 0.3) * 0.3 + 0.3;
          const noise = Math.random() * 0.3;
          
          targetHeights[i] = Math.max(3, (baseWave + secondaryWave + noise) * canvas.height * 0.85 * frequencyWeight);

          // Smooth interpolation (lerp) for liquid physics feel
          heights[i] += (targetHeights[i] - heights[i]) * 0.28;

          const x = i * (barWidth + spacing);
          const y = (canvas.height - heights[i]) / 2;

          ctx.fillStyle = color;
          drawRoundedRect(ctx, x, y, barWidth, heights[i], 2);
        }
      };

      drawSimulated();
    }

    // Helper for rounded rectangles on canvas
    function drawRoundedRect(
      ctx: CanvasRenderingContext2D, 
      x: number, 
      y: number, 
      width: number, 
      height: number, 
      radius: number
    ) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [stream, isRecording, color, barCount]);

  return (
    <div className="flex items-center justify-center w-full bg-slate-950/5 border border-slate-500/10 rounded-xl p-2.5">
      <canvas
        ref={canvasRef}
        width={barCount * 12}
        height={height}
        className="w-full max-w-[280px]"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}
