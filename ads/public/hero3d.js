/* REALITECH ads hero — interactive holographic 3D viewport.
   Loaded lazily as a module by app.js (initHeroWebGL) only on desktop with WebGL
   and no reduced-motion. Failure here is silent: the fallback <video> stays. */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

try {
  const frame = document.getElementById("heroFrame");
  const canvas = document.getElementById("heroCanvas");
  const media = frame && frame.querySelector(".frame__media");
  if (frame && canvas && media) {
    const sizeOf = () => [media.clientWidth || 1, media.clientHeight || 1];
    let [w, h] = sizeOf();

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    cam.position.z = 4.2;

    // central holographic icosahedron: glowing wireframe + vertex points
    const group = new THREE.Group();
    scene.add(group);
    const ico = new THREE.IcosahedronGeometry(1.3, 1);
    group.add(new THREE.LineSegments(
      new THREE.WireframeGeometry(ico),
      new THREE.LineBasicMaterial({ color: 0x57cedb, transparent: true, opacity: 0.55 })
    ));
    group.add(new THREE.Points(ico, new THREE.PointsMaterial({ color: 0x82e1e8, size: 0.07 })));

    // drifting point cloud (LiDAR-ish) on a Fibonacci sphere shell
    const N = 380, pa = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const rr = 2.5 + Math.random() * 1.7;
      const th = i * 2.399963; // golden angle
      const ph = Math.acos(2 * ((i + 0.5) / N) - 1);
      pa[i * 3] = rr * Math.sin(ph) * Math.cos(th);
      pa[i * 3 + 1] = rr * Math.sin(ph) * Math.sin(th);
      pa[i * 3 + 2] = rr * Math.cos(ph);
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute("position", new THREE.BufferAttribute(pa, 3));
    const field = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0x57cedb, size: 0.035, transparent: true, opacity: 0.5 }));
    scene.add(field);

    // drag to rotate (with inertia); idle auto-rotate
    let drag = false, lx = 0, ly = 0, vx = 0, vy = 0, rotX = -0.25, rotY = 0.5;
    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", (e) => { drag = true; lx = e.clientX; ly = e.clientY; canvas.style.cursor = "grabbing"; try { canvas.setPointerCapture(e.pointerId); } catch (x) {} e.stopPropagation(); });
    canvas.addEventListener("pointermove", (e) => { if (!drag) return; vy = (e.clientX - lx) * 0.006; vx = (e.clientY - ly) * 0.006; rotY += vy; rotX += vx; lx = e.clientX; ly = e.clientY; e.stopPropagation(); });
    const endDrag = () => { drag = false; canvas.style.cursor = "grab"; };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    window.addEventListener("resize", () => { const [W, H] = sizeOf(); renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); });

    let running = true;
    const loop = () => {
      if (!running) return;
      requestAnimationFrame(loop);
      if (!drag) { rotY += 0.0026; rotX += vx; rotY += vy; vx *= 0.93; vy *= 0.93; }
      group.rotation.x = rotX; group.rotation.y = rotY;
      field.rotation.y += 0.0008; field.rotation.x += 0.0004;
      renderer.render(scene, cam);
    };
    frame.classList.add("webgl"); // CSS fades the canvas in, video out
    loop();

    // pause the loop while the hero is off-screen
    new IntersectionObserver((es) => es.forEach((e) => { running = e.isIntersecting; if (running) loop(); }), { threshold: 0.02 }).observe(frame);
  }
} catch (e) { /* keep the fallback video */ }
