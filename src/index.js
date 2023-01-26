import "./styles.css";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { Water } from "./Water.js";
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  SelectiveBloomEffect,
  SMAAEffect
} from "postprocessing";

/**
 * The following code demonstrates an issue where water is shaded
 * differently depending on whether bloom/postprocessing is enabled.
 *
 * When bloom is enabled the water is brighter and more washed out.
 *
 * You can see the difference by toggling this BLOOM constant:
 */
const BLOOM = false;

/**
 * Setup
 */

const textureLoader = new THREE.TextureLoader();
const rgbeLoader = new RGBELoader();

const app = document.getElementsByClassName("app")[0];
const canvas = document.getElementsByClassName("viewport")[0];

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 20000);

rgbeLoader.load("/sky.hdr", (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.background = texture;
});

const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.y = 200;
sun.target.position.y = 0;
sun.castShadow = true;
sun.shadow.camera.top = 40;
sun.shadow.camera.bottom = -40;
sun.shadow.camera.right = 40;
sun.shadow.camera.left = -40;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 1000;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);
scene.add(sun.target);

const renderer = new THREE.WebGL1Renderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
  alpha: true
});
renderer.setClearColor(0xffffff, 0);
renderer.physicallyCorrectLights = true;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const bloomEffect = new SelectiveBloomEffect(scene, camera, {
  mipmapBlur: true,
  luminanceThreshold: 1.0,
  intensity: 0.2,
  radius: 0.3
});
const composer = new EffectComposer(renderer, {
  frameBufferType: THREE.HalfFloatType
});
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new EffectPass(camera, bloomEffect);
composer.addPass(bloomPass);
const smaaPass = new EffectPass(camera, new SMAAEffect());
composer.addPass(smaaPass);

/**
 * Water
 */

const waterGeometry = new THREE.PlaneGeometry(1000, 1000);
const water = new Water(waterGeometry, {
  textureWidth: 256,
  textureHeight: 256,
  waterNormals: textureLoader.load("/waternormals.jpg", function (texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  }),
  sunDirection: new THREE.Vector3(),
  sunColor: 0xffffff,
  waterColor: 0x001e0f,
  distortionScale: 2
});
water.rotation.x = -Math.PI / 2;
water.position.y = -1;
scene.add(water);

/**
 * Red Box
 */

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const boxMaterial = new THREE.MeshStandardMaterial({ color: "red" });
const box = new THREE.Mesh(boxGeometry, boxMaterial);
box.position.z = -5;
scene.add(box);

/**
 * Resize
 */

function resize() {
  const width = app.offsetWidth;
  const height = app.offsetHeight;
  const aspect = width / height;
  canvas.width = width;
  canvas.height = height;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
}
window.addEventListener("resize", resize);
resize();

/**
 * Update + Render
 */

let lastTime = 0;
function update(time) {
  const delta = (time - lastTime) / 1000;
  lastTime = time;
  water.material.uniforms["time"].value += delta * 0.5;
  if (BLOOM) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}
renderer.setAnimationLoop(update);
