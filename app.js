import * as THREE from "https://cdn.skypack.dev/three@0.129.0";

import Stats from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/libs/stats.module.js";

import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/DRACOLoader.js";

import { Octree } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/math/Octree.js";
import { Capsule } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/math/Capsule.js";
import { DeviceOrientationControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/DeviceOrientationControls.js";

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
	navigator.userAgent
);

let mixer;
let controls;
const clock = new THREE.Clock();

const extScene = new THREE.Scene();
const intScene = new THREE.Scene();
let scene = extScene;

let intSceneisLoaded = false;

extScene.background = new THREE.Color(0x88ccff);
intScene.background = new THREE.Color(0xffcc88);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.rotation.order = "YXZ";

if (isMobile) {
	controls = new DeviceOrientationControls(camera);
}

// LIGHTS

const ambientlight = new THREE.AmbientLight(0xb3c3e6);

extScene.add(ambientlight);
intScene.add(ambientlight.clone());

const fillLight1 = new THREE.DirectionalLight(0xffffee, 0.2);
fillLight1.position.set(-1, 2, 2);

extScene.add(fillLight1);
intScene.add(fillLight1.clone());

const fillLight2 = new THREE.DirectionalLight(0xffffee, 0.2);
fillLight2.position.set(0, 3, 0);

extScene.add(fillLight2);
intScene.add(fillLight2.clone());

const directionalLight = new THREE.DirectionalLight(0xffffaa, 0.5);
directionalLight.position.set(0, 5, 5);
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = 0.01;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.left = -30;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = -30;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.radius = 4;
directionalLight.shadow.bias = -0.00006;

extScene.add(directionalLight);
intScene.add(directionalLight.clone());

// RENDERER

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;

const container = document.getElementById("container");

container.appendChild(renderer.domElement);

const stats = new Stats();
stats.domElement.classList.add("stats");

container.appendChild(stats.domElement);

const GRAVITY = 30;

let worldOctree = null;
let intWorldOctree = new Octree();
let extWorldOctree = new Octree();

const playerCollider = new Capsule(
	new THREE.Vector3(0, 0.35, 0),
	new THREE.Vector3(0, 1.5, 0),
	0.35
);

const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

let playerOnFloor = false;

// mobile controls

const buttonStates = {};

document.getElementById("forward").addEventListener("touchstart", (event) => {
	buttonStates.forward = true;
});

document.getElementById("forward").addEventListener("touchend", (event) => {
	buttonStates.forward = false;
});

document.getElementById("back").addEventListener("touchstart", (event) => {
	buttonStates["back"] = true;
});

document.getElementById("back").addEventListener("touchend", (event) => {
	buttonStates["back"] = false;
});

// keyboard controls

const keyStates = {};

document.addEventListener("keydown", (event) => {
	keyStates[event.code] = true;
});

document.addEventListener("keyup", (event) => {
	keyStates[event.code] = false;
});

if (!isMobile) {
	document.addEventListener("mousedown", () => {
		document.body.requestPointerLock();
	});

	document.body.addEventListener("mousemove", (event) => {
		if (document.pointerLockElement === document.body) {
			camera.rotation.y -= event.movementX / 500;
			camera.rotation.x -= event.movementY / 500;
		}
	});
}
window.addEventListener("resize", onWindowResize);

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
}

function playerCollitions() {
	let result = worldOctree.capsuleIntersect(playerCollider);

	playerOnFloor = false;

	if (result) {
		playerOnFloor = result.normal.y > 0;

		if (!playerOnFloor) {
			playerVelocity.addScaledVector(result.normal, -result.normal.dot(playerVelocity));
		}

		playerCollider.translate(result.normal.multiplyScalar(result.depth));
	}
}

function updatePlayer(deltaTime) {
	if (playerOnFloor) {
		const damping = Math.exp(-3 * deltaTime) - 1;
		playerVelocity.addScaledVector(playerVelocity, damping);
	} else {
		playerVelocity.y -= GRAVITY * deltaTime;
	}

	const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
	playerCollider.translate(deltaPosition);

	playerCollitions();
	camera.position.copy(playerCollider.end);
}

function getForwardVector() {
	camera.getWorldDirection(playerDirection);
	playerDirection.y = 0;
	playerDirection.normalize();

	return playerDirection;
}

