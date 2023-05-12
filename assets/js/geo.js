/*
    author: Michael Ly
    date: 4/22/2022
    tutorial by Irradiance
*/

//imports
import { WebGLRenderer, ACESFilmicToneMapping, sRGBEncoding, Color, CylinderGeometry, RepeatWrapping, FloatType, 
    DoubleSide, BoxGeometry, Mesh, PointLight, MeshPhysicalMaterial, PerspectiveCamera, Scene, PMREMGenerator, 
    PCFSoftShadowMap, Vector2, TextureLoader, SphereGeometry, MeshStandardMaterial } from 'https://cdn.skypack.dev/three@0.137';
import { OrbitControls } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/controls/OrbitControls';
import { RGBELoader } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/loaders/RGBELoader';
import { mergeBufferGeometries } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/utils/BufferGeometryUtils';
    import { createNoise2D } from 'https://cdn.skypack.dev/simplex-noise';

//scene
const scene = new Scene();
scene.background = new Color("#FFEECC");

//camera
let camera = new PerspectiveCamera(45, innerWidth/innerHeight , 1, 1000);
camera.position.set(-17,30,33);

//renderer
let renderer = new WebGLRenderer({ antialias: true });
renderer.setSize( innerWidth, innerHeight );
renderer.toneMapping = ACESFilmicToneMapping;
renderer.outputEncoding = sRGBEncoding;
//enableing better lights and shadows
renderer.physicallyCorrectLights = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

//light
const light = new PointLight( new Color("#FFCBBE").convertSRGBToLinear().convertSRGBToLinear(), 80, 200);
light.position.set(10,20,10);

//shadows
light.castShadow = true; 
light.shadow.mapSize.width = 512; 
light.shadow.mapSize.height = 512; 
light.shadow.camera.near = 0.5; 
light.shadow.camera.far = 500; 
scene.add( light );

//adding in controls to move
let controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0,0,0);
controls.dampingFactor = 0.05;
controls.enableDamping = true;

//init environment map
let envmap;

//height constants for textures
const MAX_HEIGHT = 10;
const STONE_HEIGHT = MAX_HEIGHT * 0.8;
const DIRT_HEIGHT = MAX_HEIGHT * 0.7;
const GRASS_HEIGHT = MAX_HEIGHT * 0.5;
const SAND_HEIGHT = MAX_HEIGHT * 0.3;
const DIRT2_HEIGHT = MAX_HEIGHT * 0;

