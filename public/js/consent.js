{
  const script = document.currentScript;
  const gaId = script ? script.dataset.gaId : '';
  const bar = document.querySelector('[data-consent-bar]');

  // Loads GA only after the reader has agreed to it (spec 4.2). cookie_domain: 'none' ties the _ga cookie to
  // the exact host the page is served from, so the reset button below can delete it with just Path=/.
  function loadGa(id) {
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(tag);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, { cookie_domain: 'none' });
  }

  function readCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? match[1] : '';
  }

  function setConsent(value) {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = 'consent=' + value + '; Max-Age=15552000; Path=/; SameSite=Lax' + secure;
    if (bar) bar.hidden = true;
    if (value === 'granted' && gaId) loadGa(gaId);
  }

  if (bar) {
    for (const button of bar.querySelectorAll('[data-consent]')) {
      button.addEventListener('click', () => setConsent(button.dataset.consent));
    }
  }

  if (gaId && readCookie('consent') === 'granted') loadGa(gaId);

  // "Update cookie settings" on the privacy page (spec 4.2): clears consent plus every GA cookie, then reloads
  // so the bar reappears.
  const resetButton = document.querySelector('[data-consent-reset]');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      document.cookie = 'consent=; Max-Age=0; Path=/';
      document.cookie = '_ga=; Max-Age=0; Path=/';
      for (const pair of document.cookie.split('; ')) {
        const name = pair.split('=')[0];
        if (name.indexOf('_ga_') === 0) document.cookie = name + '=; Max-Age=0; Path=/';
      }
      location.reload();
    });
  }
}
