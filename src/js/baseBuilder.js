import * as THREE from 'three';
import * as _ from 'lodash';
import {nmsBasePart} from '/src/js/nmsBasePart.js';

const wallHeight = 3.3333333333;
const floorWidth = 5.3333333333;
const pipeWidth = 0.3333333333;

const powerHotspotMax = 299;
const extractorPowerUse = 50;

const maxWireLen = 999;

const depotsPerRow = 10;

function createLocation(position, up, at, scaleX, scaleY){
    if(!scaleX) scaleX = 1;
    if(!scaleY) scaleY = 1;

    let location = new THREE.Object3D();
    location.at = new THREE.Vector3();

    location.position.fromArray(createVector(position).toArray());

    location.up.fromArray(createVector(up).toArray()).normalize().multiplyScalar(scaleY);
    location.at.fromArray(createVector(at).toArray()).normalize().multiplyScalar(scaleX);

    location.dup = function(){
        return createLocation(location.position, location.up, location.at);
    }

    return location;
}

function createVector(vector){
    let newVector = new THREE.Vector3();

    if(typeof vector == 'undefined') return newVector;

    if(vector.isVector3){
        newVector = new THREE.Vector3().fromArray(vector.toArray());
    }

    if(arguments.length == 3){
        vector = [arguments[0], arguments[1], arguments[2]];
    }

    if(arguments.length == 2){
        newVector = new THREE.Vector3().subVectors(arguments[0], arguments[1]);
    }
    
    if(_.isArray(vector)){
        if(vector.length ==2){
            newVector = new THREE.Vector3().subVectors(vector[0], vector[1]);
        }else{
            newVector = new THREE.Vector3().fromArray(vector);
        }
    }

    if(_.isString(vector)){
        newVector = new THREE.Vector3().fromArray(vector.split(",").map(Number));
    }
    
    return newVector;
}

function getMineAxis(materialHotspotVector, materialHotspotPosition, powerHotspotPosition){
    let axis = {
        x: new THREE.Vector3(),
        y: new THREE.Vector3().fromArray(materialHotspotVector.toArray()).normalize(),
        z: new THREE.Vector3()
    };

    //draw a triangle between the extractors and the generators, this can be used to calculate the normal which we will use to place the extractors
    let triangleCompletionPoint1 = createLocation(materialHotspotPosition, [0,0,0], [0,0,0]);
    triangleCompletionPoint1.translateOnAxis(axis.y, 500);
    
    let alignmentTriangle1 = new THREE.Triangle(materialHotspotPosition, powerHotspotPosition, triangleCompletionPoint1.position);

    alignmentTriangle1.getNormal(axis.x).normalize();

    axis.z.fromArray(axis.x.toArray());

    axis.z.applyAxisAngle(axis.y, 90 * (Math.PI / 180));

    //console.log(axis)

    return axis;
}

function findFirstDepotLocation(setup, materialHotspotPosition, mineAxis){
    let depotPosition = materialHotspotPosition;

    if(setup.depotPosition){
        depotPosition = new THREE.Vector3().fromArray(setup.depotPosition.split(",").map(Number));
    }

    let depotLocation = createLocation(depotPosition, mineAxis.y, mineAxis.z, setup.depotScale, setup.depotScale);

    if(setup.depotPosition) return depotLocation;

    depotLocation.translateOnAxis(mineAxis.z, (depotsPerRow) * floorWidth * setup.depotScale);
    depotLocation.translateOnAxis(mineAxis.x, (-3 * floorWidth - (floorWidth / 2)) * setup.depotScale);
    depotLocation.translateOnAxis(mineAxis.y, wallHeight * depotsPerRow);

    return depotLocation;
}