(async function() {
    //loading pmrem generator
    let pmrem = new PMREMGenerator(renderer);
    //setting up environment textures
    let envHdrTexture= await new RGBELoader().setDataType(FloatType).loadAsync("assets/geo.textures/immenstadter_horn_4k.hdr");
    envmap = pmrem.fromEquirectangular(envHdrTexture).texture;

    //setting up textures
    let textures = {
        dirt: await new TextureLoader().loadAsync("assets/geo.textures/dirt.png"),
        dirt2: await new TextureLoader().loadAsync("assets/geo.textures/dirt2.jpg"),
        grass: await new TextureLoader().loadAsync("assets/geo.textures/grass.jpg"),
        sand: await new TextureLoader().loadAsync("assets/geo.textures/sand.jpg"),
        water: await new TextureLoader().loadAsync("assets/geo.textures/water.jpg"),
        stone: await new TextureLoader().loadAsync("assets/geo.textures/stone.png")
    };

    //initializing noise
    const noise2D = createNoise2D();

    //looping to generate hexagons in a circle
    for(let i = -15; i <= 15; i++) {
        for(let j = -15; j <= 15; j++) {
            //gets a position with offsets for the hexagons
            let position = tileToPosition(i,j);
            
            //point where if greater than 16, skip creation (circle)
            if(position.length() > 16) {continue;}

            //creating a normalized value between -1 and 1 to simulate height (mountains)
            let noise = (noise2D(i * 0.1, j * 0.1) + 1) * 0.5;
            noise = Math.pow(noise, 1.4);

            //add a new hexagon
            makeHex(noise * MAX_HEIGHT, position);
        }
    }

    //getting each of the texture's meshes
    let stoneMesh = hexMesh(stoneGeo, textures.stone);
    let grassMesh = hexMesh(grassGeo, textures.grass);
    let dirtMesh = hexMesh(dirtGeo, textures.dirt);
    let dirt2Mesh = hexMesh(dirt2Geo, textures.dirt2);
    let sandMesh = hexMesh(sandGeo, textures.sand);
    scene.add(stoneMesh, grassMesh, dirtMesh, dirt2Mesh, sandMesh);

    //creates the water mesh
    let seaMesh = new Mesh(
        new CylinderGeometry(17, 17, MAX_HEIGHT * 0.2, 50),
        new MeshPhysicalMaterial({
            envMap: envmap,
            color: new Color("#55aaff").convertSRGBToLinear().multiplyScalar(3),
            ior: 1.4, //index of refraction
            transmission: 1, //important part to do it for glass/water
            transparent: true, //important part to do it for glass/water
            thickness: 1.5,
            envMapIntensity: 0.2, 
            roughness: 1,
            metalness: 0.025,
            roughnessMap: textures.water,
            metalnessMap: textures.water
        })
    );
    seaMesh.receiveShadow = true;
    seaMesh.rotation.y = -Math.PI * 0.333 * 0.5;
    seaMesh.position.set(0, MAX_HEIGHT * 0.1, 0);
    scene.add(seaMesh);
    
    //container for the water
    let mapContainer = new Mesh(
        new CylinderGeometry(17.1, 17.1, MAX_HEIGHT * 0.25, 50, 1, true),
        new MeshPhysicalMaterial({
          envMap: envmap,
          map: textures.dirt,
          envMapIntensity: 0.2, 
          side: DoubleSide //renders backside of object
        })
    );
    mapContainer.receiveShadow = true;
    mapContainer.rotation.y = -Math.PI * 0.333 * 0.5;
    mapContainer.position.set(0, MAX_HEIGHT * 0.125, 0);
    scene.add(mapContainer);
    
    //creates a floor for the project
    let mapFloor = new Mesh(
        new CylinderGeometry(18.5, 18.5, MAX_HEIGHT * 0.1, 50),
        new MeshPhysicalMaterial({
          envMap: envmap,
          map: textures.dirt2,
          envMapIntensity: 0.1, 
          side: DoubleSide,
        })
      );
    mapFloor.receiveShadow = true;
    mapFloor.position.set(0, -MAX_HEIGHT * 0.05, 0);
    scene.add(mapFloor);
    
    //calls to create clouds
    clouds();
    
    //rendering the scene
    renderer.setAnimationLoop(() => {
        controls.update;
        renderer.render(scene, camera);
    });
})();

//function that takes in position and converts it with offsets for hexagons
function tileToPosition(x, y) {
    //if odd, move it over by 0.5, while adding borders of 1.77 and 1.535
    return new Vector2((x + (y % 2) * 0.5) * 1.77, y * 1.535);
}

//stores hexagons for type
let stoneGeo = new BoxGeometry(0,0,0);
let dirtGeo = new BoxGeometry(0,0,0);
let dirt2Geo = new BoxGeometry(0,0,0);
let sandGeo = new BoxGeometry(0,0,0);
let grassGeo = new BoxGeometry(0,0,0);

//function that greates the hexagon geometry
function hexGeometry(height, position) {
    let geo = new CylinderGeometry(1, 1, height, 6, 1, false);
    geo.translate(position.x, height * 0.5, position.y);

    return geo;
}

