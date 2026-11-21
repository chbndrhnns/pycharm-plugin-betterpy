(function () {
  function keepBetterPyInHeader() {
    document
      .querySelectorAll('[data-md-component="header-topic"] .md-ellipsis')
      .forEach(function (topic) {
        topic.textContent = "BetterPy";
      });
  }

  if (window.document$) {
    window.document$.subscribe(keepBetterPyInHeader);
  } else {
    document.addEventListener("DOMContentLoaded", keepBetterPyInHeader);
  }
})();
