
/*
    author: Michael Ly
    date: 4/6/2022
    tutorial by Irradiance
*/

//imports
import * as THREE from 'three';
import { RGBELoader } from 'RGBELoader';
import { OrbitControls } from 'OrbitControls';

//scene
let scene = new THREE.Scene();

//Load background texture
const loader = new THREE.TextureLoader();
loader.load('./images/sky.jpg' , function(texture) {
    scene.background = texture;  
});

//getting viewport data
var viewportWidth  = viewportSize.getWidth(),
    viewportHeight = viewportSize.getHeight(),
    viewportAspect = viewportWidth / viewportHeight;

//camera
let camera = new THREE.PerspectiveCamera(45, viewportAspect, 1, 1000);
camera.position.set(0,0,10);

//renderer
let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( viewportWidth, viewportHeight, false );
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

//adding in controls to move
let controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0,0,0);

//loading pmrem generator
let pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

//mouse movement
let mousePos = new THREE.Vector2(0,0);

window.addEventListener("mousemove", (e) => {
    let x = e.clientX - innerWidth * 0.5;
    let y = e.clientY - innerHeight * 0.5;

    mousePos.x = x * 0.001;
    mousePos.y = y * 0.001;
});

//function to start up the rendering of the scene and camera
(async function init() {

    //setting up environment textures
    let envHdrTexture= await new RGBELoader().loadAsync("./assets/modals/cannon_1k_blurred.hdr")
    let envRT = pmrem.fromEquirectangular(envHdrTexture);

    //adding the rings
    let ring1 = CustomRing(envRT, 0.65, "white");
    ring1.scale.set(0.75, 0.75);
    scene.add(ring1);

    let ring2 = CustomRing(envRT, 0.35, new THREE.Color(0.25, 0.225, 0.215));
    ring2.scale.set(1.05, 1.05);
    scene.add(ring2);

    let ring3 = CustomRing(envRT, 0.15, new THREE.Color(0.7, 0.7, 0.7));
    ring3.scale.set(1.3, 1.3);
    scene.add(ring3);

    //adding the hour line
    let hourLine = CustomLine(0.4, 0.135, 0.07, envRT, "white", 3);
    scene.add(hourLine);

    //adding the minute line
    let minuteLine = CustomLine(0.8, 0.135, 0.07, envRT, new THREE.Color(0.5, 0.5, 0.5), 1);
    scene.add(minuteLine);  

    //adding the second line
    let secondLine = CustomLine(1, 0.075, 0.07, envRT, new THREE.Color(0.2, 0.2, 0.2), 1);
    scene.add(secondLine);

    //adding the hour lines
    let cHourLine = clockLines(envRT);
    scene.add(cHourLine);
    
    //animation loop
    renderer.setAnimationLoop(() => {

        //rotating the rings
        ring1.rotation.x = ring1.rotation.x * 0.95 + (mousePos.y * 1.2) * 0.05;
        ring1.rotation.y = ring1.rotation.y * 0.95 + (mousePos.x * 1.2) * 0.05;

        ring2.rotation.x = ring2.rotation.x * 0.95 + (mousePos.y * 0.375) * 0.05;
        ring2.rotation.y = ring2.rotation.y * 0.95 + (mousePos.x * 0.375) * 0.05;

        ring3.rotation.x = ring3.rotation.x * 0.95 + (-mousePos.y * 0.275) * 0.05;
        ring3.rotation.y = ring3.rotation.y * 0.95 + (-mousePos.x * 0.275) * 0.05;

        //getting time info for location of hours, minute, and second hands
        let date = new Date();

        //rotates the line and handles the movement for time
        let hourAngle = date.getHours() / 12 * Math.PI * 2;
        rotateLine(hourLine, hourAngle, ring1.rotation, 1.0, 0);

        let minuteAngle = date.getMinutes() / 60 * Math.PI * 2;
        rotateLine(minuteLine,minuteAngle, ring1.rotation, 0.8, 0.1);

        let secondAngle = date.getSeconds() / 60 * Math.PI * 2;
        rotateLine(secondLine, secondAngle, ring1.rotation, 0.75, -0.1);

        //clock hour lines
        cHourLine.children.forEach((c, i) => {
            rotateLine(c, i / 12 * Math.PI * 2, ring1.rotation, 1.72, 0.2);
        });

        controls.update();
        renderer.render(scene, camera);
    });
})();

