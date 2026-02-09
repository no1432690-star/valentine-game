/* --- GAME STATE & CONFIG --- */
const CONFIG = {
    TOTAL_STAGES: 101,
    STORAGE_KEY: 'valentine_game_state_v1'
};

const STATE = {
    yesCount: 0,
    noCount: 0,
    startTime: null,
    isWin: false,
    effects: [] // Will be populated
};

/* --- DOM CACHE --- */
const DOM = {
    yesBtn: document.getElementById('btn-yes'),
    noBtn: document.getElementById('btn-no'),
    mainCard: document.getElementById('main-card'),
    buttonArea: document.getElementById('button-area'),
    dialogue: document.getElementById('dialogue-text'),
    yesCount: document.getElementById('yes-count'),
    timeDisplay: document.getElementById('time-display'),
    progressFill: document.getElementById('progress-fill'),
    stageIndicator: document.getElementById('stage-indicator'),
    resetBtn: document.getElementById('reset-btn'),
    winScreen: document.getElementById('win-screen'),
    finalTime: document.getElementById('final-time'),
    finalNo: document.getElementById('final-no'),
    fakeContainer: document.getElementById('fake-container'),
    confettiCanvas: document.getElementById('confetti-canvas')
};

/* --- AUDIO ENGINE (WebAudio API) --- */
const AudioEngine = {
    ctx: new (window.AudioContext || window.webkitAudioContext)(),
    
    playTone(freq, type, duration, vol = 0.1) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    playYes() { this.playTone(800 + Math.random()*200, 'sine', 0.15, 0.2); },
    playNo() { this.playTone(150, 'sawtooth', 0.3, 0.15); },
    playWin() { 
        [440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.5, 0.2), i*100)); 
    }
};

/* --- DIALOGUES --- */
const DIALOGUES = [
    "Please say yes! 🥺", "Don't be mean... 💔", "I'll make you cookies! 🍪",
    "Is that a misclick? 🤨", "Are you sure? 🧐", "Stop breaking my heart 😭",
    "I'm not giving up! 💪", "Just one little click... 🤏", "Love is patient... 🕊️",
    "You're testing me... 😤", "Okay, now it's war 😈", "Click YES to win 🏆",
    "Why are you running? 🏃‍♂️", "Pretty please? 🍒", "I know you want to 😏"
];

function getRandomDialogue() {
    return DIALOGUES[Math.floor(Math.random() * DIALOGUES.length)];
}

