var canvas = document.getElementById("renderCanvas");
let uuid = "";

var engine = null;
var scene = null;
var sceneToRender = null;
var inputMap = {};
var camera1 = null;
var ground = null;
var grounds = [];
var buildings = [];
var hero_start_pos = null;
var deadly_tiles = [];
var win_obj = null;
var godmode = false;
var players = [];
var cat_mesh = null;
var socket = io.connect('/');
socket.on('connection', function(){
    socket.join('game-updates');
    
})
var player_name = "";

const UUIDGeneratorBrowser = () =>
  ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );

var createDefaultEngine = function() { return new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true,  disableWebGL2Support: false}); };

function createHouse(position, scene){
    const box = BABYLON.MeshBuilder.CreateBox("box", {});
    box.position.x = position.x;
    box.position.y = position.y + 0.5;
    box.position.z = position.z;

    const roof = BABYLON.MeshBuilder.CreateCylinder("roof", {diameter: 1.3, height: 1.2, tessellation: 3}, scene);
    roof.position.x = position.x;
    roof.position.z = position.z;
    roof.scaling.x = 0.75;
    roof.rotation.z = Math.PI / 2;
    roof.position.y = position.y + 1.22;
}

function createBuilding(position, scene, height){

    if(height == null){
        height = Math.floor(Math.random() * 2);
    }
    //console.log("Height: " + height)
    

    let faceUV = [];
    faceUV[0] = new BABYLON.Vector4(0.75, 0.33, 1, 0.66); //rear face
    faceUV[1] = new BABYLON.Vector4(0.5, 0.33, 0.25, 0.66); //front face
    faceUV[2] = new BABYLON.Vector4(0.5, 0.33, 0.7, 0.66); //right side
    faceUV[3] = new BABYLON.Vector4(0, 0.33, 0.25, 0.66); //left side
    faceUV[4] = new BABYLON.Vector4(0.25, 0, 0.5, 0.33); //left side

    const botMat = new BABYLON.StandardMaterial("botMat");
    botMat.diffuseTexture = new BABYLON.Texture("./res/img/skyscraper-bottom-sheet.png", scene, true, true, 0);
    const midMat = new BABYLON.StandardMaterial("midMat");
    midMat.diffuseTexture = new BABYLON.Texture("./res/img/skyscraper-mid-sheet.png", scene, true, true, 0);
    const topMat = new BABYLON.StandardMaterial("topMat");
    topMat.diffuseTexture = new BABYLON.Texture("./res/img/skyscraper-top-sheet.png", scene, true, true, 0);
    
    const boxBot = BABYLON.MeshBuilder.CreateBox("box", {width: 4, height: 4, depth: 4, faceUV: faceUV, wrap: true});
    boxBot.physicsImpostor = new BABYLON.PhysicsImpostor(boxBot, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
        friction:0,
        restitution:0}, scene);
    boxBot.material = botMat;
    boxBot.position = position.clone();
    boxBot.position.y = 2;
    buildings.push(boxBot);
    
    for(let i = 0; i < height; i++){
        const boxMid = BABYLON.MeshBuilder.CreateBox("box-mid", {width: 4, height: 4, depth: 4, faceUV: faceUV, wrap: true});
        boxMid.physicsImpostor = new BABYLON.PhysicsImpostor(boxMid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0,
            restitution:0}, scene);
        boxMid.material = midMat;
        boxMid.position = position.clone();
        boxMid.position.y = 2 + 4 * (i + 1);
        buildings.push(boxMid);
    }

    const boxTop = BABYLON.MeshBuilder.CreateBox("box-top", {width: 4, height: 4, depth: 4, faceUV: faceUV, wrap: true});
    boxTop.physicsImpostor = new BABYLON.PhysicsImpostor(boxTop, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
        friction:0,
        restitution:0}, scene);
        boxTop.material = topMat;
        boxTop.position = position.clone();
        boxTop.position.y = 2 + 4 * (height + 1);
    buildings.push(boxTop);
}

function update_pos_rot(position, rotation){
    //console.log(rotation);
    socket.emit("player_update", {uuid: uuid, position: position, rotation: rotation});
}


function createTexture(scene) {
    var WIDTH = 150;
    var HEIGHT = 16;
    const texture = new BABYLON.DynamicTexture('HeadSymbol', { width: WIDTH, height: HEIGHT }, scene, false);

    const ctx = texture.getContext();
    ctx.fillStyle = 'rgba(255, 0, 0, 0)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT / 2);
    ctx.lineTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH, HEIGHT / 2);
    ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.closePath();

    ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 255, 0, 1)';
    ctx.stroke();
    //texture.vScale *= -1;
    //texture.vOffset += 1;
    texture.uScale *= -1;
    texture.uOffset += 1;
    texture.update();
    texture.hasAlpha = true;

    return texture;
}
function createHeadSymbolMaterial(scene, texture) {
    
    var material = new BABYLON.StandardMaterial('HeadSymbol', scene);

    material.diffuseTexture = texture;
    //scene.useRightHandedSystem = true
    //material.diffuseTexture.uScale = -1;
    // material.diffuseColor = new Color3(1, 1, 1);
    // material.specularColor = new Color3(1, 1, 1);
    material.useAlphaFromDiffuseTexture = true;

    return material;
}

function updateLabelText(material, name){
    var tex = material.getActiveTextures()[0];
    tex.drawText(name, 1, 14, "bold 14px monospace", "red", "rgba(200,200,200,1)", true, true);
    tex.update();
}

