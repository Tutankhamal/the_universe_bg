console.log("Script.js carregado e executando!");
// ... existing code ...

document.addEventListener("DOMContentLoaded", function() {
  // Configurar otimizações para dispositivos móveis
  setupMobileViewport();
  
  // Inicializar canvas do universo
  canvas = document.getElementById('universe');
  if (canvas) {
    ctx = canvas.getContext('2d');
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    lastKnownWidth = w;
    lastKnownHeight = h;
    
    // Inicializar variáveis dependentes do canvas
    mouse = { x: w/2, y: h/2, prevX: w/2, prevY: h/2 };
    time = 0;
    mouseVelocity = { x: 0, y: 0 };
    backgroundRotation = 0;
    
    // Inicializar o universo
    initAll();
    requestAnimationFrame(animate);
    
    // Adicionar event listeners do canvas
    canvas.addEventListener('mousemove', function(e) {
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      
      mouseVelocity.x = mouse.x - mouse.prevX;
      mouseVelocity.y = mouse.y - mouse.prevY;
    });
    
    canvas.addEventListener('mousedown', function (e) {
      // Prevenir múltiplos timers se já houver um clique pressionado ou se as estrelas estiverem retornando
      if (blackHoleTimer || blackHoleActive || blackHoleReturning) return;
      
      blackHoleTimer = setTimeout(() => {
        startBlackHoleEffect(e.clientX, e.clientY);
        blackHoleTimer = null; // Limpar o timer após a execução
      }, 3000);
    });
    
    canvas.addEventListener('mouseup', function () {
      stopBlackHoleEffect();
    });
    
    // Eventos de Toque para Dispositivos Móveis
    canvas.addEventListener('touchstart', function (e) {
      // Prevenir múltiplos timers ou se o buraco negro já estiver ativo ou se as estrelas estiverem retornando
      if (blackHoleTimer || blackHoleActive || blackHoleReturning) return;
    
      // Usar o primeiro ponto de toque
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        blackHoleTimer = setTimeout(() => {
          startBlackHoleEffect(touch.clientX, touch.clientY);
          blackHoleTimer = null; // Limpar o timer após a execução
        }, 3000);
      }
    }, { passive: false });
    
    canvas.addEventListener('touchend', function (e) {
      stopBlackHoleEffect();
    });
    
    canvas.addEventListener('touchcancel', function (e) {
      stopBlackHoleEffect();
    });
  } else {
    console.error('Canvas element with id "universe" not found!');
  }
  


});


// Background Universe //

// Detectar dispositivo móvel primeiro
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Variáveis do canvas (serão inicializadas no DOMContentLoaded)
let canvas, ctx, w, h;
let lastKnownWidth, lastKnownHeight;
let resizeTimeout;

// Variáveis para otimização de viewport móvel
let initialViewportHeight = window.innerHeight;
let isViewportStable = true;
let viewportStabilityTimeout;
let lastResizeTime = 0;
const RESIZE_DEBOUNCE_DELAY = isMobile ? 150 : 50;
const MOBILE_HEIGHT_THRESHOLD = 100; // Threshold para mudanças significativas de altura

// Função para detectar e configurar viewport móvel
function setupMobileViewport() {
  if (isMobile) {
    // Armazenar altura inicial para referência
    initialViewportHeight = window.innerHeight;
    
    // Configurar meta viewport para prevenir zoom
    let viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }
    
    // Adicionar classe CSS para otimizações específicas
    document.body.classList.add('mobile-optimized');
    
    console.log(`Viewport móvel configurado: ${initialViewportHeight}px`);
  }
}

// Variáveis de performance e FPS
let lastFrameTime = 0;
const targetFPS = isMobile ? 30 : 60; // 30 FPS para mobile, 60 para desktop
const frameInterval = 1000 / targetFPS;

// Variáveis que dependem das dimensões do canvas (inicializadas no DOMContentLoaded)
let mouse, time, mouseVelocity, backgroundRotation;

// === VARIÁVEIS DO FOGUETE ===
const rocketImg = new Image();
rocketImg.src = 'assets/images/rocket_sprite.png';
let rockets = [];

// Variáveis globais para o efeito do buraco negro
let blackHoleActive = false;
let blackHoleCenter = { x: 0, y: 0 };
let blackHoleTimer = null;
let blackHoleStarData = [];
let blackHoleReturning = false;

const ACCRETION_MIN_RADIUS = 60;
const ACCRETION_MAX_RADIUS = 120;
const ATTRACT_SPEED = 0.035; // velocidade de atração (mais lento)
const RETURN_SPEED = 0.035;  // velocidade de retorno (mais lento)

// Variável global para supernova do buraco negro
let blackHoleSupernova = null;
let blackHoleSupernovaActive = false;

function startBlackHoleEffect(clientX, clientY) {
    blackHoleActive = true;
    blackHoleReturning = false;
    const rect = canvas.getBoundingClientRect();
    blackHoleCenter.x = (clientX - rect.left) * (canvas.width / rect.width);
    blackHoleCenter.y = (clientY - rect.top) * (canvas.height / rect.height);
    blackHoleStarData = [];
    for (let i = 0; i < stars.length; i++) {
        if (!stars[i].destroyed) {
            blackHoleStarData.push({
                star: stars[i],
                originalX: stars[i].x,
                originalY: stars[i].y,
                state: 'toDisk',
                currentRadius: null,
                targetRadius: Math.random() * 80 + 40,
                angle: Math.random() * Math.PI * 2,
                angularSpeed: (Math.random() - 0.5) * 0.02
            });
        }
    }
    // Cria supernova central e ativa
    blackHoleSupernova = {
        x: blackHoleCenter.x,
        y: blackHoleCenter.y,
        radius: 0, // começa em 0 para efeito de zoom in
        maxRadius: 80,
        expandSpeed: 2.5, // ajuste conforme desejado
        contractSpeed: 2.5,
        phase: 'expand',
        opacity: 0, // começa em 0 para fade in
        maxOpacity: 0.7, // ajuste conforme desejado
        color: { r: 255, g: 220, b: 80 }
    };
    blackHoleSupernovaActive = true;
}

// Função para encerrar o ápice da supernova ao soltar o mouse
function stopBlackHoleEffect() {
    if (blackHoleTimer) {
        clearTimeout(blackHoleTimer);
        blackHoleTimer = null;
    }
    if (blackHoleActive && !blackHoleReturning) {
        blackHoleReturning = true;
        blackHoleStarData.forEach(data => {
            data.state = 'returning';
        });
        blackHoleSupernovaActive = false;
    }
}

// Canvas event listeners will be added after canvas initialization

