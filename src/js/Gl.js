import $ from 'jquery';

// const dat = require('./../libs/utils/dat.gui.min');

import * as dat from './libs/dat.gui.min';

// import BrightnessShader from './BrightnessShader';

import { sortFaces } from './utils/sortFaces';

import './libs/TessellateModifier';

import './libs/shaders/BlendShader';
import './libs/shaders/CopyShader';
import './libs/shaders/HorizontalBlurShader';
import './libs/shaders/VerticalBlurShader';
import './libs/shaders/FXAAShader';
import './libs/shaders/SSAOShader';
import './libs/postprocessing/EffectComposer';
import './libs/postprocessing/MaskPass';
import './libs/postprocessing/RenderPass';
import './libs/postprocessing/SavePass';
import './libs/postprocessing/ShaderPass';
import './libs/postprocessing/TexturePass';
import './libs/shaders/BokehPass';
import './libs/postprocessing/BokehShader';

import ColladaLoader from 'three-collada-loader';

const THREE = window.THREE = require('three');
// const FBOHelper = require( 'three.fbo-helper' );
const OrbitControls = require('three-orbit-controls')(THREE)
const SIZE = 16;
const SIZE_GRID = 50;
const NUM_INSTANCES = 1//SIZE_GRID*SIZE_GRID*2; // width * height * 2 triangles per quads

const sharedVertex = `

// // get instance id
// float id = offset.a;
// // get relative value
// float scale = abs(texture2D(audioSample, vec2(
//   mod(id,${SIZE}.0)/${SIZE}.0 ,
//   id/${SIZE}.0/${SIZE}.0
// ) ).g)/255.;


float f = 0.0;
float numVerts = 4802.0*3.0;
vec2 pixelPos = vec2( mod( (numVerts*f+position.z), 512.)/512.0, floor((numVerts*f+position.z)/512.0)/512.0);
vec2 pixelPos2 = vec2( mod( (numVerts+position.z), 512.)/512.0, floor((numVerts+position.z)/512.0)/512.0);
vec3 xyz = texture2D(animations, pixelPos.xy).xyz;
vec3 xyz2 = texture2D(animations, pixelPos2.xy).xyz;
transformed = mix(xyz, xyz2, uRatio);

// transformed.x += sin(2.* uTime * (uv.x + uv.y) * .3) * .10;
// transformed.y += sin(uTime * (uv.x + uv.y) * 1.2) * .10;
// transformed.z += sin(uTime * (uv.x + uv.y) * .2) * .10;

`;

const phongVS = `
  #define PHONG
  // varying vec4 vOffset;
  // varying vec3 vPosition;
  // varying vec4 vColor;

  // attribute vec4 offset;
  
  uniform float uTime;
  uniform float uRatio;
  uniform sampler2D audioSample;
  uniform sampler2D animations;
  uniform sampler2D skinMap1;
  uniform sampler2D skinMap2;
  
  varying vec2 vUv;
  // varying float vId;
  // varying float vScale;
  // varying float vPosition;
  varying vec3 vViewPosition;
  #ifndef FLAT_SHADED
    varying vec3 vNormal;
  #endif
  #include <common>
  #include <uv_pars_vertex>
  #include <uv2_pars_vertex>
  #include <displacementmap_pars_vertex>
  #include <envmap_pars_vertex>
  #include <color_pars_vertex>
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>
  #include <shadowmap_pars_vertex>
  #include <logdepthbuf_pars_vertex>
  #include <clipping_planes_pars_vertex>
  #include <fog_pars_vertex>

  void main() {
  
    #include <uv_vertex>
    #include <uv2_vertex>
    #include <color_vertex>
    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>
    #ifndef FLAT_SHADED
      vNormal = normalize( transformedNormal );
    #endif
    #include <begin_vertex>

    ${sharedVertex}
    vUv = uv;

    #include <displacementmap_vertex>
    #include <morphtarget_vertex>
    #include <skinning_vertex>
    #include <project_vertex>
    #include <logdepthbuf_vertex>
    #include <clipping_planes_vertex>
    vViewPosition = - mvPosition.xyz;
    #include <worldpos_vertex>
    #include <envmap_vertex>
    #include <shadowmap_vertex>
    #include <fog_vertex>

  }
`;