//function that will rotate the lines
function rotateLine(line, angle, ringRotation, topTranslation, depthTranslation) {

    //tmatrix translates the depth and cylinders
    let tmatrix = new THREE.Matrix4().makeTranslation(0, topTranslation, depthTranslation);
    //rmatrix rotates the lines
    let rmatrix = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0,0,1), -angle);
    //rlmatrix translates the line to follow the ring location
    let rlmatrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler().copy(ringRotation));

    //preforms the matrix multiplication and copies it to the line
    line.matrix.copy(new THREE.Matrix4().multiply(rlmatrix).multiply(rmatrix).multiply(tmatrix));
    line.matrixAutoUpdate = false;
    line.matrixWorldNeedsUpdate = false;
}

//function to make the rings of the clock
function CustomRing(envRT, thickness, color) {

    //front ring
    let ring = new THREE.Mesh(
        new THREE.RingGeometry(2, 2 + thickness, 70),
        new THREE.MeshStandardMaterial({ 
            envMap: envRT.texture,
            roughness: 0,
            metalness: 1,
            side: THREE.DoubleSide,
            color,
            envMapIntensity: 1
        })
    );
    ring.position.set(0,0, 0.25*0.5);

    //back ring
    let backRing = new THREE.Mesh(
        new THREE.RingGeometry(2, 2 + thickness, 70),
        new THREE.MeshStandardMaterial({ 
            envMap: envRT.texture,
            roughness: 0,
            metalness: 1,
            side: THREE.DoubleSide,
            color,
            envMapIntensity: 1
        })
    );
    backRing.position.set(0,0, -0.25*0.5);
    
    //cylinder outer part
    let outerCylinder = new THREE.Mesh(
        new THREE.CylinderBufferGeometry(2 + thickness, 2 + thickness, 0.25, 70, 1, true),
        new THREE.MeshStandardMaterial({ 
            envMap: envRT.texture,
            roughness: 0,
            metalness: 1,
            side: THREE.DoubleSide,
            color,
            envMapIntensity: 1
        })
    );
    outerCylinder.rotation.x = Math.PI * 0.5;

    //cylinder inner part
    let innerCylinder = new THREE.Mesh(
        new THREE.CylinderBufferGeometry(2, 2 , 0.25, 140, 1, true),
        new THREE.MeshStandardMaterial({ 
            envMap: envRT.texture,
            roughness: 0,
            metalness: 1,
            side: THREE.DoubleSide,
            color,
            envMapIntensity: 1
        })
    );
    innerCylinder.rotation.x = Math.PI * 0.5;

    let group = new THREE.Group();
    group.add(ring, backRing, outerCylinder, innerCylinder);

    return group;
}

//custom line function
function CustomLine(height, width, depth, envRT, color, envMapIntensity) {

    //body of the line
    let box = new THREE.Mesh(
        new THREE.BoxBufferGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({ 
            envMap: envRT.texture,
            roughness: 0,
            metalness: 1,
            side: THREE.DoubleSide,
            color,
            envMapIntensity
        })
    );
    box.position.set(0,0,0);
    
    //rounded top of line
    let top = new THREE.Mesh(
        new THREE.CylinderBufferGeometry(width * 0.5, width * 0.5, depth, 10),
        new THREE.MeshStandardMaterial({ 
            envMap: envRT.texture,
            roughness: 0,
            metalness: 1,
            side: THREE.DoubleSide,
            color,
            envMapIntensity
        })
    );
    top.rotation.x = Math.PI * 0.5;
    top.position.set(0, +height * 0.5, 0);

    //rounded bottom of line
    let bot = new THREE.Mesh(
        new THREE.CylinderBufferGeometry(width * 0.5, width * 0.5, depth, 10),
        new THREE.MeshStandardMaterial({ 
            envMap: envRT.texture,
            roughness: 0,
            metalness: 1,
            side: THREE.DoubleSide,
            color,
            envMapIntensity
        })
    );
    bot.rotation.x = Math.PI * 0.5;
    bot.position.set(0, -height * 0.5, 0);

    let group = new THREE.Group();
    group.add(box, top, bot)

    return group;
}

//function to create the hour lines on the clock
function clockLines(envRT) {

    //making result group 
    let group = new THREE.Group();

    //making 12 custom lines for the hour lines
    for(let i =0; i < 12; i++) {
        let line = CustomLine(0.1, 0.075, 0.025, envRT, new THREE.Color(0.65, 0.65, 0.65), 1);
        group.add(line);
    }

    return group;
}