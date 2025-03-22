import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 5).normalize();
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
    'bishop': { fireRate: 0.2, projectile: 'bazooka' },
    'rook': { fireRate: 4, projectile: 'bullet' },
    'queen': { fireRate: 1, projectile: 'bazooka' },
    'king': { fireRate: 0.1, projectile: 'bullet' }
};
const rankOrder = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];

// Chess Piece Creation Functions
function createPawn() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.5, 32), new THREE.MeshPhongMaterial({ color: 0xcccccc }));
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 32), new THREE.MeshPhongMaterial({ color: 0xcccccc }));
    top.position.y = 0.5;
    group.add(base, top);
    return group;
}

function createKnight() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 32), new THREE.MeshPhongMaterial({ color: 0x888888 }));
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.6), new THREE.MeshPhongMaterial({ color: 0x888888 }));
    head.position.y = 1;
    head.rotation.z = Math.PI / 4;
    group.add(base, head);
    return group;
}

function createBishop() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.5, 32), new THREE.MeshPhongMaterial({ color: 0x0000ff }));
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), new THREE.MeshPhongMaterial({ color: 0x0000ff }));
    top.position.y = 1.7;
    group.add(base, top);
    return group;
}

function createRook() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.5, 32), new THREE.MeshPhongMaterial({ color: 0x00ff00 }));
    for (let i = 0; i < 4; i++) {
        const crenel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 32), new THREE.MeshPhongMaterial({ color: 0x00ff00 }));
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
    const base = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2, 32), new THREE.MeshPhongMaterial({ color: 0x800080 }));
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 32), new THREE.MeshPhongMaterial({ color: 0x800080 }));
    crown.position.y = 2.15;
    group.add(base, crown);
    return group;
}

function createKing() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2, 32), new THREE.MeshPhongMaterial({ color: 0xffd700 }));
    const crossVertical = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), new THREE.MeshPhongMaterial({ color: 0xffd700 }));
    const crossHorizontal = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), new THREE.MeshPhongMaterial({ color: 0xffd700 }));
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
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

scene.background = new THREE.Color(0x87ceeb);

// Obstacles with Collision Boxes
const obstacles = [];
for (let i = 0; i < 10; i++) {
    const type = Math.floor(Math.random() * 3);
    let obstacle, boundingBox, heightOffset = 1;
    if (type === 0) {
        const size = 2 + Math.random() * 2;
        obstacle = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff }));
        heightOffset = size / 2;
    } else if (type === 1) {
        const radius = 1 + Math.random();
        const height = 2 + Math.random() * 2;
        obstacle = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 32), new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff }));
        heightOffset = height / 2;
    } else {
        const radius = 1 + Math.random();
        obstacle = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff }));
        heightOffset = radius;
    }
    obstacle.position.set((Math.random() - 0.5) * 90, heightOffset, (Math.random() - 0.5) * 90);
    boundingBox = new THREE.Box3().setFromObject(obstacle);
    obstacles.push({ mesh: obstacle, box: boundingBox });
    scene.add(obstacle);
}

// Health Bar Creation
function createHealthBar() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
    sprite.scale.set(1, 0.25, 1);
    return { sprite, canvas, ctx };
}

function updateHealthBar(npc) {
    const { ctx, canvas } = npc.healthBar;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, (npc.health / 10) * canvas.width, canvas.height);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    npc.healthBar.sprite.material.map.needsUpdate = true;
}

// NPCs with Health Bars and Shooting
const npcs = [];
for (let i = 0; i < 10; i++) {
    const rank = rankOrder[Math.floor(Math.random() * rankOrder.length)];
    const npc = pieceCreators[rank]();
    npc.position.set((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80);
    npc.health = 10;
    npc.velocity = new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2);
    npc.lastShot = 0;
    npc.fireRate = 1;

    // Add Health Bar
    npc.healthBar = createHealthBar();
    npc.healthBar.sprite.position.set(0, 2, 0); // Above NPC
    npc.add(npc.healthBar.sprite);
    updateHealthBar(npc);

    npcs.push(npc);
    scene.add(npc);
}

