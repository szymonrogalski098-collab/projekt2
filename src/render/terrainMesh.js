// Teren: CDLOD (drzewo czwórkowe łatek + geomorfing w shaderze), jedna instancjonowana siatka = 1 wywołanie rysowania.
// Wysokości z tekstury R32F (texelFetch, interpolacja jak w symulacji), normalne i pokrycie z tekstur RGBA8.
import * as THREE from 'three';
import { enhance } from './atmo.js';
import { MAP } from '../world/layout.js';

const G = 32;                 // kwadraty na łatkę
const CELL0 = 4;              // rozmiar kwadratu na poziomie 0 [m]
const P0 = G * CELL0;         // 128 m
const ROOT_L = 5;             // korzenie 4096 m
const LEVELS = ROOT_L + 1;
const RANGE0 = 260;           // zasięg poziomu 0 [m]

function patchGeometry() {
  const pos = [], idx = [];
  for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) pos.push(i, 0, j);
  const v = (i, j) => j * (G + 1) + i;
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
    const a = v(i, j), b = v(i + 1, j), c = v(i, j + 1), d = v(i + 1, j + 1);
    idx.push(a, c, d, a, d, b);
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

export class TerrainMesh {
  constructor(renderer, terrain, layers) {
    this.terrain = terrain;
    const N = terrain.N;
    this.hTex = new THREE.DataTexture(terrain.H, N, N, THREE.RedFormat, THREE.FloatType);
    this.hTex.minFilter = this.hTex.magFilter = THREE.NearestFilter; this.hTex.needsUpdate = true;
    this.nTex = new THREE.DataTexture(terrain.normalMap, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.nTex.minFilter = THREE.LinearMipmapLinearFilter; this.nTex.magFilter = THREE.LinearFilter; this.nTex.generateMipmaps = true; this.nTex.needsUpdate = true;
    this.sTex = new THREE.DataTexture(terrain.splat, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.sTex.minFilter = THREE.LinearMipmapLinearFilter; this.sTex.magFilter = THREE.LinearFilter; this.sTex.generateMipmaps = true; this.sTex.needsUpdate = true;
    // min/max wysokości łatek poziomu 0 (do odległości od kamery)
    this.buildMinMax();
    const maxInst = 1200;
    this.geo = patchGeometry();
    this.patchAttr = new THREE.InstancedBufferAttribute(new Float32Array(maxInst * 4), 4);
    this.patchAttr.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('tpatch', this.patchAttr);
    this.geo.instanceCount = 0;
    this.uniforms = {
      hMap: { value: this.hTex }, nMap: { value: this.nTex }, sMap: { value: this.sTex },
      lAlb: { value: layers.albedo }, lNrm: { value: layers.normal },
      mapHalf: { value: MAP.size / 2 }, mapCell: { value: terrain.cell }, mapN: { value: N },
      camPos: { value: new THREE.Vector3() }, range0: { value: RANGE0 },
      snowLine: { value: 2700 }, wetness: { value: 0 }, detailFade: { value: 1 },
    };
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
    const U = this.uniforms;
    enhance(mat, {
      matte: true,
      onShader: sh => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\n' + VERT_PARS)
          .replace('#include <begin_vertex>', VERT_BEGIN)
          .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\n' + FRAG_PARS)
          .replace('#include <map_fragment>', FRAG_ALBEDO)
          .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = tRough;')
          .replace('#include <normal_fragment_begin>', FRAG_NORMAL)
          .replace('#include <normal_fragment_maps>', '')
          .replace('#include <aomap_fragment>', 'reflectedLight.indirectDiffuse *= tAO; reflectedLight.indirectSpecular *= tAO;');
      },
    });
    this.material = mat;
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true; this.mesh.castShadow = false; // wielkoskalowe cienie terenu: tekstura widoczności słońca
    // materiał głębi dla cieni (ta sama deformacja wierzchołków)
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    depth.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + VERT_PARS).replace('#include <begin_vertex>', VERT_BEGIN);
    };
    this.mesh.customDepthMaterial = depth;
    this._last = new THREE.Vector3(1e9, 0, 0);
  }

  buildMinMax() {
    const T = this.terrain, N = T.N, n0 = MAP.size / P0; // 96
    const per = P0 / T.cell; // 32 tekseli
    this.mm = [];
    let lvl = { n: n0, min: new Float32Array(n0 * n0), max: new Float32Array(n0 * n0) };
    for (let j = 0; j < n0; j++) for (let i = 0; i < n0; i++) {
      let mn = 1e9, mx = -1e9;
      for (let b = 0; b <= per; b += 2) for (let a = 0; a <= per; a += 2) {
        const h = T.H[Math.min(N - 1, j * per + b) * N + Math.min(N - 1, i * per + a)];
        if (h < mn) mn = h; if (h > mx) mx = h;
      }
      lvl.min[j * n0 + i] = mn; lvl.max[j * n0 + i] = mx;
    }
    this.mm.push(lvl);
    for (let L = 1; L < LEVELS; L++) {
      const p = this.mm[L - 1], n = Math.ceil(p.n / 2);
      const l = { n, min: new Float32Array(n * n).fill(1e9), max: new Float32Array(n * n).fill(-1e9) };
      for (let j = 0; j < p.n; j++) for (let i = 0; i < p.n; i++) {
        const k = (j >> 1) * n + (i >> 1);
        l.min[k] = Math.min(l.min[k], p.min[j * p.n + i]); l.max[k] = Math.max(l.max[k], p.max[j * p.n + i]);
      }
      this.mm.push(l);
    }
  }

  // wybór łatek dla pozycji kamery
  update(camera, force = false) {
    const cp = camera.position;
    this.uniforms.camPos.value.copy(cp);
    if (!force && cp.distanceToSquared(this._last) < 4) return;
    this._last.copy(cp);
    const out = this.patchAttr.array; let n = 0;
    const half = MAP.size / 2;
    const rootSize = P0 << ROOT_L, roots = MAP.size / rootSize;
    const visit = (L, i, j) => {
      const size = P0 << L, x0 = -half + i * size, z0 = -half + j * size;
      const mm = this.mm[L], k = j * mm.n + i;
      const y0 = mm.min[k], y1 = mm.max[k];
      const dx = Math.max(x0 - cp.x, 0, cp.x - (x0 + size)), dz = Math.max(z0 - cp.z, 0, cp.z - (z0 + size)), dy = Math.max(y0 - cp.y, 0, cp.y - y1);
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (L > 0 && d < RANGE0 * (1 << (L - 1))) {
        for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) visit(L - 1, i * 2 + a, j * 2 + b);
        return;
      }
      if (n >= 1200) return;
      out[n * 4] = x0; out[n * 4 + 1] = z0; out[n * 4 + 2] = size / G; out[n * 4 + 3] = L; n++;
    };
    for (let j = 0; j < roots; j++) for (let i = 0; i < roots; i++) visit(ROOT_L, i, j);
    // pierścień zewnętrzny poza mapą (niska rozdzielczość, łagodnie wznoszący się)
    const big = rootSize;
    for (let j = -1; j <= roots; j++) for (let i = -1; i <= roots; i++) {
      if (i >= 0 && j >= 0 && i < roots && j < roots) continue;
      if (n >= 1200) break;
      out[n * 4] = -half + i * big; out[n * 4 + 1] = -half + j * big; out[n * 4 + 2] = big / G; out[n * 4 + 3] = LEVELS + 1; n++;
    }
    this.geo.instanceCount = n;
    this.patchAttr.needsUpdate = true;
    this.patchCount = n;
  }
}

