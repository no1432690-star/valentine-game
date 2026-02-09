
/* --- EXTRA VISUALS (PARTICLES/CONFETTI) --- */
function createParticles() {
    // FIX: Check for both IDs (container vs js) and ensure element exists to prevent crash
    const container = document.getElementById('particles-container') || document.getElementById('particles-js');
    if (!container) return;

    const colors = ['#ff758c', '#ff7eb3', '#a29bfe', '#fab1a0'];
    
    for(let i=0; i<30; i++) {
        const p = document.createElement('div');
        p.className = 'heart-particle';
        p.innerText = ['❤', '✨', '🌸'][Math.floor(Math.random()*3)];
        p.style.left = Math.random() * 100 + 'vw';
        p.style.fontSize = (Math.random() * 20 + 10) + 'px';
        p.style.color = colors[Math.floor(Math.random()*colors.length)];
        p.style.animationDuration = (Math.random() * 5 + 5) + 's';
        p.style.animationDelay = (Math.random() * 5) + 's';
        container.appendChild(p);
    }
}
