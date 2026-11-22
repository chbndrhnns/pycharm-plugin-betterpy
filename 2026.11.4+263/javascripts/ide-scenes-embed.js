/* Host integration for the standalone IDE Scenes player (landing carousel and per-feature "Try it" embeds). */
(() => {
  const frames = () => document.querySelectorAll('.ide-presentation__frame, .ide-scene-embed__frame');
  window.addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    if (event.data?.type !== 'ide-scenes:resize' || !Number.isFinite(event.data.height)) return;
    const frame = [...frames()].find(f => f.contentWindow === event.source);
    if (frame) frame.style.height = `${Math.min(20000, Math.max(320, Math.ceil(event.data.height)))}px`;
  });
  const synchronize = frame => frame.contentWindow?.postMessage({type: 'ide-scenes:host-ready'}, location.origin);
  const attach = frame => {
    frame.addEventListener('load', () => synchronize(frame));
    synchronize(frame);
  };
  frames().forEach(attach);
  document.addEventListener('click', event => {
    const button = event.target.closest?.('.ide-scene-embed__try');
    const host = button?.closest('.ide-scene-embed');
    if (!host) return;
    const frame = document.createElement('iframe');
    frame.className = 'ide-scene-embed__frame';
    frame.src = host.dataset.ideSceneSrc;
    frame.title = host.dataset.ideSceneTitle || 'Interactive IDE demo';
    host.replaceChildren(frame);
    attach(frame);
  });
})();
