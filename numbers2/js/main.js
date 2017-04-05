webpackJsonp([0],[
/* 0 */,
/* 1 */,
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

var THREE = __webpack_require__( 0 );

/**
* @author Tim Knip / http://www.floorplanner.com/ / tim at floorplanner.com
* @author Tony Parisi / http://www.tonyparisi.com/
*/

var ColladaLoader = function () {

    var COLLADA = null;
    var scene = null;
    var visualScene;
    var kinematicsModel;

    var readyCallbackFunc = null;

    var sources = {};
    var images = {};
    var animations = {};
    var controllers = {};
    var geometries = {};
    var materials = {};
    var effects = {};
    var cameras = {};
    var lights = {};

    var animData;
    var kinematics;
    var visualScenes;
    var kinematicsModels;
    var baseUrl;
    var morphs;
    var skins;

    var flip_uv = true;
    var preferredShading = THREE.SmoothShading;

    var options = {
        // Force Geometry to always be centered at the local origin of the
        // containing Mesh.
        centerGeometry: false,

        // Axis conversion is done for geometries, animations, and controllers.
        // If we ever pull cameras or lights out of the COLLADA file, they'll
        // need extra work.
        convertUpAxis: false,

        subdivideFaces: true,

        upAxis: 'Y',

        // For reflective or refractive materials we'll use this cubemap
        defaultEnvMap: null

    };

    var colladaUnit = 1.0;
    var colladaUp = 'Y';
    var upConversion = null;

    function load ( url, readyCallback, progressCallback, failCallback ) {

        var length = 0;

        if ( document.implementation && document.implementation.createDocument ) {

            var request = new XMLHttpRequest();

            request.onreadystatechange = function() {

                if ( request.readyState === 4 ) {

                    if ( request.status === 0 || request.status === 200 ) {

                        if ( request.response ) {

                            readyCallbackFunc = readyCallback;
                            parse( request.response, undefined, url );

                        } else {

                            if ( failCallback ) {

                                failCallback();

                            } else {

                                console.error( "ColladaLoader: Empty or non-existing file (" + url + ")" );

                            }

                        }

                    }

                } else if ( request.readyState === 3 ) {

                    if ( progressCallback ) {

                        if ( length === 0 ) {

                            length = request.getResponseHeader( "Content-Length" );

                        }

                        progressCallback( { total: length, loaded: request.responseText.length } );

                    }

                }

            };

            request.open( "GET", url, true );
            request.send( null );

        } else {

            alert( "Don't know how to parse XML!" );

        }

    }

    function parse( text, callBack, url ) {

        COLLADA = new DOMParser().parseFromString( text, 'text/xml' );
        callBack = callBack || readyCallbackFunc;

        if ( url !== undefined ) {

            var parts = url.split( '/' );
            parts.pop();
            baseUrl = ( parts.length < 1 ? '.' : parts.join( '/' ) ) + '/';

        }

        parseAsset();
        setUpConversion();
        images = parseLib( "library_images image", _Image, "image" );
        materials = parseLib( "library_materials material", Material, "material" );
        effects = parseLib( "library_effects effect", Effect, "effect" );
        geometries = parseLib( "library_geometries geometry", Geometry, "geometry" );
        cameras = parseLib( "library_cameras camera", Camera, "camera" );
        lights = parseLib( "library_lights light", Light, "light" );
        controllers = parseLib( "library_controllers controller", Controller, "controller" );
        animations = parseLib( "library_animations animation", Animation, "animation" );
        visualScenes = parseLib( "library_visual_scenes visual_scene", VisualScene, "visual_scene" );
        kinematicsModels = parseLib( "library_kinematics_models kinematics_model", KinematicsModel, "kinematics_model" );

        morphs = [];
        skins = [];

        visualScene = parseScene();
        scene = new THREE.Group();

        for ( var i = 0; i < visualScene.nodes.length; i ++ ) {

            scene.add( createSceneGraph( visualScene.nodes[ i ] ) );

        }

        // unit conversion
        scene.scale.multiplyScalar( colladaUnit );

        createAnimations();

        kinematicsModel = parseKinematicsModel();
        createKinematics();

        var result = {

            scene: scene,
            morphs: morphs,
            skins: skins,
            animations: animData,
            kinematics: kinematics,
            dae: {
                images: images,
                materials: materials,
                cameras: cameras,
                lights: lights,
                effects: effects,
                geometries: geometries,
                controllers: controllers,
                animations: animations,
                visualScenes: visualScenes,
                visualScene: visualScene,
                scene: visualScene,
                kinematicsModels: kinematicsModels,
                kinematicsModel: kinematicsModel
            }

        };

        if ( callBack ) {

            callBack( result );

        }

        return result;

    }

    function setPreferredShading ( shading ) {

        preferredShading = shading;

    }

    function parseAsset () {

        var elements = COLLADA.querySelectorAll('asset');

        var element = elements[0];

        if ( element && element.childNodes ) {

            for ( var i = 0; i < element.childNodes.length; i ++ ) {

                var child = element.childNodes[ i ];

                switch ( child.nodeName ) {

                    case 'unit':

                        var meter = child.getAttribute( 'meter' );

                        if ( meter ) {

                            colladaUnit = parseFloat( meter );

                        }

                        break;

                    case 'up_axis':

                        colladaUp = child.textContent.charAt(0);
                        break;

                }

            }

        }

    }

    function parseLib ( q, classSpec, prefix ) {

        var elements = COLLADA.querySelectorAll(q);

        var lib = {};

        var i = 0;

        var elementsLength = elements.length;

        for ( var j = 0; j < elementsLength; j ++ ) {

            var element = elements[j];
            var daeElement = ( new classSpec() ).parse( element );

            if ( !daeElement.id || daeElement.id.length === 0 ) daeElement.id = prefix + ( i ++ );
            lib[ daeElement.id ] = daeElement;

        }

        return lib;

    }

    function parseScene() {

        var sceneElement = COLLADA.querySelectorAll('scene instance_visual_scene')[0];

        if ( sceneElement ) {

            var url = sceneElement.getAttribute( 'url' ).replace( /^#/, '' );
            return visualScenes[ url.length > 0 ? url : 'visual_scene0' ];

        } else {

            return null;

        }

    }

    function parseKinematicsModel() {

        var kinematicsModelElement = COLLADA.querySelectorAll('instance_kinematics_model')[0];

        if ( kinematicsModelElement ) {

            var url = kinematicsModelElement.getAttribute( 'url' ).replace(/^#/, '');
            return kinematicsModels[ url.length > 0 ? url : 'kinematics_model0' ];

        } else {

            return null;

        }

    }

    function createAnimations() {

        animData = [];

        // fill in the keys
        recurseHierarchy( scene );

    }

    function recurseHierarchy( node ) {

        var n = visualScene.getChildById( node.colladaId, true ),
            newData = null;

        if ( n && n.keys ) {

            newData = {
                fps: 60,
                hierarchy: [ {
                    node: n,
                    keys: n.keys,
                    sids: n.sids
                } ],
                node: node,
                name: 'animation_' + node.name,
                length: 0
            };

            animData.push(newData);

            for ( var i = 0, il = n.keys.length; i < il; i ++ ) {

                newData.length = Math.max( newData.length, n.keys[i].time );

            }

        } else {

            newData = {
                hierarchy: [ {
                    keys: [],
                    sids: []
                } ]
            }

        }

        for ( var i = 0, il = node.children.length; i < il; i ++ ) {

            var d = recurseHierarchy( node.children[i] );

            for ( var j = 0, jl = d.hierarchy.length; j < jl; j ++ ) {

                newData.hierarchy.push( {
                    keys: [],
                    sids: []
                } );

            }

        }

        return newData;

    }

    function calcAnimationBounds () {

        var start = 1000000;
        var end = -start;
        var frames = 0;
        var ID;
        for ( var id in animations ) {

            var animation = animations[ id ];
            ID = ID || animation.id;
            for ( var i = 0; i < animation.sampler.length; i ++ ) {

                var sampler = animation.sampler[ i ];

                sampler.create();

                start = Math.min( start, sampler.startTime );
                end = Math.max( end, sampler.endTime );
                frames = Math.max( frames, sampler.input.length );

            }

        }

        return { start:start, end:end, frames:frames,ID:ID };

    }

    function createMorph ( geometry, ctrl ) {

        var morphCtrl = ctrl instanceof InstanceController ? controllers[ ctrl.url ] : ctrl;

        if ( !morphCtrl || !morphCtrl.morph ) {

            console.log("could not find morph controller!");
            return;

        }

        var morph = morphCtrl.morph;

        for ( var i = 0; i < morph.targets.length; i ++ ) {

            var target_id = morph.targets[ i ];
            var daeGeometry = geometries[ target_id ];

            if ( !daeGeometry.mesh ||
                 !daeGeometry.mesh.primitives ||
                 !daeGeometry.mesh.primitives.length ) {
                 continue;
            }

            var target = daeGeometry.mesh.primitives[ 0 ].geometry;

            if ( target.vertices.length === geometry.vertices.length ) {

                geometry.morphTargets.push( { name: "target_1", vertices: target.vertices } );

            }

        }

        geometry.morphTargets.push( { name: "target_Z", vertices: geometry.vertices } );

    }

    function createSkin ( geometry, ctrl, applyBindShape ) {

        var skinCtrl = controllers[ ctrl.url ];

        if ( !skinCtrl || !skinCtrl.skin ) {

            console.log( "could not find skin controller!" );
            return;

        }

        if ( !ctrl.skeleton || !ctrl.skeleton.length ) {

            console.log( "could not find the skeleton for the skin!" );
            return;

        }

        var skin = skinCtrl.skin;
        var skeleton = visualScene.getChildById( ctrl.skeleton[ 0 ] );
        var hierarchy = [];

        applyBindShape = applyBindShape !== undefined ? applyBindShape : true;

        var bones = [];
        geometry.skinWeights = [];
        geometry.skinIndices = [];

        //createBones( geometry.bones, skin, hierarchy, skeleton, null, -1 );
        //createWeights( skin, geometry.bones, geometry.skinIndices, geometry.skinWeights );

        /*
        geometry.animation = {
            name: 'take_001',
            fps: 30,
            length: 2,
            JIT: true,
            hierarchy: hierarchy
        };
        */

        if ( applyBindShape ) {

            for ( var i = 0; i < geometry.vertices.length; i ++ ) {

                geometry.vertices[ i ].applyMatrix4( skin.bindShapeMatrix );

            }

        }

    }

    function setupSkeleton ( node, bones, frame, parent ) {

        node.world = node.world || new THREE.Matrix4();
        node.localworld = node.localworld || new THREE.Matrix4();
        node.world.copy( node.matrix );
        node.localworld.copy( node.matrix );

        if ( node.channels && node.channels.length ) {

            var channel = node.channels[ 0 ];
            var m = channel.sampler.output[ frame ];

            if ( m instanceof THREE.Matrix4 ) {

                node.world.copy( m );
                node.localworld.copy(m);
                if (frame === 0)
                    node.matrix.copy(m);
            }

        }

        if ( parent ) {

            node.world.multiplyMatrices( parent, node.world );

        }

        bones.push( node );

        for ( var i = 0; i < node.nodes.length; i ++ ) {

            setupSkeleton( node.nodes[ i ], bones, frame, node.world );

        }

    }

    function setupSkinningMatrices ( bones, skin ) {

        // FIXME: this is dumb...

        for ( var i = 0; i < bones.length; i ++ ) {

            var bone = bones[ i ];
            var found = -1;

            if ( bone.type != 'JOINT' ) continue;

            for ( var j = 0; j < skin.joints.length; j ++ ) {

                if ( bone.sid === skin.joints[ j ] ) {

                    found = j;
                    break;

                }

            }

            if ( found >= 0 ) {

                var inv = skin.invBindMatrices[ found ];

                bone.invBindMatrix = inv;
                bone.skinningMatrix = new THREE.Matrix4();
                bone.skinningMatrix.multiplyMatrices(bone.world, inv); // (IBMi * JMi)
                bone.animatrix = new THREE.Matrix4();

                bone.animatrix.copy(bone.localworld);
                bone.weights = [];

                for ( var j = 0; j < skin.weights.length; j ++ ) {

                    for (var k = 0; k < skin.weights[ j ].length; k ++ ) {

                        var w = skin.weights[ j ][ k ];

                        if ( w.joint === found ) {

                            bone.weights.push( w );

                        }

                    }

                }

            } else {

                console.warn( "ColladaLoader: Could not find joint '" + bone.sid + "'." );

                bone.skinningMatrix = new THREE.Matrix4();
                bone.weights = [];

            }
        }

    }

    //Walk the Collada tree and flatten the bones into a list, extract the position, quat and scale from the matrix
    function flattenSkeleton(skeleton) {

        var list = [];
        var walk = function(parentid, node, list) {

            var bone = {};
            bone.name = node.sid;
            bone.parent = parentid;
            bone.matrix = node.matrix;
            var data = [ new THREE.Vector3(),new THREE.Quaternion(),new THREE.Vector3() ];
            bone.matrix.decompose(data[0], data[1], data[2]);

            bone.pos = [ data[0].x,data[0].y,data[0].z ];

            bone.scl = [ data[2].x,data[2].y,data[2].z ];
            bone.rotq = [ data[1].x,data[1].y,data[1].z,data[1].w ];
            list.push(bone);

            for (var i in node.nodes) {

                walk(node.sid, node.nodes[i], list);

            }

        };

        walk(-1, skeleton, list);
        return list;

    }

    //Move the vertices into the pose that is proper for the start of the animation
    function skinToBindPose(geometry,skeleton,skinController) {

        var bones = [];
        setupSkeleton( skeleton, bones, -1 );
        setupSkinningMatrices( bones, skinController.skin );
        var v = new THREE.Vector3();
        var skinned = [];

        for (var i = 0; i < geometry.vertices.length; i ++) {

            skinned.push(new THREE.Vector3());

        }

        for ( i = 0; i < bones.length; i ++ ) {

            if ( bones[ i ].type != 'JOINT' ) continue;

            for ( var j = 0; j < bones[ i ].weights.length; j ++ ) {

                var w = bones[ i ].weights[ j ];
                var vidx = w.index;
                var weight = w.weight;

                var o = geometry.vertices[vidx];
                var s = skinned[vidx];

                v.x = o.x;
                v.y = o.y;
                v.z = o.z;

                v.applyMatrix4( bones[i].skinningMatrix );

                s.x += (v.x * weight);
                s.y += (v.y * weight);
                s.z += (v.z * weight);
            }

        }

        for (var i = 0; i < geometry.vertices.length; i ++) {

            geometry.vertices[i] = skinned[i];

        }

    }

    function applySkin ( geometry, instanceCtrl, frame ) {

        var skinController = controllers[ instanceCtrl.url ];

        frame = frame !== undefined ? frame : 40;

        if ( !skinController || !skinController.skin ) {

            console.log( 'ColladaLoader: Could not find skin controller.' );
            return;

        }

        if ( !instanceCtrl.skeleton || !instanceCtrl.skeleton.length ) {

            console.log( 'ColladaLoader: Could not find the skeleton for the skin. ' );
            return;

        }

        var animationBounds = calcAnimationBounds();
        var skeleton = visualScene.getChildById( instanceCtrl.skeleton[0], true ) || visualScene.getChildBySid( instanceCtrl.skeleton[0], true );

        //flatten the skeleton into a list of bones
        var bonelist = flattenSkeleton(skeleton);
        var joints = skinController.skin.joints;

        //sort that list so that the order reflects the order in the joint list
        var sortedbones = [];
        for (var i = 0; i < joints.length; i ++) {

            for (var j = 0; j < bonelist.length; j ++) {

                if (bonelist[j].name === joints[i]) {

                    sortedbones[i] = bonelist[j];

                }

            }

        }

        //hook up the parents by index instead of name
        for (var i = 0; i < sortedbones.length; i ++) {

            for (var j = 0; j < sortedbones.length; j ++) {

                if (sortedbones[i].parent === sortedbones[j].name) {

                    sortedbones[i].parent = j;

                }

            }

        }


        var i, j, w, vidx, weight;
        var v = new THREE.Vector3(), o, s;

        // move vertices to bind shape
        for ( i = 0; i < geometry.vertices.length; i ++ ) {
            geometry.vertices[i].applyMatrix4( skinController.skin.bindShapeMatrix );
        }

        var skinIndices = [];
        var skinWeights = [];
        var weights = skinController.skin.weights;

        // hook up the skin weights
        // TODO - this might be a good place to choose greatest 4 weights
        for ( var i =0; i < weights.length; i ++ ) {

            var indicies = new THREE.Vector4(weights[i][0] ? weights[i][0].joint : 0,weights[i][1] ? weights[i][1].joint : 0,weights[i][2] ? weights[i][2].joint : 0,weights[i][3] ? weights[i][3].joint : 0);
            var weight = new THREE.Vector4(weights[i][0] ? weights[i][0].weight : 0,weights[i][1] ? weights[i][1].weight : 0,weights[i][2] ? weights[i][2].weight : 0,weights[i][3] ? weights[i][3].weight : 0);

            skinIndices.push(indicies);
            skinWeights.push(weight);

        }

        geometry.skinIndices = skinIndices;
        geometry.skinWeights = skinWeights;
        geometry.bones = sortedbones;
        // process animation, or simply pose the rig if no animation

        //create an animation for the animated bones
        //NOTE: this has no effect when using morphtargets
        var animationdata = { "name":animationBounds.ID,"fps":30,"length":animationBounds.frames / 30,"hierarchy":[] };

        for (var j = 0; j < sortedbones.length; j ++) {

            animationdata.hierarchy.push({ parent:sortedbones[j].parent, name:sortedbones[j].name, keys:[] });

        }

        console.log( 'ColladaLoader:', animationBounds.ID + ' has ' + sortedbones.length + ' bones.' );



        skinToBindPose(geometry, skeleton, skinController);


        for ( frame = 0; frame < animationBounds.frames; frame ++ ) {

            var bones = [];
            var skinned = [];
            // process the frame and setup the rig with a fresh
            // transform, possibly from the bone's animation channel(s)

            setupSkeleton( skeleton, bones, frame );
            setupSkinningMatrices( bones, skinController.skin );

            for (var i = 0; i < bones.length; i ++) {

                for (var j = 0; j < animationdata.hierarchy.length; j ++) {

                    if (animationdata.hierarchy[j].name === bones[i].sid) {

                        var key = {};
                        key.time = (frame / 30);
                        key.matrix = bones[i].animatrix;

                        if (frame === 0)
                            bones[i].matrix = key.matrix;

                        var data = [ new THREE.Vector3(),new THREE.Quaternion(),new THREE.Vector3() ];
                        key.matrix.decompose(data[0], data[1], data[2]);

                        key.pos = [ data[0].x,data[0].y,data[0].z ];

                        key.scl = [ data[2].x,data[2].y,data[2].z ];
                        key.rot = data[1];

                        animationdata.hierarchy[j].keys.push(key);

                    }

                }

            }

            geometry.animation = animationdata;

        }

    }

    function createKinematics() {

        if ( kinematicsModel && kinematicsModel.joints.length === 0 ) {
            kinematics = undefined;
            return;
        }

        var jointMap = {};

        var _addToMap = function( jointIndex, parentVisualElement ) {

            var parentVisualElementId = parentVisualElement.getAttribute( 'id' );
            var colladaNode = visualScene.getChildById( parentVisualElementId, true );
            var joint = kinematicsModel.joints[ jointIndex ];

            scene.traverse(function( node ) {

                if ( node.colladaId == parentVisualElementId ) {

                    jointMap[ jointIndex ] = {
                        node: node,
                        transforms: colladaNode.transforms,
                        joint: joint,
                        position: joint.zeroPosition
                    };

                }

            });

        };

        kinematics = {

            joints: kinematicsModel && kinematicsModel.joints,

            getJointValue: function( jointIndex ) {

                var jointData = jointMap[ jointIndex ];

                if ( jointData ) {

                    return jointData.position;

                } else {

                    console.log( 'getJointValue: joint ' + jointIndex + ' doesn\'t exist' );

                }

            },

            setJointValue: function( jointIndex, value ) {

                var jointData = jointMap[ jointIndex ];

                if ( jointData ) {

                    var joint = jointData.joint;

                    if ( value > joint.limits.max || value < joint.limits.min ) {

                        console.log( 'setJointValue: joint ' + jointIndex + ' value ' + value + ' outside of limits (min: ' + joint.limits.min + ', max: ' + joint.limits.max + ')' );

                    } else if ( joint.static ) {

                        console.log( 'setJointValue: joint ' + jointIndex + ' is static' );

                    } else {

                        var threejsNode = jointData.node;
                        var axis = joint.axis;
                        var transforms = jointData.transforms;

                        var matrix = new THREE.Matrix4();

                        for (i = 0; i < transforms.length; i ++ ) {

                            var transform = transforms[ i ];

                            // kinda ghetto joint detection
                            if ( transform.sid && transform.sid.indexOf( 'joint' + jointIndex ) !== -1 ) {

                                // apply actual joint value here
                                switch ( joint.type ) {

                                    case 'revolute':

                                        matrix.multiply( m1.makeRotationAxis( axis, THREE.Math.degToRad(value) ) );
                                        break;

                                    case 'prismatic':

                                        matrix.multiply( m1.makeTranslation(axis.x * value, axis.y * value, axis.z * value ) );
                                        break;

                                    default:

                                        console.warn( 'setJointValue: unknown joint type: ' + joint.type );
                                        break;

                                }

                            } else {

                                var m1 = new THREE.Matrix4();

                                switch ( transform.type ) {

                                    case 'matrix':

                                        matrix.multiply( transform.obj );

                                        break;

                                    case 'translate':

                                        matrix.multiply( m1.makeTranslation( transform.obj.x, transform.obj.y, transform.obj.z ) );

                                        break;

                                    case 'rotate':

                                        matrix.multiply( m1.makeRotationAxis( transform.obj, transform.angle ) );

                                        break;

                                }
                            }
                        }

                        // apply the matrix to the threejs node
                        var elementsFloat32Arr = matrix.elements;
                        var elements = Array.prototype.slice.call( elementsFloat32Arr );

                        var elementsRowMajor = [
                            elements[ 0 ],
                            elements[ 4 ],
                            elements[ 8 ],
                            elements[ 12 ],
                            elements[ 1 ],
                            elements[ 5 ],
                            elements[ 9 ],
                            elements[ 13 ],
                            elements[ 2 ],
                            elements[ 6 ],
                            elements[ 10 ],
                            elements[ 14 ],
                            elements[ 3 ],
                            elements[ 7 ],
                            elements[ 11 ],
                            elements[ 15 ]
                        ];

                        threejsNode.matrix.set.apply( threejsNode.matrix, elementsRowMajor );
                        threejsNode.matrix.decompose( threejsNode.position, threejsNode.quaternion, threejsNode.scale );
                    }

                } else {

                    console.log( 'setJointValue: joint ' + jointIndex + ' doesn\'t exist' );

                }

            }

        };

        var element = COLLADA.querySelector('scene instance_kinematics_scene');

        if ( element ) {

            for ( var i = 0; i < element.childNodes.length; i ++ ) {

                var child = element.childNodes[ i ];

                if ( child.nodeType != 1 ) continue;

                switch ( child.nodeName ) {

                    case 'bind_joint_axis':

                        var visualTarget = child.getAttribute( 'target' ).split( '/' ).pop();
                        var axis = child.querySelector('axis param').textContent;
                        var jointIndex = parseInt( axis.split( 'joint' ).pop().split( '.' )[0] );
                        var visualTargetElement = COLLADA.querySelector( '[sid="' + visualTarget + '"]' );

                        if ( visualTargetElement ) {
                            var parentVisualElement = visualTargetElement.parentElement;
                            _addToMap(jointIndex, parentVisualElement);
                        }

                        break;

                    default:

                        break;

                }

            }
        }

    }

    function createSceneGraph ( node, parent ) {

        var obj = new THREE.Object3D();
        var skinned = false;
        var skinController;
        var morphController;
        var i, j;

        // FIXME: controllers

        for ( i = 0; i < node.controllers.length; i ++ ) {

            var controller = controllers[ node.controllers[ i ].url ];

            switch ( controller.type ) {

                case 'skin':

                    if ( geometries[ controller.skin.source ] ) {

                        var inst_geom = new InstanceGeometry();

                        inst_geom.url = controller.skin.source;
                        inst_geom.instance_material = node.controllers[ i ].instance_material;

                        node.geometries.push( inst_geom );
                        skinned = true;
                        skinController = node.controllers[ i ];

                    } else if ( controllers[ controller.skin.source ] ) {

                        // urgh: controller can be chained
                        // handle the most basic case...

                        var second = controllers[ controller.skin.source ];
                        morphController = second;
                    //	skinController = node.controllers[i];

                        if ( second.morph && geometries[ second.morph.source ] ) {

                            var inst_geom = new InstanceGeometry();

                            inst_geom.url = second.morph.source;
                            inst_geom.instance_material = node.controllers[ i ].instance_material;

                            node.geometries.push( inst_geom );

                        }

                    }

                    break;

                case 'morph':

                    if ( geometries[ controller.morph.source ] ) {

                        var inst_geom = new InstanceGeometry();

                        inst_geom.url = controller.morph.source;
                        inst_geom.instance_material = node.controllers[ i ].instance_material;

                        node.geometries.push( inst_geom );
                        morphController = node.controllers[ i ];

                    }

                    console.log( 'ColladaLoader: Morph-controller partially supported.' );

                default:
                    break;

            }

        }

        // geometries

        var double_sided_materials = {};

        for ( i = 0; i < node.geometries.length; i ++ ) {

            var instance_geometry = node.geometries[i];
            var instance_materials = instance_geometry.instance_material;
            var geometry = geometries[ instance_geometry.url ];
            var used_materials = {};
            var used_materials_array = [];
            var num_materials = 0;
            var first_material;

            if ( geometry ) {

                if ( !geometry.mesh || !geometry.mesh.primitives )
                    continue;

                if ( obj.name.length === 0 ) {

                    obj.name = geometry.id;

                }

                // collect used fx for this geometry-instance

                if ( instance_materials ) {

                    for ( j = 0; j < instance_materials.length; j ++ ) {

                        var instance_material = instance_materials[ j ];
                        var mat = materials[ instance_material.target ];
                        var effect_id = mat.instance_effect.url;
                        var shader = effects[ effect_id ].shader;
                        var material3js = shader.material;

                        if ( geometry.doubleSided ) {

                            if ( !( instance_material.symbol in double_sided_materials ) ) {

                                var _copied_material = material3js.clone();
                                _copied_material.side = THREE.DoubleSide;
                                double_sided_materials[ instance_material.symbol ] = _copied_material;

                            }

                            material3js = double_sided_materials[ instance_material.symbol ];

                        }

                        material3js.opacity = !material3js.opacity ? 1 : material3js.opacity;
                        used_materials[ instance_material.symbol ] = num_materials;
                        used_materials_array.push( material3js );
                        first_material = material3js;
                        first_material.name = mat.name === null || mat.name === '' ? mat.id : mat.name;
                        num_materials ++;

                    }

                }

                var mesh;
                var material = first_material || new THREE.MeshLambertMaterial( { color: 0xdddddd, side: geometry.doubleSided ? THREE.DoubleSide : THREE.FrontSide } );
                var geom = geometry.mesh.geometry3js;

                if ( num_materials > 1 ) {

                    material = new THREE.MultiMaterial( used_materials_array );

                }

                if ( skinController !== undefined ) {


                    applySkin( geom, skinController );

                    if ( geom.morphTargets.length > 0 ) {

                        material.morphTargets = true;
                        material.skinning = false;

                    } else {

                        material.morphTargets = false;
                        material.skinning = true;

                    }


                    mesh = new THREE.SkinnedMesh( geom, material, false );


                    //mesh.skeleton = skinController.skeleton;
                    //mesh.skinController = controllers[ skinController.url ];
                    //mesh.skinInstanceController = skinController;
                    mesh.name = 'skin_' + skins.length;



                    //mesh.animationHandle.setKey(0);
                    skins.push( mesh );

                } else if ( morphController !== undefined ) {

                    createMorph( geom, morphController );

                    material.morphTargets = true;

                    mesh = new THREE.Mesh( geom, material );
                    mesh.name = 'morph_' + morphs.length;

                    morphs.push( mesh );

                } else {

                    if ( geom.isLineStrip === true ) {

                        mesh = new THREE.Line( geom );

                    } else {

                        mesh = new THREE.Mesh( geom, material );

                    }

                }

                obj.add(mesh);

            }

        }

        for ( i = 0; i < node.cameras.length; i ++ ) {

            var instance_camera = node.cameras[i];
            var cparams = cameras[instance_camera.url];

            var cam = new THREE.PerspectiveCamera(cparams.yfov, parseFloat(cparams.aspect_ratio),
                    parseFloat(cparams.znear), parseFloat(cparams.zfar));

            obj.add(cam);
        }

        for ( i = 0; i < node.lights.length; i ++ ) {

            var light = null;
            var instance_light = node.lights[i];
            var lparams = lights[instance_light.url];

            if ( lparams && lparams.technique ) {

                var color = lparams.color.getHex();
                var intensity = lparams.intensity;
                var distance = lparams.distance;
                var angle = lparams.falloff_angle;

                switch ( lparams.technique ) {

                    case 'directional':

                        light = new THREE.DirectionalLight( color, intensity, distance );
                        light.position.set(0, 0, 1);
                        break;

                    case 'point':

                        light = new THREE.PointLight( color, intensity, distance );
                        break;

                    case 'spot':

                        light = new THREE.SpotLight( color, intensity, distance, angle );
                        light.position.set(0, 0, 1);
                        break;

                    case 'ambient':

                        light = new THREE.AmbientLight( color );
                        break;

                }

            }

            if (light) {
                obj.add(light);
            }
        }

        obj.name = node.name || node.id || "";
        obj.colladaId = node.id || "";
        obj.layer = node.layer || "";
        obj.matrix = node.matrix;
        obj.matrix.decompose( obj.position, obj.quaternion, obj.scale );

        if ( options.centerGeometry && obj.geometry ) {

            var delta = obj.geometry.center();
            delta.multiply( obj.scale );
            delta.applyQuaternion( obj.quaternion );

            obj.position.sub( delta );

        }

        for ( i = 0; i < node.nodes.length; i ++ ) {

            obj.add( createSceneGraph( node.nodes[i], node ) );

        }

        return obj;

    }

    function getJointId( skin, id ) {

        for ( var i = 0; i < skin.joints.length; i ++ ) {

            if ( skin.joints[ i ] === id ) {

                return i;

            }

        }

    }

    function getLibraryNode( id ) {

        var nodes = COLLADA.querySelectorAll('library_nodes node');

        for ( var i = 0; i < nodes.length; i++ ) {

            var attObj = nodes[i].attributes.getNamedItem('id');

            if ( attObj && attObj.value === id ) {

                return nodes[i];

            }

        }

        return undefined;

    }

    function getChannelsForNode ( node ) {

        var channels = [];
        var startTime = 1000000;
        var endTime = -1000000;

        for ( var id in animations ) {

            var animation = animations[id];

            for ( var i = 0; i < animation.channel.length; i ++ ) {

                var channel = animation.channel[i];
                var sampler = animation.sampler[i];
                var id = channel.target.split('/')[0];

                if ( id == node.id ) {

                    sampler.create();
                    channel.sampler = sampler;
                    startTime = Math.min(startTime, sampler.startTime);
                    endTime = Math.max(endTime, sampler.endTime);
                    channels.push(channel);

                }

            }

        }

        if ( channels.length ) {

            node.startTime = startTime;
            node.endTime = endTime;

        }

        return channels;

    }

    function calcFrameDuration( node ) {

        var minT = 10000000;

        for ( var i = 0; i < node.channels.length; i ++ ) {

            var sampler = node.channels[i].sampler;

            for ( var j = 0; j < sampler.input.length - 1; j ++ ) {

                var t0 = sampler.input[ j ];
                var t1 = sampler.input[ j + 1 ];
                minT = Math.min( minT, t1 - t0 );

            }
        }

        return minT;

    }

    function calcMatrixAt( node, t ) {

        var animated = {};

        var i, j;

        for ( i = 0; i < node.channels.length; i ++ ) {

            var channel = node.channels[ i ];
            animated[ channel.sid ] = channel;

        }

        var matrix = new THREE.Matrix4();

        for ( i = 0; i < node.transforms.length; i ++ ) {

            var transform = node.transforms[ i ];
            var channel = animated[ transform.sid ];

            if ( channel !== undefined ) {

                var sampler = channel.sampler;
                var value;

                for ( j = 0; j < sampler.input.length - 1; j ++ ) {

                    if ( sampler.input[ j + 1 ] > t ) {

                        value = sampler.output[ j ];
                        //console.log(value.flatten)
                        break;

                    }

                }

                if ( value !== undefined ) {

                    if ( value instanceof THREE.Matrix4 ) {

                        matrix.multiplyMatrices( matrix, value );

                    } else {

                        // FIXME: handle other types

                        matrix.multiplyMatrices( matrix, transform.matrix );

                    }

                } else {

                    matrix.multiplyMatrices( matrix, transform.matrix );

                }

            } else {

                matrix.multiplyMatrices( matrix, transform.matrix );

            }

        }

        return matrix;

    }

    function bakeAnimations ( node ) {

        if ( node.channels && node.channels.length ) {

            var keys = [],
                sids = [];

            for ( var i = 0, il = node.channels.length; i < il; i ++ ) {

                var channel = node.channels[i],
                    fullSid = channel.fullSid,
                    sampler = channel.sampler,
                    input = sampler.input,
                    transform = node.getTransformBySid( channel.sid ),
                    member;

                if ( channel.arrIndices ) {

                    member = [];

                    for ( var j = 0, jl = channel.arrIndices.length; j < jl; j ++ ) {

                        member[ j ] = getConvertedIndex( channel.arrIndices[ j ] );

                    }

                } else {

                    member = getConvertedMember( channel.member );

                }

                if ( transform ) {

                    if ( sids.indexOf( fullSid ) === -1 ) {

                        sids.push( fullSid );

                    }

                    for ( var j = 0, jl = input.length; j < jl; j ++ ) {

                        var time = input[j],
                            data = sampler.getData( transform.type, j, member ),
                            key = findKey( keys, time );

                        if ( !key ) {

                            key = new Key( time );
                            var timeNdx = findTimeNdx( keys, time );
                            keys.splice( timeNdx === -1 ? keys.length : timeNdx, 0, key );

                        }

                        key.addTarget( fullSid, transform, member, data );

                    }

                } else {

                    console.log( 'Could not find transform "' + channel.sid + '" in node ' + node.id );

                }

            }

            // post process
            for ( var i = 0; i < sids.length; i ++ ) {

                var sid = sids[ i ];

                for ( var j = 0; j < keys.length; j ++ ) {

                    var key = keys[ j ];

                    if ( !key.hasTarget( sid ) ) {

                        interpolateKeys( keys, key, j, sid );

                    }

                }

            }

            node.keys = keys;
            node.sids = sids;

        }

    }

    function findKey ( keys, time) {

        var retVal = null;

        for ( var i = 0, il = keys.length; i < il && retVal === null; i ++ ) {

            var key = keys[i];

            if ( key.time === time ) {

                retVal = key;

            } else if ( key.time > time ) {

                break;

            }

        }

        return retVal;

    }

    function findTimeNdx ( keys, time) {

        var ndx = -1;

        for ( var i = 0, il = keys.length; i < il && ndx === -1; i ++ ) {

            var key = keys[i];

            if ( key.time >= time ) {

                ndx = i;

            }

        }

        return ndx;

    }

    function interpolateKeys ( keys, key, ndx, fullSid ) {

        var prevKey = getPrevKeyWith( keys, fullSid, ndx ? ndx - 1 : 0 ),
            nextKey = getNextKeyWith( keys, fullSid, ndx + 1 );

        if ( prevKey && nextKey ) {

            var scale = (key.time - prevKey.time) / (nextKey.time - prevKey.time),
                prevTarget = prevKey.getTarget( fullSid ),
                nextData = nextKey.getTarget( fullSid ).data,
                prevData = prevTarget.data,
                data;

            if ( prevTarget.type === 'matrix' ) {

                data = prevData;

            } else if ( prevData.length ) {

                data = [];

                for ( var i = 0; i < prevData.length; ++ i ) {

                    data[ i ] = prevData[ i ] + ( nextData[ i ] - prevData[ i ] ) * scale;

                }

            } else {

                data = prevData + ( nextData - prevData ) * scale;

            }

            key.addTarget( fullSid, prevTarget.transform, prevTarget.member, data );

        }

    }

    // Get next key with given sid

    function getNextKeyWith( keys, fullSid, ndx ) {

        for ( ; ndx < keys.length; ndx ++ ) {

            var key = keys[ ndx ];

            if ( key.hasTarget( fullSid ) ) {

                return key;

            }

        }

        return null;

    }

    // Get previous key with given sid

    function getPrevKeyWith( keys, fullSid, ndx ) {

        ndx = ndx >= 0 ? ndx : ndx + keys.length;

        for ( ; ndx >= 0; ndx -- ) {

            var key = keys[ ndx ];

            if ( key.hasTarget( fullSid ) ) {

                return key;

            }

        }

        return null;

    }

    function _Image() {

        this.id = "";
        this.init_from = "";

    }

    _Image.prototype.parse = function(element) {

        this.id = element.getAttribute('id');

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];

            if ( child.nodeName === 'init_from' ) {

                this.init_from = child.textContent;

            }

        }

        return this;

    };

    function Controller() {

        this.id = "";
        this.name = "";
        this.type = "";
        this.skin = null;
        this.morph = null;

    }

    Controller.prototype.parse = function( element ) {

        this.id = element.getAttribute('id');
        this.name = element.getAttribute('name');
        this.type = "none";

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];

            switch ( child.nodeName ) {

                case 'skin':

                    this.skin = (new Skin()).parse(child);
                    this.type = child.nodeName;
                    break;

                case 'morph':

                    this.morph = (new Morph()).parse(child);
                    this.type = child.nodeName;
                    break;

                default:
                    break;

            }
        }

        return this;

    };

    function Morph() {

        this.method = null;
        this.source = null;
        this.targets = null;
        this.weights = null;

    }

    Morph.prototype.parse = function( element ) {

        var sources = {};
        var inputs = [];
        var i;

        this.method = element.getAttribute( 'method' );
        this.source = element.getAttribute( 'source' ).replace( /^#/, '' );

        for ( i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'source':

                    var source = ( new Source() ).parse( child );
                    sources[ source.id ] = source;
                    break;

                case 'targets':

                    inputs = this.parseInputs( child );
                    break;

                default:

                    console.log( child.nodeName );
                    break;

            }

        }

        for ( i = 0; i < inputs.length; i ++ ) {

            var input = inputs[ i ];
            var source = sources[ input.source ];

            switch ( input.semantic ) {

                case 'MORPH_TARGET':

                    this.targets = source.read();
                    break;

                case 'MORPH_WEIGHT':

                    this.weights = source.read();
                    break;

                default:
                    break;

            }
        }

        return this;

    };

    Morph.prototype.parseInputs = function(element) {

        var inputs = [];

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[i];
            if ( child.nodeType != 1) continue;

            switch ( child.nodeName ) {

                case 'input':

                    inputs.push( (new Input()).parse(child) );
                    break;

                default:
                    break;
            }
        }

        return inputs;

    };

    function Skin() {

        this.source = "";
        this.bindShapeMatrix = null;
        this.invBindMatrices = [];
        this.joints = [];
        this.weights = [];

    }

    Skin.prototype.parse = function( element ) {

        var sources = {};
        var joints, weights;

        this.source = element.getAttribute( 'source' ).replace( /^#/, '' );
        this.invBindMatrices = [];
        this.joints = [];
        this.weights = [];

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[i];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'bind_shape_matrix':

                    var f = _floats(child.textContent);
                    this.bindShapeMatrix = getConvertedMat4( f );
                    break;

                case 'source':

                    var src = new Source().parse(child);
                    sources[ src.id ] = src;
                    break;

                case 'joints':

                    joints = child;
                    break;

                case 'vertex_weights':

                    weights = child;
                    break;

                default:

                    console.log( child.nodeName );
                    break;

            }
        }

        this.parseJoints( joints, sources );
        this.parseWeights( weights, sources );

        return this;

    };

    Skin.prototype.parseJoints = function ( element, sources ) {

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'input':

                    var input = ( new Input() ).parse( child );
                    var source = sources[ input.source ];

                    if ( input.semantic === 'JOINT' ) {

                        this.joints = source.read();

                    } else if ( input.semantic === 'INV_BIND_MATRIX' ) {

                        this.invBindMatrices = source.read();

                    }

                    break;

                default:
                    break;
            }

        }

    };

    Skin.prototype.parseWeights = function ( element, sources ) {

        var v, vcount, inputs = [];

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'input':

                    inputs.push( ( new Input() ).parse( child ) );
                    break;

                case 'v':

                    v = _ints( child.textContent );
                    break;

                case 'vcount':

                    vcount = _ints( child.textContent );
                    break;

                default:
                    break;

            }

        }

        var index = 0;

        for ( var i = 0; i < vcount.length; i ++ ) {

            var numBones = vcount[i];
            var vertex_weights = [];

            for ( var j = 0; j < numBones; j ++ ) {

                var influence = {};

                for ( var k = 0; k < inputs.length; k ++ ) {

                    var input = inputs[ k ];
                    var value = v[ index + input.offset ];

                    switch ( input.semantic ) {

                        case 'JOINT':

                            influence.joint = value;//this.joints[value];
                            break;

                        case 'WEIGHT':

                            influence.weight = sources[ input.source ].data[ value ];
                            break;

                        default:
                            break;

                    }

                }

                vertex_weights.push( influence );
                index += inputs.length;
            }

            for ( var j = 0; j < vertex_weights.length; j ++ ) {

                vertex_weights[ j ].index = i;

            }

            this.weights.push( vertex_weights );

        }

    };

    function VisualScene () {

        this.id = "";
        this.name = "";
        this.nodes = [];
        this.scene = new THREE.Group();

    }

    VisualScene.prototype.getChildById = function( id, recursive ) {

        for ( var i = 0; i < this.nodes.length; i ++ ) {

            var node = this.nodes[ i ].getChildById( id, recursive );

            if ( node ) {

                return node;

            }

        }

        return null;

    };

    VisualScene.prototype.getChildBySid = function( sid, recursive ) {

        for ( var i = 0; i < this.nodes.length; i ++ ) {

            var node = this.nodes[ i ].getChildBySid( sid, recursive );

            if ( node ) {

                return node;

            }

        }

        return null;

    };

    VisualScene.prototype.parse = function( element ) {

        this.id = element.getAttribute( 'id' );
        this.name = element.getAttribute( 'name' );
        this.nodes = [];

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'node':

                    this.nodes.push( ( new Node() ).parse( child ) );
                    break;

                default:
                    break;

            }

        }

        return this;

    };

    function Node() {

        this.id = "";
        this.name = "";
        this.sid = "";
        this.nodes = [];
        this.controllers = [];
        this.transforms = [];
        this.geometries = [];
        this.channels = [];
        this.matrix = new THREE.Matrix4();

    }

    Node.prototype.getChannelForTransform = function( transformSid ) {

        for ( var i = 0; i < this.channels.length; i ++ ) {

            var channel = this.channels[i];
            var parts = channel.target.split('/');
            var id = parts.shift();
            var sid = parts.shift();
            var dotSyntax = (sid.indexOf(".") >= 0);
            var arrSyntax = (sid.indexOf("(") >= 0);
            var arrIndices;
            var member;

            if ( dotSyntax ) {

                parts = sid.split(".");
                sid = parts.shift();
                member = parts.shift();

            } else if ( arrSyntax ) {

                arrIndices = sid.split("(");
                sid = arrIndices.shift();

                for ( var j = 0; j < arrIndices.length; j ++ ) {

                    arrIndices[ j ] = parseInt( arrIndices[ j ].replace( /\)/, '' ) );

                }

            }

            if ( sid === transformSid ) {

                channel.info = { sid: sid, dotSyntax: dotSyntax, arrSyntax: arrSyntax, arrIndices: arrIndices };
                return channel;

            }

        }

        return null;

    };

    Node.prototype.getChildById = function ( id, recursive ) {

        if ( this.id === id ) {

            return this;

        }

        if ( recursive ) {

            for ( var i = 0; i < this.nodes.length; i ++ ) {

                var n = this.nodes[ i ].getChildById( id, recursive );

                if ( n ) {

                    return n;

                }

            }

        }

        return null;

    };

    Node.prototype.getChildBySid = function ( sid, recursive ) {

        if ( this.sid === sid ) {

            return this;

        }

        if ( recursive ) {

            for ( var i = 0; i < this.nodes.length; i ++ ) {

                var n = this.nodes[ i ].getChildBySid( sid, recursive );

                if ( n ) {

                    return n;

                }

            }
        }

        return null;

    };

    Node.prototype.getTransformBySid = function ( sid ) {

        for ( var i = 0; i < this.transforms.length; i ++ ) {

            if ( this.transforms[ i ].sid === sid ) return this.transforms[ i ];

        }

        return null;

    };

    Node.prototype.parse = function( element ) {

        var url;

        this.id = element.getAttribute('id');
        this.sid = element.getAttribute('sid');
        this.name = element.getAttribute('name');
        this.type = element.getAttribute('type');
        this.layer = element.getAttribute('layer');

        this.type = this.type === 'JOINT' ? this.type : 'NODE';

        this.nodes = [];
        this.transforms = [];
        this.geometries = [];
        this.cameras = [];
        this.lights = [];
        this.controllers = [];
        this.matrix = new THREE.Matrix4();

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'node':

                    this.nodes.push( ( new Node() ).parse( child ) );
                    break;

                case 'instance_camera':

                    this.cameras.push( ( new InstanceCamera() ).parse( child ) );
                    break;

                case 'instance_controller':

                    this.controllers.push( ( new InstanceController() ).parse( child ) );
                    break;

                case 'instance_geometry':

                    this.geometries.push( ( new InstanceGeometry() ).parse( child ) );
                    break;

                case 'instance_light':

                    this.lights.push( ( new InstanceLight() ).parse( child ) );
                    break;

                case 'instance_node':

                    url = child.getAttribute( 'url' ).replace( /^#/, '' );
                    var iNode = getLibraryNode( url );

                    if ( iNode ) {

                        this.nodes.push( ( new Node() ).parse( iNode )) ;

                    }

                    break;

                case 'rotate':
                case 'translate':
                case 'scale':
                case 'matrix':
                case 'lookat':
                case 'skew':

                    this.transforms.push( ( new Transform() ).parse( child ) );
                    break;

                case 'extra':
                    break;

                default:

                    console.log( child.nodeName );
                    break;

            }

        }

        this.channels = getChannelsForNode( this );
        bakeAnimations( this );

        this.updateMatrix();

        return this;

    };

    Node.prototype.updateMatrix = function () {

        this.matrix.identity();

        for ( var i = 0; i < this.transforms.length; i ++ ) {

            this.transforms[ i ].apply( this.matrix );

        }

    };

    function Transform () {

        this.sid = "";
        this.type = "";
        this.data = [];
        this.obj = null;

    }

    Transform.prototype.parse = function ( element ) {

        this.sid = element.getAttribute( 'sid' );
        this.type = element.nodeName;
        this.data = _floats( element.textContent );
        this.convert();

        return this;

    };

    Transform.prototype.convert = function () {

        switch ( this.type ) {

            case 'matrix':

                this.obj = getConvertedMat4( this.data );
                break;

            case 'rotate':

                this.angle = THREE.Math.degToRad( this.data[3] );

            case 'translate':

                fixCoords( this.data, -1 );
                this.obj = new THREE.Vector3( this.data[ 0 ], this.data[ 1 ], this.data[ 2 ] );
                break;

            case 'scale':

                fixCoords( this.data, 1 );
                this.obj = new THREE.Vector3( this.data[ 0 ], this.data[ 1 ], this.data[ 2 ] );
                break;

            default:
                console.log( 'Can not convert Transform of type ' + this.type );
                break;

        }

    };

    Transform.prototype.apply = function () {

        var m1 = new THREE.Matrix4();

        return function ( matrix ) {

            switch ( this.type ) {

                case 'matrix':

                    matrix.multiply( this.obj );

                    break;

                case 'translate':

                    matrix.multiply( m1.makeTranslation( this.obj.x, this.obj.y, this.obj.z ) );

                    break;

                case 'rotate':

                    matrix.multiply( m1.makeRotationAxis( this.obj, this.angle ) );

                    break;

                case 'scale':

                    matrix.scale( this.obj );

                    break;

            }

        };

    }();

    Transform.prototype.update = function ( data, member ) {

        var members = [ 'X', 'Y', 'Z', 'ANGLE' ];

        switch ( this.type ) {

            case 'matrix':

                if ( ! member ) {

                    this.obj.copy( data );

                } else if ( member.length === 1 ) {

                    switch ( member[ 0 ] ) {

                        case 0:

                            this.obj.n11 = data[ 0 ];
                            this.obj.n21 = data[ 1 ];
                            this.obj.n31 = data[ 2 ];
                            this.obj.n41 = data[ 3 ];

                            break;

                        case 1:

                            this.obj.n12 = data[ 0 ];
                            this.obj.n22 = data[ 1 ];
                            this.obj.n32 = data[ 2 ];
                            this.obj.n42 = data[ 3 ];

                            break;

                        case 2:

                            this.obj.n13 = data[ 0 ];
                            this.obj.n23 = data[ 1 ];
                            this.obj.n33 = data[ 2 ];
                            this.obj.n43 = data[ 3 ];

                            break;

                        case 3:

                            this.obj.n14 = data[ 0 ];
                            this.obj.n24 = data[ 1 ];
                            this.obj.n34 = data[ 2 ];
                            this.obj.n44 = data[ 3 ];

                            break;

                    }

                } else if ( member.length === 2 ) {

                    var propName = 'n' + ( member[ 0 ] + 1 ) + ( member[ 1 ] + 1 );
                    this.obj[ propName ] = data;

                } else {

                    console.log('Incorrect addressing of matrix in transform.');

                }

                break;

            case 'translate':
            case 'scale':

                if ( Object.prototype.toString.call( member ) === '[object Array]' ) {

                    member = members[ member[ 0 ] ];

                }

                switch ( member ) {

                    case 'X':

                        this.obj.x = data;
                        break;

                    case 'Y':

                        this.obj.y = data;
                        break;

                    case 'Z':

                        this.obj.z = data;
                        break;

                    default:

                        this.obj.x = data[ 0 ];
                        this.obj.y = data[ 1 ];
                        this.obj.z = data[ 2 ];
                        break;

                }

                break;

            case 'rotate':

                if ( Object.prototype.toString.call( member ) === '[object Array]' ) {

                    member = members[ member[ 0 ] ];

                }

                switch ( member ) {

                    case 'X':

                        this.obj.x = data;
                        break;

                    case 'Y':

                        this.obj.y = data;
                        break;

                    case 'Z':

                        this.obj.z = data;
                        break;

                    case 'ANGLE':

                        this.angle = THREE.Math.degToRad( data );
                        break;

                    default:

                        this.obj.x = data[ 0 ];
                        this.obj.y = data[ 1 ];
                        this.obj.z = data[ 2 ];
                        this.angle = THREE.Math.degToRad( data[ 3 ] );
                        break;

                }
                break;

        }

    };

    function InstanceController() {

        this.url = "";
        this.skeleton = [];
        this.instance_material = [];

    }

    InstanceController.prototype.parse = function ( element ) {

        this.url = element.getAttribute('url').replace(/^#/, '');
        this.skeleton = [];
        this.instance_material = [];

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType !== 1 ) continue;

            switch ( child.nodeName ) {

                case 'skeleton':

                    this.skeleton.push( child.textContent.replace(/^#/, '') );
                    break;

                case 'bind_material':

                    var instances = child.querySelectorAll('instance_material');

                    for ( var j = 0; j < instances.length; j ++ ) {

                        var instance = instances[j];
                        this.instance_material.push( (new InstanceMaterial()).parse(instance) );

                    }


                    break;

                case 'extra':
                    break;

                default:
                    break;

            }
        }

        return this;

    };

    function InstanceMaterial () {

        this.symbol = "";
        this.target = "";

    }

    InstanceMaterial.prototype.parse = function ( element ) {

        this.symbol = element.getAttribute('symbol');
        this.target = element.getAttribute('target').replace(/^#/, '');
        return this;

    };

    function InstanceGeometry() {

        this.url = "";
        this.instance_material = [];

    }

    InstanceGeometry.prototype.parse = function ( element ) {

        this.url = element.getAttribute('url').replace(/^#/, '');
        this.instance_material = [];

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[i];
            if ( child.nodeType != 1 ) continue;

            if ( child.nodeName === 'bind_material' ) {

                var instances = child.querySelectorAll('instance_material');

                for ( var j = 0; j < instances.length; j ++ ) {

                    var instance = instances[j];
                    this.instance_material.push( (new InstanceMaterial()).parse(instance) );

                }

                break;

            }

        }

        return this;

    };

    function Geometry() {

        this.id = "";
        this.mesh = null;

    }

    Geometry.prototype.parse = function ( element ) {

        this.id = element.getAttribute('id');

        extractDoubleSided( this, element );

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[i];

            switch ( child.nodeName ) {

                case 'mesh':

                    this.mesh = (new Mesh(this)).parse(child);
                    break;

                case 'extra':

                    // console.log( child );
                    break;

                default:
                    break;
            }
        }

        return this;

    };

    function Mesh( geometry ) {

        this.geometry = geometry.id;
        this.primitives = [];
        this.vertices = null;
        this.geometry3js = null;

    }

    Mesh.prototype.parse = function ( element ) {

        this.primitives = [];

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];

            switch ( child.nodeName ) {

                case 'source':

                    _source( child );
                    break;

                case 'vertices':

                    this.vertices = ( new Vertices() ).parse( child );
                    break;

                case 'linestrips':

                    this.primitives.push( ( new LineStrips().parse( child ) ) );
                    break;

                case 'triangles':

                    this.primitives.push( ( new Triangles().parse( child ) ) );
                    break;

                case 'polygons':

                    this.primitives.push( ( new Polygons().parse( child ) ) );
                    break;

                case 'polylist':

                    this.primitives.push( ( new Polylist().parse( child ) ) );
                    break;

                default:
                    break;

            }

        }

        this.geometry3js = new THREE.Geometry();

        if ( this.vertices === null ) {

            // TODO (mrdoob): Study case when this is null (carrier.dae)

            return this;

        }

        var vertexData = sources[ this.vertices.input['POSITION'].source ].data;

        for ( var i = 0; i < vertexData.length; i += 3 ) {

            this.geometry3js.vertices.push( getConvertedVec3( vertexData, i ).clone() );

        }

        for ( var i = 0; i < this.primitives.length; i ++ ) {

            var primitive = this.primitives[ i ];
            primitive.setVertices( this.vertices );
            this.handlePrimitive( primitive, this.geometry3js );

        }

        if ( this.geometry3js.calcNormals ) {

            this.geometry3js.computeVertexNormals();
            delete this.geometry3js.calcNormals;

        }

        return this;

    };

    Mesh.prototype.handlePrimitive = function ( primitive, geom ) {

        if ( primitive instanceof LineStrips ) {

            // TODO: Handle indices. Maybe easier with BufferGeometry?

            geom.isLineStrip = true;
            return;

        }

        var j, k, pList = primitive.p, inputs = primitive.inputs;
        var input, index, idx32;
        var source, numParams;
        var vcIndex = 0, vcount = 3, maxOffset = 0;
        var texture_sets = [];

        for ( j = 0; j < inputs.length; j ++ ) {

            input = inputs[ j ];

            var offset = input.offset + 1;
            maxOffset = (maxOffset < offset) ? offset : maxOffset;

            switch ( input.semantic ) {

                case 'TEXCOORD':
                    texture_sets.push( input.set );
                    break;

            }

        }

        for ( var pCount = 0; pCount < pList.length; ++ pCount ) {

            var p = pList[ pCount ], i = 0;

            while ( i < p.length ) {

                var vs = [];
                var ns = [];
                var ts = null;
                var cs = [];

                if ( primitive.vcount ) {

                    vcount = primitive.vcount.length ? primitive.vcount[ vcIndex ++ ] : primitive.vcount;

                } else {

                    vcount = p.length / maxOffset;

                }


                for ( j = 0; j < vcount; j ++ ) {

                    for ( k = 0; k < inputs.length; k ++ ) {

                        input = inputs[ k ];
                        source = sources[ input.source ];

                        index = p[ i + ( j * maxOffset ) + input.offset ];
                        numParams = source.accessor.params.length;
                        idx32 = index * numParams;

                        switch ( input.semantic ) {

                            case 'VERTEX':

                                vs.push( index );

                                break;

                            case 'NORMAL':

                                ns.push( getConvertedVec3( source.data, idx32 ) );

                                break;

                            case 'TEXCOORD':

                                ts = ts || { };
                                if ( ts[ input.set ] === undefined ) ts[ input.set ] = [];
                                // invert the V
                                ts[ input.set ].push( new THREE.Vector2( source.data[ idx32 ], source.data[ idx32 + 1 ] ) );

                                break;

                            case 'COLOR':

                                cs.push( new THREE.Color().setRGB( source.data[ idx32 ], source.data[ idx32 + 1 ], source.data[ idx32 + 2 ] ) );

                                break;

                            default:

                                break;

                        }

                    }

                }

                if ( ns.length === 0 ) {

                    // check the vertices inputs
                    input = this.vertices.input.NORMAL;

                    if ( input ) {

                        source = sources[ input.source ];
                        numParams = source.accessor.params.length;

                        for ( var ndx = 0, len = vs.length; ndx < len; ndx ++ ) {

                            ns.push( getConvertedVec3( source.data, vs[ ndx ] * numParams ) );

                        }

                    } else {

                        geom.calcNormals = true;

                    }

                }

                if ( !ts ) {

                    ts = { };
                    // check the vertices inputs
                    input = this.vertices.input.TEXCOORD;

                    if ( input ) {

                        texture_sets.push( input.set );
                        source = sources[ input.source ];
                        numParams = source.accessor.params.length;

                        for ( var ndx = 0, len = vs.length; ndx < len; ndx ++ ) {

                            idx32 = vs[ ndx ] * numParams;
                            if ( ts[ input.set ] === undefined ) ts[ input.set ] = [ ];
                            // invert the V
                            ts[ input.set ].push( new THREE.Vector2( source.data[ idx32 ], 1.0 - source.data[ idx32 + 1 ] ) );

                        }

                    }

                }

                if ( cs.length === 0 ) {

                    // check the vertices inputs
                    input = this.vertices.input.COLOR;

                    if ( input ) {

                        source = sources[ input.source ];
                        numParams = source.accessor.params.length;

                        for ( var ndx = 0, len = vs.length; ndx < len; ndx ++ ) {

                            idx32 = vs[ ndx ] * numParams;
                            cs.push( new THREE.Color().setRGB( source.data[ idx32 ], source.data[ idx32 + 1 ], source.data[ idx32 + 2 ] ) );

                        }

                    }

                }

                var face = null, faces = [], uv, uvArr;

                if ( vcount === 3 ) {

                    faces.push( new THREE.Face3( vs[0], vs[1], vs[2], ns, cs.length ? cs : new THREE.Color() ) );

                } else if ( vcount === 4 ) {

                    faces.push( new THREE.Face3( vs[0], vs[1], vs[3], ns.length ? [ ns[0].clone(), ns[1].clone(), ns[3].clone() ] : [], cs.length ? [ cs[0], cs[1], cs[3] ] : new THREE.Color() ) );

                    faces.push( new THREE.Face3( vs[1], vs[2], vs[3], ns.length ? [ ns[1].clone(), ns[2].clone(), ns[3].clone() ] : [], cs.length ? [ cs[1], cs[2], cs[3] ] : new THREE.Color() ) );

                } else if ( vcount > 4 && options.subdivideFaces ) {

                    var clr = cs.length ? cs : new THREE.Color(),
                        vec1, vec2, vec3, v1, v2, norm;

                    // subdivide into multiple Face3s

                    for ( k = 1; k < vcount - 1; ) {

                        faces.push( new THREE.Face3( vs[0], vs[k], vs[k + 1], ns.length ? [ ns[0].clone(), ns[k ++].clone(), ns[k].clone() ] : [], clr ) );

                    }

                }

                if ( faces.length ) {

                    for ( var ndx = 0, len = faces.length; ndx < len; ndx ++ ) {

                        face = faces[ndx];
                        face.daeMaterial = primitive.material;
                        geom.faces.push( face );

                        for ( k = 0; k < texture_sets.length; k ++ ) {

                            uv = ts[ texture_sets[k] ];

                            if ( vcount > 4 ) {

                                // Grab the right UVs for the vertices in this face
                                uvArr = [ uv[0], uv[ndx + 1], uv[ndx + 2] ];

                            } else if ( vcount === 4 ) {

                                if ( ndx === 0 ) {

                                    uvArr = [ uv[0], uv[1], uv[3] ];

                                } else {

                                    uvArr = [ uv[1].clone(), uv[2], uv[3].clone() ];

                                }

                            } else {

                                uvArr = [ uv[0], uv[1], uv[2] ];

                            }

                            if ( geom.faceVertexUvs[k] === undefined ) {

                                geom.faceVertexUvs[k] = [];

                            }

                            geom.faceVertexUvs[k].push( uvArr );

                        }

                    }

                } else {

                    console.log( 'dropped face with vcount ' + vcount + ' for geometry with id: ' + geom.id );

                }

                i += maxOffset * vcount;

            }

        }

    };

    function Polygons () {

        this.material = "";
        this.count = 0;
        this.inputs = [];
        this.vcount = null;
        this.p = [];
        this.geometry = new THREE.Geometry();

    }

    Polygons.prototype.setVertices = function ( vertices ) {

        for ( var i = 0; i < this.inputs.length; i ++ ) {

            if ( this.inputs[ i ].source === vertices.id ) {

                this.inputs[ i ].source = vertices.input[ 'POSITION' ].source;

            }

        }

    };

    Polygons.prototype.parse = function ( element ) {

        this.material = element.getAttribute( 'material' );
        this.count = _attr_as_int( element, 'count', 0 );

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];

            switch ( child.nodeName ) {

                case 'input':

                    this.inputs.push( ( new Input() ).parse( element.childNodes[ i ] ) );
                    break;

                case 'vcount':

                    this.vcount = _ints( child.textContent );
                    break;

                case 'p':

                    this.p.push( _ints( child.textContent ) );
                    break;

                case 'ph':

                    console.warn( 'polygon holes not yet supported!' );
                    break;

                default:
                    break;

            }

        }

        return this;

    };

    function Polylist () {

        Polygons.call( this );

        this.vcount = [];

    }

    Polylist.prototype = Object.create( Polygons.prototype );
    Polylist.prototype.constructor = Polylist;

    function LineStrips() {

        Polygons.call( this );

        this.vcount = 1;

    }

    LineStrips.prototype = Object.create( Polygons.prototype );
    LineStrips.prototype.constructor = LineStrips;

    function Triangles () {

        Polygons.call( this );

        this.vcount = 3;

    }

    Triangles.prototype = Object.create( Polygons.prototype );
    Triangles.prototype.constructor = Triangles;

    function Accessor() {

        this.source = "";
        this.count = 0;
        this.stride = 0;
        this.params = [];

    }

    Accessor.prototype.parse = function ( element ) {

        this.params = [];
        this.source = element.getAttribute( 'source' );
        this.count = _attr_as_int( element, 'count', 0 );
        this.stride = _attr_as_int( element, 'stride', 0 );

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];

            if ( child.nodeName === 'param' ) {

                var param = {};
                param[ 'name' ] = child.getAttribute( 'name' );
                param[ 'type' ] = child.getAttribute( 'type' );
                this.params.push( param );

            }

        }

        return this;

    };

    function Vertices() {

        this.input = {};

    }

    Vertices.prototype.parse = function ( element ) {

        this.id = element.getAttribute('id');

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            if ( element.childNodes[i].nodeName === 'input' ) {

                var input = ( new Input() ).parse( element.childNodes[ i ] );
                this.input[ input.semantic ] = input;

            }

        }

        return this;

    };

    function Input () {

        this.semantic = "";
        this.offset = 0;
        this.source = "";
        this.set = 0;

    }

    Input.prototype.parse = function ( element ) {

        this.semantic = element.getAttribute('semantic');
        this.source = element.getAttribute('source').replace(/^#/, '');
        this.set = _attr_as_int(element, 'set', -1);
        this.offset = _attr_as_int(element, 'offset', 0);

        if ( this.semantic === 'TEXCOORD' && this.set < 0 ) {

            this.set = 0;

        }

        return this;

    };

    function Source ( id ) {

        this.id = id;
        this.type = null;

    }

    Source.prototype.parse = function ( element ) {

        this.id = element.getAttribute( 'id' );

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[i];

            switch ( child.nodeName ) {

                case 'bool_array':

                    this.data = _bools( child.textContent );
                    this.type = child.nodeName;
                    break;

                case 'float_array':

                    this.data = _floats( child.textContent );
                    this.type = child.nodeName;
                    break;

                case 'int_array':

                    this.data = _ints( child.textContent );
                    this.type = child.nodeName;
                    break;

                case 'IDREF_array':
                case 'Name_array':

                    this.data = _strings( child.textContent );
                    this.type = child.nodeName;
                    break;

                case 'technique_common':

                    for ( var j = 0; j < child.childNodes.length; j ++ ) {

                        if ( child.childNodes[ j ].nodeName === 'accessor' ) {

                            this.accessor = ( new Accessor() ).parse( child.childNodes[ j ] );
                            break;

                        }
                    }
                    break;

                default:
                    // console.log(child.nodeName);
                    break;

            }

        }

        return this;

    };

    Source.prototype.read = function () {

        var result = [];

        //for (var i = 0; i < this.accessor.params.length; i++) {

        var param = this.accessor.params[ 0 ];

            //console.log(param.name + " " + param.type);

        switch ( param.type ) {

            case 'IDREF':
            case 'Name': case 'name':
            case 'float':

                return this.data;

            case 'float4x4':

                for ( var j = 0; j < this.data.length; j += 16 ) {

                    var s = this.data.slice( j, j + 16 );
                    var m = getConvertedMat4( s );
                    result.push( m );
                }

                break;

            default:

                console.log( 'ColladaLoader: Source: Read dont know how to read ' + param.type + '.' );
                break;

        }

        //}

        return result;

    };

    function Material () {

        this.id = "";
        this.name = "";
        this.instance_effect = null;

    }

    Material.prototype.parse = function ( element ) {

        this.id = element.getAttribute( 'id' );
        this.name = element.getAttribute( 'name' );

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            if ( element.childNodes[ i ].nodeName === 'instance_effect' ) {

                this.instance_effect = ( new InstanceEffect() ).parse( element.childNodes[ i ] );
                break;

            }

        }

        return this;

    };

    function ColorOrTexture () {

        this.color = new THREE.Color();
        this.color.setRGB( Math.random(), Math.random(), Math.random() );
        this.color.a = 1.0;

        this.texture = null;
        this.texcoord = null;
        this.texOpts = null;

    }

    ColorOrTexture.prototype.isColor = function () {

        return ( this.texture === null );

    };

    ColorOrTexture.prototype.isTexture = function () {

        return ( this.texture != null );

    };

    ColorOrTexture.prototype.parse = function ( element ) {

        if (element.nodeName === 'transparent') {

            this.opaque = element.getAttribute('opaque');

        }

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'color':

                    var rgba = _floats( child.textContent );
                    this.color = new THREE.Color();
                    this.color.setRGB( rgba[0], rgba[1], rgba[2] );
                    this.color.a = rgba[3];
                    break;

                case 'texture':

                    this.texture = child.getAttribute('texture');
                    this.texcoord = child.getAttribute('texcoord');
                    // Defaults from:
                    // https://collada.org/mediawiki/index.php/Maya_texture_placement_MAYA_extension
                    this.texOpts = {
                        offsetU: 0,
                        offsetV: 0,
                        repeatU: 1,
                        repeatV: 1,
                        wrapU: 1,
                        wrapV: 1
                    };
                    this.parseTexture( child );
                    break;

                default:
                    break;

            }

        }

        return this;

    };

    ColorOrTexture.prototype.parseTexture = function ( element ) {

        if ( ! element.childNodes ) return this;

        // This should be supported by Maya, 3dsMax, and MotionBuilder

        if ( element.childNodes[1] && element.childNodes[1].nodeName === 'extra' ) {

            element = element.childNodes[1];

            if ( element.childNodes[1] && element.childNodes[1].nodeName === 'technique' ) {

                element = element.childNodes[1];

            }

        }

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];

            switch ( child.nodeName ) {

                case 'offsetU':
                case 'offsetV':
                case 'repeatU':
                case 'repeatV':

                    this.texOpts[ child.nodeName ] = parseFloat( child.textContent );

                    break;

                case 'wrapU':
                case 'wrapV':

                    // some dae have a value of true which becomes NaN via parseInt

                    if ( child.textContent.toUpperCase() === 'TRUE' ) {

                        this.texOpts[ child.nodeName ] = 1;

                    } else {

                        this.texOpts[ child.nodeName ] = parseInt( child.textContent );

                    }
                    break;

                default:

                    this.texOpts[ child.nodeName ] = child.textContent;

                    break;

            }

        }

        return this;

    };

    function Shader ( type, effect ) {

        this.type = type;
        this.effect = effect;
        this.material = null;

    }

    Shader.prototype.parse = function ( element ) {

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'emission':
                case 'diffuse':
                case 'specular':
                case 'transparent':

                    this[ child.nodeName ] = ( new ColorOrTexture() ).parse( child );
                    break;

                case 'bump':

                    // If 'bumptype' is 'heightfield', create a 'bump' property
                    // Else if 'bumptype' is 'normalmap', create a 'normal' property
                    // (Default to 'bump')
                    var bumpType = child.getAttribute( 'bumptype' );
                    if ( bumpType ) {
                        if ( bumpType.toLowerCase() === "heightfield" ) {
                            this[ 'bump' ] = ( new ColorOrTexture() ).parse( child );
                        } else if ( bumpType.toLowerCase() === "normalmap" ) {
                            this[ 'normal' ] = ( new ColorOrTexture() ).parse( child );
                        } else {
                            console.error( "Shader.prototype.parse: Invalid value for attribute 'bumptype' (" + bumpType + ") - valid bumptypes are 'HEIGHTFIELD' and 'NORMALMAP' - defaulting to 'HEIGHTFIELD'" );
                            this[ 'bump' ] = ( new ColorOrTexture() ).parse( child );
                        }
                    } else {
                        console.warn( "Shader.prototype.parse: Attribute 'bumptype' missing from bump node - defaulting to 'HEIGHTFIELD'" );
                        this[ 'bump' ] = ( new ColorOrTexture() ).parse( child );
                    }

                    break;

                case 'shininess':
                case 'reflectivity':
                case 'index_of_refraction':
                case 'transparency':

                    var f = child.querySelectorAll('float');

                    if ( f.length > 0 )
                        this[ child.nodeName ] = parseFloat( f[ 0 ].textContent );

                    break;

                default:
                    break;

            }

        }

        this.create();
        return this;

    };

    Shader.prototype.create = function() {

        var props = {};

        var transparent = false;

        if (this['transparency'] !== undefined && this['transparent'] !== undefined) {
            // convert transparent color RBG to average value
            var transparentColor = this['transparent'];
            var transparencyLevel = (this.transparent.color.r + this.transparent.color.g + this.transparent.color.b) / 3 * this.transparency;

            if (transparencyLevel > 0) {
                transparent = true;
                props[ 'transparent' ] = true;
                props[ 'opacity' ] = 1 - transparencyLevel;

            }

        }

        var keys = {
            'diffuse':'map',
            'ambient':'lightMap',
            'specular':'specularMap',
            'emission':'emissionMap',
            'bump':'bumpMap',
            'normal':'normalMap'
            };

        for ( var prop in this ) {

            switch ( prop ) {

                case 'ambient':
                case 'emission':
                case 'diffuse':
                case 'specular':
                case 'bump':
                case 'normal':

                    var cot = this[ prop ];

                    if ( cot instanceof ColorOrTexture ) {

                        if ( cot.isTexture() ) {

                            var samplerId = cot.texture;
                            var surfaceId = this.effect.sampler[samplerId];

                            if ( surfaceId !== undefined && surfaceId.source !== undefined ) {

                                var surface = this.effect.surface[surfaceId.source];

                                if ( surface !== undefined ) {

                                    var image = images[ surface.init_from ];

                                    if ( image ) {

                                        var url = baseUrl + image.init_from;

                                        var texture;
                                        var loader = THREE.Loader.Handlers.get( url );

                                        if ( loader !== null ) {

                                            texture = loader.load( url );

                                        } else {

                                            texture = new THREE.Texture();

                                            loadTextureImage( texture, url );

                                        }

                                        texture.wrapS = cot.texOpts.wrapU ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
                                        texture.wrapT = cot.texOpts.wrapV ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
                                        texture.offset.x = cot.texOpts.offsetU;
                                        texture.offset.y = cot.texOpts.offsetV;
                                        texture.repeat.x = cot.texOpts.repeatU;
                                        texture.repeat.y = cot.texOpts.repeatV;
                                        props[keys[prop]] = texture;

                                        // Texture with baked lighting?
                                        if (prop === 'emission') props['emissive'] = 0xffffff;

                                    }

                                }

                            }

                        } else if ( prop === 'diffuse' || !transparent ) {

                            if ( prop === 'emission' ) {

                                props[ 'emissive' ] = cot.color.getHex();

                            } else {

                                props[ prop ] = cot.color.getHex();

                            }

                        }

                    }

                    break;

                case 'shininess':

                    props[ prop ] = this[ prop ];
                    break;

                case 'reflectivity':

                    props[ prop ] = this[ prop ];
                    if ( props[ prop ] > 0.0 ) props['envMap'] = options.defaultEnvMap;
                    props['combine'] = THREE.MixOperation;	//mix regular shading with reflective component
                    break;

                case 'index_of_refraction':

                    props[ 'refractionRatio' ] = this[ prop ]; //TODO: "index_of_refraction" becomes "refractionRatio" in shader, but I'm not sure if the two are actually comparable
                    if ( this[ prop ] !== 1.0 ) props['envMap'] = options.defaultEnvMap;
                    break;

                case 'transparency':
                    // gets figured out up top
                    break;

                default:
                    break;

            }

        }

        props[ 'shading' ] = preferredShading;
        props[ 'side' ] = this.effect.doubleSided ? THREE.DoubleSide : THREE.FrontSide;

        if ( props.diffuse !== undefined ) {

            props.color = props.diffuse;
            delete props.diffuse;

        }

        switch ( this.type ) {

            case 'constant':

                if (props.emissive != undefined) props.color = props.emissive;
                this.material = new THREE.MeshBasicMaterial( props );
                break;

            case 'phong':
            case 'blinn':

                this.material = new THREE.MeshPhongMaterial( props );
                break;

            case 'lambert':
            default:

                this.material = new THREE.MeshLambertMaterial( props );
                break;

        }

        return this.material;

    };

    function Surface ( effect ) {

        this.effect = effect;
        this.init_from = null;
        this.format = null;

    }

    Surface.prototype.parse = function ( element ) {

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'init_from':

                    this.init_from = child.textContent;
                    break;

                case 'format':

                    this.format = child.textContent;
                    break;

                default:

                    console.log( "unhandled Surface prop: " + child.nodeName );
                    break;

            }

        }

        return this;

    };

    function Sampler2D ( effect ) {

        this.effect = effect;
        this.source = null;
        this.wrap_s = null;
        this.wrap_t = null;
        this.minfilter = null;
        this.magfilter = null;
        this.mipfilter = null;

    }

    Sampler2D.prototype.parse = function ( element ) {

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'source':

                    this.source = child.textContent;
                    break;

                case 'minfilter':

                    this.minfilter = child.textContent;
                    break;

                case 'magfilter':

                    this.magfilter = child.textContent;
                    break;

                case 'mipfilter':

                    this.mipfilter = child.textContent;
                    break;

                case 'wrap_s':

                    this.wrap_s = child.textContent;
                    break;

                case 'wrap_t':

                    this.wrap_t = child.textContent;
                    break;

                default:

                    console.log( "unhandled Sampler2D prop: " + child.nodeName );
                    break;

            }

        }

        return this;

    };

    function Effect () {

        this.id = "";
        this.name = "";
        this.shader = null;
        this.surface = {};
        this.sampler = {};

    }

    Effect.prototype.create = function () {

        if ( this.shader === null ) {

            return null;

        }

    };

    Effect.prototype.parse = function ( element ) {

        this.id = element.getAttribute( 'id' );
        this.name = element.getAttribute( 'name' );

        extractDoubleSided( this, element );

        this.shader = null;

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'profile_COMMON':

                    this.parseTechnique( this.parseProfileCOMMON( child ) );
                    break;

                default:
                    break;

            }

        }

        return this;

    };

    Effect.prototype.parseNewparam = function ( element ) {

        var sid = element.getAttribute( 'sid' );

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'surface':

                    this.surface[sid] = ( new Surface( this ) ).parse( child );
                    break;

                case 'sampler2D':

                    this.sampler[sid] = ( new Sampler2D( this ) ).parse( child );
                    break;

                case 'extra':

                    break;

                default:

                    console.log( child.nodeName );
                    break;

            }

        }

    };

    Effect.prototype.parseProfileCOMMON = function ( element ) {

        var technique;

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];

            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'profile_COMMON':

                    this.parseProfileCOMMON( child );
                    break;

                case 'technique':

                    technique = child;
                    break;

                case 'newparam':

                    this.parseNewparam( child );
                    break;

                case 'image':

                    var _image = ( new _Image() ).parse( child );
                    images[ _image.id ] = _image;
                    break;

                case 'extra':
                    break;

                default:

                    console.log( child.nodeName );
                    break;

            }

        }

        return technique;

    };

    Effect.prototype.parseTechnique = function ( element ) {

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[i];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'constant':
                case 'lambert':
                case 'blinn':
                case 'phong':

                    this.shader = ( new Shader( child.nodeName, this ) ).parse( child );
                    break;
                case 'extra':
                    this.parseExtra(child);
                    break;
                default:
                    break;

            }

        }

    };

    Effect.prototype.parseExtra = function ( element ) {

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[i];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'technique':
                    this.parseExtraTechnique( child );
                    break;
                default:
                    break;

            }

        }

    };

    Effect.prototype.parseExtraTechnique = function ( element ) {

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[i];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'bump':
                    this.shader.parse( element );
                    break;
                default:
                    break;

            }

        }

    };

    function InstanceEffect () {

        this.url = "";

    }

    InstanceEffect.prototype.parse = function ( element ) {

        this.url = element.getAttribute( 'url' ).replace( /^#/, '' );
        return this;

    };

    function Animation() {

        this.id = "";
        this.name = "";
        this.source = {};
        this.sampler = [];
        this.channel = [];

    }

    Animation.prototype.parse = function ( element ) {

        this.id = element.getAttribute( 'id' );
        this.name = element.getAttribute( 'name' );
        this.source = {};

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];

            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'animation':

                    var anim = ( new Animation() ).parse( child );

                    for ( var src in anim.source ) {

                        this.source[ src ] = anim.source[ src ];

                    }

                    for ( var j = 0; j < anim.channel.length; j ++ ) {

                        this.channel.push( anim.channel[ j ] );
                        this.sampler.push( anim.sampler[ j ] );

                    }

                    break;

                case 'source':

                    var src = ( new Source() ).parse( child );
                    this.source[ src.id ] = src;
                    break;

                case 'sampler':

                    this.sampler.push( ( new Sampler( this ) ).parse( child ) );
                    break;

                case 'channel':

                    this.channel.push( ( new Channel( this ) ).parse( child ) );
                    break;

                default:
                    break;

            }

        }

        return this;

    };

    function Channel( animation ) {

        this.animation = animation;
        this.source = "";
        this.target = "";
        this.fullSid = null;
        this.sid = null;
        this.dotSyntax = null;
        this.arrSyntax = null;
        this.arrIndices = null;
        this.member = null;

    }

    Channel.prototype.parse = function ( element ) {

        this.source = element.getAttribute( 'source' ).replace( /^#/, '' );
        this.target = element.getAttribute( 'target' );

        var parts = this.target.split( '/' );

        var id = parts.shift();
        var sid = parts.shift();

        var dotSyntax = ( sid.indexOf(".") >= 0 );
        var arrSyntax = ( sid.indexOf("(") >= 0 );

        if ( dotSyntax ) {

            parts = sid.split(".");
            this.sid = parts.shift();
            this.member = parts.shift();

        } else if ( arrSyntax ) {

            var arrIndices = sid.split("(");
            this.sid = arrIndices.shift();

            for (var j = 0; j < arrIndices.length; j ++ ) {

                arrIndices[j] = parseInt( arrIndices[j].replace(/\)/, '') );

            }

            this.arrIndices = arrIndices;

        } else {

            this.sid = sid;

        }

        this.fullSid = sid;
        this.dotSyntax = dotSyntax;
        this.arrSyntax = arrSyntax;

        return this;

    };

    function Sampler ( animation ) {

        this.id = "";
        this.animation = animation;
        this.inputs = [];
        this.input = null;
        this.output = null;
        this.strideOut = null;
        this.interpolation = null;
        this.startTime = null;
        this.endTime = null;
        this.duration = 0;

    }

    Sampler.prototype.parse = function ( element ) {

        this.id = element.getAttribute( 'id' );
        this.inputs = [];

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'input':

                    this.inputs.push( (new Input()).parse( child ) );
                    break;

                default:
                    break;

            }

        }

        return this;

    };

    Sampler.prototype.create = function () {

        for ( var i = 0; i < this.inputs.length; i ++ ) {

            var input = this.inputs[ i ];
            var source = this.animation.source[ input.source ];

            switch ( input.semantic ) {

                case 'INPUT':

                    this.input = source.read();
                    break;

                case 'OUTPUT':

                    this.output = source.read();
                    this.strideOut = source.accessor.stride;
                    break;

                case 'INTERPOLATION':

                    this.interpolation = source.read();
                    break;

                case 'IN_TANGENT':

                    break;

                case 'OUT_TANGENT':

                    break;

                default:

                    console.log(input.semantic);
                    break;

            }

        }

        this.startTime = 0;
        this.endTime = 0;
        this.duration = 0;

        if ( this.input.length ) {

            this.startTime = 100000000;
            this.endTime = -100000000;

            for ( var i = 0; i < this.input.length; i ++ ) {

                this.startTime = Math.min( this.startTime, this.input[ i ] );
                this.endTime = Math.max( this.endTime, this.input[ i ] );

            }

            this.duration = this.endTime - this.startTime;

        }

    };

    Sampler.prototype.getData = function ( type, ndx, member ) {

        var data;

        if ( type === 'matrix' && this.strideOut === 16 ) {

            data = this.output[ ndx ];

        } else if ( this.strideOut > 1 ) {

            data = [];
            ndx *= this.strideOut;

            for ( var i = 0; i < this.strideOut; ++ i ) {

                data[ i ] = this.output[ ndx + i ];

            }

            if ( this.strideOut === 3 ) {

                switch ( type ) {

                    case 'rotate':
                    case 'translate':

                        fixCoords( data, -1 );
                        break;

                    case 'scale':

                        fixCoords( data, 1 );
                        break;

                }

            } else if ( this.strideOut === 4 && type === 'matrix' ) {

                fixCoords( data, -1 );

            }

        } else {

            data = this.output[ ndx ];

            if ( member && type === 'translate' ) {
                data = getConvertedTranslation( member, data );
            }

        }

        return data;

    };

    function Key ( time ) {

        this.targets = [];
        this.time = time;

    }

    Key.prototype.addTarget = function ( fullSid, transform, member, data ) {

        this.targets.push( {
            sid: fullSid,
            member: member,
            transform: transform,
            data: data
        } );

    };

    Key.prototype.apply = function ( opt_sid ) {

        for ( var i = 0; i < this.targets.length; ++ i ) {

            var target = this.targets[ i ];

            if ( !opt_sid || target.sid === opt_sid ) {

                target.transform.update( target.data, target.member );

            }

        }

    };

    Key.prototype.getTarget = function ( fullSid ) {

        for ( var i = 0; i < this.targets.length; ++ i ) {

            if ( this.targets[ i ].sid === fullSid ) {

                return this.targets[ i ];

            }

        }

        return null;

    };

    Key.prototype.hasTarget = function ( fullSid ) {

        for ( var i = 0; i < this.targets.length; ++ i ) {

            if ( this.targets[ i ].sid === fullSid ) {

                return true;

            }

        }

        return false;

    };

    // TODO: Currently only doing linear interpolation. Should support full COLLADA spec.
    Key.prototype.interpolate = function ( nextKey, time ) {

        for ( var i = 0, l = this.targets.length; i < l; i ++ ) {

            var target = this.targets[ i ],
                nextTarget = nextKey.getTarget( target.sid ),
                data;

            if ( target.transform.type !== 'matrix' && nextTarget ) {

                var scale = ( time - this.time ) / ( nextKey.time - this.time ),
                    nextData = nextTarget.data,
                    prevData = target.data;

                if ( scale < 0 ) scale = 0;
                if ( scale > 1 ) scale = 1;

                if ( prevData.length ) {

                    data = [];

                    for ( var j = 0; j < prevData.length; ++ j ) {

                        data[ j ] = prevData[ j ] + ( nextData[ j ] - prevData[ j ] ) * scale;

                    }

                } else {

                    data = prevData + ( nextData - prevData ) * scale;

                }

            } else {

                data = target.data;

            }

            target.transform.update( data, target.member );

        }

    };

    // Camera
    function Camera() {

        this.id = "";
        this.name = "";
        this.technique = "";

    }

    Camera.prototype.parse = function ( element ) {

        this.id = element.getAttribute( 'id' );
        this.name = element.getAttribute( 'name' );

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'optics':

                    this.parseOptics( child );
                    break;

                default:
                    break;

            }

        }

        return this;

    };

    Camera.prototype.parseOptics = function ( element ) {

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            if ( element.childNodes[ i ].nodeName === 'technique_common' ) {

                var technique = element.childNodes[ i ];

                for ( var j = 0; j < technique.childNodes.length; j ++ ) {

                    this.technique = technique.childNodes[ j ].nodeName;

                    if ( this.technique === 'perspective' ) {

                        var perspective = technique.childNodes[ j ];

                        for ( var k = 0; k < perspective.childNodes.length; k ++ ) {

                            var param = perspective.childNodes[ k ];

                            switch ( param.nodeName ) {

                                case 'yfov':
                                    this.yfov = param.textContent;
                                    break;
                                case 'xfov':
                                    this.xfov = param.textContent;
                                    break;
                                case 'znear':
                                    this.znear = param.textContent;
                                    break;
                                case 'zfar':
                                    this.zfar = param.textContent;
                                    break;
                                case 'aspect_ratio':
                                    this.aspect_ratio = param.textContent;
                                    break;

                            }

                        }

                    } else if ( this.technique === 'orthographic' ) {

                        var orthographic = technique.childNodes[ j ];

                        for ( var k = 0; k < orthographic.childNodes.length; k ++ ) {

                            var param = orthographic.childNodes[ k ];

                            switch ( param.nodeName ) {

                                case 'xmag':
                                    this.xmag = param.textContent;
                                    break;
                                case 'ymag':
                                    this.ymag = param.textContent;
                                    break;
                                case 'znear':
                                    this.znear = param.textContent;
                                    break;
                                case 'zfar':
                                    this.zfar = param.textContent;
                                    break;
                                case 'aspect_ratio':
                                    this.aspect_ratio = param.textContent;
                                    break;

                            }

                        }

                    }

                }

            }

        }

        return this;

    };

    function InstanceCamera() {

        this.url = "";

    }

    InstanceCamera.prototype.parse = function ( element ) {

        this.url = element.getAttribute('url').replace(/^#/, '');

        return this;

    };

    // Light

    function Light() {

        this.id = "";
        this.name = "";
        this.technique = "";

    }

    Light.prototype.parse = function ( element ) {

        this.id = element.getAttribute( 'id' );
        this.name = element.getAttribute( 'name' );

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'technique_common':

                    this.parseCommon( child );
                    break;

                case 'technique':

                    this.parseTechnique( child );
                    break;

                default:
                    break;

            }

        }

        return this;

    };

    Light.prototype.parseCommon = function ( element ) {

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            switch ( element.childNodes[ i ].nodeName ) {

                case 'directional':
                case 'point':
                case 'spot':
                case 'ambient':

                    this.technique = element.childNodes[ i ].nodeName;

                    var light = element.childNodes[ i ];

                    for ( var j = 0; j < light.childNodes.length; j ++ ) {

                        var child = light.childNodes[j];

                        switch ( child.nodeName ) {

                            case 'color':

                                var rgba = _floats( child.textContent );
                                this.color = new THREE.Color(0);
                                this.color.setRGB( rgba[0], rgba[1], rgba[2] );
                                this.color.a = rgba[3];
                                break;

                            case 'falloff_angle':

                                this.falloff_angle = parseFloat( child.textContent );
                                break;

                            case 'quadratic_attenuation':
                                var f = parseFloat( child.textContent );
                                this.distance = f ? Math.sqrt( 1 / f ) : 0;
                        }

                    }

            }

        }

        return this;

    };

    Light.prototype.parseTechnique = function ( element ) {

        this.profile = element.getAttribute( 'profile' );

        for ( var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];

            switch ( child.nodeName ) {

                case 'intensity':

                    this.intensity = parseFloat(child.textContent);
                    break;

            }

        }

        return this;

    };

    function InstanceLight() {

        this.url = "";

    }

    InstanceLight.prototype.parse = function ( element ) {

        this.url = element.getAttribute('url').replace(/^#/, '');

        return this;

    };

    function KinematicsModel( ) {

        this.id = '';
        this.name = '';
        this.joints = [];
        this.links = [];

    }

    KinematicsModel.prototype.parse = function( element ) {

        this.id = element.getAttribute('id');
        this.name = element.getAttribute('name');
        this.joints = [];
        this.links = [];

        for (var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'technique_common':

                    this.parseCommon(child);
                    break;

                default:
                    break;

            }

        }

        return this;

    };

    KinematicsModel.prototype.parseCommon = function( element ) {

        for (var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( element.childNodes[ i ].nodeName ) {

                case 'joint':
                    this.joints.push( (new Joint()).parse(child) );
                    break;

                case 'link':
                    this.links.push( (new Link()).parse(child) );
                    break;

                default:
                    break;

            }

        }

        return this;

    };

    function Joint( ) {

        this.sid = '';
        this.name = '';
        this.axis = new THREE.Vector3();
        this.limits = {
            min: 0,
            max: 0
        };
        this.type = '';
        this.static = false;
        this.zeroPosition = 0.0;
        this.middlePosition = 0.0;

    }

    Joint.prototype.parse = function( element ) {

        this.sid = element.getAttribute('sid');
        this.name = element.getAttribute('name');
        this.axis = new THREE.Vector3();
        this.limits = {
            min: 0,
            max: 0
        };
        this.type = '';
        this.static = false;
        this.zeroPosition = 0.0;
        this.middlePosition = 0.0;

        var axisElement = element.querySelector('axis');
        var _axis = _floats(axisElement.textContent);
        this.axis = getConvertedVec3(_axis, 0);

        var min = element.querySelector('limits min') ? parseFloat(element.querySelector('limits min').textContent) : -360;
        var max = element.querySelector('limits max') ? parseFloat(element.querySelector('limits max').textContent) : 360;

        this.limits = {
            min: min,
            max: max
        };

        var jointTypes = [ 'prismatic', 'revolute' ];
        for (var i = 0; i < jointTypes.length; i ++ ) {

            var type = jointTypes[ i ];

            var jointElement = element.querySelector(type);

            if ( jointElement ) {

                this.type = type;

            }

        }

        // if the min is equal to or somehow greater than the max, consider the joint static
        if ( this.limits.min >= this.limits.max ) {

            this.static = true;

        }

        this.middlePosition = (this.limits.min + this.limits.max) / 2.0;
        return this;

    };

    function Link( ) {

        this.sid = '';
        this.name = '';
        this.transforms = [];
        this.attachments = [];

    }

    Link.prototype.parse = function( element ) {

        this.sid = element.getAttribute('sid');
        this.name = element.getAttribute('name');
        this.transforms = [];
        this.attachments = [];

        for (var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'attachment_full':
                    this.attachments.push( (new Attachment()).parse(child) );
                    break;

                case 'rotate':
                case 'translate':
                case 'matrix':

                    this.transforms.push( (new Transform()).parse(child) );
                    break;

                default:

                    break;

            }

        }

        return this;

    };

    function Attachment( ) {

        this.joint = '';
        this.transforms = [];
        this.links = [];

    }

    Attachment.prototype.parse = function( element ) {

        this.joint = element.getAttribute('joint').split('/').pop();
        this.links = [];

        for (var i = 0; i < element.childNodes.length; i ++ ) {

            var child = element.childNodes[ i ];
            if ( child.nodeType != 1 ) continue;

            switch ( child.nodeName ) {

                case 'link':
                    this.links.push( (new Link()).parse(child) );
                    break;

                case 'rotate':
                case 'translate':
                case 'matrix':

                    this.transforms.push( (new Transform()).parse(child) );
                    break;

                default:

                    break;

            }

        }

        return this;

    };

    function _source( element ) {

        var id = element.getAttribute( 'id' );

        if ( sources[ id ] != undefined ) {

            return sources[ id ];

        }

        sources[ id ] = ( new Source(id )).parse( element );
        return sources[ id ];

    }

    function _nsResolver( nsPrefix ) {

        if ( nsPrefix === "dae" ) {

            return "http://www.collada.org/2005/11/COLLADASchema";

        }

        return null;

    }

    function _bools( str ) {

        var raw = _strings( str );
        var data = [];

        for ( var i = 0, l = raw.length; i < l; i ++ ) {

            data.push( (raw[i] === 'true' || raw[i] === '1') ? true : false );

        }

        return data;

    }

    function _floats( str ) {

        var raw = _strings(str);
        var data = [];

        for ( var i = 0, l = raw.length; i < l; i ++ ) {

            data.push( parseFloat( raw[ i ] ) );

        }

        return data;

    }

    function _ints( str ) {

        var raw = _strings( str );
        var data = [];

        for ( var i = 0, l = raw.length; i < l; i ++ ) {

            data.push( parseInt( raw[ i ], 10 ) );

        }

        return data;

    }

    function _strings( str ) {

        return ( str.length > 0 ) ? _trimString( str ).split( /\s+/ ) : [];

    }

    function _trimString( str ) {

        return str.replace( /^\s+/, "" ).replace( /\s+$/, "" );

    }

    function _attr_as_float( element, name, defaultValue ) {

        if ( element.hasAttribute( name ) ) {

            return parseFloat( element.getAttribute( name ) );

        } else {

            return defaultValue;

        }

    }

    function _attr_as_int( element, name, defaultValue ) {

        if ( element.hasAttribute( name ) ) {

            return parseInt( element.getAttribute( name ), 10) ;

        } else {

            return defaultValue;

        }

    }

    function _attr_as_string( element, name, defaultValue ) {

        if ( element.hasAttribute( name ) ) {

            return element.getAttribute( name );

        } else {

            return defaultValue;

        }

    }

    function _format_float( f, num ) {

        if ( f === undefined ) {

            var s = '0.';

            while ( s.length < num + 2 ) {

                s += '0';

            }

            return s;

        }

        num = num || 2;

        var parts = f.toString().split( '.' );
        parts[ 1 ] = parts.length > 1 ? parts[ 1 ].substr( 0, num ) : "0";

        while ( parts[ 1 ].length < num ) {

            parts[ 1 ] += '0';

        }

        return parts.join( '.' );

    }

    function loadTextureImage ( texture, url ) {

        var loader = new THREE.ImageLoader();

        loader.load( url, function ( image ) {

            texture.image = image;
            texture.needsUpdate = true;

        } );

    }

    function extractDoubleSided( obj, element ) {

        obj.doubleSided = false;

        var node = element.querySelectorAll('extra double_sided')[0];

        if ( node ) {

            if ( node && parseInt( node.textContent, 10 ) === 1 ) {

                obj.doubleSided = true;

            }

        }

    }

    // Up axis conversion

    function setUpConversion() {

        if ( options.convertUpAxis !== true || colladaUp === options.upAxis ) {

            upConversion = null;

        } else {

            switch ( colladaUp ) {

                case 'X':

                    upConversion = options.upAxis === 'Y' ? 'XtoY' : 'XtoZ';
                    break;

                case 'Y':

                    upConversion = options.upAxis === 'X' ? 'YtoX' : 'YtoZ';
                    break;

                case 'Z':

                    upConversion = options.upAxis === 'X' ? 'ZtoX' : 'ZtoY';
                    break;

            }

        }

    }

    function fixCoords( data, sign ) {

        if ( options.convertUpAxis !== true || colladaUp === options.upAxis ) {

            return;

        }

        switch ( upConversion ) {

            case 'XtoY':

                var tmp = data[ 0 ];
                data[ 0 ] = sign * data[ 1 ];
                data[ 1 ] = tmp;
                break;

            case 'XtoZ':

                var tmp = data[ 2 ];
                data[ 2 ] = data[ 1 ];
                data[ 1 ] = data[ 0 ];
                data[ 0 ] = tmp;
                break;

            case 'YtoX':

                var tmp = data[ 0 ];
                data[ 0 ] = data[ 1 ];
                data[ 1 ] = sign * tmp;
                break;

            case 'YtoZ':

                var tmp = data[ 1 ];
                data[ 1 ] = sign * data[ 2 ];
                data[ 2 ] = tmp;
                break;

            case 'ZtoX':

                var tmp = data[ 0 ];
                data[ 0 ] = data[ 1 ];
                data[ 1 ] = data[ 2 ];
                data[ 2 ] = tmp;
                break;

            case 'ZtoY':

                var tmp = data[ 1 ];
                data[ 1 ] = data[ 2 ];
                data[ 2 ] = sign * tmp;
                break;

        }

    }

    function getConvertedTranslation( axis, data ) {

        if ( options.convertUpAxis !== true || colladaUp === options.upAxis ) {

            return data;

        }

        switch ( axis ) {
            case 'X':
                data = upConversion === 'XtoY' ? data * -1 : data;
                break;
            case 'Y':
                data = upConversion === 'YtoZ' || upConversion === 'YtoX' ? data * -1 : data;
                break;
            case 'Z':
                data = upConversion === 'ZtoY' ? data * -1 : data ;
                break;
            default:
                break;
        }

        return data;
    }

    function getConvertedVec3( data, offset ) {

        var arr = [ data[ offset ], data[ offset + 1 ], data[ offset + 2 ] ];
        fixCoords( arr, -1 );
        return new THREE.Vector3( arr[ 0 ], arr[ 1 ], arr[ 2 ] );

    }

    function getConvertedMat4( data ) {

        if ( options.convertUpAxis ) {

            // First fix rotation and scale

            // Columns first
            var arr = [ data[ 0 ], data[ 4 ], data[ 8 ] ];
            fixCoords( arr, -1 );
            data[ 0 ] = arr[ 0 ];
            data[ 4 ] = arr[ 1 ];
            data[ 8 ] = arr[ 2 ];
            arr = [ data[ 1 ], data[ 5 ], data[ 9 ] ];
            fixCoords( arr, -1 );
            data[ 1 ] = arr[ 0 ];
            data[ 5 ] = arr[ 1 ];
            data[ 9 ] = arr[ 2 ];
            arr = [ data[ 2 ], data[ 6 ], data[ 10 ] ];
            fixCoords( arr, -1 );
            data[ 2 ] = arr[ 0 ];
            data[ 6 ] = arr[ 1 ];
            data[ 10 ] = arr[ 2 ];
            // Rows second
            arr = [ data[ 0 ], data[ 1 ], data[ 2 ] ];
            fixCoords( arr, -1 );
            data[ 0 ] = arr[ 0 ];
            data[ 1 ] = arr[ 1 ];
            data[ 2 ] = arr[ 2 ];
            arr = [ data[ 4 ], data[ 5 ], data[ 6 ] ];
            fixCoords( arr, -1 );
            data[ 4 ] = arr[ 0 ];
            data[ 5 ] = arr[ 1 ];
            data[ 6 ] = arr[ 2 ];
            arr = [ data[ 8 ], data[ 9 ], data[ 10 ] ];
            fixCoords( arr, -1 );
            data[ 8 ] = arr[ 0 ];
            data[ 9 ] = arr[ 1 ];
            data[ 10 ] = arr[ 2 ];

            // Now fix translation
            arr = [ data[ 3 ], data[ 7 ], data[ 11 ] ];
            fixCoords( arr, -1 );
            data[ 3 ] = arr[ 0 ];
            data[ 7 ] = arr[ 1 ];
            data[ 11 ] = arr[ 2 ];

        }

        return new THREE.Matrix4().set(
            data[0], data[1], data[2], data[3],
            data[4], data[5], data[6], data[7],
            data[8], data[9], data[10], data[11],
            data[12], data[13], data[14], data[15]
            );

    }

    function getConvertedIndex( index ) {

        if ( index > -1 && index < 3 ) {

            var members = [ 'X', 'Y', 'Z' ],
                indices = { X: 0, Y: 1, Z: 2 };

            index = getConvertedMember( members[ index ] );
            index = indices[ index ];

        }

        return index;

    }

    function getConvertedMember( member ) {

        if ( options.convertUpAxis ) {

            switch ( member ) {

                case 'X':

                    switch ( upConversion ) {

                        case 'XtoY':
                        case 'XtoZ':
                        case 'YtoX':

                            member = 'Y';
                            break;

                        case 'ZtoX':

                            member = 'Z';
                            break;

                    }

                    break;

                case 'Y':

                    switch ( upConversion ) {

                        case 'XtoY':
                        case 'YtoX':
                        case 'ZtoX':

                            member = 'X';
                            break;

                        case 'XtoZ':
                        case 'YtoZ':
                        case 'ZtoY':

                            member = 'Z';
                            break;

                    }

                    break;

                case 'Z':

                    switch ( upConversion ) {

                        case 'XtoZ':

                            member = 'X';
                            break;

                        case 'YtoZ':
                        case 'ZtoX':
                        case 'ZtoY':

                            member = 'Y';
                            break;

                    }

                    break;

            }

        }

        return member;

    }

    return {

        load: load,
        parse: parse,
        setPreferredShading: setPreferredShading,
        applySkin: applySkin,
        geometries : geometries,
        options: options

    };

};