function create_player_label(player_name, scene, parent, rotation, position){
    
    var ground = BABYLON.MeshBuilder.CreateGround("ground-" + player_name + Math.floor(Math.random() * 999), {width: 0.9, height: 0.1}, scene);
    var tex = createTexture(scene);

    ground.scaling.scaleInPlace(10);
    //ground.scaling.x = -1;

    tex.drawText(player_name, 1, 14, "bold 14px monospace", "red", "rgba(200,200,200,1)", true, true);
    tex.update();
    ground.material = createHeadSymbolMaterial(scene, tex)
    ground.parent = parent;
    if(position == undefined){
        position = 0.4;
    }
    ground.position.y =4;
    if(rotation == undefined){
        rotation = 0;//Math.PI / 2
    }
    ground.rotation = new BABYLON.Vector3(-Math.PI/2, 0, 0);
    console.log("Created player label " + player_name)
    return ground.material;
}

function updateNetworkPlayerName(uuid, name){
    for(let i = 0; i < players.length; i++){
        if(players[i].uuid == uuid){
            players[i].player_name = name;
            let player_mat = players[i].ground_mat;
            updateLabelText(player_mat, name);
        }
    }
}

function updateLeaderboard(leaderboard){
    let lb_html = "<ul>\n"
    for(let i = 0; i < leaderboard.length; i++){
        let player_name = leaderboard[i].player_name;
        let lb_item = "<li>" + (i+1).toString(10) + " - " + player_name + "</li>\n"
        lb_html += lb_item
    }
    lb_html += "</ul>\n"
    console.log(lb_html)
    document.getElementById("leaderboard-players").innerHTML = lb_html;
}

function playTada(){
    console.log("tada!");
}

function loadCat(position, scene, name){
    const collBox = BABYLON.MeshBuilder.CreateBox("hero-col-box", {width: 0.4, height: 0.2, depth: 0.4});
    collBox.physicsImpostor = new BABYLON.PhysicsImpostor(collBox, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 10, friction: 10, restitution: 0.01 }, scene);
    collBox.showBoundingBox = true;
    collBox.isVisible = false;
    collBox.position = position.clone();

    collBox.position.y = 1;

    hero_start_pos = collBox.position.clone();
    
    // OK Button
    document.getElementById("win-ok").onclick = function(){
        window.location.reload();
    }
    

    var last_pos = collBox.position.clone();
    let collided_with_win_obj = false;

    var cat_scream = new BABYLON.Sound("gunshot", "res/snd/415209__inspectorj__cat-screaming-a.wav", scene);
    //collBox.rotate(new BABYLON.Vector3(0, 1, 0), Math.PI/2);
     // Load hero character and play animation
    BABYLON.SceneLoader.ImportMesh("", "./meshes/", "StripeTheCat.glb", scene, function (newMeshes, particleSystems, skeletons, animationGroups) {
        var hero = newMeshes[0];

        var animating = true;
        var heroSpeed = 0.14;
        var heroSpeedBackwards = 0.1;
        var heroRotationSpeed = 0.1;
        let jumpForce = 55;
        

        var label_pos = position.clone();
        label_pos.y += 0.3;

        if(name == undefined){
            name = "NoName";
        }

        var ground_mat = create_player_label(name, scene, hero);
        // Name gets set
        document.getElementById("name-ok").onclick = function(){
            let name = document.getElementById("name-field").value
            updateLabelText(ground_mat,name)
            player_name = name;
            document.getElementById("start-container").style.display = "none";
            socket.emit('update_name', {name: name, uuid: uuid});
        }

        hero.parent = collBox;

        //hero.parent = collBox;

        hero.physicsImpostor = new BABYLON.PhysicsImpostor(newMeshes[0], BABYLON.PhysicsEngine.NoImpostor, { mass: 0, friction: 0.5, restitution: 1 }, scene);
        
        //Scale the model down        
        hero.scaling.scaleInPlace(0.1);
        //hero.rotation = new BABYLON.Vector3(0, Math.PI * 2, 0);

        //Lock camera on the character 
        //camera1.target = hero;
        camera1.lockedTarget = hero;

        //Get the Samba animation Group
        const walkAnim = scene.getAnimationGroupByName("WalkAttempt2");

        hero.position.y = -0.1;        

        scene.onBeforeRenderObservable.add(() => {
            
            let av = collBox.physicsImpostor.getAngularVelocity();
            collBox.physicsImpostor.setAngularVelocity(new BABYLON.Vector3(0, av.y, 0));
            //console.log(collBox.rotationQuaternion.toEulerAngles());
            let angle = collBox.rotationQuaternion.toEulerAngles();
            let y = 180 - (angle.y * (180 / Math.PI));
            //camera1.setPosition(new BABYLON.Vector3(angle.y / 4, Math.PI/2, 10));
            camera1.alpha = -angle.y - Math.PI / 2;

            for(let i = 0; i < buildings.length; i++){
                let b = buildings[i];
                let v = collBox.physicsImpostor.getLinearVelocity();
                if(collBox.intersectsMesh(b)){
                    collBox.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(0, v.y, 0));
                    collBox.physicsImpostor.setAngularVelocity(new BABYLON.Vector3(0, 0, 0));
                }
            }
            if(!godmode){
                for(let i = 0; i < deadly_tiles.length; i++){
                    let t = deadly_tiles[i];
                    if(collBox.intersectsMesh(t)){
                        // TODO: pain sound
                        cat_scream.play();
                        console.log("Died!!")
                        collBox.position = hero_start_pos.clone();
                    }
                }
            }
            if(win_obj != null){
                if(collBox.intersectsMesh(win_obj) && !collided_with_win_obj){
                    socket.emit("player-finishes", {player_name: player_name, player_id:uuid});
                    document.getElementById("win-scr-container").style.visibility = "visible";
                    collided_with_win_obj = true;
                    return;
                }
            }

            var keydown = false;
            //Manage the movements of the character (e.g. position, direction)
            if (inputMap["w"]) {
                collBox.moveWithCollisions(collBox.forward.scaleInPlace(heroSpeed));
                keydown = true;
            }
            if (inputMap["s"]) {
                collBox.moveWithCollisions(collBox.forward.scaleInPlace(-heroSpeedBackwards));
                keydown = true;
            }
            if (inputMap["a"]) {
                collBox.rotate(BABYLON.Vector3.Up(), -heroRotationSpeed);
                keydown = true;
            }
            if (inputMap["d"]) {
                collBox.rotate(BABYLON.Vector3.Up(), heroRotationSpeed);
                keydown = true;
            }
            if (inputMap["b"]) {
                keydown = true;
            }
            if(inputMap[" "]){
                var on_ground = false;
                for(let i = 0; i < grounds.length; i++){
                    let g_i = grounds[i];
                    if(collBox.intersectsMesh(g_i)){
                        on_ground = true;
                    }
                }
                if(collBox.intersectsMesh(ground)){
                    on_ground = true;
                }
                if(on_ground){
                    console.log("Jump!");
                    var contactLocalRefPoint = BABYLON.Vector3.Zero();
                    collBox.physicsImpostor.applyImpulse(new BABYLON.Vector3(0, jumpForce, 0), collBox.getAbsolutePosition().add(contactLocalRefPoint));
                }
                
            }
            let dp = collBox.position.subtract(last_pos);
            //console.log(dp);
            if(Math.abs(dp.x) > 0 || Math.abs(dp.y) > 0 || Math.abs(dp.z) > 0){
                let new_angle = angle.clone()
                new_angle.y = angle.y - Math.PI;
                let quat = new_angle.toQuaternion();
                update_pos_rot(collBox.position, quat);
            }
    
            //Manage animations to be played  
            if (keydown) {
                if (!animating) {
                    animating = true;
                    if (inputMap["s"]) {
                        //Walk backwards
                        //walkBackAnim.start(true, 1.0, walkBackAnim.from, walkBackAnim.to, false);
                    }
                    else if
                        (inputMap["b"]) {
                        //Samba!
                        //sambaAnim.start(true, 1.0, sambaAnim.from, sambaAnim.to, false);
                    }
                    else {
                        //Walk
                       // walkAnim.start(true, 1.0, walkAnim.from, walkAnim.to, false);
                       console.log("Walking")
                       walkAnim.start(true, 1.6, walkAnim.from, walkAnim.to, false);
                    }
                }
            }
            else {
    
                if (animating) {
                    //Default animation is idle when no key is down     
                    /*idleAnim.start(true, 1.0, idleAnim.from, idleAnim.to, false); */
    
                    //Stop all animations besides Idle Anim when no key is down
                    //sambaAnim.stop();
                    walkAnim.stop();
                    //walkBackAnim.stop();
    
                    //Ensure animation are played only once per rendering loop*/
                    animating = false;
                }
            }
        });
        last_pos = collBox.position.clone();;

    });
}

