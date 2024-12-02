import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFloader.js';
import * as CANNON from 'cannon-es';
import GUI from 'lil-gui';

/**
 * Debug
 */
const gui = new GUI();
const debugObject = {};

// gui.hide(); //self explanatory

debugObject.createSphere = () => {
  const angle = Math.random() * Math.PI * 2;
  const radius = 12 + Math.random() * 2;

  createSphere(
    Math.random() * 0.5 + 0.2,
    {
      x: Math.sin(angle) * radius,
      y: 12,
      z: Math.cos(angle) * radius,
    },
    {
      x: Math.cos(angle) * radius * 50,
      y: 15,
      z: Math.sin(angle) * radius * 50,
    }
  );
  // console.log(
  //   'x: ' + Math.sin(angle) * radius + ', z: ' + Math.cos(angle) * radius
  // );
};

debugObject.reset = () => {
  for (const object of objectsToUpdate) {
    // Remove body
    object.body.removeEventListener('collide', playHitSound);
    world.removeBody(object.body);

    // Remove mesh
    scene.remove(object.mesh);
  }
  // Clear the array!
  objectsToUpdate.splice(0, objectsToUpdate.length);
};

gui.add(debugObject, 'createSphere');
gui.add(debugObject, 'reset');

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

/**
 * Audio
 */
// const hitSound = [];
// for (let i = 0; i < 7; i++) {
//   hitSound[i] = new Audio('./audio/_0' + (i + 1) + '_rock.wav');
// }
const hitSound = new Audio('./audio/_02_rock.wav');

const playHitSound = (collision) => {
  const impactStrength = collision.contact.getImpactVelocityAlongNormal();

  // let currentHitSound = Math.floor(Math.random(7));
  // console.log(currentHitSound);
  if (impactStrength > 0.2) {
    // console.log(collision.body.id);
    hitSound.volume = Math.random();
    hitSound.currentTime = 0;
    hitSound.play();
  }
};

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader();
const cubeTextureLoader = new THREE.CubeTextureLoader();

const environmentMap = cubeTextureLoader.load([
  '/textures/environmentMaps/3/px.png',
  '/textures/environmentMaps/3/nx.png',
  '/textures/environmentMaps/3/py.png',
  '/textures/environmentMaps/3/ny.png',
  '/textures/environmentMaps/3/pz.png',
  '/textures/environmentMaps/3/nz.png',
]);

// Environment & background
scene.environmentIntensity = 1;
scene.backgroundBlurriness = 0.1;
scene.backgroundIntensity = 2;
scene.backgroundRotation.y = 4;
scene.environment = environmentMap;
scene.background = environmentMap;

/**
 * Physics
 */
// World
const world = new CANNON.World();
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.gravity.set(0, -9.82, 0);

// Materials (for collision)
const defaultMaterial = new CANNON.Material('default');

const defaultContactMaterial = new CANNON.ContactMaterial(
  defaultMaterial,
  defaultMaterial,
  {
    friction: 0.9, // 0.3 default
    restitution: 0.18, // 0.3 default
  }
);
world.addContactMaterial(defaultContactMaterial);
world.defaultContactMaterial = defaultContactMaterial;

// Floor
const tempFunc = (collision) => {
  console.log(collision.contact);
};

const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body();
// floorBody.material = defaultMaterial;
floorBody.mass = 0; // Tell CANNON it is a static object. Default is 0 so technically can omit.
floorBody.addShape(floorShape);
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5); // Must rotate physics plane like in Three.js but CANNON uses quternions
floorBody.addEventListener('collide', tempFunc);
world.addBody(floorBody);

/**
 * Floor
 */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({
    color: '#777777',
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMap,
    envMapIntensity: 0.5,
  })
);
floor.receiveShadow = true;
floor.rotation.x = -Math.PI * 0.5;
scene.add(floor);

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 2.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.camera.left = -7;
directionalLight.shadow.camera.top = 7;
directionalLight.shadow.camera.right = 7;
directionalLight.shadow.camera.bottom = -7;
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener('resize', () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  90,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(0, -6, 0);
scene.add(camera);

/**
 * Controls
 */
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Utilities
 */
const objectsToUpdate = [];

// Sphere
const sphereGeometry = new THREE.SphereGeometry(1, 20, 30);
const sphereMaterial = new THREE.MeshStandardMaterial({
  color: 'rgb(65, 82, 54)',
  metalness: 0.3,
  roughness: 0.4,
  envMap: environmentMap,
});

const createSphere = (radius, position, forceAngle) => {
  // Three.js mesh
  const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  mesh.scale.set(radius, radius, radius);
  mesh.castShadow = true;
  mesh.position.copy(position);
  scene.add(mesh);

  // CANNON.js body
  const shape = new CANNON.Sphere(radius);
  const body = new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(0, 3, 0),
    shape,
    material: defaultMaterial,
  });
  body.position.copy(position);
  body.applyLocalForce(forceAngle, new CANNON.Vec3(0, 0, 0));

  // let currentHitSound = Math.floor(Math.random(0, 7));
  // console.log(currentHitSound);

  body.addEventListener('collide', playHitSound);
  world.addBody(body);

  // Save in objectsToUpdate
  objectsToUpdate.push({
    mesh: mesh,
    body: body,
  });
};
// createSphere(0.5, { x: 0, y: 3, z: 0 });

// Create & delete shapes timer
(function loop() {
  let rand = Math.round(Math.random() * (2000 - 150)) + 150;
  setTimeout(function () {
    // console.log('Hello World!');
    const angle = Math.random() * Math.PI * 2;
    const radius = 12 + Math.random() * 2;
    createSphere(
      Math.random() * 0.5 + 0.2,
      {
        x: Math.sin(angle) * radius,
        y: 12,
        z: Math.cos(angle) * radius,
      },
      {
        x: Math.cos(angle) * radius * 50,
        y: 15,
        z: Math.sin(angle) * radius * 50,
      }
    );
    loop();
    // console.log(objectsToUpdate);
    if (objectsToUpdate.length >= 10) {
      for (const object of objectsToUpdate) {
        // Remove body
        object.body.removeEventListener('collide', playHitSound);
        world.removeBody(object.body);

        // Remove mesh
        scene.remove(object.mesh);
      }
      // Clear the array!
      objectsToUpdate.splice(0, 6);
    }
  }, rand);
})();

/**
 * Animate
 */
const clock = new THREE.Clock();
let oldElapsedTime = 0;

const tick = () => {
  // Time
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;

  // Update physics
  world.step(1 / 60, deltaTime, 3);
  for (const object of objectsToUpdate) {
    object.mesh.position.copy(object.body.position);
    object.mesh.quaternion.copy(object.body.quaternion);
  }

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
