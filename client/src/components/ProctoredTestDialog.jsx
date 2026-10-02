import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Mic, ShieldCheck, ShieldAlert, X, Video, Loader2, RotateCcw, Lock, Maximize2, User } from 'lucide-react';

// Cooldowns (ms) per event type so continuous conditions don't flood the log.
const EVENT_COOLDOWN_MS = {
  'no-face': 15000,
  'face-away': 10000,
  'camera-obscured': 10000,
  'tab-blur': 2000,
  'tab-hidden': 2000,
  'camera-lost': 5000,
  'camera-tampered': 5000,
  'mic-lost': 5000,
  'copy-attempt': 1000,
  'paste-attempt': 1000,
  'right-click': 1000
};
const DEFAULT_COOLDOWN_MS = 10000;

const SUSPICIOUS_TYPES = new Set([
  'camera-lost', 'camera-tampered', 'camera-revoked', 'camera-obscured',
  'mic-lost', 'mic-revoked', 'multi-face', 'no-face', 'face-away', 'tab-hidden',
  'copy-attempt', 'paste-attempt', 'right-click', 'fullscreen-exit', 'devtools-suspected'
]);

// Cheating signals each cost one strike (see the strike effect below).
// Policy: the FIRST caught cheating attempt locks the test immediately.
// The recruiter can re-arrange (reset) the test for the candidate afterwards.
const STRIKES_ALLOWED = 1;

/**
 * Proctored test modal with anti-cheat enforcement.
 *
 *  - Test runs in a fullscreen, opaque lockdown layer: the background page
 *    (dashboard, questions of other tests, everything) vanishes — only the
 *    test is visible.
 *  - Camera + mic turn on before questions render; the live preview is kept
 *    in sync with the captured stream on every render.
 *  - Frame, focus and stream checks run continuously.
 *  - Cheating signals (leaving the tab, copy/paste, right-click, exiting
 *    fullscreen, multiple faces, face leaving the frame) TERMINATE the test
 *    immediately: the attempt is locked as failed with the violation report
 *    attached, and only the recruiter can re-arrange (reset) the test.
 */
