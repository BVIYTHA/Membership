// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// animations.jsx
// Reusable animation starter: Stage, Timeline, Sprite, easing helpers.
// Exports (to window): Stage, Sprite, PlaybackBar, TextSprite, ImageSprite, RectSprite,
//   useTime, useTimeline, useSprite, Easing, interpolate, animate, clamp.
//
// Usage (in an HTML file that loads React + Babel):
//
//   <Stage width={1280} height={720} duration={10} background="#f6f4ef">
//     <MyScene />
//   </Stage>
//
// <Stage> auto-scales to the viewport and provides the scrubber, play/pause,
// ←/→ seek, space, and 0-to-reset controls, and persists the playhead.
// Inside <Stage>, any child can call useTime() to read the current
// playhead (seconds). Or wrap content in <Sprite start={1} end={4}>...</Sprite>
// to only render during that window -- children receive a `localTime` and
// `progress` via the useSprite() hook. Use Easing + interpolate()/animate()
// for tweens; TextSprite / ImageSprite / RectSprite have built-in entry/exit.
// Build YOUR scenes by composing Sprites inside a Stage.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

// ── Easing functions (hand-rolled, Popmotion-style) ─────────────────────────
// All easings take t ∈ [0,1] and return eased t ∈ [0,1] (may overshoot for back/elastic).
const Easing = {
  linear: (t) => t,

  // Quad
  easeInQuad:    (t) => t * t,
  easeOutQuad:   (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  easeInCubic:    (t) => t * t * t,
  easeOutCubic:   (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  // Quart
  easeInQuart:    (t) => t * t * t * t,
  easeOutQuart:   (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),

  // Expo
  easeInExpo:  (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10);
    return 1 - 0.5 * Math.pow(2, -20 * t + 10);
  },

  // Sine
  easeInSine:    (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine:   (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Back (overshoot)
  easeOutBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeInOutBack: (t) => {
    const c1 = 1.70158, c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },

  // Elastic
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

// ── Core interpolation helpers ──────────────────────────────────────────────

// Clamp a value to [min, max]
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// interpolate([0, 0.5, 1], [0, 100, 50], ease?) -> fn(t)
// Popmotion-style: linearly maps t across input keyframes to output values,
// with optional easing per segment (single fn or array of fns).
function interpolate(input, output, ease = Easing.linear) {
  return (t) => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const easeFn = Array.isArray(ease) ? (ease[i] || Easing.linear) : ease;
        const eased = easeFn(local);
        return output[i] + (output[i + 1] - output[i]) * eased;
      }
    }
    return output[output.length - 1];
  };
}

// animate({from, to, start, end, ease})(t) — simpler single-segment tween.
// Returns `from` before `start`, `to` after `end`.
function animate({ from = 0, to = 1, start = 0, end = 1, ease = Easing.easeInOutCubic }) {
  return (t) => {
    if (t <= start) return from;
    if (t >= end) return to;
    const local = (t - start) / (end - start);
    return from + (to - from) * ease(local);
  };
}

// ── Timeline context ────────────────────────────────────────────────────────

const TimelineContext = React.createContext({ time: 0, duration: 10, playing: false });

const useTime = () => React.useContext(TimelineContext).time;
const useTimeline = () => React.useContext(TimelineContext);

// ── Sprite ──────────────────────────────────────────────────────────────────
// Renders children only when the playhead is inside [start, end]. Provides
// a sub-context with `localTime` (seconds since start) and `progress` (0..1).
//
//   <Sprite start={2} end={5}>
//     {({ localTime, progress }) => <Thing x={progress * 100} />}
//   </Sprite>
//
// Or as a plain wrapper — children can call useSprite() themselves.

const SpriteContext = React.createContext({ localTime: 0, progress: 0, duration: 0 });
const useSprite = () => React.useContext(SpriteContext);

function Sprite({ start = 0, end = Infinity, children, keepMounted = false }) {
  const { time } = useTimeline();
  const visible = time >= start && time <= end;
  if (!visible && !keepMounted) return null;

  const duration = end - start;
  const localTime = Math.max(0, time - start);
  const progress = duration > 0 && isFinite(duration)
    ? clamp(localTime / duration, 0, 1)
    : 0;

  const value = { localTime, progress, duration, visible };

  return (
    <SpriteContext.Provider value={value}>
      {typeof children === 'function' ? children(value) : children}
    </SpriteContext.Provider>
  );
}

// ── Sample sprite components ────────────────────────────────────────────────

// TextSprite: fades/slides text in on entry, holds, then fades out on exit.
// Props: text, x, y, size, color, font, entryDur, exitDur, align
function TextSprite({
  text,
  x = 0, y = 0,
  size = 48,
  color = '#111',
  font = 'Inter, system-ui, sans-serif',
  weight = 600,
  entryDur = 0.45,
  exitDur = 0.35,
  entryEase = Easing.easeOutBack,
  exitEase = Easing.easeInCubic,
  align = 'left',
  letterSpacing = '-0.01em',
}) {
  const { localTime, duration } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let ty = 0;

  if (localTime < entryDur) {
    const t = entryEase(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    ty = (1 - t) * 16;
  } else if (localTime > exitStart) {
    const t = exitEase(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    ty = -t * 8;
  }

  const translateX = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      transform: `translate(${translateX}, ${ty}px)`,
      opacity,
      fontFamily: font,
      fontSize: size,
      fontWeight: weight,
      color,
      letterSpacing,
      whiteSpace: 'pre',
      lineHeight: 1.1,
      willChange: 'transform, opacity',
    }}>
      {text}
    </div>
  );
}

// ImageSprite: scales + fades in; optional Ken Burns drift during hold.
function ImageSprite({
  src,
  x = 0, y = 0,
  width = 400, height = 300,
  entryDur = 0.6,
  exitDur = 0.4,
  kenBurns = false,
  kenBurnsScale = 1.08,
  radius = 12,
  fit = 'cover',
  placeholder = null, // {label: string} for striped placeholder
}) {
  const { localTime, duration } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let scale = 1;

  if (localTime < entryDur) {
    const t = Easing.easeOutCubic(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    scale = 0.96 + 0.04 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInCubic(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = (kenBurns ? kenBurnsScale : 1) + 0.02 * t;
  } else if (kenBurns) {
    const holdSpan = exitStart - entryDur;
    const holdT = holdSpan > 0 ? (localTime - entryDur) / holdSpan : 0;
    scale = 1 + (kenBurnsScale - 1) * holdT;
  }

  const content = placeholder ? (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'repeating-linear-gradient(135deg, #e9e6df 0 10px, #dcd8cf 10px 20px)',
      color: '#6b6458',
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontSize: 13,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      {placeholder.label || 'image'}
    </div>
  ) : (
    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: fit, display: 'block' }} />
  );

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width, height,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      borderRadius: radius,
      overflow: 'hidden',
      willChange: 'transform, opacity',
    }}>
      {content}
    </div>
  );
}

