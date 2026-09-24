// Niebo fizyczne (model Preethama) z warstwą chmur + ten sam model w JS do koloru mgły i światła słońca.
import * as THREE from 'three';

const VS = /* glsl */`
uniform vec3 sunPosition;
uniform float rayleigh, turbidity, mieCoefficient;
varying vec3 vWorldPosition, vSunDirection, vBetaR, vBetaM;
varying float vSunfade, vSunE;
const float e = 2.718281828459045;
const vec3 totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );
const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );
const float cutoffAngle = 1.6110731556870734, steepness = 1.5, EE = 1000.0;
float sunIntensity( float c ) { c = clamp( c, -1.0, 1.0 ); return EE * max( 0.0, 1.0 - pow( e, -( ( cutoffAngle - acos( c ) ) / steepness ) ) ); }
vec3 totalMie( float T ) { float c = ( 0.2 * T ) * 10E-18; return 0.434 * c * MieConst; }
void main() {
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vWorldPosition = wp.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  vSunDirection = normalize( sunPosition );
  vSunE = sunIntensity( vSunDirection.y );
  vSunfade = 1.0 - clamp( 1.0 - exp( ( sunPosition.y / 450000.0 ) ), 0.0, 1.0 );
  float rc = rayleigh - ( 1.0 * ( 1.0 - vSunfade ) );
  vBetaR = totalRayleigh * rc;
  vBetaM = totalMie( turbidity ) * mieCoefficient;
}`;

const FS = /* glsl */`
varying vec3 vWorldPosition, vSunDirection, vBetaR, vBetaM;
varying float vSunE;
uniform float mieDirectionalG, cloudCover, cloudTime, showSunDisc, skyGain, night;
uniform vec3 cloudTint;
const float pi = 3.141592653589793;
const float rayleighZenithLength = 8.4E3, mieZenithLength = 1.25E3;
const float sunAngularDiameterCos = 0.99995;
float rayleighPhase( float c ) { return 0.05968310365946075 * ( 1.0 + c * c ); }
float hgPhase( float c, float g ) { float g2 = g * g; return 0.07957747154594767 * ( 1.0 - g2 ) / pow( 1.0 - 2.0 * g * c + g2, 1.5 ); }
vec2 grad( vec2 i ) { vec3 p = fract( i.xyx * vec3( 0.1031, 0.1030, 0.0973 ) ); p += dot( p, p.yzx + 33.33 ); return fract( ( p.xx + p.yz ) * p.zy ) * 2.0 - 1.0; }
float gnoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); vec2 u = f * f * f * ( f * ( f * 6.0 - 15.0 ) + 10.0 );
  return mix( mix( dot( grad( i ), f ), dot( grad( i + vec2( 1, 0 ) ), f - vec2( 1, 0 ) ), u.x ), mix( dot( grad( i + vec2( 0, 1 ) ), f - vec2( 0, 1 ) ), dot( grad( i + vec2( 1, 1 ) ), f - vec2( 1, 1 ) ), u.x ), u.y ) * 1.6; }
float fbm( vec2 p ) { float r = 0.0, a = 1.0; for ( int i = 0; i < 5; i ++ ) { r += a * gnoise( p ); a *= 0.5; p = p * 2.03 + vec2( 1.7, 9.2 ); } return r; }
float hash13( vec3 p ) { p = fract( p * 0.1031 ); p += dot( p, p.zyx + 31.32 ); return fract( ( p.x + p.y ) * p.z ); }
void main() {
  vec3 dir = normalize( vWorldPosition - cameraPosition );
  float zen = acos( max( 0.0, dir.y ) );
  float inv = 1.0 / ( cos( zen ) + 0.15 * pow( 93.885 - ( ( zen * 180.0 ) / pi ), -1.253 ) );
  vec3 Fex = exp( -( vBetaR * rayleighZenithLength * inv + vBetaM * mieZenithLength * inv ) );
  float ct = dot( dir, vSunDirection );
  vec3 bRT = vBetaR * rayleighPhase( ct * 0.5 + 0.5 );
  vec3 bMT = vBetaM * hgPhase( ct, mieDirectionalG );
  vec3 Lin = pow( vSunE * ( ( bRT + bMT ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
  Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( bRT + bMT ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 0.5 ) ), clamp( pow( 1.0 - vSunDirection.y, 5.0 ), 0.0, 1.0 ) );
  vec3 L0 = vec3( 0.1 ) * Fex;
  float sd = clamp( ( ct - sunAngularDiameterCos ) * 40000.0, 0.0, 1.0 ) * showSunDisc;
  vec3 col = ( Lin + L0 ) * 0.04 + ( 700.0 * sd ) * min( vSunE * Fex, 80.0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );
  // pod horyzontem: zamglony kolor horyzontu
  if ( dir.y < 0.0 ) col = mix( col, col * 0.6, clamp( -dir.y * 3.0, 0.0, 1.0 ) );
  // gwiazdy w nocy
  if ( night > 0.0 && dir.y > 0.0 ) { float st = step( 0.9985, hash13( floor( dir * 600.0 ) ) ); col += vec3( st ) * night * 0.3 * dir.y; }
  // chmury (warstwa na ~2,5 km nad ziemią)
  if ( dir.y > 0.0 && cloudCover > 0.0 ) {
    vec2 uv = dir.xz / ( dir.y + 0.08 ) * 1.6 + cloudTime * vec2( 0.004, 0.0015 );
    float n = fbm( uv ) * 0.6 + 0.5;
    float reg = gnoise( uv * 0.23 + 3.0 ) * 0.4 + 0.5;
    float cov = clamp( cloudCover + ( reg - 0.5 ) * 0.5, 0.0, 1.0 );
    float th = 1.0 - cov;
    float m = smoothstep( th, th + 0.28, n ) * smoothstep( 0.0, 0.12, dir.y );
    float depth = max( 0.0, n - th );
    float beer = exp( -depth * 5.0 );
    float day = smoothstep( -0.1, 0.3, vSunDirection.y );
    vec3 sunC = vSunE * Fex * 0.22 * 0.04;
    vec3 amb = Lin * 0.04 + vec3( 0.0, 0.0003, 0.00075 );
    float silver = clamp( 0.51 / pow( 1.49 - ct * 1.4, 1.5 ), 0.0, 3.0 );
    vec3 cc = ( amb * 1.2 + sunC * mix( 0.35, 1.0, beer ) + sunC * silver * m * ( 1.0 - m ) * 2.0 ) * cloudTint * max( day, 0.02 );
    float alpha = ( 1.0 - exp( -depth * 14.0 ) ) * m;
    col = mix( col, mix( col, cc, Fex.g * 0.6 + 0.4 ), alpha );
  }
  gl_FragColor = vec4( col * skyGain, 1.0 );
}`;

