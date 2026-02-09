
/**
 * WILL YOU BE MY VALENTINE? 💘
 * Senior Engineer Refactor - Engine & 101 Stages
 */

/* --- 1. CORE STATE & DOM --- */
const STATE = {
    yesCount: 0,
    noCount: 0,
    startTime: null,
    isWin: false,
    activeEffect: null,
    lastFrameTime: 0
};

const DOM = {
    yesBtn: document.getElementById('btn-yes'),
    noBtn: document.getElementById('btn-no'),
    dialogue: document.getElementById('dialogue-text'),
    yesCount: document.getElementById('yes-count'),
    progressFill: document.getElementById('progress-fill'),
    timeDisplay: document.getElementById('time-display'),
    buttonArea: document.getElementById('button-area'),
    winScreen: document.getElementById('win-screen'),
    fakeContainer: document.getElementById('fake-container'),
    resetBtn: document.getElementById('reset-btn'),
    stageIndicator: document.getElementById('stage-indicator'),
    mainCard: document.getElementById('main-card')
};

const DIALOGUES = [
    "Please say yes! 🥺", "Don't break my heart 💔", "I'll give you cookies 🍪", 
    "Just one click! ☝️", "Why are you running? 🏃", "Am I a joke to you? 🤡", 
    "Pretty please? 🍒", "I won't stop asking 📢", "Love me! 💖", "Resistance is futile 🤖",
    "I'm not crying, you are 😿", "This is bullying! 😭", "Okay, rude. 😒", 
    "You're playing hard to get! 😏", "Click YES already! 😡"
];

/* --- 2. AUDIO SYSTEM --- */
let audioCtx = null;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'yes') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500 + (STATE.yesCount * 10), now);
        osc.frequency.exponentialRampToValueAtTime(800 + (STATE.yesCount * 10), now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    } else if (type === 'no') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554, now + 0.2);
        osc.frequency.setValueAtTime(659, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 2);
        osc.start(now);
        osc.stop(now + 2);
    }
}

/* --- 3. UTILITIES --- */
function getRandomDialogue() { return DIALOGUES[Math.floor(Math.random() * DIALOGUES.length)]; }
function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }
function lerp(start, end, t) { return start * (1 - t) + end * t; }

function getSafePosition(element, padding = 10) {
    const area = DOM.buttonArea.getBoundingClientRect();
    const btn = element.getBoundingClientRect();
    const maxX = area.width - btn.width - padding;
    const maxY = area.height - btn.height - padding;
    return {
        x: Math.random() * maxX,
        y: Math.random() * maxY
    };
}

/* --- 4. ENGINE CORE --- */
function loadGame() {
    const saved = localStorage.getItem('valentine_save_v2');
    if (saved) {
        const data = JSON.parse(saved);
        STATE.yesCount = data.yesCount || 0;
        STATE.noCount = data.noCount || 0;
        STATE.startTime = data.startTime ? new Date(data.startTime) : null;
    }
    updateUI();
    
    if (STATE.yesCount >= 101) handleWin();
    else initStage(STATE.yesCount);

    requestAnimationFrame(gameLoop);
}

function saveGame() {
    localStorage.setItem('valentine_save_v2', JSON.stringify({
        yesCount: STATE.yesCount,
        noCount: STATE.noCount,
        startTime: STATE.startTime
    }));
}

function resetGame() {
    localStorage.removeItem('valentine_save_v2');
    location.reload();
}

function startGameTimer() {
    if (!STATE.startTime) STATE.startTime = new Date();
}

