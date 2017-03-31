// main scss
import '../sass/app.scss';

import $ from 'jquery';

import AssetLoader from './AssetLoader';
import Sound from './Sound';
import Gl from './Gl';
import { sortFaces } from './utils/sortFaces';
import { packToTexture } from './utils/packToTexture';

$( document ).ready( () => {


  let sound = new Sound('./assets/NoNoNoCat.mp3');
  // sound.toggle();

  function animate() {
    requestAnimationFrame(animate);
    let stamp = sound.stamp();
  }
  animate();

  let assets = new AssetLoader({
    model: 'assets/giraffe.dae',
    skin1: 'assets/giraffe.png', 
    skin2: 'assets/giraffe.png', 
    onComplete: (geomery, skin1, skin2, frames) => {

      // let faces = sortFaces( geomery );
      let faces = geomery.faces.slice();
      let textureXYZ = packToTexture(faces, frames);

      let gl = new Gl(textureXYZ, skin1, skin2, geomery, sound);
    }
  });

  $('.speaker').click(function(event) {
    event.preventDefault();
    $(this).toggleClass('mute');
    sound.toggle();
  });
});
