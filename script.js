document.addEventListener("DOMContentLoaded", () => {
  const pages = [
    "./pages/page-01.png",
    "./pages/page-01.png",
    "./pages/page-02.png",
    "./pages/page-02.png",
    "./pages/page-03.png",
    "./pages/page-03.png",
    "./pages/page-04.png",
    "./pages/page-04.png",
    "./pages/page-05.png",
    "./pages/page-05.png",
    "./pages/page-06.png",
    "./pages/page-06.png",
  ];

  const landing = document.getElementById("landing");
  const bookScreen = document.getElementById("bookScreen");
  const playBtn = document.getElementById("playBtn");
  const bgm = document.getElementById("bgm");
  const bookEl = document.getElementById("book");
  const loader = document.getElementById("loader");

  if (!landing || !bookScreen || !playBtn || !bgm || !bookEl) {
    console.error("Element missing. Check IDs in HTML.");
    return;
  }

  let pageFlip = null;

  const raf = () => new Promise((r) => requestAnimationFrame(r));

  async function waitForSize(el, tries = 90) {
    for (let i = 0; i < tries; i++) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 50) return rect;
      await raf();
    }
    throw new Error("Book container still has zero size.");
  }

  async function preloadImages(list) {
    await Promise.all(
      list.map(
        (src) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.decoding = "async";
            img.src = src;
          })
      )
    );
  }

  playBtn.addEventListener("click", async () => {
    try { await bgm.play(); } catch (e) {}

    landing.classList.add("hidden");
    bookScreen.classList.remove("hidden");

    await raf();
    await raf();

    if (!window.St || !window.St.PageFlip) {
      console.error("PageFlip library not loaded. Check CDN / internet.");
      return;
    }

    let rect;
    try {
      rect = await waitForSize(bookEl);
    } catch (e) {
      console.error(e);
      return;
    }

    if (loader) loader.classList.remove("hidden");
    await preloadImages(pages);
    if (loader) loader.classList.add("hidden");

    if (!pageFlip) initFlipbook(rect);
  });

  function initFlipbook(rect) {
    bookEl.innerHTML = pages
      .map(
        (src) => `
          <div class="page">
            <img src="${src}" alt="page" draggable="false" loading="eager" decoding="async"/>
          </div>
        `
      )
      .join("");

    const W = Math.floor(rect.width);
    const H = Math.floor(rect.height);

    pageFlip = new St.PageFlip(bookEl, {
      width: W,
      height: H,
      size: "fixed",
      autoSize: false,

      usePortrait: true,
      showCover: false,

      flippingTime: 700,
      maxShadowOpacity: 0.35,
      mobileScrollSupport: false,

      disableFlipByClick: true,
    });

    pageFlip.loadFromHTML(document.querySelectorAll("#book .page"));

    // ====== ANTI SKIP / ANTI DOUBLE TAP ======
    let locked = false;

    function lockFor(ms) {
      locked = true;
      window.setTimeout(() => (locked = false), ms);
    }

    // kalau PageFlip kasih event flip selesai, unlock juga
    pageFlip.on("flip", () => {
      // flip event biasanya muncul setelah selesai pindah page
      locked = false;
    });

    // gunakan pointerup (lebih stabil daripada click)
    bookEl.addEventListener(
      "pointerup",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (locked) return;

        const r = bookEl.getBoundingClientRect();
        const x = e.clientX - r.left;

        locked = true;          // lock immediately
        lockFor(750);           // fallback unlock (sedikit > flippingTime)

        if (x > r.width / 2) pageFlip.flipNext();
        else pageFlip.flipPrev();
      },
      { passive: false }
    );

    // cegah drag / select yang kadang bikin event dobel
    bookEl.addEventListener("dragstart", (e) => e.preventDefault());

    // resize fix
    window.addEventListener("resize", async () => {
      if (!pageFlip) return;
      await raf();
      const rr = bookEl.getBoundingClientRect();
      pageFlip.update({
        width: Math.floor(rr.width),
        height: Math.floor(rr.height),
        size: "fixed",
        autoSize: false,
        usePortrait: true
      });
    });
  }
});
