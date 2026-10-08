import { useCallback, useEffect, useRef, useState } from "react";
import { isWebGLAvailable, loadThree } from "./three/loadThree";
import { SceneManager, SLIDE_COUNT } from "./three/SceneManager";
import { SLIDES } from "./data/slides";
import "./App.css";

type WebglState = "checking" | "ready" | "unsupported";

// Magical Web Audio API Music Box Synthesizer for "Happy Birthday"
class BirthdayMusicPlayer {
  ctx: AudioContext | null = null;
  isPlaying = false;
  loopTimer: any = null;
  gainNode: GainNode | null = null;

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = 0.35;
        this.gainNode.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playChime(freq: number, time: number, dur: number, vol = 0.45) {
    if (!this.ctx || !this.gainNode || freq <= 0) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq * 2.01, time);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc1.connect(g);
    osc2.connect(g);
    g.connect(this.gainNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.05);
    osc2.stop(time + dur + 0.05);
  }

  startMelody() {
    this.initContext();
    if (!this.ctx) return;
    this.stop();
    this.isPlaying = true;

    const tempo = 104;
    const b = 60 / tempo;
    const t0 = this.ctx.currentTime + 0.05;

    const N: Record<string, number> = {
      D3: 146.83, G3: 196.00, A3: 220.00, B3: 246.94, C4: 261.63,
      D4: 293.66, E4: 329.63, Fs4: 369.99, G4: 392.00, A4: 440.00,
      B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25
    };

    const notes: [number, number, number, number][] = [
      [N.D4, 0.7, 0.75, 0.45], [N.D4, 0.25, 0.25, 0.4], [N.E4, 1.0, 1.0, 0.5], [N.D4, 1.0, 1.0, 0.5], [N.G4, 1.0, 1.0, 0.55], [N.Fs4, 2.0, 2.0, 0.55],
      [N.D4, 0.7, 0.75, 0.45], [N.D4, 0.25, 0.25, 0.4], [N.E4, 1.0, 1.0, 0.5], [N.D4, 1.0, 1.0, 0.5], [N.A4, 1.0, 1.0, 0.55], [N.G4, 2.0, 2.0, 0.55],
      [N.D4, 0.7, 0.75, 0.45], [N.D4, 0.25, 0.25, 0.4], [N.D5, 1.0, 1.0, 0.6], [N.B4, 1.0, 1.0, 0.55], [N.G4, 1.0, 1.0, 0.5], [N.Fs4, 1.0, 1.0, 0.5], [N.E4, 2.0, 2.0, 0.55],
      [N.C5, 0.7, 0.75, 0.5], [N.C5, 0.25, 0.25, 0.45], [N.B4, 1.0, 1.0, 0.55], [N.G4, 1.0, 1.0, 0.55], [N.A4, 1.0, 1.0, 0.55], [N.G4, 2.6, 2.6, 0.6]
    ];

    const chords = [
      { beat: 0, notes: [N.G3, N.B3] }, { beat: 4, notes: [N.D3, N.A3] },
      { beat: 6, notes: [N.D3, N.A3] }, { beat: 10, notes: [N.G3, N.B3] },
      { beat: 12, notes: [N.G3, N.B3] }, { beat: 16, notes: [N.C4, N.E4] },
      { beat: 18, notes: [N.G3, N.D4] }, { beat: 20, notes: [N.D3, N.A3] },
      { beat: 22, notes: [N.G3, N.B3, N.D4] }
    ];

    let t = t0;
    notes.forEach(([f, dur, del, v]) => {
      this.playChime(f, t, dur * b * 1.5, v);
      t += del * b;
    });

    chords.forEach((c) => {
      const ct = t0 + c.beat * b;
      c.notes.forEach((n) => this.playChime(n, ct, b * 2.2, 0.22));
    });

    const totalMs = (t - t0 + b * 2) * 1000;
    this.loopTimer = setTimeout(() => {
      if (this.isPlaying) this.startMelody();
    }, totalMs);
  }

  stop() {
    this.isPlaying = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
  }
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneManager | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<BirthdayMusicPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [webglState, setWebglState] = useState<WebglState>("checking");
  const [slideIndex, setSlideIndex] = useState(0);
  const slideIndexRef = useRef(0);
  const [flamesBlown, setFlamesBlown] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  if (!playerRef.current) {
    playerRef.current = new BirthdayMusicPlayer();
  }

  slideIndexRef.current = slideIndex;

  const togglePlay = () => {
    const audio = audioRef.current;
    const player = playerRef.current;
    if (isPlaying) {
      if (audio) audio.pause();
      player?.stop();
      setIsPlaying(false);
    } else {
      if (audio && audio.currentSrc && !audio.error) {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          player?.startMelody();
          setIsPlaying(true);
        });
      } else {
        player?.startMelody();
        setIsPlaying(true);
      }
    }
  };

  // Autoplay background music with user gesture fallback
  useEffect(() => {
    const audio = audioRef.current;
    const player = playerRef.current;

    const startMusic = () => {
      if (audio && audio.currentSrc && !audio.error) {
        audio.play()
          .then(() => setIsPlaying(true))
          .catch(() => enableOnFirstGesture());
      } else {
        enableOnFirstGesture();
      }
    };

    const enableOnFirstGesture = () => {
      const handleFirstGesture = () => {
        if (audio && audio.currentSrc && !audio.error) {
          audio.play().then(() => setIsPlaying(true)).catch(() => {
            player?.startMelody();
            setIsPlaying(true);
          });
        } else {
          player?.startMelody();
          setIsPlaying(true);
        }
        window.removeEventListener("click", handleFirstGesture);
        window.removeEventListener("touchstart", handleFirstGesture);
        window.removeEventListener("keydown", handleFirstGesture);
      };
      window.addEventListener("click", handleFirstGesture);
      window.addEventListener("touchstart", handleFirstGesture);
      window.addEventListener("keydown", handleFirstGesture);
    };

    if (audio) {
      audio.addEventListener("error", () => {
        if (isPlaying) player?.startMelody();
      });
    }

    startMusic();

    return () => {
      player?.stop();
    };
  }, []);

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(SLIDE_COUNT - 1, index));
    setSlideIndex(clamped);
    sceneRef.current?.goToSlide(clamped);
  }, []);

  // Init three.js scene
  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;

    if (!isWebGLAvailable()) {
      setWebglState("unsupported");
      return;
    }

    let cancelled = false;
    loadThree()
      .then((THREE) => {
        if (cancelled || !containerRef.current) return;
        const manager = new SceneManager(containerRef.current, THREE, {
          reducedMotion: reducedMotionRef.current,
          onSettled: (index) => {
            if (index === SLIDE_COUNT - 1) {
              sceneRef.current?.celebrateConfetti();
            }
          },
        });
        sceneRef.current = manager;
        manager.start();
        setWebglState("ready");
      })
      .catch(() => {
        if (!cancelled) setWebglState("unsupported");
      });

    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Resize + pointer parallax + keyboard nav
  useEffect(() => {
    if (webglState !== "ready") return;

    const handleResize = () => sceneRef.current?.resize();
    const handlePointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      sceneRef.current?.setMouse(nx, ny);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches.length) return;
      const t = e.touches[0];
      const nx = (t.clientX / window.innerWidth) * 2 - 1;
      const ny = (t.clientY / window.innerHeight) * 2 - 1;
      sceneRef.current?.setMouse(nx, ny);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo(slideIndexRef.current + 1);
      else if (e.key === "ArrowLeft") goTo(slideIndexRef.current - 1);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [webglState, goTo]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 45) return;
    if (dx < 0) goTo(slideIndexRef.current + 1);
    else goTo(slideIndexRef.current - 1);
  };

  const handleButton = (id: string) => {
    if (id === "blow") {
      setFlamesBlown(true);
      sceneRef.current?.blowOutCandles(() => {
        goTo(1);
      });
    } else if (id === "celebrate") {
      sceneRef.current?.celebrateConfetti();
    } else if (id === "restart") {
      setFlamesBlown(false);
      goTo(0);
    }
  };

  const slide = SLIDES[slideIndex];

  return (
    <div
      className="app-root"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Floating background music toggle button */}
      <div className="music-control-wrap">
        <audio
          ref={audioRef}
          loop
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        >
          <source src="birthday-song.mp3" type="audio/mpeg" />
          <source src="public/birthday-song.mp3" type="audio/mpeg" />
        </audio>
        <button
          className={`music-btn ${isPlaying ? "playing" : ""}`}
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause background music" : "Play background music"}
          title={isPlaying ? "Pause music" : "Play music"}
        >
          <span className="music-icon">{isPlaying ? "🎵" : "🔇"}</span>
          <span className="music-text">{isPlaying ? "Music" : "Play"}</span>
          <span className="sound-bars">
            <span className="sound-bar" />
            <span className="sound-bar" />
            <span className="sound-bar" />
          </span>
        </button>
      </div>

      {webglState !== "unsupported" && (
        <div className="canvas-container" ref={containerRef} aria-hidden="true" />
      )}

      {webglState === "checking" && (
        <div className="loading-screen" role="status" aria-live="polite">
          <div className="loading-spark" />
          <p>Preparing your surprise…</p>
        </div>
      )}

      {webglState === "unsupported" && (
        <div className="fallback-screen">
          <div className="fallback-inner">
            <h1 className="slide-title">{slide.title}</h1>
            <p className="slide-text">{slide.text}</p>
            <div className="slide-buttons">
              {slide.buttons.map((b) => (
                <button key={b.id} className="btn-primary" onClick={() => handleButton(b.id)}>
                  {b.label}
                </button>
              ))}
            </div>
            <Dots count={SLIDE_COUNT} current={slideIndex} onSelect={goTo} />
            <div className="fallback-nav">
              <button className="btn-round" onClick={() => goTo(slideIndex - 1)} aria-label="Previous slide">
                ‹
              </button>
              <button className="btn-round" onClick={() => goTo(slideIndex + 1)} aria-label="Next slide">
                ›
              </button>
            </div>
          </div>
        </div>
      )}

      {webglState === "ready" && (
        <div className="overlay-ui">
          <div className="text-panel">
            <div className="text-inner" key={slide.id}>
              <h1 className="slide-title">{slide.title}</h1>
              <p className="slide-text">{slide.text}</p>
              {slide.buttons.length > 0 && (
                <div className="slide-buttons">
                  {slide.buttons.map((b) => (
                    <button
                      key={b.id}
                      className="btn-primary"
                      onClick={() => handleButton(b.id)}
                      disabled={b.id === "blow" && flamesBlown}
                    >
                      {b.id === "blow" && flamesBlown ? "Wish made! ✨" : b.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Dots count={SLIDE_COUNT} current={slideIndex} onSelect={goTo} />
          </div>

          <button
            className="btn-round nav-back"
            onClick={() => goTo(slideIndex - 1)}
            aria-label="Previous slide"
            disabled={slideIndex === 0}
          >
            ‹
          </button>
          <button
            className="btn-round nav-next"
            onClick={() => goTo(slideIndex + 1)}
            aria-label="Next slide"
            disabled={slideIndex === SLIDE_COUNT - 1}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

function Dots({
  count,
  current,
  onSelect,
}: {
  count: number;
  current: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="dots" role="tablist" aria-label="Slides">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          role="tab"
          aria-selected={i === current}
          aria-label={`Go to slide ${i + 1}`}
          className={`dot ${i === current ? "dot-active" : ""}`}
          onClick={() => onSelect(i)}
        />
      ))}
    </div>
  );
}
