import * as THREE from 'three';

const powerOffsets = {
    "^TELEPORTER":[0, 0, 0],
    "^U_MINIPORTAL":[0, 0.6, -1.55],
    "^BIOROOM":[4.55, 0.45, 4.55]
};

const pipeOffsets = {
    "^U_EXTRACTOR_S":[0, 0.3, 1]
};

const teleOffsets = {};

const doorOffsets = {
    "^BIOROOM":[0, 0.25, 3],
    "^CUBEGLASS":[0, 0.25, 2]
};

const doorObjectIDs = {};

const objectSizes = {
    "^U_EXTRACTOR_S":[3.33333,6.66666,3.33333],
    "^U_SILO_S":[5.33333,6.66666,5.33333],
    "^CUBEGLASS":[4,4,4],
    "^CUBEFRAME":[4,4,4],
    "^CUBEFOUND4":[4,-0.25,4],
    "^F_FLOOR":[5.33333,0.3,5.33333],
    "^T_GFLOOR":[5.33333,0.3,5.33333],
    "^T_FLOOR":[5.33333,0.275,5.33333],
    "^BASE_FLAG":[5.33333/2, 3.33333/2, 5.33333/2],
    "^S_LIGHTSTRIP0":[5.33333/2, 3.33333/4, 5.33333/2],
    "^BIOROOM":[12, 6, 12],
    "^U_PIPELINE":[0.33333, 0.33333, 0.33333],
    "^BUILDTERMINAL":[5.33333, 3.33333/2, 5.33333/2]
};

const defaultSize = [5.33333, 3.33333, 5.33333];

class NmsBasePart{
    Timestamp = 0;
    ObjectID = 0;
    UserData = 0;
    Position = [0, 0, 0];
    Up = [0, 1, 0];
    At = [0, 1, 0];
    #jitterCoefficient = 0;
    #scale = 1;
    #object3D = new THREE.Object3D();

    constructor(ObjectID, UserData, Position, Up, At, jitterCoefficient){
        this.ObjectID = ObjectID;

        this.UserData = UserData || 0;

        if(typeof(jitterCoefficient) != 'undefined') this.#jitterCoefficient = jitterCoefficient;

        this.#object3D.at = new THREE.Vector3();

        if(Position) this.setPosition(Position);
        if(Up) this.setUp(Up);
        if(At) this.setAt(At);

        this.addJitter();
    }