function generateDummyCats(scene, mesh){
    for(let i = 0; i< 32; i++){
        loadDummyCat("x", scene, mesh);
    }
}

function registerCat(_uuid, name){
    if(_uuid == uuid){
        console.log("No, that's me, disregard")
        return;
    }
    for(let i = 0; i < players.length; i++){
        if(players[i] && players[i].uuid == "x"){
            players[i].uuid = _uuid;
            players[i].name = name;
            updateLabelText(players[i].ground_mat, name);
            console.log("Cat registered: " + _uuid + " " + name)
            return;
        }
    }
    console.log("MAX PLAYER LIMIT REACHED");
}

function registerCats(_players){
    let found = false
    for(let i = 0; i < _players.length; i++){
        for(let j = 0; j < players.length; j++){
            if(players[i] != undefined){
                if(_players[i] != undefined && _players[i] != null && _players[i].player_id == players[i].uuid){
                    found = true;
                }
            }
        }
        if(!found && _players[i] != null){
            registerCat(_players[i].player_id, _players[i].player_name);
        }
    }
}

function unregisterCat(_uuid){
    if(_uuid == uuid){
        console.log("No, that's me, disregard")
        return;
    }
    for(let i = 0; i < players.length; i++){
        if(players[i] && players[i].uuid == _uuid){
            updateDummyCat(_uuid, new BABYLON.Vector3(0, 0, 0));
            players[i].uuid = "x";
            console.log("Cat unregistered: " + _uuid)
            return;
        }
    }

}

async function loadMesh(path, meshname, scene){
    const result = await BABYLON.SceneLoader.ImportMeshAsync("", "./meshes/", "StripeTheCat.glb", scene);
    return result.meshes[0];
}

