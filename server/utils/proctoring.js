const MAX_EVENTS = 200;

const ALLOWED_EVENT_TYPES = new Set([
  'camera-revoked',
  'camera-lost',
  'camera-denied',
  'camera-tampered',
  'camera-obscured',
  'mic-revoked',
  'mic-lost',
  'mic-denied',
  'mic-mismatch',
  'mic-ambient-noise',
  'multi-face',
  'no-face',
  'face-away',
  'tab-blur',
  'tab-hidden',
  'fullscreen-exit'
]);

// Event types that count toward the suspicious-event total shown to recruiters.
const SUSPICIOUS_EVENT_TYPES = new Set([
  'camera-revoked',
  'camera-lost',
  'camera-tampered',
  'camera-obscured',
  'mic-revoked',
  'mic-lost',
  'multi-face',
  'no-face',
  'face-away',
  'tab-hidden',
  'copy-attempt',
  'paste-attempt',
  'right-click',
  'fullscreen-exit',
  'devtools-suspected',
  'dismantled',
  'terminated'
]);

const MAX_EVENT_DETAIL_LENGTH = 160;

/**
 * Candidate devices report proctoring events from the browser during a test.
 * Never trust that payload blindly: this keeps only known event types, drops
 * free-form metadata beyond a short bounded note, and caps the event count so a
 * malicious client cannot inflate the stored document.
 */
const sanitizeProctoringReport = (raw) => {
  if (!raw || typeof raw !== 'object') return undefined;

  const permissioned = raw.startedWithPermissions === true;
  const cameraStreamHealthy = raw.cameraStreamHealthy !== false;
  const micStreamHealthy = raw.micStreamHealthy !== false;

  let events = [];
  if (Array.isArray(raw.events)) {
    events = raw.events
      .filter(event => event && typeof event === 'object')
      .map(event => ({
        type: ALLOWED_EVENT_TYPES.has(event.type) ? event.type : 'unknown',
        at: Number.isFinite(event.at) && event.at >= 0 ? Math.round(event.at) : 0,
        detail: typeof event.detail === 'string' ? event.detail.slice(0, MAX_EVENT_DETAIL_LENGTH) : ''
      }))
      .filter(event => event.type !== 'unknown' || event.detail)
      .slice(0, MAX_EVENTS);
  }

  // Simple integrity heuristics computed server-side from the sanitized events.
  const suspiciousEventCount = events.filter(event => SUSPICIOUS_EVENT_TYPES.has(event.type)).length;

  return {
    enabled: true,
    permissioned,
    cameraStreamHealthy,
    micStreamHealthy,
    suspiciousEventCount,
    terminated: raw.terminated === true,
    terminateReason: typeof raw.terminateReason === 'string' ? raw.terminateReason.slice(0, 200) : '',
    restarts: Math.max(0, Math.min(20, Math.round(Number(raw.restarts) || 0))),
    events
  };
};

module.exports = { sanitizeProctoringReport, ALLOWED_EVENT_TYPES, SUSPICIOUS_EVENT_TYPES, MAX_EVENTS };
