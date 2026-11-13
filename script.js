// Portfolio interactions: footer year, project filters, scroll reveal,
// animated counters, and a typing effect for the hero roles line.
document.getElementById('year').textContent = new Date().getFullYear();

/* ---- project category filters ---- */
var buttons = document.querySelectorAll('.filter-btn');
var cards = document.querySelectorAll('#projectGrid .card');
buttons.forEach(function (btn) {
  btn.addEventListener('click', function () {
    buttons.forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    var f = btn.getAttribute('data-filter');
    cards.forEach(function (card) {
      var show = (f === 'all') || (card.getAttribute('data-cat') === f);
      card.classList.toggle('hidden', !show);
    });
  });
});

/* ---- scroll reveal ---- */
var revealObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (e) {
    if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(function (el) { revealObserver.observe(el); });

/* ---- animated counters ---- */
function animateCount(el) {
  var target = parseFloat(el.getAttribute('data-target'));
  var decimals = parseInt(el.getAttribute('data-decimal') || '0', 10);
  var start = null, dur = 1400;
  function step(ts) {
    if (!start) start = ts;
    var p = Math.min((ts - start) / dur, 1);
    var eased = 1 - Math.pow(1 - p, 3);
    el.textContent = (target * eased).toFixed(decimals);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
var countObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (e) {
    if (e.isIntersecting) { animateCount(e.target); countObserver.unobserve(e.target); }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.count').forEach(function (el) { countObserver.observe(el); });

/* ---- typing effect ---- */
var roles = ['AI & Machine Learning', 'Deep Learning', 'Computer Vision', 'Speech AI', 'Cybersecurity ML', 'Data Science'];
var typedEl = document.getElementById('typed');
var ri = 0, ci = 0, deleting = false;
function typeLoop() {
  var word = roles[ri];
  typedEl.textContent = word.slice(0, ci);
  if (!deleting) {
    if (ci < word.length) { ci++; setTimeout(typeLoop, 75); }
    else { deleting = true; setTimeout(typeLoop, 1500); }
  } else {
    if (ci > 0) { ci--; setTimeout(typeLoop, 38); }
    else { deleting = false; ri = (ri + 1) % roles.length; setTimeout(typeLoop, 300); }
  }
}
if (typedEl) typeLoop();
