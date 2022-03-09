import { NmsBasePart } from "./nmsBasePart";
import * as THREE from 'three'
import * as _ from 'lodash'
import { NmsBase } from "./NmsBase";

const maxWireLen = 999;

function createPlatforms(cursor, scale, count, floorObjectID, foundationObjectID){
    let floor = cursor.clone(floorObjectID).scaleTo(scale);

    let y = floor.up.normalize();
    let z = floor.at.normalize();

    floor.translateOnAxis(y, floor.height / -2);

    let foundation = floor.clone(foundationObjectID);
    foundation.scale(floor.width / foundation.width)
    foundation.translateOnAxis(y, foundation.height * -1);

    let parts = [];

    for(let i = 0; i < count; i++){
        if(floorObjectID) parts.push(floor.clone());
        if(foundationObjectID) parts.push(foundation.clone());

        floor.translateOnAxis(z, floor.width);
        foundation.translateOnAxis(z, floor.width);
    }

    return parts;
}

function addTimestamps(objects){
    let timestamp = (new Date() / 1000) - (60*60*24*7)
    //let timestamp = Math.round((new Date() / 1000) - (60*60))

    for(let i = 0; i < objects.length; i++){
        let o = objects [i];

        o.Timestamp = timestamp;

        timestamp = timestamp + 1;
    }

    return objects;
}

function extractPart(base, ObjectID){
    let part = _.find(base.Objects, {ObjectID:ObjectID});

    if(!part) return false;

    part = new NmsBasePart(part.ObjectID, part.UserData, part.Position, part.Up, part.At);

    return part;
}

function createWire(startPos, endPos, ObjectID, lenLimit){
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

        let wire = new NmsBasePart(ObjectID, 0);
        wire.Position = [segmentStart.position.x, segmentStart.position.y, segmentStart.position.z];
        wire.At = [wireAtVector.x, wireAtVector.y, wireAtVector.z];

        //console.log(segmentStart.position.distanceTo(segmentEnd.position))

        wires.push(wire);

        segmentStart.translateOnAxis(wireAtVector.normalize(), lenLimit);
        segmentEnd.translateOnAxis(wireVector, lenLimit);
    }

    return wires;
}

function createMultiWire(positions, ObjectID, lenLimit){
    let wires = [];
    
    for(let i = 0; i < positions.length - 1; i++){
        wires = wires.concat(createWire(positions[i], positions[i + 1], ObjectID, lenLimit));
    }

    return wires;
}

function createWalls(corner1, corner2, axies, scale, wallObjectID, doorObjectID){
    let lengthC = corner1.position.distanceTo(corner2.position);
    let angleB = new THREE.Vector3().subVectors(corner1.position, corner2.position).normalize().angleTo(axies.x);
    let lengthA = Math.abs(lengthC * Math.cos(angleB));
    let lengthB = Math.abs(lengthA * Math.tan(angleB));

    let wallX = corner1.clone(wallObjectID).scaleTo(scale);
    let wallZ = wallX.clone().rotateOnAxis(axies.y, 90);
    
    wallX.translateOnAxis(axies.x, wallX.width / 2);
    wallZ.translateOnAxis(axies.z, wallX.width / 2);

    let wallsX1 = createWall(wallX, lengthA * -1);
    let wallsZ1 = createWall(wallZ, lengthB * -1);

    let wallsX2 = createWall(wallX.translateOnAxis(axies.z, lengthB), lengthA * -1);
    let wallsZ2 = createWall(wallZ.translateOnAxis(axies.x, lengthA), lengthB * -1);

    let xWallCount = wallsX2.length;
    let centerWallIndexes = [];

    let centerWallIndex = xWallCount / 2;

    if(xWallCount % 2 == 0){
        centerWallIndexes = [centerWallIndex, centerWallIndex - 1];
    }else{
        centerWallIndexes = [Math.floor(centerWallIndex)]
    }

    for(let i = 0; i < centerWallIndexes.length; i++){
        wallsX2[centerWallIndexes[i]] = wallsX2[centerWallIndexes[i]].clone(doorObjectID);
        wallsX1[centerWallIndexes[i]] = wallsX1[centerWallIndexes[i]].clone(doorObjectID);
    }

    return wallsX1.concat(wallsX2, wallsZ1, wallsZ2);
}

function createWall(wall, length){
    let count = Math.ceil(Math.round(Math.abs(length / wall.width) * 100) / 100);

    if(length < 0){
        length += wall.width
    }else{
        length -= wall.width
    }

    return wall.cloneOnAxis(wall.getAxies().x, count, 0, length);
}

function createSpaceport(cursor, scale, generator){
    cursor = cursor.clone().normalize();

    let base = new NmsBase();
    let axies = cursor.getAxies();

    base.addParts(createPlatforms(cursor, scale, 1, "^T_FLOOR", "^CUBEFRAME"));

    let landingPad = cursor.clone("^BUILDLANDINGPAD").translateOnAxis(axies.y, cursor.height / -4);
    
    base.addParts(landingPad.cloneOnCircle(4, cursor.width * 3.5, axies.y, -45));
    
    let teleport = cursor.clone("^TELEPORTER").invertAt().translateOnAxis(axies.z, (cursor.width * scale / 2) - (cursor.width * 0.5)).scale(5).translateOnAxis(axies.y, -2);
    
    base.addParts(teleport);
    
    if(generator) base.addParts(createWire(generator.powerPos, teleport.powerPos, "^U_POWERLINE", 400));
    
    base.addParts(cursor.clone("^BASE_TREE02").setUserData(0).scale(4).cloneOnCircle(4, 7 * cursor.width, axies.y, -45, true));
    base.addParts(cursor.clone("^BUILDDOOR_WATER").invertAt().scale(1.5).rotateOnAxis(axies.x,90).translateOnAxis(axies.z, 1.7 * -1.5).cloneOnCircle(4, 7.05 * cursor.width, axies.y, -45, false, axies.z));
    
    return base.Objects;
}

export { createPlatforms, addTimestamps, extractPart, createWire, createMultiWire, createWalls, createSpaceport };