// Buffer polyfill for browser
import { Buffer } from 'buffer';
if (!window.Buffer) {
  window.Buffer = Buffer;
}
if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

// (optional) If you later hit "process is not defined":
// import process from 'process';
// if (!window.process) window.process = process;
