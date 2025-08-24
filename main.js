import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';

// Post-processing
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- WORLD SETUP ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x02040a, 0.035); // Add deep blue fog
const clock = new THREE.Clock();

// --- RENDERER & CAMERA ---
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 25);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// --- CONTROLS ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.enableZoom = false;
controls.minDistance = 10;
controls.maxDistance = 50;
controls.target.set(0, 2, 0);

// --- LIGHTING ---
const hemisphereLight = new THREE.HemisphereLight(0x3050ff, 0x202040, 1);
scene.add(hemisphereLight);

// --- POST-PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.7, 0.1);
composer.addPass(bloomPass);

// --- HELPERS & DATA ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const textureLoader = new THREE.TextureLoader();
const interactiveObjects = [];
const focusPoints = {};

// --- OCEAN FLOOR & CAUSTICS ---
const causticsTexture = textureLoader.load('https://raw.githubusercontent.com/vis-prime/caustics/main/assets/caustics.png'); // A free caustics map
causticsTexture.wrapS = causticsTexture.wrapT = THREE.RepeatWrapping;
const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x050814,
    roughness: 0.8,
    metalness: 0.2,
});
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const causticsLight = new THREE.SpotLight(0x88aaff, 50);
causticsLight.position.set(0, 50, 0);
causticsLight.angle = Math.PI / 3;
causticsLight.penumbra = 1;
causticsLight.decay = 2;
causticsLight.distance = 200;
causticsLight.map = causticsTexture;
causticsLight.target = floor;
scene.add(causticsLight);
scene.add(causticsLight.target);

// --- DEEP SEA ELEMENTS ---

// 1. The Core: Graphics/Animation (Giant Pulsating Jellyfish)
const jellyfishMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x80d0ff,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    onBeforeCompile: (shader) => {
        shader.uniforms.uTime = { value: 0 };
        shader.fragmentShader = shader.fragmentShader.replace(
            'vec4 diffuseColor = vec4( diffuse, opacity );',
            `
            // Fresnel effect
            vec3 viewDirection = normalize(vViewPosition);
            float fresnel = 1.0 - dot(normalize(vNormal), -viewDirection);
            fresnel = pow(fresnel, 2.0);

            // Pulsating glow
            float pulse = (sin(uTime * 2.0) * 0.5 + 0.5) * 0.5 + 0.5;

            vec4 diffuseColor = vec4(diffuse, (opacity * fresnel) * pulse);
            `
        );
        jellyfishMaterial.userData.shader = shader;
    }
});
const jellyfish = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2), jellyfishMaterial);
jellyfish.position.y = 5;
jellyfish.name = 'graphics';
scene.add(jellyfish);
interactiveObjects.push(jellyfish);
focusPoints['graphics'] = {
    position: new THREE.Vector3(0, 5, 10),
    title: 'The Anomaly.',
    description: 'The heart of the abyss. A creature of pure light and impossible form. It bends pixels to its will.'
};

// Central light source inside the jellyfish
const coreLight = new THREE.PointLight(0x80d0ff, 10, 50, 1.5);
coreLight.position.y = 5;
scene.add(coreLight);

// 2. The Gallery: Photography (Glowing Runic Tablets)
const photos = ['img/photo1.jpg', 'img/photo2.jpg', 'img/photo3.jpg'];
photos.forEach((src, i) => {
    const texture = textureLoader.load(src);
    const mat = new THREE.MeshStandardMaterial({
        map: texture,
        emissiveMap: texture,
        emissive: 0xffffff,
        emissiveIntensity: 0, // Initially off
        toneMapped: false, // Make the glow pop
    });
    const tablet = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 0.2), mat);
    const angle = (i / photos.length) * Math.PI * 2 + 1;
    const radius = 15;
    tablet.position.set(Math.cos(angle) * radius, 1, Math.sin(angle) * radius);
    tablet.lookAt(0, 1, 0);
    tablet.name = 'photography';
    tablet.userData.baseIntensity = 0;
    scene.add(tablet);
    interactiveObjects.push(tablet);
});
focusPoints['photography'] = {
    position: new THREE.Vector3(-15, 2, 10),
    title: 'Lost Signals.',
    description: 'Fossilized light, imprinted on stone. Memories from another world, glowing in the dark.'
};

