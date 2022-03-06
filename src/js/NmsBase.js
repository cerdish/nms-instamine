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

    orientFromBase(base, ObjectID1, ObjectID2){
        let part1 = _.find(base.Objects, {ObjectID:ObjectID1});
        let part2 = _.find(base.Objects, {ObjectID:ObjectID2});

        part1 = new NmsBasePart(part1.ObjectID, 0, part1.Position, part1.Up, part1.At).toObject3D();
        part2 = new NmsBasePart(part2.ObjectID, 0, part2.Position, part2.Up, part2.At).toObject3D();

        this.orient(part1.up, part1.position, part2.position);
    
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
}

export { NmsBase };