const phongFS = `
  #define PHONG
  
    uniform sampler2D skinMap1;
    uniform sampler2D skinMap2;

  uniform sampler2D audioSample;
  uniform sampler2D animations;
  uniform sampler2D map;
  // varying float vScale;
  
  // varying vec4 vOffset;
  // varying vec3 vPosition;
  // varying vec4 vColor;
  
  uniform float uTime;
  uniform float uRatio;
  uniform vec3 diffuse;
  uniform vec3 emissive;
  uniform vec3 specular;
  uniform float shininess;
  uniform float opacity;
  // varying float vId;
  varying vec2 vUv;
  #include <common>
  #include <packing>
  #include <color_pars_fragment>
  #include <uv_pars_fragment>
  #include <uv2_pars_fragment>
  #include <map_pars_fragment>
  #include <alphamap_pars_fragment>
  #include <aomap_pars_fragment>
  #include <lightmap_pars_fragment>
  #include <emissivemap_pars_fragment>
  #include <envmap_pars_fragment>
  #include <gradientmap_pars_fragment>
  #include <fog_pars_fragment>
  #include <bsdfs>
  #include <lights_pars>
  #include <lights_phong_pars_fragment>
  #include <shadowmap_pars_fragment>
  #include <bumpmap_pars_fragment>
  #include <normalmap_pars_fragment>
  #include <specularmap_pars_fragment>
  #include <logdepthbuf_pars_fragment>
  #include <clipping_planes_pars_fragment>
  
  void main() {
    #include <clipping_planes_fragment>
    vec4 diffuseColor = vec4( diffuse, opacity );
    ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
    vec3 totalEmissiveRadiance = emissive;
    #include <logdepthbuf_fragment>
    #include <map_fragment>
    #include <color_fragment>
    #include <alphamap_fragment>
    #include <alphatest_fragment>
    #include <specularmap_fragment>
    #include <normal_flip>
    #include <normal_fragment>
    #include <emissivemap_fragment>
    #include <lights_phong_fragment>
    #include <lights_template>
    #include <aomap_fragment>
    
    vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

    vec4 color1 = texture2D(skinMap1, vUv.xy);
    vec4 color2 = texture2D(skinMap2, vUv.xy);
    vec4 color = mix(color1, color2, uRatio);
    outgoingLight.rgb += color.rgb;

    #include <envmap_fragment>
    gl_FragColor = vec4( outgoingLight, diffuseColor.a );
    #include <premultiplied_alpha_fragment>
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #include <fog_fragment>
    gl_FragColor.a = color.a;

  }
`;

// const depthVS = `
//   #define DEPTH_PACKING 3201
//   uniform float uTime;
//   uniform float uRatio;
//   // uniform sampler2D audioSample;
//   uniform sampler2D animations;

//   // varying float vId;
//   varying vec2 vUv;

//   #include <common>
//   void main() {
//     #include <begin_vertex>
//     ${sharedVertex}
//     #include <project_vertex>
//   }
// `;

// const depthFS = `
//   #define DEPTH_PACKING 3201
//   #if DEPTH_PACKING == 3200
//     uniform float opacity;
//   #endif
//   #include <common>
//   #include <packing>
//   #include <uv_pars_fragment>
//   #include <map_pars_fragment>
//   #include <alphamap_pars_fragment>
//   #include <logdepthbuf_pars_fragment>
//   #include <clipping_planes_pars_fragment>
//   void main() {
//     #include <clipping_planes_fragment>
//     vec4 diffuseColor = vec4( 1.0 );
//     #if DEPTH_PACKING == 3200
//       diffuseColor.a = opacity;
//     #endif
//     #include <map_fragment>
//     #include <alphamap_fragment>
//     #include <alphatest_fragment>
//     #include <logdepthbuf_fragment>
//     #if DEPTH_PACKING == 3200
//       gl_FragColor = vec4( vec3( gl_FragCoord.z ), opacity );
//     #elif DEPTH_PACKING == 3201
//       gl_FragColor = packDepthToRGBA( gl_FragCoord.z );
//     #endif
//   }
// `;

export default class Gl {
  
