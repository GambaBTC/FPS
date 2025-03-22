import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
scene.add(new THREE.AmbientLight(0x404040));
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Pointer Lock Controls
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());
document.addEventListener('click', () => controls.lock());

// Player State
let player = {
    health: 10,
    rank: 'pawn',
    fireRate: 1,
    lastShot: 0,
    damage: () => Math.floor(Math.random() * 5) + 1,
    mesh: null
};

// Rank Progression
const ranks = {
    'pawn': { fireRate: 1, projectile: 'bullet' },
    'knight': { fireRate: 2, projectile: 'bullet' },
    'bishop': { fireRate: 0.2, projectile: 'bazooka' }, // 1 per 5s
    'rook': { fireRate: 4, projectile: 'bullet' },     // 1 per 0.25s
    'queen': { fireRate: 1, projectile: 'bazooka' },
    'king': { fireRate: 0.1, projectile: 'bullet' }    // 1 per 10s, high damage
};
const rankOrder = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];

// Chess Piece Creation Functions
function createPawn() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.5, 32),
        new THREE.MeshPhongMaterial({ color: 0xcccccc })
    );
    const top = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0xcccccc })
    );
    top.position.y = 0.5;
    group.add(base, top);
    return group;
}

function createKnight() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.7, 32),
        new THREE.MeshPhongMaterial({ color: 0x888888 })
    );
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.6),
        new THREE.MeshPhongMaterial({ color: 0x888888 })
    );
    head.position.y = 1;
    head.rotation.z = Math.PI / 4;
    group.add(base, head);
    return group;
}

function createBishop() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 1.5, 32),
        new THREE.MeshPhongMaterial({ color: 0x0000ff })
    );
    const top = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0x0000ff })
    );
    top.position.y = 1.7;
    group.add(base, top);
    return group;
}

function createRook() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 1.5, 32),
        new THREE.MeshPhongMaterial({ color: 0x00ff00 })
    );
    for (let i = 0; i < 4; i++) {
        const crenel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 0.3, 32),
            new THREE.MeshPhongMaterial({ color: 0x00ff00 })
        );
        crenel.position.y = 1.65;
        crenel.position.x = 0.3 * Math.cos((i * Math.PI) / 2);
        crenel.position.z = 0.3 * Math.sin((i * Math.PI) / 2);
        group.add(crenel);
    }
    group.add(base);
    return group;
}

function createQueen() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 2, 32),
        new THREE.MeshPhongMaterial({ color: 0x800080 })
    );
    const crown = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.3, 32),
        new THREE.MeshPhongMaterial({ color: 0x800080 })
    );
    crown.position.y = 2.15;
    group.add(base, crown);
    return group;
}

function createKing() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 2, 32),
        new THREE.MeshPhongMaterial({ color: 0xffd700 })
    );
    const crossVertical = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.5, 0.1),
        new THREE.MeshPhongMaterial({ color: 0xffd700 })
    );
    const crossHorizontal = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.1, 0.1),
        new THREE.MeshPhongMaterial({ color: 0xffd700 })
    );
    crossVertical.position.y = 2.25;
    crossHorizontal.position.y = 2.35;
    group.add(base, crossVertical, crossHorizontal);
    return group;
}

const pieceCreators = {
    'pawn': createPawn,
    'knight': createKnight,
    'bishop': createBishop,
    'rook': createRook,
    'queen': createQueen,
    'king': createKing
};