const VERT_PARS = /* glsl */`
attribute vec4 tpatch;
uniform sampler2D hMap;
uniform float mapHalf, mapCell, mapN, range0;
uniform vec3 camPos;
varying float vMorph;
float hFetch( ivec2 c ) { c = clamp( c, ivec2( 0 ), ivec2( int( mapN ) - 1 ) ); return texelFetch( hMap, c, 0 ).r; }
float terrainH( vec2 w ) {
  vec2 u = ( w + mapHalf ) / mapCell;
  // poza mapą: odbicie lustrzane (ciągłość gór) + łagodne wznoszenie zamykające horyzont
  float M = mapN - 1.001;
  vec2 m = u;
  m = mix( m, -m, step( m, vec2( 0.0 ) ) );
  m = mix( m, 2.0 * M - m, step( vec2( M ), m ) );
  vec2 uc = clamp( m, vec2( 0.0 ), vec2( M ) );
  ivec2 i = ivec2( floor( uc ) ); vec2 f = uc - vec2( i );
  float h00 = hFetch( i ), h10 = hFetch( i + ivec2( 1, 0 ) ), h01 = hFetch( i + ivec2( 0, 1 ) ), h11 = hFetch( i + ivec2( 1, 1 ) );
  float h = f.x >= f.y ? h00 + f.x * ( h10 - h00 ) + f.y * ( h11 - h10 ) : h00 + f.y * ( h01 - h00 ) + f.x * ( h11 - h01 );
  vec2 o = max( abs( w ) - mapHalf, 0.0 );
  return h + length( o ) * 0.12;
}
`;

