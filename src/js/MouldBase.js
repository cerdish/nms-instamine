import { extractParts, createWire} from "./NmsBaseUtils";
import { NmsBase } from "./NmsBase";

function create(setup){
    let teleporters = extractParts(setup.base, "^U_MINIPORTAL");

    //console.log(teleporters)
    
    let base = new NmsBase();

    let powerWire = createWire(teleporters[0].powerPos, teleporters[1].powerPos, "^U_POWERLINE");
    let portalWire = createWire(teleporters[0].telePos, teleporters[1].telePos, "^U_PORTALLINE");

    base.addParts(powerWire);
    base.addParts(portalWire);

    base.updateTimestamps();

    let createdBase = JSON.parse(JSON.stringify(setup.base));
    createdBase.Objects = createdBase.Objects.concat(base.Objects);
    
    return createdBase;
}

export {create}