  constructor(animations, skinMap1, skinMap2, gridGeo) {
  console.log('GO', animations, skinMap1, skinMap2, gridGeo)

    this.numVerts = gridGeo.faces.length;
    console.log('num verts:',this.numVerts);

    this.gridGeo = gridGeo;  
    this.skinMap1 = skinMap1;
    this.skinMap2 = skinMap2;
    this.options = {
        brightness: 1.3,
        blending: .8,
        speed: .01,
        spacing: 3.3,
    }

    this.clock = new THREE.Clock;

    // this.sound = sound;
    this.animations = animations;
    this.container;
    this.stats;
    this.camera;
    this.scene;
    this.renderer;
    this.mouseX = 0;
    this.mouseY = 0;
    this.windowHalfX = window.innerWidth / 2;
    this.windowHalfY = window.innerHeight / 2;
    // this.bgColor = 0x3333cd;
    this.bgColor = 0xfafaff;
    this.fov = 75;
    
    this.scene = new THREE.Scene();
// this.scene.fog = new THREE.FogExp2(this.bgColor, 0.005);//, 700);
    // this.scene.fog = new THREE.Fog(this.bgColor, 150, 700);

    this.camera = new THREE.PerspectiveCamera(this.fov, window.innerWidth / window.innerHeight, 1, 100000);
    this.camera.position.z = 300;
    this.camera.lookAt(this.scene.position);
    
    this.controls = new OrbitControls(this.camera);
    this.controls.enableDamping = false;
    this.controls.dampingFactor = 0.25;

    this.canvas = document.getElementById('gl');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setClearColor(this.bgColor);
    // this.renderer.setClearColor(0x000000);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.autoClear = false;
    this.renderer.sortObjects = false;
    // this.renderer.shadowMapCullFrontFaces = false;
    // this.renderer.shadowMapCullBackFaces = false;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // this.renderer.shadowMap.renderReverseSided = true
    // this.renderer.shadowMap.soft = true;

    // this.helper = new FBOHelper( this.renderer );
    // this.helper.setSize( 64, 64 ); 
    // this.helper.attach( this.audioSample, 'Audio Samples' );

    window.addEventListener('resize', this.onWindowResize.bind(this), false);
 
    let shaderSource = THREE.ShaderLib['phong'];
    // console.log(shaderSource);
    let uniforms = THREE.UniformsUtils.clone(shaderSource.uniforms)
    uniforms.uTime = { type:'f', value:0};
    uniforms.uRatio = { type:'f', value:0};
    // uniforms.audioSample = { type:'t', value:this.sound.texture };
    uniforms.animations = { type: 't', value: this.animations};

// let loader = new THREE.TextureLoader();
// // loader.load('assets/images/baby.png').texture
// uniforms.map1 = { type: 't', value: this.skinMap1 };
// uniforms.map = { type: 't', value: this.skinMap1 };
uniforms.skinMap1 = { type: 't', value: this.skinMap1 };
uniforms.skinMap2 = { type: 't', value: this.skinMap2 };
// // uniforms.map = loader.load('assets/images/baby.png');

// uniforms.skinMap = this.skinMap;

// uniforms.map.needsUpdate = true;
    this.materialScene = new THREE.ShaderMaterial({
      uniforms: uniforms,

      vertexShader: phongVS,
      fragmentShader: phongFS,
      shading: THREE.FlatShading,
      transparent: false,
      side: THREE.DoubleSide,
      transparent: !false,
      // wireframe: true,
      lights: true,
      fog: true,
      skinning: false,
      //depthTest: true,
      //depthWrite: true
      // map: loader.load('assets/images/baby.png')
    });

    // this.hemisphereLight = new THREE.HemisphereLight(0xffaacc);
    // this.hemisphereLight = new THREE.HemisphereLight(0x88aacc, 0, 1);
    this.hemisphereLight = new THREE.HemisphereLight(0x112233, 0, 1);
    this.scene.add(this.hemisphereLight);

    this.spotLight = new THREE.DirectionalLight(0x4488ff, 1, 0, .075, .5, .5);
    
    this.spotLight.target.position.set(0, 0, 0);
    this.spotLight.castShadow = true;

    this.spotLight.shadow.mapSize.width = 512;
    this.spotLight.shadow.mapSize.height = 512;

    var d = 500;
    this.spotLight.shadow.camera.left = -d;
    this.spotLight.shadow.camera.right = d;
    this.spotLight.shadow.camera.top = d;
    this.spotLight.shadow.camera.bottom = -d;
    this.spotLight.shadow.camera.updateProjectionMatrix();
    this.scene.add(this.spotLight);
    this.spotLight.shadow.bias = -0.0001;
    this.spotLight.position.x = 0; //this.camera.position.x+120;
    this.spotLight.position.y = 110; //this.camera.position.y//20;
    this.spotLight.position.z = -100; //this.camera.position.z/2//0;



this.effectSave = new THREE.SavePass( new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, this.rttParams ) );

this.effectBlend = new THREE.ShaderPass( THREE.BlendShader, "tDiffuse1" );
this.effectBlend.uniforms[ 'tDiffuse2' ].value = this.effectSave.renderTarget.texture;
this.effectBlend.uniforms[ 'mixRatio' ].value = this.options.blending;

this.bokehPass = new THREE.BokehPass( this.scene, this.camera, {
          focus:    1.0,
          aperture: 0.025,
          maxblur:  1.0,
          width: window.innerWidth,
          height: window.innerHeight
        } );
// this.bokehPass.renderToScreen = true;

let pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
this.depthRenderTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, pars );
        // Setup SSAO pass
