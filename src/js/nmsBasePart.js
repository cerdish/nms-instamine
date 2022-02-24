import * as THREE from 'three';
import { Object3D } from 'three';
import { createLocation } from '/src/js/baseBuilder.js';

const powerOffsets = {
    "^TELEPORTER":[0, 0, 0]
}
const pipeOffsets = {
    "^U_EXTRACTOR_S":[0, 0.3, 1]
}

class nmsBasePart{
    Timestamp = 0;
    ObjectID = 0;
    UserData = 0;
    Position = [0, 0, 0];
    Up = [0, 1, 0];
    At = [0, 1, 0];
    #jitterCoefficient = 0.01;

    constructor(ObjectID, UserData, Position, Up, At, jitterCoefficient){
        this.ObjectID = ObjectID;

        this.UserData = UserData || 0;

        if(typeof(jitterCoefficient) != 'undefined') this.#jitterCoefficient = jitterCoefficient;

        
        if(Position) this.Position = [...Position];
        if(Up) this.Up = Up;
        if(At) this.At = At;

        //console.log(this.ObjectID, this.jitterCoefficient, jitterCoefficient);

        this.addJitter();
    }

    get powerPos(){
        let offset = powerOffsets[this.ObjectID] || [0, 0.32, -1.15];

        let obj = new THREE.Object3D();
        obj.position.fromArray(this.Position);

        let upVector = new THREE.Vector3().fromArray(this.Up);
        let atVector = new THREE.Vector3().fromArray(this.At);

        obj.translateOnAxis(upVector, offset[1]);
        obj.translateOnAxis(atVector, offset[2]);

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

    addJitter(jitterCoefficient){
        if(typeof(jitterCoefficient) == 'undefined') jitterCoefficient = this.#jitterCoefficient;

        //console.log("add jitter", this.ObjectID, jitterCoefficient);

        this.Position = jitterEach(this.Position, jitterCoefficient);
        this.Up = jitterEach(this.Up, jitterCoefficient);
        this.At = jitterEach(this.At, jitterCoefficient);

        return this;
    }

    translateOnAxis(axis, magnitude){
        let currentLocation = createLocation(new THREE.Vector3().fromArray(this.Position));

        currentLocation.translateOnAxis(axis, magnitude);

        this.Position = jitterEach([currentLocation.position.x, currentLocation.position.y, currentLocation.position.z]);

        return this;
    }

    scale(magnitude){
        this.At = new THREE.Vector3().fromArray(this.At).multiplyScalar(magnitude).toArray();
        this.Up = new THREE.Vector3().fromArray(this.Up).multiplyScalar(magnitude).toArray();

        return this;
    }

    normalize(){
        this.At = new THREE.Vector3().fromArray(this.At).normalize().toArray();
        this.Up = new THREE.Vector3().fromArray(this.Up).normalize().toArray();

        return this;
    }

    applyLocation(location){
        this.Position = [location.position.x, location.position.y, location.position.z];
        this.At = [location.at.x, location.at.y, location.at.z];
        this.Up = [location.up.x, location.up.y, location.up.z];
        
        this.addJitter();

        return this;
    }

    clone(ObjectID){
        ObjectID = ObjectID || this.ObjectID

        return new nmsBasePart(ObjectID, this.UserData, [...this.Position], [...this.Up], [...this.At], this.#jitterCoefficient);
    }

    invertUp(){
        let upVector = new THREE.Vector3().fromArray(this.Up).negate();

        this.Up = upVector.toArray();

        return this;
    }
    
    invertAt(){
        let atVector = new THREE.Vector3().fromArray(this.At).negate();
        
        this.At = atVector.toArray();

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

export { nmsBasePart };