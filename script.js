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
const trackedSections = ['about', 'projects', 'credentials', 'contact']
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
  const AUTOPLAY_MS = 8000;
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

  // Clone of slide 1 at the end lets last -> first keep sliding left.
  const count = slides.length;
  const firstClone = slides[0].cloneNode(true);
  firstClone.setAttribute('aria-hidden', 'true');
  carouselTrack.appendChild(firstClone);

  function render(animate = true) {
    if (animate) {
      carouselTrack.style.removeProperty('transition');
    } else {
      carouselTrack.style.setProperty('transition', 'none', 'important');
    }
    carouselTrack.style.transform = `translateX(-${current * 100}%)`;
    if (!animate) carouselTrack.getBoundingClientRect();
    dots.forEach((d, i) => d.classList.toggle('active', i === current % count));
  }

  function goTo(index, userInitiated) {
    current = index;
    render();
    if (userInitiated) startAutoplay();
  }

  function next(userInitiated) {
    if (current >= count) { current = 0; render(false); }
    goTo(current + 1, userInitiated);
  }

  function prev(userInitiated) {
    if (current <= 0) { current = count; render(false); }
    goTo(current - 1, userInitiated);
  }

  carouselTrack.addEventListener('transitionend', (e) => {
    if (e.target === carouselTrack && current === count) {
      current = 0;
      render(false);
    }
  });

  let hovering = false;

  // Always clears first, so there is never more than one timer running.
  function startAutoplay() {
    clearInterval(autoplayTimer);
    if (hovering || count < 2) return;
    autoplayTimer = setInterval(() => next(false), AUTOPLAY_MS);
  }

  function stopAutoplay() {
    clearInterval(autoplayTimer);
  }

  prevBtn.addEventListener('click', () => prev(true));
  nextBtn.addEventListener('click', () => next(true));

  const carouselRoot = prevBtn.closest('.project-carousel');
  carouselRoot.addEventListener('mouseenter', () => { hovering = true; stopAutoplay(); });
  carouselRoot.addEventListener('mouseleave', () => { hovering = false; startAutoplay(); });

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

// Project details dialog: fills one shared <dialog> from the card's <template>
const projectDialog = document.getElementById('projectDialog');

if (projectDialog) {
  const dialogBody = document.getElementById('projectDialogBody');

  let step = null; // moves the open gallery by +1 / -1; null when it has one item

  const makeButton = (className, label, html) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.setAttribute('aria-label', label);
    btn.innerHTML = html;
    return btn;
  };

  // Turns the template's list of <figure>s into a one-at-a-time slider.
  const setupGallery = (gallery) => {
    step = null;
    if (!gallery) return;
    const figures = Array.from(gallery.querySelectorAll('figure'));
    let current = 0;
    const dots = document.createElement('div');
    dots.className = 'carousel-dots gallery-dots';

    const show = (index) => {
      current = (index + figures.length) % figures.length;
      figures.forEach((fig, i) => { fig.hidden = i !== current; });
      Array.from(dots.children).forEach((dot, i) => dot.classList.toggle('active', i === current));
    };

    figures.forEach((fig) => {
      const img = fig.querySelector('img');
      if (!img) return;
      const expand = () => img.requestFullscreen?.();
      img.addEventListener('click', expand);
      fig.prepend(makeButton('gallery-expand', 'View full screen', '&#x2922;'));
      fig.firstChild.addEventListener('click', expand);
    });

    if (figures.length > 1) {
      step = (delta) => show(current + delta);
      const prev = makeButton('gallery-arrow gallery-prev', 'Previous image', '&larr;');
      const next = makeButton('gallery-arrow gallery-next', 'Next image', '&rarr;');
      prev.addEventListener('click', () => step(-1));
      next.addEventListener('click', () => step(1));
      const nav = document.createElement('div');
      nav.className = 'gallery-nav';
      nav.append(prev, next);
      gallery.append(nav);
      figures.forEach((_, i) => {
        const dot = makeButton('carousel-dot', `Show image ${i + 1}`, '');
        dot.addEventListener('click', () => show(i));
        dots.append(dot);
      });
      gallery.after(dots);
    }
    show(0);
  };

  const openProject = (id) => {
    dialogBody.replaceChildren(document.getElementById(`more-${id}`).content.cloneNode(true));
    dialogBody.querySelector('h3').id = 'projectDialogTitle';
    setupGallery(dialogBody.querySelector('.dialog-gallery'));
    projectDialog.showModal();
  };

  projectDialog.addEventListener('keydown', (e) => {
    if (!step || document.fullscreenElement) return;
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });

  // Includes the carousel's cloned first slide, so it works mid-loop too.
  document.querySelectorAll('[data-more]').forEach((card) => {
    const open = () => openProject(card.dataset.more);
    card.querySelector('.project-more-btn').addEventListener('click', open);
    card.querySelector('.project-media').addEventListener('click', open);
  });

  document.getElementById('projectDialogClose').addEventListener('click', () => projectDialog.close());
  // The dialog has no padding, so a click landing on it directly is a backdrop click.
  projectDialog.addEventListener('click', (e) => {
    if (e.target === projectDialog) projectDialog.close();
  });
}

// Contact form: submit via fetch so the page doesn't redirect to Formspree
const contactForm = document.getElementById('contactForm');

if (contactForm) {
  const formStatus = document.getElementById('formStatus');

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formStatus.textContent = 'Sending...';
    formStatus.className = 'form-status';

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        formStatus.textContent = "Thanks! I'll get back to you soon.";
        formStatus.classList.add('form-status-success');
        contactForm.reset();
      } else {
        formStatus.textContent = 'Something went wrong. Please try again or email me directly.';
        formStatus.classList.add('form-status-error');
      }
    } catch (err) {
      console.error('Contact form submission failed:', err);
      formStatus.textContent = 'Something went wrong. Please try again or email me directly.';
      formStatus.classList.add('form-status-error');
    }
  });
}
