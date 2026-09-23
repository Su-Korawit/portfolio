{
  // The portrait on /about is a slideshow when the owner uploaded more than one picture. The server renders
  // every slide with the first one already showing, so the page looks right before this file runs and with
  // JavaScript switched off entirely - this only starts the timer and wires up the dots.
  const slides = document.querySelector('[data-slides]');
  const frames = slides ? [...slides.children] : [];
  const dots = [...document.querySelectorAll('[data-slide-to]')];
  const INTERVAL = 5000;

  if (frames.length > 1) {
    // A reader who asked for less motion gets the dots and no timer: the slideshow still works, it just waits
    // to be told. matchMedia is watched rather than read once, so changing the system setting takes effect.
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    let current = 0;
    let timer = null;

    function show(next) {
      current = (next + frames.length) % frames.length;
      frames.forEach((frame, index) => {
        frame.classList.toggle('is-current', index === current);
        // only the picture on show is offered to a screen reader, so it does not read the same alt text
        // once per slide
        frame.toggleAttribute('aria-hidden', index !== current);
      });
      dots.forEach((dot, index) => {
        if (index === current) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
    }

    function stop() {
      clearInterval(timer);
      timer = null;
    }

    function start() {
      stop();
      if (still.matches) return;
      timer = setInterval(() => {
        // a tab in the background has nobody watching, and browsers throttle the timer there anyway
        if (document.visibilityState === 'visible') show(current + 1);
      }, INTERVAL);
    }

    for (const [index, dot] of dots.entries()) {
      dot.addEventListener('click', () => {
        show(index);
        start();
      });
    }

    // the slideshow holds still while it is being looked at closely, and picks up again afterwards
    for (const [event, action] of [['pointerenter', stop], ['pointerleave', start], ['focusin', stop], ['focusout', start]]) {
      slides.parentElement.addEventListener(event, action);
    }
    still.addEventListener('change', start);
    start();
  }
}