function createMine(setup, base){
    let parts = [];

    let userData = (setup.userData || 0) * 1;

    let materialHotspotVector = new THREE.Vector3().fromArray(setup.materialHotspotVector.split(",").map(Number)).normalize();
    let materialHotspotPosition = new THREE.Vector3().fromArray(setup.materialHotspotPosition.split(",").map(Number));
    let powerHotspotPosition = new THREE.Vector3().fromArray(setup.powerHotspotPosition.split(",").map(Number));

    let mineAxis = getMineAxis(materialHotspotVector, materialHotspotPosition, powerHotspotPosition);

    //console.log(mineAxis);

    //calculate generators needed to power the tower
    let powerPerGenerator = powerHotspotMax * (setup.powerHotspotEfficiency / 100);
    //add 20 for the teleporter
    let generatorCount = (Math.ceil((extractorPowerUse * setup.collectionPointCount * setup.extractorDensity) + 20) / powerPerGenerator);

    let extractorLocation = createLocation(materialHotspotPosition, mineAxis.x, mineAxis.z);

    let depotLocation = findFirstDepotLocation(setup, materialHotspotPosition, mineAxis);
    let masterDepotLocation = depotLocation.dup();
    masterDepotLocation.translateOnAxis(mineAxis.x, setup.depotScale * floorWidth * -1);
    masterDepotLocation.translateOnAxis(mineAxis.z, setup.depotScale * floorWidth * 10);

    let firstDepotPos = depotLocation.position.clone();

    let extractor = false;
    let prevExtractor = false;
    let depot = false;

    let depotRowCount = Math.ceil(setup.collectionPointCount / depotsPerRow);
    
    //add the generators
    let generator = new nmsBasePart("^U_GENERATOR_S", userData, setup.powerHotspotPosition, materialHotspotVector, mineAxis.z, 0.01);

    for(let i = 0; i < generatorCount; i++){
        parts.push(generator);

        generator = generator.clone();
    }

    //let towerHeight = wallHeight * setup.collectionPointCount;
    //let partHeight = wallHeight * 2;

    //let towerScale = Math.max(towerHeight / partHeight , 16);

    //parts.push(new nmsBasePart("^S_ANTENNA1", userData, materialHotspotPosition, mineAxis.y, mineAxis.z, 0).translateOnAxis(mineAxis.y, wallHeight / -4).scale(towerScale));

    for(let i = 0; i < setup.collectionPointCount; i++){
        for(let j = 0; j < setup.extractorDensity; j++){
            extractor = new nmsBasePart("^U_EXTRACTOR_S", userData, false, false, false, 0.01).applyLocation(extractorLocation).scale(2);
            if(setup.includeExtractors) parts.push(extractor);
        }
        
        for(let j = 0; j < setup.depotDensity; j++){
            depot = new nmsBasePart("^U_SILO_S", userData, false, false, false, 0.01).applyLocation(depotLocation);
            if(setup.includeDepots) parts.push(depot);
        }

        //here set up the master depot location
        if(i % (depotsPerRow * depotsPerRow) == 0 && setup.includeMasterDepots){
            parts.push(new nmsBasePart("^U_SILO_S", userData).applyLocation(masterDepotLocation));

            parts.push(new nmsBasePart("^U_POWERLINE", userData).applyLocation(masterDepotLocation));
        }

        
        if(setup.includeWires){
            parts = parts.concat(wireTo(extractor.pipePos, depot.pipePos, "^U_PIPELINE"));
            
            if(setup.includeMasterDepots) parts = parts.concat(wireTo(depot.Position, getMasterCollectionPos(masterDepotLocation.position, i % (depotsPerRow * depotsPerRow), mineAxis), "^U_PIPELINE"));
        }

        if(i == 0){
            if(setup.includeWires) parts = parts.concat(wireTo(generator.powerPos, extractor.powerPos, "^U_POWERLINE", 300));
        }else{
            if(setup.includeWires) parts = parts.concat(wireTo(extractor.powerPos, prevExtractor.powerPos, "^U_POWERLINE"));
        }

        //we don't move it on the last run so that we can get the correct bounding box for the depots (for adding floors)
        if(i < setup.collectionPointCount -1){
            //move the spawn points
            //at the end of each row we do this
            if((i + 1) % depotsPerRow == 0){
                depotLocation.translateOnAxis(mineAxis.z, floorWidth * setup.depotScale);
                depotLocation.translateOnAxis(mineAxis.x, (depotsPerRow - 1) * floorWidth * setup.depotScale * -1);
            }else{
                //if it's not the end of a row we do this
                depotLocation.translateOnAxis(mineAxis.x, floorWidth * setup.depotScale);
            }
            
            //every 100 we do this
            if((i + 1) % (depotsPerRow * depotsPerRow) == 0){
                depotLocation.translateOnAxis(mineAxis.z, floorWidth * 2 * setup.depotScale);

                masterDepotLocation.translateOnAxis(mineAxis.z, (depotsPerRow + 2) * floorWidth * setup.depotScale);
            }
        }
        
        extractorLocation.translateOnAxis(mineAxis.y, wallHeight);

        prevExtractor = extractor;
    }

    let blockCount = Math.ceil(depotRowCount / depotsPerRow);
    let blockScale = (depotsPerRow + 2) * setup.depotScale;
    let blockWidth = blockScale * floorWidth;
    let blockPlaceholder = new nmsBasePart(setup.floorObjectID, userData, firstDepotPos, mineAxis.y, mineAxis.z).scale(blockScale).translateOnAxis(mineAxis.z, (blockWidth / 2) - 3 * floorWidth / 2 * setup.depotScale).translateOnAxis(mineAxis.x, (blockWidth / 2) - 3 * floorWidth / 2 * setup.depotScale);

    let roofObjectID = setup.includeRoof ? setup.roofObjectID : false;
    let wallObjectID = setup.includeWalls ? "^T_WALL_WIN3" : false;

    parts = parts.concat(getNewBlock(blockPlaceholder.Position, mineAxis.y, mineAxis.z, blockCount, setup.depotScale, setup.floorObjectID, roofObjectID, wallObjectID, userData));

    blockPlaceholder.translateOnAxis(mineAxis.z, blockWidth * blockCount);

    let terminal = new nmsBasePart("^BUILDTERMINAL", userData, blockPlaceholder.Position, mineAxis.y, mineAxis.z.clone().negate()).translateOnAxis(mineAxis.z, ((blockWidth / 2) + (floorWidth / 4)) * -1);
    parts.push(terminal);
    parts.push(terminal.clone("^BUILDSAVE").translateOnAxis(mineAxis.z, floorWidth / 2).rotateOnAxis(mineAxis.y, 180).translateOnAxis(mineAxis.x, floorWidth / 4));
    if(setup.removeCurrentBaseParts) parts.push(terminal.clone("^BASE_FLAG").translateOnAxis(mineAxis.z, floorWidth / 2).rotateOnAxis(mineAxis.y, 225).setUserData(0).translateOnAxis(mineAxis.x, floorWidth / -4))

    if(setup.includeFarm){
        let bioScale = 1.5;
        let bioRadius = 4.5;
        let bioStep = (bioRadius - (wallHeight / 8)) / setup.farm.length;

        let farmPlaceholder = blockPlaceholder.clone().translateOnAxis(mineAxis.x, (blockWidth / 2 + 6 * bioScale));

        //parts = parts.concat(getNewBlock(farmPlaceholder.Position, mineAxis.y, mineAxis.z, 1, setup.depotScale, setup.floorObjectID, false, false, userData));

        let dome = farmPlaceholder.clone("^BIOROOM").normalize().scale(bioScale).translateOnAxis(mineAxis.y, -0.45);
        parts.push(dome);
        parts.push(dome.clone("^FOUNDATION"));

        if(setup.includeWires) parts = parts.concat(wireTo(dome.powerPos, generator.powerPos, "^U_POWERLINE", 300));
        
        let door = dome.clone("^DOOR2").translateOnAxis(mineAxis.x, 6 * -bioScale).translateOnAxis(mineAxis.y, 0.25 * bioScale).setAt(mineAxis.x).normalize().scale(bioScale).invertAt();
        parts.push(door);
        parts.push(door.clone().translateOnAxis(mineAxis.x, 6 * bioScale * 2).invertAt());

        let plant = dome.clone("^GRAVPLANT").normalize();
        for(let j = 0; j < setup.farm.length; j++){
            let item = setup.farm[j];

            parts = parts.concat(plant.clone(item.ObjectID).cloneOnCircle(item.count, (bioRadius - (bioStep * j)) * -1, mineAxis.y, 0, true));
        }
    }
    
    if(setup.includePark){
        parts = parts.concat(getNewBlock(blockPlaceholder.Position, mineAxis.y, mineAxis.z, 1, setup.depotScale, setup.floorObjectID, false, false, userData));

        parts = parts.concat(blockPlaceholder.clone("^S_RUG0").normalize().scale(4).cloneOnCircle(4, floorWidth * 1.5, mineAxis.y, 0, true, mineAxis.x));
        let fire = blockPlaceholder.clone("^BASE_LAVA3").rotateOnAxis(mineAxis.x, 30).normalize().translateOnAxis(mineAxis.y, -0.75).scale(2);
        parts = parts.concat(fire.cloneOnCircle(5, 1.5, mineAxis.y, 0, true, mineAxis.z));

        parts = parts.concat(blockPlaceholder.clone("^BUILDSOFA").rotateOnAxis(mineAxis.y,180).normalize().cloneOnCircle(8, floorWidth * 1.25, mineAxis.y, -45, true, mineAxis.z));
        parts = parts.concat(blockPlaceholder.clone("^BASE_COLDPLANT3").cloneOnCircle(4, 5 * floorWidth, mineAxis.y, -45, true));
        
        blockPlaceholder.translateOnAxis(mineAxis.z, blockWidth);
    }

    if(setup.includeLandingPads){
        parts = parts.concat(getNewBlock(blockPlaceholder.Position, mineAxis.y, mineAxis.z, 1, setup.depotScale, setup.floorObjectID, false, false, userData));

        let landingPad = blockPlaceholder.clone("^BUILDLANDINGPAD").invertAt().normalize().translateOnAxis(mineAxis.y, wallHeight / -4);
    
        parts = parts.concat(landingPad.cloneOnCircle(4, floorWidth * 3.5, mineAxis.y, -45));
    
        let teleport = blockPlaceholder.clone("^TELEPORTER").invertAt().translateOnAxis(mineAxis.z, (blockWidth / 2) - (floorWidth * 0.5)).normalize().scale(5).translateOnAxis(mineAxis.y, -2);
        
        parts.push(teleport);
        
        if(setup.includeWires) parts = parts.concat(wireTo(generator.powerPos, teleport.powerPos, "^U_POWERLINE", 300));

        blockPlaceholder.translateOnAxis(mineAxis.z, blockWidth);
    }

    addTimestamps(parts);

    if(setup.base){
        base = JSON.parse(setup.base);

        if(setup.baseName) base.Name = setup.baseName;

        if(setup.removeCurrentBaseParts){
            //let baseComputer = _.find(base.Objects, {ObjectID:"^BASE_FLAG"});
            base.Objects = [];
        }

        base.Objects = base.Objects.concat(parts);

        return base;
    }

    return parts;
}