// Global Game Loop
function gameLoop(timestamp) {
    if (STATE.isWin) return;
    
    const dt = timestamp - STATE.lastFrameTime;
    STATE.lastFrameTime = timestamp;

    // Timer Update
    if (STATE.startTime) {
        const diff = new Date() - STATE.startTime;
        const mins = Math.floor(diff / 60000).toString().padStart(2, '0');
        const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        const ms = Math.floor((diff % 1000) / 10).toString().padStart(2, '0');
        DOM.timeDisplay.innerText = `${mins}:${secs}.${ms}`;
    }

    // Effect Update
    if (STATE.activeEffect && STATE.activeEffect.tick) {
        STATE.activeEffect.tick(dt, timestamp);
    }

    requestAnimationFrame(gameLoop);
}

/* --- 5. ROBUST RESET SYSTEM --- */
function resetButtons() {
    // Reset YES Button
    const yes = DOM.yesBtn;
    yes.style.cssText = ''; // Clear all inline styles
    yes.className = 'game-btn btn-yes';
    yes.innerText = 'YES 💖';
    
    // Reset NO Button
    const no = DOM.noBtn;
    no.style.cssText = '';
    no.className = 'game-btn btn-no';
    no.innerText = 'NO 💔';

    // Reset Container
    DOM.buttonArea.style.cssText = '';
    DOM.buttonArea.className = 'button-area';
    
    // Reset Dialogue
    DOM.dialogue.style.transform = '';
    
    // Clear Fakes
    DOM.fakeContainer.innerHTML = '';
}

function cleanupActiveEffect() {
    if (STATE.activeEffect && STATE.activeEffect.cleanup) {
        STATE.activeEffect.cleanup();
    }
    STATE.activeEffect = null;
}

/* --- 6. EFFECT GENERATORS (100 Unique Effects) --- */
// We generate 101 stages procedurally with specific overrides

const EFFECTS_REGISTRY = [];

function registerEffect(generator) {
    EFFECTS_REGISTRY.push(generator);
}

function makeAbsolute(btn) {
    btn.style.position = 'absolute';
    btn.style.left = '50%';
    btn.style.top = '50%';
    btn.style.transform = 'translate(-50%, -50%)';
}

/* --- GENERATOR FUNCTIONS --- */
// 1. Static Text / Simple
const genSimple = (text) => () => ({
    name: "Simple",
    init: () => { DOM.dialogue.innerText = text; }
});

// 2. Movement (Wander)
const genWander = (speed) => () => ({
    name: "Wander",
    init: () => { 
        makeAbsolute(DOM.yesBtn);
        this.x = DOM.buttonArea.clientWidth / 2;
        this.y = DOM.buttonArea.clientHeight / 2;
        this.vx = (Math.random() - 0.5) * speed;
        this.vy = (Math.random() - 0.5) * speed;
        DOM.dialogue.innerText = "Catch me! 🦋";
    },
    tick: (dt) => {
        const bounds = DOM.buttonArea.getBoundingClientRect();
        this.x += this.vx;
        this.y += this.vy;
        
        // Bounce
        if (this.x < 20 || this.x > bounds.width - 60) this.vx *= -1;
        if (this.y < 20 || this.y > bounds.height - 40) this.vy *= -1;
        
        DOM.yesBtn.style.left = `${this.x}px`;
        DOM.yesBtn.style.top = `${this.y}px`;
        DOM.yesBtn.style.transform = 'translate(-50%, -50%)';
    }
});

// 3. Runaway (Evade Mouse)
const genRunaway = (radius, cooldown) => () => ({
    name: "Runaway",
    init: () => {
        makeAbsolute(DOM.yesBtn);
        this.lastMove = 0;
        DOM.dialogue.innerText = "Too slow! 🏎️";
    },
    onPointerNear: () => {
        const now = Date.now();
        if (now - this.lastMove > cooldown) {
            const pos = getSafePosition(DOM.yesBtn);
            DOM.yesBtn.style.transition = 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)';
            DOM.yesBtn.style.left = pos.x + 'px';
            DOM.yesBtn.style.top = pos.y + 'px';
            DOM.yesBtn.style.transform = 'none';
            this.lastMove = now;
        }
    }
});

