const lightbox = document.querySelector('#lightbox');

if (lightbox && typeof lightbox.showModal === 'function') {
  const links = [...document.querySelectorAll('.photo-link')];
  const image = lightbox.querySelector('#lightbox-image');
  const caption = lightbox.querySelector('#lightbox-caption');
  let current = 0;
  let opener;

  function show(index) {
    current = (index + links.length) % links.length;
    const link = links[current];
    image.src = link.href;
    image.alt = link.querySelector('img').alt;
    caption.textContent = `${current + 1} / ${links.length} · ${link.parentElement.querySelector('figcaption').textContent}`;
  }

  links.forEach((link, index) => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = link;
    show(index);
    lightbox.showModal();
  }));

  lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
  lightbox.querySelector('.lightbox-prev').addEventListener('click', () => show(current - 1));
  lightbox.querySelector('.lightbox-next').addEventListener('click', () => show(current + 1));
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) lightbox.close();
  });
  lightbox.addEventListener('close', () => opener?.focus());
  lightbox.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') show(current - 1);
    if (event.key === 'ArrowRight') show(current + 1);
  });
}

const reviewTrack = document.querySelector('#review-track');

if (reviewTrack) {
  loadReviews();
}

async function loadReviews() {
  try {
    const response = await fetch(new URL('./reviews.json', import.meta.url));
    if (!response.ok) return;
    const reviews = await response.json();
    if (!Array.isArray(reviews)) return;
    for (const review of reviews) {
      if (!review || typeof review.name !== 'string' || typeof review.text !== 'string') continue;
      const card = document.createElement('article');
      card.className = 'review-card';
      const quote = document.createElement('blockquote');
      quote.textContent = review.text;
      const author = document.createElement('cite');
      author.textContent = review.name;
      card.append(quote, author);
      reviewTrack.append(card);
    }
    if (!reviewTrack.children.length) return;
    document.querySelector('#reviews').hidden = false;
    const move = direction => reviewTrack.scrollBy({
      left: direction * (reviewTrack.firstElementChild.offsetWidth + 14),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    });
    document.querySelector('#review-prev').addEventListener('click', () => move(-1));
    document.querySelector('#review-next').addEventListener('click', () => move(1));
    if (reviewTrack.children.length === 1) {
      document.querySelector('#review-prev').hidden = true;
      document.querySelector('#review-next').hidden = true;
    }
  } catch {
    // The gallery and booking links remain available if the reviews file cannot load.
  }
}