// RectSprite: simple rectangle that animates position/size/color via props.
// Useful demo primitive — takes a `render` fn for per-frame customization.
function RectSprite({
  x = 0, y = 0,
  width = 100, height = 100,
  color = '#111',
  radius = 8,
  entryDur = 0.4,
  exitDur = 0.3,
  render, // optional: (ctx) => style overrides
}) {
  const spriteCtx = useSprite();
  const { localTime, duration } = spriteCtx;
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let scale = 1;

  if (localTime < entryDur) {
    const t = Easing.easeOutBack(clamp(localTime / entryDur, 0, 1));
    opacity = clamp(localTime / entryDur, 0, 1);
    scale = 0.4 + 0.6 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInQuad(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = 1 - 0.15 * t;
  }

  const overrides = render ? render(spriteCtx) : {};

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width, height,
      background: color,
      borderRadius: radius,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      willChange: 'transform, opacity',
      ...overrides,
    }} />
  );
}


function Stage({
  width = 1280,
  height = 720,
  duration = 10,
  background = '#f6f4ef',
  fps = 60,
  loop = true,
  autoplay = true,
  persistKey = 'animstage',
  children,
}) {
  const [time, setTime] = React.useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(persistKey + ':t') || '0');
      return isFinite(v) ? clamp(v, 0, duration) : 0;
    } catch { return 0; }
  });
  const [playing, setPlaying] = React.useState(autoplay);
  const [hoverTime, setHoverTime] = React.useState(null);
  const [scale, setScale] = React.useState(1);

  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastTsRef = React.useRef(null);

  // Persist playhead
  React.useEffect(() => {
    try { localStorage.setItem(persistKey + ':t', String(time)); } catch {}
  }, [time, persistKey]);

  // Auto-scale to fit viewport
  React.useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => {
      const barH = 44; // playback bar height
      const s = Math.min(
        el.clientWidth / width,
        (el.clientHeight - barH) / height
      );
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [width, height]);

  // Animation loop
  React.useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    const step = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime((t) => {
        let next = t + dt;
        if (next >= duration) {
          if (loop) next = next % duration;
          else { next = duration; setPlaying(false); }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, duration, loop]);

  // Keyboard: space = play/pause, ← → = seek
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(p => !p);
      } else if (e.code === 'ArrowLeft') {
        setTime(t => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.code === 'ArrowRight') {
        setTime(t => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.key === '0' || e.code === 'Home') {
        setTime(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration]);

  const displayTime = hoverTime != null ? hoverTime : time;

  const ctxValue = React.useMemo(
    () => ({ time: displayTime, duration, playing, setTime, setPlaying }),
    [displayTime, duration, playing]
  );

  return (
    <div
      ref={stageRef}
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        background: '#0a0a0a',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Canvas area — vertically centered in remaining space */}
      <div style={{
        flex: 1,
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <div
          ref={canvasRef}
          style={{
            width, height,
            background,
            position: 'relative',
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            flexShrink: 0,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}
        >
          <TimelineContext.Provider value={ctxValue}>
            {children}
          </TimelineContext.Provider>
        </div>
      </div>

      {/* Playback bar — stacked below canvas, never overlapping */}
      <PlaybackBar
        time={displayTime}
        actualTime={time}
        duration={duration}
        playing={playing}
        onPlayPause={() => setPlaying(p => !p)}
        onReset={() => { setTime(0); }}
        onSeek={(t) => setTime(t)}
        onHover={(t) => setHoverTime(t)}
      />
    </div>
  );
}

// ── Playback bar ────────────────────────────────────────────────────────────
// Play/pause, return-to-begin, scrub track, time display.
// Uses fixed-width time fields so layout doesn't thrash.

function PlaybackBar({ time, duration, playing, onPlayPause, onReset, onSeek, onHover }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);

  const timeFromEvent = React.useCallback((e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    return x * duration;
  }, [duration]);

  const onTrackMove = (e) => {
    if (!trackRef.current) return;
    const t = timeFromEvent(e);
    if (dragging) {
      onSeek(t);
    } else {
      onHover(t);
    }
  };

  const onTrackLeave = () => {
    if (!dragging) onHover(null);
  };

  const onTrackDown = (e) => {
    setDragging(true);
    const t = timeFromEvent(e);
    onSeek(t);
    onHover(null);
  };

  React.useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(false);
    const onMove = (e) => {
      if (!trackRef.current) return;
      const t = timeFromEvent(e);
      onSeek(t);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, [dragging, timeFromEvent, onSeek]);

  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const fmt = (t) => {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.floor((total * 100) % 100);
    return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  const mono = 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 16px',
      background: 'rgba(20,20,20,0.92)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',

      borderRadius: 8,
      color: '#f6f4ef',
      fontFamily: 'Inter, system-ui, sans-serif',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      <IconButton onClick={onReset} title="Return to start (0)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 2v10M12 2L5 7l7 5V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        </svg>
      </IconButton>
      <IconButton onClick={onPlayPause} title="Play/pause (space)">
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="2" width="3" height="10" fill="currentColor"/>
            <rect x="8" y="2" width="3" height="10" fill="currentColor"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 2l9 5-9 5V2z" fill="currentColor"/>
          </svg>
        )}
      </IconButton>

      {/* Current time: fixed width so it doesn't thrash */}
      <div style={{
        fontFamily: mono,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        width: 64, textAlign: 'right',
        color: '#f6f4ef',
      }}>
        {fmt(time)}
      </div>

      {/* Scrub track */}
      <div
        ref={trackRef}
        onMouseMove={onTrackMove}
        onMouseLeave={onTrackLeave}
        onMouseDown={onTrackDown}
        style={{
          flex: 1,
          height: 22,
          position: 'relative',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}
      >
        <div style={{
          position: 'absolute',
          left: 0, right: 0, height: 4,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 2,
        }}/>
        <div style={{
          position: 'absolute',
          left: 0, width: `${pct}%`, height: 4,
          background: 'oklch(72% 0.12 250)',
          borderRadius: 2,
        }}/>
        <div style={{
          position: 'absolute',
          left: `${pct}%`, top: '50%',
          width: 12, height: 12,
          marginLeft: -6, marginTop: -6,
          background: '#fff',
          borderRadius: 6,
          boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
        }}/>
      </div>

      {/* Duration: fixed width */}
      <div style={{
        fontFamily: mono,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        width: 64, textAlign: 'left',
        color: 'rgba(246,244,239,0.55)',
      }}>
        {fmt(duration)}
      </div>
    </div>
  );
}

function IconButton({ children, onClick, title }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        color: '#f6f4ef',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 120ms',
      }}
    >
      {children}
    </button>
  );
}