// 4. Orbit
const genOrbit = (speed, radius) => () => ({
    name: "Orbit",
    init: () => {
        makeAbsolute(DOM.yesBtn);
        DOM.dialogue.innerText = "Round and round~ 😵";
    },
    tick: (dt, time) => {
        const cx = DOM.buttonArea.clientWidth / 2;
        const cy = DOM.buttonArea.clientHeight / 2;
        const rads = time * speed * 0.002;
        DOM.yesBtn.style.left = (cx + Math.cos(rads) * radius) + 'px';
        DOM.yesBtn.style.top = (cy + Math.sin(rads) * radius) + 'px';
    }
});

// 5. Visual Tricks (Scale/Opacity)
const genVisual = (type, val) => () => ({
    name: "Visual",
    init: () => {
        if (type === 'scale') DOM.yesBtn.style.transform = `scale(${val})`;
        if (type === 'opacity') {
            DOM.yesBtn.style.opacity = val;
            DOM.dialogue.innerText = "Where is it? 👻";
        }
        if (type === 'blur') DOM.yesBtn.classList.add('blur-heavy');
        if (type === 'spin') DOM.yesBtn.classList.add('spin-fast');
    }
});

// 6. Fake Clones
const genClones = (count) => () => ({
    name: "Clones",
    init: () => {
        makeAbsolute(DOM.yesBtn);
        DOM.dialogue.innerText = "Which one is real? 🤔";
        for (let i = 0; i < count; i++) {
            const clone = document.createElement('button');
            clone.className = 'game-btn btn-yes fake-btn';
            clone.innerText = "YES 💖";
            const pos = getSafePosition(DOM.yesBtn);
            clone.style.left = pos.x + 'px';
            clone.style.top = pos.y + 'px';
            
            // Clone behavior: run away or vanish
            clone.onpointerdown = () => {
                clone.innerText = "NOPE";
                clone.style.background = "#747d8c";
                setTimeout(() => clone.remove(), 500);
            };
            DOM.fakeContainer.appendChild(clone);
        }
    }
});

// 7. Teleport
const genTeleport = (interval) => () => ({
    name: "Teleport",
    init: () => {
        makeAbsolute(DOM.yesBtn);
        this.timer = 0;
        DOM.dialogue.innerText = "Blink and miss! ✨";
    },
    tick: (dt) => {
        this.timer += dt;
        if (this.timer > interval) {
            const pos = getSafePosition(DOM.yesBtn);
            DOM.yesBtn.style.left = pos.x + 'px';
            DOM.yesBtn.style.top = pos.y + 'px';
            DOM.yesBtn.style.transform = 'none';
            this.timer = 0;
        }
    }
});

// 8. Swap
const genSwap = () => () => ({
    name: "Swap",
    init: () => {
        DOM.buttonArea.style.flexDirection = 'row-reverse';
        DOM.dialogue.innerText = "Wait, that's illegal! 👮";
    }
});

// 9. Resize Pulse
const genPulse = (speed) => () => ({
    name: "Pulse",
    init: () => { DOM.dialogue.innerText = "Breathing... 🫁"; },
    tick: (dt, time) => {
        const scale = 1 + Math.sin(time * speed * 0.005) * 0.3;
        DOM.yesBtn.style.transform = `scale(${scale})`;
    }
});

