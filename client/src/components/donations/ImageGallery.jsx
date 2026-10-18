/**
 * ImageGallery - donation photo viewer with a thumbnail strip.
 *
 * The first image is marked primary by the API; we keep a local `active` index
 * so clicking a thumbnail swaps the main preview.
 */
import { useEffect, useState } from 'react';
import { fileUrl } from '../../utils/formatters';

export function ImageGallery({ images = [], title = 'Food photos', height = 'h-72' }) {
  const [active, setActive] = useState(0);

  // Reset the preview whenever a different donation is opened.
  useEffect(() => { setActive(0); }, [images]);

  if (!images.length) {
    return (
      <div className={`flex ${height} w-full items-center justify-center rounded-xl bg-slate-100 text-5xl`} aria-hidden="true">
        🍽️
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className="space-y-3">
      <div className={`${height} w-full overflow-hidden rounded-xl bg-slate-100`}>
        <img
          src={fileUrl(current.url)}
          alt={title}
          className="h-full w-full object-contain"
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.id ?? image.url}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-current={index === active}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-2 transition-all ${
                index === active ? 'ring-brand-500' : 'ring-transparent hover:ring-slate-300'
              }`}
            >
              <img src={fileUrl(image.url)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ImageGallery;
