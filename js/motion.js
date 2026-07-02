/* ============================================================
   Motion & Animation System Helpers
   ============================================================ */

window.Motion = (() => {
  const isReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let confettiLoaded = false;

  /**
   * Staggered fade and rise reveal of elements
   */
  function revealStagger(container, selector, y = 10, duration = 0.32) {
    if (isReduced() || !window.gsap) return;
    const elements = container.querySelectorAll(selector);
    if (!elements.length) return;

    // Set initial states
    window.gsap.set(elements, { opacity: 0, y: y });

    // Animate stagger
    window.gsap.to(elements, {
      opacity: 1,
      y: 0,
      duration: duration,
      stagger: 0.05,
      ease: "power2.out",
      clearProps: "all"
    });
  }

  /**
   * Smooth number counter count-up
   */
  function countUp(el, target, duration = 1.2) {
    if (!el) return;
    if (isReduced() || !window.gsap) {
      el.textContent = target;
      return;
    }

    const obj = { val: 0 };
    window.gsap.to(obj, {
      val: target,
      duration: duration,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = Math.round(obj.val);
      },
      onComplete: () => {
        el.textContent = target;
      }
    });
  }

  /**
   * Animates drawing of an SVG progress ring or path
   */
  function drawRing(svgPathOrCircle, percent, duration = 0.48) {
    if (!svgPathOrCircle) return;
    
    // Check if it's a circle or path
    const isCircle = svgPathOrCircle.tagName.toLowerCase() === 'circle';
    let length = 0;
    
    if (isCircle) {
      const r = svgPathOrCircle.r.baseVal.value;
      length = 2 * Math.PI * r;
    } else {
      length = svgPathOrCircle.getTotalLength();
    }

    svgPathOrCircle.style.strokeDasharray = length;
    svgPathOrCircle.style.strokeDashoffset = length;

    if (isReduced() || !window.gsap) {
      svgPathOrCircle.style.strokeDashoffset = length - (percent / 100) * length;
      return;
    }

    window.gsap.to(svgPathOrCircle, {
      strokeDashoffset: length - (percent / 100) * length,
      duration: duration,
      ease: "power2.out"
    });
  }

  /**
   * Draws a checkmark in the container
   */
  function successCheck(el, callback) {
    if (!el) return;
    el.innerHTML = `
      <svg class="svg-checkmark" viewBox="0 0 52 52" style="width:24px;height:24px;stroke:var(--success-color, #10b981);stroke-width:4;fill:none;stroke-linecap:round;stroke-linejoin:round;display:inline-block;vertical-align:middle;">
        <circle cx="26" cy="26" r="23" class="svg-checkmark-path" style="stroke-dasharray:150;stroke-dashoffset:150;"></circle>
        <path class="svg-checkmark-path" d="M14.1 27.2l7.1 7.2 16.7-16.8" style="stroke-dasharray:100;stroke-dashoffset:100;"></path>
      </svg>
    `;

    if (isReduced() || !window.gsap) {
      el.querySelectorAll('.svg-checkmark-path').forEach(p => p.style.strokeDashoffset = 0);
      if (callback) callback();
      return;
    }

    window.gsap.to(el.querySelectorAll('.svg-checkmark-path'), {
      strokeDashoffset: 0,
      duration: 0.32,
      stagger: 0.12,
      ease: "power1.out",
      onComplete: callback
    });
  }

  /**
   * Tasteful, sparse milestone celebration (canvas-confetti lazy load)
   */
  async function celebrate() {
    if (isReduced()) return;
    
    if (!confettiLoaded) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js";
          script.integrity = "sha512-GVZQ4XLMDgRy6Wb1kvhJkV9rkKwncP77Xou+v9merH3+/Lcj9AnsbU2UHDvhg6NzVFQP03gvAhVAE47BvO6w/A==";
          script.crossOrigin = "anonymous";
          script.onload = () => { confettiLoaded = true; resolve(); };
          script.onerror = reject;
          document.body.appendChild(script);
        });
      } catch (e) {
        console.warn('[Confetti] failed to load', e);
        return;
      }
    }

    if (window.confetti) {
      window.confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#4F46E5', '#6366F1', '#10B981', '#F59E0B']
      });
    }
  }

  /**
   * Slides the active indicator underline between navigation tabs
   */
  function glideUnderline(navContainer, activeTabEl) {
    if (!navContainer || !activeTabEl) return;
    
    let underline = navContainer.querySelector('.active-tab-underline');
    if (!underline) {
      underline = document.createElement('div');
      underline.className = 'active-tab-underline';
      navContainer.style.position = 'relative';
      navContainer.appendChild(underline);
      // set initial position
      window.gsap.set(underline, {
        left: activeTabEl.offsetLeft,
        width: activeTabEl.offsetWidth
      });
      return;
    }

    if (isReduced() || !window.gsap) {
      underline.style.left = `${activeTabEl.offsetLeft}px`;
      underline.style.width = `${activeTabEl.offsetWidth}px`;
      return;
    }

    window.gsap.to(underline, {
      left: activeTabEl.offsetLeft,
      width: activeTabEl.offsetWidth,
      duration: 0.24,
      ease: "power2.out"
    });
  }

  /**
   * Slides the active indicator pill behind sidebar navigation items
   */
  function glidePill(sidebarContainer, activeItemEl) {
    if (!sidebarContainer || !activeItemEl) return;
    
    let pill = sidebarContainer.querySelector('.active-pill-background');
    if (!pill) {
      pill = document.createElement('div');
      pill.className = 'active-pill-background';
      // Insert pill as first child of container so it remains behind text
      sidebarContainer.style.position = 'relative';
      sidebarContainer.insertBefore(pill, sidebarContainer.firstChild);
      
      // Setup styles dynamically
      pill.style.position = 'absolute';
      pill.style.zIndex = '0';
      pill.style.pointerEvents = 'none';
      
      window.gsap.set(pill, {
        top: activeItemEl.offsetTop,
        height: activeItemEl.offsetHeight,
        left: activeItemEl.offsetLeft,
        width: activeItemEl.offsetWidth
      });
      return;
    }

    if (isReduced() || !window.gsap) {
      pill.style.top = `${activeItemEl.offsetTop}px`;
      pill.style.height = `${activeItemEl.offsetHeight}px`;
      pill.style.left = `${activeItemEl.offsetLeft}px`;
      pill.style.width = `${activeItemEl.offsetWidth}px`;
      return;
    }

    window.gsap.to(pill, {
      top: activeItemEl.offsetTop,
      height: activeItemEl.offsetHeight,
      left: activeItemEl.offsetLeft,
      width: activeItemEl.offsetWidth,
      duration: 0.24,
      ease: "power2.out"
    });
  }

  function triggerAutoEffects(root = document) {
    if (!root) return;
    root.querySelectorAll('.count-up-value').forEach(el => {
      if (el.classList.contains('counted-up')) return;
      el.classList.add('counted-up');
      const targetVal = parseFloat(el.dataset.target) || 0;
      countUp(el, targetVal);
    });
    root.querySelectorAll('.attendance-ring-path').forEach(el => {
      if (el.classList.contains('ring-drawn')) return;
      el.classList.add('ring-drawn');
      const percent = parseFloat(el.dataset.percent) || 0;
      drawRing(el, percent);
    });
  }

  /**
   * Wraps DOM replacements in View Transitions API with GSAP cross-fade fallback
   */
  function transition(container, renderFn, callback) {
    const wrappedCallback = () => {
      triggerAutoEffects(container || document);
      if (callback) callback();
    };

    if (document.startViewTransition && !isReduced()) {
      const t = document.startViewTransition(() => {
        renderFn(container);
      });
      t.finished.then(wrappedCallback);
    } else {
      // Fallback transition
      if (isReduced() || !window.gsap) {
        renderFn(container);
        wrappedCallback();
        return;
      }
      
      // GSAP cross-fade fallback
      window.gsap.to(container, {
        opacity: 0,
        y: -4,
        duration: 0.12,
        ease: "power1.in",
        onComplete: () => {
          renderFn(container);
          window.gsap.fromTo(container,
            { opacity: 0, y: 4 },
            {
              opacity: 1,
              y: 0,
              duration: 0.2,
              ease: "power2.out",
              onComplete: wrappedCallback
            }
          );
        }
      });
    }
  }

  // Auto trigger on content loaded
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => triggerAutoEffects(document), 100);
  });

  return {
    isReduced,
    revealStagger,
    countUp,
    drawRing,
    successCheck,
    celebrate,
    glideUnderline,
    glidePill,
    transition,
    triggerAutoEffects
  };
})();