// Função otimizada para redimensionamento inteligente
function handleResize() {
  const now = Date.now();
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;
  
  if (isMobile) {
    // Detectar se é uma mudança real de orientação/tamanho ou apenas barra de endereços
    const widthChanged = newWidth !== lastKnownWidth;
    const heightDifference = Math.abs(newHeight - lastKnownHeight);
    const significantHeightChange = heightDifference > MOBILE_HEIGHT_THRESHOLD;
    
    // Marcar viewport como instável durante mudanças
    isViewportStable = false;
    clearTimeout(viewportStabilityTimeout);
    
    // Só redimensionar se for uma mudança significativa
    if (widthChanged || significantHeightChange) {
      // Throttle para evitar muitas execuções
      if (now - lastResizeTime > RESIZE_DEBOUNCE_DELAY) {
        console.log(`Redimensionamento significativo: ${widthChanged ? 'largura' : 'altura'} (${heightDifference}px)`);
        
        // Atualizar dimensões do canvas
        w = canvas.width = newWidth;
        h = canvas.height = newHeight;
        lastKnownWidth = newWidth;
        lastKnownHeight = newHeight;
        lastResizeTime = now;
        
        // Reinicializar apenas se necessário
        initAll();
      }
    } else {
      // Para mudanças pequenas (barra de endereços), apenas ajustar altura do canvas
      // sem reinicializar todo o conteúdo
      if (canvas.height !== newHeight) {
        canvas.height = newHeight;
        h = newHeight;
      }
    }
    
    // Marcar viewport como estável após um período sem mudanças
    viewportStabilityTimeout = setTimeout(() => {
      isViewportStable = true;
      console.log('Viewport estabilizado');
    }, 500);
    
  } else {
    // Desktop: comportamento padrão mais simples
    if (now - lastResizeTime > 50) { // Throttle básico para desktop
      w = canvas.width = newWidth;
      h = canvas.height = newHeight;
      lastKnownWidth = newWidth;
      lastKnownHeight = newHeight;
      lastResizeTime = now;
      initAll();
    }
  }
}

// Event listener otimizado com throttling
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(handleResize, isMobile ? RESIZE_DEBOUNCE_DELAY : 16);
});

// Mousemove event listener will be added after canvas initialization

// === SISTEMA DE ELEMENTOS ===
let stars = [];
let cosmicDust = [];
let meteors = [];
let comets = [];
let explosions = [];
let supernovaTimer = 0;
let supernovas = [];
let nebulae = [];
let spacecrafts = [];
let iss = null;
let issCooldown = 0; // Cooldown em frames. Inicia em 0 para a primeira aparição ser possível.
const ISS_COOLDOWN_DURATION = 10800; // 3 minutos a 60fps (180 segundos * 60 fps)
const ISS_FADE_DURATION = 200; // Duração do fade-in/out em frames (aprox 3.3s a 60fps)

function initAll() {
  initStarField();
  initCosmicDust();
  initNebulae();
  supernovaTimer = Math.random() * 1000 + 500;
}

// === CAMPO DE ESTRELAS DISTRIBUÍDO ===
// Modifique a função initStarField:
function initStarField() {
  stars = [];
  // Ajuste a quantidade de estrelas com base no dispositivo
  let totalStarsToCreate = isMobile ? 200 : 800; // 200 para mobile, 800 para desktop
  
  // A lógica de distribuição por camadas pode ser mantida ou simplificada.
  // Se simplificar, apenas crie 'totalStarsToCreate' estrelas com propriedades variadas.
  // Exemplo de criação direta (simplificado):
  for (let i = 0; i < totalStarsToCreate; i++) {
    const layer = Math.ceil(Math.random() * 5); // Distribui aleatoriamente em 5 camadas
    const x = Math.random() * w;
    const y = Math.random() * h;
    stars.push({
      x: x,
      y: y,
      originalX: x,
      originalY: y,
      size: (Math.random() * 1.2 + 0.3) * (layer * 0.2),
      brightness: Math.random() * 0.8 + 0.2,
      color: getStarColor(),
      layer: layer,
      speed: layer * 0.05,
      twinkle: isMobile ? 0 : Math.random() * Math.PI * 2, // Desabilita twinkle em mobile
      twinkleSpeed: isMobile ? 0 : Math.random() * 0.01 + 0.002, // Desabilita twinkle em mobile
      temperature: Math.random() * 10000 + 3000,
      destroyed: false,
      localCenterX: x + (Math.random() - 0.5) * 100,
      localCenterY: y + (Math.random() - 0.5) * 100,
      orbitRadius: isMobile ? 0 : Math.random() * 20 + 5, // Desabilita órbita local em mobile
      orbitAngle: Math.random() * Math.PI * 2,
      orbitSpeed: (Math.random() * 0.0005 + 0.0001) * (6 - layer)
    });
  }
}

function getStarColor() {
  const temp = Math.random() * 10000 + 3000;
  if (temp < 3700) return { r: 255, g: 180, b: 120, temp };
  if (temp < 5200) return { r: 255, g: 220, b: 180, temp };
  if (temp < 6000) return { r: 255, g: 255, b: 220, temp };
  if (temp < 7500) return { r: 255, g: 255, b: 255, temp };
  return { r: 180, g: 200, b: 255, temp };
}

// === POEIRA CÓSMICA MAIS DINÂMICA ===
function initCosmicDust() {
  cosmicDust = [];
  const dustCount = isMobile ? 100 : 400; // 100 para mobile, 400 para desktop
  for (let i = 0; i < dustCount; i++) {
    cosmicDust.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 0.8 + 0.2,
      opacity: Math.random() * 0.2 + 0.05,
      velocity: {
        x: (Math.random() - 0.5) * 0.4,
        y: (Math.random() - 0.5) * 0.3
      },
      color: { r: 200, g: 180, b: 255 },
      life: Math.random() * 1000 + 500,
      maxLife: 0,
      angle: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.001
    });
  }
  cosmicDust.forEach(dust => dust.maxLife = dust.life);
}

// === NEBULOSAS DINÂMICAS ===
function initNebulae() {
  nebulae = [];
  const nebulaCount = 4;
  
  for (let i = 0; i < nebulaCount; i++) {
    nebulae.push({
      x: w * (0.2 + Math.random() * 0.6),
      y: h * (0.2 + Math.random() * 0.6),
      radius: Math.random() * 10 + 10,
      hue: Math.random() * 360,
      opacity: Math.random() * 0.01 + 0.1,
      speed: {
        x: (Math.random() - 0.5) * 0.2,
        y: (Math.random() - 0.5) * 0.2
      },
      pulseSpeed: Math.random() * 0.001 + 0.0005,
      pulsePhase: Math.random() * Math.PI * 2
    });
  }
}

