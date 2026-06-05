import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import setCharacter from "./utils/character";
import setLighting from "./utils/lighting";
import { useLoading } from "../../context/LoadingProvider";
import handleResize from "./utils/resizeUtils";
import {
  handleMouseMove,
  handleTouchEnd,
  handleHeadRotation,
  handleTouchMove,
} from "./utils/mouseUtils";
import setAnimations from "./utils/animationUtils";
import { setProgress } from "../Loading";

const Scene = () => {
  const canvasDiv = useRef<HTMLDivElement | null>(null);
  const hoverDivRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef(new THREE.Scene());
  const { setLoading } = useLoading();

  const [, setChar] = useState<THREE.Object3D | null>(null);
  useEffect(() => {
    const canvasEl = canvasDiv.current;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
      const container = { width: rect.width, height: rect.height };
      const aspect = container.width / container.height;
      const scene = sceneRef.current;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
      });
      renderer.setSize(container.width, container.height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;
      canvasEl.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(14.5, aspect, 0.1, 1000);
      camera.position.z = 10;
      camera.position.set(0, 13.1, 24.7);
      camera.zoom = 1.1;
      camera.updateProjectionMatrix();

      let headBone: THREE.Object3D | null = null;
      let jawBone: THREE.Object3D | null = null;
      let screenLight: THREE.Mesh | null = null;
      let mixer: THREE.AnimationMixer;
      let resizeHandler: () => void;
      let isSpeaking = false;

      const handleAiSpeaking = (e: Event) => {
        const customEvent = e as CustomEvent<boolean>;
        isSpeaking = customEvent.detail;
      };
      window.addEventListener('ai-speaking', handleAiSpeaking);

      const clock = new THREE.Clock();

      const light = setLighting(scene);
      const progress = setProgress((value) => setLoading(value));
      const { loadCharacter } = setCharacter(renderer, scene, camera);

      let jawBaseRotation = 0;
      let headBaseRotation = 0;

      loadCharacter().then((gltf) => {
        if (gltf) {
          const animations = setAnimations(gltf);
          if (hoverDivRef.current) { animations.hover(gltf, hoverDivRef.current); }
          mixer = animations.mixer;
          const character = gltf.scene;
          character.visible = false;
          setChar(character);
          scene.add(character);
          headBone = character.getObjectByName("spine006") || null;
          jawBone = character.getObjectByName("jaw") || character.getObjectByName("LowerJaw") || character.getObjectByName("head") || null;
          
          if (jawBone) jawBaseRotation = jawBone.rotation.x;
          if (headBone) headBaseRotation = headBone.rotation.x;

          screenLight = (character.getObjectByName("screenlight") as THREE.Mesh) || null;
          progress.loaded().then(() => {
            setTimeout(() => {
              light.turnOnLights();
              character.visible = true;
              animations.startIntro();
            }, 2500);
          });
          resizeHandler = () => handleResize(renderer, camera, canvasDiv, character);
          window.addEventListener("resize", resizeHandler);
        }
      });

      let mouse = { x: 0, y: 0 },
        interpolation = { x: 0.1, y: 0.2 };

      const onMouseMove = (event: MouseEvent) => {
        handleMouseMove(event, (x, y) => (mouse = { x, y }));
      };
      let debounce: ReturnType<typeof setTimeout> | undefined;
      const onTouchStart = (event: TouchEvent) => {
        const element = event.target as HTMLElement;
        debounce = setTimeout(() => {
          element?.addEventListener("touchmove", (e: TouchEvent) =>
            handleTouchMove(e, (x, y) => (mouse = { x, y }))
          );
        }, 200);
      };

      const onTouchEnd = () => {
        handleTouchEnd((x, y, interpolationX, interpolationY) => {
          mouse = { x, y };
          interpolation = { x: interpolationX, y: interpolationY };
        });
      };

      document.addEventListener("mousemove", (event) => {
        onMouseMove(event);
      });
      const landingDiv = document.getElementById("landingDiv");
      if (landingDiv) {
        landingDiv.addEventListener("touchstart", onTouchStart);
        landingDiv.addEventListener("touchend", onTouchEnd);
      }
      const animate = () => {
        requestAnimationFrame(animate);
        if (headBone) {
          handleHeadRotation(
            headBone,
            mouse.x,
            mouse.y,
            interpolation.x,
            interpolation.y,
            THREE.MathUtils.lerp
          );
          
          if (isSpeaking) {
             const time = clock.getElapsedTime();
             const speakingRotation = Math.sin(time * 15) * 0.05;
             if (jawBone) {
               jawBone.rotation.x = jawBaseRotation + speakingRotation;
             } else if (headBone) {
               headBone.rotation.x = headBaseRotation + (speakingRotation * 0.5);
             }
          } else {
             if (jawBone) jawBone.rotation.x = jawBaseRotation;
             // headBone rotation is handled by handleHeadRotation, so we don't reset it here
          }

          if (screenLight) { light.setPointLight(screenLight); }
        }
        const delta = clock.getDelta();
        if (mixer) {
          mixer.update(delta);
        }
        renderer.render(scene, camera);
      };
      animate();
      return () => {
        clearTimeout(debounce);
        scene.clear();
        renderer.dispose();
        window.removeEventListener("resize", resizeHandler);
        window.removeEventListener('ai-speaking', handleAiSpeaking);
        if (canvasEl) {
          canvasEl.removeChild(renderer.domElement);
        }
        if (landingDiv) {
          document.removeEventListener("mousemove", onMouseMove);
          landingDiv.removeEventListener("touchstart", onTouchStart);
          landingDiv.removeEventListener("touchend", onTouchEnd);
        }
      };
  }, []);

  return (
    <>
      <div className="character-container">
        <div className="character-model" ref={canvasDiv}>
          <div className="character-rim"></div>
          <div className="character-hover" ref={hoverDivRef}></div>
        </div>
      </div>
    </>
  );
};

export default Scene;
