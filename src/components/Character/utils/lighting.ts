import * as THREE from "three";
import { RGBELoader } from "three-stdlib";
import { gsap } from "gsap";

const setLighting = (scene: THREE.Scene) => {
  const directionalLight = new THREE.DirectionalLight(0xc7a9ff, 1.2);
  directionalLight.intensity = 1.2;
  directionalLight.position.set(2, 2, 3);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  scene.add(directionalLight);

  // 🔥 ADD THIS BLOCK (Rim Light for depth)
  const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.5);
  rimLight.position.set(-3, 2, -3);
  scene.add(rimLight);

  // 🔥 ADD THIS (soft overall light)
  const fillLight = new THREE.AmbientLight(0xe4d8ff, 0.4);
  scene.add(fillLight);

  const pointLight = new THREE.PointLight(0x9d00ff, 0.8, 20, 2);
  pointLight.position.set(0, 3, 2);
  pointLight.castShadow = true;
  scene.add(pointLight);

  new RGBELoader()
    .setPath("/models/")
    .load("char_enviorment.hdr", function (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
      scene.environmentIntensity = 1.2;
      scene.environmentRotation.set(5.76, 85.85, 1);
    });

  function setPointLight(screenLight: any) {
    if (screenLight.material.opacity > 0.9) {
      pointLight.intensity = screenLight.material.emissiveIntensity * 20;
    } else {
      pointLight.intensity = 0;
    }
  }
  const duration = 2;
  const ease = "power2.inOut";
  function turnOnLights() {
    gsap.to(scene, {
      environmentIntensity: 0.64,
      duration: duration,
      ease: ease,
    });
    gsap.fromTo(directionalLight,
      { intensity: 0 }, { intensity: 1.2, duration: duration, ease: ease }
    );
    gsap.to(".character-rim", {
      y: "55%",
      opacity: 1,
      delay: 0.2,
      duration: 2,
    });
    gsap.fromTo(
      rimLight,
      { intensity: 0 },
      { intensity: 1.5, duration: duration, ease: ease }
    );
    gsap.to(pointLight, {
      intensity: 1.2,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
    });
  }

  return { setPointLight, turnOnLights };
};

export default setLighting;