/* --- UTILITIES --- */
function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    const centi = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${m}:${s}.${centi}`;
}

// Reset visual properties of buttons for a clean slate
function resetButtons() {
    const btns = [DOM.yesBtn, DOM.noBtn];
    btns.forEach(b => {
        b.style.transform = 'none';
        b.style.position = 'relative'; // Reset to relative layout flow
        b.style.left = 'auto';
        b.style.top = 'auto';
        b.style.opacity = '1';
        b.style.filter = 'none';
        b.style.transition = '0.2s';
        b.style.pointerEvents = 'auto';
        b.classList.remove('blur-heavy', 'spin-fast', 'blur-mode');
        
        // Remove all event listeners via cloning (nuclear option)
        const newB = b.cloneNode(true);
        b.parentNode.replaceChild(newB, b);
    });
    
    // Re-acquire DOM references after clone
    DOM.yesBtn = document.getElementById('btn-yes');
    DOM.noBtn = document.getElementById('btn-no');

    // Re-attach standard listeners
    DOM.yesBtn.addEventListener('pointerdown', handleYes);
    DOM.noBtn.addEventListener('pointerdown', handleNo);

    // Clear fake container
    DOM.fakeContainer.innerHTML = '';
    
    // Reset layout
    DOM.buttonArea.style.flexDirection = 'row';
}

/* --- SPAWN UTILS (SMART SPAWN) --- */
function getNonOverlappingPosition(width, height, existingPositions) {
    const area = DOM.buttonArea.getBoundingClientRect();
    const padding = 10;
    
    // Define Safe Zone: Avoid top 25% (Dialogue area)
    const safeTop = area.height * 0.25; 
    const maxY = area.height - height - padding;
    const maxX = area.width - width - padding;
    
    const maxAttempts = 50; 
    const minDistance = 75; 

    for (let i = 0; i < maxAttempts; i++) {
        const x = Math.random() * (maxX - padding) + padding;
        const y = Math.random() * (maxY - safeTop) + safeTop;

        let overlap = false;
        for (const pos of existingPositions) {
            const dx = (x + width/2) - (pos.x + width/2);
            const dy = (y + height/2) - (pos.y + height/2);
            const distance = Math.sqrt(dx*dx + dy*dy);
            if (distance < minDistance) { overlap = true; break; }
        }

        if (!overlap) return { x, y };
    }
    // Fallback
    return {
        x: Math.random() * (maxX - padding) + padding,
        y: Math.random() * (maxY - safeTop) + safeTop
    };
}

/* --- EFFECT GENERATORS --- */
const EffectGen = {
    // 1. Static/Simple
    static: () => ({ name: "Normal", init: () => {} }),
    
    // 2. Wiggle/Small Movement
    wiggle: (intensity) => ({
        name: "Wiggle",
        init: () => {
            DOM.yesBtn.style.position = 'relative';
            const tick = () => {
                const x = (Math.random() - 0.5) * intensity;
                const y = (Math.random() - 0.5) * intensity;
                DOM.yesBtn.style.transform = `translate(${x}px, ${y}px)`;
                requestAnimationFrame(tick);
            };
            // Note: In a real engine, we'd store the requestID to cancel it. 
            // For simplicity here, resetButtons() clears transforms which breaks the visual loop visually.
        }
    }),

    // 3. Run Away (Hover/Proximity)
    runAway: (speed) => ({
        name: "RunAway",
        init: () => {
            DOM.yesBtn.style.position = 'absolute';
            DOM.yesBtn.style.transition = `top ${0.3/speed}s, left ${0.3/speed}s`;
            
            const move = () => {
                const area = DOM.buttonArea.getBoundingClientRect();
                const btn = DOM.yesBtn.getBoundingClientRect();
                // Safe zone math
                const x = Math.random() * (area.width - btn.width);
                const y = Math.random() * (area.height - btn.height); // Full height allowed for chaos
                DOM.yesBtn.style.left = x + 'px';
                DOM.yesBtn.style.top = y + 'px';
            };
            
            // Move initially
            move();
            
            // Move on interaction
            DOM.yesBtn.onpointerover = move; // Desktop
            // Mobile: use a touch proximity hack if needed, or just rely on 'click' missing
        }
    }),

    // 4. Visual Tricks (Scale/Opacity/Blur)
    visual: (type, val) => ({
        name: "Visual",
        init: () => {
            if (type === 'scale') DOM.yesBtn.style.transform = `scale(${val})`;
            if (type === 'opacity') {
                // Clamped Opacity Logic
                const clampedOpacity = Math.min(Math.max(val, 0.18), 0.28);
                DOM.yesBtn.style.opacity = clampedOpacity;
                DOM.dialogue.innerText = "Where is it? 👻";
            }
            if (type === 'blur') {
                // Hard Blur Logic: Equalize buttons + Random Swap
                DOM.yesBtn.classList.add('blur-mode');
                DOM.noBtn.classList.add('blur-mode');
                
                // Random Swap
                const isSwapped = Math.random() > 0.5;
                DOM.buttonArea.style.flexDirection = isSwapped ? 'row-reverse' : 'row';
                DOM.dialogue.innerText = "Read carefully... 🌫️";
            }
        }
    }),

    // 5. Clones (Smart Spawning + Penalty)
    clones: (count) => ({
        name: "Clones",
        init: () => {
            DOM.yesBtn.style.position = 'absolute';
            DOM.yesBtn.style.zIndex = '20';
            DOM.dialogue.innerText = "Which one is real? 🤔";
            
            const btnW = DOM.yesBtn.offsetWidth || 110;
            const btnH = DOM.yesBtn.offsetHeight || 50;
            const usedPositions = [];

            // Position Real Button
            const pReal = getNonOverlappingPosition(btnW, btnH, usedPositions);
            usedPositions.push(pReal);
            DOM.yesBtn.style.left = pReal.x + 'px';
            DOM.yesBtn.style.top = pReal.y + 'px';

            // Spawn Clones
            for(let i=0; i<count; i++){
                const clone = document.createElement('button');
                clone.className = 'game-btn btn-yes fake-btn';
                clone.innerText = "YES 💖";
                clone.style.opacity = (Math.random() * 0.05 + 0.75).toString(); // Slightly ghosty
                
                const p = getNonOverlappingPosition(btnW, btnH, usedPositions);
                usedPositions.push(p);
                clone.style.left = p.x + 'px';
                clone.style.top = p.y + 'px';

                // Penalty Logic
                clone.onpointerdown = (e) => {
                    e.stopPropagation(); e.preventDefault();
                    AudioEngine.playNo();
                    STATE.noCount++;
                    
                    DOM.mainCard.classList.remove('shake');
                    void DOM.mainCard.offsetWidth;
                    DOM.mainCard.classList.add('shake');
                    
                    DOM.dialogue.innerText = getRandomDialogue();
                    updateUI();
                    saveGame();

                    clone.innerText = "NOPE 💀";
                    clone.style.background = "#57606f";
                    clone.style.transform = "scale(0.8)";
                    setTimeout(() => clone.remove(), 400);
                };
                DOM.fakeContainer.appendChild(clone);
            }
        }
    })
};

/* --- GENERATE 101 STAGES --- */
function generateStages() {
    const ef = [];
    // Stage 0 (Index 0 is unused or Stage 1 mapped to index 0)
    // We map click count X to effect X. 
    
    for(let i=0; i<=101; i++) {
        if(i < 5) ef.push(EffectGen.static());
        else if(i < 15) ef.push(EffectGen.wiggle(i * 2));
        else if(i < 25) ef.push(EffectGen.runAway(1));
        else if(i < 35) ef.push(EffectGen.visual('scale', 0.8));
        else if(i < 45) ef.push(EffectGen.runAway(2));
        else if(i < 55) ef.push(EffectGen.visual('opacity', 0.2)); // Will be clamped
        else if(i < 65) ef.push(EffectGen.clones(Math.floor(i/10)));
        else if(i < 75) ef.push(EffectGen.visual('blur', 0)); // Value ignored, hard logic used
        else if(i < 85) ef.push(EffectGen.clones(10));
        else if(i < 95) ef.push(EffectGen.runAway(3)); // Fast
        else if(i < 101) ef.push(EffectGen.visual('scale', 0.5)); // Tiny
        else ef.push(EffectGen.static()); // 101: Victory lap
    }
    STATE.effects = ef;
}

/* --- GAME LOOP --- */
function initGame() {
    loadGame();
    generateStages();
    updateUI();
    applyCurrentStage();
    
    // Timer Loop
    setInterval(() => {
        if(STATE.startTime && !STATE.isWin) {
            const now = Date.now();
            DOM.timeDisplay.innerText = formatTime(now - STATE.startTime);
        }
    }, 30);
    
    // Background Particles
    createParticles();
}

function handleYes() {
    if(STATE.isWin) return;
    
    if(STATE.yesCount === 0) {
        STATE.startTime = Date.now();
    }

    AudioEngine.playYes();
    STATE.yesCount++;
    
    // Visual Feedback
    spawnFloatingHeart(DOM.yesBtn);
    DOM.dialogue.innerText = "Yay! 💘";
    
    if(STATE.yesCount >= CONFIG.TOTAL_STAGES) {
        winGame();
    } else {
        saveGame();
        applyCurrentStage();
        updateUI();
    }
}

function handleNo() {
    AudioEngine.playNo();
    STATE.noCount++;
    DOM.mainCard.classList.remove('shake');
    void DOM.mainCard.offsetWidth; // Trigger reflow
    DOM.mainCard.classList.add('shake');
    DOM.dialogue.innerText = getRandomDialogue();
    updateUI();
    saveGame();
}

function applyCurrentStage() {
    if(STATE.yesCount >= 101) return;
    
    resetButtons();
    
    const effectFn = STATE.effects[STATE.yesCount];
    if(effectFn && effectFn.init) {
        // console.log(`Applying Stage ${STATE.yesCount}: ${effectFn.name}`);
        effectFn.init();
    }
}

function updateUI() {
    DOM.yesCount.innerText = STATE.yesCount;
    DOM.progressFill.style.width = `${(STATE.yesCount / CONFIG.TOTAL_STAGES) * 100}%`;
    DOM.stageIndicator.innerText = `Stage: ${STATE.yesCount + 1} / ${CONFIG.TOTAL_STAGES}`;
}

function winGame() {
    STATE.isWin = true;
    DOM.winScreen.classList.remove('hidden');
    
    const duration = Date.now() - STATE.startTime;
    DOM.finalTime.innerText = formatTime(duration);
    DOM.finalNo.innerText = STATE.noCount;
    
    AudioEngine.playWin();
    startConfetti();
    saveGame();
}

/* --- SAVE/LOAD --- */
function saveGame() {
    const data = {
        yesCount: STATE.yesCount,
        noCount: STATE.noCount,
        startTime: STATE.startTime,
        isWin: STATE.isWin
    };
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
}

function loadGame() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
    if(saved) {
        const parsed = JSON.parse(saved);
        STATE.yesCount = parsed.yesCount || 0;
        STATE.noCount = parsed.noCount || 0;
        STATE.startTime = parsed.startTime;
        STATE.isWin = parsed.isWin || false;
    }
}

DOM.resetBtn.addEventListener('click', () => {
    if(confirm('Start over?')) {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        location.reload();
    }
});

/* --- EXTRA VISUALS (PARTICLES/CONFETTI) --- */
function createParticles() {
    const container = document.getElementById('particles-container');
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

function spawnFloatingHeart(target) {
    const rect = target.getBoundingClientRect();
    const heart = document.createElement('div');
    heart.innerText = "💖";
    heart.style.position = 'fixed';
    heart.style.left = (rect.left + rect.width/2) + 'px';
    heart.style.top = rect.top + 'px';
    heart.style.fontSize = '2rem';
    heart.style.pointerEvents = 'none';
    heart.style.zIndex = '100';
    heart.style.transition = '1s';
    
    document.body.appendChild(heart);
    
    requestAnimationFrame(() => {
        heart.style.transform = `translate(0, -100px) scale(1.5)`;
        heart.style.opacity = '0';
    });
    
    setTimeout(() => heart.remove(), 1000);
}

// Simple Confetti Canvas Logic
function startConfetti() {
    const canvas = DOM.confettiCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const pieces = [];
    const colors = ['#ff758c', '#a29bfe', '#fdcb6e', '#00b894'];
    
    for(let i=0; i<150; i++) {
        pieces.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 10 + 5,
            speed: Math.random() * 5 + 2,
            drift: Math.random() * 2 - 1
        });
    }
    
    function loop() {
        ctx.clearRect(0,0,canvas.width, canvas.height);
        pieces.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            p.y += p.speed;
            p.x += p.drift;
            if(p.y > canvas.height) p.y = -20;
        });
        requestAnimationFrame(loop);
    }
    loop();
}

/* --- BOOTSTRAP --- */
document.getElementById('btn-share').onclick = () => {
    const text = `I survived the Valentine YES Challenge 💘\nAttempts: ${STATE.noCount} NOs\nTime: ${DOM.finalTime.innerText}`;
    navigator.clipboard.writeText(text).then(() => alert('Result copied! Send it to your valentine 💌'));
};

document.getElementById('btn-replay').onclick = () => {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    location.reload();
};

// Start
initGame();
