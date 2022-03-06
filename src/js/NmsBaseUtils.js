import { NmsBasePart } from "./nmsBasePart";

function createBlock(position, up, at, scale, floorObjectID, wallObjectID, doorObjectID, roofObjectID, foundationObjectID){
    let floor = new NmsBasePart(floorObjectID, 0, position, up, at).scale(scale);
    floor.translateOnAxis(up, floor.height / -2);

    let foundation = floor.clone(foundationObjectID);
    foundation.scale(floor.width / foundation.width)
    foundation.translateOnAxis(up, foundation.height * -1);

    let wall = floor.clone(wallObjectID);
    let walls = wall.cloneOnCircle(3, floor.width / 2, up, 90, true, false, 270);

    let door = wall.clone(doorObjectID).translateOnAxis(at, floor.width / 2);

    let roof = floor.clone(roofObjectID).translateOnAxis(up, wall.height);

    return [floor,foundation,door,roof].concat(walls);
}

export { createBlock };