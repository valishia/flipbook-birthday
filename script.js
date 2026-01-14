document.addEventListener("DOMContentLoaded", () => {
  const pages = [
    "./pages/page-01.png",
    "./pages/page-02.png",
    "./pages/page-03.png",
    "./pages/page-04.png",
    "./pages/page-05.png",
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

  async function waitForSize(el, tries = 120) {
    for (let i = 0; i < tries; i++) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 50) return rect;
      await raf();
    }
    throw new Error("Book container still has zero size.");
  }

  async function preloadImages(list) {
    // preload ringan: resolve walau error, biar ga nge-freeze
    await Promise.all(
      list.map(
        (src) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.decoding = "async";
            img.src = src;
          })
      )
    );
  }

  playBtn.addEventListener("click", async () => {
    // audio kadang diblok; tetap lanjut buka flipbook
    try {
      await bgm.play();
    } catch (e) {}

    landing.classList.add("hidden");
    bookScreen.classList.remove("hidden");

    // tunggu layout kebentuk
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
    // inject pages
    bookEl.innerHTML = pages
      .map(
        (src) => `
          <div class="page">
            <img src="${src}" alt="page" draggable="false" loading="eager" decoding="async" />
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

      usePortrait: true, // SINGLE page
      showCover: false,

      flippingTime: 650,
      maxShadowOpacity: 0.35,
      mobileScrollSupport: false,

      // kita handle tap sendiri
      disableFlipByClick: true,
    });

    pageFlip.loadFromHTML(document.querySelectorAll("#book .page"));

    // =========================
    // ANTI-SKIP (REAL FIX)
    // =========================
    // Source skip paling sering:
    // - tap kebaca 2x (pointerup + click)
    // - user tap saat animasi masih jalan
    // Solusi: lock berdasarkan state animasi PageFlip

    let locked = false;

    // state names biasanya: "read", "fold_corner", "user_fold", "flipping"
    // kita treat selain "read" = lagi proses -> lock
    pageFlip.on("changeState", (state) => {
      locked = state !== "read";
    });

    // fallback unlock kalau flip event sudah kejadian
    pageFlip.on("flip", () => {
      locked = false;
    });

    // Jangan biarkan click bawaan browser ikut jalan
    bookEl.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    // Tap handler utama
    bookEl.addEventListener(
      "pointerup",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!pageFlip) return;
        if (locked) return; // kalau lagi animasi, ignore

        const r = bookEl.getBoundingClientRect();
        const x = e.clientX - r.left;

        // lock manual sebentar untuk anti double-tap super cepat
        locked = true;
        window.setTimeout(() => {
          // kalau masih animasi, changeState akan tetap lock
          // kalau sudah read, ini membuka lagi
          locked = false;
        }, 500);

        if (x > r.width / 2) pageFlip.flipNext();
        else pageFlip.flipPrev();
      },
      { passive: false }
    );

    // cegah drag / select
    bookEl.addEventListener("dragstart", (e) => e.preventDefault());
    bookEl.addEventListener("touchmove", (e) => e.preventDefault(), {
      passive: false,
    });

    // Resize update (mobile rotate)
    let resizeTimer = null;
    window.addEventListener("resize", async () => {
      if (!pageFlip) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(async () => {
        await raf();
        const rr = bookEl.getBoundingClientRect();
        pageFlip.update({
          width: Math.floor(rr.width),
          height: Math.floor(rr.height),
          size: "fixed",
          autoSize: false,
          usePortrait: true,
        });
      }, 150);
    });
  }
});
