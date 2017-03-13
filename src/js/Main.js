// main scss
import '../sass/app.scss';

import $ from 'jquery';

import AssetLoader from './AssetLoader';
import Sound from './Sound';
import Gl from './Gl';
import { sortFaces } from './utils/sortFaces';
import { packToTexture } from './utils/packToTexture';

$( document ).ready( () => {


  let sound = new Sound('./assets/charlie-chaplin.mp3');
  // sound.toggle();

function animate() {
        requestAnimationFrame(animate);
        let stamp = sound.stamp();
    }
    animate();


  let assets = new AssetLoader({
    // model: 'assets/key-peele.dae',
    model: 'assets/charlie.dae',
    // skin1: 'assets/key.png', 
    // skin2: 'assets/peele.png', 
    skin1: 'assets/charlie-1.png', 
    skin2: 'assets/charlie-2.png', 
    onComplete: (geomery, skin1, skin2, frames) => {

      // let faces = sortFaces( geomery );
      let faces = geomery.faces.slice();
      let textureXYZ = packToTexture(faces, frames);

      let gl = new Gl(textureXYZ, skin1, skin2, geomery, sound);
    }
  });
});