function getNewBlock(position, up, at, count, scale, floorObjectID, roofObjectID, wallObjectID, userData){
    var block = [];

    var blockWidth = floorWidth * (depotsPerRow + 2) * scale

    var floor = new nmsBasePart(floorObjectID || "^T_FLOOR", userData, position, up, at).normalize().invertUp().scale(depotsPerRow + 2).scale(scale);
    
    var axis = {
        x:false,
        y: floor.toObject3D().up.clone().negate().normalize(),
        z: floor.toObject3D().at.clone().normalize()
    };

    axis.x = axis.y.clone().applyAxisAngle(axis.z, 90 * Math.PI / 180);

    for(let i = 0; i < count; i++){
        block.push(floor.clone());
        
        block.push(floor.clone("^CUBEFRAME").scale(1.3).translateOnAxis(axis.y, -0.1));
    
        if(roofObjectID){
            block.push(floor.clone(roofObjectID).invertUp().translateOnAxis(axis.y, wallHeight * 2 * scale));
        }

        floor.translateOnAxis(axis.z, blockWidth);
    }

    if(wallObjectID){
        let wallCountX = (depotsPerRow / 2) + 1;
        let wallCountZ = (depotsPerRow * count / 2) + 1;
    
        let wall = new nmsBasePart(wallObjectID, userData, position, up, at).normalize().scale(2 * scale).translateOnAxis(axis.z, blockWidth / -2 * scale).translateOnAxis(axis.x, (blockWidth / 2 - floorWidth) * scale * -1);
    
        for(let i = 0; i < wallCountX; i++){
            block.push(wall.clone());
    
            if(i == 2 || i == 3){
                block.push(wall.clone("^T_DOOR").translateOnAxis(axis.z, blockWidth * count));
            }else{
                block.push(wall.clone().translateOnAxis(axis.z, blockWidth * count));
            }
    
            wall.translateOnAxis(axis.x, floorWidth * 2);
        }
        
        wall.setAt(axis.x.clone().multiplyScalar(2).toArray());
        wall.translateOnAxis(axis.x, floorWidth * -1).translateOnAxis(axis.z, floorWidth);
    
        for(let i = 0; i < wallCountZ; i++){
            block.push(wall.clone());
            block.push(wall.clone().translateOnAxis(axis.x, blockWidth * -1));
    
            wall.translateOnAxis(axis.z, floorWidth * 2);
        }
    }

    return block;
}

