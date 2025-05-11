// import "./style.css"; // Removed due to MIME type issues; main.css is linked in index.html
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js' // Replaced with GLTFLoader
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AsciiEffect } from "three/examples/jsm/effects/AsciiEffect.js";
import html2canvas from "html2canvas";

//LightMode
let lightMode = true;

//Create a clock for rotation and animations
const clock = new THREE.Clock();

// Set rotate boolean variable
let rotateModel = false;

let controls;
let mixer; // For animations

// Holds the currently loaded model (GLTF scene)
let myMesh = null; // Will be a THREE.Group or THREE.Scene from GLTF

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0, 0, 0);

//Lights
const pointLight1 = new THREE.PointLight(0xffffff, 1, 0, 0);
pointLight1.position.set(100, 100, 400);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0xffffff, 0.5);
pointLight2.position.set(-500, 100, -400);
scene.add(pointLight2);

// GLTF Loader
const gltfLoader = new GLTFLoader();

// Default material (can be used if a GLTF model is missing materials, or for other simple meshes)
const defaultMaterial = new THREE.MeshStandardMaterial({
  flatShading: true, // This might not always be desired for GLTF models
  side: THREE.DoubleSide,
});

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Camera
const camera = new THREE.PerspectiveCamera(
  45,
  sizes.width / sizes.height,
  0.1,
  2000
);

// Renderer
const renderer = new THREE.WebGLRenderer();

let effect;

let characters = " .:-+*=%@#";
const effectSize = { amount: 0.205 };
let backgroundColor = "black";
let ASCIIColor = "white";

function createEffect() {
  effect = new AsciiEffect(renderer, characters, {
    invert: true,
    resolution: effectSize.amount,
  });
  effect.setSize(sizes.width, sizes.height);
  effect.domElement.style.color = ASCIIColor;
  effect.domElement.style.backgroundColor = backgroundColor;

  // Re-initialize OrbitControls with the new DOM element
  if (controls) {
    controls.dispose();
  }
  controls = new OrbitControls(camera, effect.domElement);
  if (myMesh) {
    // If a model exists, point controls to it
    controls.target.copy(myMesh.position);
  }
}

const asciiContainer = document.getElementById("ascii-container");

createEffect(); // Initial effect creation
if (asciiContainer) {
  asciiContainer.appendChild(effect.domElement);
} else {
  console.error("ASCII container not found, appending to body.");
  document.body.appendChild(effect.domElement);
}

// Helper function to dispose of old model resources
function disposeModel(model) {
  if (!model) return;
  model.traverse((object) => {
    if (object.isMesh) {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => {
            if (material.map) material.map.dispose();
            material.dispose();
          });
        } else {
          if (object.material.map) object.material.map.dispose();
          object.material.dispose();
        }
      }
    }
  });
}