module.exports = ColladaLoader;


/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export sortFaces */
function sortFaces (geomery) {
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


/***/ }),
/* 4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__sass_app_scss__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__sass_app_scss___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__sass_app_scss__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_jquery__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_jquery___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_jquery__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__AssetLoader__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__Sound__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__Gl__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__utils_sortFaces__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__utils_packToTexture__ = __webpack_require__(26);
// main scss










__WEBPACK_IMPORTED_MODULE_1_jquery___default()( document ).ready( () => {


  let assets = new __WEBPACK_IMPORTED_MODULE_2__AssetLoader__["a" /* default */]({
    model: 'assets/numbers.dae',
    // model: 'assets/giraffe.dae',
    skin: 'assets/giraffe.png', 
    // skin2: 'assets/giraffe.png', 
    onComplete: (geomery, skin, frames) => {

      // let faces = sortFaces( geomery );
      let faces = geomery.faces.slice();
      let textureXYZ = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_6__utils_packToTexture__["a" /* packToTexture */])(faces, frames);

      let gl = new __WEBPACK_IMPORTED_MODULE_4__Gl__["a" /* default */](textureXYZ, skin, geomery);
    }
  });

  __WEBPACK_IMPORTED_MODULE_1_jquery___default()('.speaker').click(function(event) {
    event.preventDefault();
    __WEBPACK_IMPORTED_MODULE_1_jquery___default()(this).toggleClass('mute');
    sound.toggle();
  });
});


