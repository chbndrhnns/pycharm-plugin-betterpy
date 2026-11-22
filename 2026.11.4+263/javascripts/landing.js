(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#mobile-menu');
  if (toggle && menu && typeof menu.showModal === 'function') {
    let destination = null;
    toggle.hidden = false;
    document.querySelector('.fallback-navigation')?.setAttribute('hidden', '');
    toggle.addEventListener('click', () => {
      menu.showModal();
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
    });
    menu.querySelector('.menu-close').addEventListener('click', () => menu.close());
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      destination = link.hash ? document.getElementById(link.hash.slice(1)) : null;
      menu.close();
    }));
    menu.addEventListener('close', () => {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      if (destination) {
        destination.setAttribute('tabindex', '-1');
        destination.focus({preventScroll: true});
        destination = null;
      } else toggle.focus();
    });
    window.matchMedia('(min-width: 761px)').addEventListener('change', event => {
      if (event.matches && menu.open) menu.close();
    });
  }
  const recording = document.querySelector('#recording');
  const play = document.querySelector('#recording-toggle');
  if (recording && play) {
    const poster = recording.src;
    let playing = false;
    play.hidden = false;
    play.addEventListener('click', () => {
      playing = !playing;
      recording.src = playing ? recording.dataset.animation : poster;
      play.textContent = playing ? 'Stop recording' : 'Play recording';
    });
    recording.addEventListener('error', () => {
      if (!playing) return;
      playing = false;
      recording.src = poster;
      play.textContent = 'Recording could not load. Try again';
    });
  }
  if (!('IntersectionObserver' in window) || reduceMotion.matches) return;
  const sections = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('reveal-pending');
      entry.target.classList.add('reveal-ready');
      sections.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.benefit,.steps li,.evidence,.faq').forEach(section => {
    section.classList.add('reveal-pending');
    sections.observe(section);
  });
  const heading = document.querySelector('[data-word-reveal]');
  if (!heading) return;
  const label = heading.innerText;
  heading.setAttribute('aria-label', label);
  const words = [];
  Array.from(heading.childNodes).forEach(node => {
    if (node.nodeType !== Node.TEXT_NODE) return;
    const fragment = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach(word => {
      if (!word.trim()) { fragment.append(document.createTextNode(word)); return; }
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = word;
      span.setAttribute('aria-hidden', 'true');
      words.push(span);
      fragment.append(span);
    });
    node.replaceWith(fragment);
  });
  const wordObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const index = words.indexOf(entry.target);
      // Stagger words sharing a line so they activate in reading order.
      window.setTimeout(() => entry.target.classList.add('lit'), index * 60);
      wordObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -15% 0px', threshold: 0.8 });
  words.forEach(word => wordObserver.observe(word));
})();
