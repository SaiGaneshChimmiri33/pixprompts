// Shared: mobile menu + success/error banners after form posts.
(function () {
  var nav = document.querySelector(".nav"), btn = document.querySelector(".burger");
  if (nav && btn) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); btn.focus(); }
    });
    nav.querySelectorAll(".menu a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); });
    });
  }
  var q = new URLSearchParams(location.search);
  var key = q.get("subscribed") ? "subscribed" : q.get("sent") ? "sent" : q.get("error") ? "error" : "";
  if (key) document.querySelectorAll('[data-flash="' + key + '"]').forEach(function (el) { el.classList.add("show"); });
})();
