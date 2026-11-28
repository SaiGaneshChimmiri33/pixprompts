// Prompt library: search, filter, copy. Starts from the prompts baked into the
// page (#seed), then swaps in the live list from /api/prompts when it exists.
(function () {
  var SUF = " Keep my face, features and the photo's original details unchanged. The result must look 100% accurate to me.";
  var IC = { "Portraits": "✨", "Vintage": "📷", "Festival": "🪔", "Cinematic": "🎬", "Professional": "💼", "3D & toy": "🧸", "Art styles": "🎨", "Couples": "💞", "Quick fixes": "⚡" };
  var grid = document.getElementById("grid"), chips = document.getElementById("chips"), count = document.getElementById("count");
  var input = document.getElementById("q"), keep = document.getElementById("keepface");
  if (!grid) return;

  var P = [], cats = ["All"], cur = "All", q = "";
  function norm(x) { return { title: x.title, category: x.category, tools: x.tools || "All tools", colors: x.colors || ["#FFB6C9", "#8EC5FF"], text: x.text, image: x.image || "" }; }
  try { P = JSON.parse(document.getElementById("seed").textContent).map(norm); } catch (e) { P = []; }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function chatOk(t) { return t.indexOf("ChatGPT") > -1 || t === "All tools"; }
  function setCats() { cats = ["All"].concat(P.map(function (p) { return p.category; }).filter(function (v, i, a) { return a.indexOf(v) === i; })); }
  function stats() { var a = document.getElementById("n1"), b = document.getElementById("n2"); if (a) a.textContent = P.length; if (b) b.textContent = cats.length - 1; }

  function drawChips() {
    chips.innerHTML = cats.map(function (c) { return '<button type="button" class="chip" aria-pressed="' + (c === cur) + '" data-c="' + esc(c) + '">' + esc(c) + "</button>"; }).join("");
  }
  function card(p, i) {
    var src = p.image || "/img/" + slug(p.title) + ".jpg";
    return '<article class="pcard"><div class="sw" style="--c1:' + p.colors[0] + ";--c2:" + p.colors[1] + '"><img class="pi" src="' + esc(src) + '" alt="Sample result for ' + esc(p.title) + '" loading="lazy" onerror="this.remove()"><span class="tag">' + esc(p.category) + "</span><i aria-hidden=\"true\">" + (IC[p.category] || "🎨") + "</i></div>" +
      '<div class="pb"><h3>' + esc(p.title) + '</h3><p class="ptxt">' + esc(p.text) + "</p>" +
      '<div class="prow"><span class="tools">' + esc(p.tools) + "</span>" + (chatOk(p.tools) ? '<a class="open" target="_blank" rel="noopener" href="https://chatgpt.com/?q=' + encodeURIComponent(p.text + SUF) + '">Open in ChatGPT</a>' : "") + "</div>" +
      '<button type="button" class="copy" data-i="' + i + '">Copy prompt</button></div></article>';
  }
  function render() {
    var list = P.map(function (p, i) { return [p, i]; }).filter(function (x) {
      var p = x[0], t = (p.title + " " + p.category + " " + p.tools + " " + p.text).toLowerCase();
      return (cur === "All" || p.category === cur) && (!q || t.indexOf(q) > -1);
    });
    count.textContent = list.length + (list.length === 1 ? " prompt" : " prompts");
    grid.innerHTML = list.length ? list.map(function (x) { return card(x[0], x[1]); }).join("") :
      '<div class="empty">No prompts match that search. Try a shorter word or pick another category.</div>';
  }
  function toast() {
    var t = document.getElementById("toast"); t.classList.add("show"); clearTimeout(toast.h);
    toast.h = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (res, rej) { try { var a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); document.execCommand("copy"); document.body.removeChild(a); res(); } catch (e) { rej(e); } });
  }

  grid.addEventListener("click", function (e) {
    var b = e.target.closest(".copy"); if (!b) return;
    copyText(P[+b.dataset.i].text + (keep.checked ? SUF : "")).then(function () {
      b.textContent = "Copied ✓"; b.classList.add("ok"); toast();
      setTimeout(function () { b.textContent = "Copy prompt"; b.classList.remove("ok"); }, 1600);
    }).catch(function () { b.textContent = "Press and hold to copy"; });
  });
  chips.addEventListener("click", function (e) { var b = e.target.closest(".chip"); if (!b) return; cur = b.dataset.c; drawChips(); render(); });
  input.addEventListener("input", function (e) { q = e.target.value.trim().toLowerCase(); render(); });

  // Popular-style cards jump to the library with that category selected.
  document.querySelectorAll("[data-cat]").forEach(function (a) {
    a.addEventListener("click", function () {
      var c = a.getAttribute("data-cat");
      if (cats.indexOf(c) > -1) { cur = c; q = ""; input.value = ""; } else { cur = "All"; q = c.toLowerCase(); input.value = c; }
      drawChips(); render();
    });
  });

  setCats(); drawChips(); render(); stats();

  fetch("/api/prompts").then(function (r) { return r.json(); }).then(function (d) {
    if (!d || !Array.isArray(d.prompts) || !d.prompts.length) return;
    P = d.prompts.map(norm); setCats(); cur = "All"; drawChips(); render(); stats();
  }).catch(function () {});
})();
