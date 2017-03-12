export function sortFaces (geomery) {
  let faces = geomery.faces.slice();
  for ( let face of faces ) {
    let total = {x:0,y:0,z:0};
    total.x += geomery.vertices[face.a].x
    total.x += geomery.vertices[face.b].x
    total.x += geomery.vertices[face.c].x
    
    total.y += geomery.vertices[face.a].y
    total.y += geomery.vertices[face.b].y
    total.y += geomery.vertices[face.c].y
    
    total.z += geomery.vertices[face.a].z
    total.z += geomery.vertices[face.b].z
    total.z += geomery.vertices[face.c].z

    total.x /= 3;
    total.y /= 3;
    total.z /= 3;
    // console.log(total)
    face.med = {x:total.x, y:total.y, z:total.z};

  }

  faces = faces.sort( (a,b) => {
      if ( b.med.x < a.med.x ) return -1;
      else if ( b.med.x > a.med.x ) return 1;
      else return 0;
  })
  faces = faces.sort( (a,b) => {
      if ( b.med.z < a.med.z ) return -1;
      else if ( b.med.z > a.med.z ) return 1;
      else return 0;
  })

  faces = faces.sort( (a,b) => {
      if ( b.med.y < a.med.y ) return -1;
      else if ( b.med.y > a.med.y ) return 1;
      else return 0;
  })

  return faces;
}
