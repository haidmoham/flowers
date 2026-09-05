import * as THREE from 'three';

const TAU = Math.PI * 2;
export const life = { time: { value: 0 }, pulse: { value: 0 }, glow: { value: 1 } };

// A bloom is one merged petal mesh. Its material owns its colour at every angle.
// The UV coordinates follow each petal from root to tip, including its luminous veins.
export function petalGeometry(kind = 'peony') {
  const positions = [], closedPositions = [], colors = [], uvs = [], indices = [];
  const layers = kind === 'cosmos' ? 2 : 5;
  const across = 12, along = 14;
  for (let layer = 0; layer < layers; layer++) {
    const count = kind === 'cosmos' ? 9 : 13 - layer;
    const length = kind === 'cosmos' ? 1.04 - layer * .18 : 1.12 - layer * .175;
    const width = kind === 'cosmos' ? .43 - layer * .07 : .49 - layer * .065;
    for (let petal = 0; petal < count; petal++) {
      const angle = petal / count * TAU + layer * .49 + Math.sin(petal * 4.7 + layer) * .035;
      const phase = petal * 2.39 + layer * .7;
      const start = positions.length / 3;
      for (let iy = 0; iy <= along; iy++) {
        const u = iy / along;
        for (let ix = 0; ix <= across; ix++) {
          const v = ix / across * 2 - 1;
          const breadth = width * Math.pow(Math.sin(u * Math.PI * .87), .7) * (1 + Math.sin(phase) * .055);
          const x = v * breadth;
          const ruffle = Math.sin(v * 5 + phase) * .022 * Math.pow(u, 4);
          const y = .12 + length * u * (1 - .16 * v * v * u * u) + ruffle;
          const z = -.09 + layer * .055 + (.25 + layer * .038) * u * u
            + .13 * Math.sin(u * Math.PI) + .12 * v * v * u
            + Math.sin(v * 5 + u * 4 + phase) * .025 * u;
          positions.push(x * Math.cos(angle) - y * Math.sin(angle),
            x * Math.sin(angle) + y * Math.cos(angle), z);
          const budRadius = .045 + Math.sin(u * Math.PI) * (.24 - layer * .025);
          const radial = Math.atan2(x, y);
          closedPositions.push(Math.sin(radial - angle) * budRadius,
            Math.cos(radial - angle) * budRadius, -.09 + u * (.94 - layer * .105));
          const shade = .56 + u * .36 + Math.pow(Math.abs(v), 3) * .08;
          colors.push(shade, shade, Math.min(1, shade + .06));
          uvs.push(ix / across, u);
          if (iy < along && ix < across) {
            const a = start + iy * (across + 1) + ix, b = a + across + 1;
            indices.push(a, a + 1, b, a + 1, b + 1, b);
          }
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // One shared closed shape, with a separate opening weight on each flower mesh.
  // Matching normal targets keep the light attached to the turning petal surface.
  const closed = new THREE.BufferGeometry();
  closed.setAttribute('position', new THREE.Float32BufferAttribute(closedPositions, 3));
  closed.setIndex(indices);
  closed.computeVertexNormals();
  geometry.morphAttributes.position = [closed.getAttribute('position')];
  geometry.morphAttributes.normal = [closed.getAttribute('normal')];
  closed.dispose();
  return geometry;
}

export function flowerMaterial(hex) {
  const material = new THREE.MeshPhysicalMaterial({
    color: hex, emissive: hex, emissiveIntensity: .035, vertexColors: true,
    metalness: 0, roughness: .82, sheen: .12, sheenColor: '#ffd4e4',
    sheenRoughness: .7, iridescence: .08, iridescenceIOR: 1.28,
    clearcoat: 0, specularIntensity: .2, side: THREE.DoubleSide,
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.bioTime = life.time;
    shader.uniforms.bioPulse = life.pulse;
    shader.uniforms.bioGlow = life.glow;
    // Keep the rim's color independent of the dim base emissive intensity.
    shader.uniforms.bioTint = { value: material.emissive };
    shader.vertexShader = 'varying vec2 vBio;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvBio = uv;');
    shader.fragmentShader = 'varying vec2 vBio; uniform vec3 bioTint; uniform float bioTime; uniform float bioPulse; uniform float bioGlow;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
      #include <emissivemap_fragment>
      // A broad diffuser surrounds the continuous rim. The light keeps its hue.
      float edgeDistance = min(1. - vBio.y, min(vBio.x, 1. - vBio.x) * 1.5);
      float rim = exp(-pow(edgeDistance / .045, 2.));
      float diffuser = exp(-pow(edgeDistance / .17, 2.));
      float rootFade = smoothstep(.08, .46, vBio.y);
      float vein = pow(.5 + .5 * sin(vBio.x * 38. + sin(vBio.y * 5.)), 12.);
      float breath = .94 + .06 * sin(bioTime * .6 - vBio.y * 2.);
      float energy = (.04 + diffuser * .20 + rim * .82 + vein * .018) * rootFade;
      totalEmissiveRadiance += bioTint * energy * .72 * breath * (1. + bioPulse * .22) * bioGlow;
    `);
  };
  material.customProgramCacheKey = () => 'diffused-petal-v2';
  return material;
}

const geometries = { peony: petalGeometry('peony'), cosmos: petalGeometry('cosmos') };
const pollenGeometry = new THREE.SphereGeometry(.018, 6, 4);
const pollenMaterial = new THREE.MeshStandardMaterial({ color: '#d99583', emissive: '#ff977b', emissiveIntensity: .28, roughness: .85 });
const stemMaterial = new THREE.MeshStandardMaterial({ color: '#245763', emissive: '#12303b', emissiveIntensity: .5, metalness: .5, roughness: .36 });
const leafMaterial = new THREE.MeshPhysicalMaterial({ color: '#267880', emissive: '#153847', emissiveIntensity: .35, metalness: .25, roughness: .42, side: THREE.DoubleSide, iridescence: .3 });

export function makeFlower(kind, material, seed = 0) {
  const flower = new THREE.Group();
  const petals = new THREE.Mesh(geometries[kind], material);
  petals.name = 'petals';
  flower.add(petals);
  const count = kind === 'cosmos' ? 85 : 60;
  const pollen = new THREE.InstancedMesh(pollenGeometry, pollenMaterial, count);
  pollen.name = 'pollen';
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const r = .19 * Math.sqrt(i / count), angle = i * 2.39996 + seed;
    dummy.position.set(Math.cos(angle) * r, Math.sin(angle) * r, .24 + .095 * (1 - r / .2));
    dummy.scale.set(1, 1, 1.5 + Math.sin(i) * .5);
    dummy.updateMatrix(); pollen.setMatrixAt(i, dummy.matrix);
  }
  flower.add(pollen);
  const calyx = new THREE.Mesh(new THREE.SphereGeometry(.20, 12, 8), stemMaterial);
  calyx.scale.set(1, 1, .55); calyx.position.z = -.13;
  flower.add(calyx);
  return flower;
}

function leafGeometry() {
  const positions = [], indices = [];
  for (let i = 0; i <= 14; i++) {
    const u = i / 14, width = Math.pow(Math.sin(Math.PI * u), .8) * .13;
    for (let j = 0; j < 3; j++) positions.push((j - 1) * width, u * .65, Math.sin(u * Math.PI) * (.08 + (j === 1 ? .045 : 0)));
    if (i < 14) for (let j = 0; j < 2; j++) { const a = i * 3 + j; indices.push(a,a+1,a+3,a+1,a+4,a+3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions,3)); g.setIndex(indices); g.computeVertexNormals(); return g;
}
const leafShape = leafGeometry();

export function addStem(parent, tip, index) {
  const base = new THREE.Vector3((index - 3) * .035, -2.7, -.2);
  const curve = new THREE.CubicBezierCurve3(base,
    new THREE.Vector3(tip.x * .12 + .15, -1.6, -.15),
    new THREE.Vector3(tip.x * .82, tip.y - .9, tip.z - .2), tip);
  const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, .013, 5, false), stemMaterial);
  parent.add(stem);
  const leaves = [];
  for (let i = 0; i < 3; i++) {
    const leaf = new THREE.Mesh(leafShape, leafMaterial);
    leaf.position.copy(curve.getPoint(.27 + i * .18));
    leaf.rotation.set(.4 + i * .3, index * 1.8 + i, (i % 2 ? 1 : -1) * .95);
    parent.add(leaf);
    leaves.push({mesh:leaf,arrival:.27+i*.18});
  }
  return {mesh:stem,curve,leaves,segments:80};
}

export function openFlower(flower, amount) {
  flower.getObjectByName('petals').morphTargetInfluences[0] = 1 - amount;
  const pollen = flower.getObjectByName('pollen');
  const reveal = THREE.MathUtils.smoothstep(amount, .32, .85);
  pollen.visible = reveal > 0;
  pollen.scale.setScalar(Math.max(.001, reveal));
}

export function recolor(material, hex) {
  material.color.set(hex);
  material.emissive.set(hex);
}
