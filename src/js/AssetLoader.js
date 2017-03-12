const THREE = window.THREE = require('three');

import ColladaLoader from 'three-collada-loader';

export default class AssetLoader {
  constructor (options) {

    this.options = options;
    this.skin1 = null;
    this.skin2 = null;
    this.geometry = null;
    this.frames = null;

    // load models
    let loader = new ColladaLoader();
    loader.load( options.model, ( geo, materials ) => {

      let geometry = geo.scene.children.filter ( (child)=> child.name == 'Key' )[0].children[0].geometry;

      let faces = geometry.faces.slice();

      this.geometry = geometry;

      this.frames = [
        geo.scene.children.filter ( (child)=> child.name == 'Key' )[0].children[0].geometry,
        geo.scene.children.filter ( (child)=> child.name == 'Peele' )[0].children[0].geometry
      ];
      this.stepLoad();

    });

    let textureLoader = new THREE.TextureLoader();
    textureLoader.load(options.skin1, (skin)=>{
      this.skin1 = skin;
      this.stepLoad();
    });

    textureLoader.load(options.skin2, (skin)=>{
      this.skin2 = skin;
      this.stepLoad();
    });
  }

  stepLoad () {
    if ( this.skin1 && this.skin2 && this.geometry && this.options.onComplete ) {
      this.options.onComplete( this.geometry, this.skin1, this.skin2, this.frames );
    }
  }
}