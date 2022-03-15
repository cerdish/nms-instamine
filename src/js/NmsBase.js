import * as THREE from 'three';
import * as _ from 'lodash';
import { NmsBasePart } from './nmsBasePart';

class NmsBase{
    Name="";
    Objects = [];
    axies = {
        x: new THREE.Vector3(1,0,0),
        y: new THREE.Vector3(0,1,0),
        z: new THREE.Vector3(0,0,1)
    }

    constructor(Name){
        if(Name) this.Name = Name;
    }

    orientFromParts(part1, part2){
        let obj1 = part1.toObject3D();
        let obj2 = part2.toObject3D();

        this.orient(obj1.up, obj1.position, obj2.position);

        part1.setUp(this.axies.y).setAt(this.axies.z);

        part2.setUp(this.axies.y).setAt(this.axies.z);

        return this;
    }

    orient(yAxis, pos1, pos2){
        let axies = {
            x: new THREE.Vector3(),
            y: new THREE.Vector3().fromArray(yAxis.toArray()).normalize(),
            z: new THREE.Vector3(),
            position: new THREE.Vector3().fromArray(pos1.toArray())
        };

        
        //draw a triangle between the extractors and the generators, this can be used to calculate the normal which we will use to place the extractors
        let triangleCompletionPoint1 = new THREE.Object3D();
        triangleCompletionPoint1.position.fromArray(pos1.toArray());
        triangleCompletionPoint1.translateOnAxis(axies.y, 500);
        
        let alignmentTriangle1 = new THREE.Triangle(pos1, pos2, triangleCompletionPoint1.position);
    
        alignmentTriangle1.getNormal(axies.x).normalize();
    
        axies.z.fromArray(axies.x.toArray());
    
        axies.z.applyAxisAngle(axies.y, 90 * (Math.PI / 180));

        this.axies = axies;
    
        return this;
    }

    addParts(parts){
        if(!_.isArray(parts)) parts = [parts];

        this.Objects = this.Objects.concat(parts);

        return this;
    }

    createPart(ObjectID){
        let part = new NmsBasePart(ObjectID, 0, this.axies.position, this.axies.y, this.axies.z);

        //console.log(part);

        return part;
    }

    applyUserData(userDataArray){
        for(let i = 0; i < userDataArray.length; i++){
            let objects = this.Objects;

            if(userDataArray[i].ObjectID){
                objects = _.filter(objects, {ObjectID: userDataArray[i].ObjectID});
            }

            console.log(userDataArray[i])

            objects.forEach((object) => {
                object.UserData = parseInt(userDataArray[i].UserData);
            });
        }

        return this;
    }

    updateTimestamps(){
        //let timestamp = (new Date() / 1000) - (60*60*24*7)
        //let timestamp = Math.round((new Date() / 1000) - (60*60))
        let timestamp = Math.round(new Date() / 1000)
    
        for(let i = 0; i < this.Objects.length; i++){
            let o = this.Objects [i];
    
            o.Timestamp = timestamp;
    
            //timestamp = timestamp + 1;
        }
    
        this;
    }

    getParts(ObjectID){
        return _.filter(this.Objects, {ObjectID: ObjectID});
    }

    getGeneratorCount(powerHotspotEfficiency){
        let extractors = this.getParts("^U_EXTRACTOR_S");
        let bioDomes = this.getParts("^BIOROOM");
        let teleports = this.getParts("^TELEPORT");

        let powerConsumption = (50 * (bioDomes.length + extractors.length)) + (20 * teleports.length);

        let generatorCount = Math.ceil(powerConsumption / ((powerHotspotEfficiency / 100) * 300));

        console.log(generatorCount,bioDomes.length,extractors.length)

        return generatorCount
    }

    addGenerators(generator, powerHotspotEfficiency){
        this.addParts(generator.clone().setJitter(0.01).clone(false, this.getGeneratorCount(powerHotspotEfficiency)));

        return this;
    }
}

export { NmsBase };