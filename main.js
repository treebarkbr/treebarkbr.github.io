import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import * as CANNON from 'cannon-es';

// Post-processing imports for the dream effect
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';

// --- WORLD SETUP ---
const scene = new THREE.Scene();
const physicsWorld = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, 0) }); // No gravity in dreams
const clock = new THREE.Clock();

// --- RENDERER & CAMERA ---
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(10, 5, 20);
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
controls.minDistance = 5;
controls.maxDistance = 50;
controls.target.set(0, 2, 0);

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0x404080, 1); // Dark blue ambient
const sunLight = new THREE.DirectionalLight(0xffdcb3, 2); // Warm sun
sunLight.position.set(10, 20, -20);
scene.add(ambientLight, sunLight);

// --- POST-PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.4, 0.85);
composer.addPass(bloomPass);
const filmPass = new FilmPass(0.35, 0.025, 648, false);
composer.addPass(filmPass);
const bokehPass = new BokehPass(scene, camera, {
    focus: 15.0,
    aperture: 0.0005,
    maxblur: 0.01,
    width: window.innerWidth,
    height: window.innerHeight
});
composer.addPass(bokehPass);


// --- HELPERS & DATA ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const textureLoader = new THREE.TextureLoader();
const objectsToUpdate = [];
const interactiveObjects = [];
const focusPoints = {};

// --- DREAM ELEMENTS ---

// 1. The Core: Graphics & Animation (The "Heart of the Dream")
const heartMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xff80ff,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.1,
    // This is the magic. We'll modify the shader on the fly.
    onBeforeCompile: (shader) => {
        shader.uniforms.uTime = { value: 0 };
        shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            float noise = sin(position.y * 4.0 + uTime * 2.0) * 0.2 + cos(position.x * 4.0 + uTime * 2.0) * 0.2;
            transformed += normal * noise;
            `
        );
        heartMaterial.userData.shader = shader; // Store shader for later access
    }
});
const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 20), heartMaterial);
heart.name = 'graphics';
heart.position.set(0, 2, 0);
scene.add(heart);
interactiveObjects.push(heart);
focusPoints['graphics'] = {
    position: new THREE.Vector3(0, 2, 7),
    title: 'The Heart.',
    description: 'Everything starts here. A chaotic mix of logic and light. It beats with the rhythm of creation.'
};

// 2. The Gallery: Photography (Refractive Glass Shards)
const photos = ['img/photo1.jpg', 'img/photo2.jpg', 'img/photo3.jpg'];
photos.forEach((src, i) => {
    const texture = textureLoader.load(src);
    const geo = new THREE.BoxGeometry(2, 3, 0.1);
    // A realistic glass material that refracts the background
    const mat = new THREE.MeshPhysicalMaterial({
        roughness: 0.05,
        transmission: 1.0, // This makes it transparent
        thickness: 0.5, // This controls refraction
        map: texture
    });
    const pane = new THREE.Mesh(geo, mat);
    pane.name = 'photography';
    
    // Physics body
    const shape = new CANNON.Box(new CANNON.Vec3(1, 1.5, 0.05));
    const body = new CANNON.Body({ mass: 1 });
    body.addShape(shape);
    const angle = (i / photos.length) * Math.PI * 2;
    body.position.set(Math.cos(angle) * 10, i * 2, Math.sin(angle) * 10);
    body.quaternion.setFromEuler(Math.random(), Math.random(), Math.random());
    physicsWorld.addBody(body);
    
    objectsToUpdate.push({ mesh: pane, body: body });
    interactiveObjects.push(pane);
});
focusPoints['photography'] = {
    position: new THREE.Vector3(10, 2, -5), // A general area to look at
    title: 'Frozen Moments.',
    description: 'Memories trapped in glass, drifting through the subconscious. Each one a story.'
};

// 3. The Spires: Programming (Living Crystal Towers)
const codeSpireMat = new THREE.MeshStandardMaterial({
    color: 0x80d0ff,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.8,
});
for (let i = 0; i < 50; i++) {
    const height = Math.random() * 8 + 2;
    const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, Math.random() * 0.3, height, 6),
        codeSpireMat
    );
    const angle = Math.random() * Math.PI * 2;
    const radius = 15 + Math.random() * 5;
    spire.position.set(Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius);
    spire.name = 'programming';
    scene.add(spire);
    interactiveObjects.push(spire); // Can click any spire
}
focusPoints['programming'] = {
    position: new THREE.Vector3(-18, 4, -15),
    title: 'The Spires of Logic.',
    description: 'Order rising from chaos. Cold, hard structures built from pure thought. Luau, C++, Python... the architects.'
};


// 4. The River: Eating (GPU Particle Stream)
// This is too complex for this snippet, so we'll simulate it with a beautiful particle system
const particleGeo = new THREE.BufferGeometry();
const particleCount = 5000;
const posArray = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 50;
}
particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));
const particleMat = new THREE.PointsMaterial({
    size: 0.05,
    color: 0xffc0cb,
    blending: THREE.AdditiveBlending,
    transparent: true,
});
const particleMesh = new THREE.Points(particleGeo, particleMat);
particleMesh.name = 'eating';
scene.add(particleMesh);
interactiveObjects.push(particleMesh);
focusPoints['eating'] = {
    position: new THREE.Vector3(0, -10, 0),
    title: 'The River of Life.',
    description: 'The fuel. The energy that flows through everything. The best part of the dream.'
};

// --- ENVIRONMENT ---
const envTexture = textureLoader.load('img/photo1.jpg'); // Use one of your photos for reflections
envTexture.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = envTexture;
scene.background = new THREE.Color(0x0c0a1a);

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
        const focusData = focusPoints[intersects[0].object.name];
        if (focusData) {
            gsap.to(controls.target, { ...focusData.position, duration: 2, ease: 'power3.inOut' });
            gsap.to(bokehPass.uniforms.focus, { value: controls.target.distanceTo(camera.position) - 3, duration: 2, ease: 'power3.inOut' });

            document.getElementById('info-title').textContent = focusData.title;
            document.getElementById('info-description').textContent = focusData.description;
        }
    }
});


// --- ANIMATION LOOP ---
function animate() {
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Update physics world
    physicsWorld.step(1 / 60, deltaTime, 3);
    objectsToUpdate.forEach(obj => {
        obj.mesh.position.copy(obj.body.position);
        obj.mesh.quaternion.copy(obj.body.quaternion);
    });

    // Animate the heart shader
    if (heartMaterial.userData.shader) {
        heartMaterial.userData.shader.uniforms.uTime.value = elapsedTime;
    }
    
    // Animate the particle river
    particleMesh.rotation.y = elapsedTime * 0.05;

    // Apply a gentle force to physics objects to keep them moving
    objectsToUpdate.forEach(obj => {
        obj.body.applyForce(new CANNON.Vec3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        ), obj.body.position);
    });

    controls.update();
    composer.render();
    requestAnimationFrame(animate);
}

animate();