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
  await Promise.all(
    list.map(async (src) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      try {
        await img.decode();
      } catch {
        await new Promise((res) => {
          img.onload = img.onerror = res;
        });
      }
    })
  );
}


  playBtn.addEventListener("click", async () => {
    try {
      await bgm.play();
    } catch (e) {}

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

  usePortrait: true,
  showCover: false,

  flippingTime: 520,
  maxShadowOpacity: 0.25,
  mobileScrollSupport: false,
  disableFlipByClick: true,

  useMouseEvents: false,
});


    pageFlip.loadFromHTML(document.querySelectorAll("#book .page"));

    let locked = false;

    pageFlip.on("changeState", (state) => {
      locked = state !== "read";
    });

    pageFlip.on("flip", () => {
      locked = false;
    });

    bookEl.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    bookEl.addEventListener(
      "pointerup",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!pageFlip) return;
        if (locked) return;

        const r = bookEl.getBoundingClientRect();
        const x = e.clientX - r.left;

        locked = true;
        window.setTimeout(() => {
          locked = false;
        }, 500);

        if (x > r.width / 2) pageFlip.flipNext();
        else pageFlip.flipPrev();
      },
      { passive: false }
    );

    bookEl.addEventListener("dragstart", (e) => e.preventDefault());
    bookEl.addEventListener("touchmove", (e) => e.preventDefault(), {
      passive: false,
    });

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