// Projectiles (Player and Enemy) with Explosions
const projectiles = [];
function shoot(shooter, isEnemy = false) {
    const now = performance.now() / 1000;
    if (now - shooter.lastShot < 1 / shooter.fireRate) return;
    shooter.lastShot = now;

    const projectileGeo = new THREE.SphereGeometry(isEnemy ? 0.2 : (shooter.projectile === 'bazooka' ? 0.5 : 0.1));
    const projectileMat = new THREE.MeshPhongMaterial({ color: isEnemy ? 0xff0000 : (shooter.projectile === 'bazooka' ? 0x00ff00 : 0xffff00) });
    const projectile = new THREE.Mesh(projectileGeo, projectileMat);
    
    projectile.position.copy(isEnemy ? shooter.position.clone().add(new THREE.Vector3(0, 1, 0)) : camera.position);
    const direction = isEnemy ? camera.position.clone().sub(shooter.position).normalize() : new THREE.Vector3();
    if (!isEnemy) camera.getWorldDirection(direction);
    projectile.velocity = direction.multiplyScalar(50);
    projectile.damage = isEnemy ? 2 : (shooter.rank === 'king' ? 10 : shooter.damage());
    projectile.isEnemy = isEnemy;
    projectile.isBazooka = !isEnemy && shooter.projectile === 'bazooka';
    projectiles.push(projectile);
    scene.add(projectile);
}

function createExplosion(position) {
    const explosionGeo = new THREE.SphereGeometry(2, 32, 32);
    const explosionMat = new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.8 });
    const explosion = new THREE.Mesh(explosionGeo, explosionMat);
    explosion.position.copy(position);
    scene.add(explosion);

    let fade = 1;
    const fadeOut = setInterval(() => {
        fade -= 0.1;
        explosion.material.opacity = fade;
        if (fade <= 0) {
            clearInterval(fadeOut);
            scene.remove(explosion);
        }
    }, 50);
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
        case 'Space': shoot(player); break;
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
player.mesh.position.set(0, 1.5, 0);
controls.getObject().position.set(0, 1.5, 0);

// Update Loop
function animate() {
    requestAnimationFrame(animate);

    // Player Movement
    direction.z = Number(moveBackward) - Number(moveForward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();
    velocity.x = direction.x * speed;
    velocity.z = direction.z * speed;

    const newPosition = controls.getObject().position.clone().add(velocity.clone().multiplyScalar(1 / 60));
    const playerBox = new THREE.Box3().setFromCenterAndSize(newPosition, new THREE.Vector3(1, 1, 1));

    let collision = false;
    for (const obstacle of obstacles) {
        obstacle.box.setFromObject(obstacle.mesh);
        if (playerBox.intersectsBox(obstacle.box)) {
            collision = true;
            break;
        }
    }

    if (!collision) {
        controls.getObject().position.copy(newPosition);
    }
    controls.getObject().position.y = 1.5;

    // Projectile Update
    projectiles.forEach((proj, i) => {
        proj.position.add(proj.velocity.clone().multiplyScalar(1 / 60));
        if (proj.position.length() > 100) {
            scene.remove(proj);
            projectiles.splice(i, 1);
            return;
        }
        if (proj.isEnemy) {
            if (proj.position.distanceTo(camera.position) < 1) {
                player.health -= proj.damage;
                scene.remove(proj);
                projectiles.splice(i, 1);
                if (player.health <= 0) console.log("Player dead");
            }
        } else {
            npcs.forEach((npc, j) => {
                if (proj.position.distanceTo(npc.position) < 1) {
                    if (proj.isBazooka) {
                        createExplosion(proj.position);
                        npcs.forEach((nearbyNpc, k) => {
                            if (nearbyNpc !== npc && proj.position.distanceTo(nearbyNpc.position) < 5) {
                                nearbyNpc.health -= proj.damage / 2; // Splash damage
                                updateHealthBar(nearbyNpc);
                                if (nearbyNpc.health <= 0) {
                                    scene.remove(nearbyNpc);
                                    npcs.splice(k, 1);
                                }
                            }
                        });
                    }
                    npc.health -= proj.damage;
                    updateHealthBar(npc);
                    scene.remove(proj);
                    projectiles.splice(i, 1);
                    if (npc.health <= 0) {
                        scene.remove(npc);
                        npcs.splice(j, 1);
                        upgradePlayer();
                    }
                }
            });
        }
    });

    // NPC Movement and Shooting
    npcs.forEach(npc => {
        npc.position.add(npc.velocity.clone().multiplyScalar(1 / 60));
        if (Math.abs(npc.position.x) > 45 || Math.abs(npc.position.z) > 45) {
            npc.velocity.multiplyScalar(-1);
        }
        shoot(npc, true);
        npc.healthBar.sprite.position.copy(npc.position.clone().add(new THREE.Vector3(0, 2, 0))); // Update health bar position
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