const VERT_BEGIN = /* glsl */`
vec2 gridP = position.xz;
vec2 world = tpatch.xy + gridP * tpatch.z;
float level = tpatch.w;
float hh = terrainH( world );
float rng = range0 * exp2( level );
float dist = distance( camPos, vec3( world.x, hh, world.y ) );
float morph = level > 6.5 ? 0.0 : clamp( ( dist - rng * 0.72 ) / ( rng * 0.26 ), 0.0, 1.0 );
vec2 fr = fract( gridP * 0.5 ) * 2.0;
gridP -= fr * morph;
world = tpatch.xy + gridP * tpatch.z;
hh = terrainH( world );
vec3 transformed = vec3( world.x, hh, world.y );
vMorph = morph;
`;

const FRAG_PARS = /* glsl */`
uniform sampler2D nMap, sMap;
uniform highp sampler2DArray lAlb, lNrm;
uniform float mapHalf, snowLine, wetness;
float tRough = 0.9, tAO = 1.0;
vec3 tN = vec3( 0.0, 1.0, 0.0 );
vec3 tDetailN = vec3( 0.0, 0.0, 1.0 );
float vn( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  float a = fract( sin( dot( i, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ), b = fract( sin( dot( i + vec2( 1, 0 ), vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
  float c = fract( sin( dot( i + vec2( 0, 1 ), vec2( 127.1, 311.7 ) ) ) * 43758.5453 ), d = fract( sin( dot( i + vec2( 1, 1 ), vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
  return mix( mix( a, b, f.x ), mix( c, d, f.x ), f.y ); }
vec4 samp( int l, vec2 uv ) { return texture( lAlb, vec3( uv, float( l ) ) ); }
vec4 sampN( int l, vec2 uv ) { return texture( lNrm, vec3( uv, float( l ) ) ); }
// dwie skale próbkowania + lekkie przesunięcie – mniej widoczne kafelkowanie
vec4 samp2( int l, vec2 w, float s ) { vec4 a = samp( l, w / s ), b = samp( l, w / ( s * 3.7 ) + 0.37 ); return mix( a, b, 0.35 ); }
vec4 samp2N( int l, vec2 w, float s ) { return sampN( l, w / s ); }
// skała: triplanar
vec4 rockTri( vec3 p, vec3 n, float s ) {
  vec3 bw = pow( abs( n ), vec3( 4.0 ) ); bw /= ( bw.x + bw.y + bw.z );
  return samp( 2, p.zy / s ) * bw.x + samp( 2, p.xz / s ) * bw.y + samp( 2, p.xy / s ) * bw.z;
}
`;

