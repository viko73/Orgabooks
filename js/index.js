(function() {
  let current = 0;
  const slides = document.querySelectorAll('.demo-slide');
  const tabs = document.querySelectorAll('.demo-tab');
  const dots = document.querySelectorAll('.demo-dot');
  const total = slides.length;

  function goTo(n) {
    slides[current].classList.remove('active');
    tabs[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (n + total) % total;
    slides[current].classList.add('active');
    tabs[current].classList.add('active');
    dots[current].classList.add('active');
  }

  document.getElementById('demo-prev').addEventListener('click', () => goTo(current - 1));
  document.getElementById('demo-next').addEventListener('click', () => goTo(current + 1));
  tabs.forEach((tab, i) => tab.addEventListener('click', () => goTo(i)));
})();