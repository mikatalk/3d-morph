const THREE = window.THREE = require('three');

import ColladaLoader from 'three-collada-loader';

export default class AssetLoader {
  constructor (options) {

    this.options = options;
    this.skin = null;
    this.geometry = null;
    this.frames = null;

    // load models
    let loader = new ColladaLoader();
    loader.load( options.model, ( geo, materials ) => {

      let geometry = geo.scene.children.filter ( (child)=> child.name == 'BaseNum' )[0].children[0].geometry;

      let faces = geometry.faces.slice();

      this.geometry = geometry;

      this.frames = [
        geo.scene.children.filter ( (child)=> child.name == 'num0' )[0].children[0].geometry,
        geo.scene.children.filter ( (child)=> child.name == 'num1' )[0].children[0].geometry,
        geo.scene.children.filter ( (child)=> child.name == 'num2' )[0].children[0].geometry,
        geo.scene.children.filter ( (child)=> child.name == 'num3' )[0].children[0].geometry,
        geo.scene.children.filter ( (child)=> child.name == 'num4' )[0].children[0].geometry,
        geo.scene.children.filter ( (child)=> child.name == 'num5' )[0].children[0].geometry,
        geo.scene.children.filter ( (child)=> child.name == 'num6' )[0].children[0].geometry,
        geo.scene.children.filter ( (child)=> child.name == 'num7' )[0].children[0].geometry,
        geo.scene.children.filter ( (child)=> child.name == 'num8' )[0].children[0].geometry,
        geo.scene.children.filter ( (child)=> child.name == 'num9' )[0].children[0].geometry,
      ];
      this.stepLoad();

    });

    let textureLoader = new THREE.TextureLoader();
    textureLoader.load(options.skin, (skin)=>{
      this.skin = skin;
      this.stepLoad();
    });
  }

  stepLoad () {
    if ( this.skin && this.geometry && this.options.onComplete ) {
      this.options.onComplete( this.geometry, this.skin, this.frames );
    }
  }
}