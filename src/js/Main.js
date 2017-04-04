// main scss
import '../sass/app.scss';

import $ from 'jquery';

import AssetLoader from './AssetLoader';
import Sound from './Sound';
import Gl from './Gl';
import { sortFaces } from './utils/sortFaces';
import { packToTexture } from './utils/packToTexture';

$( document ).ready( () => {


  let assets = new AssetLoader({
    model: 'assets/numbers.dae',
    // model: 'assets/giraffe.dae',
    skin: 'assets/giraffe.png', 
    // skin2: 'assets/giraffe.png', 
    onComplete: (geomery, skin, frames) => {

      // let faces = sortFaces( geomery );
      let faces = geomery.faces.slice();
      let textureXYZ = packToTexture(faces, frames);

      let gl = new Gl(textureXYZ, skin, geomery);
    }
  });

  $('.speaker').click(function(event) {
    event.preventDefault();
    $(this).toggleClass('mute');
    sound.toggle();
  });
});
