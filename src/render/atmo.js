// Wspólne uniformy atmosfery + wstrzykiwanie do materiałów: mgła wysokościowa z rozpraszaniem w stronę słońca
// (perspektywa powietrzna) oraz wielkoskalowy cień terenu (tekstura widoczności słońca).
import * as THREE from 'three';

export const ATMO = {
  sunDir: { value: new THREE.Vector3(0.3, 0.8, 0.2).normalize() },
  sunColor: { value: new THREE.Color(1, 0.95, 0.85) },
  fogColor: { value: new THREE.Color(0.6, 0.7, 0.85) },
  fogDensity: { value: 0.00006 },     // gęstość na wysokości bazowej [1/m]
  fogFalloff: { value: 1 / 900 },      // spadek z wysokością [1/m]
  fogBase: { value: 900 },             // wysokość bazowa
  fogInscatter: { value: 0.9 },
  tShadow: { value: null },
  tShadowOn: { value: 0 },
  mapSize: { value: 12288 },
  time: { value: 0 },
};

const VERT_PARS = /* glsl */`
varying vec3 vWPos;
`;
const VERT_MAIN = /* glsl */`
{
  vec4 _wp = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
  _wp = instanceMatrix * _wp;
  #endif
  vWPos = ( modelMatrix * _wp ).xyz;
}
`;
export const FRAG_PARS = /* glsl */`
varying vec3 vWPos;
uniform vec3 aSunDir;
uniform vec3 aSunColor;
uniform vec3 aFogColor;
uniform float aFogDensity, aFogFalloff, aFogBase, aFogInscatter;
uniform sampler2D tShadow;
uniform float tShadowOn, aMapSize;
float terrainSunVis( vec3 p ) {
  if ( tShadowOn < 0.5 ) return 1.0;
  vec2 uv = p.xz / aMapSize + 0.5;
  return texture2D( tShadow, uv ).r;
}
vec3 applyAerial( vec3 col, vec3 p ) {
  vec3 V = p - cameraPosition;
  float d = length( V );
  float dy = V.y;
  float b = aFogFalloff;
  float h0 = exp( -b * ( cameraPosition.y - aFogBase ) );
  float k = abs( dy ) > 0.01 ? ( 1.0 - exp( -b * dy ) ) / ( b * dy ) : 1.0;
  float tau = aFogDensity * d * h0 * k;
  float f = 1.0 - exp( -tau );
  vec3 vd = V / max( d, 1e-3 );
  float sun = pow( max( dot( vd, aSunDir ), 0.0 ), 6.0 );
  vec3 fc = aFogColor + aSunColor * sun * aFogInscatter * 0.35;
  return mix( col, fc, clamp( f, 0.0, 1.0 ) );
}
`;

// Wstrzykuje do materiału (MeshStandard/Lambert/Basic) mgłę i cień terenu.
export function enhance(mat, opts = {}) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    Object.assign(sh.uniforms, {
      aSunDir: ATMO.sunDir, aSunColor: ATMO.sunColor, aFogColor: ATMO.fogColor, aFogDensity: ATMO.fogDensity,
      aFogFalloff: ATMO.fogFalloff, aFogBase: ATMO.fogBase, aFogInscatter: ATMO.fogInscatter,
      tShadow: ATMO.tShadow, tShadowOn: ATMO.tShadowOn, aMapSize: ATMO.mapSize,
    });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + VERT_PARS)
      .replace('#include <project_vertex>', '#include <project_vertex>\n' + VERT_MAIN);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + FRAG_PARS)
      .replace('getDirectionalLightInfo( directionalLight, directLight );', 'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= _tsVis;')
      .replace('#include <lights_fragment_begin>', 'float _tsVis = terrainSunVis( vWPos );\n#include <lights_fragment_begin>')
      .replace('#include <fog_fragment>', opts.noFog ? '' : 'gl_FragColor.rgb = applyAerial( gl_FragColor.rgb, vWPos );');
    if (prev) prev(sh, r);
    if (opts.onShader) opts.onShader(sh);
  };
  mat.fog = false;
  return mat;
}