/***/ }),
/* 5 */
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ }),
/* 6 */
/***/ (function(module, exports) {

module.exports = function( THREE ) {
	/**
	 * @author qiao / https://github.com/qiao
	 * @author mrdoob / http://mrdoob.com
	 * @author alteredq / http://alteredqualia.com/
	 * @author WestLangley / http://github.com/WestLangley
	 * @author erich666 / http://erichaines.com
	 */

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finter swipe

	function OrbitControls( object, domElement ) {

		this.object = object;

		this.domElement = ( domElement !== undefined ) ? domElement : document;

		// Set to false to disable this control
		this.enabled = true;

		// "target" sets the location of focus, where the object orbits around
		this.target = new THREE.Vector3();

		// How far you can dolly in and out ( PerspectiveCamera only )
		this.minDistance = 0;
		this.maxDistance = Infinity;

		// How far you can zoom in and out ( OrthographicCamera only )
		this.minZoom = 0;
		this.maxZoom = Infinity;

		// How far you can orbit vertically, upper and lower limits.
		// Range is 0 to Math.PI radians.
		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI; // radians

		// How far you can orbit horizontally, upper and lower limits.
		// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
		this.minAzimuthAngle = - Infinity; // radians
		this.maxAzimuthAngle = Infinity; // radians

		// Set to true to enable damping (inertia)
		// If damping is enabled, you must call controls.update() in your animation loop
		this.enableDamping = false;
		this.dampingFactor = 0.25;

		// This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
		// Set to false to disable zooming
		this.enableZoom = true;
		this.zoomSpeed = 1.0;

		// Set to false to disable rotating
		this.enableRotate = true;
		this.rotateSpeed = 1.0;

		// Set to false to disable panning
		this.enablePan = true;
		this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

		// Set to true to automatically rotate around the target
		// If auto-rotate is enabled, you must call controls.update() in your animation loop
		this.autoRotate = false;
		this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

		// Set to false to disable use of the keys
		this.enableKeys = true;

		// The four arrow keys
		this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

		// Mouse buttons
		this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

		// for reset
		this.target0 = this.target.clone();
		this.position0 = this.object.position.clone();
		this.zoom0 = this.object.zoom;

		//
		// public methods
		//

		this.getPolarAngle = function () {

			return spherical.phi;

		};

		this.getAzimuthalAngle = function () {

			return spherical.theta;

		};

		this.reset = function () {

			scope.target.copy( scope.target0 );
			scope.object.position.copy( scope.position0 );
			scope.object.zoom = scope.zoom0;

			scope.object.updateProjectionMatrix();
			scope.dispatchEvent( changeEvent );

			scope.update();

			state = STATE.NONE;

		};

		// this method is exposed, but perhaps it would be better if we can make it private...
		this.update = function() {

			var offset = new THREE.Vector3();

			// so camera.up is the orbit axis
			var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
			var quatInverse = quat.clone().inverse();

			var lastPosition = new THREE.Vector3();
			var lastQuaternion = new THREE.Quaternion();

			return function update () {

				var position = scope.object.position;

				offset.copy( position ).sub( scope.target );

				// rotate offset to "y-axis-is-up" space
				offset.applyQuaternion( quat );

				// angle from z-axis around y-axis
				spherical.setFromVector3( offset );

				if ( scope.autoRotate && state === STATE.NONE ) {

					rotateLeft( getAutoRotationAngle() );

				}

				spherical.theta += sphericalDelta.theta;
				spherical.phi += sphericalDelta.phi;

				// restrict theta to be between desired limits
				spherical.theta = Math.max( scope.minAzimuthAngle, Math.min( scope.maxAzimuthAngle, spherical.theta ) );

				// restrict phi to be between desired limits
				spherical.phi = Math.max( scope.minPolarAngle, Math.min( scope.maxPolarAngle, spherical.phi ) );

				spherical.makeSafe();


				spherical.radius *= scale;

				// restrict radius to be between desired limits
				spherical.radius = Math.max( scope.minDistance, Math.min( scope.maxDistance, spherical.radius ) );

				// move target to panned location
				scope.target.add( panOffset );

				offset.setFromSpherical( spherical );

				// rotate offset back to "camera-up-vector-is-up" space
				offset.applyQuaternion( quatInverse );

				position.copy( scope.target ).add( offset );

				scope.object.lookAt( scope.target );

				if ( scope.enableDamping === true ) {

					sphericalDelta.theta *= ( 1 - scope.dampingFactor );
					sphericalDelta.phi *= ( 1 - scope.dampingFactor );

				} else {

					sphericalDelta.set( 0, 0, 0 );

				}

				scale = 1;
				panOffset.set( 0, 0, 0 );

				// update condition is:
				// min(camera displacement, camera rotation in radians)^2 > EPS
				// using small-angle approximation cos(x/2) = 1 - x^2 / 8

				if ( zoomChanged ||
					lastPosition.distanceToSquared( scope.object.position ) > EPS ||
					8 * ( 1 - lastQuaternion.dot( scope.object.quaternion ) ) > EPS ) {

					scope.dispatchEvent( changeEvent );

					lastPosition.copy( scope.object.position );
					lastQuaternion.copy( scope.object.quaternion );
					zoomChanged = false;

					return true;

				}

				return false;

			};

		}();

		this.dispose = function() {

			scope.domElement.removeEventListener( 'contextmenu', onContextMenu, false );
			scope.domElement.removeEventListener( 'mousedown', onMouseDown, false );
			scope.domElement.removeEventListener( 'wheel', onMouseWheel, false );

			scope.domElement.removeEventListener( 'touchstart', onTouchStart, false );
			scope.domElement.removeEventListener( 'touchend', onTouchEnd, false );
			scope.domElement.removeEventListener( 'touchmove', onTouchMove, false );

			document.removeEventListener( 'mousemove', onMouseMove, false );
			document.removeEventListener( 'mouseup', onMouseUp, false );

			window.removeEventListener( 'keydown', onKeyDown, false );

			//scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?

		};

		//
		// internals
		//

		var scope = this;

		var changeEvent = { type: 'change' };
		var startEvent = { type: 'start' };
		var endEvent = { type: 'end' };

		var STATE = { NONE : - 1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

		var state = STATE.NONE;

		var EPS = 0.000001;

		// current position in spherical coordinates
		var spherical = new THREE.Spherical();
		var sphericalDelta = new THREE.Spherical();

		var scale = 1;
		var panOffset = new THREE.Vector3();
		var zoomChanged = false;

		var rotateStart = new THREE.Vector2();
		var rotateEnd = new THREE.Vector2();
		var rotateDelta = new THREE.Vector2();

		var panStart = new THREE.Vector2();
		var panEnd = new THREE.Vector2();
		var panDelta = new THREE.Vector2();

		var dollyStart = new THREE.Vector2();
		var dollyEnd = new THREE.Vector2();
		var dollyDelta = new THREE.Vector2();

		function getAutoRotationAngle() {

			return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

		}

		function getZoomScale() {

			return Math.pow( 0.95, scope.zoomSpeed );

		}

		function rotateLeft( angle ) {

			sphericalDelta.theta -= angle;

		}

		function rotateUp( angle ) {

			sphericalDelta.phi -= angle;

		}

		var panLeft = function() {

			var v = new THREE.Vector3();

			return function panLeft( distance, objectMatrix ) {

				v.setFromMatrixColumn( objectMatrix, 0 ); // get X column of objectMatrix
				v.multiplyScalar( - distance );

				panOffset.add( v );

			};

		}();

		var panUp = function() {

			var v = new THREE.Vector3();

			return function panUp( distance, objectMatrix ) {

				v.setFromMatrixColumn( objectMatrix, 1 ); // get Y column of objectMatrix
				v.multiplyScalar( distance );

				panOffset.add( v );

			};

		}();

		// deltaX and deltaY are in pixels; right and down are positive
		var pan = function() {

			var offset = new THREE.Vector3();

			return function pan ( deltaX, deltaY ) {

				var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

				if ( scope.object instanceof THREE.PerspectiveCamera ) {

					// perspective
					var position = scope.object.position;
					offset.copy( position ).sub( scope.target );
					var targetDistance = offset.length();

					// half of the fov is center to top of screen
					targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

					// we actually don't use screenWidth, since perspective camera is fixed to screen height
					panLeft( 2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix );
					panUp( 2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix );

				} else if ( scope.object instanceof THREE.OrthographicCamera ) {

					// orthographic
					panLeft( deltaX * ( scope.object.right - scope.object.left ) / scope.object.zoom / element.clientWidth, scope.object.matrix );
					panUp( deltaY * ( scope.object.top - scope.object.bottom ) / scope.object.zoom / element.clientHeight, scope.object.matrix );

				} else {

					// camera neither orthographic nor perspective
					console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );
					scope.enablePan = false;

				}

			};

		}();

		function dollyIn( dollyScale ) {

			if ( scope.object instanceof THREE.PerspectiveCamera ) {

				scale /= dollyScale;

			} else if ( scope.object instanceof THREE.OrthographicCamera ) {

				scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
				scope.object.updateProjectionMatrix();
				zoomChanged = true;

			} else {

				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
				scope.enableZoom = false;

			}

		}

		function dollyOut( dollyScale ) {

			if ( scope.object instanceof THREE.PerspectiveCamera ) {

				scale *= dollyScale;

			} else if ( scope.object instanceof THREE.OrthographicCamera ) {

				scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom / dollyScale ) );
				scope.object.updateProjectionMatrix();
				zoomChanged = true;

			} else {

				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
				scope.enableZoom = false;

			}

		}

		//
		// event callbacks - update the object state
		//

		function handleMouseDownRotate( event ) {

			//console.log( 'handleMouseDownRotate' );

			rotateStart.set( event.clientX, event.clientY );

		}

		function handleMouseDownDolly( event ) {

			//console.log( 'handleMouseDownDolly' );

			dollyStart.set( event.clientX, event.clientY );

		}

		function handleMouseDownPan( event ) {

			//console.log( 'handleMouseDownPan' );

			panStart.set( event.clientX, event.clientY );

		}

		function handleMouseMoveRotate( event ) {

			//console.log( 'handleMouseMoveRotate' );

			rotateEnd.set( event.clientX, event.clientY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			// rotating across whole screen goes 360 degrees around
			rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

			rotateStart.copy( rotateEnd );

			scope.update();

		}

		function handleMouseMoveDolly( event ) {

			//console.log( 'handleMouseMoveDolly' );

			dollyEnd.set( event.clientX, event.clientY );

			dollyDelta.subVectors( dollyEnd, dollyStart );

			if ( dollyDelta.y > 0 ) {

				dollyIn( getZoomScale() );

			} else if ( dollyDelta.y < 0 ) {

				dollyOut( getZoomScale() );

			}

			dollyStart.copy( dollyEnd );

			scope.update();

		}

		function handleMouseMovePan( event ) {

			//console.log( 'handleMouseMovePan' );

			panEnd.set( event.clientX, event.clientY );

			panDelta.subVectors( panEnd, panStart );

			pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );

			scope.update();

		}

		function handleMouseUp( event ) {

			//console.log( 'handleMouseUp' );

		}

		function handleMouseWheel( event ) {

			//console.log( 'handleMouseWheel' );

			if ( event.deltaY < 0 ) {

				dollyOut( getZoomScale() );

			} else if ( event.deltaY > 0 ) {

				dollyIn( getZoomScale() );

			}

			scope.update();

		}

		function handleKeyDown( event ) {

			//console.log( 'handleKeyDown' );

			switch ( event.keyCode ) {

				case scope.keys.UP:
					pan( 0, scope.keyPanSpeed );
					scope.update();
					break;

				case scope.keys.BOTTOM:
					pan( 0, - scope.keyPanSpeed );
					scope.update();
					break;

				case scope.keys.LEFT:
					pan( scope.keyPanSpeed, 0 );
					scope.update();
					break;

				case scope.keys.RIGHT:
					pan( - scope.keyPanSpeed, 0 );
					scope.update();
					break;

			}

		}

		function handleTouchStartRotate( event ) {

			//console.log( 'handleTouchStartRotate' );

			rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

		}

		function handleTouchStartDolly( event ) {

			//console.log( 'handleTouchStartDolly' );

			var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
			var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

			var distance = Math.sqrt( dx * dx + dy * dy );

			dollyStart.set( 0, distance );

		}

		function handleTouchStartPan( event ) {

			//console.log( 'handleTouchStartPan' );

			panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

		}

		function handleTouchMoveRotate( event ) {

			//console.log( 'handleTouchMoveRotate' );

			rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			// rotating across whole screen goes 360 degrees around
			rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

			rotateStart.copy( rotateEnd );

			scope.update();

		}

		function handleTouchMoveDolly( event ) {

			//console.log( 'handleTouchMoveDolly' );

			var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
			var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

			var distance = Math.sqrt( dx * dx + dy * dy );

			dollyEnd.set( 0, distance );

			dollyDelta.subVectors( dollyEnd, dollyStart );

			if ( dollyDelta.y > 0 ) {

				dollyOut( getZoomScale() );

			} else if ( dollyDelta.y < 0 ) {

				dollyIn( getZoomScale() );

			}

			dollyStart.copy( dollyEnd );

			scope.update();

		}

		function handleTouchMovePan( event ) {

			//console.log( 'handleTouchMovePan' );

			panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

			panDelta.subVectors( panEnd, panStart );

			pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );

			scope.update();

		}

		function handleTouchEnd( event ) {

			//console.log( 'handleTouchEnd' );

		}

		//
		// event handlers - FSM: listen for events and reset state
		//

		function onMouseDown( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();

			if ( event.button === scope.mouseButtons.ORBIT ) {

				if ( scope.enableRotate === false ) return;

				handleMouseDownRotate( event );

				state = STATE.ROTATE;

			} else if ( event.button === scope.mouseButtons.ZOOM ) {

				if ( scope.enableZoom === false ) return;

				handleMouseDownDolly( event );

				state = STATE.DOLLY;

			} else if ( event.button === scope.mouseButtons.PAN ) {

				if ( scope.enablePan === false ) return;

				handleMouseDownPan( event );

				state = STATE.PAN;

			}

			if ( state !== STATE.NONE ) {

				document.addEventListener( 'mousemove', onMouseMove, false );
				document.addEventListener( 'mouseup', onMouseUp, false );

				scope.dispatchEvent( startEvent );

			}

		}

		function onMouseMove( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();

			if ( state === STATE.ROTATE ) {

				if ( scope.enableRotate === false ) return;

				handleMouseMoveRotate( event );

			} else if ( state === STATE.DOLLY ) {

				if ( scope.enableZoom === false ) return;

				handleMouseMoveDolly( event );

			} else if ( state === STATE.PAN ) {

				if ( scope.enablePan === false ) return;

				handleMouseMovePan( event );

			}

		}

		function onMouseUp( event ) {

			if ( scope.enabled === false ) return;

			handleMouseUp( event );

			document.removeEventListener( 'mousemove', onMouseMove, false );
			document.removeEventListener( 'mouseup', onMouseUp, false );

			scope.dispatchEvent( endEvent );

			state = STATE.NONE;

		}

		function onMouseWheel( event ) {

			if ( scope.enabled === false || scope.enableZoom === false || ( state !== STATE.NONE && state !== STATE.ROTATE ) ) return;

			event.preventDefault();
			event.stopPropagation();

			handleMouseWheel( event );

			scope.dispatchEvent( startEvent ); // not sure why these are here...
			scope.dispatchEvent( endEvent );

		}

		function onKeyDown( event ) {

			if ( scope.enabled === false || scope.enableKeys === false || scope.enablePan === false ) return;

			handleKeyDown( event );

		}

		function onTouchStart( event ) {

			if ( scope.enabled === false ) return;

			switch ( event.touches.length ) {

				case 1:	// one-fingered touch: rotate

					if ( scope.enableRotate === false ) return;

					handleTouchStartRotate( event );

					state = STATE.TOUCH_ROTATE;

					break;

				case 2:	// two-fingered touch: dolly

					if ( scope.enableZoom === false ) return;

					handleTouchStartDolly( event );

					state = STATE.TOUCH_DOLLY;

					break;

				case 3: // three-fingered touch: pan

					if ( scope.enablePan === false ) return;

					handleTouchStartPan( event );

					state = STATE.TOUCH_PAN;

					break;

				default:

					state = STATE.NONE;

			}

			if ( state !== STATE.NONE ) {

				scope.dispatchEvent( startEvent );

			}

		}

		function onTouchMove( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();
			event.stopPropagation();

			switch ( event.touches.length ) {

				case 1: // one-fingered touch: rotate

					if ( scope.enableRotate === false ) return;
					if ( state !== STATE.TOUCH_ROTATE ) return; // is this needed?...

					handleTouchMoveRotate( event );

					break;

				case 2: // two-fingered touch: dolly

					if ( scope.enableZoom === false ) return;
					if ( state !== STATE.TOUCH_DOLLY ) return; // is this needed?...

					handleTouchMoveDolly( event );

					break;

				case 3: // three-fingered touch: pan

					if ( scope.enablePan === false ) return;
					if ( state !== STATE.TOUCH_PAN ) return; // is this needed?...

					handleTouchMovePan( event );

					break;

				default:

					state = STATE.NONE;

			}

		}

		function onTouchEnd( event ) {

			if ( scope.enabled === false ) return;

			handleTouchEnd( event );

			scope.dispatchEvent( endEvent );

			state = STATE.NONE;

		}

		function onContextMenu( event ) {

			event.preventDefault();

		}

		//

		scope.domElement.addEventListener( 'contextmenu', onContextMenu, false );

		scope.domElement.addEventListener( 'mousedown', onMouseDown, false );
		scope.domElement.addEventListener( 'wheel', onMouseWheel, false );

		scope.domElement.addEventListener( 'touchstart', onTouchStart, false );
		scope.domElement.addEventListener( 'touchend', onTouchEnd, false );
		scope.domElement.addEventListener( 'touchmove', onTouchMove, false );

		window.addEventListener( 'keydown', onKeyDown, false );

		// force an update at start

		this.update();

	};

	OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
	OrbitControls.prototype.constructor = OrbitControls;

	Object.defineProperties( OrbitControls.prototype, {

		center: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .center has been renamed to .target' );
				return this.target;

			}

		},

		// backward compatibility

		noZoom: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
				return ! this.enableZoom;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
				this.enableZoom = ! value;

			}

		},

		noRotate: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
				return ! this.enableRotate;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
				this.enableRotate = ! value;

			}

		},

		noPan: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
				return ! this.enablePan;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
				this.enablePan = ! value;

			}

		},

		noKeys: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
				return ! this.enableKeys;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
				this.enableKeys = ! value;

			}

		},

		staticMoving : {

			get: function () {

				console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
				return ! this.enableDamping;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
				this.enableDamping = ! value;

			}

		},

		dynamicDampingFactor : {

			get: function () {

				console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
				return this.dampingFactor;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
				this.dampingFactor = value;

			}

		}

	} );

	return OrbitControls;
};