Object.assign(window, {
  Easing, interpolate, animate, clamp,
  TimelineContext, useTime, useTimeline,
  Sprite, SpriteContext, useSprite,
  TextSprite, ImageSprite, RectSprite,
  Stage, PlaybackBar,
});



/* ===== CARTOON SCENES ===== */
// @ds-adherence-ignore -- hand-drawn cartoon scenes; raw SVG primitives + hex by design
// THE OVERNIGHT MULTIPLIER — cartoon / sketchbook remake
// Loaded AFTER animations.jsx, which puts Stage/Sprite/Easing/clamp/useTime/useSprite on window.

const { useRef, useEffect, useState } = React;

// ── Tropical doodle palette ──────────────────────────────────────────────────
const C = {
  paper: '#f7ecd2',
  ink:   '#26414a',
  sea:   '#1f9bc4',
  seaD:  '#15789e',
  sky:   '#bfe3ea',
  sun:   '#ffce3f',
  sunD:  '#eaab2c',
  coral: '#ff6f59',
  coralD:'#e2503b',
  palm:  '#37b07a',
  palmD: '#2a8c61',
  pink:  '#ff93b4',
  gold:  '#ffc94d',
  goldD: '#e9a92f',
  white: '#fffdf6',
};
const HAND = "'Shantell Sans', 'Comic Sans MS', cursive";
const MARK = "'Caveat', cursive";

// hand-drawn irregular corners
const BR = {
  card: '16px 30px 18px 26px / 26px 18px 28px 16px',
  pill: '40px 32px 38px 34px / 32px 40px 30px 42px',
};

const lerp = (a, b, t) => a + (b - a) * t;
const tint = (hex) => hex + '2e';

// ════════════════════════════════════════════════════════════════════════════
//  Hand-drawn wobble filters (defined once, referenced via CSS filter)
// ════════════════════════════════════════════════════════════════════════════
function Defs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <filter id="rough" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.013" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="boil" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="2" seed="2" result="n">
            <animate attributeName="seed" values="2;6;9;3;7" dur="0.55s" calcMode="discrete" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  CAST
// ════════════════════════════════════════════════════════════════════════════

// Buck — the overnight dollar coin, googly-eyed with noodle limbs
function Buck({ size = 210, t = 0, glasses = false }) {
  const swing = Math.sin(t * 4) * 8;
  const pupil = Math.sin(t * 2) * 1.6;
  const blink = Math.sin(t * 1.3) > 0.95 ? 1 : 0;
  const ey = 11 * (1 - 0.82 * blink);
  return (
    <svg width={size} height={size * 192 / 150} viewBox="0 0 150 192" style={{ overflow: 'visible', filter: 'url(#boil)' }}>
      {/* legs + shoes */}
      <path d="M62 150 Q58 176 54 186" stroke={C.ink} strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M88 150 Q92 176 96 186" stroke={C.ink} strokeWidth="7" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="188" rx="14" ry="8" fill={C.ink} />
      <ellipse cx="100" cy="188" rx="14" ry="8" fill={C.ink} />
      {/* arms + hands */}
      <path d={`M32 110 Q${13 + swing} ${106 - swing} ${8 + swing} ${86 - swing}`} stroke={C.ink} strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d={`M118 110 Q${137 - swing} ${106 - swing} ${142 - swing} ${86 - swing}`} stroke={C.ink} strokeWidth="7" fill="none" strokeLinecap="round" />
      <circle cx={8 + swing} cy={86 - swing} r="7" fill={C.gold} stroke={C.ink} strokeWidth="4" />
      <circle cx={142 - swing} cy={86 - swing} r="7" fill={C.gold} stroke={C.ink} strokeWidth="4" />
      {/* $ body — the vertical bar doubles as the nose */}
      <text x="75" y="152" textAnchor="middle" fontFamily={HAND} fontWeight="800" fontSize="180" fill={C.gold} stroke={C.ink} strokeWidth="11" paintOrder="stroke" strokeLinejoin="round" strokeLinecap="round">$</text>
      {/* cheeks */}
      <circle cx="44" cy="84" r="9" fill={C.coral} opacity="0.55" />
      <circle cx="106" cy="84" r="9" fill={C.coral} opacity="0.55" />
      {/* eyes */}
      <ellipse cx="58" cy="64" rx="11" ry={ey + 1} fill={C.white} stroke={C.ink} strokeWidth="4" />
      <ellipse cx="92" cy="64" rx="11" ry={ey + 1} fill={C.white} stroke={C.ink} strokeWidth="4" />
      <circle cx={58 + pupil} cy="66" r="5" fill={C.ink} />
      <circle cx={92 + pupil} cy="66" r="5" fill={C.ink} />
      {/* smile */}
      <path d="M56 90 Q75 108 94 90" stroke={C.ink} strokeWidth="6" fill="none" strokeLinecap="round" />
      {glasses && (
        <g>
          <rect x="42" y="54" width="30" height="20" rx="6" fill={C.ink} />
          <rect x="78" y="54" width="30" height="20" rx="6" fill={C.ink} />
          <path d="M72 60 L78 60" stroke={C.ink} strokeWidth="5" />
          <ellipse cx="50" cy="60" rx="5" ry="3" fill={C.white} opacity="0.5" />
        </g>
      )}
    </svg>
  );
}