function loadDummyCat(_uuid, scene, mesh){
    if(_uuid == uuid){
        console.log("No, that's me, disregard")
        return;
    }
    /*const collBox = BABYLON.MeshBuilder.CreateBox("hero-col-box", {width: 0.4, height: 0.2, depth: 0.4});
    collBox.physicsImpostor = new BABYLON.PhysicsImpostor(collBox, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 10, friction: 10, restitution: 0.01 }, scene);
    collBox.showBoundingBox = true;
    collBox.isVisible = false;
    /*if(position != null){
        collBox.position = position.clone();
    }*/

    /*
    

    collBox.position.y = 1;

    hero_start_pos = collBox.position.clone();
    */

    
        var hero = mesh.clone();

        var animating = true;
        var heroSpeed = 0.14;
        var heroSpeedBackwards = 0.1;
        var heroRotationSpeed = 0.1;
        let jumpForce = 55;

        //hero.parent = collBox;

        //hero.physicsImpostor = new BABYLON.PhysicsImpostor(hero, BABYLON.PhysicsEngine.NoImpostor, { mass: 0, friction: 0.5, restitution: 1 }, scene);

        hero.rotationQuaternion = null;
        
        //Scale the model down        
        hero.scaling.scaleInPlace(0.1);

        var ground_mat = create_player_label("NoName", scene, hero, -Math.PI/2, 1);
        

        //Get the Samba animation Group
        const walkAnim = scene.getAnimationGroupByName("WalkAttempt2");

        hero.position.y = -0.1;
        hero.addRotation(BABYLON.Vector3(0, Math.PI/2, 0));
        scene.onBeforeRenderObservable.add(() => {

            //hero.rotation = new BABYLON.Vector3(0, Math.PI/2, 0);

            //hero.rotation = new BABYLON.Vector3(0, Math.PI * 0.2, Math.random() * Math.PI);
            //let av = collBox.physicsImpostor.getAngularVelocity();
            //collBox.physicsImpostor.setAngularVelocity(new BABYLON.Vector3(0, av.y, 0));
            //console.log(collBox.rotationQuaternion.toEulerAngles());
            //let angle = collBox.rotationQuaternion.toEulerAngles();
            //collBox.physicsImpostor.setAngularVelocity(new BABYLON.Vector3(0, 0, 0));
        });
        players.push({object: hero, uuid: _uuid, name: "NoName", ground_mat: ground_mat});
}

function updateDummyCat(_uuid, position, rotation){
    let cat_found = false;
    for(let i = 0; i < players.length; i++){
        if(players[i] != null && players[i].uuid == _uuid){
            //console.log("updating ")
            cat_found = true;
            players[i].object.position = position;
            if(rotation){
                players[i].object.rotationQuaternion = rotation;
            }
        }
    }
    // Add a cat if it's not there for some reason.. >.<
    if(!cat_found){
        let cat_name = "";
        for(let i = 0; i < players.length; i++){
            if(players[i] != undefined && players[i].uuid == uuid){
                cat_name = players[i].name;
            }
        }
        registerCat(uuid, cat_name);
    }
}
function placePlayer(position, scene){
    loadCat(position, scene);
}

function loadNetworkPlayer(uuid, name){
    loadDummyCat(uuid);
}

function unloadNetworkPlayer(uuid, name){
    unregi
}

function updateNetworkPlayer(uuid, position){
    updateDummyCat(uuid, position);
}

function placeStraightRoad(position, rotated, safe, scene){
    //console.log("Placing a road tile at " + position.x + ", " + position.z);
    var roadPlane = BABYLON.MeshBuilder.CreateGround("road", {width: 4, height: 4}, scene);
    const roadMat = new BABYLON.StandardMaterial("roadMat");
    if(rotated){
        roadMat.diffuseTexture = new BABYLON.Texture("./res/img/road-straight.png", scene, true, true, 0);
    } else {
        roadMat.diffuseTexture = new BABYLON.Texture("./res/img/road-straight-rotated.png", scene, true, true, 0);
    }
    roadPlane.material = roadMat;
    roadPlane.position = position.clone();
    if(!safe){
        deadly_tiles.push(roadPlane);
    }
}

function placeIntersection(position, scene){
    var intersectionPlane = BABYLON.MeshBuilder.CreateGround("intersction", {width: 4, height: 4}, scene);
    const roadMat = new BABYLON.StandardMaterial("roadMat");
    roadMat.diffuseTexture = new BABYLON.Texture("./res/img/road-intersection.png", scene, true, true, 0);
    intersectionPlane.material = roadMat;
    intersectionPlane.position = position.clone();
    deadly_tiles.push(intersectionPlane);
}