const ProctoredTestDialog = ({
  title,
  subtitle,
  questions,
  busy,
  error,
  canSubmit = true,
  submitHint = '',
  onClose,
  onSubmit,
  onDismantle,
  onTerminate,
  renderQuestion
}) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [permissionState, setPermissionState] = useState('idle'); // idle | requesting | granted | denied | terminated
  const [permissionError, setPermissionError] = useState('');
  const [environmentProblem, setEnvironmentProblem] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const [cameraHealthy, setCameraHealthy] = useState(false);
  const [micHealthy, setMicHealthy] = useState(false);
  const [events, setEvents] = useState([]);
  const [strikes, setStrikes] = useState(0);
  const [restarts, setRestarts] = useState(0);
  const [strikeNotice, setStrikeNotice] = useState(null); // { count, event }
  const [faceDetectorActive, setFaceDetectorActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [facePresent, setFacePresent] = useState(null); // null = unknown, true/false from frame checks
  const facePresentRef = useRef(null);

  const audioContextRef = useRef(null);
  const faceCheckRef = useRef(null);
  const frameCheckRef = useRef(null);
  const canvasRef = useRef(null);
  const micLevelTsRef = useRef(0);
  const lastEventAtRef = useRef({});
  const frameStatsRef = useRef({ prevPixels: null, darkSince: 0, stillSince: 0, obscuredLogged: false, absentLogged: false });
  const startedAtRef = useRef(null);
  const strikeNoticeTimerRef = useRef(null);
  const dismantleRef = useRef(false);
  const strikesRef = useRef(0);
  const terminatedRef = useRef(false);

  const logEvent = useCallback((type, detail = '') => {
    const now = Date.now();
    const cooldown = EVENT_COOLDOWN_MS[type] ?? DEFAULT_COOLDOWN_MS;
    if (now - (lastEventAtRef.current[type] || 0) < cooldown) return;
    lastEventAtRef.current[type] = now;
    setEvents(current => [...current, { type, detail, at: Math.round((now - (startedAtRef.current || now)) / 1000) }]);
  }, []);

  const stopEverything = useCallback(() => {
    if (faceCheckRef.current) { clearInterval(faceCheckRef.current); faceCheckRef.current = null; }
    if (frameCheckRef.current) { clearInterval(frameCheckRef.current); frameCheckRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (strikeNoticeTimerRef.current) clearTimeout(strikeNoticeTimerRef.current);
    setCameraHealthy(false);
    setMicHealthy(false);
    setMicLevel(0);
    setFaceDetectorActive(false);
  }, []);

  // Frame-level checks: cover detection via brightness, absence via stillness.
  const startFrameChecks = useCallback((hasFaceDetector) => {
    if (frameCheckRef.current) clearInterval(frameCheckRef.current);
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    const canvas = canvasRef.current;
    canvas.width = 80;
    canvas.height = 60;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    frameStatsRef.current = {
      prevPixels: null,
      darkSince: 0,
      obscuredLogged: false,
      facePresent: false,
      faceCentroid: null,
      awaySince: 0,
      noFaceLogged: false,
      edgeSince: 0,
      edgeLogged: false,
      motionSince: 0,
      motionLogged: false,
      stillSince: 0,
      absentLogged: false
    };

    // Thresholds for the frame heuristics. Confirm windows stay short enough
    // to feel responsive but long enough to ignore a blink or a lean.
    const DARK_THRESHOLD = 22;
    const DARK_CONFIRM_MS = 3000;
    // Face presence: fraction of skin-tone pixels in the sampled region.
    const FACE_RATIO_ON = 0.10;
    const FACE_RATIO_OFF = 0.06;        // hysteresis so flicker doesn't toggle state
    const NO_FACE_CONFIRM_MS = 4000;    // absent this long => no-face strike
    const EDGE_MARGIN = 0.14;           // centroid within this of the frame edge
    const FACE_AWAY_CONFIRM_MS = 6000;  // face off-center this long => face-away strike
    const MOTION_EXCESSIVE = 0.22;      // sustained travel above this => turning away
    const MOTION_CONFIRM_MS = 5000;     // sustained excessive travel => face-away strike
    const STILL_THRESHOLD = 2.5;
    const STILL_CONFIRM_MS = 30000;

    // Sample the central band of the frame (faces sit there in a webcam call).
    const sampleRegion = { x0: 0.15, x1: 0.85, y0: 0.05, y1: 0.95 };

    frameCheckRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !streamRef.current) return;
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
        const brightness = sum / (data.length / 4);
        const now = Date.now();

        // --- Covered / blocked lens: frame stays very dark.
        if (brightness < DARK_THRESHOLD) {
          if (!frameStatsRef.current.darkSince) frameStatsRef.current.darkSince = now;
          if (!frameStatsRef.current.obscuredLogged && now - frameStatsRef.current.darkSince >= DARK_CONFIRM_MS) {
            frameStatsRef.current.obscuredLogged = true;
            logEvent('camera-obscured', 'Camera frame is very dark — lens may be covered');
          }
          return; // nothing else is measurable in a dark frame
        }
        frameStatsRef.current.darkSince = 0;
        frameStatsRef.current.obscuredLogged = false;

        if (hasFaceDetector) return; // native face detection handles the rest

        // --- Face tracking: presence + centroid movement (no FaceDetector needed).
        const W = canvas.width, H = canvas.height;
        const x0 = Math.floor(W * sampleRegion.x0), x1 = Math.ceil(W * sampleRegion.x1);
        const y0 = Math.floor(H * sampleRegion.y0), y1 = Math.ceil(H * sampleRegion.y1);
        let skin = 0, sx = 0, sy = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const idx = (y * W + x) * 4;
            const r = data[idx], g = data[idx + 1], b = data[idx + 2];
            // RGB skin-tone test (works across skin tones under normal lighting).
            const isSkin = r > 95 && g > 40 && b > 20
              && r > g && r > b
              && (r - Math.min(g, b)) > 15
              && Math.abs(r - g) > 15;
            if (isSkin) { skin++; sx += x; sy += y; }
          }
        }
        const total = (x1 - x0) * (y1 - y0);
        const ratio = skin / total;
        const st = frameStatsRef.current;
        // Hysteresis: switch on at 10%, off below 6%.
        const present = st.facePresent ? ratio >= FACE_RATIO_OFF : ratio >= FACE_RATIO_ON;

        // Publish presence for the live sidebar indicator.
        if (present !== facePresentRef.current) {
          facePresentRef.current = present;
          setFacePresent(present);
        }

        if (!present) {
          if (st.facePresent) { st.facePresent = false; st.awaySince = now; }
          if (!st.awaySince) st.awaySince = now;
          if (!st.noFaceLogged && now - st.awaySince >= NO_FACE_CONFIRM_MS) {
            st.noFaceLogged = true;
            raiseStrikeRef.current?.('no-face', 'No face detected in the camera frame for several seconds');
          }
          st.prevPixels = null;
          return;
        }

        // Face is present: reset absence tracking and update position.
        st.facePresent = true;
        st.noFaceLogged = false;
        st.awaySince = 0;
        st.edgeLogged = false;
        const centroid = skin > 0 ? { x: (sx / skin) / W, y: (sy / skin) / H } : null;

        if (centroid && st.faceCentroid) {
          const dx = centroid.x - st.faceCentroid.x;
          const dy = centroid.y - st.faceCentroid.y;
          const travel = Math.sqrt(dx * dx + dy * dy);

          // Sustained large movement => candidate repeatedly turning away.
          if (travel > MOTION_EXCESSIVE) {
            if (!st.motionSince) st.motionSince = now;
            if (!st.motionLogged && now - st.motionSince >= MOTION_CONFIRM_MS) {
              st.motionLogged = true;
              raiseStrikeRef.current?.('face-away', 'Repeated large face movement away from the screen');
            }
          // Face hugging the frame edge => leaning out of view / looking away.
          } else if (centroid.x < EDGE_MARGIN || centroid.x > 1 - EDGE_MARGIN
            || centroid.y < EDGE_MARGIN || centroid.y > 1 - EDGE_MARGIN) {
            if (!st.edgeSince) st.edgeSince = now;
            if (!st.edgeLogged && now - st.edgeSince >= FACE_AWAY_CONFIRM_MS) {
              st.edgeLogged = true;
              raiseStrikeRef.current?.('face-away', 'Face stayed at the edge of the frame — candidate may be looking away');
            }
            st.motionSince = 0;
            st.motionLogged = false;
          } else {
            st.motionSince = 0;
            st.motionLogged = false;
          }
        } else {
          st.motionSince = 0;
          st.motionLogged = false;
        }
        if (centroid) st.faceCentroid = centroid;

        // Frozen frame while 'present': photo held in front of the camera.
        if (st.prevPixels) {
          let diff = 0;
          for (let i = 0; i < data.length; i += 4) {
            diff += Math.abs(data[i] - st.prevPixels[i])
              + Math.abs(data[i + 1] - st.prevPixels[i + 1])
              + Math.abs(data[i + 2] - st.prevPixels[i + 2]);
          }
          const motion = diff / (data.length / 4) / 3;
          if (motion < STILL_THRESHOLD) {
            if (!st.stillSince) st.stillSince = now;
            if (!st.absentLogged && now - st.stillSince >= STILL_CONFIRM_MS) {
              st.absentLogged = true;
              logEvent('no-face', 'Frame unchanged for a long time — possible photo spoof');
            }
          } else {
            st.stillSince = 0;
            st.absentLogged = false;
          }
        }
        st.prevPixels = new Uint8ClampedArray(data);
      } catch { /* frame not ready */ }
    }, 700);
  }, [logEvent]);

  const requestAccessRef = useRef(null);
  const dismantleAttemptRef = useRef(null);
  const terminateTestRef = useRef(null);
  // Frame checks (face presence / movement) raise strikes through this ref so
  // the sampling loop never goes stale when callbacks re-render.
  const raiseStrikeRef = useRef(null);

  // DISMANTLE: restart the test environment with a fresh event log.
  // (Answers are already wiped instantly at strike time by the caller.)
  const dismantleAttempt = useCallback(() => {
    if (dismantleRef.current) return; // one dismantle at a time
    dismantleRef.current = true;
    stopEverything();
    setEvents([]);
    setStrikeNotice(null);
    setRestarts(current => current + 1);
    dismantleRef.current = false;
    // Restart the camera/mic session; everything begins clean.
    requestAccessRef.current?.(true);
  }, [stopEverything]);
  dismantleAttemptRef.current = dismantleAttempt;

  const requestAccess = useCallback(async (isRestart = false) => {
    // Guard against the click-event-as-argument mistake: only a literal
    // `true` from the dismantle flow counts as a restart.
    const restart = isRestart === true;

    // Fresh attempt (or post-dismantle restart) gets clean strike cooldowns,
    // so a repeat violation registers immediately instead of waiting out the
    // previous cooldown window.
    lastEventAtRef.current = {};

    if (!restart) {
      setPermissionState('requesting');
      setPermissionError('');
      setEnvironmentProblem('');

      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setEnvironmentProblem(window.location.protocol === 'http:'
          ? `This page is loaded over http:// from ${window.location.hostname}. Browsers only allow camera and microphone access on https:// or on localhost. Open the app via http://localhost:3000 (or serve it over https), then try again.`
          : 'This browser does not expose camera access (getUserMedia). Try a recent version of Chrome, Edge, or Firefox.');
        logEvent('camera-denied', 'Insecure context or missing getUserMedia');
        setPermissionState('denied');
        return;
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      // The test may have been terminated while permission was pending.
      if (terminatedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      startedAtRef.current = Date.now();

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      const hasCamera = videoTracks.length > 0;
      const hasMic = audioTracks.length > 0;
      setCameraHealthy(hasCamera);
      setMicHealthy(hasMic);

      if (hasCamera) {
        videoTracks[0].addEventListener('ended', () => { setCameraHealthy(false); logEvent('camera-lost', 'Camera stream ended'); });
        videoTracks[0].addEventListener('mute', () => { setCameraHealthy(false); logEvent('camera-tampered', 'Camera track muted'); });
        videoTracks[0].addEventListener('unmute', () => setCameraHealthy(true));
      }
      if (hasMic) {
        audioTracks[0].addEventListener('ended', () => { setMicHealthy(false); logEvent('mic-lost', 'Microphone stream ended'); });
        audioTracks[0].addEventListener('mute', () => { setMicHealthy(false); logEvent('mic-lost', 'Microphone muted'); });
        audioTracks[0].addEventListener('unmute', () => setMicHealthy(true));
      }

      if (hasMic) {
        try {
          const context = new (window.AudioContext || window.webkitAudioContext)();
          audioContextRef.current = context;
          if (context.state === 'suspended') await context.resume().catch(() => {});
          const source = context.createMediaStreamSource(stream);
          const analyser = context.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            if (!audioContextRef.current) return;
            analyser.getByteFrequencyData(data);
            const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
            const now = performance.now();
            if (now - micLevelTsRef.current > 150) {
              micLevelTsRef.current = now;
              setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
            }
            requestAnimationFrame(tick);
          };
          tick();
        } catch { /* analyser is best-effort only */ }
      }

      let hasFaceDetector = false;
      if (hasCamera && 'FaceDetector' in window) {
        try {
          const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
          faceCheckRef.current = setInterval(async () => {
            const video = videoRef.current;
            if (!video || video.readyState < 2) return;
            // Grace period after the stream opens (camera warm-up, candidate
            // settling) before absence counts against them.
            if (Date.now() - (startedAtRef.current || 0) < 4000) return;
            try {
              const faces = await detector.detect(video);
              if (faces.length === 0) raiseStrikeRef.current?.('no-face', 'No face visible in camera frame');
              else if (faces.length > 1) raiseStrikeRef.current?.('multi-face', `${faces.length} faces detected in frame`);
            } catch { /* frame not ready */ }
          }, 1500);
          hasFaceDetector = true;
          setFaceDetectorActive(true);
        } catch { /* FaceDetector unavailable */ }
      }

      startFrameChecks(hasFaceDetector);

      if (restart) {
        // Staying in 'granted' keeps the lockdown UI mounted across restarts;
        // the render-time stream sync effect below re-attaches the preview.
        setStrikeNotice(current => current); // no-op, keeps state shape explicit
      }
      setPermissionState('granted');
    } catch (err) {
      if (restart) {
        // A failed restart shouldn't deadlock the candidate in the lockdown screen.
        setCameraHealthy(false);
        setMicHealthy(false);
        setPermissionState('granted');
        return;
      }
      const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
      setPermissionError(denied
        ? 'Camera and microphone access was blocked. Allow access in your browser to take this proctored test.'
        : 'No camera or microphone was found. Connect a working device and try again.');
      logEvent(denied ? 'camera-denied' : 'camera-lost', err?.name || 'getUserMedia failed');
      setPermissionState('denied');
    }
  }, [logEvent, startFrameChecks]);

  requestAccessRef.current = requestAccess;

  // Keep the <video> preview in sync with the captured stream on every render.
  // The video element only exists once permissionState is 'granted', and after
  // a dismantle the stream object is new — this effect re-attaches it in both
  // cases without depending on state timing.
  useEffect(() => {
    const video = videoRef.current;
    if (video && streamRef.current && video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
      video.play().catch(() => {});
    }
  });

  useEffect(() => {
    return () => stopEverything();
  }, [stopEverything]);

  // Enter fullscreen lockdown when the test becomes active.
  useEffect(() => {
    if (permissionState !== 'granted') return undefined;
    const element = document.documentElement;
    if (!document.fullscreenElement) {
      element.requestFullscreen?.({ navigationUI: 'hide' }).then(() => setIsFullscreen(true)).catch(() => setIsFullscreen(false));
    }
    const onFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active) logEvent('fullscreen-exit', 'Exited fullscreen during the test');
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [permissionState, logEvent]);

  // Strikes: focus/tab/clipboard/fullscreen/face signals dismantle the attempt.
  useEffect(() => {
    if (permissionState !== 'granted') return undefined;
    const raiseStrike = (type, detail) => {
      if (terminatedRef.current || dismantleRef.current) return;
      // Cooldown identical to logEvent so repeated raw events don't re-strike.
      const now = Date.now();
      const cooldown = EVENT_COOLDOWN_MS[type] ?? DEFAULT_COOLDOWN_MS;
      if (now - (lastEventAtRef.current[type] || 0) < cooldown) return;
      lastEventAtRef.current[type] = now;
      logEvent(type, detail);
      const next = strikesRef.current + 1;
      strikesRef.current = next;
      setStrikes(next);        if (next >= STRIKES_ALLOWED) {
          terminateTestRef.current?.(`Exceeded ${STRIKES_ALLOWED} cheating warnings (last: ${type})`);
        } else {
          // Wipe the answers IMMEDIATELY so nothing cheated can be submitted,
          // then show the notice and restart the test environment.
          if (typeof onDismantle === 'function') onDismantle();
          setStrikeNotice({ count: next, event: type });
          if (strikeNoticeTimerRef.current) clearTimeout(strikeNoticeTimerRef.current);
          strikeNoticeTimerRef.current = setTimeout(() => dismantleAttemptRef.current?.(), 1200);
        }
    };
    raiseStrikeRef.current = raiseStrike;
    const onVisibility = () => { if (document.hidden) raiseStrike('tab-hidden', 'Left the test tab'); };
    const onBlur = () => raiseStrike('tab-blur', 'Window lost focus');
    const onCopy = (e) => { e.preventDefault(); raiseStrike('copy-attempt', 'Copy blocked during test'); };
    const onPaste = (e) => { e.preventDefault(); raiseStrike('paste-attempt', 'Paste blocked during test'); };
    const onContextMenu = (e) => { e.preventDefault(); raiseStrike('right-click', 'Right-click blocked during test'); };
    const onShortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 'p', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        raiseStrike((e.key.toLowerCase() === 'v' ? 'paste-attempt' : 'copy-attempt'), `Blocked Ctrl+${e.key.toUpperCase()} shortcut`);
      }
    };
    const onKeyF11 = (e) => { if (e.key === 'F11') { e.preventDefault(); raiseStrike('fullscreen-exit', 'Fullscreen toggle pressed'); } };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('cut', onShortcut);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onShortcut);
    document.addEventListener('keydown', onKeyF11);
    return () => {
      raiseStrikeRef.current = null;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('cut', onShortcut);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onShortcut);
      document.removeEventListener('keydown', onKeyF11);
    };
  }, [permissionState, logEvent, onDismantle]);

  const monitoring = permissionState === 'granted';
  const suspiciousCount = events.filter(event => SUSPICIOUS_TYPES.has(event.type)).length;

  const buildReport = (terminated, terminateReason) => ({
    startedWithPermissions: permissionState === 'granted',
    cameraStreamHealthy: cameraHealthy,
    micStreamHealthy: micHealthy,
    terminated,
    terminateReason,
    restarts,
    events: events.map(({ type, at, detail }) => ({ type, at, detail }))
  });

  const handleSubmit = () => {
    onSubmit(buildReport(false, ''), () => stopEverything());
  };

  // TERMINATE: after the final strike, submit a failed attempt with the
  // violation report and end the session.
  terminateTestRef.current = (reason) => {
    if (terminatedRef.current) return;
    terminatedRef.current = true;
    stopEverything();
    if (typeof onTerminate === 'function') onTerminate(buildReport(true, reason));
    setPermissionState('terminated');
  };

  const strikeNoticeText = strikeNotice
    ? `Strike ${strikeNotice.count} of ${STRIKES_ALLOWED} — "${strikeNotice.event}" detected. Your answers were erased and the test is restarting.`
    : '';

  const cameraStatus = useMemo(() => {
    if (permissionState === 'granted' && cameraHealthy) return { tone: 'text-emerald-700', label: 'Camera on' };
    if (permissionState === 'granted') return { tone: 'text-amber-600', label: 'Camera interrupted' };
    if (permissionState === 'denied') return { tone: 'text-rose-600', label: 'Camera blocked' };
    return { tone: 'text-slate-500', label: 'Camera idle' };
  }, [permissionState, cameraHealthy]);

  const micStatus = useMemo(() => {
    if (permissionState === 'granted' && micHealthy) return { tone: 'text-emerald-700', label: 'Mic on' };
    if (permissionState === 'granted') return { tone: 'text-amber-600', label: 'Mic interrupted' };
    if (permissionState === 'denied') return { tone: 'text-rose-600', label: 'Mic blocked' };
    return { tone: 'text-slate-500', label: 'Mic idle' };
  }, [permissionState, micHealthy]);

  if (permissionState === 'terminated') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950 p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
            <Lock className="h-8 w-8 text-rose-600" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">Test locked</h2>
          <p className="mt-2 text-sm text-slate-600">
            A proctoring violation was detected and this attempt is now locked as failed. The report is shared with the recruiter,
            who can re-arrange the test for you if they choose to — contact them if you believe this was a mistake.
          </p>
          <button type="button" onClick={onClose} className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4" role="dialog" aria-modal="true" aria-labelledby="proctored-test-title">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h2 id="proctored-test-title" className="text-xl font-bold text-slate-900">{title}</h2>
              {isFullscreen && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><Maximize2 className="h-3 w-3" /> Fullscreen</span>}
            </div>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button type="button" onClick={() => { stopEverything(); onClose(); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close proctored test">
            <X className="h-5 w-5" />
          </button>
        </div>

        {permissionState === 'idle' ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <Video className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">This test is proctored &amp; locked down</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              The test opens fullscreen — everything else disappears. Your camera and microphone stay on, and the rules are strict:
            </p>
            <ul className="mx-auto mt-4 max-w-md space-y-1.5 text-left text-sm text-slate-700">
              <li className="rounded-lg bg-slate-50 px-3 py-2">Copying, pasting, right-clicking, or leaving the tab <strong>ends the test immediately</strong>.</li>
              <li className="rounded-lg bg-slate-50 px-3 py-2">Your face is tracked: leaving the frame, turning away, or a photo held up to the camera <strong>ends the test immediately</strong>.</li>
              <li className="rounded-lg bg-slate-50 px-3 py-2">The attempt is <strong>locked as failed</strong>; only the recruiter can re-arrange the test for you.</li>
            </ul>
            <div className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5"><Camera className="h-4 w-4 text-slate-500" /> Camera</span>
              <span className="inline-flex items-center gap-1.5"><Mic className="h-4 w-4 text-slate-500" /> Microphone</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="h-4 w-4 text-slate-500" /> Fullscreen</span>
            </div>
            <button
              type="button"
              onClick={() => requestAccess(false)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-700 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-800"
            >
              <Camera className="h-4 w-4" /> Enable camera &amp; mic and start
            </button>
          </div>
        ) : permissionState === 'requesting' ? (
          <div className="flex flex-col items-center gap-3 p-12 text-slate-600">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <p className="text-sm font-semibold">Preparing the lockdown test environment…</p>
          </div>
        ) : permissionState === 'denied' ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50">
              <ShieldAlert className="h-7 w-7 text-rose-600" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Access required</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{permissionError}</p>
            {environmentProblem && (
              <p className="mx-auto mt-3 max-w-md rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800 ring-1 ring-amber-200">{environmentProblem}</p>
            )}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button type="button" onClick={() => requestAccess(false)} className="rounded-xl bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-800">Try again</button>
              <button type="button" onClick={() => { stopEverything(); onClose(); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="relative grid gap-5 p-5 lg:grid-cols-[240px_1fr]">
            {strikeNotice && (
              <div className="absolute inset-x-4 top-4 z-10 flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 shadow-lg lg:inset-x-8" role="alert">
                <RotateCcw className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
                <div>
                  <p className="text-sm font-bold text-rose-800">Cheat attempt detected — test dismantled</p>
                  <p className="mt-0.5 text-xs text-rose-700">{strikeNoticeText}</p>
                </div>
              </div>
            )}
            <aside className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                <video ref={videoRef} autoPlay playsInline muted className="h-auto w-full" />
              </div>
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="inline-flex items-center gap-2 font-semibold text-emerald-700">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Live monitoring
                </p>
                <p className={`inline-flex items-center gap-1.5 font-semibold ${cameraStatus.tone}`}>
                  <Camera className="h-4 w-4" /> {cameraStatus.label}
                </p>
                <p className={`inline-flex items-center gap-1.5 font-semibold ${micStatus.tone}`}>
                  <Mic className="h-4 w-4" /> {micStatus.label}
                </p>
                <p className={`inline-flex items-center gap-1.5 font-semibold ${facePresent === null ? 'text-slate-500' : facePresent ? 'text-emerald-700' : 'text-rose-600'}`}>
                  <User className={`h-4 w-4`} /> {facePresent === null ? 'Face check starting…' : facePresent ? 'Face in frame' : 'Face not detected'}
                </p>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Mic level</p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-150" style={{ width: `${micLevel}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Strikes</p>
                  <div className="flex gap-1">
                    {Array.from({ length: STRIKES_ALLOWED }).map((_, index) => (
                      <span key={index} className={`h-2 w-4 rounded-full ${index < strikes ? 'bg-rose-500' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                </div>
                <p className={`text-xs ${suspiciousCount > 0 ? 'font-semibold text-amber-700' : 'text-slate-500'}`}>
                  {monitoring
                    ? (suspiciousCount === 0 ? 'Monitoring is active. No integrity events recorded.' : `${suspiciousCount} integrity event${suspiciousCount === 1 ? '' : 's'} recorded.`)
                    : 'Monitoring stopped.'}
                </p>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Restarted {restarts} time{restarts === 1 ? '' : 's'}.
                </p>
              </div>
              {events.length > 0 && (
                <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-700">Recent events</p>
                  {events.slice(-8).map((event, index) => (
                    <p key={`${event.type}-${index}`} className="text-[11px] text-amber-800">
                      <span className="font-semibold">[{event.at}s]</span> {event.type}{event.detail ? ` · ${event.detail}` : ''}
                    </p>
                  ))}
                </div>
              )}
            </aside>

            <div className="min-w-0">
              {error && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700" role="alert">{error}</p>}
              {questions.map((question, index) => renderQuestion(question, index))}
            </div>
          </div>
        )}

        {permissionState === 'granted' && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Copying, pasting, and leaving the tab are blocked. A violation immediately locks the test.</p>
            <div className="flex flex-wrap items-center gap-3">
              {!canSubmit && submitHint && <p className="text-xs font-semibold text-slate-500">{submitHint}</p>}
              {busy ? (
                <span className="inline-flex items-center gap-2 rounded-xl bg-primary-700 px-5 py-3 text-sm font-semibold text-white opacity-80">
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                </span>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={!canSubmit} className="rounded-xl bg-primary-700 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50">
                  Submit proctored test
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProctoredTestDialog;