function getMasterCollectionPos(position, index, axis){
    let rowNum = 0;
    let colNum = 0;

    if(index){
        rowNum = Math.floor(index / 10);
        colNum = index - (rowNum * 10);
    }

    let obj = new THREE.Object3D();

    obj.position.fromArray(position.toArray())

    obj.translateOnAxis(axis.x, 4.5 * pipeWidth * -1);
    obj.translateOnAxis(axis.z, 4.5 * pipeWidth * -1);

    obj.translateOnAxis(axis.z, rowNum * pipeWidth);
    obj.translateOnAxis(axis.x, colNum * pipeWidth);

    return obj.position;
}

function getCenter(pos1, pos2){
    let vectorToCenter = new THREE.Vector3().subVectors(pos2, pos1).normalize();

    let totalDistance = pos1.distanceTo(pos2);

    let obj = new THREE.Object3D();
    obj.position.fromArray(pos1.toArray());
    
    obj.translateOnAxis(vectorToCenter, totalDistance/2);

    return obj.position;
}

function wireTo(startPos, endPos, ObjectID, lenLimit){
    if(!lenLimit) lenLimit = maxWireLen;

    if(_.isArray(startPos)) startPos = new THREE.Vector3().fromArray(startPos);
    
    if(_.isArray(endPos)) endPos = new THREE.Vector3().fromArray(endPos);

    let segmentStart = new THREE.Object3D();
    segmentStart.position.fromArray(startPos.toArray());

    let segmentEnd = segmentStart.clone();
    
    let wireEnd = new THREE.Object3D();
    wireEnd.position.fromArray(endPos.toArray());

    let wireVector = new THREE.Vector3().subVectors(endPos, startPos).normalize();

    segmentEnd.translateOnAxis(wireVector, lenLimit + 1);
    wireEnd.translateOnAxis(wireVector, 1);

    let totalWireLen = startPos.distanceTo(endPos);
    let wireCount = Math.ceil(totalWireLen / lenLimit);

    let wires = [];

    for(var i = 0; i < wireCount; i++){
        if(i >= wireCount - 1){
            //last run we wire to the final point
            segmentEnd = wireEnd;

            //console.log("end found")
        }

        let wireAtVector = new THREE.Vector3().subVectors(segmentEnd.position, segmentStart.position);

        let wire = new nmsBasePart(ObjectID, 0);
        wire.Position = [segmentStart.position.x, segmentStart.position.y, segmentStart.position.z];
        wire.At = [wireAtVector.x, wireAtVector.y, wireAtVector.z];

        //console.log(segmentStart.position.distanceTo(segmentEnd.position))

        wires.push(wire);

        segmentStart.translateOnAxis(wireAtVector.normalize(), lenLimit);
        segmentEnd.translateOnAxis(wireVector, lenLimit);
    }

    return wires;
}

function addTimestamps(objects){
    let timestamp = (new Date() / 1000) - (60*60*24*7)

    for(let i = 0; i < objects.length; i++){
        let o = objects [i];

        o.Timestamp = timestamp;

        timestamp = timestamp + 30;
    }

    return objects;
}

function exctractMineSetup(base){
    let setup = {};

    let extractor = _.find(base.Objects, {ObjectID:"^U_EXTRACTOR_S"});

    let generator = _.find(base.Objects, {ObjectID:"^U_GENERATOR_S"});

    let depot = _.find(base.Objects, {ObjectID:"^U_SILO_S"});

    setup.materialHotspotPosition = extractor.Position.join(",");
    setup.materialHotspotVector = extractor.Up.join(",");

    setup.powerHotspotPosition = generator.Position.join(",");

    //setup.powerHotspotEfficiency = 100;
    //setup.collectionPointCount = 10;

    setup.baseName = base.Name

    setup.base = JSON.stringify(base, null, 2);

    if(depot){
        setup.depotPosition = depot.Position.join(",");
    }else{
        setup.depotPosition = "";
    }

    return setup;
}

export { createMine, exctractMineSetup, createLocation };