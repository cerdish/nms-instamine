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

    depotLocation.translateOnAxis(mineAxis.z, (depotsPerRow/2) * floorWidth * setup.depotScale);
    depotLocation.translateOnAxis(mineAxis.x, (-3 * floorWidth - (floorWidth / 2)) * setup.depotScale);
    depotLocation.translateOnAxis(mineAxis.y, wallHeight * 10);

    return depotLocation;
}

function createMine(setup, base){
    let parts = [];

    let userData = (setup.userData || 0) * 1;

    let materialHotspotVector = new THREE.Vector3().fromArray(setup.materialHotspotVector.split(",").map(Number)).normalize();
    let materialHotspotPosition = new THREE.Vector3().fromArray(setup.materialHotspotPosition.split(",").map(Number));
    let powerHotspotPosition = new THREE.Vector3().fromArray(setup.powerHotspotPosition.split(",").map(Number));

    let mineAxis = getMineAxis(materialHotspotVector, materialHotspotPosition, powerHotspotPosition);

    //create the spawn locations
    let generatorLocation = createLocation(setup.powerHotspotPosition, materialHotspotVector, mineAxis.z);
    //calculate generators needed to power the tower
    let powerPerGenerator = powerHotspotMax * (setup.powerHotspotEfficiency / 100);
    //add 20 for the teleporter
    let generatorCount = (Math.ceil((extractorPowerUse * setup.collectionPointCount * setup.extractorDensity) + 20) / powerPerGenerator);

    let extractorLocation = createLocation(materialHotspotPosition, mineAxis.x, mineAxis.z);

    let depotLocation = findFirstDepotLocation(setup, materialHotspotPosition, mineAxis);
    let masterDepotLocation = depotLocation.dup();
    masterDepotLocation.translateOnAxis(mineAxis.x, setup.depotScale * floorWidth * -1);

    let firstDepotPos = depotLocation.position.clone();

    let extractor = false;
    let prevExtractor = false;
    let depot = false;
    let generator = false;

    let depotRowCount = Math.ceil(setup.collectionPointCount / depotsPerRow);
    
    //add the generators
    for(let i = 0; i < generatorCount; i++){
        generator = new nmsBasePart("^U_GENERATOR_S", userData).applyLocation(generatorLocation);

        parts.push(generator);
    }

    for(let i = 0; i < setup.collectionPointCount; i++){
        for(let j = 0; j < setup.extractorDensity; j++){
            extractor = new nmsBasePart("^U_EXTRACTOR_S", userData, false, false).applyLocation(extractorLocation);
            if(setup.includeExtractors) parts.push(extractor);
        }
        
        for(let j = 0; j < setup.depotDensity; j++){
            depot = new nmsBasePart("^U_SILO_S", userData).applyLocation(depotLocation);
            if(setup.includeDepots) parts.push(depot);
        }

        //here set up the master depot location
        if(i % (depotsPerRow * depotsPerRow) == 0 && setup.includeMasterDepots){
            parts.push(new nmsBasePart("^U_SILO_S", userData).applyLocation(masterDepotLocation));

            parts = parts.concat(wireTo(masterDepotLocation.position, depot.Position, "^U_POWERLINE"));
        }

        if(setup.includeWires && setup.includeMasterDepots) parts = parts.concat(wireTo(depot.pipePos, getMasterCollectionPos(masterDepotLocation.position, i % (depotsPerRow * depotsPerRow), mineAxis), "^U_PIPELINE"));

        if(setup.includeWires) parts = parts.concat(wireTo(extractor.pipePos, depot.pipePos, "^U_PIPELINE"));

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

    let floorCount = Math.ceil(depotRowCount / depotsPerRow);
    let floorScale = (depotsPerRow + 2) * setup.depotScale;
    let floorSize = (depotsPerRow + 2) * floorWidth * setup.depotScale;
    let locator = createLocation(firstDepotPos, mineAxis.y.clone().negate(), mineAxis.z, floorScale, floorScale);

    locator.translateOnAxis(mineAxis.z, (floorSize / 2) - 3 * floorWidth / 2 * setup.depotScale);
    locator.translateOnAxis(mineAxis.x, (floorSize / 2) - 3 * floorWidth / 2 * setup.depotScale);

    let floor = new nmsBasePart(setup.floorObjectID, userData, false, false, false, 0).applyLocation(locator);

    for(let i = 0; i < floorCount + 1; i++){
        parts.push(floor.clone());

        if(setup.includeRoof && i < floorCount) parts.push(floor.clone(setup.roofObjectID).invertUp().translateOnAxis(mineAxis.y, wallHeight * 2 * setup.depotScale));
        
        parts.push(floor.clone("^CUBEFRAME").translateOnAxis(mineAxis.y, floorScale * -0.1).scale(1.3));
        
        floor.translateOnAxis(mineAxis.z, floorSize);
    }
    
    let landingPadWidth = floorWidth * 5;

    let landingPad = floor.clone("^BUILDLANDINGPAD").invertAt().translateOnAxis(mineAxis.z, (floorSize + (floorSize / 2)) * -1).translateOnAxis(mineAxis.y, wallHeight / 4 * -1).translateOnAxis(mineAxis.z, landingPadWidth / 2).invertUp().normalize();

    parts.push(landingPad.clone().translateOnAxis(mineAxis.x, landingPadWidth / 2));
    parts.push(landingPad.clone().translateOnAxis(mineAxis.x, landingPadWidth / 2 * -1));

    landingPad.translateOnAxis(mineAxis.z, landingPadWidth);

    parts.push(landingPad.clone().translateOnAxis(mineAxis.x, landingPadWidth / 2));
    parts.push(landingPad.clone().translateOnAxis(mineAxis.x, landingPadWidth / 2 * -1));

    let teleport = floor.clone("^TELEPORTER").invertAt().invertUp().translateOnAxis(mineAxis.z, (floorSize / -2) - 8).normalize().scale(5).translateOnAxis(mineAxis.y, -2);
    
    parts.push(teleport);
    
    if(setup.includeWires) parts = parts.concat(wireTo(generator.powerPos, teleport.powerPos, "^U_POWERLINE", 300));

    addTimestamps(parts);

    if(setup.base){
        base = JSON.parse(setup.base);

        if(setup.baseName) base.Name = setup.baseName;

        if(setup.removeCurrentBaseParts){
            let baseComputer = _.find(base.Objects, {ObjectID:"^BASE_FLAG"});
            base.Objects = [baseComputer];
        }

        base.Objects = base.Objects.concat(parts);

        return base;
    }

    return parts;
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
    let timestamp = (new Date() / 1000) - (60*60*24)

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

    setup.powerHotspotEfficiency = 100;
    setup.collectionPointCount = 10;

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