/***/ }),
/* 7 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_three_collada_loader__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_three_collada_loader___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_three_collada_loader__);
const THREE = window.THREE = __webpack_require__(0);



class AssetLoader {
  constructor (options) {

    this.options = options;
    this.skin = null;
    this.geometry = null;
    this.frames = null;

    // load models
    let loader = new __WEBPACK_IMPORTED_MODULE_0_three_collada_loader___default.a();
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
/* harmony export (immutable) */ __webpack_exports__["a"] = AssetLoader;


/***/ }),
/* 8 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_jquery__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_jquery___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_jquery__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__libs_dat_gui_min__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__utils_sortFaces__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__libs_TessellateModifier__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__libs_TessellateModifier___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3__libs_TessellateModifier__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__libs_shaders_BlendShader__ = __webpack_require__(19);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__libs_shaders_BlendShader___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4__libs_shaders_BlendShader__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__libs_shaders_CopyShader__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__libs_shaders_CopyShader___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5__libs_shaders_CopyShader__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__libs_shaders_HorizontalBlurShader__ = __webpack_require__(23);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__libs_shaders_HorizontalBlurShader___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_6__libs_shaders_HorizontalBlurShader__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__libs_shaders_VerticalBlurShader__ = __webpack_require__(25);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__libs_shaders_VerticalBlurShader___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_7__libs_shaders_VerticalBlurShader__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__libs_shaders_FXAAShader__ = __webpack_require__(22);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__libs_shaders_FXAAShader___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_8__libs_shaders_FXAAShader__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__libs_shaders_SSAOShader__ = __webpack_require__(24);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__libs_shaders_SSAOShader___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_9__libs_shaders_SSAOShader__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__libs_postprocessing_EffectComposer__ = __webpack_require__(13);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__libs_postprocessing_EffectComposer___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_10__libs_postprocessing_EffectComposer__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__libs_postprocessing_MaskPass__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__libs_postprocessing_MaskPass___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_11__libs_postprocessing_MaskPass__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__libs_postprocessing_RenderPass__ = __webpack_require__(15);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__libs_postprocessing_RenderPass___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_12__libs_postprocessing_RenderPass__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13__libs_postprocessing_SavePass__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13__libs_postprocessing_SavePass___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_13__libs_postprocessing_SavePass__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_14__libs_postprocessing_ShaderPass__ = __webpack_require__(17);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_14__libs_postprocessing_ShaderPass___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_14__libs_postprocessing_ShaderPass__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_15__libs_postprocessing_TexturePass__ = __webpack_require__(18);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_15__libs_postprocessing_TexturePass___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_15__libs_postprocessing_TexturePass__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_16__libs_shaders_BokehPass__ = __webpack_require__(20);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_16__libs_shaders_BokehPass___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_16__libs_shaders_BokehPass__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_17__libs_postprocessing_BokehShader__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_17__libs_postprocessing_BokehShader___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_17__libs_postprocessing_BokehShader__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_18_three_collada_loader__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_18_three_collada_loader___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_18_three_collada_loader__);


// const dat = require('./../libs/utils/dat.gui.min');



// import BrightnessShader from './BrightnessShader';






















const THREE = window.THREE = __webpack_require__(0);
// const FBOHelper = require( 'three.fbo-helper' );
const OrbitControls = __webpack_require__(6)(THREE)
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
// float scale = abs(texture2D(audioSample, vec2(.5,.5))).g/255.0;

float s  = 10.0-mod(uTime*.5, 10.0);
float r = clamp(mod(s,1.0) * 3.0 - 2.0,0.0,1.0);
float f1 = floor(s);
float f2 = mod(f1+1.0, 10.0);

float numVerts = 92.0*3.0;

vec2 pixelPos = vec2( mod( (numVerts*f1+position.z), 512.)/512.0, floor((numVerts*f1+position.z)/512.0)/512.0);
vec2 pixelPos2 = vec2( mod( (numVerts*f2+position.z), 512.)/512.0, floor((numVerts*f2+position.z)/512.0)/512.0);
vec3 xyz = texture2D(animations, pixelPos.xy).xyz;
vec3 xyz2 = texture2D(animations, pixelPos2.xy).xyz;
transformed = mix(xyz, xyz2, r);



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
  varying vec3 vPos;

  uniform float uTime;
  uniform float uRatio;
  uniform sampler2D audioSample;
  uniform sampler2D animations;
  uniform sampler2D skinMap;

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

vPos.xyz = transformed.xyz;

  }
`;

const phongFS = `
  #define PHONG
  
    uniform sampler2D skinMap;
varying vec3 vPos;

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


//float i = ( sin(uTime)+1.0 )/2.0 * 6.0 + 30.0;
float i = 1.6;
float r = length(smoothstep(.03, .02, 
  mod(vPos.xyz+vec3( sin(uTime*.25), sin(uTime*.20), sin(uTime*.30) ), i) / i));
  // mod(vPos.xyz+vec3(uTime*.20, uTime*.20, uTime*.20), i) / i));
diffuseColor.rgba *= vec4(r);



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

    vec4 color = texture2D(skinMap, vUv.xy);
    // vec4 color2 = texture2D(skinMap2, vUv.xy);
    // vec4 color = mix(color1, color2, uRatio);

    // outgoingLight.rgb += color.rgb;
    outgoingLight.rgb += vec3(.8,.8,1.0);

    #include <envmap_fragment>
    gl_FragColor = vec4( outgoingLight, diffuseColor.a );
    #include <premultiplied_alpha_fragment>
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #include <fog_fragment>
    // gl_FragColor.a = color.a;
    gl_FragColor.a = r;

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

class Gl {
  
  constructor(animations, skinMap, gridGeo) {

    this.numVerts = gridGeo.faces.length;
    console.log('num verts:',this.numVerts);

    this.animations = animations;
    this.gridGeo = gridGeo;  
    this.skinMap = skinMap;
    this.options = {
        blending: .8,
    }

    this.clock = new THREE.Clock;

    this.container;
    this.stats;
    this.camera;
    this.scene;
    this.renderer;
    this.mouseX = 0;
    this.mouseY = 0;
    this.windowHalfX = window.innerWidth / 2;
    this.windowHalfY = window.innerHeight / 2;
    this.bgColor = 0x111122;
    // this.bgColor = 0xfafaff;
    // this.bgColor = 0x343c43;
    // this.bgColor = 0x41b1e3;
    // 0x9fa4ab
    // 0x343c43
    // 0xa5adb7
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
    // this.renderer.setPixelRatio(4);
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
    uniforms.audioSample = { type:'t', value: null };
    // uniforms.audioSample = { type:'t', value: this.sound.texture };
    uniforms.animations = { type: 't', value: this.animations};

uniforms.skinMap = { type: 't', value: this.skinMap };

// uniforms.skinMap = this.skinMap;

// uniforms.map.needsUpdate = true;
    this.materialScene = new THREE.ShaderMaterial({
      uniforms: uniforms,

      vertexShader: phongVS,
      fragmentShader: phongFS,
      shading: THREE.FlatShading,
      transparent: false,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: .01,
      // wireframe: true,
      // wireframeLinewidth: 4,
      lights: true,
      fog: true,
      skinning: false,
      depthTest: true,
      depthWrite: true
      // map: loader.load('assets/images/baby.png')
    });

    // this.hemisphereLight = new THREE.HemisphereLight(0xffaacc);
    // this.hemisphereLight = new THREE.HemisphereLight(0x88aacc, 0, 1);
    this.hemisphereLight = new THREE.HemisphereLight(0x515120, 0, 1);
    this.scene.add(this.hemisphereLight);

    this.spotLight = new THREE.SpotLight( 0x515120 );
    // this.spotLight = new THREE.DirectionalLight(0x666666, 1, 0, .075, .5, .5);
    
    this.spotLight.position.x = -300; //this.camera.position.x+120;
    this.spotLight.position.y = -1000; //this.camera.position.y//20;
    this.spotLight.position.z = -500; //this.camera.position.z/2//0;

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
// this.gui.add( this.effectController, 'numInstances', 0, 100, 1 ).onChange( ( ) => {
//     this.geometry.maxInstancedCount = this.effectController.numInstances;
// } );
// this.gui.close();



    this.initCubes();
    this.animate();
    this.onWindowResize();


    __WEBPACK_IMPORTED_MODULE_0_jquery___default()('#loading').fadeOut(600, function() { __WEBPACK_IMPORTED_MODULE_0_jquery___default()(this).remove(); });
    __WEBPACK_IMPORTED_MODULE_0_jquery___default()('#gl').fadeIn('slow');
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
    this.cubes.rotation.set(2,0,3)
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
    // this.materialScene.uniforms.uRatio.value = Math.min(2, Math.max(0, this.sound.averageVolume  / 35));

    // this.animations.needsUpdate = true;


    // this.renderer.clear();
    // this.renderer.render(this.scene, this.camera, this.composer.renderTarget);
    // this.composer.render( delta );

    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  }
}
/* harmony export (immutable) */ __webpack_exports__["a"] = Gl;




