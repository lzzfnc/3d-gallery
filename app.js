import * as THREE from 'https://cdn.skypack.dev/three@0.129.0';

import Stats from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/libs/stats.module.js';

import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js';
import { Octree } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/math/Octree.js';
import { Capsule } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/math/Capsule.js';
        
let mixer
const clock = new THREE.Clock();

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x88ccff );

const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.rotation.order = 'YXZ';

const ambientlight = new THREE.AmbientLight( 0x6688cc );
scene.add(ambientlight);

const fillLight1 = new THREE.DirectionalLight( 0xffffee, 0.5 );
fillLight1.position.set( - 1, 1, 2 );
scene.add( fillLight1 );

const fillLight2 = new THREE.DirectionalLight( 0xffffee, 0.2 );
fillLight2.position.set( 0, - 1, 0 );
scene.add( fillLight2 );

const directionalLight = new THREE.DirectionalLight( 0xffffaa, 1.2 );
directionalLight.position.set( - 5, 25, - 1 );
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = 0.01;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.left = - 30;
directionalLight.shadow.camera.top	= 30;
directionalLight.shadow.camera.bottom = - 30;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.radius = 4;
directionalLight.shadow.bias = - 0.00006;
scene.add( directionalLight );

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;

const container = document.getElementById( 'container' );

container.appendChild( renderer.domElement );

const stats = new Stats();
stats.domElement.style.position = 'absolute';
stats.domElement.style.top = '64px';
stats.domElement.style.left = '64px';

container.appendChild( stats.domElement );

const GRAVITY = 30;

const worldOctree = new Octree();

const playerCollider = new Capsule( new THREE.Vector3( 0, 0.35, 0 ), new THREE.Vector3( 0, 1.5, 0 ), 0.35 );

const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

let playerOnFloor = false;

const keyStates = {};

document.addEventListener( 'keydown', ( event ) => {

    keyStates[ event.code ] = true;

} );

document.addEventListener( 'keyup', ( event ) => {

    keyStates[ event.code ] = false;

} );

document.addEventListener( 'mousedown', () => {

    document.body.requestPointerLock();

} );

document.body.addEventListener( 'mousemove', ( event ) => {

    if ( document.pointerLockElement === document.body ) {

        camera.rotation.y -= event.movementX / 500;
        camera.rotation.x -= event.movementY / 500;

    }

} );

window.addEventListener( 'resize', onWindowResize );

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function playerCollitions() {

    const result = worldOctree.capsuleIntersect( playerCollider );

    playerOnFloor = false;

    if ( result ) {

        playerOnFloor = result.normal.y > 0;

        if ( ! playerOnFloor ) {

            playerVelocity.addScaledVector( result.normal, - result.normal.dot( playerVelocity ) );

        }

        playerCollider.translate( result.normal.multiplyScalar( result.depth ) );

    }

}

function updatePlayer( deltaTime ) {

    if ( playerOnFloor ) {

        const damping = Math.exp( - 3 * deltaTime ) - 1;
        playerVelocity.addScaledVector( playerVelocity, damping );

    } else {

        playerVelocity.y -= GRAVITY * deltaTime;

    }

    const deltaPosition = playerVelocity.clone().multiplyScalar( deltaTime );
    playerCollider.translate( deltaPosition );

    playerCollitions();

    camera.position.copy( playerCollider.end );

}


function getForwardVector() {

    camera.getWorldDirection( playerDirection );
    playerDirection.y = 0;
    playerDirection.normalize();

    return playerDirection;

}

function getSideVector() {

    camera.getWorldDirection( playerDirection );
    playerDirection.y = 0;
    playerDirection.normalize();
    playerDirection.cross( camera.up );

    return playerDirection;

}

function controls( deltaTime ) {

    const speed = 25;

    if ( playerOnFloor ) {

        if ( keyStates[ 'KeyW' ] ) {

            playerVelocity.add( getForwardVector().multiplyScalar( speed * deltaTime ) );

        }

        if ( keyStates[ 'KeyS' ] ) {

            playerVelocity.add( getForwardVector().multiplyScalar( - speed * deltaTime ) );

        }

        if ( keyStates[ 'KeyA' ] ) {

            playerVelocity.add( getSideVector().multiplyScalar( - speed * deltaTime ) );

        }

        if ( keyStates[ 'KeyD' ] ) {

            playerVelocity.add( getSideVector().multiplyScalar( speed * deltaTime ) );

        }

        if ( keyStates[ 'Space' ] ) {

            playerVelocity.y = 5;

        }

    }

}

const loader = new GLTFLoader().setPath( './assets/' );

loader.load( 'model.glb', ( gltf ) => {

    const model = gltf.scene

    scene.add(model);
    
    worldOctree.fromGraphNode( gltf.scene );

    model.traverse( child => {

        if ( child.isMesh ) {

            child.castShadow = true;
            child.receiveShadow = true;

            if ( child.material.map ) {

                child.material.map.anisotropy = 8;

            }

        }

    });

    mixer = new THREE.AnimationMixer(model);
    mixer.clipAction( gltf.animations[0] ).play();
    


    animate();

} );

function animate() {

    const deltaTime = Math.min( 0.1, clock.getDelta() );


    mixer.update( deltaTime );

    controls( deltaTime );

    updatePlayer( deltaTime );

   
    renderer.render( scene, camera );

    stats.update();

    requestAnimationFrame( animate );

}
