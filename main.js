// ================= 0. 你的专属照片库 (请确保有 photos 文件夹) =================
const photoLibrary = [
    './photos/1.jpg',
    './photos/2.jpg',
    './photos/3.jpg',
    './photos/4.jpg',
    './photos/5.jpg',
    './photos/6.jpg',
    './photos/7.jpg',
    './photos/8.jpg'
];

// ================= 1. 音乐与唤醒逻辑 =================
const bgm = document.getElementById('bgm');
let isStarted = false;

// 暴露给全局，供 HTML 中的按钮点击调用
window.startExperience = function() {
    if (isStarted) return;
    isStarted = true;

    document.getElementById('introOverlay').classList.add('hidden');
    
    bgm.volume = 0;
    bgm.play().then(() => {
        let vol = 0;
        const fadeIn = setInterval(() => {
            vol += 0.05;
            if (vol >= 0.6) { bgm.volume = 0.6; clearInterval(fadeIn); } 
            else { bgm.volume = vol; }
        }, 100);
    }).catch(e => console.log("音频播放被拦截:", e));

    document.getElementById('photoRing').style.animationPlayState = 'running';
}

// ================= 2. Canvas 梦幻粒子系统 =================
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let width, height;
let particles = [];

function resize() { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

class Particle {
    constructor() { this.init(true); }
    init(randomY = false) {
        this.x = Math.random() * width;
        this.y = randomY ? Math.random() * height : height + 10;
        this.size = Math.random() * 2.5 + 0.5;
        this.speedY = Math.random() * -0.8 - 0.3; 
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.6 + 0.2;
        const colors = ['255, 215, 0', '255, 107, 129', '255, 255, 255'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.pulseSpeed = Math.random() * 0.02 + 0.01;
        this.pulsePhase = Math.random() * Math.PI * 2;
    }
    update() {
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(this.y * 0.01) * 0.2;
        this.pulsePhase += this.pulseSpeed;
        if (this.y < -10 || this.x < -10 || this.x > width + 10) this.init(false);
    }
    draw() {
        const currentOpacity = this.opacity + Math.sin(this.pulsePhase) * 0.2;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${Math.max(0, currentOpacity)})`;
        ctx.shadowBlur = this.size * 4; ctx.shadowColor = `rgba(${this.color}, 0.8)`;
        ctx.fill();
    }
}
for (let i = 0; i < 100; i++) particles.push(new Particle());
function animateParticles() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animateParticles);
}
animateParticles();

// ================= 3. 核心业务逻辑 =================
const photoRing = document.getElementById('photoRing');
const photoOverlay = document.getElementById('photoOverlay');
const bigPhotoImg = document.getElementById('bigPhotoImg');

let appState = 'normal'; 
let isLightOff = false;
let windTimeout = null;
let lastScissorsTime = 0, lastWindTime = 0, lastOkTime = 0, lastSwitchTime = 0;
let fistStartTime = 0, isFistLocked = false;
let twoHandsStartTime = 0, isWindLocked = false;
let currentPhotoIndex = 0;
let isPhotoZooming = false; 

function initPhotos() {
    const numPhotos = photoLibrary.length;
    const radius = 240; // 横版图半径
    photoLibrary.forEach((src, i) => {
        const angle = (360 / numPhotos) * i;
        const wrapper = document.createElement('div');
        wrapper.className = 'photo-wrapper';
        wrapper.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
        wrapper.innerHTML = `<div class="hanging-wire"></div><div class="photo" id="photo-${i}"><img src="${src}" id="img-${i}"></div>`;
        photoRing.appendChild(wrapper);
    });
}
initPhotos();

function setBtnState(btnId, state) { document.getElementById(btnId).classList.toggle('active', state); }

// 剪刀手放大特效
function triggerTakePhoto() {
    if (isPhotoZooming) return; 
    isPhotoZooming = true;

    setBtnState('btnAdd', true);
    
    const flash = document.getElementById('flashOverlay');
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 150);

    const randomIndex = Math.floor(Math.random() * photoLibrary.length);
    const photoDiv = document.getElementById(`photo-${randomIndex}`);
    
    if (photoDiv) {
        photoDiv.style.transform = 'scale(1.6) translateZ(100px)';
        photoDiv.style.zIndex = '99';
        photoDiv.style.boxShadow = '0 0 50px #fff, 0 0 100px #ff6b81';
        
        setTimeout(() => {
            photoDiv.style.transform = ''; 
            photoDiv.style.zIndex = '';
            photoDiv.style.boxShadow = '';
            
            isPhotoZooming = false; 
            setBtnState('btnAdd', false);
        }, 3000); 
    } else {
        setTimeout(() => { isPhotoZooming = false; setBtnState('btnAdd', false); }, 1000);
    }
}

function triggerWind() {
    if (windTimeout) clearTimeout(windTimeout);
    setBtnState('btnWind', true);
    photoRing.classList.add('windy');
    
    let originalVol = bgm.volume;
    bgm.volume = 0.3; 
    particles.forEach(p => p.speedY *= 2);
    
    windTimeout = setTimeout(() => {
        photoRing.classList.remove('windy');
        setBtnState('btnWind', false);
        bgm.volume = originalVol;
        particles.forEach(p => { if(p.speedY < -1.6) p.speedY /= 2; });
    }, 3000);
}

function triggerLight(state) {
    isLightOff = state;
    setBtnState('btnLight', state);
    document.body.classList.toggle('lights-off', state);
    bgm.volume = state ? 0.2 : 0.6; 
}

function triggerOpenPhoto() {
    appState = 'viewing-photo';
    currentPhotoIndex = Math.floor(Math.random() * photoLibrary.length);
    bigPhotoImg.src = photoLibrary[currentPhotoIndex];
    photoOverlay.classList.add('show');
    setBtnState('btnOk', true);
    photoRing.style.animationPlayState = 'paused';
}

function switchPhoto(direction) {
    if (appState !== 'viewing-photo') return;
    const now = Date.now();
    if (now - lastSwitchTime < 800) return; 
    lastSwitchTime = now;
    currentPhotoIndex = direction === 'right' ? (currentPhotoIndex + 1) % photoLibrary.length : (currentPhotoIndex - 1 + photoLibrary.length) % photoLibrary.length;
    bigPhotoImg.style.opacity = '0';
    setTimeout(() => { bigPhotoImg.src = photoLibrary[currentPhotoIndex]; bigPhotoImg.style.opacity = '1'; }, 200);
}

function closeOverlayPhoto() {
    if (appState === 'viewing-photo') {
        appState = 'normal';
        photoOverlay.classList.remove('show');
        setBtnState('btnOk', false);
        photoRing.style.animationPlayState = 'running';
    }
}

// ================= 4. 手势引擎 =================
const videoElement = document.createElement('video');
const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });

hands.onResults((results) => {
    const now = Date.now();
    const handCount = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;

    if (handCount > 0 && !isStarted) {
        startExperience();
    }

    let twoHandsOpen = false;
    if (handCount === 2) {
        const lm1 = results.multiHandLandmarks[0];
        const lm2 = results.multiHandLandmarks[1];
        if (isHandOpen(lm1) && isHandOpen(lm2)) twoHandsOpen = true;
    }

    if (twoHandsOpen) {
        if (twoHandsStartTime === 0) twoHandsStartTime = now;
        if (now - twoHandsStartTime > 300 && !isWindLocked && (now - lastWindTime > 2000)) {
            isWindLocked = true; lastWindTime = now; triggerWind();
        }
    } else { twoHandsStartTime = 0; if (isWindLocked) isWindLocked = false; }

    if (handCount === 0) { resetContinuousStates(); return; }
    const lm = results.multiHandLandmarks[0];

    // --- 状态：查看大图模式 ---
    if (appState === 'viewing-photo') {
        if (isHandOpen(lm)) {
            const palmX = (lm[0].x + lm[9].x) / 2;
            if (window.prevPalmX) {
                const dx = palmX - window.prevPalmX;
                if (dx > 0.06) switchPhoto('right'); 
                if (dx < -0.06) switchPhoto('left'); 
            }
            window.prevPalmX = palmX;
        }
        if (isFist(lm) && !isFistLocked) { isFistLocked = true; closeOverlayPhoto(); triggerLight(true); } 
        else if (!isFist(lm)) { isFistLocked = false; }
        return; 
    }

    // --- 状态：正常模式 ---

    // 握拳 (关灯)
    if (isFist(lm)) {
        if (fistStartTime === 0) fistStartTime = now;
        if (now - fistStartTime > 1000 && !isFistLocked) {
            isFistLocked = true; setBtnState('btnPause', true); photoRing.style.animationPlayState = 'paused'; triggerLight(true);
        }
        return; 
    } else { fistStartTime = 0; if (isFistLocked) isFistLocked = false; }

    // 张开手掌 (开灯)
    if (isHandOpen(lm)) {
        setBtnState('btnPause', false);
        if (isLightOff) { triggerLight(false); photoRing.style.animationPlayState = 'running'; }
        return;
    }

    // OK 手势 (打开全景大图)
    if (isOkSign(lm) && (now - lastOkTime > 2000)) { lastOkTime = now; triggerOpenPhoto(); return; }

    // 剪刀手 (放大展示 3 秒)
    if (isScissors(lm) && (now - lastScissorsTime > 2000)) { lastScissorsTime = now; triggerTakePhoto(); return; }
});

function resetContinuousStates() {
    fistStartTime = 0; twoHandsStartTime = 0; window.prevPalmX = null;
    if (isFistLocked) isFistLocked = false; if (isWindLocked) isWindLocked = false;
}

// --- 手势判定算法 ---
function isHandOpen(lm) { return lm[8].y < lm[6].y && lm[12].y < lm[10].y && lm[16].y < lm[14].y && lm[20].y < lm[18].y; }
function isFist(lm) { return lm[8].y > lm[6].y && lm[12].y > lm[10].y && lm[16].y > lm[14].y && lm[20].y > lm[18].y; }
function isScissors(lm) { return lm[8].y < lm[6].y && lm[12].y < lm[10].y && lm[16].y > lm[14].y && lm[20].y > lm[18].y; }
function isOkSign(lm) {
    const distThumbIndex = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
    return (distThumbIndex < 0.06) && (lm[12].y < lm[10].y || lm[16].y < lm[14].y || lm[20].y < lm[18].y);
}

// 启动摄像头
const camera = new Camera(videoElement, { 
    onFrame: async () => { await hands.send({ image: videoElement }); }, 
    width: 640, height: 480 
});
camera.start().catch(err => console.warn("摄像头启动失败，请确保在 localhost 或 https 环境下运行。"));