/***/ }),
/* 9 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
const SIZE = 16;

class Sound {

    constructor (src) {

        this.fftSize = 2048//SIZE*SIZE;

        this.context = null;
        this.audioBuffer;
        this.analyser;
        this.javascriptNode;
        
        this.setupAudioNodes();

        // this.fbo = this.createFBO();
        
        let request = new XMLHttpRequest();
        request.open('GET', src, true);
        request.responseType = 'arraybuffer';
        request.onload = () => this.loadAudioData(request.response);
        request.send();

        this.frameData = new Float32Array( SIZE * SIZE * 4 );

        this.texture = new THREE.DataTexture( this.frameData, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType );
        this.texture.minFilter = THREE.NearestFilter;
        this.texture.magFilter = THREE.NearestFilter;
        this.texture.needsUpdate = true;

        this.averageVolume = 0;

    }

    createAudioContext () {
        if ('AudioContext' in window) {
            return new AudioContext();
        }
    }

    setupAudioNodes () {
       
        this.context = this.createAudioContext();

        window.javascriptNode = this.context.createScriptProcessor(SIZE*SIZE, 1, 1);
        window.javascriptNode.connect(this.context.destination);
        window.javascriptNode.onaudioprocess = this.handleAudioStream.bind(this);

        this.analyser = this.context.createAnalyser();
        this.analyser.smoothingTimeConstant = .6;
        this.analyser.fftSize = this.fftSize;

        this.sourceNode = this.context.createBufferSource();
        this.sourceNode.connect(this.analyser);
        this.sourceNode.connect(this.context.destination);

        this.analyser.connect(window.javascriptNode);

    }

    loadAudioData (buffer) {
        if (this.context.decodeAudioData) {
            console.log('audio ready...')
            this.context.decodeAudioData(buffer, (b) => {
                this.audioBuffer = b;
                this.startOffset = this.context.currentTime;
                this.sourceNode = this.context.createBufferSource();
                this.sourceNode.buffer = this.audioBuffer;
                this.sourceNode.connect(this.analyser);
                this.sourceNode.connect(this.context.destination);
                this.sourceNode.start(0, 0);
                
            });
        }
    }

    handleAudioStream (e) {
        if ( !this.isPlaying()  ) {
            return;
        }
        
        // this.analyser.getFloatFrequencyData(this.frameData);
        // this.texture.needsUpdate = true;


        let array = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(array);
        let average = 0;
        for(let i=0, l=array.length; i<l; i++) {
            average += parseFloat(array[i]);
        }
        this.averageVolume = average/array.length;


// console.log(this.averageVolume )
    }

    toggle () {
        if( this.isPlaying() ) {
            this.context.suspend()
        } else if ( this.isSuspended() ) {
            this.context.resume()
        }
    }

    isPlaying (){
        return this.context.state === 'running'
    }

    isSuspended (){
        return this.context.state === 'suspended'
    }

    stamp () {
        if ( this.context && this.startOffset != -1 )
            return parseInt( (this.context.currentTime-this.startOffset) * 124 / 60 * 100); 
        else return 0;
    }
}
/* unused harmony export default */



/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

const THREE = __webpack_require__(0);

/**
 * Break faces with edges longer than maxEdgeLength
 * - not recursive
 *
 * @author alteredq / http://alteredqualia.com/
 */

THREE.TessellateModifier = function ( maxEdgeLength ) {

	this.maxEdgeLength = maxEdgeLength;

};

THREE.TessellateModifier.prototype.modify = function ( geometry ) {

	var edge;

	var faces = [];
	var faceVertexUvs = [];
	var maxEdgeLengthSquared = this.maxEdgeLength * this.maxEdgeLength;

	for ( var i = 0, il = geometry.faceVertexUvs.length; i < il; i ++ ) {

		faceVertexUvs[ i ] = [];

	}

	for ( var i = 0, il = geometry.faces.length; i < il; i ++ ) {

		var face = geometry.faces[ i ];

		if ( face instanceof THREE.Face3 ) {

			var a = face.a;
			var b = face.b;
			var c = face.c;

			var va = geometry.vertices[ a ];
			var vb = geometry.vertices[ b ];
			var vc = geometry.vertices[ c ];

			var dab = va.distanceToSquared( vb );
			var dbc = vb.distanceToSquared( vc );
			var dac = va.distanceToSquared( vc );

			if ( dab > maxEdgeLengthSquared || dbc > maxEdgeLengthSquared || dac > maxEdgeLengthSquared ) {

				var m = geometry.vertices.length;

				var triA = face.clone();
				var triB = face.clone();

				if ( dab >= dbc && dab >= dac ) {

					var vm = va.clone();
					vm.lerp( vb, 0.5 );

					triA.a = a;
					triA.b = m;
					triA.c = c;

					triB.a = m;
					triB.b = b;
					triB.c = c;

					if ( face.vertexNormals.length === 3 ) {

						var vnm = face.vertexNormals[ 0 ].clone();
						vnm.lerp( face.vertexNormals[ 1 ], 0.5 );

						triA.vertexNormals[ 1 ].copy( vnm );
						triB.vertexNormals[ 0 ].copy( vnm );

					}

					if ( face.vertexColors.length === 3 ) {

						var vcm = face.vertexColors[ 0 ].clone();
						vcm.lerp( face.vertexColors[ 1 ], 0.5 );

						triA.vertexColors[ 1 ].copy( vcm );
						triB.vertexColors[ 0 ].copy( vcm );

					}

					edge = 0;

				} else if ( dbc >= dab && dbc >= dac ) {

					var vm = vb.clone();
					vm.lerp( vc, 0.5 );

					triA.a = a;
					triA.b = b;
					triA.c = m;

					triB.a = m;
					triB.b = c;
					triB.c = a;

					if ( face.vertexNormals.length === 3 ) {

						var vnm = face.vertexNormals[ 1 ].clone();
						vnm.lerp( face.vertexNormals[ 2 ], 0.5 );

						triA.vertexNormals[ 2 ].copy( vnm );

						triB.vertexNormals[ 0 ].copy( vnm );
						triB.vertexNormals[ 1 ].copy( face.vertexNormals[ 2 ] );
						triB.vertexNormals[ 2 ].copy( face.vertexNormals[ 0 ] );

					}

					if ( face.vertexColors.length === 3 ) {

						var vcm = face.vertexColors[ 1 ].clone();
						vcm.lerp( face.vertexColors[ 2 ], 0.5 );

						triA.vertexColors[ 2 ].copy( vcm );

						triB.vertexColors[ 0 ].copy( vcm );
						triB.vertexColors[ 1 ].copy( face.vertexColors[ 2 ] );
						triB.vertexColors[ 2 ].copy( face.vertexColors[ 0 ] );

					}

					edge = 1;

				} else {

					var vm = va.clone();
					vm.lerp( vc, 0.5 );

					triA.a = a;
					triA.b = b;
					triA.c = m;

					triB.a = m;
					triB.b = b;
					triB.c = c;

					if ( face.vertexNormals.length === 3 ) {

						var vnm = face.vertexNormals[ 0 ].clone();
						vnm.lerp( face.vertexNormals[ 2 ], 0.5 );

						triA.vertexNormals[ 2 ].copy( vnm );
						triB.vertexNormals[ 0 ].copy( vnm );

					}

					if ( face.vertexColors.length === 3 ) {

						var vcm = face.vertexColors[ 0 ].clone();
						vcm.lerp( face.vertexColors[ 2 ], 0.5 );

						triA.vertexColors[ 2 ].copy( vcm );
						triB.vertexColors[ 0 ].copy( vcm );

					}

					edge = 2;

				}

				faces.push( triA, triB );
				geometry.vertices.push( vm );

				for ( var j = 0, jl = geometry.faceVertexUvs.length; j < jl; j ++ ) {

					if ( geometry.faceVertexUvs[ j ].length ) {

						var uvs = geometry.faceVertexUvs[ j ][ i ];

						var uvA = uvs[ 0 ];
						var uvB = uvs[ 1 ];
						var uvC = uvs[ 2 ];

						// AB

						if ( edge === 0 ) {

							var uvM = uvA.clone();
							uvM.lerp( uvB, 0.5 );

							var uvsTriA = [ uvA.clone(), uvM.clone(), uvC.clone() ];
							var uvsTriB = [ uvM.clone(), uvB.clone(), uvC.clone() ];

						// BC

						} else if ( edge === 1 ) {

							var uvM = uvB.clone();
							uvM.lerp( uvC, 0.5 );

							var uvsTriA = [ uvA.clone(), uvB.clone(), uvM.clone() ];
							var uvsTriB = [ uvM.clone(), uvC.clone(), uvA.clone() ];

						// AC

						} else {

							var uvM = uvA.clone();
							uvM.lerp( uvC, 0.5 );

							var uvsTriA = [ uvA.clone(), uvB.clone(), uvM.clone() ];
							var uvsTriB = [ uvM.clone(), uvB.clone(), uvC.clone() ];

						}

						faceVertexUvs[ j ].push( uvsTriA, uvsTriB );

					}

				}

			} else {

				faces.push( face );

				for ( var j = 0, jl = geometry.faceVertexUvs.length; j < jl; j ++ ) {

					faceVertexUvs[ j ].push( geometry.faceVertexUvs[ j ][ i ] );

				}

			}

		}

	}

	geometry.faces = faces;
	geometry.faceVertexUvs = faceVertexUvs;

};


/***/ }),
/* 11 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/**
 * dat-gui JavaScript Controller Library
 * http://code.google.com/p/dat-gui
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

/** @namespace */
const dat = {};
/* unused harmony export dat */


/** @namespace */
dat.gui = dat.gui || {};

/** @namespace */
dat.utils = dat.utils || {};

/** @namespace */
dat.controllers = dat.controllers || {};

/** @namespace */
dat.dom = dat.dom || {};

/** @namespace */
dat.color = dat.color || {};

dat.utils.css = (function () {
  return {
    load: function (url, doc) {
      doc = doc || document;
      var link = doc.createElement('link');
      link.type = 'text/css';
      link.rel = 'stylesheet';
      link.href = url;
      doc.getElementsByTagName('head')[0].appendChild(link);
    },
    inject: function(css, doc) {
      doc = doc || document;
      var injected = document.createElement('style');
      injected.type = 'text/css';
      injected.innerHTML = css;
      doc.getElementsByTagName('head')[0].appendChild(injected);
    }
  }
})();


dat.utils.common = (function () {
  
  var ARR_EACH = Array.prototype.forEach;
  var ARR_SLICE = Array.prototype.slice;

  /**
   * Band-aid methods for things that should be a lot easier in JavaScript.
   * Implementation and structure inspired by underscore.js
   * http://documentcloud.github.com/underscore/
   */

  return { 
    
    BREAK: {},
  
    extend: function(target) {
      
      this.each(ARR_SLICE.call(arguments, 1), function(obj) {
        
        for (var key in obj)
          if (!this.isUndefined(obj[key])) 
            target[key] = obj[key];
        
      }, this);
      
      return target;
      
    },
    
    defaults: function(target) {
      
      this.each(ARR_SLICE.call(arguments, 1), function(obj) {
        
        for (var key in obj)
          if (this.isUndefined(target[key])) 
            target[key] = obj[key];
        
      }, this);
      
      return target;
    
    },
    
    compose: function() {
      var toCall = ARR_SLICE.call(arguments);
            return function() {
              var args = ARR_SLICE.call(arguments);
              for (var i = toCall.length -1; i >= 0; i--) {
                args = [toCall[i].apply(this, args)];
              }
              return args[0];
            }
    },
    
    each: function(obj, itr, scope) {

      if (!obj) return;

      if (ARR_EACH && obj.forEach && obj.forEach === ARR_EACH) { 
        
        obj.forEach(itr, scope);
        
      } else if (obj.length === obj.length + 0) { // Is number but not NaN
        
        for (var key = 0, l = obj.length; key < l; key++)
          if (key in obj && itr.call(scope, obj[key], key) === this.BREAK) 
            return;
            
      } else {

        for (var key in obj) 
          if (itr.call(scope, obj[key], key) === this.BREAK)
            return;
            
      }
            
    },
    
    defer: function(fnc) {
      setTimeout(fnc, 0);
    },
    
    toArray: function(obj) {
      if (obj.toArray) return obj.toArray();
      return ARR_SLICE.call(obj);
    },

    isUndefined: function(obj) {
      return obj === undefined;
    },
    
    isNull: function(obj) {
      return obj === null;
    },
    
    isNaN: function(obj) {
      return obj !== obj;
    },
    
    isArray: Array.isArray || function(obj) {
      return obj.constructor === Array;
    },
    
    isObject: function(obj) {
      return obj === Object(obj);
    },
    
    isNumber: function(obj) {
      return obj === obj+0;
    },
    
    isString: function(obj) {
      return obj === obj+'';
    },
    
    isBoolean: function(obj) {
      return obj === false || obj === true;
    },
    
    isFunction: function(obj) {
      return Object.prototype.toString.call(obj) === '[object Function]';
    }
  
  };
    
})();


dat.controllers.Controller = (function (common) {

  /**
   * @class An "abstract" class that represents a given property of an object.
   *
   * @param {Object} object The object to be manipulated
   * @param {string} property The name of the property to be manipulated
   *
   * @member dat.controllers
   */
  var Controller = function(object, property) {

    this.initialValue = object[property];

    /**
     * Those who extend this class will put their DOM elements in here.
     * @type {DOMElement}
     */
    this.domElement = document.createElement('div');

    /**
     * The object to manipulate
     * @type {Object}
     */
    this.object = object;

    /**
     * The name of the property to manipulate
     * @type {String}
     */
    this.property = property;

    /**
     * The function to be called on change.
     * @type {Function}
     * @ignore
     */
    this.__onChange = undefined;

    /**
     * The function to be called on finishing change.
     * @type {Function}
     * @ignore
     */
    this.__onFinishChange = undefined;

  };

  common.extend(

      Controller.prototype,

      /** @lends dat.controllers.Controller.prototype */
      {

        /**
         * Specify that a function fire every time someone changes the value with
         * this Controller.
         *
         * @param {Function} fnc This function will be called whenever the value
         * is modified via this Controller.
         * @returns {dat.controllers.Controller} this
         */
        onChange: function(fnc) {
          this.__onChange = fnc;
          return this;
        },

        /**
         * Specify that a function fire every time someone "finishes" changing
         * the value wih this Controller. Useful for values that change
         * incrementally like numbers or strings.
         *
         * @param {Function} fnc This function will be called whenever
         * someone "finishes" changing the value via this Controller.
         * @returns {dat.controllers.Controller} this
         */
        onFinishChange: function(fnc) {
          this.__onFinishChange = fnc;
          return this;
        },

        /**
         * Change the value of <code>object[property]</code>
         *
         * @param {Object} newValue The new value of <code>object[property]</code>
         */
        setValue: function(newValue) {
          this.object[this.property] = newValue;
          if (this.__onChange) {
            this.__onChange.call(this, newValue);
          }
          this.updateDisplay();
          return this;
        },

        /**
         * Gets the value of <code>object[property]</code>
         *
         * @returns {Object} The current value of <code>object[property]</code>
         */
        getValue: function() {
          return this.object[this.property];
        },

        /**
         * Refreshes the visual display of a Controller in order to keep sync
         * with the object's current value.
         * @returns {dat.controllers.Controller} this
         */
        updateDisplay: function() {
          return this;
        },

        /**
         * @returns {Boolean} true if the value has deviated from initialValue
         */
        isModified: function() {
          return this.initialValue !== this.getValue()
        }

      }

  );

  return Controller;


})(dat.utils.common);


dat.dom.dom = (function (common) {

  var EVENT_MAP = {
    'HTMLEvents': ['change'],
    'MouseEvents': ['click','mousemove','mousedown','mouseup', 'mouseover'],
    'KeyboardEvents': ['keydown']
  };

  var EVENT_MAP_INV = {};
  common.each(EVENT_MAP, function(v, k) {
    common.each(v, function(e) {
      EVENT_MAP_INV[e] = k;
    });
  });

  var CSS_VALUE_PIXELS = /(\d+(\.\d+)?)px/;

  function cssValueToPixels(val) {

    if (val === '0' || common.isUndefined(val)) return 0;

    var match = val.match(CSS_VALUE_PIXELS);

    if (!common.isNull(match)) {
      return parseFloat(match[1]);
    }

    // TODO ...ems? %?

    return 0;

  }

  /**
   * @namespace
   * @member dat.dom
   */
  var dom = {

    /**
     * 
     * @param elem
     * @param selectable
     */
    makeSelectable: function(elem, selectable) {

      if (elem === undefined || elem.style === undefined) return;

      elem.onselectstart = selectable ? function() {
        return false;
      } : function() {
      };

      elem.style.MozUserSelect = selectable ? 'auto' : 'none';
      elem.style.KhtmlUserSelect = selectable ? 'auto' : 'none';
      elem.unselectable = selectable ? 'on' : 'off';

    },

    /**
     *
     * @param elem
     * @param horizontal
     * @param vertical
     */
    makeFullscreen: function(elem, horizontal, vertical) {

      if (common.isUndefined(horizontal)) horizontal = true;
      if (common.isUndefined(vertical)) vertical = true;

      elem.style.position = 'absolute';

      if (horizontal) {
        elem.style.left = 0;
        elem.style.right = 0;
      }
      if (vertical) {
        elem.style.top = 0;
        elem.style.bottom = 0;
      }

    },

    /**
     *
     * @param elem
     * @param eventType
     * @param params
     */
    fakeEvent: function(elem, eventType, params, aux) {
      params = params || {};
      var className = EVENT_MAP_INV[eventType];
      if (!className) {
        throw new Error('Event type ' + eventType + ' not supported.');
      }
      var evt = document.createEvent(className);
      switch (className) {
        case 'MouseEvents':
          var clientX = params.x || params.clientX || 0;
          var clientY = params.y || params.clientY || 0;
          evt.initMouseEvent(eventType, params.bubbles || false,
              params.cancelable || true, window, params.clickCount || 1,
              0, //screen X
              0, //screen Y
              clientX, //client X
              clientY, //client Y
              false, false, false, false, 0, null);
          break;
        case 'KeyboardEvents':
          var init = evt.initKeyboardEvent || evt.initKeyEvent; // webkit || moz
          common.defaults(params, {
            cancelable: true,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
            keyCode: undefined,
            charCode: undefined
          });
          init(eventType, params.bubbles || false,
              params.cancelable, window,
              params.ctrlKey, params.altKey,
              params.shiftKey, params.metaKey,
              params.keyCode, params.charCode);
          break;
        default:
          evt.initEvent(eventType, params.bubbles || false,
              params.cancelable || true);
          break;
      }
      common.defaults(evt, aux);
      elem.dispatchEvent(evt);
    },

    /**
     *
     * @param elem
     * @param event
     * @param func
     * @param bool
     */
    bind: function(elem, event, func, bool) {
      bool = bool || false;
      if (elem.addEventListener)
        elem.addEventListener(event, func, bool);
      else if (elem.attachEvent)
        elem.attachEvent('on' + event, func);
      return dom;
    },

    /**
     *
     * @param elem
     * @param event
     * @param func
     * @param bool
     */
    unbind: function(elem, event, func, bool) {
      bool = bool || false;
      if (elem.removeEventListener)
        elem.removeEventListener(event, func, bool);
      else if (elem.detachEvent)
        elem.detachEvent('on' + event, func);
      return dom;
    },

    /**
     *
     * @param elem
     * @param className
     */
    addClass: function(elem, className) {
      if (elem.className === undefined) {
        elem.className = className;
      } else if (elem.className !== className) {
        var classes = elem.className.split(/ +/);
        if (classes.indexOf(className) == -1) {
          classes.push(className);
          elem.className = classes.join(' ').replace(/^\s+/, '').replace(/\s+$/, '');
        }
      }
      return dom;
    },

    /**
     *
     * @param elem
     * @param className
     */
    removeClass: function(elem, className) {
      if (className) {
        if (elem.className === undefined) {
          // elem.className = className;
        } else if (elem.className === className) {
          elem.removeAttribute('class');
        } else {
          var classes = elem.className.split(/ +/);
          var index = classes.indexOf(className);
          if (index != -1) {
            classes.splice(index, 1);
            elem.className = classes.join(' ');
          }
        }
      } else {
        elem.className = undefined;
      }
      return dom;
    },

    hasClass: function(elem, className) {
      return new RegExp('(?:^|\\s+)' + className + '(?:\\s+|$)').test(elem.className) || false;
    },

    /**
     *
     * @param elem
     */
    getWidth: function(elem) {

      var style = getComputedStyle(elem);

      return cssValueToPixels(style['border-left-width']) +
          cssValueToPixels(style['border-right-width']) +
          cssValueToPixels(style['padding-left']) +
          cssValueToPixels(style['padding-right']) +
          cssValueToPixels(style['width']);
    },

    /**
     *
     * @param elem
     */
    getHeight: function(elem) {

      var style = getComputedStyle(elem);

      return cssValueToPixels(style['border-top-width']) +
          cssValueToPixels(style['border-bottom-width']) +
          cssValueToPixels(style['padding-top']) +
          cssValueToPixels(style['padding-bottom']) +
          cssValueToPixels(style['height']);
    },

    /**
     *
     * @param elem
     */
    getOffset: function(elem) {
      var offset = {left: 0, top:0};
      if (elem.offsetParent) {
        do {
          offset.left += elem.offsetLeft;
          offset.top += elem.offsetTop;
        } while (elem = elem.offsetParent);
      }
      return offset;
    },

    // http://stackoverflow.com/posts/2684561/revisions
    /**
     * 
     * @param elem
     */
    isActive: function(elem) {
      return elem === document.activeElement && ( elem.type || elem.href );
    }

  };

  return dom;

})(dat.utils.common);


dat.controllers.OptionController = (function (Controller, dom, common) {

  /**
   * @class Provides a select input to alter the property of an object, using a
   * list of accepted values.
   *
   * @extends dat.controllers.Controller
   *
   * @param {Object} object The object to be manipulated
   * @param {string} property The name of the property to be manipulated
   * @param {Object|string[]} options A map of labels to acceptable values, or
   * a list of acceptable string values.
   *
   * @member dat.controllers
   */
  var OptionController = function(object, property, options) {

    OptionController.superclass.call(this, object, property);

    var _this = this;

    /**
     * The drop down menu
     * @ignore
     */
    this.__select = document.createElement('select');

    if (common.isArray(options)) {
      var map = {};
      common.each(options, function(element) {
        map[element] = element;
      });
      options = map;
    }

    common.each(options, function(value, key) {

      var opt = document.createElement('option');
      opt.innerHTML = key;
      opt.setAttribute('value', value);
      _this.__select.appendChild(opt);

    });

    // Acknowledge original value
    this.updateDisplay();

    dom.bind(this.__select, 'change', function() {
      var desiredValue = this.options[this.selectedIndex].value;
      _this.setValue(desiredValue);
    });

    this.domElement.appendChild(this.__select);

  };

  OptionController.superclass = Controller;

  common.extend(

      OptionController.prototype,
      Controller.prototype,

      {

        setValue: function(v) {
          var toReturn = OptionController.superclass.prototype.setValue.call(this, v);
          if (this.__onFinishChange) {
            this.__onFinishChange.call(this, this.getValue());
          }
          return toReturn;
        },

        updateDisplay: function() {
          this.__select.value = this.getValue();
          return OptionController.superclass.prototype.updateDisplay.call(this);
        }

      }

  );

  return OptionController;

})(dat.controllers.Controller,
dat.dom.dom,
dat.utils.common);


dat.controllers.NumberController = (function (Controller, common) {

  /**
   * @class Represents a given property of an object that is a number.
   *
   * @extends dat.controllers.Controller
   *
   * @param {Object} object The object to be manipulated
   * @param {string} property The name of the property to be manipulated
   * @param {Object} [params] Optional parameters
   * @param {Number} [params.min] Minimum allowed value
   * @param {Number} [params.max] Maximum allowed value
   * @param {Number} [params.step] Increment by which to change value
   *
   * @member dat.controllers
   */
  var NumberController = function(object, property, params) {

    NumberController.superclass.call(this, object, property);

    params = params || {};

    this.__min = params.min;
    this.__max = params.max;
    this.__step = params.step;

    if (common.isUndefined(this.__step)) {

      if (this.initialValue == 0) {
        this.__impliedStep = 1; // What are we, psychics?
      } else {
        // Hey Doug, check this out.
        this.__impliedStep = Math.pow(10, Math.floor(Math.log(Math.abs(this.initialValue))/Math.LN10))/10;
      }

    } else {

    	this.__impliedStep = this.__step;

    }

    this.__precision = numDecimals(this.__impliedStep);


  };

  NumberController.superclass = Controller;

  common.extend(

      NumberController.prototype,
      Controller.prototype,

      /** @lends dat.controllers.NumberController.prototype */
      {

        setValue: function(v) {

          if (this.__min !== undefined && v < this.__min) {
            v = this.__min;
          } else if (this.__max !== undefined && v > this.__max) {
            v = this.__max;
          }

          if (this.__step !== undefined && v % this.__step != 0) {
            v = Math.round(v / this.__step) * this.__step;
          }

          return NumberController.superclass.prototype.setValue.call(this, v);

        },

        /**
         * Specify a minimum value for <code>object[property]</code>.
         *
         * @param {Number} minValue The minimum value for
         * <code>object[property]</code>
         * @returns {dat.controllers.NumberController} this
         */
        min: function(v) {
          this.__min = v;
          return this;
        },

        /**
         * Specify a maximum value for <code>object[property]</code>.
         *
         * @param {Number} maxValue The maximum value for
         * <code>object[property]</code>
         * @returns {dat.controllers.NumberController} this
         */
        max: function(v) {
          this.__max = v;
          return this;
        },

        /**
         * Specify a step value that dat.controllers.NumberController
         * increments by.
         *
         * @param {Number} stepValue The step value for
         * dat.controllers.NumberController
         * @default if minimum and maximum specified increment is 1% of the
         * difference otherwise stepValue is 1
         * @returns {dat.controllers.NumberController} this
         */
        step: function(v) {
          this.__step = v;
          this.__impliedStep = v;
          this.__precision = numDecimals(v);
          return this;
        }

      }

  );

  function numDecimals(x) {
    x = x.toString();
    if (x.indexOf('.') > -1) {
      return x.length - x.indexOf('.') - 1;
    } else {
      return 0;
    }
  }

  return NumberController;

})(dat.controllers.Controller,
dat.utils.common);


dat.controllers.NumberControllerBox = (function (NumberController, dom, common) {

  /**
   * @class Represents a given property of an object that is a number and
   * provides an input element with which to manipulate it.
   *
   * @extends dat.controllers.Controller
   * @extends dat.controllers.NumberController
   *
   * @param {Object} object The object to be manipulated
   * @param {string} property The name of the property to be manipulated
   * @param {Object} [params] Optional parameters
   * @param {Number} [params.min] Minimum allowed value
   * @param {Number} [params.max] Maximum allowed value
   * @param {Number} [params.step] Increment by which to change value
   *
   * @member dat.controllers
   */
  var NumberControllerBox = function(object, property, params) {

    this.__truncationSuspended = false;

    NumberControllerBox.superclass.call(this, object, property, params);

    var _this = this;

    /**
     * {Number} Previous mouse y position
     * @ignore
     */
    var prev_y;

    this.__input = document.createElement('input');
    this.__input.setAttribute('type', 'text');

    // Makes it so manually specified values are not truncated.

    dom.bind(this.__input, 'change', onChange);
    dom.bind(this.__input, 'blur', onBlur);
    dom.bind(this.__input, 'mousedown', onMouseDown);
    dom.bind(this.__input, 'keydown', function(e) {

      // When pressing entire, you can be as precise as you want.
      if (e.keyCode === 13) {
        _this.__truncationSuspended = true;
        this.blur();
        _this.__truncationSuspended = false;
      }

    });

    function onChange() {
      var attempted = parseFloat(_this.__input.value);
      if (!common.isNaN(attempted)) _this.setValue(attempted);
    }

    function onBlur() {
      onChange();
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }

    function onMouseDown(e) {
      dom.bind(window, 'mousemove', onMouseDrag);
      dom.bind(window, 'mouseup', onMouseUp);
      prev_y = e.clientY;
    }

    function onMouseDrag(e) {

      var diff = prev_y - e.clientY;
      _this.setValue(_this.getValue() + diff * _this.__impliedStep);

      prev_y = e.clientY;

    }

    function onMouseUp() {
      dom.unbind(window, 'mousemove', onMouseDrag);
      dom.unbind(window, 'mouseup', onMouseUp);
    }

    this.updateDisplay();

    this.domElement.appendChild(this.__input);

  };

  NumberControllerBox.superclass = NumberController;

  common.extend(

      NumberControllerBox.prototype,
      NumberController.prototype,

      {

        updateDisplay: function() {

          this.__input.value = this.__truncationSuspended ? this.getValue() : roundToDecimal(this.getValue(), this.__precision);
          return NumberControllerBox.superclass.prototype.updateDisplay.call(this);
        }

      }

  );

  function roundToDecimal(value, decimals) {
    var tenTo = Math.pow(10, decimals);
    return Math.round(value * tenTo) / tenTo;
  }

  return NumberControllerBox;

})(dat.controllers.NumberController,
dat.dom.dom,
dat.utils.common);


dat.controllers.NumberControllerSlider = (function (NumberController, dom, css, common, styleSheet) {

  /**
   * @class Represents a given property of an object that is a number, contains
   * a minimum and maximum, and provides a slider element with which to
   * manipulate it. It should be noted that the slider element is made up of
   * <code>&lt;div&gt;</code> tags, <strong>not</strong> the html5
   * <code>&lt;slider&gt;</code> element.
   *
   * @extends dat.controllers.Controller
   * @extends dat.controllers.NumberController
   * 
   * @param {Object} object The object to be manipulated
   * @param {string} property The name of the property to be manipulated
   * @param {Number} minValue Minimum allowed value
   * @param {Number} maxValue Maximum allowed value
   * @param {Number} stepValue Increment by which to change value
   *
   * @member dat.controllers
   */
  var NumberControllerSlider = function(object, property, min, max, step) {

    NumberControllerSlider.superclass.call(this, object, property, { min: min, max: max, step: step });

    var _this = this;

    this.__background = document.createElement('div');
    this.__foreground = document.createElement('div');
    


    dom.bind(this.__background, 'mousedown', onMouseDown);
    
    dom.addClass(this.__background, 'slider');
    dom.addClass(this.__foreground, 'slider-fg');

    function onMouseDown(e) {

      dom.bind(window, 'mousemove', onMouseDrag);
      dom.bind(window, 'mouseup', onMouseUp);

      onMouseDrag(e);
    }

    function onMouseDrag(e) {

      e.preventDefault();

      var offset = dom.getOffset(_this.__background);
      var width = dom.getWidth(_this.__background);
      
      _this.setValue(
      	map(e.clientX, offset.left, offset.left + width, _this.__min, _this.__max)
      );

      return false;

    }

    function onMouseUp() {
      dom.unbind(window, 'mousemove', onMouseDrag);
      dom.unbind(window, 'mouseup', onMouseUp);
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }

    this.updateDisplay();

    this.__background.appendChild(this.__foreground);
    this.domElement.appendChild(this.__background);

  };

  NumberControllerSlider.superclass = NumberController;

  /**
   * Injects default stylesheet for slider elements.
   */
  NumberControllerSlider.useDefaultStyles = function() {
    css.inject(styleSheet);
  };

  common.extend(

      NumberControllerSlider.prototype,
      NumberController.prototype,

      {

        updateDisplay: function() {
          var pct = (this.getValue() - this.__min)/(this.__max - this.__min);
          this.__foreground.style.width = pct*100+'%';
          return NumberControllerSlider.superclass.prototype.updateDisplay.call(this);
        }

      }



  );

	function map(v, i1, i2, o1, o2) {
		return o1 + (o2 - o1) * ((v - i1) / (i2 - i1));
	}

  return NumberControllerSlider;
  
})(dat.controllers.NumberController,
dat.dom.dom,
dat.utils.css,
dat.utils.common,
"/**\n * dat-gui JavaScript Controller Library\n * http://code.google.com/p/dat-gui\n *\n * Copyright 2011 Data Arts Team, Google Creative Lab\n *\n * Licensed under the Apache License, Version 2.0 (the \"License\");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n * http://www.apache.org/licenses/LICENSE-2.0\n */\n\n.slider {\n  box-shadow: inset 0 2px 4px rgba(0,0,0,0.15);\n  height: 1em;\n  border-radius: 1em;\n  background-color: #eee;\n  padding: 0 0.5em;\n  overflow: hidden;\n}\n\n.slider-fg {\n  padding: 1px 0 2px 0;\n  background-color: #aaa;\n  height: 1em;\n  margin-left: -0.5em;\n  padding-right: 0.5em;\n  border-radius: 1em 0 0 1em;\n}\n\n.slider-fg:after {\n  display: inline-block;\n  border-radius: 1em;\n  background-color: #fff;\n  border:  1px solid #aaa;\n  content: '';\n  float: right;\n  margin-right: -1em;\n  margin-top: -1px;\n  height: 0.9em;\n  width: 0.9em;\n}");


