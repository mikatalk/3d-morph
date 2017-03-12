// main scss
import '../sass/app.scss';

import $ from 'jquery';

import AssetLoader from './AssetLoader';
import Gl from './Gl';
import { sortFaces } from './utils/sortFaces';
import { packToTexture } from './utils/packToTexture';

$( document ).ready( () => {

  let assets = new AssetLoader({
    model: 'assets/key-peele.dae',
    // skin: 'assets/baby.png', 
    skin1: 'assets/key.png', 
    skin2: 'assets/peele.png', 
    onComplete: (geomery, skin1, skin2, frames) => {

      // let faces = sortFaces( geomery );
      let faces = geomery.faces.slice();
      let textureXYZ = packToTexture(faces, frames);

      let gl = new Gl(textureXYZ, skin1, skin2, geomery);
    }
  });
});
