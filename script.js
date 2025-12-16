define([], function() {
    const App = {};

    // Scroll-based header effect
    App.initHeader = function() {
        const header = document.querySelector('header');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    };

    // Smooth scroll for CTA buttons
    App.initScrollCTA = function() {
        const ctaButtons = document.querySelectorAll('.cta a');
        ctaButtons.forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                const target = document.querySelector('#contact-form') || document.body;
                target.scrollIntoView({ behavior: 'smooth' });
            });
        });
    };

    // Card hover animation (optional JS enhancement)
    App.initCards = function() {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        });
    };

    // Initialize all
    App.init = function() {
        App.initHeader();
        App.initScrollCTA();
        App.initCards();
    };

    return App;
});

// Bootstrap AMD
require(['main'], function(App) {
    App.init();
});