// === ESPAÇONAVES SUTIS ===
function createSpacecraft() {
  if (isMobile) return; // Desabilita naves em mobile
  // Chance muito baixa de criar espaçonave
  if (Math.random() < 0.003) {
    const side = Math.floor(Math.random() * 4);
    let startX, startY, targetX, targetY;
    
    switch(side) {
      case 0: // top -> bottom
        startX = Math.random() * w;
        startY = -30;
        targetX = Math.random() * w;
        targetY = h + 30;
        break;
      case 1: // right -> left
        startX = w + 30;
        startY = Math.random() * h;
        targetX = -30;
        targetY = Math.random() * h;
        break;
      case 2: // bottom -> top
        startX = Math.random() * w;
        startY = h + 30;
        targetX = Math.random() * w;
        targetY = -30;
        break;
      case 3: // left -> right
        startX = -30;
        startY = Math.random() * h;
        targetX = w + 30;
        targetY = Math.random() * h;
        break;
    }
    
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = Math.random() * 0.8 + 0.3; // Velocidade bem lenta
    
    const spacecraftTypes = ['fighter', 'cargo', 'probe'];
    const type = spacecraftTypes[Math.floor(Math.random() * spacecraftTypes.length)];
    
    spacecrafts.push({
      x: startX,
      y: startY,
      velocity: {
        x: (dx / distance) * speed,
        y: (dy / distance) * speed
      },
      type: type,
      size: Math.random() * 12 + 8, // Bem pequeno
      angle: Math.atan2(dy, dx),
      lights: [
        { offset: { x: 0, y: 0 }, color: 'red', phase: Math.random() * Math.PI * 2 },
        { offset: { x: 2, y: 1 }, color: 'green', phase: Math.random() * Math.PI * 2 },
        { offset: { x: 2, y: -1 }, color: 'blue', phase: Math.random() * Math.PI * 2 }
      ],
      opacity: 0,
      fadePhase: 'fadein',
      fadeTimer: 0,
      fadeDuration: 120, // Fade longo
      life: Math.random() * 1200 + 800
    });
  }
}

// === ISS (ESTAÇÃO ESPACIAL INTERNACIONAL) ===
const issImg = new Image();
issImg.src = 'assets/images/iss_sprite.png';

function createNewISSInstance() {
  const side = Math.floor(Math.random() * 4);
  let startX, startY, targetX, targetY;
  const margin = 50; // Margem para garantir que a ISS comece fora da tela

  switch(side) {
    case 0: startX = Math.random() * w; startY = -margin; targetX = Math.random() * w; targetY = h + margin; break;
    case 1: startX = w + margin; startY = Math.random() * h; targetX = -margin; targetY = Math.random() * h; break;
    case 2: startX = Math.random() * w; startY = h + margin; targetX = Math.random() * w; targetY = -margin; break;
    case 3: startX = -margin; startY = Math.random() * h; targetX = w + margin; targetY = Math.random() * h; break;
  }
  const dx = targetX - startX;
  const dy = targetY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const speed = 0.4;
  const baseWidth = 100, baseHeight = 63;
  const scale = 0.45;
  
  return {
    x: startX,
    y: startY,
    velocity: {
      x: (dx / distance) * speed,
      y: (dy / distance) * speed
    },
    width: baseWidth * scale,
    height: baseHeight * scale,
    angle: Math.atan2(dy, dx),
    rotation: 0,
    opacity: 0,
    fadePhase: 'fadein',
    fadeTimer: 0,
    fadeDuration: ISS_FADE_DURATION
  };
}

// === METEOROS E COMETAS ATRAVESSANDO A TELA ===
function createRocket() {
  if (rockets.length >= 2) return;
  if (Math.random() < 0.002) {
    const side = Math.floor(Math.random() * 4);
    let startX, startY, targetX, targetY;
    switch(side) {
      case 0: startX = Math.random() * w; startY = -40; targetX = Math.random() * w; targetY = h + 40; break;
      case 1: startX = w + 40; startY = Math.random() * h; targetX = -40; targetY = Math.random() * h; break;
      case 2: startX = Math.random() * w; startY = h + 40; targetX = Math.random() * w; targetY = -40; break;
      case 3: startX = -40; startY = Math.random() * h; targetX = w + 40; targetY = Math.random() * h; break;
    }
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = Math.random() * 0.7 + 0.4;
    const baseWidth = 32; // ajuste conforme o sprite
    const baseHeight = 96; // ajuste conforme o sprite
    const scale = Math.random() * 0.15 + 0.15;
    rockets.push({
      x: startX,
      y: startY,
      velocity: { x: (dx / distance) * speed, y: (dy / distance) * speed },
      size: Math.random() * 16 + 18,
      angle: Math.atan2(dy, dx),
      opacity: 0,
      fadePhase: 'fadein',
      fadeTimer: 0,
      fadeDuration: 100,
      life: Math.random() * 2400 + 1600,
      width: baseWidth * scale,
      height: baseHeight * scale
    });
  }
}

