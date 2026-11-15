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

// Progressive enhancement: reveal editorial sections once as they enter the viewport.
// Above-the-fold content stays visible; reduced-motion and older browsers get no effects.
function initScrollReveals() {
  if (!('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const groups = [
    { selector: '.stat-list li', stagger: 55 },
    { selector: '.feature-photo, .feature-copy', stagger: 85 },
    { selector: '.amenity-grid > div', stagger: 65 },
    { selector: '#photos .section-head' },
    { selector: '#gallery-preview > figure', stagger: 60 },
    { selector: '.gallery-more' },
    { selector: '.home-cta > .wrap' },
    { selector: '.guide-list .guide-section-heading' },
    { selector: '.guide-list .guide-card', stagger: 65 },
    { selector: '.guide-ending' }
  ];

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('scroll-reveal--visible');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -7% 0px', threshold: 0.05 });

  const firstViewport = window.innerHeight * 0.95;
  for (const { selector, stagger = 0 } of groups) {
    document.querySelectorAll(selector).forEach((element, index) => {
      // Keep initial, linked-to, and collapsed content immediately accessible.
      if (element.closest('[hidden], details:not([open])')) return;
      const bounds = element.getBoundingClientRect();
      if (bounds.top <= firstViewport || bounds.bottom <= 0) return;

      if (stagger) {
        element.style.setProperty('--scroll-reveal-delay', `${(index % 3) * stagger}ms`);
      }
      element.classList.add('scroll-reveal');
      observer.observe(element);
    });
  }
}

initScrollReveals();
