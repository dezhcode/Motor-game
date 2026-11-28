import { useEffect, useRef } from 'react';

const MENU_TRACK = './assets/audio/dunes-at-dusk.m4a';

export function BackgroundMusic({ enabled }: { enabled: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !enabled) return;

    const syncPlayback = () => {
      if (document.hidden) {
        audio.pause();
      } else if (audio.paused) {
        // Some browsers require a user gesture before the first playback.
        void audio.play().catch(() => {});
      }
    };
    const pause = () => audio.pause();

    syncPlayback();
    document.addEventListener('click', syncPlayback, true);
    document.addEventListener('keydown', syncPlayback);
    document.addEventListener('visibilitychange', syncPlayback);
    window.addEventListener('pagehide', pause);
    window.addEventListener('pageshow', syncPlayback);
    return () => {
      pause();
      document.removeEventListener('click', syncPlayback, true);
      document.removeEventListener('keydown', syncPlayback);
      document.removeEventListener('visibilitychange', syncPlayback);
      window.removeEventListener('pagehide', pause);
      window.removeEventListener('pageshow', syncPlayback);
    };
  }, [enabled]);

  return <audio ref={audioRef} src={MENU_TRACK} loop preload="none" />;
}