// A townsfolk hat / hair, drawn atop a Guy head
function Hat({ type }) {
  switch (type) {
    case 'chef':
      return (
        <g>
          <rect x="40" y="14" width="40" height="20" rx="6" fill={C.white} stroke={C.ink} strokeWidth="4" />
          <circle cx="46" cy="14" r="12" fill={C.white} stroke={C.ink} strokeWidth="4" />
          <circle cx="64" cy="9" r="13" fill={C.white} stroke={C.ink} strokeWidth="4" />
          <circle cx="82" cy="14" r="12" fill={C.white} stroke={C.ink} strokeWidth="4" />
        </g>
      );
    case 'fisher':
      return (
        <g>
          <path d="M44 30 Q44 8 65 8 Q86 8 86 30 Z" fill={C.sun} stroke={C.ink} strokeWidth="4" strokeLinejoin="round" />
          <ellipse cx="65" cy="30" rx="34" ry="7" fill={C.sunD} stroke={C.ink} strokeWidth="4" />
        </g>
      );
    case 'captain':
      return (
        <g>
          <path d="M42 26 Q42 8 65 8 Q88 8 88 26 Z" fill={C.sea} stroke={C.ink} strokeWidth="4" strokeLinejoin="round" />
          <rect x="40" y="24" width="50" height="8" rx="4" fill={C.white} stroke={C.ink} strokeWidth="4" />
        </g>
      );
    case 'sun':
      return (
        <g>
          <ellipse cx="65" cy="30" rx="42" ry="10" fill={C.sun} stroke={C.ink} strokeWidth="4" />
          <path d="M48 30 Q48 6 65 6 Q82 6 82 30 Z" fill={C.coral} stroke={C.ink} strokeWidth="4" strokeLinejoin="round" />
          <path d="M48 22 Q65 28 82 22" stroke={C.ink} strokeWidth="3" fill="none" />
        </g>
      );
    default:
      return <path d="M51 32 Q55 16 65 28 Q75 16 79 32" stroke={C.ink} strokeWidth="5" fill="none" strokeLinecap="round" />;
  }
}

// Guy — a smiling island blob, the supporting cast
function Guy({ size = 160, color = C.sea, hat = 'none', t = 0 }) {
  const blink = Math.sin(t * 1.7 + 1) > 0.94 ? 1 : 0;
  const ey = 8 * (1 - 0.8 * blink);
  return (
    <svg width={size} height={size} viewBox="0 0 130 130" style={{ overflow: 'visible', filter: 'url(#boil)' }}>
      <path d="M28 120 Q20 70 40 54 Q34 30 65 30 Q96 30 90 54 Q110 70 102 120 Z" fill={color} stroke={C.ink} strokeWidth="6" strokeLinejoin="round" />
      <path d="M30 96 Q14 100 12 112" stroke={C.ink} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M100 96 Q116 100 118 112" stroke={C.ink} strokeWidth="6" fill="none" strokeLinecap="round" />
      <ellipse cx="52" cy="62" rx="7" ry={ey + 2} fill={C.white} stroke={C.ink} strokeWidth="3.5" />
      <ellipse cx="78" cy="62" rx="7" ry={ey + 2} fill={C.white} stroke={C.ink} strokeWidth="3.5" />
      <circle cx="52" cy="64" r="3.5" fill={C.ink} />
      <circle cx="78" cy="64" r="3.5" fill={C.ink} />
      <path d="M50 80 Q65 94 80 80" stroke={C.ink} strokeWidth="5" fill="none" strokeLinecap="round" />
      <Hat type={hat} />
    </svg>
  );
}

// A small spinning coin
function MiniCoin({ size = 70 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 70 70" style={{ overflow: 'visible', filter: 'url(#rough)' }}>
      <circle cx="35" cy="35" r="30" fill={C.gold} stroke={C.ink} strokeWidth="5" />
      <circle cx="35" cy="35" r="23" fill="none" stroke={C.ink} strokeWidth="2.5" opacity="0.4" />
      <text x="35" y="48" textAnchor="middle" fontFamily={HAND} fontWeight="700" fontSize="36" fill={C.ink}>$</text>
    </svg>
  );
}

