// Wielkoskalowy cień terenu: dla każdego teksela mapy marsz promienia w stronę słońca po mapie wysokości (GPU).
import * as THREE from 'three';
import { MAP } from '../world/layout.js';

const FS = /* glsl */`
precision highp float;
uniform sampler2D hMap;
uniform float mapHalf, mapCell, mapN;
uniform vec3 sunDir;
varying vec2 vUv;
float hFetch( ivec2 c ) { c = clamp( c, ivec2( 0 ), ivec2( int( mapN ) - 1 ) ); return texelFetch( hMap, c, 0 ).r; }
float H( vec2 w ) {
  float M = mapN - 1.001; vec2 u = ( w + mapHalf ) / mapCell;
  u = mix( u, -u, step( u, vec2( 0.0 ) ) ); u = mix( u, 2.0 * M - u, step( vec2( M ), u ) ); u = clamp( u, vec2( 0.0 ), vec2( M ) );
  ivec2 i = ivec2( floor( u ) ); vec2 f = u - vec2( i );
  return mix( mix( hFetch( i ), hFetch( i + ivec2( 1, 0 ) ), f.x ), mix( hFetch( i + ivec2( 0, 1 ) ), hFetch( i + ivec2( 1, 1 ) ), f.x ), f.y )
    + length( max( abs( w ) - mapHalf, 0.0 ) ) * 0.12;
}
void main() {
  vec2 w = ( vUv - 0.5 ) * mapHalf * 2.0;
  float h0 = H( w ) + 1.5;
  vec2 d2 = normalize( sunDir.xz + 1e-5 );
  float tanE = sunDir.y / max( length( sunDir.xz ), 1e-4 );
  float maxT = -10.0;
  float d = 6.0;
  for ( int k = 0; k < 110; k ++ ) {
    vec2 p = w + d2 * d;
    float t = ( H( p ) - h0 ) / d;
    maxT = max( maxT, t );
    d *= 1.055; d += 2.0;
    if ( d > 9000.0 ) break;
  }
  float vis = smoothstep( -0.035, 0.035, tanE - maxT );
  gl_FragColor = vec4( vis, vis, vis, 1.0 );
}`;

export class TerrainShadow {
  constructor(renderer, hTex, terrain, res = 1024) {
    this.renderer = renderer;
    this.rt = new THREE.WebGLRenderTarget(res, res, { type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    this.mat = new THREE.ShaderMaterial({
      uniforms: { hMap: { value: hTex }, mapHalf: { value: MAP.size / 2 }, mapCell: { value: terrain.cell }, mapN: { value: terrain.N }, sunDir: { value: new THREE.Vector3(0, 1, 0) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: FS, depthTest: false, depthWrite: false,
    });
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat));
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  get texture() { return this.rt.texture; }
  update(sunDir) {
    this.mat.uniforms.sunDir.value.copy(sunDir);
    const prev = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.rt); this.renderer.render(this.scene, this.cam);
    this.renderer.setRenderTarget(prev);
  }
}