function drawRockets() {
  createRocket();
  for (let i = rockets.length - 1; i >= 0; i--) {
    const rocket = rockets[i];
    rocket.fadeTimer++;
    switch(rocket.fadePhase) {
      case 'fadein':
        rocket.opacity = Math.min(1, rocket.fadeTimer / rocket.fadeDuration);
        if (rocket.fadeTimer >= rocket.fadeDuration) { rocket.fadePhase = 'active'; rocket.fadeTimer = 0; }
        break;
      case 'active':
        rocket.opacity = 1;
        rocket.life--;
        if (rocket.life < 100 || rocket.x < -100 || rocket.x > w + 100 || rocket.y < -100 || rocket.y > h + 100) {
          rocket.fadePhase = 'fadeout'; rocket.fadeTimer = 0;
        }
        break;
      case 'fadeout':
        rocket.opacity = Math.max(0, 1 - (rocket.fadeTimer / rocket.fadeDuration));
        if (rocket.opacity <= 0) { rockets.splice(i, 1); continue; }
        break;
    }
    rocket.x += rocket.velocity.x;
    rocket.y += rocket.velocity.y;
    rocket.angle = Math.atan2(rocket.velocity.y, rocket.velocity.x);
    ctx.save();
    ctx.translate(rocket.x, rocket.y);
    ctx.rotate(rocket.angle + Math.PI/2);
    ctx.globalAlpha = rocket.opacity;
    ctx.drawImage(rocketImg, -rocket.width/2, -rocket.height/2, rocket.width, rocket.height);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function createMeteor() {
  if (isMobile) return; // Desabilita meteoros em mobile
  if (Math.random() < 0.001) {
    const side = Math.floor(Math.random() * 4);
    let startX, startY, targetX, targetY;
    
    switch(side) {
      case 0: // top -> bottom
        startX = Math.random() * w;
        startY = -50;
        targetX = Math.random() * w;
        targetY = h + 50;
        break;
      case 1: // right -> left
        startX = w + 50;
        startY = Math.random() * h;
        targetX = -50;
        targetY = Math.random() * h;
        break;
      case 2: // bottom -> top
        startX = Math.random() * w;
        startY = h + 50;
        targetX = Math.random() * w;
        targetY = -50;
        break;
      case 3: // left -> right
        startX = -50;
        startY = Math.random() * h;
        targetX = w + 50;
        targetY = Math.random() * h;
        break;
    }
    
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = Math.random() * 1.2 + 0.8;
    
    meteors.push({
      x: startX,
      y: startY,
      velocity: {
        x: (dx / distance) * speed,
        y: (dy / distance) * speed
      },
      size: Math.random() * 1 + 1,
      trail: [],
      color: {
        r: 255,
        g: Math.floor(Math.random() * 100) + 155,
        b: Math.floor(Math.random() * 50) + 100
      },
      life: Math.random() * 800 + 600,
      maxLife: 0,
      fadePhase: 'fadein',
      fadeTimer: 0,
      fadeDuration: 60,
      opacity: 0,
      destroyed: false,
      crossingScreen: true
    });
    
    meteors[meteors.length - 1].maxLife = meteors[meteors.length - 1].life;
  }
}

function createComet() {
  if (Math.random() < 0.002) {
    const side = Math.floor(Math.random() * 4);
    let startX, startY, targetX, targetY;
    
    switch(side) {
      case 0: // top -> bottom
        startX = Math.random() * w;
        startY = -80;
        targetX = Math.random() * w;
        targetY = h + 80;
        break;
      case 1: // right -> left
        startX = w + 80;
        startY = Math.random() * h;
        targetX = -80;
        targetY = Math.random() * h;
        break;
      case 2: // bottom -> top
        startX = Math.random() * w;
        startY = h + 80;
        targetX = Math.random() * w;
        targetY = -80;
        break;
      case 3: // left -> right
        startX = -80;
        startY = Math.random() * h;
        targetX = w + 80;
        targetY = Math.random() * h;
        break;
    }
    
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = Math.random() * 1.0 + 0.5;
    
    comets.push({
      x: startX,
      y: startY,
      velocity: {
        x: (dx / distance) * speed,
        y: (dy / distance) * speed
      },
      size: Math.random() * 1 + 2,
      trail: [],
      trailLength: Math.floor(Math.random() * 60) + 70,
      color: {
        r: Math.floor(Math.random() * 55) + 200,
        g: Math.floor(Math.random() * 55) + 200,
        b: Math.floor(Math.random() * 100) + 155
      },
      life: Math.random() * 1000 + 800,
      maxLife: 0,
      fadePhase: 'fadein',
      fadeTimer: 0,
      fadeDuration: 80,
      opacity: 0,
      destroyed: false,
      crossingScreen: true
    });
    
    comets[comets.length - 1].maxLife = comets[comets.length - 1].life;
  }
}

// === SISTEMA DE EXPLOSÕES SUTIS ===
function createSubtleExplosion(x, y, size, color) {
  explosions.push({
    x: x,
    y: y,
    particles: [],
    life: 40,
    maxLife: 40
  });
  
  const explosion = explosions[explosions.length - 1];
  const particleCount = Math.floor(size) + 4;
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
    const speed = Math.random() * 2 + 1;
    
    explosion.particles.push({
      x: x,
      y: y,
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      },
      size: Math.random() * 2 + 0.5,
      color: {
        r: Math.min(255, color.r + (Math.random() - 0.5) * 50),
        g: Math.min(255, color.g + (Math.random() - 0.5) * 50),
        b: Math.min(255, color.b + (Math.random() - 0.5) * 50)
      },
      life: Math.random() * 20 + 15,
      maxLife: 0
    });
    
    explosion.particles[i].maxLife = explosion.particles[i].life;
  }
}

// === SISTEMA DE COLISÕES REDUZIDO ===
function checkCollisions() {
  // Colisão com ISS
  if (iss && iss.fadePhase === 'active') {
    for (const arr of [meteors, comets, rockets]) {
      for (let i = arr.length - 1; i >= 0; i--) {
        const obj = arr[i];
        const dx = obj.x - iss.x;
        const dy = obj.y - iss.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < (obj.size || Math.max(obj.width||0, obj.height||0)/2) + Math.max(iss.width, iss.height)/2) {
          createSubtleExplosion(iss.x, iss.y, Math.max(iss.width, iss.height), {r:200,g:200,b:255});
          iss.fadePhase = 'fadeout';
          obj.fadePhase = 'fadeout';
        }
      }
    }
  }
  // Colisão com foguetes
  for (let r = rockets.length - 1; r >= 0; r--) {
    const rocket = rockets[r];
    if (rocket.fadePhase !== 'active') continue;
    for (const arr of [meteors, comets]) {
      for (let i = arr.length - 1; i >= 0; i--) {
        const obj = arr[i];
        const dx = obj.x - rocket.x;
        const dy = obj.y - rocket.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < obj.size + rocket.size/2) {
          createSubtleExplosion(rocket.x, rocket.y, rocket.size, {r:255,g:180,b:120});
          rocket.fadePhase = 'fadeout';
          obj.fadePhase = 'fadeout';
        }
      }
    }
  }
  // Colisão com espaçonaves
  for (let s = spacecrafts.length - 1; s >= 0; s--) {
    const craft = spacecrafts[s];
    if (craft.fadePhase !== 'active') continue;
    for (const arr of [meteors, comets]) {
      for (let i = arr.length - 1; i >= 0; i--) {
        const obj = arr[i];
        const dx = obj.x - craft.x;
        const dy = obj.y - craft.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < obj.size + craft.size/2) {
          createSubtleExplosion(craft.x, craft.y, craft.size, {r:60,g:60,b:80});
          craft.fadePhase = 'fadeout';
          obj.fadePhase = 'fadeout';
        }
      }
    }
  }
  // Verificar colisões apenas para cometas (com chance muito reduzida)
  for (let i = comets.length - 1; i >= 0; i--) {
    const comet = comets[i];
    if (comet.destroyed || comet.fadePhase === 'fadein') continue;
    if (Math.random() > 0.5) continue; // Apenas 5% de chance
    for (let j = stars.length - 1; j >= 0; j--) {
      const star = stars[j];
      if (star.destroyed) continue;
      const dx = comet.x - star.x;
      const dy = comet.y - star.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const collisionDistance = comet.size + star.size + 3;
      if (distance < collisionDistance) {
        const explosionX = (comet.x + star.x) / 2;
        const explosionY = (comet.y + star.y) / 2;
        createSubtleExplosion(explosionX, explosionY, (comet.size + star.size) / 2, {
          r: (comet.color.r + star.color.r) / 2,
          g: (comet.color.g + star.color.g) / 2,
          b: (comet.color.b + star.color.b) / 2
        });
        star.destroyed = true;
        setTimeout(() => {
          if (j < stars.length) {
            const newX = Math.random() * w;
            const newY = Math.random() * h;
            stars[j] = {
              x: newX,
              y: newY,
              originalX: newX,
              originalY: newY,
              size: (Math.random() * 1.2 + 0.3) * (star.layer * 0.2),
              brightness: Math.random() * 0.8 + 0.2,
              color: getStarColor(),
              layer: star.layer,
              speed: star.layer * 0.05,
              twinkle: Math.random() * Math.PI * 2,
              twinkleSpeed: Math.random() * 0.01 + 0.002,
              temperature: Math.random() * 10000 + 3000,
              destroyed: false,
              localCenterX: newX + (Math.random() - 0.5) * 100,
              localCenterY: newY + (Math.random() - 0.5) * 100,
              orbitRadius: Math.random() * 20 + 5,
              orbitAngle: Math.random() * Math.PI * 2,
              orbitSpeed: (Math.random() * 0.0005 + 0.0001) * (6 - star.layer)
            };
          }
        }, Math.random() * 3000 + 2000);
        break;
      }
    }
  }
}