function generateJumpingBoxes(position, type, scene){
    if(type === "    "){
        return;
    }
    /*
    console.log("Type: " + type)
    console.log("Position: ")
    console.log(position)
    console.log("--")*/

    var lower_y = 0.9;
    var mid_y = 1.8;
    var block_w = 1.6;
    // ---- LEVEL TRANSITION PIECES ----
    // Original "1" (mid jump pad right - also player startt)
    if(type == "   -"){ // [x]
        const b_lower = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 0.8 });
        b_lower.physicsImpostor = new BABYLON.PhysicsImpostor(b_lower, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);

        b_lower.position = position.clone();
        b_lower.position.x;
        b_lower.position.y += lower_y;
        b_lower.position.z += block_w;
        grounds.push(b_lower);

        const b_mid = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 0.8 });
        b_mid.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);

        b_mid.position = position.clone();
        b_mid.position.x -= block_w;
        b_mid.position.y += mid_y;
        b_mid.position.z += block_w;
        grounds.push(b_mid);
    }
    // UNTESTED
    else if(type == "-   "){
        const b_lower = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 0.8 });
        b_lower.physicsImpostor = new BABYLON.PhysicsImpostor(b_lower, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);

        b_lower.position = position.clone();
        b_lower.position.x;
        b_lower.position.y += lower_y;
        b_lower.position.z -= block_w;
        grounds.push(b_lower);

        const b_mid = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 0.8 });
        b_mid.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);

        b_mid.position = position.clone();
        b_mid.position.x -= 1.6;
        b_mid.position.y += mid_y;
        b_mid.position.z -= block_w;
        grounds.push(b_mid);
    }
    else if (type == " __."){
        const b_lower = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 0.8 });
        b_lower.physicsImpostor = new BABYLON.PhysicsImpostor(b_lower, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);

        b_lower.position = position.clone();
        b_lower.position.x += block_w;
        b_lower.position.y += lower_y;
        b_lower.position.z += 0;
        grounds.push(b_lower);

        const b_mid = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 0.8 });
        b_mid.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);

        b_mid.position = position.clone();
        b_mid.position.x += block_w;
        b_mid.position.y += mid_y;
        b_mid.position.z -= 1.2;
        grounds.push(b_mid);
    } else if (type == ".__ "){
        const b_lower = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 0.8 });
        b_lower.physicsImpostor = new BABYLON.PhysicsImpostor(b_lower, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);

        b_lower.position = position.clone();
        b_lower.position.x += block_w;
        b_lower.position.y += lower_y;
        b_lower.position.z += 0;
        grounds.push(b_lower);

        const b_mid = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 0.8 });
        b_mid.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);

        b_mid.position = position.clone();
        b_mid.position.x += block_w;
        b_mid.position.y += mid_y;
        b_mid.position.z += 1.2;
        grounds.push(b_mid);
    }
    // Old 2 
    else if (type == "___|"){ // [x]

        const b_mid_1 = BABYLON.MeshBuilder.CreateBox("box", {width: 4, height: 0.2, depth: 0.8 });
        b_mid_1.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid_1, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);

            b_mid_1.position = position.clone();
            b_mid_1.position.x += 0;
            b_mid_1.position.y += mid_y;
            b_mid_1.position.z += 1.6;
        grounds.push(b_mid_1);

        const b_mid_2 = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 3.8 });
        b_mid_2.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid_2, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);

            b_mid_2.position = position.clone();
            b_mid_2.position.x += 1.6;
            b_mid_2.position.y += mid_y;
            b_mid_2.position.z -= 0;
        grounds.push(b_mid_2);
    }
    // Old 10 
    else if (type == "^^^|"){ // [x]
        const b_mid_1 = BABYLON.MeshBuilder.CreateBox("box", {width: 4, height: 0.2, depth: 0.8 });
        b_mid_1.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid_1, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);

            b_mid_1.position = position.clone();
            b_mid_1.position.x += 0;
            b_mid_1.position.y += mid_y;
            b_mid_1.position.z += 1.6;
        grounds.push(b_mid_1);

        const b_mid_2 = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 3.8 });
        b_mid_2.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid_2, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);

            b_mid_2.position = position.clone();
            b_mid_2.position.x -= 1.6;
            b_mid_2.position.y += mid_y;
            b_mid_2.position.z -= 0;
        grounds.push(b_mid_2);
    }
    // Original 3 
    else if(type == "   ^"){ // [x]
        const b_mid = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 0.8 });

        b_mid.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
        b_mid.position = position.clone();

        b_mid.position.y += mid_y;
        b_mid.position.x -= 1.6;
        b_mid.position.z += 1.6;

        grounds.push(b_mid);
    } 
    // Old 4
    else if(type == "   |"){ // [x] basic path right
        const b_mid = BABYLON.MeshBuilder.CreateBox("box", {width: 4, height: 0.2, depth: 0.8 });
        b_mid.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);

        b_mid.position = position.clone();
        b_mid.position.x += 0;
        b_mid.position.y += mid_y;
        b_mid.position.z += 1.6;
        grounds.push(b_mid);
    }
    else if (type == "____"){
        const b_mid = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 4 });
        b_mid.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);

        b_mid.position = position.clone();
        b_mid.position.x += 1.6;
        b_mid.position.y += mid_y;
        b_mid.position.z -= 0;
        grounds.push(b_mid);
    }
    // Old 5 [x]
    else if(type == "|   "){ // Basic path left
        const b_mid = BABYLON.MeshBuilder.CreateBox("box", {width:4, height: 0.2, depth: 0.8 });
        b_mid.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);

        b_mid.position = position.clone();
        b_mid.position.x += 0;
        b_mid.position.y += mid_y;
        b_mid.position.z -= 1.6;
        grounds.push(b_mid);        
    }
    else if(type == "^^^^"){ // [x]
        const b_mid = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 4 });
        b_mid.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);

        b_mid.position = position.clone();
        b_mid.position.x -= block_w;
        b_mid.position.y += mid_y;
        b_mid.position.z += 0;
        grounds.push(b_mid);
    }
    // Old 6 
    else if(type === "^--_"){ // connector R to L
        console.log("right to left connector");
        const b_mid = BABYLON.MeshBuilder.CreateBox("box", {width: 1.2, height: 0.2, depth: 0.8 });
        b_mid.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
        b_mid.position = position.clone();
        b_mid.position.x += 1.2;
        b_mid.position.y += mid_y;
        b_mid.position.z += 1.6;
        grounds.push(b_mid);

        const connector_box = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 4});
        connector_box.physicsImpostor = new BABYLON.PhysicsImpostor(connector_box, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
            connector_box.position = position.clone();
            connector_box.position.x += 0;
            connector_box.position.y += mid_y;
            connector_box.position.z += 0;
        grounds.push(connector_box);

        const b_mid_2 = BABYLON.MeshBuilder.CreateBox("box", {width: 1.2, height: 0.2, depth: 0.8 });
        b_mid_2.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid_2, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
            b_mid_2.position = position.clone();
            b_mid_2.position.x -= 1.2;
            b_mid_2.position.y += mid_y;
            b_mid_2.position.z -= 1.6;
        grounds.push(b_mid_2);
    }
    else if (type == "^||_"){ // [x]
        const b_mid = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 1.2 });
        b_mid.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
        b_mid.position = position.clone();
        b_mid.position.x += block_w;
        b_mid.position.y += mid_y;
        b_mid.position.z += 1.2;
        grounds.push(b_mid);

        const connector_box = BABYLON.MeshBuilder.CreateBox("box", {width: 4, height: 0.2, depth: 0.8});
        connector_box.physicsImpostor = new BABYLON.PhysicsImpostor(connector_box, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
            connector_box.position = position.clone();
            connector_box.position.x += 0;
            connector_box.position.y += mid_y;
            connector_box.position.z += 0;
        grounds.push(connector_box);

        const b_mid_2 = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 1.2 });
        b_mid_2.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid_2, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
            b_mid_2.position = position.clone();
            b_mid_2.position.x -= block_w;
            b_mid_2.position.y += mid_y;
            b_mid_2.position.z -= 1.2;
        grounds.push(b_mid_2);
    } else if (type == "_||^"){
        const b_mid = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 1.2 });
        b_mid.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
        b_mid.position = position.clone();
        b_mid.position.x += block_w;
        b_mid.position.y += mid_y;
        b_mid.position.z -= 1.2;
        grounds.push(b_mid);

        const connector_box = BABYLON.MeshBuilder.CreateBox("box", {width: 4, height: 0.2, depth: 0.8});
        connector_box.physicsImpostor = new BABYLON.PhysicsImpostor(connector_box, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
            connector_box.position = position.clone();
            connector_box.position.x += 0;
            connector_box.position.y += mid_y;
            connector_box.position.z += 0;
        grounds.push(connector_box);

        const b_mid_2 = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 1.2 });
        b_mid_2.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid_2, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
            b_mid_2.position = position.clone();
            b_mid_2.position.x -= block_w;
            b_mid_2.position.y += mid_y;
            b_mid_2.position.z += 1.2;
        grounds.push(b_mid_2);
    }
    // Old 7 
    else if(type == "_   "){
        const b_mid = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 0.8 });

        b_mid.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
        b_mid.position = position.clone();

        b_mid.position.y += mid_y;
        b_mid.position.x += 1.6;
        b_mid.position.z -= 1.6;

        grounds.push(b_mid);
    }
    else if (type === "^   "){
        const b_mid = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 0.8 });

        b_mid.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
        b_mid.position = position.clone();

        b_mid.position.y += mid_y;
        b_mid.position.x -= 1.6;
        b_mid.position.z -= 1.6;

        grounds.push(b_mid);
    }
    // Old 8 
    else if(type == "_--^"){ // connector L to R

        const b_mid = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 1.2 });
        b_mid.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
        b_mid.position = position.clone();
        b_mid.position.x += 1.2;
        b_mid.position.y += mid_y;
        b_mid.position.z -= 1.6;
        grounds.push(b_mid);

        const connector_box = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 4});
        connector_box.physicsImpostor = new BABYLON.PhysicsImpostor(connector_box, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
            connector_box.position = position.clone();
            connector_box.position.x += 0;
            connector_box.position.y += mid_y;
            connector_box.position.z += 0;
        grounds.push(connector_box);

        const b_mid_2 = BABYLON.MeshBuilder.CreateBox("box", {width: 1.2, height: 0.2, depth: 0.8 });
        b_mid_2.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid_2, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
            b_mid_2.position = position.clone();
            b_mid_2.position.x -= 1.2;
            b_mid_2.position.y += mid_y;
            b_mid_2.position.z += 1.6;
        grounds.push(b_mid_2);
    }
    else if (type == "^--_"){
        const b_mid = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 1.2 });
        b_mid.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
        b_mid.position = position.clone();
        b_mid.position.x += 1.6;
        b_mid.position.y += mid_y;
        b_mid.position.z += 1.2;
        grounds.push(b_mid);

        const connector_box = BABYLON.MeshBuilder.CreateBox("box", {width: 4, height: 0.2, depth: 0.8});
        connector_box.physicsImpostor = new BABYLON.PhysicsImpostor(connector_box, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
            connector_box.position = position.clone();
            connector_box.position.x += 0;
            connector_box.position.y += mid_y;
            connector_box.position.z += 0;
        grounds.push(connector_box);

        const b_mid_2 = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 1.2 });
        b_mid_2.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid_2, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
            b_mid_2.position = position.clone();
            b_mid_2.position.x -= 1.6;
            b_mid_2.position.y += mid_y;
            b_mid_2.position.z -= 1.2;
        grounds.push(b_mid_2);
    }
    // Old 9 
    else if(type == "   _"){ // [x]
        console.log("BOT LEFT CORNER")
        const b_mid = BABYLON.MeshBuilder.CreateBox("box", {width: 0.8, height: 0.2, depth: 0.8 });

        b_mid.physicsImpostor = new BABYLON.PhysicsImpostor(b_mid, BABYLON.PhysicsImpostor.BoxImpostor,  {mass:0,
            friction:0.5,
            restitution:0}, scene);
        b_mid.position = position.clone();
        //console.log(b_mid.position)
        b_mid.position.x += 1.6;
        b_mid.position.z += 1.6;
        b_mid.position.y += mid_y;
        console.log(b_mid.position)
        
        grounds.push(b_mid);
    }
}

