(function () {
  // The address is built only when the page prints, so it never sits in the page for a scraper to read.
  function addMail() {
    var slot = document.querySelector('.contact__mail');
    if (!slot || slot.firstChild) return;
    var address = ['resume', 'chabassol.com'].join('@');
    var link = document.createElement('a');
    link.className = 'contact__link';
    link.href = 'mailto:' + address;
    link.textContent = address;
    slot.appendChild(link);
  }

  // Print uses static cuts of Roboto. Fetch them early so the first print does not fall back.
  function warmFonts() {
    if (!document.fonts) return;
    ['300', '400', '700'].forEach(function (w) { document.fonts.load(w + ' 1em "Roboto Print"'); });
    ['700', '900'].forEach(function (w) { document.fonts.load(w + ' 1em "Roboto Slab Print"'); });
  }

  window.addEventListener('beforeprint', addMail);
  window.addEventListener('load', function () {
    (window.requestIdleCallback || setTimeout)(warmFonts);
  });
}());