export function makeSky() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      sunPosition: { value: new THREE.Vector3() }, rayleigh: { value: 1.6 }, turbidity: { value: 6 }, mieCoefficient: { value: 0.004 },
      mieDirectionalG: { value: 0.82 }, cloudCover: { value: 0.3 }, cloudTime: { value: 0 }, showSunDisc: { value: 1 }, skyGain: { value: 1 },
      night: { value: 0 }, cloudTint: { value: new THREE.Color(1, 1, 1) },
    },
    vertexShader: VS, fragmentShader: FS, side: THREE.BackSide, depthWrite: false, depthTest: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
  mesh.scale.setScalar(30000);
  mesh.renderOrder = -1000; mesh.frustumCulled = false;
  return mesh;
}

// --- ten sam model w JS (bez chmur) ---
const totalRayleigh = [5.804542996261093e-6, 1.3562911419845635e-5, 3.0265902468824876e-5];
const MieConst = [1.8399918514433978e14, 2.7798023919660528e14, 4.0790479543861094e14];
export function skyRadiance(dir, sun, p) {
  const e = Math.E, cutoff = 1.6110731556870734;
  const c = Math.max(-1, Math.min(1, sun[1]));
  const sunE = 1000 * Math.max(0, 1 - Math.pow(e, -((cutoff - Math.acos(c)) / 1.5)));
  const sunfade = 1 - Math.min(1, Math.max(0, 1 - Math.exp(sun[1] / 450000)));
  const rc = p.rayleigh - (1 - sunfade);
  const bR = totalRayleigh.map(v => v * rc);
  const mc = 0.434 * (0.2 * p.turbidity) * 10e-18;
  const bM = MieConst.map(v => v * mc * p.mieCoefficient);
  const zen = Math.acos(Math.max(0, dir[1]));
  const inv = 1 / (Math.cos(zen) + 0.15 * Math.pow(93.885 - zen * 180 / Math.PI, -1.253));
  const ct = dir[0] * sun[0] + dir[1] * sun[1] + dir[2] * sun[2];
  const rP = 0.05968310365946075 * (1 + Math.pow(ct * 0.5 + 0.5, 2));
  const g = p.mieDirectionalG, g2 = g * g;
  const mP = 0.07957747154594767 * (1 - g2) / Math.pow(1 - 2 * g * ct + g2, 1.5);
  const out = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const Fex = Math.exp(-(bR[i] * 8400 * inv + bM[i] * 1250 * inv));
    const ratio = (bR[i] * rP + bM[i] * mP) / (bR[i] + bM[i]);
    let Lin = Math.pow(sunE * ratio * (1 - Fex), 1.5);
    const mixT = Math.min(1, Math.max(0, Math.pow(1 - sun[1], 5)));
    Lin *= 1 + (Math.pow(sunE * ratio * Fex, 0.5) - 1) * mixT;
    out[i] = (Lin + 0.1 * Fex) * 0.04 + [0, 0.0003, 0.00075][i];
  }
  return out;
}
// transmitancja dla słońca (kolor światła kierunkowego)
export function sunTransmittance(sun, p) {
  const zen = Math.acos(Math.max(0.01, sun[1]));
  const inv = 1 / (Math.cos(zen) + 0.15 * Math.pow(93.885 - zen * 180 / Math.PI, -1.253));
  const mc = 0.434 * (0.2 * p.turbidity) * 10e-18;
  return [0, 1, 2].map(i => Math.exp(-(totalRayleigh[i] * p.rayleigh * 8400 * inv + MieConst[i] * mc * p.mieCoefficient * 1250 * inv)));
}
