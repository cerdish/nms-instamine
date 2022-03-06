import { NmsBase } from "./NmsBase";
import { NmsBasePart } from "./NmsBasePart";
import { createBlock } from "./NmsBaseUtils";

const depotsPerRow = 5;

const factoryFloorScale = depotsPerRow + 2;

const blockScale = 12;

function createMine(setup){
    let base = new NmsBase();

    base.orientFromBase(setup.base, "^U_EXTRACTOR_S", "^U_GENERATOR_S");

    let extractor = base.createPart("^U_EXTRACTOR_S");
    let depot = extractor.clone("^U_SILO_S");

    let extractors = extractor.rotateOnAxis(base.axies.z, 90).cloneOnAxis(base.axies.y, setup.pipelineCount, extractor.width);
    base.addParts(extractors);

    let depotBlockPos = base.createPart().translateOnAxis(base.axies.z, factoryFloorScale * depot.width).Position;

    let depotBlock = createBlock(depotBlockPos, base.axies.y, base.axies.z, factoryFloorScale, "^F_FLOOR", "^F_WALL_WINDOW", "^F_GDOOR", "^F_ROOF6", "^CUBEFRAME");
    base.addParts(depotBlock);

    setup.base.Objects = base.Objects;
    
    return JSON.stringify(setup.base);
}

function foo(){
    return "bar";
}

export { createMine, foo };