function generateWinCondition(position, scene){
    const win_mesh = BABYLON.MeshBuilder.CreateBox("box", {width: 0.2, height: 4, depth: 4 });
    win_mesh.position = position.clone()
    win_mesh.position.x -= 1.6;
    win_mesh.position.y += 6;
    win_obj = win_mesh;
}

function generateLevel(scene){
    const tile_spacing = 4;
    // Place player start
    console.log("player")
    let i = level_1_start_pos[0];
    let j = level_1_start_pos[1];
    let tile_position = new BABYLON.Vector3(i * tile_spacing, 0.01, j * tile_spacing);
    placePlayer(tile_position, scene);
    // Create first jump on the right
    generateJumpingBoxes(tile_position, "   -", scene);
    
    // Place player end
    i = level_1_end_pos[0];
    j =level_1_end_pos[1];
    tile_position = new BABYLON.Vector3(i * tile_spacing, 0.01, j * tile_spacing);
    generateWinCondition(tile_position, scene);

    for(let i = 0; i < 8; i++){
        for(let j = 0; j < 8; j++){
            //console.log(i + " " + j)
            // Block type (eg building, road, start, end)
            let level_item = level_1[i][j];
            let building_height = building_heights[i][j];
            let tile_position = new BABYLON.Vector3(i * tile_spacing, 0.01, j * tile_spacing);
            
            // Jumping obstacle type
            let obstable_type = level_obstacle_types_1_str[i][j];
            
            // Safe road bit for start pos
            let safe = false;
            if(i == level_1_start_pos[0] && j == level_1_start_pos[1]){
                safe = true;
            }

            if(level_item === tile_types.ROAD_STRAIGHT){
                placeStraightRoad(tile_position, false, safe, scene);
                generateJumpingBoxes(tile_position, obstable_type, scene);
            }
            if(level_item === tile_types.ROAD_STRAIGHT_ROT){
                placeStraightRoad(tile_position, true, safe, scene);
                generateJumpingBoxes(tile_position, obstable_type, scene);
            }
            if(level_item == tile_types.ROAD_INTERSECTION){
                placeIntersection(tile_position, scene);
                generateJumpingBoxes(tile_position, obstable_type, scene);
            }
            if(level_item == tile_types.BUILDING){
                createBuilding(tile_position, scene, building_height);
            }
            /*if((level_item & tile_types.EXIT) == tile_types.EXIT){
                generateWinCondition(tile_position, scene);
            }*/
        }
    }
    
    for(let i = 0; i < 8; i++){
        for(let j = 0; j < 8; j++){
            
            let tile_position = new BABYLON.Vector3(i * tile_spacing, 2, j * tile_spacing);
            let level_item = level_1[i][j];
            // Jumping obstacle type
            let obstable_type = level_obstacle_types_2_str[i][j];

            if(level_item === tile_types.ROAD_STRAIGHT){
                generateJumpingBoxes(tile_position, obstable_type, scene);
            }
            else if(level_item === tile_types.ROAD_STRAIGHT_ROT){
                generateJumpingBoxes(tile_position, obstable_type, scene);
            }
            else if(level_item === tile_types.ROAD_INTERSECTION){
                generateJumpingBoxes(tile_position, obstable_type, scene);
            }
        }
    }
    for(let i = 0; i < 8; i++){
        for(let j = 0; j < 8; j++){
            
            let tile_position = new BABYLON.Vector3(i * tile_spacing, 4.01, j * tile_spacing);
            let level_item = level_1[i][j];
            // Jumping obstacle type
            let obstable_type = level_obstacle_types_3_str[i][j];

            if(level_item === tile_types.ROAD_STRAIGHT){
                generateJumpingBoxes(tile_position, obstable_type, scene);
            }
            if(level_item === tile_types.ROAD_STRAIGHT_ROT){
                generateJumpingBoxes(tile_position, obstable_type, scene);
            }
            if(level_item === tile_types.ROAD_INTERSECTION){
                generateJumpingBoxes(tile_position, obstable_type, scene);
            }
        }
    }
    
    console.log("END")
}