this.ssaoPass = new THREE.ShaderPass( THREE.SSAOShader );
this.ssaoPass.renderToScreen = true;
        //ssaoPass.uniforms[ "tDiffuse" ].value will be set by ShaderPass
this.ssaoPass.uniforms[ "tDepth" ].value = this.depthRenderTarget.texture;
this.ssaoPass.uniforms[ 'size' ].value.set( window.innerWidth, window.innerHeight );
this.ssaoPass.uniforms[ 'cameraNear' ].value = this.camera.near;
this.ssaoPass.uniforms[ 'cameraFar' ].value = this.camera.far;
this.ssaoPass.uniforms[ 'onlyAO' ].value = !true;//( postprocessing.renderMode == 1 );
this.ssaoPass.uniforms[ 'aoClamp' ].value = 0.3;
this.ssaoPass.uniforms[ 'lumInfluence' ].value = 0.5;
this.ssaoPass.renderToScreen = true;



this.effectCopy = new THREE.ShaderPass( THREE.CopyShader );

this.renderPass = new THREE.RenderPass( this.scene, this.camera, null, this.bgColor, 1  );
// this.renderPass = new THREE.RenderPass( this.scene, this.camera, this.depthMaterial, this.bgColor, 1  );
// this.renderPass.renderToScreen = true;

this.composer = new THREE.EffectComposer( this.renderer, new THREE.WebGLRenderTarget(  window.innerWidth, window.innerHeight, this.rttParams ) );

this.composer.addPass( this.renderPass );
// this.composer.addPass( this.bokehPass );
this.composer.addPass( this.ssaoPass );
// this.composer.addPass( this.effectBlend );
// this.composer.addPass( this.effectSave );
// this.composer.addPass( this.effectBrightness );


// this.gui = new dat.dat.GUI();
// this.effectController  = {
//           // focus:    1.0,
//           // aperture: 0.025,
//           // maxblur:  1.0
//           numInstances: NUM_INSTANCES
//         };