// === SUPERNOVAS RARAS ===
function checkSupernova() {
  supernovaTimer--;
  
  if (supernovaTimer <= 0) {
    supernovas.push({
      x: Math.random() * w,
      y: Math.random() * h,
      radius: 0,
      maxRadius: Math.random() * 50 + 25,
      expandSpeed: 0.5,
      contractSpeed: 0.2,
      phase: 'expand',
      peakDuration: 30,
      peakTimer: 0,
      opacity: 0,
      maxOpacity: Math.random() * 0.4 + 0.2,
      color: {
        r: 255,
        g: Math.floor(Math.random() * 100) + 150,
        b: Math.floor(Math.random() * 50)
      }
    });
    
    supernovaTimer = Math.random() * 2000 + 1000;
  }
}

// === EFEITOS SUTIS DE MOUSE ===
// Função applySubtleMouseEffects MODIFICADA
function applySubtleMouseEffects(object) {
  if (object.destroyed) return;
  // A verificação de blackHoleActive e blackHoleStarData.length > 0 ainda é necessária aqui
  if (blackHoleActive && blackHoleStarData.length > 0) { 
    const data = blackHoleStarData.find(d => d.star === object);
    if (data) {
      if (data.state === 'toDisk') {
        const dx = data.star.x - blackHoleCenter.x;
        const dy = data.star.y - blackHoleCenter.y;
        let currentRadius = Math.sqrt(dx * dx + dy * dy);
        if (data.currentRadius === null) data.currentRadius = currentRadius;
        data.currentRadius += (data.targetRadius - data.currentRadius) * ATTRACT_SPEED;
        data.angle += data.angularSpeed;
        data.star.x = blackHoleCenter.x + data.currentRadius * Math.cos(data.angle);
        data.star.y = blackHoleCenter.y + data.currentRadius * Math.sin(data.angle);
        if (Math.abs(data.currentRadius - data.targetRadius) < 1.5) {
          data.state = 'inDisk';
        }
      } else if (data.state === 'inDisk') {
        data.angle += data.angularSpeed;
        data.star.x = blackHoleCenter.x + data.targetRadius * Math.cos(data.angle);
        data.star.y = blackHoleCenter.y + data.targetRadius * Math.sin(data.angle);
      } else if (data.state === 'returning') {
        data.star.x += (data.originalX - data.star.x) * RETURN_SPEED;
        data.star.y += (data.originalY - data.star.y) * RETURN_SPEED;
        if (Math.abs(data.star.x - data.originalX) < 1.5 && Math.abs(data.star.y - data.originalY) < 1.5) {
          data.star.x = data.originalX;
          data.star.y = data.originalY;
          data.state = 'done';
        }
      }
      // O bloco que estava aqui (if blackHoleReturning && blackHoleStarData.every...) FOI REMOVIDO
      return; // Retorna se esta estrela foi processada pelo buraco negro
    }
  }
  object.orbitAngle += object.orbitSpeed;
  const orbitX = Math.cos(object.orbitAngle) * object.orbitRadius;
  const orbitY = Math.sin(object.orbitAngle) * object.orbitRadius;
  object.originalX = object.localCenterX + orbitX;
  object.originalY = object.localCenterY + orbitY;
  if (object.originalX < 0) object.localCenterX += w;
  if (object.originalX > w) object.localCenterX -= w;
  if (object.originalY < 0) object.localCenterY += h;
  if (object.originalY > h) object.localCenterY -= h;
  const dx = object.x - mouse.x;
  const dy = object.y - mouse.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const maxDistance = 200;
  if (distance < maxDistance && distance > 0) {
    const force = (maxDistance - distance) / maxDistance;
    const effectStrength = force * force * 20;
    const angle = Math.atan2(dy, dx);
    object.x = object.originalX + Math.cos(angle) * effectStrength;
    object.y = object.originalY + Math.sin(angle) * effectStrength;
  } else {
    object.x += (object.originalX - object.x) * 0.02;
    object.y += (object.originalY - object.y) * 0.02;
  }
}

// === RENDERIZAÇÃO ===
function drawBackground() {
  backgroundRotation += 0.0001;
  
  const bgGradient = ctx.createRadialGradient(
    w/2, h/2, 0,
    w/2, h/2, Math.max(w, h)
  );
  bgGradient.addColorStop(0, 'rgb(3, 1, 7)');
  bgGradient.addColorStop(0.5, 'rgb(0, 0, 0)');
  bgGradient.addColorStop(1, 'rgb(0, 0, 0)');
  
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, w, h);
}

