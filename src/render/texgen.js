// Proceduralne tekstury materiałów terenu generowane na GPU (kafelkowalne, szum okresowy) do tablic tekstur.
import * as THREE from 'three';

export const LAYERS = ['grass', 'forest', 'rock', 'scree', 'snow', 'road', 'ice', 'field'];

const COMMON = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform int layer;
uniform int mode; // 0 = albedo+szorstkość, 1 = normalna+wysokość
vec2 h22( vec2 p ) { vec3 a = fract( p.xyx * vec3( 0.1031, 0.1030, 0.0973 ) ); a += dot( a, a.yzx + 33.33 ); return fract( ( a.xx + a.yz ) * a.zy ); }
float h21( vec2 p ) { vec3 a = fract( vec3( p.xyx ) * 0.1031 ); a += dot( a, a.yzx + 33.33 ); return fract( ( a.x + a.y ) * a.z ); }
float pn( vec2 p, float per ) {
  vec2 i = floor( p ), f = fract( p ), u = f * f * f * ( f * ( f * 6.0 - 15.0 ) + 10.0 );
  vec2 g00 = h22( mod( i, per ) ) * 2.0 - 1.0, g10 = h22( mod( i + vec2( 1, 0 ), per ) ) * 2.0 - 1.0;
  vec2 g01 = h22( mod( i + vec2( 0, 1 ), per ) ) * 2.0 - 1.0, g11 = h22( mod( i + vec2( 1, 1 ), per ) ) * 2.0 - 1.0;
  return mix( mix( dot( g00, f ), dot( g10, f - vec2( 1, 0 ) ), u.x ), mix( dot( g01, f - vec2( 0, 1 ) ), dot( g11, f - vec2( 1, 1 ) ), u.x ), u.y ) * 1.5;
}
float fbm( vec2 p, float per, int oct ) { float s = 0.0, a = 0.5; for ( int i = 0; i < 8; i ++ ) { if ( i >= oct ) break; s += a * pn( p, per ); p *= 2.0; per *= 2.0; a *= 0.5; } return s; }
// Voronoi okresowy: x = odl. do najbliższego, y = do drugiego, z = id
vec3 vor( vec2 p, float per ) {
  vec2 i = floor( p ), f = fract( p ); float d1 = 8.0, d2 = 8.0, id = 0.0;
  for ( int y = -1; y <= 1; y ++ ) for ( int x = -1; x <= 1; x ++ ) {
    vec2 g = vec2( x, y ), o = h22( mod( i + g, per ) ); vec2 r = g + o - f; float d = dot( r, r );
    if ( d < d1 ) { d2 = d1; d1 = d; id = h21( mod( i + g, per ) ); } else if ( d < d2 ) d2 = d;
  }
  return vec3( sqrt( d1 ), sqrt( d2 ), id );
}
vec3 lin( vec3 c ) { return pow( c, vec3( 2.2 ) ); }
// zwraca vec4(albedo, szorstkość) oraz wysokość (h) przez out
vec4 layerColor( int L, vec2 uv, out float h ) {
  vec2 p = uv * 8.0;
  if ( L == 0 ) { // trawa alpejska
    float n = fbm( p, 8.0, 6 ), n2 = fbm( p * 4.0, 32.0, 4 );
    float blade = pn( vec2( uv.x * 180.0, uv.y * 60.0 ), 60.0 ) * 0.5 + pn( uv * 300.0, 300.0 ) * 0.5;
    vec3 c = mix( lin( vec3( 0.33, 0.42, 0.18 ) ), lin( vec3( 0.46, 0.50, 0.24 ) ), smoothstep( -0.3, 0.4, n ) );
    c = mix( c, lin( vec3( 0.52, 0.48, 0.30 ) ), smoothstep( 0.25, 0.6, n2 ) * 0.5 );
    c *= 0.8 + 0.35 * blade;
    float fl = step( 0.985, h21( floor( uv * 220.0 ) ) ) * step( 0.3, n );
    c = mix( c, lin( vec3( 0.85, 0.8, 0.5 ) ), fl * 0.6 );
    h = 0.5 + 0.3 * blade + 0.2 * n; return vec4( c, 0.92 );
  }
  if ( L == 1 ) { // ściółka leśna
    float n = fbm( p, 8.0, 6 ); vec3 v = vor( uv * 40.0, 40.0 );
    vec3 c = mix( lin( vec3( 0.22, 0.17, 0.10 ) ), lin( vec3( 0.20, 0.25, 0.12 ) ), smoothstep( -0.2, 0.5, n ) );
    float needles = pn( uv * 400.0, 400.0 ); c *= 0.75 + 0.3 * needles;
    c = mix( c, lin( vec3( 0.3, 0.33, 0.18 ) ), smoothstep( 0.3, 0.1, v.x ) * 0.4 );
    h = 0.4 + 0.3 * n + 0.2 * needles; return vec4( c, 0.95 );
  }
  if ( L == 2 ) { // skała (granit z pęknięciami i porostami)
    float n = fbm( p * 0.5, 4.0, 7 ); vec3 v = vor( uv * 10.0, 10.0 ); vec3 v2 = vor( uv * 34.0, 34.0 );
    float crack = smoothstep( 0.0, 0.06, v.y - v.x ) * smoothstep( 0.0, 0.04, v2.y - v2.x );
    vec3 c = mix( lin( vec3( 0.27, 0.26, 0.25 ) ), lin( vec3( 0.43, 0.41, 0.38 ) ), smoothstep( -0.4, 0.5, n ) );
    c *= 0.85 + 0.25 * v.z;
    float lich = smoothstep( 0.35, 0.6, fbm( uv * 24.0 + 3.0, 24.0, 4 ) );
    c = mix( c, lin( vec3( 0.55, 0.55, 0.38 ) ), lich * 0.35 );
    c *= 0.45 + 0.55 * crack;
    h = 0.5 + 0.35 * n + 0.15 * v.z - ( 1.0 - crack ) * 0.4; return vec4( c, 0.8 );
  }
  if ( L == 3 ) { // piarg / żwir
    vec3 v = vor( uv * 70.0, 70.0 ), v2 = vor( uv * 160.0, 160.0 );
    float peb = smoothstep( 0.55, 0.1, v.x ), peb2 = smoothstep( 0.6, 0.1, v2.x );
    vec3 c = mix( lin( vec3( 0.40, 0.38, 0.35 ) ), lin( vec3( 0.58, 0.56, 0.52 ) ), v.z );
    c = mix( c, mix( lin( vec3( 0.35, 0.34, 0.32 ) ), lin( vec3( 0.6, 0.58, 0.55 ) ), v2.z ), 0.4 );
    c *= 0.55 + 0.45 * max( peb, peb2 * 0.8 );
    h = peb * 0.7 + peb2 * 0.3; return vec4( c, 0.85 );
  }
  if ( L == 4 ) { // śnieg
    float n = fbm( p * 0.7, 5.6, 6 ), s = pn( uv * 90.0, 90.0 );
    vec3 c = mix( lin( vec3( 0.86, 0.88, 0.92 ) ), lin( vec3( 0.95, 0.96, 0.98 ) ), smoothstep( -0.3, 0.4, n ) );
    c *= 0.97 + 0.03 * s;
    h = 0.5 + 0.4 * n + 0.1 * s; return vec4( c, 0.55 );
  }
  if ( L == 5 ) { // droga szutrowa/asfalt
    float n = fbm( p, 8.0, 5 ); vec3 v = vor( uv * 200.0, 200.0 );
    vec3 c = mix( lin( vec3( 0.30, 0.29, 0.27 ) ), lin( vec3( 0.42, 0.40, 0.37 ) ), smoothstep( -0.3, 0.4, n ) );
    c *= 0.85 + 0.2 * v.z;
    h = 0.5 + 0.2 * n + 0.2 * smoothstep( 0.5, 0.1, v.x ); return vec4( c, 0.9 );
  }
  if ( L == 6 ) { // lód lodowcowy
    float n = fbm( p * 0.5, 4.0, 6 ); vec3 v = vor( uv * 6.0, 6.0 );
    float crack = smoothstep( 0.0, 0.03, v.y - v.x );
    vec3 c = mix( lin( vec3( 0.55, 0.68, 0.78 ) ), lin( vec3( 0.80, 0.88, 0.93 ) ), smoothstep( -0.4, 0.5, n ) );
    c = mix( lin( vec3( 0.25, 0.35, 0.45 ) ), c, 0.4 + 0.6 * crack );
    h = 0.5 + 0.3 * n - ( 1.0 - crack ) * 0.3; return vec4( c, 0.35 );
  }
  // 7: łąka w dolinie (koszona, soczysta)
  float n = fbm( p, 8.0, 6 );
  float stripe = 0.5 + 0.5 * sin( uv.x * 6.2831 * 24.0 + pn( uv * 8.0, 8.0 ) * 2.0 );
  float blade = pn( vec2( uv.x * 240.0, uv.y * 80.0 ), 80.0 );
  vec3 c = mix( lin( vec3( 0.28, 0.40, 0.14 ) ), lin( vec3( 0.36, 0.47, 0.18 ) ), smoothstep( -0.3, 0.4, n ) );
  c *= 0.9 + 0.12 * stripe; c *= 0.85 + 0.25 * blade;
  h = 0.5 + 0.3 * blade + 0.2 * n; return vec4( c, 0.9 );
}
void main() {
  float h;
  vec4 c = layerColor( layer, vUv, h );
  if ( mode == 0 ) { gl_FragColor = c; return; }
  // normalna z gradientu wysokości (różnice skończone)
  float e = 1.0 / 512.0, hx, hy, t;
  layerColor( layer, fract( vUv + vec2( e, 0.0 ) ), hx ); layerColor( layer, fract( vUv + vec2( 0.0, e ) ), hy );
  float str = layer == 2 ? 3.0 : layer == 3 ? 2.2 : layer == 6 ? 1.5 : 1.0;
  vec3 n = normalize( vec3( ( h - hx ) * str * 6.0, ( h - hy ) * str * 6.0, 1.0 ) );
  gl_FragColor = vec4( n.xy * 0.5 + 0.5, h, 1.0 );
}`;

export function generateLayerTextures(renderer, size = 512) {
  const make = () => {
    const rt = new THREE.WebGLArrayRenderTarget(size, size, LAYERS.length, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat });
    rt.texture.generateMipmaps = true; rt.texture.minFilter = THREE.LinearMipmapLinearFilter; rt.texture.magFilter = THREE.LinearFilter;
    rt.texture.wrapS = rt.texture.wrapT = THREE.RepeatWrapping; rt.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return rt;
  };
  const albedo = make(), normal = make();
  const mat = new THREE.ShaderMaterial({ uniforms: { layer: { value: 0 }, mode: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: COMMON, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const scene = new THREE.Scene(); scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const prevRT = renderer.getRenderTarget();
  for (let l = 0; l < LAYERS.length; l++) {
    mat.uniforms.layer.value = l;
    mat.uniforms.mode.value = 0; renderer.setRenderTarget(albedo, l); renderer.render(scene, cam);
    mat.uniforms.mode.value = 1; renderer.setRenderTarget(normal, l); renderer.render(scene, cam);
  }
  renderer.setRenderTarget(prevRT);
  mat.dispose(); quad.geometry.dispose();
  return { albedo: albedo.texture, normal: normal.texture, rts: [albedo, normal] };
}