var createScene = async function () {
    
    engine.enableOfflineSupport = false; 
    // This creates a basic Babylon Scene object (non-mesh)
    var scene = new BABYLON.Scene(engine);

    var gravityVector = new BABYLON.Vector3(0,-9.81, 0);
    var physicsPlugin = new BABYLON.CannonJSPlugin();
    
    camera1 = new BABYLON.ArcRotateCamera("camera1", Math.PI/2, Math.PI/ 2.5 , 4, new BABYLON.Vector3(0, -5, 0), scene);
    //camera1 = new BABYLON.ArcRotateCamera("camera1", 0, 0, 10, new BABYLON.Vector3(0, -5, 0), scene);
    //camera1 = new BABYLON.FollowCamera("camera1", new BABYLON.Vector3(0, 0, 0), scene);
    //camera1 = new BABYLON.ArcFollowCamera("arcfollow", Math.PI / 2, Math.PI / 4, 10, null, scene);
    //camera1 = new BABYLON.UniversalCamera("UniversalCamera", new BABYLON.Vector3(0, 15, -15), scene);
    scene.activeCamera = camera1;
    //scene.activeCamera.attachControl(canvas, true);
    camera1.lowerRadiusLimit = 2;
    camera1.upperRadiusLimit = 10;
    camera1.wheelDeltaPercentage = 0.01;
    camera1.lowerAlphaLimit = -Number.MAX_VALUE;
    camera1.upperAlphaLimit = +Number.MAX_VALUE;
    var _cat_mesh = null

    _cat_mesh = await loadMesh("./meshes/", "StripeTheCat.glb", scene);
        console.log("Cat mesh")
        console.log(_cat_mesh)
        // This targets the camera to scene origin
    //camera.setTarget(BABYLON.Vector3.Zero());

    // This attaches the camera to the canvas
    camera1.attachControl(canvas, true);

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 0.7;

    scene.enablePhysics(gravityVector, physicsPlugin);
    
    /*
    createHouse(new BABYLON.Vector3(0, 0, -15), scene);
    loadCat(scene, camera1);

    createBuilding(new BABYLON.Vector3(0, 0, -15), scene);
    */

    generateLevel(scene);
    generateDummyCats(scene, _cat_mesh);

    //var ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 100, height: 100}, scene);
    //var ground = BABYLON.Mesh.CreateGround("ground", 100, 100, 2, scene);
    ground = BABYLON.MeshBuilder.CreateBox("box", {width: 100, height: 10, depth: 100}, scene);
    ground.position.y = -5;
    ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }, scene);

    
    scene.actionManager = new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {
        inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        //console.log(evt.sourceEvent.key);
    }));
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
        inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
    }));

    var music = new BABYLON.Sound("Music", "res/snd/462494__rucisko__busy-city-05.wav", scene, null, {
        loop: true,
        autoplay: true
      });

      const env = scene.createDefaultEnvironment();

    /*const xr = await scene.createDefaultXRExperienceAsync({
        floorMeshes: [env.ground]
    });*/

    return scene;
};