function drawNebulae() {
  for (let i = 0; i < nebulae.length; i++) {
    const nebula = nebulae[i];
    
    nebula.x += nebula.speed.x;
    nebula.y += nebula.speed.y;
    
    if (nebula.x < -nebula.radius || nebula.x > w + nebula.radius) {
      nebula.speed.x *= -1;
    }
    if (nebula.y < -nebula.radius || nebula.y > h + nebula.radius) {
      nebula.speed.y *= -1;
    }
    
    const pulseScale = Math.sin(time * nebula.pulseSpeed + nebula.pulsePhase) * 0.2 + 1;
    const currentRadius = nebula.radius * pulseScale;
    
    const nebulaGradient = ctx.createRadialGradient(
      nebula.x, nebula.y, 0,
      nebula.x, nebula.y, currentRadius
    );
    
    const hueShift = Math.sin(time * 0.0005) * 20;
    const currentHue = (nebula.hue + hueShift) % 360;
    
    nebulaGradient.addColorStop(0, `hsla(${currentHue}, 70%, 40%, ${nebula.opacity * 1.5})`);
    nebulaGradient.addColorStop(0.5, `hsla(${currentHue + 30}, 60%, 30%, ${nebula.opacity})`);
    nebulaGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = nebulaGradient;
    ctx.beginPath();
    ctx.arc(nebula.x, nebula.y, currentRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStars() {
  for (let star of stars) {
    if (star.destroyed) continue;
    
    applySubtleMouseEffects(star);
    
    star.twinkle += star.twinkleSpeed;
    
    const twinkle = Math.sin(star.twinkle) * 0.3 + 0.7;
    const brightness = star.brightness * twinkle;
    
    const parallaxX = mouseVelocity.x * star.layer * 0.00;
    const parallaxY = mouseVelocity.y * star.layer * 0.00;
    
    if (star.size > 1) {
      ctx.shadowColor = `rgba(${star.color.r}, ${star.color.g}, ${star.color.b}, 0.5)`;
      ctx.shadowBlur = star.size * 2;
    }
    
    ctx.beginPath();
    ctx.fillStyle = `rgba(${star.color.r}, ${star.color.g}, ${star.color.b}, ${brightness})`;
    ctx.arc(star.x + parallaxX, star.y + parallaxY, star.size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0; // ✅ Ótimo! Isso já está aqui.
  }
}

function drawCosmicDust() {
  for (let i = cosmicDust.length - 1; i >= 0; i--) {
    const dust = cosmicDust[i];
    
    dust.angle += dust.rotationSpeed;
    
    const circularX = Math.cos(dust.angle) * 0.2;
    const circularY = Math.sin(dust.angle) * 0.2;
    
    dust.x += dust.velocity.x + circularX;
    dust.y += dust.velocity.y + circularY;
    dust.life--;
    
    const dx = dust.x - mouse.x;
    const dy = dust.y - mouse.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 100) {
      const force = (100 - distance) / 100;
      dust.velocity.x += (dx / distance) * force * 0.05;
      dust.velocity.y += (dy / distance) * force * 0.05;
    }
    
    const lifeRatio = dust.life / dust.maxLife;
    const opacity = dust.opacity * lifeRatio;
    
    ctx.beginPath();
    ctx.fillStyle = `rgba(${dust.color.r}, ${dust.color.g}, ${dust.color.b}, ${opacity})`;
    ctx.arc(dust.x, dust.y, dust.size, 0, Math.PI * 2);
    ctx.fill();
    
    if (dust.life <= 0 || dust.x < -50 || dust.x > w + 50 || dust.y < -50 || dust.y > h + 50) {
      cosmicDust.splice(i, 1);
      cosmicDust.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 0.8 + 0.2,
        opacity: Math.random() * 0.2 + 0.05,
        velocity: {
          x: (Math.random() - 0.5) * 0.4,
          y: (Math.random() - 0.5) * 0.3
        },
        color: { r: 200, g: 180, b: 255 },
        life: Math.random() * 1000 + 500,
        maxLife: 0,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.001
      });
      cosmicDust[cosmicDust.length - 1].maxLife = cosmicDust[cosmicDust.length - 1].life;
    }
  }
}

function drawSpacecrafts() {
  createSpacecraft();
  
  for (let i = spacecrafts.length - 1; i >= 0; i--) {
    const craft = spacecrafts[i];
    
    // Gerenciar fases de fade
    craft.fadeTimer++;
    
    switch(craft.fadePhase) {
      case 'fadein':
        craft.opacity = Math.min(0.7, craft.fadeTimer / craft.fadeDuration); // Opacidade máxima reduzida
        if (craft.fadeTimer >= craft.fadeDuration) {
          craft.fadePhase = 'active';
          craft.fadeTimer = 0;
        }
        break;
        
      case 'active':
        craft.opacity = 0.7;
        craft.life--;
        
        if (craft.life < 100 || 
            craft.x < -100 || craft.x > w + 100 || 
            craft.y < -100 || craft.y > h + 100) {
          craft.fadePhase = 'fadeout';
          craft.fadeTimer = 0;
        }
        break;
        
      case 'fadeout':
        craft.opacity = Math.max(0, 0.7 - (craft.fadeTimer / craft.fadeDuration));
        if (craft.opacity <= 0) {
          spacecrafts.splice(i, 1);
          continue;
        }
        break;
    }
    
    craft.x += craft.velocity.x;
    craft.y += craft.velocity.y;
    
    // Desenhar corpo da espaçonave (muito sutil)
    ctx.save();
    ctx.translate(craft.x, craft.y);
    ctx.rotate(craft.angle);
    
    ctx.fillStyle = `rgba(60, 60, 80, ${craft.opacity * 0.9})`;
    
    switch(craft.type) {
      case 'fighter':
        // Triângulo pequeno
        ctx.beginPath();
        ctx.moveTo(craft.size, 0);
        ctx.lineTo(-craft.size/2, -craft.size/3);
        ctx.lineTo(-craft.size/2, craft.size/3);
        ctx.closePath();
        ctx.fill();
        break;
        
      case 'cargo':
        // Retângulo pequeno
        ctx.fillRect(-craft.size/2, -craft.size/4, craft.size, craft.size/2);
        break;
        
      case 'probe':
        // Círculo pequeno
        ctx.beginPath();
        ctx.arc(0, 0, craft.size/2, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    
    // Desenhar luzes piscando
    for (let light of craft.lights) {
      const lightOpacity = (Math.sin(time * 0.05 + light.phase) + 1) * 0.5;
      const lightX = light.offset.x;
      const lightY = light.offset.y;
      
      ctx.fillStyle = `rgba(${light.color === 'red' ? '255,100,100' : 
                              light.color === 'green' ? '100,255,100' : 
                              light.color === 'blue' ? '100,100,255' : '255,255,255'}, ${lightOpacity * craft.opacity * 0.8})`;
      
      ctx.beginPath();
      ctx.arc(lightX, lightY, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}

function drawISS() {
  // 1. Gerenciar Cooldown e Criação da ISS
  if (!iss) { // Se não há ISS ativa
    if (issCooldown > 0) {
      issCooldown--;
    } else {
      // Cooldown terminou, criar uma nova ISS
      iss = createNewISSInstance();
    }
  }

  // 2. Processar e Desenhar a ISS se ela existir
  if (iss) {
    // Atualizar temporizador de fade
    iss.fadeTimer++;

    // Lógica de Fade In/Out e Ativação
    if (iss.fadePhase === 'fadein') {
      iss.opacity = Math.min(0.8, iss.fadeTimer / iss.fadeDuration);
      if (iss.fadeTimer >= iss.fadeDuration) {
        iss.fadePhase = 'active';
        iss.fadeTimer = 0; // Resetar timer para possível uso futuro (ex: fadeout)
      }
    } else if (iss.fadePhase === 'active') {
      iss.opacity = 0.8; // Manter opacidade total enquanto ativa
    } else if (iss.fadePhase === 'fadeout') {
      iss.opacity = Math.max(0, 0.8 - (iss.fadeTimer / iss.fadeDuration));
      if (iss.opacity <= 0) {
        createSubtleExplosion(iss.x, iss.y, Math.max(iss.width, iss.height), {r:200,g:200,b:255});
        iss = null; // Remover ISS
        issCooldown = ISS_COOLDOWN_DURATION; // Iniciar cooldown para a próxima
        return; // Sair da função para não processar mais esta ISS removida
      }
    }

    // Mover a ISS
    iss.x += iss.velocity.x;
    iss.y += iss.velocity.y;
    iss.rotation += 0.002;

    // 3. Verificar se a ISS saiu completamente do Viewport para iniciar o fade-out
    // Condição para sair: estar completamente fora dos limites (x, y, w, h)
    // Usamos as bordas da ISS (x - width/2, x + width/2, etc.)
    const issLeft = iss.x - iss.width / 2;
    const issRight = iss.x + iss.width / 2;
    const issTop = iss.y - iss.height / 2;
    const issBottom = iss.y + iss.height / 2;

    if (iss.fadePhase === 'active' && 
        (issRight < 0 || issLeft > w || issBottom < 0 || issTop > h)) {
      iss.fadePhase = 'fadeout';
      iss.fadeTimer = 0; // Iniciar timer para fade-out
    }

    // 4. Desenhar a ISS
    ctx.save();
    ctx.translate(iss.x, iss.y);
    ctx.rotate(iss.rotation);
    ctx.globalAlpha = iss.opacity;
    ctx.drawImage(issImg, -iss.width / 2, -iss.height / 2, iss.width, iss.height);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function drawMeteors() {
  createMeteor();
  
  for (let i = meteors.length - 1; i >= 0; i--) {
    const meteor = meteors[i];
    
    if (meteor.destroyed) {
      meteors.splice(i, 1);
      continue;
    }
    
    meteor.fadeTimer++;
    
    switch(meteor.fadePhase) {
      case 'fadein':
        meteor.opacity = Math.min(1, meteor.fadeTimer / meteor.fadeDuration);
        if (meteor.fadeTimer >= meteor.fadeDuration) {
          meteor.fadePhase = 'active';
          meteor.fadeTimer = 0;
        }
        break;
        
      case 'active':
        meteor.opacity = 1;
        meteor.life--;
        
        let shouldFadeOut = meteor.life < 100 || 
                           meteor.x < -200 || meteor.x > w + 200 || 
                           meteor.y < -200 || meteor.y > h + 200;
        
        if (shouldFadeOut) {
          meteor.fadePhase = 'fadeout';
          meteor.fadeTimer = 0;
        }
        break;
        
      case 'fadeout':
        meteor.opacity = Math.max(0, 1 - (meteor.fadeTimer / meteor.fadeDuration));
        if (meteor.opacity <= 0) {
          if (Math.random() < 0.1) {
            createSubtleExplosion(meteor.x, meteor.y, meteor.size * 0.5, meteor.color);
          }
          meteors.splice(i, 1);
          continue;
        }
        break;
    }
    
    meteor.trail.push({ x: meteor.x, y: meteor.y, opacity: meteor.opacity });
    if (meteor.trail.length > 30) meteor.trail.shift();
    
    meteor.x += meteor.velocity.x;
    meteor.y += meteor.velocity.y;
    
    for (let j = 0; j < meteor.trail.length - 1; j++) {
      const trailPoint = meteor.trail[j];
      const alpha = (j / meteor.trail.length) * 0.6 * trailPoint.opacity;
      const width = meteor.size * (j / meteor.trail.length) * 0.8;
      
      ctx.strokeStyle = `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, ${alpha})`;
      ctx.lineWidth = Math.max(0.5, width);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(meteor.trail[j].x, meteor.trail[j].y);
      ctx.lineTo(meteor.trail[j + 1].x, meteor.trail[j + 1].y);
      ctx.stroke();
    }
    
    ctx.shadowColor = `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, ${meteor.opacity})`;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.fillStyle = `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, ${meteor.opacity})`;
    ctx.arc(meteor.x, meteor.y, meteor.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 255, 255, ${meteor.opacity * 0.6})`;
    ctx.arc(meteor.x, meteor.y, meteor.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawComets() {
  createComet();
  
  for (let i = comets.length - 1; i >= 0; i--) {
    const comet = comets[i];
    
    if (comet.destroyed) {
      comets.splice(i, 1);
      continue;
    }
    
    comet.fadeTimer++;
    
    switch(comet.fadePhase) {
      case 'fadein':
        comet.opacity = Math.min(1, comet.fadeTimer / comet.fadeDuration);
        if (comet.fadeTimer >= comet.fadeDuration) {
          comet.fadePhase = 'active';
          comet.fadeTimer = 0;
        }
        break;
        
      case 'active':
        comet.opacity = 1;
        comet.life--;
        
        let shouldFadeOut = comet.life < 120 || 
                           comet.x < -200 || comet.x > w + 200 || 
                           comet.y < -200 || comet.y > h + 200;
        
        if (shouldFadeOut) {
          comet.fadePhase = 'fadeout';
          comet.fadeTimer = 0;
        }
        break;
        
      case 'fadeout':
        comet.opacity = Math.max(0, 1 - (comet.fadeTimer / comet.fadeDuration));
        if (comet.opacity <= 0) {
          if (Math.random() < 0.15) {
            createSubtleExplosion(comet.x, comet.y, comet.size * 0.6, comet.color);
          }
          comets.splice(i, 1);
          continue;
        }
        break;
    }
    
    comet.trail.push({ x: comet.x, y: comet.y, opacity: comet.opacity });
    if (comet.trail.length > comet.trailLength) comet.trail.shift();
    
    comet.x += comet.velocity.x;
    comet.y += comet.velocity.y;
    
    for (let j = 0; j < comet.trail.length - 1; j++) {
      const trailPoint = comet.trail[j];
      const alpha = (j / comet.trail.length) * 0.4 * trailPoint.opacity;
      const width = comet.size * (j / comet.trail.length) * 0.6;
      
      ctx.strokeStyle = `rgba(${comet.color.r}, ${comet.color.g}, ${comet.color.b}, ${alpha})`;
      ctx.lineWidth = Math.max(0.5, width);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(comet.trail[j].x, comet.trail[j].y);
      ctx.lineTo(comet.trail[j + 1].x, comet.trail[j + 1].y);
      ctx.stroke();
    }
    
    ctx.shadowColor = `rgba(${comet.color.r}, ${comet.color.g}, ${comet.color.b}, ${comet.opacity})`;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.fillStyle = `rgba(${comet.color.r}, ${comet.color.g}, ${comet.color.b}, ${comet.opacity})`;
    ctx.arc(comet.x, comet.y, comet.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 255, 255, ${comet.opacity * 0.5})`;
    ctx.arc(comet.x, comet.y, comet.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawExplosions() {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const explosion = explosions[i];
    
    explosion.life--;
    
    for (let j = explosion.particles.length - 1; j >= 0; j--) {
      const particle = explosion.particles[j];
      
      particle.x += particle.velocity.x;
      particle.y += particle.velocity.y;
      particle.velocity.x *= 0.95;
      particle.velocity.y *= 0.95;
      particle.life--;
      
      const lifeRatio = particle.life / particle.maxLife;
      const opacity = lifeRatio * 0.6;
      const size = particle.size * lifeRatio;
      
      if (particle.life > 0) {
        ctx.shadowColor = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${opacity})`;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${opacity})`;
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        explosion.particles.splice(j, 1);
      }
    }
    
    if (explosion.life <= 0 || explosion.particles.length === 0) {
      explosions.splice(i, 1);
    }
  }
}

function drawSupernovas() {
  checkSupernova();
  
  for (let i = supernovas.length - 1; i >= 0; i--) {
    const supernova = supernovas[i];
    
    switch(supernova.phase) {
      case 'expand':
        supernova.radius += supernova.expandSpeed;
        supernova.opacity = Math.min(supernova.maxOpacity, supernova.radius / 25);
        
        if (supernova.radius >= supernova.maxRadius) {
          supernova.phase = 'peak';
        }
        break;
        
      case 'peak':
        supernova.peakTimer++;
        
        if (supernova.peakTimer >= supernova.peakDuration) {
          supernova.phase = 'contract';
        }
        break;
        
      case 'contract':
        supernova.radius -= supernova.contractSpeed;
        supernova.opacity = Math.max(0, supernova.opacity - 0.005);
        
        if (supernova.radius <= 0 || supernova.opacity <= 0) {
          supernovas.splice(i, 1);
          continue;
        }
        break;
    }
    
    const gradient = ctx.createRadialGradient(
      supernova.x, supernova.y, 0,
      supernova.x, supernova.y, supernova.radius
    );
    
    gradient.addColorStop(0, `rgba(255, 255, 255, ${supernova.opacity})`);
    gradient.addColorStop(0.2, `rgba(${supernova.color.r}, ${supernova.color.g}, ${supernova.color.b}, ${supernova.opacity * 0.8})`);
    gradient.addColorStop(0.7, `rgba(${supernova.color.r}, ${supernova.color.g}, ${supernova.color.b}, ${supernova.opacity * 0.3})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(supernova.x, supernova.y, supernova.radius, 0, Math.PI * 2);
    ctx.fill();
    
    if (supernova.phase !== 'contract' || supernova.opacity > 0.1) {
      ctx.shadowColor = `rgba(255, 255, 255, ${supernova.opacity})`;
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${supernova.opacity})`;
      ctx.arc(supernova.x, supernova.y, supernova.radius * 0.1, 0, Math.PI * 4);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

// === LOOP PRINCIPAL ===
// Modifique a função animate:
function animate(currentTime) {
  try {
    // Limitar FPS e otimizar para dispositivos móveis
    const now = currentTime; 
    const elapsed = now - lastFrameTime;

    if (elapsed < frameInterval) {
        requestAnimationFrame(animate);
        return; // Pula este frame para limitar o FPS
    }
    lastFrameTime = now - (elapsed % frameInterval);

    // Em dispositivos móveis, reduzir ainda mais o FPS durante mudanças de viewport
    if (isMobile && !isViewportStable) {
        // Durante mudanças de viewport, renderizar a 15 FPS para reduzir lag
        const reducedFrameInterval = 1000 / 15;
        if (elapsed < reducedFrameInterval) {
            requestAnimationFrame(animate);
            return;
        }
    }

    // Verificar se o canvas precisa ser redimensionado antes de renderizar
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }

    ctx.clearRect(0, 0, w, h);
    console.log('Frame rendered at:', now); // Debug log
  time++;
  drawBackground();
  drawNebulae();
  drawStars();
  drawCosmicDust();
  drawSpacecrafts();
  drawISS();
  drawRockets();
  drawMeteors();
  drawComets();
  drawExplosions();
  drawSupernovas();
  checkCollisions();

  // Desenhar supernova do buraco negro se existir
  if (blackHoleSupernova) {
    if (!blackHoleSupernovaActive && blackHoleSupernova.phase === 'peak') {
      blackHoleSupernova.phase = 'contract';
    }
    if (blackHoleSupernova.phase === 'expand') {
      blackHoleSupernova.radius += blackHoleSupernova.expandSpeed;
      blackHoleSupernova.opacity = Math.min(blackHoleSupernova.maxOpacity, blackHoleSupernova.radius / blackHoleSupernova.maxRadius * blackHoleSupernova.maxOpacity);
      if (blackHoleSupernova.radius >= blackHoleSupernova.maxRadius) {
        blackHoleSupernova.phase = 'peak';
      }
    } else if (blackHoleSupernova.phase === 'contract') {
      blackHoleSupernova.radius -= blackHoleSupernova.contractSpeed;
      blackHoleSupernova.opacity = Math.max(0, blackHoleSupernova.opacity - 0.03);
      if (blackHoleSupernova.radius <= 0 || blackHoleSupernova.opacity <= 0) {
        blackHoleSupernova = null;
      }
    }
    // Desenhar supernova
    if (blackHoleSupernova) {
      const gradient = ctx.createRadialGradient(
        blackHoleSupernova.x, blackHoleSupernova.y, 0,
        blackHoleSupernova.x, blackHoleSupernova.y, blackHoleSupernova.radius
      );
      gradient.addColorStop(0, `rgba(255,255,255,${blackHoleSupernova.opacity})`);
      gradient.addColorStop(0.2, `rgba(${blackHoleSupernova.color.r},${blackHoleSupernova.color.g},${blackHoleSupernova.color.b},${blackHoleSupernova.opacity * 0.8})`);
      gradient.addColorStop(0.7, `rgba(${blackHoleSupernova.color.r},${blackHoleSupernova.color.g},${blackHoleSupernova.color.b},${blackHoleSupernova.opacity * 0.3})`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(blackHoleSupernova.x, blackHoleSupernova.y, blackHoleSupernova.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (blackHoleReturning && blackHoleStarData.length > 0 && blackHoleStarData.every(d => d.state === 'done' || d.star.destroyed)) {
    blackHoleActive = false;
    blackHoleReturning = false;
    blackHoleStarData = [];
    stars.forEach(star => {
        star.x = star.originalX;
        star.y = star.originalY;
    });
    blackHoleSupernova = null;
  }

  requestAnimationFrame(animate);
  } catch (error) {
    console.error('Erro na função animate:', error);
    // Tentar continuar a animação mesmo com erro
    requestAnimationFrame(animate);
  }
}

