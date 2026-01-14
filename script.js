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
  const bookEl = document.getElementById("book");

  if (!landing || !bookScreen || !playBtn || !bgm || !bookEl) return;

  let pageFlip = null;

  // preload biar smooth
  pages.forEach(src => {
    const img = new Image();
    img.src = src;
    if (img.decode) img.decode().catch(()=>{});
  });

  playBtn.addEventListener("click", async () => {
    try { await bgm.play(); } catch(e){}

    landing.classList.add("hidden");
    bookScreen.classList.remove("hidden");

    // tunggu layout settle biar ukuran akurat & ga loncat
    await raf2();

    if (!pageFlip) initFlipbook();
  });

  function initFlipbook() {
    const wrap = bookEl.parentElement; // .single-wrap
    const rect = wrap.getBoundingClientRect();
    const W = Math.round(rect.width);
    const H = Math.round(rect.height);

    // kunci ukuran DOM book biar ga resize/geser
    bookEl.style.width = W + "px";
    bookEl.style.height = H + "px";

    pageFlip = new St.PageFlip(bookEl, {
      width: W,
      height: H,
      size: "fixed",          // 🔥 kunci posisi (no stretch)

      usePortrait: true,      // 🔥 selalu single page
      showCover: true,        // cover tetap 1 halaman (page-01)

      maxShadowOpacity: 0.45,
      flippingTime: 650,
      mobileScrollSupport: false,

      // kita handle click sendiri (tap to flip)
      disableFlipByClick: true,
    });

    const imgs = pages.map((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "page";
      img.draggable = false;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      return img;
    });

    pageFlip.loadFromImages(imgs);

    // tap kanan = next, tap kiri = prev
    bookEl.addEventListener("click", (e) => {
      const r = bookEl.getBoundingClientRect();
      const x = e.clientX - r.left;
      if (x > r.width / 2) pageFlip.flipNext();
      else pageFlip.flipPrev();
    });

    // kalau window resize, re-init biar tetep center & single
    window.addEventListener("resize", async () => {
      await raf2();
      try { pageFlip.destroy(); } catch(e){}
      pageFlip = null;
      initFlipbook();
    }, { passive: true });
  }

  function raf2(){
    return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }
});