/* --- POPULATE 101 EFFECTS --- */
// Index 0 = Stage 1
function buildEffectsLibrary() {
    const list = [];
    
    // Stages 1-20: Tutorial / Easy
    list.push(genSimple("Just click it! ❤️")); // 1
    list.push(genSimple("Are you sure? 🥺")); // 2
    list.push(genVisual('scale', 0.9)); // 3
    list.push(genVisual('scale', 0.8)); // 4
    list.push(genPulse(1)); // 5
    list.push(genSwap()); // 6
    list.push(genSimple("I can do this all day 🕐")); // 7
    list.push(genVisual('opacity', 0.8)); // 8
    list.push(genWander(0.5)); // 9
    list.push(genWander(1)); // 10
    
    // 11-20
    for(let i=0; i<5; i++) list.push(genRunaway(100, 500 - (i*50)));
    for(let i=0; i<5; i++) list.push(genTeleport(1500 - (i*100)));

    // Stages 21-50: Medium (Movement & Tricks)
    for(let i=0; i<10; i++) list.push(genOrbit(1 + i*0.2, 50 + i*5)); // Orbiting
    for(let i=0; i<10; i++) list.push(genClones(3 + Math.floor(i/2))); // Clones
    for(let i=0; i<10; i++) list.push(genRunaway(120, 300)); // Faster runaway

    // Stages 51-80: Hard (Visuals)
    for(let i=0; i<10; i++) list.push(genVisual('opacity', 0.5 - (i*0.04))); // Fading
    for(let i=0; i<5; i++) list.push(genVisual('blur', 0)); // Blur
    for(let i=0; i<5; i++) list.push(genVisual('spin', 0)); // Spin
    for(let i=0; i<10; i++) list.push(genTeleport(600 - (i*30))); // Fast teleport

    // Stages 81-99: Chaos
    for(let i=0; i<19; i++) {
        // Mix effects using a closure
        const isOdd = i % 2 === 0;
        if(isOdd) list.push(genClones(10));
        else list.push(genOrbit(5, 80));
    }

    // Stage 100: Final Boss (Index 99)
    list.push(() => ({
        name: "Final Boss",
        init: () => {
            makeAbsolute(DOM.yesBtn);
            DOM.yesBtn.style.transition = 'transform 0.1s';
            DOM.dialogue.innerText = "FINAL STAGE: CATCH ME! 🔥";
            DOM.noBtn.style.display = 'none'; // Remove NO button
        },
        tick: (dt, time) => {
            // Erratic movement
            const cx = DOM.buttonArea.clientWidth / 2;
            const cy = DOM.buttonArea.clientHeight / 2;
            const x = cx + Math.cos(time * 0.01) * 100;
            const y = cy + Math.sin(time * 0.02) * 60;
            DOM.yesBtn.style.left = x + 'px';
            DOM.yesBtn.style.top = y + 'px';
            DOM.yesBtn.style.transform = `translate(-50%, -50%) rotate(${Math.sin(time*0.01)*20}deg)`;
        }
    }));

    // Stage 101: Victory Lap (Index 100)
    list.push(() => ({
        name: "Victory",
        init: () => {
            DOM.yesBtn.style.transform = 'scale(2)';
            DOM.yesBtn.style.boxShadow = '0 0 30px var(--primary)';
            DOM.dialogue.innerText = "ONE LAST TIME! 💍";
            DOM.noBtn.style.display = 'none';
        }
    }));

    // Fill remaining if any gap (fallback)
    while(list.length < 102) list.push(genSimple("Keep going!"));

    return list;
}

const EFFECT_LIBRARY = buildEffectsLibrary();

function initStage(index) {
    if (index > 100) index = 100;
    
    // UI Updates
    DOM.stageIndicator.innerText = `Stage: ${index + 1} / 101`;
    const percent = Math.min((index / 101) * 100, 100);
    DOM.progressFill.style.width = `${percent}%`;

    // Effect Application
    cleanupActiveEffect();
    resetButtons();

    // Loop effects if index > defined list (safety)
    const factory = EFFECT_LIBRARY[index] || EFFECT_LIBRARY[index % EFFECT_LIBRARY.length];
    
    // Create new effect instance
    STATE.activeEffect = factory();
    if (STATE.activeEffect.init) STATE.activeEffect.init();
    
    console.log(`Stage ${index+1}: ${STATE.activeEffect.name}`);
}