dat.controllers.FunctionController = (function (Controller, dom, common) {

  /**
   * @class Provides a GUI interface to fire a specified method, a property of an object.
   *
   * @extends dat.controllers.Controller
   *
   * @param {Object} object The object to be manipulated
   * @param {string} property The name of the property to be manipulated
   *
   * @member dat.controllers
   */
  var FunctionController = function(object, property, text) {

    FunctionController.superclass.call(this, object, property);

    var _this = this;

    this.__button = document.createElement('div');
    this.__button.innerHTML = text === undefined ? 'Fire' : text;
    dom.bind(this.__button, 'click', function(e) {
      e.preventDefault();
      _this.fire();
      return false;
    });

    dom.addClass(this.__button, 'button');

    this.domElement.appendChild(this.__button);


  };

  FunctionController.superclass = Controller;

  common.extend(

      FunctionController.prototype,
      Controller.prototype,
      {
        
        fire: function() {
          if (this.__onChange) {
            this.__onChange.call(this);
          }
          this.getValue().call(this.object);
          if (this.__onFinishChange) {
            this.__onFinishChange.call(this, this.getValue());
          }
        }
      }

  );

  return FunctionController;

})(dat.controllers.Controller,
dat.dom.dom,
dat.utils.common);


dat.controllers.BooleanController = (function (Controller, dom, common) {

  /**
   * @class Provides a checkbox input to alter the boolean property of an object.
   * @extends dat.controllers.Controller
   *
   * @param {Object} object The object to be manipulated
   * @param {string} property The name of the property to be manipulated
   *
   * @member dat.controllers
   */
  var BooleanController = function(object, property) {

    BooleanController.superclass.call(this, object, property);

    var _this = this;
    this.__prev = this.getValue();

    this.__checkbox = document.createElement('input');
    this.__checkbox.setAttribute('type', 'checkbox');


    dom.bind(this.__checkbox, 'change', onChange, false);

    this.domElement.appendChild(this.__checkbox);

    // Match original value
    this.updateDisplay();

    function onChange() {
      _this.setValue(!_this.__prev);
    }

  };

  BooleanController.superclass = Controller;

  common.extend(

      BooleanController.prototype,
      Controller.prototype,

      {

        setValue: function(v) {
          var toReturn = BooleanController.superclass.prototype.setValue.call(this, v);
          if (this.__onFinishChange) {
            this.__onFinishChange.call(this, this.getValue());
          }
          this.__prev = this.getValue();
          return toReturn;
        },

        updateDisplay: function() {
          
          if (this.getValue() === true) {
            this.__checkbox.setAttribute('checked', 'checked');
            this.__checkbox.checked = true;    
          } else {
              this.__checkbox.checked = false;
          }

          return BooleanController.superclass.prototype.updateDisplay.call(this);

        }


      }

  );

  return BooleanController;

})(dat.controllers.Controller,
dat.dom.dom,
dat.utils.common);


dat.color.toString = (function (common) {

  return function(color) {

    if (color.a == 1 || common.isUndefined(color.a)) {

      var s = color.hex.toString(16);
      while (s.length < 6) {
        s = '0' + s;
      }

      return '#' + s;

    } else {

      return 'rgba(' + Math.round(color.r) + ',' + Math.round(color.g) + ',' + Math.round(color.b) + ',' + color.a + ')';

    }

  }

})(dat.utils.common);


dat.color.interpret = (function (toString, common) {

  var result, toReturn;

  var interpret = function() {

    toReturn = false;

    var original = arguments.length > 1 ? common.toArray(arguments) : arguments[0];

    common.each(INTERPRETATIONS, function(family) {

      if (family.litmus(original)) {

        common.each(family.conversions, function(conversion, conversionName) {

          result = conversion.read(original);

          if (toReturn === false && result !== false) {
            toReturn = result;
            result.conversionName = conversionName;
            result.conversion = conversion;
            return common.BREAK;

          }

        });

        return common.BREAK;

      }

    });

    return toReturn;

  };

  var INTERPRETATIONS = [

    // Strings
    {

      litmus: common.isString,

      conversions: {

        THREE_CHAR_HEX: {

          read: function(original) {

            var test = original.match(/^#([A-F0-9])([A-F0-9])([A-F0-9])$/i);
            if (test === null) return false;

            return {
              space: 'HEX',
              hex: parseInt(
                  '0x' +
                      test[1].toString() + test[1].toString() +
                      test[2].toString() + test[2].toString() +
                      test[3].toString() + test[3].toString())
            };

          },

          write: toString

        },

        SIX_CHAR_HEX: {

          read: function(original) {

            var test = original.match(/^#([A-F0-9]{6})$/i);
            if (test === null) return false;

            return {
              space: 'HEX',
              hex: parseInt('0x' + test[1].toString())
            };

          },

          write: toString

        },

        CSS_RGB: {

          read: function(original) {

            var test = original.match(/^rgb\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\)/);
            if (test === null) return false;

            return {
              space: 'RGB',
              r: parseFloat(test[1]),
              g: parseFloat(test[2]),
              b: parseFloat(test[3])
            };

          },

          write: toString

        },

        CSS_RGBA: {

          read: function(original) {

            var test = original.match(/^rgba\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\,\s*(.+)\s*\)/);
            if (test === null) return false;

            return {
              space: 'RGB',
              r: parseFloat(test[1]),
              g: parseFloat(test[2]),
              b: parseFloat(test[3]),
              a: parseFloat(test[4])
            };

          },

          write: toString

        }

      }

    },

    // Numbers
    {

      litmus: common.isNumber,

      conversions: {

        HEX: {
          read: function(original) {
            return {
              space: 'HEX',
              hex: original,
              conversionName: 'HEX'
            }
          },

          write: function(color) {
            return color.hex;
          }
        }

      }

    },

    // Arrays
    {

      litmus: common.isArray,

      conversions: {

        RGB_ARRAY: {
          read: function(original) {
            if (original.length != 3) return false;
            return {
              space: 'RGB',
              r: original[0],
              g: original[1],
              b: original[2]
            };
          },

          write: function(color) {
            return [color.r, color.g, color.b];
          }

        },

        RGBA_ARRAY: {
          read: function(original) {
            if (original.length != 4) return false;
            return {
              space: 'RGB',
              r: original[0],
              g: original[1],
              b: original[2],
              a: original[3]
            };
          },

          write: function(color) {
            return [color.r, color.g, color.b, color.a];
          }

        }

      }

    },

    // Objects
    {

      litmus: common.isObject,

      conversions: {

        RGBA_OBJ: {
          read: function(original) {
            if (common.isNumber(original.r) &&
                common.isNumber(original.g) &&
                common.isNumber(original.b) &&
                common.isNumber(original.a)) {
              return {
                space: 'RGB',
                r: original.r,
                g: original.g,
                b: original.b,
                a: original.a
              }
            }
            return false;
          },

          write: function(color) {
            return {
              r: color.r,
              g: color.g,
              b: color.b,
              a: color.a
            }
          }
        },

        RGB_OBJ: {
          read: function(original) {
            if (common.isNumber(original.r) &&
                common.isNumber(original.g) &&
                common.isNumber(original.b)) {
              return {
                space: 'RGB',
                r: original.r,
                g: original.g,
                b: original.b
              }
            }
            return false;
          },

          write: function(color) {
            return {
              r: color.r,
              g: color.g,
              b: color.b
            }
          }
        },

        HSVA_OBJ: {
          read: function(original) {
            if (common.isNumber(original.h) &&
                common.isNumber(original.s) &&
                common.isNumber(original.v) &&
                common.isNumber(original.a)) {
              return {
                space: 'HSV',
                h: original.h,
                s: original.s,
                v: original.v,
                a: original.a
              }
            }
            return false;
          },

          write: function(color) {
            return {
              h: color.h,
              s: color.s,
              v: color.v,
              a: color.a
            }
          }
        },

        HSV_OBJ: {
          read: function(original) {
            if (common.isNumber(original.h) &&
                common.isNumber(original.s) &&
                common.isNumber(original.v)) {
              return {
                space: 'HSV',
                h: original.h,
                s: original.s,
                v: original.v
              }
            }
            return false;
          },

          write: function(color) {
            return {
              h: color.h,
              s: color.s,
              v: color.v
            }
          }

        }

      }

    }


  ];

  return interpret;


})(dat.color.toString,
dat.utils.common);