// 3. The Vents: Programming (Streams of Code Bubbles)
const ventParticleGeo = new THREE.BufferGeometry();
const ventParticleCount = 2000;
const ventPosArray = new Float32Array(ventParticleCount * 3);
for (let i = 0; i < ventParticleCount; i++) {
    ventPosArray[i*3+0] = (Math.random() - 0.5) * 0.2;
    ventPosArray[i*3+1] = Math.random() * 20;
    ventPosArray[i*3+2] = (Math.random() - 0.5) * 0.2;
}
ventParticleGeo.setAttribute('position', new THREE.Float32BufferAttribute(ventPosArray, 3));
const ventParticleMat = new THREE.PointsMaterial({
    size: 0.1,
    color: 0x00ffaa,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.7,
});
const codeVents = new THREE.Points(ventParticleGeo, ventParticleMat);
codeVents.position.set(15, 0, -10);
codeVents.name = 'programming';
scene.add(codeVents);
interactiveObjects.push(codeVents);
focusPoints['programming'] = {
    position: new THREE.Vector3(15, 5, -5),
    title: 'Geysers of Logic.',
    description: 'Structure, bubbling up from the chaos. Pure syntax given form. Luau, C++, Python... the elements of creation.'
};

// 4. The Swarm: Eating (Flocking Particles)
const swarmParticleGeo = new THREE.BufferGeometry();
const swarmParticleCount = 3000;
const swarmPosArray = new Float32Array(swarmParticleCount * 3);
for (let i = 0; i < swarmParticleCount; i++) {
    swarmPosArray[i*3+0] = (Math.random() - 0.5) * 30;
    swarmPosArray[i*3+1] = Math.random() * 15;
    swarmPosArray[i*3+2] = (Math.random() - 0.5) * 30;
}
swarmParticleGeo.setAttribute('position', new THREE.Float32BufferAttribute(swarmPosArray, 3));
const swarmMat = new THREE.PointsMaterial({
    size: 0.15,
    color: 0xff8844,
    blending: THREE.AdditiveBlending,
    transparent: true,
});
const swarm = new THREE.Points(swarmParticleGeo, swarmMat);
swarm.name = 'eating';
scene.add(swarm);
interactiveObjects.push(swarm);
focusPoints['eating'] = {
    position: new THREE.Vector3(-20, 8, -15),
    title: 'The Swarm.',
    description: 'The energy. A single, hungry mind moving as one. It consumes, it fuels, it lives.'
};

// --- INTRO & EVENT LISTENERS ---
const loader = document.getElementById('loader');
const mainContent = document.getElementById('main-content');
window.addEventListener('load', () => {
    loader.classList.add('fade-out');
    mainContent.classList.add('visible');
    setTimeout(() => loader.style.display = 'none', 1500);
});
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});
window.addEventListener('click', () => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects);
    if (intersects.length > 0) {
        const targetObj = intersects[0].object;
        const focusData = focusPoints[targetObj.name];
        if (focusData) {
            gsap.to(controls.target, { ...focusData.position, duration: 2.5, ease: 'power3.inOut' });
            document.getElementById('info-title').textContent = focusData.title;
            document.getElementById('info-description').textContent = focusData.description;
        }
    }
});

// --- ANIMATION LOOP ---
function animate() {
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Animate Caustics
    const causticsTime = elapsedTime * 0.1;
    causticsLight.map.offset.set(causticsTime, causticsTime);

    // Animate Jellyfish shader and light
    if (jellyfishMaterial.userData.shader) {
        jellyfishMaterial.userData.shader.uniforms.uTime.value = elapsedTime;
    }
    jellyfish.position.y = 5 + Math.sin(elapsedTime * 0.5) * 0.5;
    coreLight.position.y = jellyfish.position.y;
    coreLight.intensity = (Math.sin(elapsedTime * 2.0) * 0.5 + 0.5) * 5 + 5;

    // Animate code vents
    codeVents.geometry.attributes.position.array.forEach((val, i) => {
        if (i % 3 === 1) { // y-axis
            const newY = (val + deltaTime * 2) % 20;
            codeVents.geometry.attributes.position.array[i] = newY;
        }
    });
    codeVents.geometry.attributes.position.needsUpdate = true;

    // Animate particle swarm (simple sine wave for now)
    swarm.geometry.attributes.position.array.forEach((val, i) => {
        const axis = i % 3;
        const basePos = swarmPosArray[i]; // Original position
        if(axis === 0) swarm.geometry.attributes.position.array[i] = basePos + Math.sin(elapsedTime + basePos) * 2;
        if(axis === 1) swarm.geometry.attributes.position.array[i] = basePos + Math.cos(elapsedTime + basePos) * 2;
    });
    swarm.geometry.attributes.position.needsUpdate = true;
    
    // Animate photo tablets on hover
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects);
    const intersectedNames = intersects.map(o => o.object);

    scene.children.forEach(child => {
        if (child.name === 'photography') {
            const isHovered = intersectedNames.includes(child);
            gsap.to(child.material, { emissiveIntensity: isHovered ? 0.7 : 0, duration: 1 });
        }
    });

    controls.update();
    composer.render();
    requestAnimationFrame(animate);
}

animate();