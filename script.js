// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const nav = document.querySelector('.nav');

navToggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('nav-open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

// Close mobile menu after clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Scroll-triggered reveal animations
const revealEls = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  revealEls.forEach(el => revealObserver.observe(el));
} else {
  // Fallback: no IntersectionObserver support, just show everything
  revealEls.forEach(el => el.classList.add('in-view'));
}

// Active nav link highlighting based on section in view
const navLinks = document.querySelectorAll('[data-nav-link]');
const trackedSections = ['about', 'skills', 'projects', 'credentials', 'contact']
  .map(id => document.getElementById(id))
  .filter(Boolean);

if ('IntersectionObserver' in window && trackedSections.length) {
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.getAttribute('id');
      const link = document.querySelector(`[data-nav-link="${id}"]`);
      if (!link) return;
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  }, { threshold: 0.3, rootMargin: '-76px 0px -40% 0px' });

  trackedSections.forEach(section => navObserver.observe(section));
}

// Split-text reveal on hero heading (word by word)
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('[data-split]').forEach(el => {
  if (prefersReducedMotion) return;

  // Walk child nodes, wrapping text words in spans, preserving existing elements (like <br>, <span class="accent">)
  const walk = (node) => {
    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const words = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        words.forEach(word => {
          if (word.trim() === '') {
            frag.appendChild(document.createTextNode(word));
          } else {
            const span = document.createElement('span');
            span.className = 'split-word';
            span.textContent = word;
            frag.appendChild(span);
          }
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };

  walk(el);

  // Stagger each word's animation delay
  const words = el.querySelectorAll('.split-word');
  words.forEach((word, i) => {
    word.style.animationDelay = `${i * 0.045}s`;
  });
});

// Cursor-tracked glow spotlight on project cards
if (!prefersReducedMotion) {
  document.querySelectorAll('[data-glow]').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--glow-x', `${e.clientX - rect.left}px`);
      card.style.setProperty('--glow-y', `${e.clientY - rect.top}px`);
    });
  });
}

// Projects carousel: swipe, click arrows/dots, and autoplay
const carouselTrack = document.getElementById('carouselTrack');

if (carouselTrack) {
  const viewport = document.getElementById('carouselViewport');
  const slides = Array.from(carouselTrack.children);
  const dotsWrap = document.getElementById('carouselDots');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');
  const AUTOPLAY_MS = 6000;
  let current = 0;
  let autoplayTimer = null;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', `Go to project ${i + 1}`);
    dot.addEventListener('click', () => goTo(i, true));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function render() {
    carouselTrack.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function goTo(index, userInitiated) {
    current = (index + slides.length) % slides.length;
    render();
    if (userInitiated) restartAutoplay();
  }

  function next(userInitiated) { goTo(current + 1, userInitiated); }
  function prev(userInitiated) { goTo(current - 1, userInitiated); }

  function startAutoplay() {
    if (prefersReducedMotion || slides.length < 2) return;
    autoplayTimer = setInterval(() => next(false), AUTOPLAY_MS);
  }

  function stopAutoplay() {
    clearInterval(autoplayTimer);
  }

  function restartAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  prevBtn.addEventListener('click', () => prev(true));
  nextBtn.addEventListener('click', () => next(true));

  const carouselRoot = prevBtn.closest('.project-carousel');
  carouselRoot.addEventListener('mouseenter', stopAutoplay);
  carouselRoot.addEventListener('mouseleave', startAutoplay);

  // Touch / pointer swipe
  let dragStartX = null;
  let dragDeltaX = 0;

  viewport.addEventListener('touchstart', (e) => {
    dragStartX = e.touches[0].clientX;
    dragDeltaX = 0;
    stopAutoplay();
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (dragStartX === null) return;
    dragDeltaX = e.touches[0].clientX - dragStartX;
  }, { passive: true });

  viewport.addEventListener('touchend', () => {
    if (dragStartX === null) return;
    const SWIPE_THRESHOLD = 40;
    if (dragDeltaX > SWIPE_THRESHOLD) {
      prev(true);
    } else if (dragDeltaX < -SWIPE_THRESHOLD) {
      next(true);
    } else {
      startAutoplay();
    }
    dragStartX = null;
    dragDeltaX = 0;
  });

  render();
  startAutoplay();
}