dat.GUI = dat.gui.GUI = (function (css, saveDialogueContents, styleSheet, controllerFactory, Controller, BooleanController, FunctionController, NumberControllerBox, NumberControllerSlider, OptionController, ColorController, requestAnimationFrame, CenteredDiv, dom, common) {

  css.inject(styleSheet);

  /** Outer-most className for GUI's */
  var CSS_NAMESPACE = 'dg';

  var HIDE_KEY_CODE = 72;

  /** The only value shared between the JS and SCSS. Use caution. */
  var CLOSE_BUTTON_HEIGHT = 20;

  var DEFAULT_DEFAULT_PRESET_NAME = 'Default';

  var SUPPORTS_LOCAL_STORAGE = (function() {
    try {
      return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
      return false;
    }
  })();

  var SAVE_DIALOGUE;

  /** Have we yet to create an autoPlace GUI? */
  var auto_place_virgin = true;

  /** Fixed position div that auto place GUI's go inside */
  var auto_place_container;

  /** Are we hiding the GUI's ? */
  var hide = false;

  /** GUI's which should be hidden */
  var hideable_guis = [];

  /**
   * A lightweight controller library for JavaScript. It allows you to easily
   * manipulate variables and fire functions on the fly.
   * @class
   *
   * @member dat.gui
   *
   * @param {Object} [params]
   * @param {String} [params.name] The name of this GUI.
   * @param {Object} [params.load] JSON object representing the saved state of
   * this GUI.
   * @param {Boolean} [params.auto=true]
   * @param {dat.gui.GUI} [params.parent] The GUI I'm nested in.
   * @param {Boolean} [params.closed] If true, starts closed
   */
  var GUI = function(params) {

    var _this = this;

    /**
     * Outermost DOM Element
     * @type DOMElement
     */
    this.domElement = document.createElement('div');
    this.__ul = document.createElement('ul');
    this.domElement.appendChild(this.__ul);

    dom.addClass(this.domElement, CSS_NAMESPACE);

    /**
     * Nested GUI's by name
     * @ignore
     */
    this.__folders = {};

    this.__controllers = [];

    /**
     * List of objects I'm remembering for save, only used in top level GUI
     * @ignore
     */
    this.__rememberedObjects = [];

    /**
     * Maps the index of remembered objects to a map of controllers, only used
     * in top level GUI.
     *
     * @private
     * @ignore
     *
     * @example
     * [
     *  {
     *    propertyName: Controller,
     *    anotherPropertyName: Controller
     *  },
     *  {
     *    propertyName: Controller
     *  }
     * ]
     */
    this.__rememberedObjectIndecesToControllers = [];

    this.__listening = [];

    params = params || {};

    // Default parameters
    params = common.defaults(params, {
      autoPlace: true,
      width: GUI.DEFAULT_WIDTH
    });

    params = common.defaults(params, {
      resizable: params.autoPlace,
      hideable: params.autoPlace
    });


    if (!common.isUndefined(params.load)) {

      // Explicit preset
      if (params.preset) params.load.preset = params.preset;

    } else {

      params.load = { preset: DEFAULT_DEFAULT_PRESET_NAME };

    }

    if (common.isUndefined(params.parent) && params.hideable) {
      hideable_guis.push(this);
    }

    // Only root level GUI's are resizable.
    params.resizable = common.isUndefined(params.parent) && params.resizable;


    if (params.autoPlace && common.isUndefined(params.scrollable)) {
      params.scrollable = true;
    }
//    params.scrollable = common.isUndefined(params.parent) && params.scrollable === true;

    // Not part of params because I don't want people passing this in via
    // constructor. Should be a 'remembered' value.
    var use_local_storage =
        SUPPORTS_LOCAL_STORAGE &&
            localStorage.getItem(getLocalStorageHash(this, 'isLocal')) === 'true';

    var saveToLocalStorage;

    Object.defineProperties(this,

        /** @lends dat.gui.GUI.prototype */
        {

          /**
           * The parent <code>GUI</code>
           * @type dat.gui.GUI
           */
          parent: {
            get: function() {
              return params.parent;
            }
          },

          scrollable: {
            get: function() {
              return params.scrollable;
            }
          },

          /**
           * Handles <code>GUI</code>'s element placement for you
           * @type Boolean
           */
          autoPlace: {
            get: function() {
              return params.autoPlace;
            }
          },

          /**
           * The identifier for a set of saved values
           * @type String
           */
          preset: {

            get: function() {
              if (_this.parent) {
                return _this.getRoot().preset;
              } else {
                return params.load.preset;
              }
            },

            set: function(v) {
              if (_this.parent) {
                _this.getRoot().preset = v;
              } else {
                params.load.preset = v;
              }
              setPresetSelectIndex(this);
              _this.revert();
            }

          },

          /**
           * The width of <code>GUI</code> element
           * @type Number
           */
          width: {
            get: function() {
              return params.width;
            },
            set: function(v) {
              params.width = v;
              setWidth(_this, v);
            }
          },

          /**
           * The name of <code>GUI</code>. Used for folders. i.e
           * a folder's name
           * @type String
           */
          name: {
            get: function() {
              return params.name;
            },
            set: function(v) {
              // TODO Check for collisions among sibling folders
              params.name = v;
              if (title_row_name) {
                title_row_name.innerHTML = params.name;
              }
            }
          },

          /**
           * Whether the <code>GUI</code> is collapsed or not
           * @type Boolean
           */
          closed: {
            get: function() {
              return params.closed;
            },
            set: function(v) {
              params.closed = v;
              if (params.closed) {
                dom.addClass(_this.__ul, GUI.CLASS_CLOSED);
              } else {
                dom.removeClass(_this.__ul, GUI.CLASS_CLOSED);
              }
              // For browsers that aren't going to respect the CSS transition,
              // Lets just check our height against the window height right off
              // the bat.
              this.onResize();

              if (_this.__closeButton) {
                _this.__closeButton.innerHTML = v ? GUI.TEXT_OPEN : GUI.TEXT_CLOSED;
              }
            }
          },

          /**
           * Contains all presets
           * @type Object
           */
          load: {
            get: function() {
              return params.load;
            }
          },

          /**
           * Determines whether or not to use <a href="https://developer.mozilla.org/en/DOM/Storage#localStorage">localStorage</a> as the means for
           * <code>remember</code>ing
           * @type Boolean
           */
          useLocalStorage: {

            get: function() {
              return use_local_storage;
            },
            set: function(bool) {
              if (SUPPORTS_LOCAL_STORAGE) {
                use_local_storage = bool;
                if (bool) {
                  dom.bind(window, 'unload', saveToLocalStorage);
                } else {
                  dom.unbind(window, 'unload', saveToLocalStorage);
                }
                localStorage.setItem(getLocalStorageHash(_this, 'isLocal'), bool);
              }
            }

          }

        });

    // Are we a root level GUI?
    if (common.isUndefined(params.parent)) {

      params.closed = false;

      dom.addClass(this.domElement, GUI.CLASS_MAIN);
      dom.makeSelectable(this.domElement, false);

      // Are we supposed to be loading locally?
      if (SUPPORTS_LOCAL_STORAGE) {

        if (use_local_storage) {

          _this.useLocalStorage = true;

          var saved_gui = localStorage.getItem(getLocalStorageHash(this, 'gui'));

          if (saved_gui) {
            params.load = JSON.parse(saved_gui);
          }

        }

      }

      this.__closeButton = document.createElement('div');
      this.__closeButton.innerHTML = GUI.TEXT_CLOSED;
      dom.addClass(this.__closeButton, GUI.CLASS_CLOSE_BUTTON);
      this.domElement.appendChild(this.__closeButton);

      dom.bind(this.__closeButton, 'click', function() {

        _this.closed = !_this.closed;


      });


      // Oh, you're a nested GUI!
    } else {

      if (params.closed === undefined) {
        params.closed = true;
      }

      var title_row_name = document.createTextNode(params.name);
      dom.addClass(title_row_name, 'controller-name');

      var title_row = addRow(_this, title_row_name);

      var on_click_title = function(e) {
        e.preventDefault();
        _this.closed = !_this.closed;
        return false;
      };

      dom.addClass(this.__ul, GUI.CLASS_CLOSED);

      dom.addClass(title_row, 'title');
      dom.bind(title_row, 'click', on_click_title);

      if (!params.closed) {
        this.closed = false;
      }

    }

    if (params.autoPlace) {

      if (common.isUndefined(params.parent)) {

        if (auto_place_virgin) {
          auto_place_container = document.createElement('div');
          dom.addClass(auto_place_container, CSS_NAMESPACE);
          dom.addClass(auto_place_container, GUI.CLASS_AUTO_PLACE_CONTAINER);
          document.body.appendChild(auto_place_container);
          auto_place_virgin = false;
        }

        // Put it in the dom for you.
        auto_place_container.appendChild(this.domElement);

        // Apply the auto styles
        dom.addClass(this.domElement, GUI.CLASS_AUTO_PLACE);

      }


      // Make it not elastic.
      if (!this.parent) setWidth(_this, params.width);

    }

    dom.bind(window, 'resize', function() { _this.onResize() });
    dom.bind(this.__ul, 'webkitTransitionEnd', function() { _this.onResize(); });
    dom.bind(this.__ul, 'transitionend', function() { _this.onResize() });
    dom.bind(this.__ul, 'oTransitionEnd', function() { _this.onResize() });
    this.onResize();


    if (params.resizable) {
      addResizeHandle(this);
    }

    saveToLocalStorage = function () {
      if (SUPPORTS_LOCAL_STORAGE && localStorage.getItem(getLocalStorageHash(_this, 'isLocal')) === 'true') {
        localStorage.setItem(getLocalStorageHash(_this, 'gui'), JSON.stringify(_this.getSaveObject()));
      }
    }

    // expose this method publicly
    this.saveToLocalStorageIfPossible = saveToLocalStorage;

    var root = _this.getRoot();
    function resetWidth() {
	      var root = _this.getRoot();
	      root.width += 1;
	      common.defer(function() {
	        root.width -= 1;
	      });
	    }

	    if (!params.parent) {
	      resetWidth();
	    }

  };

  GUI.toggleHide = function() {

    hide = !hide;
    common.each(hideable_guis, function(gui) {
      gui.domElement.style.zIndex = hide ? -999 : 999;
      gui.domElement.style.opacity = hide ? 0 : 1;
    });
  };

  GUI.CLASS_AUTO_PLACE = 'a';
  GUI.CLASS_AUTO_PLACE_CONTAINER = 'ac';
  GUI.CLASS_MAIN = 'main';
  GUI.CLASS_CONTROLLER_ROW = 'cr';
  GUI.CLASS_TOO_TALL = 'taller-than-window';
  GUI.CLASS_CLOSED = 'closed';
  GUI.CLASS_CLOSE_BUTTON = 'close-button';
  GUI.CLASS_DRAG = 'drag';

  GUI.DEFAULT_WIDTH = 245;
  GUI.TEXT_CLOSED = 'Close Controls';
  GUI.TEXT_OPEN = 'Open Controls';

  dom.bind(window, 'keydown', function(e) {

    if (document.activeElement.type !== 'text' &&
        (e.which === HIDE_KEY_CODE || e.keyCode == HIDE_KEY_CODE)) {
      GUI.toggleHide();
    }

  }, false);

  common.extend(

      GUI.prototype,

      /** @lends dat.gui.GUI */
      {

        /**
         * @param object
         * @param property
         * @returns {dat.controllers.Controller} The new controller that was added.
         * @instance
         */
        add: function(object, property) {

          return add(
              this,
              object,
              property,
              {
                factoryArgs: Array.prototype.slice.call(arguments, 2)
              }
          );

        },

        /**
         * @param object
         * @param property
         * @returns {dat.controllers.ColorController} The new controller that was added.
         * @instance
         */
        addColor: function(object, property) {

          return add(
              this,
              object,
              property,
              {
                color: true
              }
          );

        },

        /**
         * @param controller
         * @instance
         */
        remove: function(controller) {

          // TODO listening?
          this.__ul.removeChild(controller.__li);
          this.__controllers.splice(this.__controllers.indexOf(controller), 1);
          var _this = this;
          common.defer(function() {
            _this.onResize();
          });

        },

        destroy: function() {

          if (this.autoPlace) {
            auto_place_container.removeChild(this.domElement);
          }

        },

        /**
         * @param name
         * @returns {dat.gui.GUI} The new folder.
         * @throws {Error} if this GUI already has a folder by the specified
         * name
         * @instance
         */
        addFolder: function(name) {

          // We have to prevent collisions on names in order to have a key
          // by which to remember saved values
          if (this.__folders[name] !== undefined) {
            throw new Error('You already have a folder in this GUI by the' +
                ' name "' + name + '"');
          }

          var new_gui_params = { name: name, parent: this };

          // We need to pass down the autoPlace trait so that we can
          // attach event listeners to open/close folder actions to
          // ensure that a scrollbar appears if the window is too short.
          new_gui_params.autoPlace = this.autoPlace;

          // Do we have saved appearance data for this folder?

          if (this.load && // Anything loaded?
              this.load.folders && // Was my parent a dead-end?
              this.load.folders[name]) { // Did daddy remember me?

            // Start me closed if I was closed
            new_gui_params.closed = this.load.folders[name].closed;

            // Pass down the loaded data
            new_gui_params.load = this.load.folders[name];

          }

          var gui = new GUI(new_gui_params);
          this.__folders[name] = gui;

          var li = addRow(this, gui.domElement);
          dom.addClass(li, 'folder');
          return gui;

        },

        open: function() {
          this.closed = false;
        },

        close: function() {
          this.closed = true;
        },

        onResize: function() {

          var root = this.getRoot();

          if (root.scrollable) {

            var top = dom.getOffset(root.__ul).top;
            var h = 0;

            common.each(root.__ul.childNodes, function(node) {
              if (! (root.autoPlace && node === root.__save_row))
                h += dom.getHeight(node);
            });

            if (window.innerHeight - top - CLOSE_BUTTON_HEIGHT < h) {
              dom.addClass(root.domElement, GUI.CLASS_TOO_TALL);
              root.__ul.style.height = window.innerHeight - top - CLOSE_BUTTON_HEIGHT + 'px';
            } else {
              dom.removeClass(root.domElement, GUI.CLASS_TOO_TALL);
              root.__ul.style.height = 'auto';
            }

          }

          if (root.__resize_handle) {
            common.defer(function() {
              root.__resize_handle.style.height = root.__ul.offsetHeight + 'px';
            });
          }

          if (root.__closeButton) {
            root.__closeButton.style.width = root.width + 'px';
          }

        },

        /**
         * Mark objects for saving. The order of these objects cannot change as
         * the GUI grows. When remembering new objects, append them to the end
         * of the list.
         *
         * @param {Object...} objects
         * @throws {Error} if not called on a top level GUI.
         * @instance
         */
        remember: function() {

          if (common.isUndefined(SAVE_DIALOGUE)) {
            SAVE_DIALOGUE = new CenteredDiv();
            SAVE_DIALOGUE.domElement.innerHTML = saveDialogueContents;
          }

          if (this.parent) {
            throw new Error("You can only call remember on a top level GUI.");
          }

          var _this = this;

          common.each(Array.prototype.slice.call(arguments), function(object) {
            if (_this.__rememberedObjects.length == 0) {
              addSaveMenu(_this);
            }
            if (_this.__rememberedObjects.indexOf(object) == -1) {
              _this.__rememberedObjects.push(object);
            }
          });

          if (this.autoPlace) {
            // Set save row width
            setWidth(this, this.width);
          }

        },

        /**
         * @returns {dat.gui.GUI} the topmost parent GUI of a nested GUI.
         * @instance
         */
        getRoot: function() {
          var gui = this;
          while (gui.parent) {
            gui = gui.parent;
          }
          return gui;
        },

        /**
         * @returns {Object} a JSON object representing the current state of
         * this GUI as well as its remembered properties.
         * @instance
         */
        getSaveObject: function() {

          var toReturn = this.load;

          toReturn.closed = this.closed;

          // Am I remembering any values?
          if (this.__rememberedObjects.length > 0) {

            toReturn.preset = this.preset;

            if (!toReturn.remembered) {
              toReturn.remembered = {};
            }

            toReturn.remembered[this.preset] = getCurrentPreset(this);

          }

          toReturn.folders = {};
          common.each(this.__folders, function(element, key) {
            toReturn.folders[key] = element.getSaveObject();
          });

          return toReturn;

        },

        save: function() {

          if (!this.load.remembered) {
            this.load.remembered = {};
          }

          this.load.remembered[this.preset] = getCurrentPreset(this);
          markPresetModified(this, false);
          this.saveToLocalStorageIfPossible();

        },

        saveAs: function(presetName) {

          if (!this.load.remembered) {

            // Retain default values upon first save
            this.load.remembered = {};
            this.load.remembered[DEFAULT_DEFAULT_PRESET_NAME] = getCurrentPreset(this, true);

          }

          this.load.remembered[presetName] = getCurrentPreset(this);
          this.preset = presetName;
          addPresetOption(this, presetName, true);
          this.saveToLocalStorageIfPossible();

        },

        revert: function(gui) {

          common.each(this.__controllers, function(controller) {
            // Make revert work on Default.
            if (!this.getRoot().load.remembered) {
              controller.setValue(controller.initialValue);
            } else {
              recallSavedValue(gui || this.getRoot(), controller);
            }
          }, this);

          common.each(this.__folders, function(folder) {
            folder.revert(folder);
          });

          if (!gui) {
            markPresetModified(this.getRoot(), false);
          }


        },

        listen: function(controller) {

          var init = this.__listening.length == 0;
          this.__listening.push(controller);
          if (init) updateDisplays(this.__listening);

        }

      }

  );

  function add(gui, object, property, params) {

    if (object[property] === undefined) {
      throw new Error("Object " + object + " has no property \"" + property + "\"");
    }

    var controller;

    if (params.color) {

      controller = new ColorController(object, property);

    } else {

      var factoryArgs = [object,property].concat(params.factoryArgs);
      controller = controllerFactory.apply(gui, factoryArgs);

    }

    if (params.before instanceof Controller) {
      params.before = params.before.__li;
    }

    recallSavedValue(gui, controller);

    dom.addClass(controller.domElement, 'c');

    var name = document.createElement('span');
    dom.addClass(name, 'property-name');
    name.innerHTML = controller.property;

    var container = document.createElement('div');
    container.appendChild(name);
    container.appendChild(controller.domElement);

    var li = addRow(gui, container, params.before);

    dom.addClass(li, GUI.CLASS_CONTROLLER_ROW);
    dom.addClass(li, typeof controller.getValue());

    augmentController(gui, li, controller);

    gui.__controllers.push(controller);

    return controller;

  }

  /**
   * Add a row to the end of the GUI or before another row.
   *
   * @param gui
   * @param [dom] If specified, inserts the dom content in the new row
   * @param [liBefore] If specified, places the new row before another row
   */
  function addRow(gui, dom, liBefore) {
    var li = document.createElement('li');
    if (dom) li.appendChild(dom);
    if (liBefore) {
      gui.__ul.insertBefore(li, params.before);
    } else {
      gui.__ul.appendChild(li);
    }
    gui.onResize();
    return li;
  }

  function augmentController(gui, li, controller) {

    controller.__li = li;
    controller.__gui = gui;

    common.extend(controller, {

      options: function(options) {

        if (arguments.length > 1) {
          controller.remove();

          return add(
              gui,
              controller.object,
              controller.property,
              {
                before: controller.__li.nextElementSibling,
                factoryArgs: [common.toArray(arguments)]
              }
          );

        }

        if (common.isArray(options) || common.isObject(options)) {
          controller.remove();

          return add(
              gui,
              controller.object,
              controller.property,
              {
                before: controller.__li.nextElementSibling,
                factoryArgs: [options]
              }
          );

        }

      },

      name: function(v) {
        controller.__li.firstElementChild.firstElementChild.innerHTML = v;
        return controller;
      },

      listen: function() {
        controller.__gui.listen(controller);
        return controller;
      },

      remove: function() {
        controller.__gui.remove(controller);
        return controller;
      }

    });

    // All sliders should be accompanied by a box.
    if (controller instanceof NumberControllerSlider) {

      var box = new NumberControllerBox(controller.object, controller.property,
          { min: controller.__min, max: controller.__max, step: controller.__step });

      common.each(['updateDisplay', 'onChange', 'onFinishChange'], function(method) {
        var pc = controller[method];
        var pb = box[method];
        controller[method] = box[method] = function() {
          var args = Array.prototype.slice.call(arguments);
          pc.apply(controller, args);
          return pb.apply(box, args);
        }
      });

      dom.addClass(li, 'has-slider');
      controller.domElement.insertBefore(box.domElement, controller.domElement.firstElementChild);

    }
    else if (controller instanceof NumberControllerBox) {

      var r = function(returned) {

        // Have we defined both boundaries?
        if (common.isNumber(controller.__min) && common.isNumber(controller.__max)) {

          // Well, then lets just replace this with a slider.
          controller.remove();
          return add(
              gui,
              controller.object,
              controller.property,
              {
                before: controller.__li.nextElementSibling,
                factoryArgs: [controller.__min, controller.__max, controller.__step]
              });

        }

        return returned;

      };

      controller.min = common.compose(r, controller.min);
      controller.max = common.compose(r, controller.max);

    }
    else if (controller instanceof BooleanController) {

      dom.bind(li, 'click', function() {
        dom.fakeEvent(controller.__checkbox, 'click');
      });

      dom.bind(controller.__checkbox, 'click', function(e) {
        e.stopPropagation(); // Prevents double-toggle
      })

    }
    else if (controller instanceof FunctionController) {

      dom.bind(li, 'click', function() {
        dom.fakeEvent(controller.__button, 'click');
      });

      dom.bind(li, 'mouseover', function() {
        dom.addClass(controller.__button, 'hover');
      });

      dom.bind(li, 'mouseout', function() {
        dom.removeClass(controller.__button, 'hover');
      });

    }
    else if (controller instanceof ColorController) {

      dom.addClass(li, 'color');
      controller.updateDisplay = common.compose(function(r) {
        li.style.borderLeftColor = controller.__color.toString();
        return r;
      }, controller.updateDisplay);

      controller.updateDisplay();

    }

    controller.setValue = common.compose(function(r) {
      if (gui.getRoot().__preset_select && controller.isModified()) {
        markPresetModified(gui.getRoot(), true);
      }
      return r;
    }, controller.setValue);

  }

  function recallSavedValue(gui, controller) {

    // Find the topmost GUI, that's where remembered objects live.
    var root = gui.getRoot();

    // Does the object we're controlling match anything we've been told to
    // remember?
    var matched_index = root.__rememberedObjects.indexOf(controller.object);

    // Why yes, it does!
    if (matched_index != -1) {

      // Let me fetch a map of controllers for thcommon.isObject.
      var controller_map =
          root.__rememberedObjectIndecesToControllers[matched_index];

      // Ohp, I believe this is the first controller we've created for this
      // object. Lets make the map fresh.
      if (controller_map === undefined) {
        controller_map = {};
        root.__rememberedObjectIndecesToControllers[matched_index] =
            controller_map;
      }

      // Keep track of this controller
      controller_map[controller.property] = controller;

      // Okay, now have we saved any values for this controller?
      if (root.load && root.load.remembered) {

        var preset_map = root.load.remembered;

        // Which preset are we trying to load?
        var preset;

        if (preset_map[gui.preset]) {

          preset = preset_map[gui.preset];

        } else if (preset_map[DEFAULT_DEFAULT_PRESET_NAME]) {

          // Uhh, you can have the default instead?
          preset = preset_map[DEFAULT_DEFAULT_PRESET_NAME];

        } else {

          // Nada.

          return;

        }


        // Did the loaded object remember thcommon.isObject?
        if (preset[matched_index] &&

          // Did we remember this particular property?
            preset[matched_index][controller.property] !== undefined) {

          // We did remember something for this guy ...
          var value = preset[matched_index][controller.property];

          // And that's what it is.
          controller.initialValue = value;
          controller.setValue(value);

        }

      }

    }

  }

  function getLocalStorageHash(gui, key) {
    // TODO how does this deal with multiple GUI's?
    return document.location.href + '.' + key;

  }

  function addSaveMenu(gui) {

    var div = gui.__save_row = document.createElement('li');

    dom.addClass(gui.domElement, 'has-save');

    gui.__ul.insertBefore(div, gui.__ul.firstChild);

    dom.addClass(div, 'save-row');

    var gears = document.createElement('span');
    gears.innerHTML = '&nbsp;';
    dom.addClass(gears, 'button gears');

    // TODO replace with FunctionController
    var button = document.createElement('span');
    button.innerHTML = 'Save';
    dom.addClass(button, 'button');
    dom.addClass(button, 'save');

    var button2 = document.createElement('span');
    button2.innerHTML = 'New';
    dom.addClass(button2, 'button');
    dom.addClass(button2, 'save-as');

    var button3 = document.createElement('span');
    button3.innerHTML = 'Revert';
    dom.addClass(button3, 'button');
    dom.addClass(button3, 'revert');

    var select = gui.__preset_select = document.createElement('select');

    if (gui.load && gui.load.remembered) {

      common.each(gui.load.remembered, function(value, key) {
        addPresetOption(gui, key, key == gui.preset);
      });

    } else {
      addPresetOption(gui, DEFAULT_DEFAULT_PRESET_NAME, false);
    }

    dom.bind(select, 'change', function() {


      for (var index = 0; index < gui.__preset_select.length; index++) {
        gui.__preset_select[index].innerHTML = gui.__preset_select[index].value;
      }

      gui.preset = this.value;

    });

    div.appendChild(select);
    div.appendChild(gears);
    div.appendChild(button);
    div.appendChild(button2);
    div.appendChild(button3);

    if (SUPPORTS_LOCAL_STORAGE) {

      var saveLocally = document.getElementById('dg-save-locally');
      var explain = document.getElementById('dg-local-explain');

      saveLocally.style.display = 'block';

      var localStorageCheckBox = document.getElementById('dg-local-storage');

      if (localStorage.getItem(getLocalStorageHash(gui, 'isLocal')) === 'true') {
        localStorageCheckBox.setAttribute('checked', 'checked');
      }

      function showHideExplain() {
        explain.style.display = gui.useLocalStorage ? 'block' : 'none';
      }

      showHideExplain();

      // TODO: Use a boolean controller, fool!
      dom.bind(localStorageCheckBox, 'change', function() {
        gui.useLocalStorage = !gui.useLocalStorage;
        showHideExplain();
      });

    }

    var newConstructorTextArea = document.getElementById('dg-new-constructor');

    dom.bind(newConstructorTextArea, 'keydown', function(e) {
      if (e.metaKey && (e.which === 67 || e.keyCode == 67)) {
        SAVE_DIALOGUE.hide();
      }
    });

    dom.bind(gears, 'click', function() {
      newConstructorTextArea.innerHTML = JSON.stringify(gui.getSaveObject(), undefined, 2);
      SAVE_DIALOGUE.show();
      newConstructorTextArea.focus();
      newConstructorTextArea.select();
    });

    dom.bind(button, 'click', function() {
      gui.save();
    });

    dom.bind(button2, 'click', function() {
      var presetName = prompt('Enter a new preset name.');
      if (presetName) gui.saveAs(presetName);
    });

    dom.bind(button3, 'click', function() {
      gui.revert();
    });

//    div.appendChild(button2);

  }

  function addResizeHandle(gui) {

    gui.__resize_handle = document.createElement('div');

    common.extend(gui.__resize_handle.style, {

      width: '6px',
      marginLeft: '-3px',
      height: '200px',
      cursor: 'ew-resize',
      position: 'absolute'
//      border: '1px solid blue'

    });

    var pmouseX;

    dom.bind(gui.__resize_handle, 'mousedown', dragStart);
    dom.bind(gui.__closeButton, 'mousedown', dragStart);

    gui.domElement.insertBefore(gui.__resize_handle, gui.domElement.firstElementChild);

    function dragStart(e) {

      e.preventDefault();

      pmouseX = e.clientX;

      dom.addClass(gui.__closeButton, GUI.CLASS_DRAG);
      dom.bind(window, 'mousemove', drag);
      dom.bind(window, 'mouseup', dragStop);

      return false;

    }

    function drag(e) {

      e.preventDefault();

      gui.width += pmouseX - e.clientX;
      gui.onResize();
      pmouseX = e.clientX;

      return false;

    }

    function dragStop() {

      dom.removeClass(gui.__closeButton, GUI.CLASS_DRAG);
      dom.unbind(window, 'mousemove', drag);
      dom.unbind(window, 'mouseup', dragStop);

    }

  }

  function setWidth(gui, w) {
    gui.domElement.style.width = w + 'px';
    // Auto placed save-rows are position fixed, so we have to
    // set the width manually if we want it to bleed to the edge
    if (gui.__save_row && gui.autoPlace) {
      gui.__save_row.style.width = w + 'px';
    }if (gui.__closeButton) {
      gui.__closeButton.style.width = w + 'px';
    }
  }

  function getCurrentPreset(gui, useInitialValues) {

    var toReturn = {};

    // For each object I'm remembering
    common.each(gui.__rememberedObjects, function(val, index) {

      var saved_values = {};

      // The controllers I've made for thcommon.isObject by property
      var controller_map =
          gui.__rememberedObjectIndecesToControllers[index];

      // Remember each value for each property
      common.each(controller_map, function(controller, property) {
        saved_values[property] = useInitialValues ? controller.initialValue : controller.getValue();
      });

      // Save the values for thcommon.isObject
      toReturn[index] = saved_values;

    });

    return toReturn;

  }

  function addPresetOption(gui, name, setSelected) {
    var opt = document.createElement('option');
    opt.innerHTML = name;
    opt.value = name;
    gui.__preset_select.appendChild(opt);
    if (setSelected) {
      gui.__preset_select.selectedIndex = gui.__preset_select.length - 1;
    }
  }

  function setPresetSelectIndex(gui) {
    for (var index = 0; index < gui.__preset_select.length; index++) {
      if (gui.__preset_select[index].value == gui.preset) {
        gui.__preset_select.selectedIndex = index;
      }
    }
  }

  function markPresetModified(gui, modified) {
    var opt = gui.__preset_select[gui.__preset_select.selectedIndex];
//    console.log('mark', modified, opt);
    if (modified) {
      opt.innerHTML = opt.value + "*";
    } else {
      opt.innerHTML = opt.value;
    }
  }

  function updateDisplays(controllerArray) {


    if (controllerArray.length != 0) {

      requestAnimationFrame(function() {
        updateDisplays(controllerArray);
      });

    }

    common.each(controllerArray, function(c) {
      c.updateDisplay();
    });

  }

  return GUI;

})(dat.utils.css,
"<div id=\"dg-save\" class=\"dg dialogue\">\n\n  Here's the new load parameter for your <code>GUI</code>'s constructor:\n\n  <textarea id=\"dg-new-constructor\"></textarea>\n\n  <div id=\"dg-save-locally\">\n\n    <input id=\"dg-local-storage\" type=\"checkbox\"/> Automatically save\n    values to <code>localStorage</code> on exit.\n\n    <div id=\"dg-local-explain\">The values saved to <code>localStorage</code> will\n      override those passed to <code>dat.GUI</code>'s constructor. This makes it\n      easier to work incrementally, but <code>localStorage</code> is fragile,\n      and your friends may not see the same values you do.\n      \n    </div>\n    \n  </div>\n\n</div>",
".dg {\n  /** Clear list styles */\n  /* Auto-place container */\n  /* Auto-placed GUI's */\n  /* Line items that don't contain folders. */\n  /** Folder names */\n  /** Hides closed items */\n  /** Controller row */\n  /** Name-half (left) */\n  /** Controller-half (right) */\n  /** Controller placement */\n  /** Shorter number boxes when slider is present. */\n  /** Ensure the entire boolean and function row shows a hand */ }\n  .dg ul {\n    list-style: none;\n    margin: 0;\n    padding: 0;\n    width: 100%;\n    clear: both; }\n  .dg.ac {\n    position: fixed;\n    top: 0;\n    left: 0;\n    right: 0;\n    height: 0;\n    z-index: 0; }\n  .dg:not(.ac) .main {\n    /** Exclude mains in ac so that we don't hide close button */\n    overflow: hidden; }\n  .dg.main {\n    -webkit-transition: opacity 0.1s linear;\n    -o-transition: opacity 0.1s linear;\n    -moz-transition: opacity 0.1s linear;\n    transition: opacity 0.1s linear; }\n    .dg.main.taller-than-window {\n      overflow-y: auto; }\n      .dg.main.taller-than-window .close-button {\n        opacity: 1;\n        /* TODO, these are style notes */\n        margin-top: -1px;\n        border-top: 1px solid #2c2c2c; }\n    .dg.main ul.closed .close-button {\n      opacity: 1 !important; }\n    .dg.main:hover .close-button,\n    .dg.main .close-button.drag {\n      opacity: 1; }\n    .dg.main .close-button {\n      /*opacity: 0;*/\n      -webkit-transition: opacity 0.1s linear;\n      -o-transition: opacity 0.1s linear;\n      -moz-transition: opacity 0.1s linear;\n      transition: opacity 0.1s linear;\n      border: 0;\n      position: absolute;\n      line-height: 19px;\n      height: 20px;\n      /* TODO, these are style notes */\n      cursor: pointer;\n      text-align: center;\n      background-color: #000; }\n      .dg.main .close-button:hover {\n        background-color: #111; }\n  .dg.a {\n    float: right;\n    margin-right: 15px;\n    overflow-x: hidden; }\n    .dg.a.has-save > ul {\n      margin-top: 27px; }\n      .dg.a.has-save > ul.closed {\n        margin-top: 0; }\n    .dg.a .save-row {\n      position: fixed;\n      top: 0;\n      z-index: 1002; }\n  .dg li {\n    -webkit-transition: height 0.1s ease-out;\n    -o-transition: height 0.1s ease-out;\n    -moz-transition: height 0.1s ease-out;\n    transition: height 0.1s ease-out; }\n  .dg li:not(.folder) {\n    cursor: auto;\n    height: 27px;\n    line-height: 27px;\n    overflow: hidden;\n    padding: 0 4px 0 5px; }\n  .dg li.folder {\n    padding: 0;\n    border-left: 4px solid rgba(0, 0, 0, 0); }\n  .dg li.title {\n    cursor: pointer;\n    margin-left: -4px; }\n  .dg .closed li:not(.title),\n  .dg .closed ul li,\n  .dg .closed ul li > * {\n    height: 0;\n    overflow: hidden;\n    border: 0; }\n  .dg .cr {\n    clear: both;\n    padding-left: 3px;\n    height: 27px; }\n  .dg .property-name {\n    cursor: default;\n    float: left;\n    clear: left;\n    width: 40%;\n    overflow: hidden;\n    text-overflow: ellipsis; }\n  .dg .c {\n    float: left;\n    width: 60%; }\n  .dg .c input[type=text] {\n    border: 0;\n    margin-top: 4px;\n    padding: 3px;\n    width: 100%;\n    float: right; }\n  .dg .has-slider input[type=text] {\n    width: 30%;\n    /*display: none;*/\n    margin-left: 0; }\n  .dg .slider {\n    float: left;\n    width: 66%;\n    margin-left: -5px;\n    margin-right: 0;\n    height: 19px;\n    margin-top: 4px; }\n  .dg .slider-fg {\n    height: 100%; }\n  .dg .c input[type=checkbox] {\n    margin-top: 9px; }\n  .dg .c select {\n    margin-top: 5px; }\n  .dg .cr.function,\n  .dg .cr.function .property-name,\n  .dg .cr.function *,\n  .dg .cr.boolean,\n  .dg .cr.boolean * {\n    cursor: pointer; }\n  .dg .selector {\n    display: none;\n    position: absolute;\n    margin-left: -9px;\n    margin-top: 23px;\n    z-index: 10; }\n  .dg .c:hover .selector,\n  .dg .selector.drag {\n    display: block; }\n  .dg li.save-row {\n    padding: 0; }\n    .dg li.save-row .button {\n      display: inline-block;\n      padding: 0px 6px; }\n  .dg.dialogue {\n    background-color: #222;\n    width: 460px;\n    padding: 15px;\n    font-size: 13px;\n    line-height: 15px; }\n\n/* TODO Separate style and structure */\n#dg-new-constructor {\n  padding: 10px;\n  color: #222;\n  font-family: Monaco, monospace;\n  font-size: 10px;\n  border: 0;\n  resize: none;\n  box-shadow: inset 1px 1px 1px #888;\n  word-wrap: break-word;\n  margin: 12px 0;\n  display: block;\n  width: 440px;\n  overflow-y: scroll;\n  height: 100px;\n  position: relative; }\n\n#dg-local-explain {\n  display: none;\n  font-size: 11px;\n  line-height: 17px;\n  border-radius: 3px;\n  background-color: #333;\n  padding: 8px;\n  margin-top: 10px; }\n  #dg-local-explain code {\n    font-size: 10px; }\n\n#dat-gui-save-locally {\n  display: none; }\n\n/** Main type */\n.dg {\n  color: #eee;\n  font: 11px 'Lucida Grande', sans-serif;\n  text-shadow: 0 -1px 0 #111;\n  /** Auto place */\n  /* Controller row, <li> */\n  /** Controllers */ }\n  .dg.main {\n    /** Scrollbar */ }\n    .dg.main::-webkit-scrollbar {\n      width: 5px;\n      background: #1a1a1a; }\n    .dg.main::-webkit-scrollbar-corner {\n      height: 0;\n      display: none; }\n    .dg.main::-webkit-scrollbar-thumb {\n      border-radius: 5px;\n      background: #676767; }\n  .dg li:not(.folder) {\n    background: #1a1a1a;\n    border-bottom: 1px solid #2c2c2c; }\n  .dg li.save-row {\n    line-height: 25px;\n    background: #dad5cb;\n    border: 0; }\n    .dg li.save-row select {\n      margin-left: 5px;\n      width: 108px; }\n    .dg li.save-row .button {\n      margin-left: 5px;\n      margin-top: 1px;\n      border-radius: 2px;\n      font-size: 9px;\n      line-height: 7px;\n      padding: 4px 4px 5px 4px;\n      background: #c5bdad;\n      color: #fff;\n      text-shadow: 0 1px 0 #b0a58f;\n      box-shadow: 0 -1px 0 #b0a58f;\n      cursor: pointer; }\n      .dg li.save-row .button.gears {\n        background: #c5bdad url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAANCAYAAAB/9ZQ7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQJJREFUeNpiYKAU/P//PwGIC/ApCABiBSAW+I8AClAcgKxQ4T9hoMAEUrxx2QSGN6+egDX+/vWT4e7N82AMYoPAx/evwWoYoSYbACX2s7KxCxzcsezDh3evFoDEBYTEEqycggWAzA9AuUSQQgeYPa9fPv6/YWm/Acx5IPb7ty/fw+QZblw67vDs8R0YHyQhgObx+yAJkBqmG5dPPDh1aPOGR/eugW0G4vlIoTIfyFcA+QekhhHJhPdQxbiAIguMBTQZrPD7108M6roWYDFQiIAAv6Aow/1bFwXgis+f2LUAynwoIaNcz8XNx3Dl7MEJUDGQpx9gtQ8YCueB+D26OECAAQDadt7e46D42QAAAABJRU5ErkJggg==) 2px 1px no-repeat;\n        height: 7px;\n        width: 8px; }\n      .dg li.save-row .button:hover {\n        background-color: #bab19e;\n        box-shadow: 0 -1px 0 #b0a58f; }\n  .dg li.folder {\n    border-bottom: 0; }\n  .dg li.title {\n    padding-left: 16px;\n    background: black url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;\n    cursor: pointer;\n    border-bottom: 1px solid rgba(255, 255, 255, 0.2); }\n  .dg .closed li.title {\n    background-image: url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlGIWqMCbWAEAOw==); }\n  .dg .cr.boolean {\n    border-left: 3px solid #806787; }\n  .dg .cr.function {\n    border-left: 3px solid #e61d5f; }\n  .dg .cr.number {\n    border-left: 3px solid #2fa1d6; }\n    .dg .cr.number input[type=text] {\n      color: #2fa1d6; }\n  .dg .cr.string {\n    border-left: 3px solid #1ed36f; }\n    .dg .cr.string input[type=text] {\n      color: #1ed36f; }\n  .dg .cr.function:hover, .dg .cr.boolean:hover {\n    background: #111; }\n  .dg .c input[type=text] {\n    background: #303030;\n    outline: none; }\n    .dg .c input[type=text]:hover {\n      background: #3c3c3c; }\n    .dg .c input[type=text]:focus {\n      background: #494949;\n      color: #fff; }\n  .dg .c .slider {\n    background: #303030;\n    cursor: ew-resize; }\n  .dg .c .slider-fg {\n    background: #2fa1d6; }\n  .dg .c .slider:hover {\n    background: #3c3c3c; }\n    .dg .c .slider:hover .slider-fg {\n      background: #44abda; }\n",
dat.controllers.factory = (function (OptionController, NumberControllerBox, NumberControllerSlider, StringController, FunctionController, BooleanController, common) {

      return function(object, property) {

        var initialValue = object[property];

        // Providing options?
        if (common.isArray(arguments[2]) || common.isObject(arguments[2])) {
          return new OptionController(object, property, arguments[2]);
        }

        // Providing a map?

        if (common.isNumber(initialValue)) {

          if (common.isNumber(arguments[2]) && common.isNumber(arguments[3])) {

            // Has min and max.
            return new NumberControllerSlider(object, property, arguments[2], arguments[3]);

          } else {

            return new NumberControllerBox(object, property, { min: arguments[2], max: arguments[3] });

          }

        }

        if (common.isString(initialValue)) {
          return new StringController(object, property);
        }

        if (common.isFunction(initialValue)) {
          return new FunctionController(object, property, '');
        }

        if (common.isBoolean(initialValue)) {
          return new BooleanController(object, property);
        }

      }

    })(dat.controllers.OptionController,
dat.controllers.NumberControllerBox,
dat.controllers.NumberControllerSlider,
dat.controllers.StringController = (function (Controller, dom, common) {

  /**
   * @class Provides a text input to alter the string property of an object.
   *
   * @extends dat.controllers.Controller
   *
   * @param {Object} object The object to be manipulated
   * @param {string} property The name of the property to be manipulated
   *
   * @member dat.controllers
   */
  var StringController = function(object, property) {

    StringController.superclass.call(this, object, property);

    var _this = this;

    this.__input = document.createElement('input');
    this.__input.setAttribute('type', 'text');

    dom.bind(this.__input, 'keyup', onChange);
    dom.bind(this.__input, 'change', onChange);
    dom.bind(this.__input, 'blur', onBlur);
    dom.bind(this.__input, 'keydown', function(e) {
      if (e.keyCode === 13) {
        this.blur();
      }
    });
    

    function onChange() {
      _this.setValue(_this.__input.value);
    }

    function onBlur() {
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }

    this.updateDisplay();

    this.domElement.appendChild(this.__input);

  };

  StringController.superclass = Controller;

  common.extend(

      StringController.prototype,
      Controller.prototype,

      {

        updateDisplay: function() {
          // Stops the caret from moving on account of:
          // keyup -> setValue -> updateDisplay
          if (!dom.isActive(this.__input)) {
            this.__input.value = this.getValue();
          }
          return StringController.superclass.prototype.updateDisplay.call(this);
        }

      }

  );

  return StringController;

})(dat.controllers.Controller,
dat.dom.dom,
dat.utils.common),
dat.controllers.FunctionController,
dat.controllers.BooleanController,
dat.utils.common),
dat.controllers.Controller,
dat.controllers.BooleanController,
dat.controllers.FunctionController,
dat.controllers.NumberControllerBox,
dat.controllers.NumberControllerSlider,
dat.controllers.OptionController,
dat.controllers.ColorController = (function (Controller, dom, Color, interpret, common) {

  var ColorController = function(object, property) {

    ColorController.superclass.call(this, object, property);

    this.__color = new Color(this.getValue());
    this.__temp = new Color(0);

    var _this = this;

    this.domElement = document.createElement('div');

    dom.makeSelectable(this.domElement, false);

    this.__selector = document.createElement('div');
    this.__selector.className = 'selector';

    this.__saturation_field = document.createElement('div');
    this.__saturation_field.className = 'saturation-field';

    this.__field_knob = document.createElement('div');
    this.__field_knob.className = 'field-knob';
    this.__field_knob_border = '2px solid ';

    this.__hue_knob = document.createElement('div');
    this.__hue_knob.className = 'hue-knob';

    this.__hue_field = document.createElement('div');
    this.__hue_field.className = 'hue-field';

    this.__input = document.createElement('input');
    this.__input.type = 'text';
    this.__input_textShadow = '0 1px 1px ';

    dom.bind(this.__input, 'keydown', function(e) {
      if (e.keyCode === 13) { // on enter
        onBlur.call(this);
      }
    });

    dom.bind(this.__input, 'blur', onBlur);

    dom.bind(this.__selector, 'mousedown', function(e) {

      dom
        .addClass(this, 'drag')
        .bind(window, 'mouseup', function(e) {
          dom.removeClass(_this.__selector, 'drag');
        });

    });

    var value_field = document.createElement('div');

    common.extend(this.__selector.style, {
      width: '122px',
      height: '102px',
      padding: '3px',
      backgroundColor: '#222',
      boxShadow: '0px 1px 3px rgba(0,0,0,0.3)'
    });

    common.extend(this.__field_knob.style, {
      position: 'absolute',
      width: '12px',
      height: '12px',
      border: this.__field_knob_border + (this.__color.v < .5 ? '#fff' : '#000'),
      boxShadow: '0px 1px 3px rgba(0,0,0,0.5)',
      borderRadius: '12px',
      zIndex: 1
    });
    
    common.extend(this.__hue_knob.style, {
      position: 'absolute',
      width: '15px',
      height: '2px',
      borderRight: '4px solid #fff',
      zIndex: 1
    });

    common.extend(this.__saturation_field.style, {
      width: '100px',
      height: '100px',
      border: '1px solid #555',
      marginRight: '3px',
      display: 'inline-block',
      cursor: 'pointer'
    });

    common.extend(value_field.style, {
      width: '100%',
      height: '100%',
      background: 'none'
    });
    
    linearGradient(value_field, 'top', 'rgba(0,0,0,0)', '#000');

    common.extend(this.__hue_field.style, {
      width: '15px',
      height: '100px',
      display: 'inline-block',
      border: '1px solid #555',
      cursor: 'ns-resize'
    });

    hueGradient(this.__hue_field);

    common.extend(this.__input.style, {
      outline: 'none',
//      width: '120px',
      textAlign: 'center',
//      padding: '4px',
//      marginBottom: '6px',
      color: '#fff',
      border: 0,
      fontWeight: 'bold',
      textShadow: this.__input_textShadow + 'rgba(0,0,0,0.7)'
    });

    dom.bind(this.__saturation_field, 'mousedown', fieldDown);
    dom.bind(this.__field_knob, 'mousedown', fieldDown);

    dom.bind(this.__hue_field, 'mousedown', function(e) {
      setH(e);
      dom.bind(window, 'mousemove', setH);
      dom.bind(window, 'mouseup', unbindH);
    });

    function fieldDown(e) {
      setSV(e);
      // document.body.style.cursor = 'none';
      dom.bind(window, 'mousemove', setSV);
      dom.bind(window, 'mouseup', unbindSV);
    }

    function unbindSV() {
      dom.unbind(window, 'mousemove', setSV);
      dom.unbind(window, 'mouseup', unbindSV);
      // document.body.style.cursor = 'default';
    }

    function onBlur() {
      var i = interpret(this.value);
      if (i !== false) {
        _this.__color.__state = i;
        _this.setValue(_this.__color.toOriginal());
      } else {
        this.value = _this.__color.toString();
      }
    }

    function unbindH() {
      dom.unbind(window, 'mousemove', setH);
      dom.unbind(window, 'mouseup', unbindH);
    }

    this.__saturation_field.appendChild(value_field);
    this.__selector.appendChild(this.__field_knob);
    this.__selector.appendChild(this.__saturation_field);
    this.__selector.appendChild(this.__hue_field);
    this.__hue_field.appendChild(this.__hue_knob);

    this.domElement.appendChild(this.__input);
    this.domElement.appendChild(this.__selector);

    this.updateDisplay();

    function setSV(e) {

      e.preventDefault();

      var w = dom.getWidth(_this.__saturation_field);
      var o = dom.getOffset(_this.__saturation_field);
      var s = (e.clientX - o.left + document.body.scrollLeft) / w;
      var v = 1 - (e.clientY - o.top + document.body.scrollTop) / w;

      if (v > 1) v = 1;
      else if (v < 0) v = 0;

      if (s > 1) s = 1;
      else if (s < 0) s = 0;

      _this.__color.v = v;
      _this.__color.s = s;

      _this.setValue(_this.__color.toOriginal());


      return false;

    }

    function setH(e) {

      e.preventDefault();

      var s = dom.getHeight(_this.__hue_field);
      var o = dom.getOffset(_this.__hue_field);
      var h = 1 - (e.clientY - o.top + document.body.scrollTop) / s;

      if (h > 1) h = 1;
      else if (h < 0) h = 0;

      _this.__color.h = h * 360;

      _this.setValue(_this.__color.toOriginal());

      return false;

    }

  };

  ColorController.superclass = Controller;

  common.extend(

      ColorController.prototype,
      Controller.prototype,

      {

        updateDisplay: function() {

          var i = interpret(this.getValue());

          if (i !== false) {

            var mismatch = false;

            // Check for mismatch on the interpreted value.

            common.each(Color.COMPONENTS, function(component) {
              if (!common.isUndefined(i[component]) &&
                  !common.isUndefined(this.__color.__state[component]) &&
                  i[component] !== this.__color.__state[component]) {
                mismatch = true;
                return {}; // break
              }
            }, this);

            // If nothing diverges, we keep our previous values
            // for statefulness, otherwise we recalculate fresh
            if (mismatch) {
              common.extend(this.__color.__state, i);
            }

          }

          common.extend(this.__temp.__state, this.__color.__state);

          this.__temp.a = 1;

          var flip = (this.__color.v < .5 || this.__color.s > .5) ? 255 : 0;
          var _flip = 255 - flip;

          common.extend(this.__field_knob.style, {
            marginLeft: 100 * this.__color.s - 7 + 'px',
            marginTop: 100 * (1 - this.__color.v) - 7 + 'px',
            backgroundColor: this.__temp.toString(),
            border: this.__field_knob_border + 'rgb(' + flip + ',' + flip + ',' + flip +')'
          });

          this.__hue_knob.style.marginTop = (1 - this.__color.h / 360) * 100 + 'px'

          this.__temp.s = 1;
          this.__temp.v = 1;

          linearGradient(this.__saturation_field, 'left', '#fff', this.__temp.toString());

          common.extend(this.__input.style, {
            backgroundColor: this.__input.value = this.__color.toString(),
            color: 'rgb(' + flip + ',' + flip + ',' + flip +')',
            textShadow: this.__input_textShadow + 'rgba(' + _flip + ',' + _flip + ',' + _flip +',.7)'
          });

        }

      }

  );
  
  var vendors = ['-moz-','-o-','-webkit-','-ms-',''];
  
  function linearGradient(elem, x, a, b) {
    elem.style.background = '';
    common.each(vendors, function(vendor) {
      elem.style.cssText += 'background: ' + vendor + 'linear-gradient('+x+', '+a+' 0%, ' + b + ' 100%); ';
    });
  }
  
  function hueGradient(elem) {
    elem.style.background = '';
    elem.style.cssText += 'background: -moz-linear-gradient(top,  #ff0000 0%, #ff00ff 17%, #0000ff 34%, #00ffff 50%, #00ff00 67%, #ffff00 84%, #ff0000 100%);'
    elem.style.cssText += 'background: -webkit-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);'
    elem.style.cssText += 'background: -o-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);'
    elem.style.cssText += 'background: -ms-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);'
    elem.style.cssText += 'background: linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);'
  }


  return ColorController;

})(dat.controllers.Controller,
dat.dom.dom,
dat.color.Color = (function (interpret, math, toString, common) {

  var Color = function() {

    this.__state = interpret.apply(this, arguments);

    if (this.__state === false) {
      throw 'Failed to interpret color arguments';
    }

    this.__state.a = this.__state.a || 1;


  };

  Color.COMPONENTS = ['r','g','b','h','s','v','hex','a'];

  common.extend(Color.prototype, {

    toString: function() {
      return toString(this);
    },

    toOriginal: function() {
      return this.__state.conversion.write(this);
    }

  });

  defineRGBComponent(Color.prototype, 'r', 2);
  defineRGBComponent(Color.prototype, 'g', 1);
  defineRGBComponent(Color.prototype, 'b', 0);

  defineHSVComponent(Color.prototype, 'h');
  defineHSVComponent(Color.prototype, 's');
  defineHSVComponent(Color.prototype, 'v');

  Object.defineProperty(Color.prototype, 'a', {

    get: function() {
      return this.__state.a;
    },

    set: function(v) {
      this.__state.a = v;
    }

  });

  Object.defineProperty(Color.prototype, 'hex', {

    get: function() {

      if (!this.__state.space !== 'HEX') {
        this.__state.hex = math.rgb_to_hex(this.r, this.g, this.b);
      }

      return this.__state.hex;

    },

    set: function(v) {

      this.__state.space = 'HEX';
      this.__state.hex = v;

    }

  });

  function defineRGBComponent(target, component, componentHexIndex) {

    Object.defineProperty(target, component, {

      get: function() {

        if (this.__state.space === 'RGB') {
          return this.__state[component];
        }

        recalculateRGB(this, component, componentHexIndex);

        return this.__state[component];

      },

      set: function(v) {

        if (this.__state.space !== 'RGB') {
          recalculateRGB(this, component, componentHexIndex);
          this.__state.space = 'RGB';
        }

        this.__state[component] = v;

      }

    });

  }

  function defineHSVComponent(target, component) {

    Object.defineProperty(target, component, {

      get: function() {

        if (this.__state.space === 'HSV')
          return this.__state[component];

        recalculateHSV(this);

        return this.__state[component];

      },

      set: function(v) {

        if (this.__state.space !== 'HSV') {
          recalculateHSV(this);
          this.__state.space = 'HSV';
        }

        this.__state[component] = v;

      }

    });

  }

  function recalculateRGB(color, component, componentHexIndex) {

    if (color.__state.space === 'HEX') {

      color.__state[component] = math.component_from_hex(color.__state.hex, componentHexIndex);

    } else if (color.__state.space === 'HSV') {

      common.extend(color.__state, math.hsv_to_rgb(color.__state.h, color.__state.s, color.__state.v));

    } else {

      throw 'Corrupted color state';

    }

  }

  function recalculateHSV(color) {

    var result = math.rgb_to_hsv(color.r, color.g, color.b);

    common.extend(color.__state,
        {
          s: result.s,
          v: result.v
        }
    );

    if (!common.isNaN(result.h)) {
      color.__state.h = result.h;
    } else if (common.isUndefined(color.__state.h)) {
      color.__state.h = 0;
    }

  }

  return Color;

})(dat.color.interpret,
dat.color.math = (function () {

  var tmpComponent;

  return {

    hsv_to_rgb: function(h, s, v) {

      var hi = Math.floor(h / 60) % 6;

      var f = h / 60 - Math.floor(h / 60);
      var p = v * (1.0 - s);
      var q = v * (1.0 - (f * s));
      var t = v * (1.0 - ((1.0 - f) * s));
      var c = [
        [v, t, p],
        [q, v, p],
        [p, v, t],
        [p, q, v],
        [t, p, v],
        [v, p, q]
      ][hi];

      return {
        r: c[0] * 255,
        g: c[1] * 255,
        b: c[2] * 255
      };

    },

    rgb_to_hsv: function(r, g, b) {

      var min = Math.min(r, g, b),
          max = Math.max(r, g, b),
          delta = max - min,
          h, s;

      if (max != 0) {
        s = delta / max;
      } else {
        return {
          h: NaN,
          s: 0,
          v: 0
        };
      }

      if (r == max) {
        h = (g - b) / delta;
      } else if (g == max) {
        h = 2 + (b - r) / delta;
      } else {
        h = 4 + (r - g) / delta;
      }
      h /= 6;
      if (h < 0) {
        h += 1;
      }

      return {
        h: h * 360,
        s: s,
        v: max / 255
      };
    },

    rgb_to_hex: function(r, g, b) {
      var hex = this.hex_with_component(0, 2, r);
      hex = this.hex_with_component(hex, 1, g);
      hex = this.hex_with_component(hex, 0, b);
      return hex;
    },

    component_from_hex: function(hex, componentIndex) {
      return (hex >> (componentIndex * 8)) & 0xFF;
    },

    hex_with_component: function(hex, componentIndex, value) {
      return value << (tmpComponent = componentIndex * 8) | (hex & ~ (0xFF << tmpComponent));
    }

  }

})(),
dat.color.toString,
dat.utils.common),
dat.color.interpret,
dat.utils.common),
dat.utils.requestAnimationFrame = (function () {

  /**
   * requirejs version of Paul Irish's RequestAnimationFrame
   * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
   */

  return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function(callback, element) {

        window.setTimeout(callback, 1000 / 60);

      };
})(),
dat.dom.CenteredDiv = (function (dom, common) {


  var CenteredDiv = function() {

    this.backgroundElement = document.createElement('div');
    common.extend(this.backgroundElement.style, {
      backgroundColor: 'rgba(0,0,0,0.8)',
      top: 0,
      left: 0,
      display: 'none',
      zIndex: '1000',
      opacity: 0,
      WebkitTransition: 'opacity 0.2s linear',
      transition: 'opacity 0.2s linear'
    });

    dom.makeFullscreen(this.backgroundElement);
    this.backgroundElement.style.position = 'fixed';

    this.domElement = document.createElement('div');
    common.extend(this.domElement.style, {
      position: 'fixed',
      display: 'none',
      zIndex: '1001',
      opacity: 0,
      WebkitTransition: '-webkit-transform 0.2s ease-out, opacity 0.2s linear',
      transition: 'transform 0.2s ease-out, opacity 0.2s linear'
    });


    document.body.appendChild(this.backgroundElement);
    document.body.appendChild(this.domElement);

    var _this = this;
    dom.bind(this.backgroundElement, 'click', function() {
      _this.hide();
    });


  };

  CenteredDiv.prototype.show = function() {

    var _this = this;

    this.backgroundElement.style.display = 'block';

    this.domElement.style.display = 'block';
    this.domElement.style.opacity = 0;
//    this.domElement.style.top = '52%';
    this.domElement.style.webkitTransform = 'scale(1.1)';

    this.layout();

    common.defer(function() {
      _this.backgroundElement.style.opacity = 1;
      _this.domElement.style.opacity = 1;
      _this.domElement.style.webkitTransform = 'scale(1)';
    });

  };

  CenteredDiv.prototype.hide = function() {

    var _this = this;

    var hide = function() {

      _this.domElement.style.display = 'none';
      _this.backgroundElement.style.display = 'none';

      dom.unbind(_this.domElement, 'webkitTransitionEnd', hide);
      dom.unbind(_this.domElement, 'transitionend', hide);
      dom.unbind(_this.domElement, 'oTransitionEnd', hide);

    };

    dom.bind(this.domElement, 'webkitTransitionEnd', hide);
    dom.bind(this.domElement, 'transitionend', hide);
    dom.bind(this.domElement, 'oTransitionEnd', hide);

    this.backgroundElement.style.opacity = 0;
//    this.domElement.style.top = '48%';
    this.domElement.style.opacity = 0;
    this.domElement.style.webkitTransform = 'scale(1.1)';

  };

  CenteredDiv.prototype.layout = function() {
    this.domElement.style.left = window.innerWidth/2 - dom.getWidth(this.domElement) / 2 + 'px';
    this.domElement.style.top = window.innerHeight/2 - dom.getHeight(this.domElement) / 2 + 'px';
  };
  
  function lockScroll(e) {
    console.log(e);
  }

  return CenteredDiv;

})(dat.dom.dom,
dat.utils.common),
dat.dom.dom,
dat.utils.common);

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