function getSideVector() {
	camera.getWorldDirection(playerDirection);
	playerDirection.y = 0;
	playerDirection.normalize();
	playerDirection.cross(camera.up);

	return playerDirection;
}

function keyControls(deltaTime) {
	const speed = 25;

	if (playerOnFloor) {
		if (keyStates["KeyW"]) {
			playerVelocity.add(getForwardVector().multiplyScalar(speed * deltaTime));
		}

		if (keyStates["KeyS"]) {
			playerVelocity.add(getForwardVector().multiplyScalar(-speed * deltaTime));
		}

		if (keyStates["KeyA"]) {
			playerVelocity.add(getSideVector().multiplyScalar(-speed * deltaTime));
		}

		if (keyStates["KeyD"]) {
			playerVelocity.add(getSideVector().multiplyScalar(speed * deltaTime));
		}

		if (keyStates["Space"]) {
			playerVelocity.y = 10;
		}
	}
}

function mobileControls(deltaTime) {
	const speed = 5;

	if (playerOnFloor) {
		if (buttonStates["forward"]) {
			playerVelocity.add(getForwardVector().multiplyScalar(speed * deltaTime));
		}

		if (buttonStates["back"]) {
			playerVelocity.add(getForwardVector().multiplyScalar(-speed * deltaTime));
		}
	}
}

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.4.1/");

const loader = new GLTFLoader().setPath("./assets/");
loader.setDRACOLoader(dracoLoader);

// SCENE 1

loader.load("modelCompress.glb", (gltf) => {
	const model = gltf.scene;
	extScene.add(model);

	extWorldOctree.fromGraphNode(model);
	worldOctree = extWorldOctree;

	model.traverse((child) => {
		if (child.isMesh) {
			child.castShadow = true;
			child.receiveShadow = true;

			if (child.material.map) {
				child.material.map.anisotropy = 8;
			}

			if (child.name === "Door") {
				child.geometry.computeBoundingBox();
				extDoor.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld);
				extDoorMesh = child;
				door = extDoor;
			}
		}
	});

	mixer = new THREE.AnimationMixer(model);
	gltf.animations.forEach((clip) => {
		mixer.clipAction(clip).play();
	});

	animate();
});

// SCENE 2

loader.load("modelCompress2.glb", (gltf) => {
	const model = gltf.scene;

	intScene.add(model);

	intWorldOctree.fromGraphNode(model);

	model.traverse((child) => {
		if (child.isMesh) {
			child.castShadow = true;
			child.receiveShadow = true;

			if (child.material.map) {
				child.material.map.anisotropy = 8;
			}

			if (child.name === "Door") {
				child.geometry.computeBoundingBox();
				intDoor.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld);
				intDoorMesh = child;
			}
		}
	});
	intSceneisLoaded = true;
});

function animate() {
	const deltaTime = Math.min(0.1, clock.getDelta());

	mixer.update(deltaTime);

	if (isMobile) {
		controls.update();
		mobileControls(deltaTime);
	} else keyControls(deltaTime);

	let doorDistance = door.distanceToPoint(camera.position);

	if (doorDistance < 1.5) {
		testDoor();
	}

	if (isDoorActive == false && doorDistance > 2) {
		isDoorActive = true;
	}

	updatePlayer(deltaTime);

	renderer.render(scene, camera);

	stats.update();

	requestAnimationFrame(animate);
}

let door = null;
let isDoorActive = true;
let isInside = false;
let intDoor = new THREE.Box3();
let extDoor = new THREE.Box3();
let intDoorMesh = null;
let extDoorMesh = null;

function testDoor() {
	if (intSceneisLoaded && isDoorActive) {
		playerVelocity.y = 5;
		scene = isInside ? extScene : intScene;
		door = isInside ? extDoor : intDoor;
		worldOctree = isInside ? extWorldOctree : intWorldOctree;

		playerCollider.translate(
			isInside
				? new THREE.Vector3(0, 0, 0).copy(intDoorMesh.position).negate()
				: new THREE.Vector3(0, 0, 0).copy(extDoorMesh.position).negate()
		);
		playerCollider.translate(isInside ? extDoorMesh.position : intDoorMesh.position);
		camera.position.copy(playerCollider.end);

		isInside = !isInside;
		isDoorActive = false;
	}
}
