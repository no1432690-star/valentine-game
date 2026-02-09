
// 5. Visual Tricks (Scale/Opacity/Blur) - Refactored for Hard Mode
const genVisual = (type, val) => () => ({
    name: "Visual",
    init: () => {
        if (type === 'scale') DOM.yesBtn.style.transform = `scale(${val})`;
        if (type === 'opacity') {
            const clampedOpacity = Math.min(Math.max(val, 0.18), 0.28);
            DOM.yesBtn.style.opacity = clampedOpacity;
            DOM.dialogue.innerText = "Where is it? 👻";
        }
        if (type === 'blur') {
            // Hard Mode Blur: Equalize appearance
            DOM.yesBtn.classList.add('blur-mode');
            DOM.noBtn.classList.add('blur-mode');
            
            // Randomize Position (Swap Left/Right)
            const isSwapped = Math.random() > 0.5;
            DOM.buttonArea.style.flexDirection = isSwapped ? 'row-reverse' : 'row';
            
            DOM.dialogue.innerText = "Read carefully... 🌫️";
        }
        if (type === 'spin') DOM.yesBtn.classList.add('spin-fast');
    }
});
