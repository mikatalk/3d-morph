export function packToTexture (faces, frames) {

  // for each face pack XYZIndex to textureData
  let dataTriangles = new Float32Array( 512 * 512 * 4 ).fill(0);
  let i12 = 0;
  for ( let frame of frames ) {
    for ( let i=0, i3=0, l=faces.length; i<l; i++, i3+=3, i12+=12 ) {
        // triangle pt1
        dataTriangles[i12 + 0] = frame.vertices[faces[i].a].x;
        dataTriangles[i12 + 1] = frame.vertices[faces[i].a].y;
        dataTriangles[i12 + 2] = frame.vertices[faces[i].a].z;
        dataTriangles[i12 + 3] = i3+0;
        // triangle pt2
        dataTriangles[i12 + 4] = frame.vertices[faces[i].b].x;
        dataTriangles[i12 + 5] = frame.vertices[faces[i].b].y;
        dataTriangles[i12 + 6] = frame.vertices[faces[i].b].z;
        dataTriangles[i12 + 7] = i3+1;
        // triangle pt3
        dataTriangles[i12 + 8] = frame.vertices[faces[i].c].x;
        dataTriangles[i12 + 9] = frame.vertices[faces[i].c].y;
        dataTriangles[i12 + 10] = frame.vertices[faces[i].c].z;
        dataTriangles[i12 + 11] = i3+2;
    }
  }
  
  let textureXYZ = new THREE.DataTexture( 
    dataTriangles, 
    512, 512,
    THREE.RGBAFormat, 
    THREE.FloatType );
  textureXYZ.minFilter = textureXYZ.magFilter = THREE.NearestFilter;
  textureXYZ.needsUpdate = true;
  
  return textureXYZ;
}


// export function packToTexture (faces, geometry) {

//   // for each face pack XYZIndex to textureData
//   let dataTriangles = new Float32Array( 512 * 512 * 4 ).fill(0);
//   for ( let i=0, i3=0, i12=0, l=faces.length; i<l; i++, i3+=3, i12+=12 ) {
//       // triangle pt1
//       dataTriangles[i12 + 0] = geometry.vertices[faces[i].a].x;
//       dataTriangles[i12 + 1] = geometry.vertices[faces[i].a].y;
//       dataTriangles[i12 + 2] = geometry.vertices[faces[i].a].z;
//       dataTriangles[i12 + 3] = i3+0;
//       // triangle pt2
//       dataTriangles[i12 + 4] = geometry.vertices[faces[i].b].x;
//       dataTriangles[i12 + 5] = geometry.vertices[faces[i].b].y;
//       dataTriangles[i12 + 6] = geometry.vertices[faces[i].b].z;
//       dataTriangles[i12 + 7] = i3+1;
//       // triangle pt3
//       dataTriangles[i12 + 8] = geometry.vertices[faces[i].c].x;
//       dataTriangles[i12 + 9] = geometry.vertices[faces[i].c].y;
//       dataTriangles[i12 + 10] = geometry.vertices[faces[i].c].z;
//       dataTriangles[i12 + 11] = i3+2;
//   }
  
//   let textureXYZ = new THREE.DataTexture( 
//     dataTriangles, 
//     512, 512,
//     THREE.RGBAFormat, 
//     THREE.FloatType );
//   textureXYZ.minFilter = textureXYZ.magFilter = THREE.NearestFilter;
//   textureXYZ.needsUpdate = true;
  
//   return textureXYZ;
// }
