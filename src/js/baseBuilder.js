import * as THREE from 'three';
import * as _ from 'lodash';

const extractorSpacing = 3.3333333333;
const depotSpacing = 5.3333333333;

const powerHotspotMax = 315;
const extractorPowerUse = 50;

const extractorDensity = 1;
const depotDensity = 1;

const maxWireLen = 180;

const powerOffsets = {
    "^U_EXTRACTOR_S":[0, 0.3, -1.2]
}

class nmsBasePart{
    Timestamp = 0;
    ObjectID = 0;
    UserData = 0;
    Position = [0, 0, 0];
    Up = [0, 1, 0];
    At = [0, 1, 0];

    constructor(ObjectID, UserData){
        this.ObjectID = ObjectID;

        this.UserData = UserData;
    }

    get powerPos(){
        let offset = powerOffsets[this.ObjectID] || [0, 0.3, 1.2];

        let obj = new THREE.Object3D();
        obj.position.fromArray(this.Position);

        let upVector = new THREE.Vector3().fromArray(this.Up);
        let atVector = new THREE.Vector3().fromArray(this.At);

        obj.translateOnAxis(upVector, offset[2]);
        obj.translateOnAxis(atVector, offset[2]);

        return obj.position.toArray();
    }
    
    get pipePos(){
        let offset = [0, 0.3, 1.2];

        let obj = new THREE.Object3D();
        obj.position.fromArray(this.Position);

        var upVector = new THREE.Vector3().fromArray(this.Up);
        var atVector = new THREE.Vector3().fromArray(this.At);

        obj.translateOnAxis(upVector, offset[2]);
        obj.translateOnAxis(atVector, offset[2]);

        return obj.position.toArray();
    }
}

function getNmsBasePart(ObjectID, UserData, location, jitterCoefficient){
    let part = new nmsBasePart(ObjectID, UserData);
        
    part.Position = jitterEach([location.position.x, location.position.y, location.position.z], jitterCoefficient);
    part.At = jitterEach([location.at.x, location.at.y, location.at.z], jitterCoefficient);
    part.Up = jitterEach([location.up.x, location.up.y, location.up.z], jitterCoefficient);

    return part;
}

function createLocation(position, up, at){
    let location = new THREE.Object3D();
    location.at = new THREE.Vector3();

    location.position.fromArray(createVector(position).toArray());

    location.up.fromArray(createVector(up).toArray()).normalize();
    location.at.fromArray(createVector(at).toArray()).normalize();

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
    triangleCompletionPoint1.translateOnAxis(axis.y, extractorSpacing);
    
    let alignmentTriangle1 = new THREE.Triangle(materialHotspotPosition, powerHotspotPosition, triangleCompletionPoint1.position);

    alignmentTriangle1.getNormal(axis.x).normalize();

    axis.z.fromArray(axis.x.toArray());

    axis.z.applyAxisAngle(axis.y, 90 * (Math.PI / 180));

    return axis;
}

function findFirstDepotLocation(setup, materialHotspotPosition, mineAxis){
    let depotPosition = materialHotspotPosition;

    if(setup.depotPosition){
        depotPosition = new THREE.Vector3().fromArray(setup.depotPosition.split(",").map(Number));
    }

    let depotLocation = createLocation(depotPosition, mineAxis.y, mineAxis.x);

    if(setup.depotPosition) return depotLocation;

    depotLocation.translateOnAxis(mineAxis.z, 10*depotSpacing);
    depotLocation.translateOnAxis(mineAxis.x, -3 * depotSpacing - (depotSpacing / 2));
    depotLocation.translateOnAxis(mineAxis.y, (setup.collectionPointCount * extractorSpacing) / 3);

    return depotLocation
}

