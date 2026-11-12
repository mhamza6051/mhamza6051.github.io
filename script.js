// Portfolio interactions: footer year + project category filters.
document.getElementById('year').textContent = new Date().getFullYear();

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