var engine;
var scene;
var sceneToRender = null;
var startRenderLoop = function (engine, canvas) {
    engine.runRenderLoop(function () {
        if (sceneToRender && sceneToRender.activeCamera) {
            sceneToRender.render();
        }
    });
}      

window.initFunction = async function() {
           
    var asyncEngineCreation = async function() {
        try {
        return createDefaultEngine();
        } catch(e) {
        console.log("the available createEngine function failed. Creating the default engine instead");
        return createDefaultEngine();
        }
    }

    window.engine = await asyncEngineCreation();
    if (!engine) throw 'engine should not be null.';
    startRenderLoop(engine, canvas);
    window.scene = createScene();
};

initFunction().then(() => {scene.then(returnedScene => { sceneToRender = returnedScene; });});

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

// Cookies om nom
let cookie_name = getCookie("player_name");
let cookie_uuid = getCookie("player_id");
if(cookie_name != ""){
    player_name = cookie_name;
    document.getElementById("start-container").style.visibility = "hidden";
}
if(cookie_uuid != ""){
    uuid = cookie_uuid;
} else {
    uuid = UUIDGeneratorBrowser();
}

function showWinnerBox(winner){
    // Show winner box
    document.getElementById("other-win-container").style.visibility = "visible";
    document.getElementById("winner-header").textContent = "Game over. " + winner + " wins!";
}

// SOCKETS
// Join!
join_data = {message: "Hello", player_id: uuid, player_name: "Test Player" };
socket.emit("join", join_data)

// A player updates
socket.on("player_update", function(data){
    updateDummyCat(data.uuid, data.position, data.rotation);
});

// A player joins (including self) - Get all players
socket.on("join", function(data){
    console.log("Other player joined");
    registerCats(data.players);
    let game_state = data.game_state;
    if(game_state == "ended"){
        showWinnerBox(data.leaderboard[0].player_name)
    }
})

// Remove a player if they leave
socket.on("quit", function(data){
    console.log("other player quit");
    unregisterCat(data.player_id);
})

socket.on('current_players', function(data){
    console.log("Checking players");  
})

// Player sets name, update uuid
socket.on('new_name', function(data){
    updateNetworkPlayerName(data.uuid, data.name);
})

// Player finished - update leaderboard
socket.on('player_finished', function(data){
    let leaderboard = data;
    updateLeaderboard(leaderboard);
    playTada();
})

// On game over (all players finish) - show game over box
socket.on('game_over', function(data){
    let leaderboard = data;
    updateLeaderboard(leaderboard);
    playTada();
    let winner = leaderboard[0].player_name;
    showWinnerBox(winner);
})

// Reload window when game restarted
socket.on("restart-game", function(data){
    window.location.reload();
})

// On Quit
addEventListener('beforeunload', (event) => {socket.emit("quit", {player_id: uuid})});



function resetGame(){
    socket.emit('game-restart', {});
    window.location.reload();
}

// On game restart click btn
document.getElementById("restart-ok").onclick = function(){
    resetGame();
}

function resetGame(){
    socket.emit('game-restart', {});
    window.location.reload();
}

/* TESTING 
setTimeout(function(){
    socket.emit('player-finishes', {player_name: player_name, uuid: uuid})
}, 4000); */

// Resize
window.addEventListener("resize", function () {
    engine.resize();
});