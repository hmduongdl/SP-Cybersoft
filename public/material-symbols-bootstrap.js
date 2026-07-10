(function () {
  var root = document.documentElement;
  var fontFamily = "Material Symbols Outlined";
  var cacheKey = "ms-font-ready-v1";

  function markReady() {
    root.classList.add("material-symbols-ready");
  }

  try {
    if (localStorage.getItem(cacheKey) === "1") {
      markReady();
    }
  } catch (e) {}

  if (!document.fonts || !document.fonts.load) {
    markReady();
    return;
  }

  document.fonts.load('400 24px "' + fontFamily + '"').then(function () {
    markReady();
    try {
      localStorage.setItem(cacheKey, "1");
    } catch (e) {}
  });

  setTimeout(markReady, 5000);
})();
