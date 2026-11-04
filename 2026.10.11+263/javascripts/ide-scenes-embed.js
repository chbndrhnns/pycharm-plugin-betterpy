/* Host integration for the standalone IDE Scenes player. */
(() => {
  const presentation = document.querySelector('.ide-presentation__frame');
  window.addEventListener('message', event => {
    if (!presentation || event.source !== presentation.contentWindow || event.origin !== location.origin) return;
    if (event.data?.type !== 'ide-scenes:resize' || !Number.isFinite(event.data.height)) return;
    presentation.style.height = `${Math.min(20000, Math.max(320, Math.ceil(event.data.height)))}px`;
  });
  const synchronize = () => presentation?.contentWindow?.postMessage({type: 'ide-scenes:host-ready'}, location.origin);
  presentation?.addEventListener('load', synchronize);
  synchronize();
})();