// World Setup
const textureLoader = new THREE.TextureLoader();
const checkerboard = textureLoader.load('https://threejs.org/examples/textures/checkerboard.png');
checkerboard.repeat.set(10, 10);
checkerboard.wrapS = checkerboard.wrapT = THREE.RepeatWrapping;
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshPhongMaterial({ map: checkerboard });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Obstacles
for (let i = 0; i < 10; i++) {
    const type = Math.floor(Math.random() * 3);
    let obstacle;
    if (type === 0) {
        obstacle = new THREE.Mesh(
            new THREE.BoxGeometry(2 + Math.random() * 2, 2 + Math.random() * 2, 2 + Math.random() * 2),
            new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff })
        );
    } else if (type === 1) {
        obstacle = new THREE.Mesh(
            new THREE.CylinderGeometry(1 + Math.random(), 1 + Math.random(), 2 + Math.random() * 2, 32),
            new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff })
        );
    } else {
        obstacle = new THREE.Mesh(
            new THREE.SphereGeometry(1 + Math.random(), 32, 32),
            new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff })
        );
    }
    obstacle.position.set(
        (Math.random() - 0.5) * 90,
        obstacle.geometry.parameters.height ? obstacle.geometry.parameters.height / 2 : 1,
        (Math.random() - 0.5) * 90
    );
    scene.add(obstacle);
}

// NPCs
const npcs = [];
for (let i = 0; i < 5; i++) {
    const rank = rankOrder[Math.floor(Math.random() * rankOrder.length)];
    const npc = pieceCreators[rank]();
    npc.position.set(
        (Math.random() - 0.5) * 80,
        0,
        (Math.random() - 0.5) * 80
    );
    npc.health = 10;
    npcs.push(npc);
    scene.add(npc);
}

// Projectiles
const projectiles = [];
function shoot() {
    const now = performance.now() / 1000;
    if (now - player.lastShot < 1 / player.fireRate) return;
    player.lastShot = now;

    const projectileGeo = new THREE.SphereGeometry(player.projectile === 'bazooka' ? 0.5 : 0.1);
    const projectileMat = new THREE.MeshPhongMaterial({ color: player.projectile === 'bazooka' ? 0x00ff00 : 0xffff00 });
    const projectile = new THREE.Mesh(projectileGeo, projectileMat);
    
    projectile.position.copy(camera.position);
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    projectile.velocity = direction.clone().multiplyScalar(50);
    projectile.damage = player.rank === 'king' ? 10 : player.damage();
    projectiles.push(projectile);
    scene.add(projectile);
}

// Movement
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const speed = 10;

document.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': shoot(); break;
    }
});
document.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
    }
});

// Initialize Player
player.mesh = createPawn();
player.mesh.position.y = 1.5; // Offset for camera height
controls.getObject().position.y = 1.5;

// Update Loop
function animate() {
    requestAnimationFrame(animate);

    // Player Movement
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();
    velocity.x = direction.x * speed;
    velocity.z = direction.z * speed;
    controls.getObject().position.add(velocity.clone().multiplyScalar(1 / 60));
    controls.getObject().position.y = 1.5;

    // Projectile Update
    projectiles.forEach((proj, i) => {
        proj.position.add(proj.velocity.clone().multiplyScalar(1 / 60));
        if (proj.position.length() > 100) {
            scene.remove(proj);
            projectiles.splice(i, 1);
            return;
        }
        npcs.forEach((npc, j) => {
            if (proj.position.distanceTo(npc.position) < 1) {
                npc.health -= proj.damage;
                scene.remove(proj);
                projectiles.splice(i, 1);
                if (npc.health <= 0) {
                    scene.remove(npc);
                    npcs.splice(j, 1);
                    upgradePlayer();
                }
            }
        });
    });

    // NPC Movement
    npcs.forEach(npc => {
        npc.position.x += (Math.random() - 0.5) * 0.1;
        npc.position.z += (Math.random() - 0.5) * 0.1;
    });

    // Update UI
    document.getElementById('info').innerText = `Rank: ${player.rank} | Health: ${player.health}`;

    renderer.render(scene, camera);
}
animate();

// Upgrade Logic
function upgradePlayer() {
    const currentIndex = rankOrder.indexOf(player.rank);
    if (currentIndex < rankOrder.length - 1) {
        player.rank = rankOrder[currentIndex + 1];
        player.fireRate = ranks[player.rank].fireRate;
        player.projectile = ranks[player.rank].projectile;
        scene.remove(player.mesh);
        player.mesh = pieceCreators[player.rank]();
        player.mesh.position.copy(controls.getObject().position);
        player.mesh.position.y = 0;
        scene.add(player.mesh);
    }
}

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
