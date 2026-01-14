document.addEventListener("DOMContentLoaded", () => {
  const pages = [
    "pages/page-01.png",
    "pages/page-02.png",
    "pages/page-03.png",
    "pages/page-04.png",
    "pages/page-05.png",
    "pages/page-06.png",
  ];

  const landing = document.getElementById("landing");
  const bookScreen = document.getElementById("bookScreen");
  const playBtn = document.getElementById("playBtn");
  const bgm = document.getElementById("bgm");

  const wrap = document.querySelector(".single-wrap");
  const bookEl = document.getElementById("book");

  if (!landing || !bookScreen || !playBtn || !bgm || !wrap || !bookEl) return;

  let started = false;

  playBtn.addEventListener("click", async () => {
    if (started) return;
    started = true;

    try { await bgm.play(); } catch (e) {}

    landing.classList.add("hidden");
    bookScreen.classList.remove("hidden");

    // pastikan layout sudah kebentuk
    await raf2();

    // preload dulu biar gak "lama ngeload"
    try {
      await preloadAll(pages);
    } catch (e) {
      // walau ada yang gagal, kita tetep jalan pakai yang ada
      console.warn("Preload warning:", e);
    }

    // coba PageFlip dulu. kalau gagal -> fallback.
    const ok = tryInitPageFlip(pages, wrap, bookEl);
    if (!ok) initFallbackFlip(pages, bookEl);
  });

  function tryInitPageFlip(pages, wrap, bookEl) {
    try {
      if (!window.St || !window.St.PageFlip) {
        console.warn("PageFlip CDN not loaded. Fallback used.");
        return false;
      }

      const rect = wrap.getBoundingClientRect();
      const W = Math.max(1, Math.round(rect.width));
      const H = Math.max(1, Math.round(rect.height));

      // reset isi book biar bersih
      bookEl.innerHTML = "";
      bookEl.style.width = W + "px";
      bookEl.style.height = H + "px";

      const pf = new St.PageFlip(bookEl, {
        width: W,
        height: H,
        size: "fixed",
        usePortrait: true,
        showCover: true,
        flippingTime: 650,
        maxShadowOpacity: 0.45,
        mobileScrollSupport: false,
        disableFlipByClick: true,
      });

      const imgs = pages.map((src) => {
        const img = document.createElement("img");
        img.src = src;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.draggable = false;
        return img;
      });

      pf.loadFromImages(imgs);

      // tap kanan/kiri
      bookEl.addEventListener("click", (e) => {
        const r = bookEl.getBoundingClientRect();
        const x = e.clientX - r.left;
        if (x > r.width / 2) pf.flipNext();
        else pf.flipPrev();
      });

      return true;
    } catch (e) {
      console.error("PageFlip init failed, fallback used:", e);
      return false;
    }
  }

  // === FALLBACK FLIP (NO LIBRARY, 100% LOAD) ===
  function initFallbackFlip(pages, bookEl) {
    let index = 0;
    let animating = false;

    // render awal
    bookEl.innerHTML = `
      <div class="fb">
        <div class="fb-bg"></div>
        <div class="fb-sheet"></div>
        <div class="fb-shadow"></div>
      </div>
    `;

    const fb = bookEl.querySelector(".fb");
    const bg = bookEl.querySelector(".fb-bg");
    const sheet = bookEl.querySelector(".fb-sheet");

    function setState(currIdx, nextIdx) {
      bg.style.backgroundImage = `url("${pages[nextIdx]}")`;
      // sheet ambil gambar CURRENT
      sheet.style.backgroundImage = `url("${pages[currIdx]}")`;
      // sheet fokus ke setengah kanan (biar kaya kertas)
      sheet.style.backgroundSize = "200% 100%";
      sheet.style.backgroundPosition = "right center";
    }

    setState(0, 0);

    bookEl.addEventListener("click", (e) => {
      if (animating) return;

      const r = bookEl.getBoundingClientRect();
      const x = e.clientX - r.left;

      const goNext = x > r.width / 2;
      const next = goNext
        ? Math.min(index + 1, pages.length - 1)
        : Math.max(index - 1, 0);

      if (next === index) return;

      animating = true;

      // set bg = halaman target, sheet = halaman current
      setState(index, next);

      // arah flip
      fb.classList.remove("turn-next", "turn-prev");
      void fb.offsetWidth; // restart animation

      fb.classList.add(goNext ? "turn-next" : "turn-prev");

      // selesai animasi -> halaman jadi next
      setTimeout(() => {
        index = next;
        // setelah flip selesai, bg = halaman current (biar stabilize)
        setState(index, index);
        fb.classList.remove("turn-next", "turn-prev");
        animating = false;
      }, 560);
    });
  }

  function preloadAll(list) {
    return Promise.all(
      list.map(
        (src) =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => reject(src);
            // cache-bust optional kalau Netlify cache aneh:
            img.src = src + "?v=" + Date.now();
          })
      )
    );
  }

  function raf2() {
    return new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );
  }
});