/* --- 7. EVENT HANDLERS --- */
function handleYes(e) {
    // Mobile double-tap prevention if needed, but handled by pointer events
    startGameTimer();
    playSound('yes');
    STATE.yesCount++;
    
    createParticle(e.clientX, e.clientY, '💖');
    
    saveGame();
    
    if (STATE.yesCount >= 101) {
        updateUI();
        handleWin();
    } else {
        updateUI();
        initStage(STATE.yesCount);
        if (STATE.yesCount < 100) DOM.dialogue.innerText = getRandomDialogue();
    }
}

function handleNo(e) {
    startGameTimer();
    playSound('no');
    STATE.noCount++;
    
    // Visual Shake
    DOM.mainCard.classList.remove('shake');
    void DOM.mainCard.offsetWidth; // trigger reflow
    DOM.mainCard.classList.add('shake');
    
    DOM.dialogue.innerText = getRandomDialogue();
    updateUI();
    saveGame();
}

// Global Pointer Move for Proximity Effects
document.addEventListener('pointermove', (e) => {
    if (STATE.isWin || !STATE.activeEffect || !STATE.activeEffect.onPointerNear) return;
    
    const rect = DOM.yesBtn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
    
    // Proximity threshold
    if (dist < 120) {
        STATE.activeEffect.onPointerNear(e);
    }
});

function updateUI() {
    DOM.yesCount.innerText = STATE.yesCount;
    // Progress bar updated in initStage usually
}

function createParticle(x, y, char) {
    const el = document.createElement('div');
    el.innerText = char;
    el.style.position = 'fixed';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.fontSize = '2rem';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '1000';
    el.style.animation = 'floatUp 1s ease-out forwards';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

/* --- 8. WIN LOGIC --- */
function handleWin() {
    STATE.isWin = true;
    cleanupActiveEffect();
    resetButtons();
    playSound('win');
    
    DOM.winScreen.classList.remove('hidden');
    DOM.timeDisplay.innerText = DOM.timeDisplay.innerText || "00:00.00";
    document.getElementById('final-time').innerText = DOM.timeDisplay.innerText;
    document.getElementById('final-no').innerText = STATE.noCount;
    
    startConfetti();
}

/* --- 9. INITIALIZATION & BINDINGS --- */
// Using pointerdown for instant reaction on mobile
DOM.yesBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); handleYes(e); });
DOM.noBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); handleNo(e); });
DOM.resetBtn.addEventListener('click', resetGame);

// Win Screen Buttons
document.getElementById('btn-replay').addEventListener('click', resetGame);
document.getElementById('btn-share').addEventListener('click', () => {
    const text = `I completed the Valentine Challenge 💘\nTime: ${DOM.timeDisplay.innerText}\nNO clicks: ${STATE.noCount}\nTry it: ${window.location.href}`;
    navigator.clipboard.writeText(text).then(() => alert("Result copied to clipboard! 📋"));
});

// Particle Background Logic
function initParticles() {
    const container = document.getElementById('particles-js');
    for(let i=0; i<20; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 10 + 5;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.top = '100vh';
        p.style.animationDuration = Math.random() * 5 + 5 + 's';
        p.style.animationDelay = Math.random() * 5 + 's';
        container.appendChild(p);
    }
}

// Confetti
function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = Array.from({length: 150}, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        color: ['#ff6b81', '#ff4757', '#a18cd1', '#fbc2eb', '#ffffff'][Math.floor(Math.random() * 5)],
        size: Math.random() * 5 + 2,
        speed: Math.random() * 5 + 2,
        wobble: Math.random() * Math.PI * 2
    }));
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.y += p.speed;
            p.wobble += 0.05;
            const xOffset = Math.sin(p.wobble) * 2;
            
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x + xOffset, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            
            if(p.y > canvas.height) p.y = -10;
        });
        requestAnimationFrame(draw);
    }
    draw();
}

window.onload = () => {
    initParticles();
    loadGame();
};