//function that merges
function makeHex(height, position) {
    let geo = hexGeometry(height, position);

    //merges hexagons into texture buffers to ease computation
    //also optional creation of stones and trees based on a chance
    if (height > STONE_HEIGHT) {
        stoneGeo = mergeBufferGeometries([stoneGeo, geo]);

        if(Math.random() > 0.8) {
            stoneGeo = mergeBufferGeometries([stoneGeo, stone(height, position)]);
        }
    } else if (height > DIRT_HEIGHT) {
        dirtGeo = mergeBufferGeometries([dirtGeo, geo]);

        if(Math.random() > 0.8) {
            grassGeo = mergeBufferGeometries([grassGeo, tree(height, position)]);
        }
    } else if (height > GRASS_HEIGHT) {
        grassGeo = mergeBufferGeometries([grassGeo, geo]);
    } else if (height > SAND_HEIGHT) {
        sandGeo = mergeBufferGeometries([sandGeo, geo]);

        if(Math.random() > 0.8) {
            stoneGeo = mergeBufferGeometries([stoneGeo, stone(height, position)]);
        }
    } else if (height > DIRT2_HEIGHT) {
        dirt2Geo = mergeBufferGeometries([dirt2Geo, geo]);
    }
}

//function that has the mesh properties of the hexagons
function hexMesh(geo, map) {
    let mat = new MeshPhysicalMaterial({
        envMap: envmap,
        envMapIntensity: 0.135,
        flatShading: true,
        map
    });

    let mesh = new Mesh(geo, mat);
    
    //adding shadow ability
    mesh.castShadow = true;
    mesh.receiveShadow = true; 

    return mesh;
}

//function that creates a stone
function stone(height, position) {
    //random offset values
    const px = Math.random() * 0.4;
    const pz = Math.random() * 0.4;

    //the stone creation
    const geo = new SphereGeometry(Math.random() * 0.3 + 0.1, 7, 7);
    geo.translate(position.x + px, height, position.y + pz);

    return geo;
}

//function that creates a tree
function tree(height, position) {
    //giving the tree a random height
    const treeHeight = Math.random() * 1 + 1.25;
  
    const geo = new CylinderGeometry(0, 1.5, treeHeight, 3); // 3 sides makes a triangle and top radius is 0 to make cone looking geometries
    geo.translate(position.x, height + treeHeight * 0 + 1, position.y);
    
    const geo2 = new CylinderGeometry(0, 1.15, treeHeight, 3); //makes the bottom radius smaller to simulate going to the top of the tree
    geo2.translate(position.x, height + treeHeight * 0.6 + 1, position.y);
    
    const geo3 = new CylinderGeometry(0, 0.8, treeHeight, 3);
    geo3.translate(position.x, height + treeHeight * 1.25 + 1, position.y);
  
    return mergeBufferGeometries([geo, geo2, geo3]);
}

//function that generates clouds
function clouds() {
    //init buffer to hold it all
    let geo = new SphereGeometry(0, 0, 0); 
    let count = Math.floor(Math.pow(Math.random(), 0.45) * 4); //0-4 random number for number of clouds
    
    //loop to create each cloud
    for(let i = 0; i < count; i++) {
        //makes 3 spheres that will be different sizes to create cloud
        const puff1 = new SphereGeometry(1.2, 7, 7);
        const puff2 = new SphereGeometry(1.5, 7, 7);
        const puff3 = new SphereGeometry(0.9, 7, 7);
        
        //move them in offsets near each other
        puff1.translate(-1.85, Math.random() * 0.3, 0);
        puff2.translate(0, Math.random() * 0.3, 0);
        puff3.translate(1.85, Math.random() * 0.3, 0);
        
        //merge the 3 spheres
        const cloudGeo = mergeBufferGeometries([puff1, puff2, puff3]);
        //randomize their position on the map
        cloudGeo.translate( 
            Math.random() * 20 - 10, 
            Math.random() * 7 + 7, 
            Math.random() * 20 - 10
        );
        //randomize the rotation of the cloud
        cloudGeo.rotateY(Math.random() * Math.PI * 2);
        
        //add it to the buffer
        geo = mergeBufferGeometries([geo, cloudGeo]);
    }
    
    //mesh properties for the cloud
    const mesh = new Mesh(
      geo,
      new MeshStandardMaterial({
        envMap: envmap, 
        envMapIntensity: 0.75, 
        flatShading: true,
        transparent: true,
        opacity: 0.85,
      })
    );
    
    //adding it to the scene
    scene.add(mesh);
  }