// 12 simple doodle shop icons (0..64 box)
function Icon({ type, color }) {
  const k = { stroke: C.ink, strokeWidth: 5, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (type) {
    case 'bed':
      return (
        <g>
          <path d="M5 36 V52 M5 36 H50 V52" {...k} fill="none" />
          <rect x="5" y="36" width="46" height="14" fill={color} {...k} />
          <rect x="9" y="26" width="18" height="11" rx="4" fill={C.white} {...k} />
          <path d="M9 52 V58 M50 52 V58" {...k} />
        </g>
      );
    case 'plate':
      return (
        <g>
          <circle cx="38" cy="34" r="17" fill={C.white} {...k} />
          <path d="M10 16 V30 M15 16 V30 M20 16 V30 M15 30 V52" {...k} fill="none" />
        </g>
      );
    case 'boat':
      return (
        <g>
          <path d="M8 38 H56 L48 52 H16 Z" fill={color} {...k} />
          <path d="M32 38 V10" {...k} />
          <path d="M32 12 L52 34 H32 Z" fill={C.white} {...k} />
        </g>
      );
    case 'bag':
      return (
        <g>
          <path d="M14 24 H50 L46 54 H18 Z" fill={color} {...k} />
          <path d="M23 24 Q23 10 32 10 Q41 10 41 24" {...k} fill="none" />
        </g>
      );
    case 'fish':
      return (
        <g>
          <ellipse cx="29" cy="34" rx="20" ry="13" fill={color} {...k} />
          <path d="M49 34 L62 24 V44 Z" fill={color} {...k} />
          <circle cx="20" cy="30" r="2.6" fill={C.ink} />
        </g>
      );
    case 'fuel':
      return <path d="M32 12 C46 32 46 42 32 53 C18 42 18 32 32 12 Z" fill={color} {...k} />;
    case 'sheet':
      return (
        <g>
          <path d="M6 16 H58" {...k} />
          <path d="M18 16 V44 Q24 38 30 44 Q36 38 42 44 V16 Z" fill={C.white} {...k} />
          <path d="M22 11 V19 M42 11 V19" {...k} />
        </g>
      );
    case 'hammer':
      return (
        <g transform="rotate(18 32 34)">
          <rect x="29" y="22" width="8" height="34" rx="3" fill={color} {...k} />
          <rect x="18" y="12" width="30" height="13" rx="3" fill={color} {...k} />
        </g>
      );
    case 'cart':
      return (
        <g>
          <path d="M16 26 H48 L45 54 H19 Z" fill={color} {...k} />
          <path d="M27 26 V13 M35 26 V11 M43 26 V15" stroke={C.palmD} strokeWidth="5" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'house':
      return (
        <g>
          <path d="M12 31 L32 13 L52 31 Z" fill={color} {...k} />
          <rect x="18" y="31" width="28" height="22" fill={C.white} {...k} />
          <rect x="28" y="39" width="9" height="14" fill={color} {...k} />
        </g>
      );
    case 'cross':
      return (
        <g>
          <rect x="13" y="13" width="38" height="38" rx="9" fill={color} {...k} />
          <path d="M32 22 V42 M22 32 H42" stroke={C.white} strokeWidth="7" strokeLinecap="round" />
        </g>
      );
    case 'cap':
      return (
        <g>
          <path d="M32 16 L57 26 L32 36 L7 26 Z" fill={color} {...k} />
          <path d="M18 30 V42 Q32 51 46 42 V30" {...k} fill="none" />
          <path d="M57 26 V41" {...k} />
          <circle cx="57" cy="43" r="3.4" fill={C.ink} />
        </g>
      );
    default:
      return null;
  }
}

// Striped market awning for a stall
function Awning({ color, w = 392 }) {
  const n = 7, sw = w / n, h = 38, dip = 18;
  let d = `M0 0 H${w} V${h}`;
  for (let i = n; i > 0; i--) d += ` Q ${(i - 0.5) * sw} ${h + dip} ${(i - 1) * sw} ${h}`;
  d += ' Z';
  return (
    <svg width={w} height={h + dip + 4} viewBox={`0 0 ${w} ${h + dip + 4}`} style={{ display: 'block', filter: 'url(#rough)' }}>
      <path d={d} fill={color} stroke={C.ink} strokeWidth="5" strokeLinejoin="round" />
      {Array.from({ length: Math.ceil(n / 2) }).map((_, j) => (
        <rect key={j} x={j * 2 * sw} y="0" width={sw} height={h} fill={C.white} opacity="0.26" />
      ))}
    </svg>
  );
}

// A shop stall card
function Stall({ x, y, color, action, name, icon, pop, fill, rot }) {
  const s = lerp(0.7, 1, Easing.easeOutBack(clamp(pop, 0, 1)));
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 404, transform: `translate(-50%,-50%) scale(${s}) rotate(${rot}deg)`, opacity: clamp(pop / 0.3, 0, 1) }}>
      <div style={{ position: 'absolute', left: 10, top: 14, right: -6, bottom: -8, background: C.ink, opacity: 0.14, borderRadius: BR.card }} />
      <div style={{ position: 'relative', background: C.white, border: `6px solid ${C.ink}`, borderRadius: BR.card, overflow: 'hidden' }}>
        <Awning color={color} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '14px 22px 24px' }}>
          <div style={{ flexShrink: 0, width: 86, height: 86, borderRadius: '50%', background: tint(color), border: `5px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="54" height="54" viewBox="0 0 64 64" style={{ overflow: 'visible', filter: 'url(#rough)' }}><Icon type={icon} color={color} /></svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: HAND, fontWeight: 800, fontSize: 44, color: C.ink, lineHeight: 1 }}>{action}</div>
            <div style={{ fontFamily: HAND, fontWeight: 500, fontSize: 27, color: C.ink, opacity: 0.6, marginTop: 6 }}>{name}</div>
          </div>
        </div>
        <div style={{ position: 'absolute', right: 16, top: 62, opacity: clamp(fill * 2, 0, 1), transform: `scale(${lerp(0.4, 1, Easing.easeOutBack(clamp(fill, 0, 1)))}) rotate(${(1 - fill) * 40}deg)` }}>
          <MiniCoin size={46} />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ISLAND BACKDROP (persistent, always gently moving)
// ════════════════════════════════════════════════════════════════════════════
function Sun({ t }) {
  return (
    <div style={{ position: 'absolute', left: 760, top: 60 }}>
      <svg width="300" height="300" viewBox="0 0 300 300" style={{ overflow: 'visible', filter: 'url(#rough)' }}>
        <g transform={`rotate(${t * 10} 150 150)`} stroke={C.sunD} strokeWidth="9" strokeLinecap="round">
          {Array.from({ length: 12 }).map((_, i) => {
            const a = i * 30 * Math.PI / 180;
            return <line key={i} x1={150 + Math.cos(a) * 66} y1={150 + Math.sin(a) * 66} x2={150 + Math.cos(a) * 100} y2={150 + Math.sin(a) * 100} />;
          })}
        </g>
        <circle cx="150" cy="150" r="58" fill={C.sun} stroke={C.ink} strokeWidth="6" />
        <circle cx="136" cy="143" r="5" fill={C.ink} />
        <circle cx="164" cy="143" r="5" fill={C.ink} />
        <path d="M134 160 Q150 173 166 160" stroke={C.ink} strokeWidth="5" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function Cloud({ baseX, y, scale, speed, t }) {
  const x = ((baseX + t * speed) % 1320) - 160;
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `scale(${scale})`, opacity: 0.9 }}>
      <svg width="220" height="100" viewBox="0 0 220 100" style={{ filter: 'url(#rough)' }}>
        <path d="M20 80 Q-2 80 6 60 Q4 38 28 44 Q34 18 64 28 Q80 6 110 24 Q140 8 152 36 Q188 30 184 58 Q210 62 196 80 Z" fill={C.white} stroke={C.ink} strokeWidth="5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Palm({ x, y, scale = 1, flip = false, t = 0 }) {
  const sway = Math.sin(t * 1.1 + (flip ? 1 : 0)) * 3;
  return (
    <div style={{ position: 'absolute', left: x, top: y, transformOrigin: 'bottom center', transform: `translateX(-50%) scale(${flip ? -scale : scale}, ${scale}) rotate(${sway}deg)` }}>
      <svg width="240" height="340" viewBox="0 0 240 340" style={{ overflow: 'visible', filter: 'url(#rough)' }}>
        <path d="M118 340 Q104 220 128 116" stroke={C.palmD} strokeWidth="15" fill="none" strokeLinecap="round" />
        <g stroke={C.palm} strokeWidth="12" fill="none" strokeLinecap="round">
          <path d="M128 116 Q66 72 16 92" />
          <path d="M128 116 Q74 100 28 156" />
          <path d="M128 116 Q108 60 92 10" />
          <path d="M128 116 Q152 64 200 42" />
          <path d="M128 116 Q178 96 226 126" />
          <path d="M128 116 Q150 104 168 168" />
        </g>
        <circle cx="120" cy="122" r="9" fill={C.palmD} stroke={C.ink} strokeWidth="3" />
        <circle cx="136" cy="124" r="8" fill={C.palmD} stroke={C.ink} strokeWidth="3" />
      </svg>
    </div>
  );
}

function Island() {
  const t = useTime();
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(130% 56% at 50% -10%, ${C.sky} 0%, rgba(191,227,234,0) 48%)` }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${C.ink}14 2.2px, transparent 2.2px)`, backgroundSize: '48px 48px', opacity: 0.45 }} />
      <Sun t={t} />
      <Cloud baseX={-40} y={250} scale={0.85} speed={24} t={t} />
      <Cloud baseX={520} y={150} scale={0.55} speed={17} t={t} />
      <Cloud baseX={980} y={340} scale={0.72} speed={21} t={t} />
      <svg width="1080" height="240" viewBox="0 0 1080 240" style={{ position: 'absolute', left: 0, bottom: 0 }}>
        <path d="M0 150 Q90 118 180 150 T360 150 T540 150 T720 150 T900 150 T1080 150 V240 H0 Z" fill={C.sea} opacity="0.16" stroke="none" />
        <path d="M0 150 Q90 118 180 150 T360 150 T540 150 T720 150 T900 150 T1080 150" fill="none" stroke={C.seaD} strokeWidth="4" opacity="0.4" />
      </svg>
      <Palm x={92} y={1592} scale={0.85} t={t} />
      <Palm x={1004} y={1600} scale={0.78} flip t={t} />
    </div>
  );
}

function TopBanner() {
  return (
    <div style={{ position: 'absolute', top: 92, left: 0, right: 0, textAlign: 'center', zIndex: 5 }}>
      <span style={{ display: 'inline-block', fontFamily: HAND, fontWeight: 800, fontSize: 34, color: C.ink, background: C.sun, border: `5px solid ${C.ink}`, borderRadius: BR.pill, padding: '8px 32px', transform: 'rotate(-1.5deg)' }}>VOLUME › VALUE</span>
    </div>
  );
}

function Foot({ label }) {
  return (
    <div style={{ position: 'absolute', bottom: 92, left: 0, right: 0, textAlign: 'center', fontFamily: HAND, fontWeight: 700, fontSize: 27, color: C.ink, opacity: 0.5, letterSpacing: '0.05em' }}>{label}</div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  SCENE 1 — HOOK
// ════════════════════════════════════════════════════════════════════════════
function Hook() {
  const { progress: p, localTime: lt } = useSprite();
  const op = clamp(p / 0.05, 0, 1) * clamp((1 - p) / 0.12, 0, 1);
  const buckIn = Easing.easeOutBack(clamp(lt / 0.6, 0, 1));
  const by = -Math.abs(Math.sin(lt * 2.3)) * 42;
  const kick = Easing.easeOutBack(clamp((lt - 0.2) / 0.5, 0, 1));
  const bubbleIn = clamp((lt - 1.0) / 0.4, 0, 1);
  const titleIn = clamp((lt - 1.5) / 0.6, 0, 1);
  const subIn = clamp((lt - 2.3) / 0.6, 0, 1);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', top: 440, left: 0, right: 0, textAlign: 'center', transform: `scale(${kick})` }}>
        <span style={{ display: 'inline-block', fontFamily: HAND, fontWeight: 800, fontSize: 36, color: C.ink, background: C.pink, border: `5px solid ${C.ink}`, borderRadius: BR.pill, padding: '8px 30px', transform: 'rotate(2deg)' }}>MEET BUCK</span>
      </div>
      <div style={{ position: 'absolute', left: 188, top: 870, transform: 'translate(-50%,-50%)', opacity: clamp((lt - 0.4) / 0.5, 0, 1) }}>
        <Guy size={150} color={C.palm} hat="sun" t={lt + 1} />
      </div>
      <div style={{ position: 'absolute', left: 648, top: 600, width: 350, opacity: bubbleIn, transform: `scale(${lerp(0.8, 1, bubbleIn)})`, transformOrigin: 'bottom left' }}>
        <div style={{ position: 'relative', background: C.white, border: `5px solid ${C.ink}`, borderRadius: '32px 26px 34px 10px', padding: '16px 22px', fontFamily: HAND, fontWeight: 700, fontSize: 35, color: C.ink, lineHeight: 1.15, transform: 'rotate(-2deg)' }}>
          Don't just count me — watch what I <span style={{ color: C.coralD }}>do!</span>
          <svg width="42" height="36" viewBox="0 0 42 36" style={{ position: 'absolute', left: 30, bottom: -30 }}><path d="M6 0 L38 6 L18 34 Z" fill={C.white} stroke={C.ink} strokeWidth="5" strokeLinejoin="round" /></svg>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1180, left: 80, right: 80, textAlign: 'center', opacity: titleIn, transform: `translateY(${(1 - titleIn) * 20}px)` }}>
        <div style={{ fontFamily: HAND, fontWeight: 800, fontSize: 86, lineHeight: 1.02, color: C.ink }}>One overnight dollar.</div>
        <div style={{ fontFamily: MARK, fontWeight: 700, fontSize: 80, color: C.coralD, marginTop: 4 }}>He won't sit still.</div>
      </div>
      <div style={{ position: 'absolute', top: 1500, left: 0, right: 0, textAlign: 'center', fontFamily: HAND, fontWeight: 600, fontSize: 42, color: C.ink, opacity: subIn }}>one dollar · three laps · let's go →</div>
      <Foot label="WARM-UP" />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  LAP SCENE — reused for Direct / Indirect / Induced
// ════════════════════════════════════════════════════════════════════════════
const SRC = { x: 540, y: 720 };
const STALLS = [{ x: 296, y: 1060 }, { x: 784, y: 1060 }, { x: 296, y: 1380 }, { x: 784, y: 1380 }];

function flyPos(from, to, tt) {
  const cx = (from.x + to.x) / 2, cy = Math.min(from.y, to.y) - 130;
  const u = 1 - tt;
  return {
    x: u * u * from.x + 2 * u * tt * cx + tt * tt * to.x,
    y: u * u * from.y + 2 * u * tt * cy + tt * tt * to.y,
  };
}

function Lap({ cfg }) {
  const { progress: p, localTime: lt } = useSprite();
  const op = clamp(p / 0.05, 0, 1) * clamp((1 - p) / 0.1, 0, 1);
  const headIn = Easing.easeOutBack(clamp(p / 0.12, 0, 1));
  const buckIn = Easing.easeOutBack(clamp((p - 0.03) / 0.12, 0, 1));
  const by = -Math.abs(Math.sin(lt * 3)) * 34;
  const capOp = clamp((p - 0.6) / 0.12, 0, 1);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      {/* header */}
      <div style={{ position: 'absolute', top: 248, left: 88, right: 88, opacity: clamp(p / 0.08, 0, 1), display: 'flex', alignItems: 'center', gap: 22 }}>
        <div style={{ flexShrink: 0, width: 132, height: 132, borderRadius: '50% 48% 52% 50% / 50% 52% 48% 50%', background: cfg.color, border: `6px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${headIn}) rotate(-4deg)`, boxShadow: `8px 9px 0 ${C.ink}22` }}>
          <span style={{ fontFamily: MARK, fontWeight: 700, fontSize: 108, color: C.white, lineHeight: 1 }}>{cfg.num}</span>
        </div>
        <div>
          <div style={{ fontFamily: HAND, fontWeight: 700, fontSize: 26, letterSpacing: '0.04em', color: cfg.color }}>{cfg.label}</div>
          <div style={{ fontFamily: HAND, fontWeight: 800, fontSize: 50, color: C.ink, lineHeight: 1.05, marginTop: 4 }}>{cfg.title}</div>
        </div>
      </div>
      {/* host guy — clearly secondary, smaller + off to the side */}
      <div style={{ position: 'absolute', left: 838, top: 812, transform: 'translate(-50%,-50%)', opacity: clamp((p - 0.08) / 0.1, 0, 1) }}>
        <Guy size={116} color={cfg.color} hat={cfg.hat} t={lt + 0.5} />
      </div>
      {/* flying coins */}
      {STALLS.map((s, i) => {
        const ct = clamp((p - (0.16 + i * 0.07)) / 0.17, 0, 1);
        if (ct <= 0 || ct >= 1) return null;
        const pos = flyPos(SRC, s, Easing.easeInOutQuad(ct));
        return (
          <div key={'fc' + i} style={{ position: 'absolute', left: pos.x, top: pos.y, transform: `translate(-50%,-50%) rotate(${ct * 380}deg)` }}>
            <MiniCoin size={56} />
          </div>
        );
      })}
      {/* stalls */}
      {STALLS.map((s, i) => {
        const pop = clamp((p - (0.28 + i * 0.07)) / 0.14, 0, 1);
        const fill = clamp((p - (0.34 + i * 0.07)) / 0.16, 0, 1);
        const c = cfg.chips[i];
        return <Stall key={'st' + i} x={s.x} y={s.y} color={c.color} action={c.action} name={c.name} icon={c.icon} pop={pop} fill={fill} rot={i % 2 ? 2.4 : -2.4} />;
      })}
      {/* caption */}
      <div style={{ position: 'absolute', top: 1600, left: 110, right: 110, textAlign: 'center', fontFamily: HAND, fontWeight: 700, fontSize: 46, lineHeight: 1.25, color: C.ink, opacity: capOp, transform: `translateY(${(1 - capOp) * 14}px)` }}>{cfg.caption}</div>
      <Foot label={cfg.foot} />
    </div>
  );
}

const DIRECT = {
  num: '1', label: 'LAP 1 · STRAIGHT IN', title: 'Buck checks in & cuts loose', color: C.sea, hat: 'chef',
  chips: [
    { action: 'Sleeps here', name: 'Beachy Hotel', icon: 'bed', color: C.sea },
    { action: 'Eats here', name: 'Snapper Shack', icon: 'plate', color: C.coral },
    { action: 'Sails here', name: 'Reef Tours', icon: 'boat', color: C.palm },
    { action: 'Shops here', name: 'The Gift Hut', icon: 'bag', color: C.sun },
  ],
  caption: 'Every cent lands straight in local tills.', foot: 'LAP 1 / 3 · DIRECT',
};
const INDIRECT = {
  num: '2', label: 'LAP 2 · THE SHOPS SHOP', title: 'Now the businesses go spending', color: C.coral, hat: 'fisher',
  chips: [
    { action: 'Fresh catch', name: 'Day-boat fishers', icon: 'fish', color: C.sea },
    { action: 'Fuel & gear', name: 'Marine supply', icon: 'fuel', color: C.coral },
    { action: 'Clean sheets', name: 'Island laundry', icon: 'sheet', color: C.palm },
    { action: 'Fix-it crew', name: 'Trades & repair', icon: 'hammer', color: C.sun },
  ],
  caption: 'Buck hops on down the supply chain.', foot: 'LAP 2 / 3 · INDIRECT',
};
const INDUCED = {
  num: '3', label: 'LAP 3 · PAYDAY', title: 'Wages walk home & spend again', color: C.palm, hat: 'none',
  chips: [
    { action: 'Groceries', name: 'The corner store', icon: 'cart', color: C.sea },
    { action: 'The rent', name: 'Home sweet home', icon: 'house', color: C.coral },
    { action: 'The doctor', name: 'Island clinic', icon: 'cross', color: C.palm },
    { action: 'School fees', name: 'Kids\u2019 future', icon: 'cap', color: C.sun },
  ],
  caption: 'Island paychecks keep the whole show spinning.', foot: 'LAP 3 / 3 · INDUCED',
};

// ════════════════════════════════════════════════════════════════════════════
//  SCENE 5 — PAYOFF
// ════════════════════════════════════════════════════════════════════════════
function Confetti({ p }) {
  const start = 0.5;
  if (p < start) return null;
  const k = (p - start) / (1 - start);
  const cols = [C.coral, C.sea, C.sun, C.palm, C.pink, C.gold];
  return (
    <React.Fragment>
      {Array.from({ length: 18 }).map((_, i) => {
        const seed = i * 137.5;
        const x = 540 + Math.sin(seed) * 450;
        const fall = (k * (1.2 + (i % 5) * 0.2)) % 1;
        const y = 160 + fall * 1560;
        const rot = seed + k * 640;
        const col = cols[i % cols.length];
        const shape = i % 3;
        return (
          <div key={'cf' + i} style={{ position: 'absolute', left: x, top: y, width: 26, height: 26, transform: `rotate(${rot}deg)`, opacity: clamp(k * 3, 0, 1) }}>
            {shape === 0 ? <div style={{ width: '100%', height: '100%', background: col, border: `3px solid ${C.ink}` }} />
              : shape === 1 ? <div style={{ width: '100%', height: '100%', background: col, border: `3px solid ${C.ink}`, borderRadius: '50%' }} />
                : <div style={{ width: 0, height: 0, borderLeft: '13px solid transparent', borderRight: '13px solid transparent', borderBottom: `24px solid ${col}` }} />}
          </div>
        );
      })}
    </React.Fragment>
  );
}

function Payoff() {
  const { progress: p, localTime: lt } = useSprite();
  const op = clamp(p / 0.06, 0, 1);
  const headIn = clamp(p / 0.1, 0, 1);
  const NX = [330, 540, 750];
  const labels = ['Lap 1', 'Lap 2', 'Lap 3'];
  const count = Easing.easeOutCubic(clamp((p - 0.2) / 0.38, 0, 1));
  const val = (1 + 1.5 * count).toFixed(2);
  const numIn = Easing.easeOutBack(clamp((p - 0.16) / 0.18, 0, 1));
  const stamp = clamp((p - 0.56) / 0.1, 0, 1);
  const stampScale = lerp(2.6, 1, Easing.easeOutBack(clamp((p - 0.56) / 0.2, 0, 1)));
  const capOp = clamp((p - 0.68) / 0.1, 0, 1);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', top: 300, left: 0, right: 0, textAlign: 'center', fontFamily: HAND, fontWeight: 800, fontSize: 42, color: C.ink, opacity: headIn }}>THREE LAPS LATER…</div>
      {/* converging coins */}
      {NX.map((x, i) => {
        const a = Easing.easeOutBack(clamp((p - (0.04 + i * 0.05)) / 0.12, 0, 1));
        const conv = Easing.easeInOutCubic(clamp((p - 0.2) / 0.16, 0, 1));
        const cx = lerp(x, 540, conv), cy = lerp(470, 560, conv);
        const fade = 1 - clamp((p - 0.34) / 0.08, 0, 1);
        return (
          <div key={'pc' + i} style={{ position: 'absolute', left: cx, top: cy, transform: `translate(-50%,-50%) scale(${a})`, opacity: clamp((p - (0.04 + i * 0.05)) / 0.08, 0, 1) * fade, textAlign: 'center' }}>
            <MiniCoin size={84} />
            <div style={{ fontFamily: HAND, fontWeight: 700, fontSize: 26, color: C.ink, marginTop: 6 }}>{labels[i]}</div>
          </div>
        );
      })}
      {/* big number */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1120, textAlign: 'center', transform: `scale(${numIn})` }}>
        <div style={{ fontFamily: HAND, fontWeight: 700, fontSize: 36, color: C.ink, opacity: 0.7 }}>every $1 throws a</div>
        <div style={{ fontFamily: MARK, fontWeight: 700, fontSize: 300, lineHeight: 0.82, color: C.coralD }}>${val}</div>
        <div style={{ fontFamily: HAND, fontWeight: 700, fontSize: 36, color: C.ink, opacity: 0.7 }}>island party</div>
      </div>
      {/* stamp */}
      <div style={{ position: 'absolute', left: 858, top: 1252, transform: `translate(-50%,-50%) rotate(-12deg) scale(${stampScale})`, opacity: stamp }}>
        <div style={{ fontFamily: HAND, fontWeight: 800, fontSize: 78, color: C.white, background: C.sea, border: `7px solid ${C.ink}`, borderRadius: BR.pill, padding: '8px 26px' }}>×2.5</div>
      </div>
      <Confetti p={p} />
      <div style={{ position: 'absolute', top: 1560, left: 108, right: 108, textAlign: 'center', fontFamily: HAND, fontWeight: 700, fontSize: 46, lineHeight: 1.24, color: C.ink, opacity: capOp }}>
        Overnight guests throw 2.5× the party of day-trippers. <span style={{ color: C.coralD }}>Quality beats quantity.</span>
      </div>
      <Foot label="DIRECT + INDIRECT + INDUCED" />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ROOT
// ════════════════════════════════════════════════════════════════════════════
function SecondLabel({ targetRef }) {
  const t = useTime();
  const s = Math.floor(t);
  useEffect(() => {
    if (targetRef.current) targetRef.current.setAttribute('data-screen-label', '00:' + String(s).padStart(2, '0'));
  }, [s]);
  return null;
}

// One persistent Buck who travels through the whole story — no duplicate
// Bucks ghosting during cross-fades.
function PersistentBuck() {
  const t = useTime();
  const entry = Easing.easeOutBack(clamp(t / 0.6, 0, 1));
  const x = interpolate([0, 4.5, 5.3, 22.1, 22.9], [560, 560, 540, 540, 540], Easing.easeInOutCubic)(t);
  const y = interpolate([0, 4.5, 5.3, 22.1, 22.9], [850, 850, 720, 720, 772], Easing.easeInOutCubic)(t);
  const size = interpolate([0, 4.5, 5.3, 22.1, 22.9], [300, 300, 262, 262, 240], Easing.easeInOutCubic)(t);
  const glasses = t < 4.9 ? t > 0.7 : t > 22.5;
  const by = -Math.abs(Math.sin(t * 2.6)) * (t < 5 ? 42 : 32);
  const haloOp = clamp((t - 5.3) / 0.5, 0, 1) * clamp((22.1 - t) / 0.5, 0, 1);
  return (
    <React.Fragment>
      <div style={{ position: 'absolute', left: x, top: y, width: 440, height: 440, transform: 'translate(-50%,-50%)', background: `radial-gradient(circle, ${C.white} 0%, rgba(255,253,246,0.6) 38%, rgba(255,253,246,0) 64%)`, opacity: haloOp * 0.9, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) translateY(${by}px) scale(${entry})`, opacity: entry, pointerEvents: 'none' }}>
        <Buck size={size} t={t} glasses={glasses} />
      </div>
    </React.Fragment>
  );
}

function CartoonVideo() {
  const ref = useRef(null);
  return (
    <div ref={ref} data-screen-label="00:00" style={{ position: 'absolute', inset: 0 }}>
      <Defs />
      <Stage width={1080} height={1920} duration={28} background={C.paper} persistKey="cartoonmult" autoplay={false}>
        <SecondLabel targetRef={ref} />
        <Island />
        <TopBanner />
        <Sprite start={0} end={5.0}><Hook /></Sprite>
        <Sprite start={4.7} end={11.3}><Lap cfg={DIRECT} /></Sprite>
        <Sprite start={11.0} end={17.3}><Lap cfg={INDIRECT} /></Sprite>
        <Sprite start={17.0} end={22.9}><Lap cfg={INDUCED} /></Sprite>
        <Sprite start={22.6} end={28}><Payoff /></Sprite>
        <PersistentBuck />
      </Stage>
    </div>
  );
}

window.CartoonVideo = CartoonVideo;