// // this.matChanger = ( ) => {
// //     this.geometry.maxInstancedCount = this.effectController.numInstances;
//           // this.bokehPass.uniforms[ "focus" ].value = this.effectController.focus;
//           // this.bokehPass.uniforms[ "aperture" ].value = this.effectController.aperture;
//           // this.bokehPass.uniforms[ "maxblur" ].value = this.effectController.maxblur;
//         // };
// // this.gui.add( this.effectController, "focus", 0.0, 3.0, 0.025 ).onChange( this.matChanger );
// // this.gui.add( this.effectController, "aperture", 0.001, 0.2, 0.001 ).onChange( this.matChanger );
// // this.gui.add( this.effectController, "maxblur", 0.0, 3.0, 0.025 ).onChange( this.matChanger );
// // this.gui.add( this.effectController, 'numInstances', 0.0, NUM_INSTANCES, 1 ).onChange( ( ) => {
// this.gui.add( this.effectController, 'numInstances', 0.0, 500, 1 ).onChange( ( ) => {
//     this.geometry.maxInstancedCount = this.effectController.numInstances;
// } );
// this.gui.close();



    this.initCubes();
    this.animate();
    this.onWindowResize();


    $('#loading').fadeOut(600, function() { $(this).remove(); });
    $('#gl').fadeIn('slow');
  }


  initCubes () {
    
    // let grid = new THREE.PlaneGeometry(10,10,49,49);
    let grid = this.gridGeo;
    let faces = grid.faces.slice();
    // let faces = sortFaces( grid );
    let faceVertexUvs = grid.faceVertexUvs[0].slice();

    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.maxInstancedCount = NUM_INSTANCES;

    let vertices = new THREE.BufferAttribute( new Float32Array( faces.length * 3 * 3 ), 3 );    

    let uvs = new THREE.BufferAttribute( new Float32Array( faces.length * 3 * 2 ), 2 );
    let indices = new THREE.BufferAttribute( new Uint16Array( faces.length * 3 ), 1 );

// let x = 0, y= 0;

    for ( let i=0, i2=0, i3=0, l=faces.length; i<l; i++, i2+=2, i3+=3 ) {
      let face = faces[i];
      let uv = faceVertexUvs[i];
      // vertices.setXYZ( i3+0, uv[0].x, uv[0].y, face.a ); 
      // vertices.setXYZ( i3+1, uv[1].x, uv[1].y, face.b ); 
      // vertices.setXYZ( i3+2, uv[2].x, uv[2].y, face.c );
      
      vertices.setXYZ( i3+0, uv[0].x, uv[0].y, i3+0 ); 
      vertices.setXYZ( i3+1, uv[1].x, uv[1].y, i3+1 ); 
      vertices.setXYZ( i3+2, uv[2].x, uv[2].y, i3+2 );
      // uvs.setXY( i3+0, 0, 0 );
      // uvs.setXY( i3+1, 0, 1 );
      // uvs.setXY( i3+2, 1, 1 );
      uvs.setXY( i3+0, uv[0].x, uv[0].y );
      uvs.setXY( i3+1, uv[1].x, uv[1].y );
      uvs.setXY( i3+2, uv[2].x, uv[2].y );
      // indices[i3+0] = face.a;
      // indices[i3+1] = face.b;
      // indices[i3+2] = face.c;
      indices.setX(i3+0, i3+0);
      indices.setX(i3+1, i3+1);
      indices.setX(i3+2, i3+2);
    }
    this.geometry.addAttribute( 'position', vertices );
    this.geometry.addAttribute( 'uv', uvs );
    this.geometry.setIndex( indices );
             
    console.log('vertices:', vertices)
    console.log('uvs:', uvs)
    console.log('indices:', indices)
    console.log('geo:', grid)

    this.cubes = new THREE.Mesh(this.geometry, this.materialScene);
    this.cubes.frustumCulled = false;
    this.cubes.castShadow = true;
    this.cubes.receiveShadow = true;
    this.cubes.position.set(0,0,0);
    this.cubes.scale.set(100,100,100)
    this.scene.add(this.cubes);

    // this.depthMaterial = new THREE.ShaderMaterial({
    //     uniforms: {
    //     uTime: { type:'f', value:0},
    //     uRatio: { type:'f', value:0 }
    //   },
    //   vertexShader: depthVS,
    //   fragmentShader: depthFS,
    //   // depthPacking: THREE.RGBADepthPacking,
    //   // blending: THREE.NoBlending
    // });

    // this.cubes.customDepthMaterial = this.depthMaterial;
  }


  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.windowHalfX = window.innerWidth / 2;
    this.windowHalfY = window.innerHeight / 2;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize( window.innerWidth, window.innerHeight );
  }
  
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.render();
  }

  render() {
    let delta = this.clock.getDelta();
    let time = performance.now() * .005;
    this.materialScene.uniforms.uTime.value = time;
    this.materialScene.uniforms.uRatio.value = (Math.sin( time * .3 )+1.0)/2.0;
    // this.depthMaterial.uniforms.uTime.value = time;

    this.animations.needsUpdate = true;

    this.renderer.clear();
    this.renderer.render(this.scene, this.camera, this.composer.renderTarget);
    this.composer.render( delta );
  }
}

