import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { imageUrl, imageSources, imageDimensions } from "./images.js";

export function Gallery({ images }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const closeButton = useRef(null);
  const openingButton = useRef(null);
  const dialog = useRef(null);
  const touchStart = useRef(null);
  const open = activeIndex !== null;
  const move = direction => setActiveIndex(index => (index + direction + images.length) % images.length);
  useEffect(() => {
    if (!open) return undefined;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const keydown = event => {
      if (event.key === "Escape") { event.preventDefault(); setActiveIndex(null); }
      if (event.key === "ArrowLeft" && images.length > 1) { event.preventDefault(); move(-1); }
      if (event.key === "ArrowRight" && images.length > 1) { event.preventDefault(); move(1); }
      if (event.key === "Tab") {
        const controls = [...dialog.current.querySelectorAll("button")];
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
      }
    };
    window.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", keydown); openingButton.current?.focus(); };
  }, [open, images.length]);
  return <>
    <div className="post-gallery">{images.map((image, index) => <figure key={image._key || index}>
      <button className="post-image-open" type="button" aria-label={`Bild ${index + 1} von ${images.length} groß ansehen`} onClick={event => { openingButton.current = event.currentTarget; setActiveIndex(index); }}>
        <img src={imageUrl(image.url, 960)} srcSet={imageSources(image.url)} sizes={index === 0 ? "(max-width: 820px) 94vw, 800px" : "(max-width: 600px) 94vw, 400px"} {...imageDimensions(image.url)} alt={image.alt} loading="lazy" decoding="async" />
      </button>{image.caption && <figcaption>{image.caption}</figcaption>}
    </figure>)}</div>
    {open && <div className="post-lightbox-backdrop" onClick={event => { if (event.target === event.currentTarget) setActiveIndex(null); }}>
      <section ref={dialog} className="post-lightbox" role="dialog" aria-modal="true" aria-label="Bildergalerie">
        <div className="post-lightbox-top"><span aria-live="polite">Bild {activeIndex + 1} von {images.length}</span><button ref={closeButton} type="button" aria-label="Galerie schließen" onClick={() => setActiveIndex(null)}><X aria-hidden="true" /></button></div>
        <div className="post-lightbox-stage" onTouchStart={event => { touchStart.current = [event.touches[0].clientX, event.touches[0].clientY]; }} onTouchEnd={event => {
          if (!touchStart.current || images.length < 2) return;
          const dx = event.changedTouches[0].clientX - touchStart.current[0], dy = event.changedTouches[0].clientY - touchStart.current[1];
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
          touchStart.current = null;
        }}>
          {images.length > 1 && <button className="post-lightbox-arrow previous" type="button" aria-label="Vorheriges Bild" onClick={() => move(-1)}><ChevronLeft aria-hidden="true" /></button>}
          <img src={imageUrl(images[activeIndex].url, 1920)} alt={images[activeIndex].alt} />
          {images.length > 1 && <button className="post-lightbox-arrow next" type="button" aria-label="Nächstes Bild" onClick={() => move(1)}><ChevronRight aria-hidden="true" /></button>}
        </div>{images[activeIndex].caption && <p className="post-lightbox-caption">{images[activeIndex].caption}</p>}
      </section>
    </div>}
  </>;
}
