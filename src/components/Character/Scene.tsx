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

// ── Bone name candidates the model might use for jaw/mouth ────────────
const JAW_BONE_NAMES = [
  "jaw", "Jaw", "lowerjaw", "LowerJaw", "jaw_ctrl", "mouth", "Mouth",
  "mandible", "chin", "Chin", "DEF-jaw", "jaw_master",
];

// ── Morph target names to look for ───────────────────────────────────
const MOUTH_MORPHS = [
  "mouthOpen", "jawOpen", "JawOpen", "MouthOpen",
  "viseme_aa", "viseme_O", "viseme_PP",
];

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

    // Morph target meshes that have a mouth-open morph
    const mouthMorphMeshes: Array<{ mesh: THREE.Mesh; morphIndex: number }> = [];

    // Base values (captured once after load, never drifted)
    let jawBaseRotationX = 0;
    let headBaseRotationX = 0;

    const handleAiSpeaking = (e: Event) => {
      // Accept both old boolean format and new { speaking, source } format
      const ev = e as CustomEvent<{ speaking: boolean } | boolean>;
      const detail = ev.detail;
      isSpeaking = typeof detail === 'boolean' ? detail : detail.speaking;

      // Reset mouth immediately when speech stops
      if (!isSpeaking) {
        if (jawBone) jawBone.rotation.x = jawBaseRotationX;
        for (const { mesh, morphIndex } of mouthMorphMeshes) {
          if (mesh.morphTargetInfluences) {
            mesh.morphTargetInfluences[morphIndex] = 0;
          }
        }
      }
    };
    window.addEventListener('ai-speaking', handleAiSpeaking);

    const clock = new THREE.Clock();
    const light = setLighting(scene);
    const progress = setProgress((value) => setLoading(value));
    const { loadCharacter } = setCharacter(renderer, scene, camera);

    loadCharacter().then((gltf) => {
      if (gltf) {
        const animations = setAnimations(gltf);
        if (hoverDivRef.current) { animations.hover(gltf, hoverDivRef.current); }
        mixer = animations.mixer;
        const character = gltf.scene;
        character.visible = false;
        setChar(character);
        scene.add(character);

        // ── 1. Find head bone ─────────────────────────────────────────
        headBone = character.getObjectByName("spine006") || null;
        if (headBone) headBaseRotationX = headBone.rotation.x;

        // ── 2. Find jaw bone — exact names first, fuzzy traverse fallback ─
        for (const name of JAW_BONE_NAMES) {
          const found = character.getObjectByName(name);
          if (found) { jawBone = found; break; }
        }

        // Fuzzy fallback: traverse all objects looking for jaw/mouth/lip/chin
        if (!jawBone) {
          character.traverse((child) => {
            if (jawBone) return; // already found
            const n = child.name.toLowerCase();
            if (
              n.includes('jaw') || n.includes('mouth') ||
              n.includes('lip') || n.includes('chin') ||
              n.includes('mandib') || n.includes('muzzle')
            ) {
              // Exclude the head/spine bone itself
              if (child !== headBone) {
                jawBone = child;
              }
            }
          });
        }

        if (jawBone) {
          jawBaseRotationX = jawBone.rotation.x;
          console.log('[Scene] Using jaw bone:', jawBone.name);
        } else {
          console.log('[Scene] No jaw bone found — will use morph targets or head nod fallback');
        }

        // ── 3. Find morph targets on skinned meshes ───────────────────
        character.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh || !mesh.morphTargetDictionary) return;

          for (const morphName of MOUTH_MORPHS) {
            const idx = mesh.morphTargetDictionary[morphName];
            if (idx !== undefined && mesh.morphTargetInfluences) {
              mouthMorphMeshes.push({ mesh, morphIndex: idx });
              break; // one morph per mesh is enough
            }
          }
        });

        // ── Debug log (dev only) ───────────────────────────────────────
        if (import.meta.env.DEV) {
          console.log('[Scene] jawBone:', jawBone?.name || 'none');
          console.log('[Scene] morphTargetMeshes:', mouthMorphMeshes.length);
          // Log ALL bones and morph targets to help identify model structure
          character.traverse(c => {
            if ((c as { isBone?: boolean }).isBone || c.type === 'Bone') {
              console.log('[Scene] Bone:', c.name);
            }
            const m = c as THREE.Mesh;
            if (m.morphTargetDictionary) {
              console.log('[Scene] Morph targets on', c.name, ':', Object.keys(m.morphTargetDictionary));
            }
          });
        }

        screenLight = (character.getObjectByName("screenlight") as THREE.Mesh) || null;
        progress.loaded().then(() => {
          setTimeout(() => {
            light.turnOnLights();
            character.visible = true;
            animations.startIntro();
            // Notify RecruiterChatbot that the character is ready — welcome speech can now start
            window.dispatchEvent(new CustomEvent('character-ready', { detail: true }));
          }, 2500);
        });
        resizeHandler = () => handleResize(renderer, camera, canvasDiv, character);
        window.addEventListener("resize", resizeHandler);
      }
    });

    let mouse = { x: 0, y: 0 };
    let interpolation = { x: 0.1, y: 0.2 };

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

    document.addEventListener("mousemove", onMouseMove);
    const landingDiv = document.getElementById("landingDiv");
    if (landingDiv) {
      landingDiv.addEventListener("touchstart", onTouchStart);
      landingDiv.addEventListener("touchend", onTouchEnd);
    }

    const animate = () => {
      requestAnimationFrame(animate);

      if (headBone) {
        // ── Head follows mouse ─────────────────────────────────────
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

          // ── Primary: jaw bone oscillation ─────────────────────
          if (jawBone) {
            // Natural mouth open/close: faster frequency, higher amplitude
            const jawAngle = Math.abs(Math.sin(time * 9)) * 0.15;
            jawBone.rotation.x = jawBaseRotationX + jawAngle;
          }

          // ── Secondary: morph targets ──────────────────────────
          if (mouthMorphMeshes.length > 0) {
            const morphVal = Math.abs(Math.sin(time * 9)) * 0.6;
            for (const { mesh, morphIndex } of mouthMorphMeshes) {
              if (mesh.morphTargetInfluences) {
                mesh.morphTargetInfluences[morphIndex] = morphVal;
              }
            }
          }

          // ── Tertiary: subtle head nod if no jaw/morph ─────────
          if (!jawBone && mouthMorphMeshes.length === 0) {
            const nod = Math.sin(time * 4) * 0.012;
            headBone.rotation.x = headBaseRotationX + nod;
          }

        } else {
          // ── At rest: reset jaw and morphs ─────────────────────
          if (jawBone) jawBone.rotation.x = jawBaseRotationX;
          for (const { mesh, morphIndex } of mouthMorphMeshes) {
            if (mesh.morphTargetInfluences) {
              mesh.morphTargetInfluences[morphIndex] = 0;
            }
          }
        }

        if (screenLight) { light.setPointLight(screenLight); }
      }

      const delta = clock.getDelta();
      if (mixer) { mixer.update(delta); }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      clearTimeout(debounce);
      scene.clear();
      renderer.dispose();
      window.removeEventListener("resize", resizeHandler);
      window.removeEventListener('ai-speaking', handleAiSpeaking);
      document.removeEventListener("mousemove", onMouseMove);
      if (landingDiv) {
        landingDiv.removeEventListener("touchstart", onTouchStart);
        landingDiv.removeEventListener("touchend", onTouchEnd);
      }
      if (canvasEl) { canvasEl.removeChild(renderer.domElement); }
    };
  }, [setLoading]);

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