const THREE = __webpack_require__(0);

/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Depth-of-field shader with bokeh
 * ported from GLSL shader by Martins Upitis
 * http://artmartinsh.blogspot.com/2010/02/glsl-lens-blur-filter-with-bokeh.html
 */

THREE.BokehShader = {

    uniforms: {

        "tColor":   { value: null },
        "tDepth":   { value: null },
        "focus":    { value: 1.0 },
        "aspect":   { value: 1.0 },
        "aperture": { value: 0.025 },
        "maxblur":  { value: 1.0 }

    },

    vertexShader: [

        "varying vec2 vUv;",

        "void main() {",

            "vUv = uv;",
            "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

        "}"

    ].join( "\n" ),

    fragmentShader: [

        "varying vec2 vUv;",

        "uniform sampler2D tColor;",
        "uniform sampler2D tDepth;",

        "uniform float maxblur;",  // max blur amount
        "uniform float aperture;", // aperture - bigger values for shallower depth of field

        "uniform float focus;",
        "uniform float aspect;",

        "void main() {",

            "vec2 aspectcorrect = vec2( 1.0, aspect );",

            "vec4 depth1 = texture2D( tDepth, vUv );",

            "float factor = depth1.x - focus;",

            "vec2 dofblur = vec2 ( clamp( factor * aperture, -maxblur, maxblur ) );",

            "vec2 dofblur9 = dofblur * 0.9;",
            "vec2 dofblur7 = dofblur * 0.7;",
            "vec2 dofblur4 = dofblur * 0.4;",

            "vec4 col = vec4( 0.0 );",

            "col += texture2D( tColor, vUv.xy );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur );",
            "col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur );",
            "col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur );",
            "col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur );",
            "col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur );",
            "col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur );",
            "col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur );",
            "col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur );",

            "col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur9 );",
            "col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur9 );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur9 );",
            "col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur9 );",
            "col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur9 );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur9 );",
            "col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur9 );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur9 );",

            "col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur7 );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur7 );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur7 );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur7 );",
            "col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur7 );",
            "col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur7 );",
            "col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur7 );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur7 );",

            "col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur4 );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.4,   0.0  ) * aspectcorrect ) * dofblur4 );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur4 );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur4 );",
            "col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur4 );",
            "col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur4 );",
            "col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur4 );",
            "col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur4 );",

            "gl_FragColor = col / 41.0;",
            "gl_FragColor.a = 1.0;",

        "}"

    ].join( "\n" )

};

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

const THREE = __webpack_require__(0);

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.EffectComposer = function ( renderer, renderTarget ) {

	this.renderer = renderer;

	if ( renderTarget === undefined ) {

		var parameters = {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			stencilBuffer: false
		};
		var size = renderer.getSize();
		renderTarget = new THREE.WebGLRenderTarget( size.width, size.height, parameters );

	}

	this.renderTarget1 = renderTarget;
	this.renderTarget2 = renderTarget.clone();

	this.writeBuffer = this.renderTarget1;
	this.readBuffer = this.renderTarget2;

	this.passes = [];

	if ( THREE.CopyShader === undefined )
		console.error( "THREE.EffectComposer relies on THREE.CopyShader" );

	this.copyPass = new THREE.ShaderPass( THREE.CopyShader );

};

Object.assign( THREE.EffectComposer.prototype, {

	swapBuffers: function() {

		var tmp = this.readBuffer;
		this.readBuffer = this.writeBuffer;
		this.writeBuffer = tmp;

	},

	addPass: function ( pass ) {

		this.passes.push( pass );

		var size = this.renderer.getSize();
		pass.setSize( size.width, size.height );

	},

	insertPass: function ( pass, index ) {

		this.passes.splice( index, 0, pass );

	},

	render: function ( delta ) {

		var maskActive = false;

		var pass, i, il = this.passes.length;

		for ( i = 0; i < il; i ++ ) {

			pass = this.passes[ i ];

			if ( pass.enabled === false ) continue;

			pass.render( this.renderer, this.writeBuffer, this.readBuffer, delta, maskActive );

			if ( pass.needsSwap ) {

				if ( maskActive ) {

					var context = this.renderer.context;

					context.stencilFunc( context.NOTEQUAL, 1, 0xffffffff );

					this.copyPass.render( this.renderer, this.writeBuffer, this.readBuffer, delta );

					context.stencilFunc( context.EQUAL, 1, 0xffffffff );

				}

				this.swapBuffers();

			}

			if ( THREE.MaskPass !== undefined ) {

				if ( pass instanceof THREE.MaskPass ) {

					maskActive = true;

				} else if ( pass instanceof THREE.ClearMaskPass ) {

					maskActive = false;

				}

			}

		}

	},

	reset: function ( renderTarget ) {

		if ( renderTarget === undefined ) {

			var size = this.renderer.getSize();

			renderTarget = this.renderTarget1.clone();
			renderTarget.setSize( size.width, size.height );

		}

		this.renderTarget1.dispose();
		this.renderTarget2.dispose();
		this.renderTarget1 = renderTarget;
		this.renderTarget2 = renderTarget.clone();

		this.writeBuffer = this.renderTarget1;
		this.readBuffer = this.renderTarget2;

	},

	setSize: function ( width, height ) {

		this.renderTarget1.setSize( width, height );
		this.renderTarget2.setSize( width, height );

		for ( var i = 0; i < this.passes.length; i ++ ) {

			this.passes[i].setSize( width, height );

		}

	}

} );


THREE.Pass = function () {

	// if set to true, the pass is processed by the composer
	this.enabled = true;

	// if set to true, the pass indicates to swap read and write buffer after rendering
	this.needsSwap = true;

	// if set to true, the pass clears its buffer before rendering
	this.clear = false;

	// if set to true, the result of the pass is rendered to screen
	this.renderToScreen = false;

};

Object.assign( THREE.Pass.prototype, {

	setSize: function( width, height ) {},

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		console.error( "THREE.Pass: .render() must be implemented in derived pass." );

	}

} );


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

const THREE = __webpack_require__(0);

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.MaskPass = function ( scene, camera ) {

	THREE.Pass.call( this );

	this.scene = scene;
	this.camera = camera;

	this.clear = true;
	this.needsSwap = false;

	this.inverse = false;

};

THREE.MaskPass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: THREE.MaskPass,

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		var context = renderer.context;
		var state = renderer.state;

		// don't update color or depth

		state.buffers.color.setMask( false );
		state.buffers.depth.setMask( false );

		// lock buffers

		state.buffers.color.setLocked( true );
		state.buffers.depth.setLocked( true );

		// set up stencil

		var writeValue, clearValue;

		if ( this.inverse ) {

			writeValue = 0;
			clearValue = 1;

		} else {

			writeValue = 1;
			clearValue = 0;

		}

		state.buffers.stencil.setTest( true );
		state.buffers.stencil.setOp( context.REPLACE, context.REPLACE, context.REPLACE );
		state.buffers.stencil.setFunc( context.ALWAYS, writeValue, 0xffffffff );
		state.buffers.stencil.setClear( clearValue );

		// draw into the stencil buffer

		renderer.render( this.scene, this.camera, readBuffer, this.clear );
		renderer.render( this.scene, this.camera, writeBuffer, this.clear );

		// unlock color and depth buffer for subsequent rendering

		state.buffers.color.setLocked( false );
		state.buffers.depth.setLocked( false );

		// only render where stencil is set to 1

		state.buffers.stencil.setFunc( context.EQUAL, 1, 0xffffffff );  // draw if == 1
		state.buffers.stencil.setOp( context.KEEP, context.KEEP, context.KEEP );

	}

} );


THREE.ClearMaskPass = function () {

	THREE.Pass.call( this );

	this.needsSwap = false;

};

THREE.ClearMaskPass.prototype = Object.create( THREE.Pass.prototype );

Object.assign( THREE.ClearMaskPass.prototype, {

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		renderer.state.buffers.stencil.setTest( false );

	}

} );


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

const THREE = __webpack_require__(0);

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.RenderPass = function ( scene, camera, overrideMaterial, clearColor, clearAlpha ) {

	THREE.Pass.call( this );

	this.scene = scene;
	this.camera = camera;

	this.overrideMaterial = overrideMaterial;

	this.clearColor = clearColor;
	this.clearAlpha = ( clearAlpha !== undefined ) ? clearAlpha : 0;

	this.clear = true;
	this.needsSwap = false;

};

THREE.RenderPass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: THREE.RenderPass,

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		this.scene.overrideMaterial = this.overrideMaterial;

		var oldClearColor, oldClearAlpha;

		if ( this.clearColor ) {

			oldClearColor = renderer.getClearColor().getHex();
			oldClearAlpha = renderer.getClearAlpha();

			renderer.setClearColor( this.clearColor, this.clearAlpha );

		}

		renderer.render( this.scene, this.camera, this.renderToScreen ? null : readBuffer, this.clear );

		if ( this.clearColor ) {

			renderer.setClearColor( oldClearColor, oldClearAlpha );

		}

		this.scene.overrideMaterial = null;

	}

} );


/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

const THREE = __webpack_require__(0);

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.SavePass = function ( renderTarget ) {

	THREE.Pass.call( this );

	if ( THREE.CopyShader === undefined )
		console.error( "THREE.SavePass relies on THREE.CopyShader" );

	var shader = THREE.CopyShader;

	this.textureID = "tDiffuse";

	this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

	this.material = new THREE.ShaderMaterial( {

		uniforms: this.uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader

	} );

	this.renderTarget = renderTarget;

	if ( this.renderTarget === undefined ) {

		this.renderTargetParameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, stencilBuffer: false };
		this.renderTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, this.renderTargetParameters );

	}

	this.needsSwap = false;

	this.camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	this.scene  = new THREE.Scene();

	this.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );
	this.scene.add( this.quad );

};

THREE.SavePass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: THREE.SavePass,

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		if ( this.uniforms[ this.textureID ] ) {

			this.uniforms[ this.textureID ].value = readBuffer.texture;

		}

		this.quad.material = this.material;

		renderer.render( this.scene, this.camera, this.renderTarget, this.clear );

	}

} );


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

const THREE = __webpack_require__(0);

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.ShaderPass = function ( shader, textureID ) {

	THREE.Pass.call( this );

	this.textureID = ( textureID !== undefined ) ? textureID : "tDiffuse";

	if ( shader instanceof THREE.ShaderMaterial ) {

		this.uniforms = shader.uniforms;

		this.material = shader;

	} else if ( shader ) {

		this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

		this.material = new THREE.ShaderMaterial( {

			defines: shader.defines || {},
			uniforms: this.uniforms,
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader

		} );

	}

	this.camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	this.scene = new THREE.Scene();

	this.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );
	this.scene.add( this.quad );

};

THREE.ShaderPass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: THREE.ShaderPass,

	render: function( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		if ( this.uniforms[ this.textureID ] ) {

			this.uniforms[ this.textureID ].value = readBuffer.texture;

		}

		this.quad.material = this.material;

		if ( this.renderToScreen ) {

			renderer.render( this.scene, this.camera );

		} else {

			renderer.render( this.scene, this.camera, writeBuffer, this.clear );

		}

	}

} );


/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

const THREE = __webpack_require__(0);

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.TexturePass = function ( texture, opacity ) {

	THREE.Pass.call( this );

	if ( THREE.CopyShader === undefined )
		console.error( "THREE.TexturePass relies on THREE.CopyShader" );

	var shader = THREE.CopyShader;

	this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

	this.uniforms[ "opacity" ].value = ( opacity !== undefined ) ? opacity : 1.0;
	this.uniforms[ "tDiffuse" ].value = texture;

	this.material = new THREE.ShaderMaterial( {

		uniforms: this.uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader

	} );

	this.needsSwap = false;

	this.camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	this.scene  = new THREE.Scene();

	this.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );
	this.scene.add( this.quad );

};

THREE.TexturePass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: THREE.TexturePass,

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		this.quad.material = this.material;

		renderer.render( this.scene, this.camera, readBuffer, this.clear );

	}

} );


/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

const THREE = __webpack_require__(0);

/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Blend two textures
 */

THREE.BlendShader = {

	uniforms: {

		"tDiffuse1": { value: null },
		"tDiffuse2": { value: null },
		"mixRatio":  { value: 0.5 },
		"opacity":   { value: 1.0 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform float opacity;",
		"uniform float mixRatio;",

		"uniform sampler2D tDiffuse1;",
		"uniform sampler2D tDiffuse2;",

		"varying vec2 vUv;",

		"void main() {",

			"vec4 texel1 = texture2D( tDiffuse1, vUv );",
			"vec4 texel2 = texture2D( tDiffuse2, vUv );",
			"gl_FragColor = opacity * mix( texel1, texel2, mixRatio );",

		"}"

	].join( "\n" )

};


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

const THREE = __webpack_require__(0);

/**
 * Depth-of-field post-process with bokeh shader
 */


THREE.BokehPass = function ( scene, camera, params ) {

    THREE.Pass.call( this );

    this.scene = scene;
    this.camera = camera;

    var focus = ( params.focus !== undefined ) ? params.focus : 1.0;
    var aspect = ( params.aspect !== undefined ) ? params.aspect : camera.aspect;
    var aperture = ( params.aperture !== undefined ) ? params.aperture : 0.025;
    var maxblur = ( params.maxblur !== undefined ) ? params.maxblur : 1.0;

    // render targets

    var width = params.width || window.innerWidth || 1;
    var height = params.height || window.innerHeight || 1;

    this.renderTargetColor = new THREE.WebGLRenderTarget( width, height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBFormat
    } );

    this.renderTargetDepth = this.renderTargetColor.clone();

    // depth material

    this.materialDepth = new THREE.MeshDepthMaterial();

    // bokeh material

    if ( THREE.BokehShader === undefined ) {

        console.error( "THREE.BokehPass relies on THREE.BokehShader" );

    }

    var bokehShader = THREE.BokehShader;
    var bokehUniforms = THREE.UniformsUtils.clone( bokehShader.uniforms );

    bokehUniforms[ "tDepth" ].value = this.renderTargetDepth.texture;

    bokehUniforms[ "focus" ].value = focus;
    bokehUniforms[ "aspect" ].value = aspect;
    bokehUniforms[ "aperture" ].value = aperture;
    bokehUniforms[ "maxblur" ].value = maxblur;

    this.materialBokeh = new THREE.ShaderMaterial( {
        uniforms: bokehUniforms,
        vertexShader: bokehShader.vertexShader,
        fragmentShader: bokehShader.fragmentShader
    } );

    this.uniforms = bokehUniforms;
    this.needsSwap = false;

    this.camera2 = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
    this.scene2  = new THREE.Scene();

    this.quad2 = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );
    this.quad2.frustumCulled = false; // Avoid getting clipped
    this.scene2.add( this.quad2 );

};

THREE.BokehPass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

    constructor: THREE.BokehPass,

    render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

        this.quad2.material = this.materialBokeh;

        // Render depth into texture

        this.scene.overrideMaterial = this.materialDepth;

        renderer.render( this.scene, this.camera, this.renderTargetDepth, true );

        // Render bokeh composite

        this.uniforms[ "tColor" ].value = readBuffer.texture;

        if ( this.renderToScreen ) {

            renderer.render( this.scene2, this.camera2 );

        } else {

            renderer.render( this.scene2, this.camera2, writeBuffer, this.clear );

        }

        this.scene.overrideMaterial = null;

    }

} );

/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

const THREE = __webpack_require__(0);

/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Full-screen textured quad shader
 */

THREE.CopyShader = {

    uniforms: {

        "tDiffuse": { value: null },
        "opacity":  { value: 1.0 }

    },

    vertexShader: [

        "varying vec2 vUv;",

        "void main() {",

            "vUv = uv;",
            "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

        "}"

    ].join( "\n" ),

    fragmentShader: [

        "uniform float opacity;",

        "uniform sampler2D tDiffuse;",

        "varying vec2 vUv;",

        "void main() {",

            "vec4 texel = texture2D( tDiffuse, vUv );",
            "gl_FragColor = opacity * texel;",

        "}"

    ].join( "\n" )

};


/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

const THREE = __webpack_require__(0);

/**
 * @author alteredq / http://alteredqualia.com/
 * @author davidedc / http://www.sketchpatch.net/
 *
 * NVIDIA FXAA by Timothy Lottes
 * http://timothylottes.blogspot.com/2011/06/fxaa3-source-released.html
 * - WebGL port by @supereggbert
 * http://www.glge.org/demos/fxaa/
 */

THREE.FXAAShader = {

	uniforms: {

		"tDiffuse":   { value: null },
		"resolution": { value: new THREE.Vector2( 1 / 1024, 1 / 512 ) }

	},

	vertexShader: [

		"void main() {",

			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform sampler2D tDiffuse;",
		"uniform vec2 resolution;",

		"#define FXAA_REDUCE_MIN   (1.0/128.0)",
		"#define FXAA_REDUCE_MUL   (1.0/8.0)",
		"#define FXAA_SPAN_MAX     8.0",

		"void main() {",

			"vec3 rgbNW = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( -1.0, -1.0 ) ) * resolution ).xyz;",
			"vec3 rgbNE = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( 1.0, -1.0 ) ) * resolution ).xyz;",
			"vec3 rgbSW = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( -1.0, 1.0 ) ) * resolution ).xyz;",
			"vec3 rgbSE = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( 1.0, 1.0 ) ) * resolution ).xyz;",
			"vec4 rgbaM  = texture2D( tDiffuse,  gl_FragCoord.xy  * resolution );",
			"vec3 rgbM  = rgbaM.xyz;",
			"vec3 luma = vec3( 0.299, 0.587, 0.114 );",

			"float lumaNW = dot( rgbNW, luma );",
			"float lumaNE = dot( rgbNE, luma );",
			"float lumaSW = dot( rgbSW, luma );",
			"float lumaSE = dot( rgbSE, luma );",
			"float lumaM  = dot( rgbM,  luma );",
			"float lumaMin = min( lumaM, min( min( lumaNW, lumaNE ), min( lumaSW, lumaSE ) ) );",
			"float lumaMax = max( lumaM, max( max( lumaNW, lumaNE) , max( lumaSW, lumaSE ) ) );",

			"vec2 dir;",
			"dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));",
			"dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));",

			"float dirReduce = max( ( lumaNW + lumaNE + lumaSW + lumaSE ) * ( 0.25 * FXAA_REDUCE_MUL ), FXAA_REDUCE_MIN );",

			"float rcpDirMin = 1.0 / ( min( abs( dir.x ), abs( dir.y ) ) + dirReduce );",
			"dir = min( vec2( FXAA_SPAN_MAX,  FXAA_SPAN_MAX),",
				  "max( vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),",
						"dir * rcpDirMin)) * resolution;",
			"vec4 rgbA = (1.0/2.0) * (",
        	"texture2D(tDiffuse,  gl_FragCoord.xy  * resolution + dir * (1.0/3.0 - 0.5)) +",
			"texture2D(tDiffuse,  gl_FragCoord.xy  * resolution + dir * (2.0/3.0 - 0.5)));",
    		"vec4 rgbB = rgbA * (1.0/2.0) + (1.0/4.0) * (",
			"texture2D(tDiffuse,  gl_FragCoord.xy  * resolution + dir * (0.0/3.0 - 0.5)) +",
      		"texture2D(tDiffuse,  gl_FragCoord.xy  * resolution + dir * (3.0/3.0 - 0.5)));",
    		"float lumaB = dot(rgbB, vec4(luma, 0.0));",

			"if ( ( lumaB < lumaMin ) || ( lumaB > lumaMax ) ) {",

				"gl_FragColor = rgbA;",

			"} else {",
				"gl_FragColor = rgbB;",

			"}",

		"}"

	].join( "\n" )

};


/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

const THREE = __webpack_require__(0);

/**
 * @author zz85 / http://www.lab4games.net/zz85/blog
 *
 * Two pass Gaussian blur filter (horizontal and vertical blur shaders)
 * - described in http://www.gamerendering.com/2008/10/11/gaussian-blur-filter-shader/
 *   and used in http://www.cake23.de/traveling-wavefronts-lit-up.html
 *
 * - 9 samples per pass
 * - standard deviation 2.7
 * - "h" and "v" parameters should be set to "1 / width" and "1 / height"
 */

THREE.HorizontalBlurShader = {

	uniforms: {

		"tDiffuse": { value: null },
		"h":        { value: 1.0 / 512.0 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform sampler2D tDiffuse;",
		"uniform float h;",

		"varying vec2 vUv;",

		"void main() {",

			"vec4 sum = vec4( 0.0 );",

			"sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051;",
			"sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;",
			"sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245;",
			"sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;",
			"sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531;",
			"sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245;",
			"sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918;",
			"sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051;",

			"gl_FragColor = sum;",

		"}"

	].join( "\n" )

};


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

const THREE = __webpack_require__(0);

/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Screen-space ambient occlusion shader
 * - ported from
 *   SSAO GLSL shader v1.2
 *   assembled by Martins Upitis (martinsh) (http://devlog-martinsh.blogspot.com)
 *   original technique is made by ArKano22 (http://www.gamedev.net/topic/550699-ssao-no-halo-artifacts/)
 * - modifications
 * - modified to use RGBA packed depth texture (use clear color 1,1,1,1 for depth pass)
 * - refactoring and optimizations
 */

THREE.SSAOShader = {

    uniforms: {

        "tDiffuse":     { value: null },
        "tDepth":       { value: null },
        "size":         { value: new THREE.Vector2( 512, 512 ) },
        "cameraNear":   { value: 1 },
        "cameraFar":    { value: 100 },
        "onlyAO":       { value: 0 },
        "aoClamp":      { value: 0.5 },
        "lumInfluence": { value: 0.5 }

    },

    vertexShader: [

        "varying vec2 vUv;",

        "void main() {",

            "vUv = uv;",

            "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

        "}"

    ].join( "\n" ),

    fragmentShader: [

        "uniform float cameraNear;",
        "uniform float cameraFar;",
        "#ifdef USE_LOGDEPTHBUF",
            "uniform float logDepthBufFC;",
        "#endif",

        "uniform bool onlyAO;",      // use only ambient occlusion pass?

        "uniform vec2 size;",        // texture width, height
        "uniform float aoClamp;",    // depth clamp - reduces haloing at screen edges

        "uniform float lumInfluence;",  // how much luminance affects occlusion

        "uniform sampler2D tDiffuse;",
        "uniform sampler2D tDepth;",

        "varying vec2 vUv;",

        // "#define PI 3.14159265",
        "#define DL 2.399963229728653",  // PI * ( 3.0 - sqrt( 5.0 ) )
        "#define EULER 2.718281828459045",

        // user variables

        "const int samples = 8;",     // ao sample count
        "const float radius = 5.0;",  // ao radius

        "const bool useNoise = false;",      // use noise instead of pattern for sample dithering
        "const float noiseAmount = 0.0003;", // dithering amount

        "const float diffArea = 0.4;",   // self-shadowing reduction
        "const float gDisplace = 0.4;",  // gauss bell center


        // RGBA depth

        "#include <packing>",

        // generating noise / pattern texture for dithering

        "vec2 rand( const vec2 coord ) {",

            "vec2 noise;",

            "if ( useNoise ) {",

                "float nx = dot ( coord, vec2( 12.9898, 78.233 ) );",
                "float ny = dot ( coord, vec2( 12.9898, 78.233 ) * 2.0 );",

                "noise = clamp( fract ( 43758.5453 * sin( vec2( nx, ny ) ) ), 0.0, 1.0 );",

            "} else {",

                "float ff = fract( 1.0 - coord.s * ( size.x / 2.0 ) );",
                "float gg = fract( coord.t * ( size.y / 2.0 ) );",

                "noise = vec2( 0.25, 0.75 ) * vec2( ff ) + vec2( 0.75, 0.25 ) * gg;",

            "}",

            "return ( noise * 2.0  - 1.0 ) * noiseAmount;",

        "}",

        "float readDepth( const in vec2 coord ) {",

            "float cameraFarPlusNear = cameraFar + cameraNear;",
            "float cameraFarMinusNear = cameraFar - cameraNear;",
            "float cameraCoef = 2.0 * cameraNear;",

            "#ifdef USE_LOGDEPTHBUF",

                "float logz = unpackRGBAToDepth( texture2D( tDepth, coord ) );",
                "float w = pow(2.0, (logz / logDepthBufFC)) - 1.0;",
                "float z = (logz / w) + 1.0;",

            "#else",

                "float z = unpackRGBAToDepth( texture2D( tDepth, coord ) );",

            "#endif",

            "return cameraCoef / ( cameraFarPlusNear - z * cameraFarMinusNear );",


        "}",

        "float compareDepths( const in float depth1, const in float depth2, inout int far ) {",

            "float garea = 2.0;",                         // gauss bell width
            "float diff = ( depth1 - depth2 ) * 100.0;",  // depth difference (0-100)

            // reduce left bell width to avoid self-shadowing

            "if ( diff < gDisplace ) {",

                "garea = diffArea;",

            "} else {",

                "far = 1;",

            "}",

            "float dd = diff - gDisplace;",
            "float gauss = pow( EULER, -2.0 * dd * dd / ( garea * garea ) );",
            "return gauss;",

        "}",

        "float calcAO( float depth, float dw, float dh ) {",

            "float dd = radius - depth * radius;",
            "vec2 vv = vec2( dw, dh );",

            "vec2 coord1 = vUv + dd * vv;",
            "vec2 coord2 = vUv - dd * vv;",

            "float temp1 = 0.0;",
            "float temp2 = 0.0;",

            "int far = 0;",
            "temp1 = compareDepths( depth, readDepth( coord1 ), far );",

            // DEPTH EXTRAPOLATION

            "if ( far > 0 ) {",

                "temp2 = compareDepths( readDepth( coord2 ), depth, far );",
                "temp1 += ( 1.0 - temp1 ) * temp2;",

            "}",

            "return temp1;",

        "}",

        "void main() {",

            "vec2 noise = rand( vUv );",
            "float depth = readDepth( vUv );",

            "float tt = clamp( depth, aoClamp, 1.0 );",

            "float w = ( 1.0 / size.x )  / tt + ( noise.x * ( 1.0 - noise.x ) );",
            "float h = ( 1.0 / size.y ) / tt + ( noise.y * ( 1.0 - noise.y ) );",

            "float ao = 0.0;",

            "float dz = 1.0 / float( samples );",
            "float z = 1.0 - dz / 2.0;",
            "float l = 0.0;",

            "for ( int i = 0; i <= samples; i ++ ) {",

                "float r = sqrt( 1.0 - z );",

                "float pw = cos( l ) * r;",
                "float ph = sin( l ) * r;",
                "ao += calcAO( depth, pw * w, ph * h );",
                "z = z - dz;",
                "l = l + DL;",

            "}",

            "ao /= float( samples );",
            "ao = 1.0 - ao;",

            "vec3 color = texture2D( tDiffuse, vUv ).rgb;",

            "vec3 lumcoeff = vec3( 0.299, 0.587, 0.114 );",
            "float lum = dot( color.rgb, lumcoeff );",
            "vec3 luminance = vec3( lum );",

            "vec3 final = vec3( color * mix( vec3( ao ), vec3( 1.0 ), luminance * lumInfluence ) );",  // mix( color * ao, white, luminance )

            "if ( onlyAO ) {",

                "final = vec3( mix( vec3( ao ), vec3( 1.0 ), luminance * lumInfluence ) );",  // ambient occlusion only

            "}",

            "gl_FragColor = vec4( final, 1.0 );",

        "}"

    ].join( "\n" )

};

/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

const THREE = __webpack_require__(0);

/**
 * @author zz85 / http://www.lab4games.net/zz85/blog
 *
 * Two pass Gaussian blur filter (horizontal and vertical blur shaders)
 * - described in http://www.gamerendering.com/2008/10/11/gaussian-blur-filter-shader/
 *   and used in http://www.cake23.de/traveling-wavefronts-lit-up.html
 *
 * - 9 samples per pass
 * - standard deviation 2.7
 * - "h" and "v" parameters should be set to "1 / width" and "1 / height"
 */

THREE.VerticalBlurShader = {

	uniforms: {

		"tDiffuse": { value: null },
		"v":        { value: 1.0 / 512.0 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform sampler2D tDiffuse;",
		"uniform float v;",

		"varying vec2 vUv;",

		"void main() {",

			"vec4 sum = vec4( 0.0 );",

			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;",
			"sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;",

			"gl_FragColor = sum;",

		"}"

	].join( "\n" )

};


/***/ }),
/* 26 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = packToTexture;
function packToTexture (faces, frames) {

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


/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(4);


/***/ })
],[27]);
//# sourceMappingURL=main.js.map?f1cec3cba18480c3809f-main