const FRAG_ALBEDO = /* glsl */`
vec2 muv = ( vWPos.xz + mapHalf ) / ( mapHalf * 2.0 );
vec4 nm = texture( nMap, muv );
tN = normalize( nm.xyz * 2.0 - 1.0 );
float cav = nm.a;
vec4 sp = texture( sMap, muv );
float h = vWPos.y;
float slope = 1.0 - tN.y;
float mac = vn( vWPos.xz / 180.0 ) * 0.6 + vn( vWPos.xz / 47.0 ) * 0.4;
float mac2 = vn( vWPos.xz / 900.0 + 7.0 );
vec2 w = vWPos.xz;
float camD = distance( cameraPosition, vWPos );
// warstwy
vec4 grass = samp2( 0, w, 9.0 );
vec4 field = samp2( 7, w, 11.0 );
float valley = ( 1.0 - smoothstep( 1000.0, 1180.0, h + mac * 60.0 ) ) * ( 1.0 - smoothstep( 0.12, 0.25, slope ) );
vec4 col = mix( grass, field, valley * 0.85 );
// mozaika pól w dolinie (odcień każdej działki)
{ vec2 fp = mat2( 0.96, 0.28, -0.28, 0.96 ) * w / vec2( 70.0, 38.0 ); vec2 fi = floor( fp ); float fh = fract( sin( dot( fi, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
  vec3 tint = fh < 0.25 ? vec3( 1.15, 1.05, 0.7 ) : fh < 0.5 ? vec3( 0.85, 0.95, 0.8 ) : fh < 0.75 ? vec3( 1.0, 1.0, 1.0 ) : vec3( 1.08, 1.1, 0.85 );
  vec2 ff = abs( fract( fp ) - 0.5 ); float edge = smoothstep( 0.47, 0.5, max( ff.x, ff.y ) );
  col.rgb *= mix( vec3( 1.0 ), tint * ( 1.0 - edge * 0.12 ), valley * ( 1.0 - smoothstep( 0.05, 0.3, sp.r ) ) * ( 1.0 - smoothstep( 800.0, 2500.0, camD ) * 0.5 ) ); }
// odcień traw z wysokością: wyżej suchsze, żółtobrązowe
col.rgb *= mix( vec3( 1.0 ), vec3( 1.12, 0.98, 0.72 ), smoothstep( 1500.0, 2100.0, h + mac2 * 200.0 ) );
col.rgb *= 0.85 + 0.3 * mac;
vec4 forest = samp2( 1, w, 7.0 );
col = mix( col, forest, smoothstep( 0.15, 0.6, sp.r ) );
vec4 scree = samp2( 3, w, 6.0 );
float screeW = clamp( sp.g * 1.6 + smoothstep( 0.35, 0.55, slope ) * 0.4 * smoothstep( 1600.0, 2000.0, h ), 0.0, 1.0 );
col = mix( col, scree, screeW );
vec4 rock = rockTri( vWPos, tN, 14.0 );
rock.rgb *= 0.8 + 0.4 * mac2;
float rT = mix( 0.27, 0.16, smoothstep( 1500.0, 2200.0, h + ( mac2 - 0.5 ) * 300.0 ) );
float rockW = smoothstep( rT, rT + 0.1, slope + ( mac - 0.5 ) * 0.12 );
col = mix( col, rock, rockW );
// śnieg: granica zależna od ekspozycji (stoki północne niżej) i szumu
float sl = snowLine + ( mac2 - 0.5 ) * 350.0 + tN.z * 320.0 - ( cav - 0.5 ) * 400.0;
float snowW = smoothstep( sl - 50.0, sl + 80.0, h ) * ( 1.0 - smoothstep( 0.18, 0.4, slope - cav * 0.25 + 0.1 ) );
vec4 snow = samp2( 4, w, 10.0 );
col = mix( col, snow, snowW );
vec4 ice = samp2( 6, w, 30.0 );
col = mix( col, ice, sp.a * ( 1.0 - rockW * 0.5 ) );
vec4 road = samp2( 5, w, 6.0 );
col = mix( col, road, smoothstep( 0.2, 0.7, sp.b ) );
// szczegółowa normalna z warstw
vec3 dn = vec3( 0.0, 0.0, 1.0 );
dn = mix( dn, samp2N( 0, w, 9.0 ).xyz * 2.0 - 1.0, 1.0 - rockW );
dn = mix( dn, sampN( 2, vWPos.xz / 14.0 ).xyz * 2.0 - 1.0, rockW );
dn = mix( dn, samp2N( 3, w, 6.0 ).xyz * 2.0 - 1.0, screeW * ( 1.0 - rockW ) );
dn = mix( dn, sampN( 4, w / 10.0 ).xyz * 2.0 - 1.0, snowW );
tDetailN = normalize( vec3( dn.xy * ( 1.0 - smoothstep( 300.0, 1500.0, camD ) ), 1.0 ) );
diffuseColor.rgb = col.rgb;
tRough = col.a;
tAO = mix( 0.45, 1.0, smoothstep( 0.2, 0.6, cav ) ) * ( 1.0 - 0.25 * smoothstep( 0.3, 0.8, sp.r ) );
diffuseColor.rgb *= mix( 0.7, 1.0, smoothstep( 0.25, 0.55, cav ) );
`;

const FRAG_NORMAL = /* glsl */`
vec3 T = normalize( vec3( 1.0, 0.0, 0.0 ) - tN * tN.x );
vec3 B = normalize( cross( tN, T ) );
vec3 nW = normalize( T * tDetailN.x - B * tDetailN.y + tN * tDetailN.z );
vec3 normal = normalize( ( viewMatrix * vec4( nW, 0.0 ) ).xyz );
vec3 nonPerturbedNormal = normal;
float faceDirection = 1.0;
`;