function loadGLTFModel(url, isUploadedBuffer = false, dataBuffer = null) {
  // Clean up previous model and animations
  if (myMesh) {
    disposeModel(myMesh);
    scene.remove(myMesh);
    myMesh = null;
  }
  if (mixer) {
    mixer.stopAllAction();
    mixer = null;
  }

  const onLoad = (gltf) => {
    myMesh = gltf.scene;

    // Center the model
    const box = new THREE.Box3().setFromObject(myMesh);
    const center = box.getCenter(new THREE.Vector3());
    myMesh.position.sub(center); // Center the model at the origin

    // Optional: Apply a default rotation if models are often misaligned
    // myMesh.rotation.x = -Math.PI / 2;

    scene.add(myMesh);

    // Adjust camera to view the model
    const boundingBox = new THREE.Box3().setFromObject(myMesh);
    const modelSize = boundingBox.getSize(new THREE.Vector3());
    const modelCenter = boundingBox.getCenter(new THREE.Vector3());

    const maxDim = Math.max(modelSize.x, modelSize.y, modelSize.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.7; // Zoom out a bit

    camera.position.set(
      modelCenter.x,
      modelCenter.y + maxDim * 0.3,
      modelCenter.z + cameraZ
    );
    camera.lookAt(modelCenter);

    if (controls) {
      controls.target.copy(modelCenter);
      controls.update();
    }

    // Setup animations
    if (gltf.animations && gltf.animations.length) {
      mixer = new THREE.AnimationMixer(myMesh);
      const action = mixer.clipAction(gltf.animations[0]); // Play the first animation
      action.play();
    } else {
      console.log("No animations found in the model.");
    }
  };

  const onProgress = undefined; // Optional: (xhr) => console.log((xhr.loaded / xhr.total * 100) + '% loaded')

  const onError = (error) => {
    console.error("An error happened while loading GLTF:", error);
    alert(
      "Failed to load GLTF model. Please ensure it is a valid .glb or .gltf file."
    );
  };

  if (isUploadedBuffer && dataBuffer) {
    gltfLoader.parse(dataBuffer, "", onLoad, onError);
  } else {
    gltfLoader.load(url, onLoad, onProgress, onError);
  }
}

// Initial model load (replace with your default animated model)
// Path should be relative to the root index.html
loadGLTFModel("./models/human-brain/source/RottenBrain.glb"); // <<< ENSURE this file exists at project_root/models/animated_model.gltf

// --- Event Listeners & UI Functions ---

document
  .getElementById("file-selector")
  .addEventListener("change", openFile, false);
document.getElementById("file-selector").accept = ".glb,.gltf"; // Suggest correct file types

function openFile(evt) {
  const fileObject = evt.target.files[0];
  if (!fileObject) return;

  const reader = new FileReader();
  reader.readAsArrayBuffer(fileObject);
  reader.onload = function () {
    loadGLTFModel(null, true, this.result);
  };
  reader.onerror = function () {
    console.error("Error reading file.");
    alert("Error reading the selected file.");
  };
  // Clear the file input so the same file can be re-selected
  evt.target.value = "";
}

// Main animation loop
function tick() {
  const delta = clock.getDelta();

  if (mixer) {
    mixer.update(delta); // Update animations
  }

  if (rotateModel && myMesh) {
    myMesh.rotation.z += 0.5 * delta; // Frame-rate independent rotation
  }

  if (controls) {
    controls.update(); // Only if damping or autoRotate is enabled
  }

  render();
  window.requestAnimationFrame(tick);
}

function render() {
  effect.render(scene, camera);
}

tick(); // Start the animation loop

document
  .getElementById("screenshotButton")
  .addEventListener("click", takeScreenshot);

function takeScreenshot() {
  var container = document.body; // full page
  html2canvas(container).then(function (canvas) {
    var link = document.createElement("a");
    document.body.appendChild(link);
    link.download = "ASCII.jpg";
    link.href = canvas.toDataURL("image/jpg");
    console.log(link.href);
    // link.target = '_blank';
    link.click();
  });
}

document.getElementById("rotateButton").addEventListener("click", rotateMode);

function rotateMode() {
  rotateModel = !rotateModel;
}

document.getElementById("updateASCII").addEventListener("click", updateASCII);

function updateASCII() {
  characters = " " + "." + document.getElementById("newASCII").value;
  // createEffect will remove the old domElement if it exists by virtue of OrbitControls.dispose()
  // and then creates a new effect.domElement
  createEffect();
  if (asciiContainer) {
    // Ensure container is clear before appending new effect.
    while (asciiContainer.firstChild) {
      asciiContainer.removeChild(asciiContainer.firstChild);
    }
    asciiContainer.appendChild(effect.domElement);
  } else {
    document.body.appendChild(effect.domElement);
  }
  onWindowResize(); // Ensure effect is resized after characters change resolution potentially
}

document.getElementById("resetASCII").addEventListener("click", resetASCII);

function resetASCII() {
  characters = " .:-+*=%@#";
  // createEffect will remove the old domElement if it exists by virtue of OrbitControls.dispose()
  // and then creates a new effect.domElement
  createEffect();
  if (asciiContainer) {
    while (asciiContainer.firstChild) {
      asciiContainer.removeChild(asciiContainer.firstChild);
    }
    asciiContainer.appendChild(effect.domElement);
  } else {
    document.body.appendChild(effect.domElement);
  }
  onWindowResize();
}

document.getElementById("lightDark").addEventListener("click", lightDark);

function lightDark() {
  lightMode = !lightMode;
  if (lightMode === true) {
    document.getElementById("kofi").style.color = "white";
    document.body.style.backgroundColor = "black";

    backgroundColor = "black";
    ASCIIColor = "white";

    effect.domElement.style.color = ASCIIColor;
    effect.domElement.style.backgroundColor = backgroundColor;
  } else {
    document.getElementById("kofi").style.color = "black";
    document.body.style.backgroundColor = "white";

    backgroundColor = "white";
    ASCIIColor = "black";

    effect.domElement.style.color = ASCIIColor;
    effect.domElement.style.backgroundColor = backgroundColor;
  }
}

window.addEventListener("resize", onWindowResize);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  effect.setSize(window.innerWidth, window.innerHeight);
}

function download(filename, text) {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

document.getElementById("copyASCII").addEventListener(
  "click",
  function () {
    var text = document.getElementsByTagName("table")[0].innerText;
    var filename = "ASCII.txt";

    download(filename, text);
  },
  false
);

document.getElementById("clipboardASCII").addEventListener(
  "click",
  function () {
    const textArea = document.createElement("textarea");
    textArea.textContent = document.getElementsByTagName("td")[0].innerText;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    window.alert("ASCII copied to clipboard");
  },
  false
);