    get powerPos(){
        let offset = powerOffsets[this.ObjectID] || [0, 0.32, -1.15];

        let obj = this.#object3D.clone();

        let axies = this.getAxies();

        //console.log(this.ObjectID, axies)
        
        obj.translateOnAxis(axies.x, offset[0] * this.#scale);
        obj.translateOnAxis(axies.y, offset[1] * this.#scale);
        obj.translateOnAxis(axies.z, offset[2] * this.#scale);

        return obj.position.toArray();
    }
    
    get pipePos(){
        let offset = pipeOffsets[this.ObjectID] || [0, 0.3, -1];

        let obj = new THREE.Object3D();
        obj.position.fromArray(this.Position);

        var upVector = new THREE.Vector3().fromArray(this.Up);
        var atVector = new THREE.Vector3().fromArray(this.At);

        obj.translateOnAxis(upVector, offset[1]);
        obj.translateOnAxis(atVector, offset[2]);

        return obj.position.toArray();
    }
    
    get telePos(){
        let offset = teleOffsets[this.ObjectID] || [0, 1.65, -0.9];

        let obj = new THREE.Object3D();
        obj.position.fromArray(this.Position);

        var upVector = new THREE.Vector3().fromArray(this.Up);
        var atVector = new THREE.Vector3().fromArray(this.At);

        obj.translateOnAxis(upVector, offset[1]);
        obj.translateOnAxis(atVector, offset[2]);

        return obj.position.toArray();
    }

    get width(){
        let size = objectSizes[this.ObjectID] || defaultSize;

        return size[0] * this.#scale;
    }

    get height(){
        let size = objectSizes[this.ObjectID] || defaultSize;

        return size[1] * this.#scale;
    }

    get depth(){
        let size = objectSizes[this.ObjectID] || defaultSize;

        return size[2] * this.#scale;
    }

    get up(){
        return new THREE.Vector3().fromArray(this.Up);
    }

    get at(){
        return new THREE.Vector3().fromArray(this.At);
    }

    get position(){
        return new THREE.Vector3().fromArray(this.Position);
    }

    getAxies(){
        let axies = {
            x: false,
            y: this.#object3D.up.clone().normalize(),
            z: this.#object3D.at.clone().normalize()
        };

        axies.x = axies.z.clone().applyAxisAngle(axies.y, 90 * Math.PI / 180);

        return axies;
    }

    getDoor(doorIndex){
        doorIndex = doorIndex || 0;

        let offset = doorOffsets[this.ObjectID] || [0, 0, 4];

        let axies = this.getAxies();

        let door = this.clone(doorObjectIDs[this.ObjectID] || "^DOOR2");

        door.translateOnAxis(axies.x, offset[0] * this.#scale);
        door.translateOnAxis(axies.y, offset[1] * this.#scale);

        let doors = door.cloneOnCircle(4, offset[2] * this.#scale, axies.y, true, axies.z);

        return doors[doorIndex];
    }

    addJitter(jitterCoefficient){
        if(typeof(jitterCoefficient) == 'undefined') jitterCoefficient = this.#jitterCoefficient;

        if(jitterCoefficient){
            //console.log("add jitter", this.ObjectID, jitterCoefficient);

            this.Position = jitterEach(this.Position, jitterCoefficient);
            this.Up = jitterEach(this.Up, jitterCoefficient);
            this.At = jitterEach(this.At, jitterCoefficient);
        }
        
        return this;
    }

    toObject3D(){
        let obj = this.#object3D.clone();

        obj.at = this.#object3D.at.clone();

        return obj;
    }

    translateOnAxis(axis, magnitude){
        this.#object3D.translateOnAxis(axis, magnitude);

        this.Position = jitterEach(this.#object3D.position.toArray(), this.#jitterCoefficient);

        return this;
    }

    rotateOnAxis(axis, degrees){
        this.rotateAt(axis, degrees);
        this.rotateUp(axis, degrees);

        return this;
    }

    rotateAt(axis, degrees){
        let rads = degrees * Math.PI / 180;

        this.#object3D.at.applyAxisAngle(axis, rads);

        this.At = jitterEach(this.#object3D.at.toArray(), this.#jitterCoefficient);

        return this;
    }

    rotateUp(axis, degrees){
        let rads = degrees * Math.PI / 180;

        this.#object3D.up.applyAxisAngle(axis, rads);

        this.Up = jitterEach(this.#object3D.up.toArray(), this.#jitterCoefficient);

        return this;
    }

    scale(magnitude){
        this.#object3D.at.multiplyScalar(magnitude);
        this.#object3D.up.multiplyScalar(magnitude);

        this.At = this.#object3D.at.toArray();
        this.Up = this.#object3D.up.toArray();

        this.#scale = this.#scale * magnitude;
        
        return this;
    }

    scaleTo(scale){
        this.#object3D.at.normalize().multiplyScalar(scale);
        this.#object3D.up.normalize().multiplyScalar(scale);

        this.At = this.#object3D.at.toArray();
        this.Up = this.#object3D.up.toArray();

        this.#scale = scale;

        return this;
    }
    
    normalize(){
        this.#object3D.at.normalize();
        this.#object3D.up.normalize();

        this.At = this.#object3D.at.toArray();
        this.Up = this.#object3D.up.toArray();
        
        this.#scale = 1;

        return this;
    }

    applyLocation(location){
        this.#object3D.position.fromArray(location.position.toArray());
        this.#object3D.at.fromArray(location.at.toArray());
        this.#object3D.up.fromArray(location.up.toArray());

        this.Position = this.#object3D.position.toArray();
        this.At = this.#object3D.at.toArray();
        this.Up = this.#object3D.up.toArray();
        
        this.addJitter();

        return this;
    }

    clone(ObjectID, count){
        ObjectID = ObjectID || this.ObjectID;
        count = count || 1;

        let clones = [];

        for(let i = 0; i < count; i++){
            let clone = new NmsBasePart(ObjectID, this.UserData, this.#object3D.position.toArray(), this.#object3D.up.toArray(), this.#object3D.at.toArray(), this.#jitterCoefficient);
    
            clone.scaleTo(this.#scale);

            clones.push(clone);
        }

        return count == 1 ? clones[0] : clones;
    }

    cloneOnCircle(count, radius, axis, offset, rotateClones, moveAxis, totalDegrees){
        offset = offset || 0;
        totalDegrees = totalDegrees || 360;

        var offsetRads = offset * Math.PI / 180;
        
        var degreesPerStep = totalDegrees / count;
        var radsPerStep = degreesPerStep * Math.PI / 180;

        var clones = [];

        let moveVector = new THREE.Vector3().fromArray(this.At).normalize();

        if(moveAxis) moveVector = moveAxis.clone().normalize();

        moveVector.applyAxisAngle(axis, offsetRads);

        for(let i = 0; i < count; i++){
            let clone = this.clone();

            let totalOffset = (degreesPerStep * i) + offset;

            if(rotateClones) clone.rotateOnAxis(axis, totalOffset);
            
            clone.translateOnAxis(moveVector, radius);

            clones.push(clone);

            moveVector.applyAxisAngle(axis, radsPerStep)
        }

        return clones;
    }

    cloneOnAxis(axis, count, offset, totalOffset){
        let clones = [];

        if(!offset && totalOffset){
            offset = totalOffset / (count - 1);
        }

        for(let i = 0; i < count; i++){
            let totalOffset = i * offset;

            let userData = "1000000000000000000" + (("00000000" + i.toString(2)).slice(-8));
            //let userData = "1" + "0".repeat(i) + "0000000000000000000000";
            //let userData = i.toString(2) + "000000000000000000000000000000000000000000000000000000";
            userData = parseInt(userData, 2);

            userData = i;

            clones.push(this.clone().translateOnAxis(axis, totalOffset).setUserData(userData));
        }

        return clones;
    }

    cloneOnGrid(axies, countX, countZ, offset){
        let cursor = this.clone();
        let cursorOffsetX = ((countX -1) * offset) / 2;
        let cursorOffsetZ = ((countZ -1) * offset) / 2;

        cursor.translateOnAxis(axies.x, -cursorOffsetX).translateOnAxis(axies.z, -cursorOffsetZ);

        let parts = [];

        for(let i = 0; i < countZ; i++){
            parts = parts.concat(cursor.cloneOnAxis(axies.x, countX, offset));

            cursor.translateOnAxis(axies.z, offset);
        }

        return parts;
    }

    invertUp(){
        this.#object3D.up.negate();

        this.Up = this.#object3D.up.toArray();

        return this;
    }
    
    invertAt(){
        this.#object3D.at.negate();

        this.At = this.#object3D.at.toArray();

        return this;
    }

    setUserData(userData){
        this.UserData = userData;

        return this;
    }

    setPosition(vector){
        this.Position = getVectorArray(vector);

        this.#object3D.position.fromArray(this.Position);
        
        return this;
    }
    
    setUp(vector){
        this.Up = getVectorArray(vector);

        this.#object3D.up.fromArray(this.Up);

        return this;
    }

    setAt(vector){
        this.At = getVectorArray(vector);

        this.#object3D.at.fromArray(this.At);

        return this;
    }

    setJitter(jitter){
        this.#jitterCoefficient = jitter;

        return this;
    }
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

function getVectorArray(vector){
    if(typeof(vector.toArray) == 'function') return vector.toArray();
    
    if(vector.indexOf(",") > -1) return vector.split(",").map(Number);

    return vector;
}

export { NmsBasePart };