function createMine(setup, base){
    let parts = [];

    let materialHotspotVector = new THREE.Vector3().fromArray(setup.materialHotspotVector.split(",").map(Number)).normalize();
    let materialHotspotPosition = new THREE.Vector3().fromArray(setup.materialHotspotPosition.split(",").map(Number));
    let powerHotspotPosition = new THREE.Vector3().fromArray(setup.powerHotspotPosition.split(",").map(Number));

    let mineAxis = getMineAxis(materialHotspotVector, materialHotspotPosition, powerHotspotPosition);

    //create the spawn locations
    let generatorLocation = createLocation(setup.powerHotspotPosition, materialHotspotVector, [materialHotspotPosition, powerHotspotPosition]);
    //calculate generators needed to power the tower
    let powerPerGenerator = powerHotspotMax * (setup.powerHotspotEfficiency / 100);
    let generatorCount = Math.ceil((extractorPowerUse * setup.collectionPointCount * extractorDensity) / powerPerGenerator);
    generatorCount = 1;

    let extractorLocation = createLocation(materialHotspotPosition, mineAxis.x, mineAxis.z);

    let depotLocation = findFirstDepotLocation(setup, materialHotspotPosition, mineAxis);

    let extractor = false;
    let depot = false;
    let generator = false;
    
    //add the generators
    for(let i = 0; i < generatorCount; i++){
        generator = getNmsBasePart("^U_GENERATOR_S", 0, generatorLocation);

        parts.push(generator);
    }

    for(let i = 0; i < setup.collectionPointCount; i++){
        for(let j = 0; j < extractorDensity; j++){
            extractor = getNmsBasePart("^U_EXTRACTOR_S", 131072, extractorLocation, 0.05);
            parts.push(extractor);
        }
        
        for(let j = 0; j < depotDensity; j++){
            depot = getNmsBasePart("^U_SILO_S", 0, depotLocation);
            parts.push(depot);
        }

        parts = parts.concat(wireTo(extractor.pipePos, depot.pipePos, "^U_PIPELINE"));

        if(i == 0){
            parts = parts.concat(wireTo(generator.powerPos, extractor.powerPos, "^U_POWERLINE"));
        }else{
            let previousPowerPos = createLocation(generator.powerPos, [0,0,0], [0,0,0]);
            previousPowerPos.translateOnAxis(mineAxis.y, extractorSpacing * -1);
            
            parts = parts.concat(wireTo(generator.powerPos, previousPowerPos.position, "^U_POWERLINE"));
        }

        //move the spawn points
        if((i + 1) % 10 == 0){
            depotLocation.translateOnAxis(mineAxis.z, depotSpacing);
            depotLocation.translateOnAxis(mineAxis.x, -9 * depotSpacing);
        }else{
            depotLocation.translateOnAxis(mineAxis.x, depotSpacing);
        }

        extractorLocation.translateOnAxis(mineAxis.y, extractorSpacing);
    }

    parts = addTimestamps(parts);

    if(setup.base){
        base = JSON.parse(setup.base);

        base.Objects = base.Objects.concat(parts);

        return base;
    }

    return parts;
}

function wireTo(startPos, endPos, ObjectID){
    if(_.isArray(startPos)) startPos = new THREE.Vector3().fromArray(startPos);
    
    if(_.isArray(endPos)) endPos = new THREE.Vector3().fromArray(endPos);

    let segmentStart = new THREE.Object3D();
    segmentStart.position.fromArray(startPos.toArray());

    let segmentEnd = segmentStart.clone();
    
    let wireEnd = new THREE.Object3D();
    wireEnd.position.fromArray(endPos.toArray());

    let wireVector = new THREE.Vector3().subVectors(endPos, startPos).normalize();

    segmentEnd.translateOnAxis(wireVector, maxWireLen + 1);
    wireEnd.translateOnAxis(wireVector, 1);

    let totalWireLen = startPos.distanceTo(endPos);
    let wireCount = Math.ceil(totalWireLen / maxWireLen);

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

        console.log(segmentStart.position.distanceTo(segmentEnd.position))

        wires.push(wire);

        segmentStart.translateOnAxis(wireAtVector.normalize(), maxWireLen);
        segmentEnd.translateOnAxis(wireVector, maxWireLen);
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

function jitterEach(numbers, jitterCoefficient){
    for(let i = 0; i < numbers.length; i++){
        numbers[i] += getJitter(jitterCoefficient)
    }

    return numbers;
}

function getJitter(jitterCoefficient){
    //return 0;

    if(typeof(jitterCoefficient) == "undefined") jitterCoefficient = 0.01;

    let jitter = (Math.random()-0.5) * jitterCoefficient;

    return jitter;
}

export { createMine };