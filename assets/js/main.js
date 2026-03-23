// assets/js/main.js — Premium Dark Portfolio Interactions

document.addEventListener('DOMContentLoaded', () => {

    // ─── Navbar Glass Effect on Scroll ───
    const nav = document.querySelector('nav');
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 50);
    });

    // ─── Mobile Hamburger Menu ───
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        // Close menu when a link is clicked
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // ─── Intersection Observer — Fade-in on Scroll ───
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    // Skills section: staggered reveal
    const skillsSection = document.getElementById('skills');
    if (skillsSection) {
        const skillsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    document.querySelectorAll('.skill-card').forEach((card, i) => {
                        setTimeout(() => card.classList.add('visible'), i * 100);
                    });
                    skillsObserver.disconnect();
                }
            });
        }, { threshold: 0.05 });
        skillsObserver.observe(skillsSection);
    }

    // Projects section: staggered reveal
    const projectsSection = document.getElementById('projects');
    if (projectsSection) {
        const projObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    document.querySelectorAll('.project-card').forEach((card, i) => {
                        setTimeout(() => card.classList.add('visible'), i * 120);
                    });
                    projObserver.disconnect();
                }
            });
        }, { threshold: 0.05 });
        projObserver.observe(projectsSection);
    }

    // ─── Smooth Scroll for Internal Links ───
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // ─── Fellowship Filter Tabs ───
    document.querySelectorAll('.ftab').forEach(tab => {
        tab.addEventListener('click', () => {
            const group = tab.dataset.group;
            if (group) {
                document.querySelectorAll(`.ftab[data-group="${group}"]`).forEach(t => t.classList.remove('active'));
                const container = tab.closest('.fellowship-content-col');
                if (container) {
                    container.querySelectorAll('.ftab-panel').forEach(p => p.classList.remove('active'));
                }
            } else {
                document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.ftab-panel').forEach(p => p.classList.remove('active'));
            }
            tab.classList.add('active');
            const targetId = tab.dataset.target;
            const target = document.getElementById(targetId);
            if (target) target.classList.add('active');
        });
    });

    // ─── Particle System (Hero Canvas) ───
    const canvas = document.getElementById('hero-particles');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        const PARTICLE_COUNT = 60;

        function resizeCanvas() {
            const hero = canvas.parentElement;
            canvas.width = hero.offsetWidth;
            canvas.height = hero.offsetHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        class Particle {
            constructor() { this.reset(); }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = (Math.random() - 0.5) * 0.4;
                this.speedY = (Math.random() - 0.5) * 0.4;
                this.opacity = Math.random() * 0.4 + 0.1;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
                if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(129, 140, 248, ${this.opacity})`;
                ctx.fill();
            }
        }

        for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

        function connectParticles() {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(99, 102, 241, ${0.06 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        }

        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { p.update(); p.draw(); });
            connectParticles();
            requestAnimationFrame(animateParticles);
        }
        animateParticles();
    }

    // ─── Typing Effect (Hero Subtitle) ───
    const typingEl = document.getElementById('typing-text');
    if (typingEl) {
        const fullText = typingEl.textContent;
        typingEl.textContent = '';
        let charIdx = 0;
        function typeChar() {
            if (charIdx < fullText.length) {
                typingEl.textContent += fullText.charAt(charIdx);
                charIdx++;
                setTimeout(typeChar, 35 + Math.random() * 25);
            }
        }
        // Start typing after a slight delay
        setTimeout(typeChar, 800);
    }

    // ─── Parallax on Mouse Move (floating badges) ───
    document.addEventListener('mousemove', (e) => {
        const badges = document.querySelectorAll('.floating-badge, .fellowship-float-badge');
        const mx = (e.clientX / window.innerWidth - 0.5) * 2;
        const my = (e.clientY / window.innerHeight - 0.5) * 2;
        badges.forEach((badge, i) => {
            const speed = (i + 1) * 5;
            badge.style.transform = `translate(${mx * speed}px, ${my * speed}px)`;
        });
    });

});
