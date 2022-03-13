import { NmsBase } from "./NmsBase";
import { extractPart, createWire, createSpaceport } from "./NmsBaseUtils";


const pipesPerRow = 10;
const extractorGap = 3.33333;

function create(setup){
    let generator = extractPart(setup.base, "^U_GENERATOR_S").normalize();
    let extractor = extractPart(setup.base, "^U_EXTRACTOR_S").normalize();
    
    let base = new NmsBase();
    base.orientFromParts(extractor, generator);

    let depotCount = Math.ceil(setup.pipelineCount / (pipesPerRow * pipesPerRow));
    let depot = getFirstDepot(extractor);

    let depots = depot.clone().cloneOnAxis(base.axies.z, depotCount, depot.width);
    if(setup.includeMasterDepots) base.addParts(depots);

    let pipeEndpoints = [];

    depots.forEach((d) => {
        pipeEndpoints = pipeEndpoints.concat(d.clone("^U_PIPELINE").cloneOnGrid(base.axies, pipesPerRow, pipesPerRow, 0.4));

        base.addParts(d.clone("^T_FLOOR"));
        base.addParts(d.clone("^U_POWERLINE"));
    })

    let extractors = extractor.cloneOnAxis(base.axies.y, setup.pipelineCount, extractorGap);
    let prevExtractor = false;

    extractors.forEach(function(e, i){
        let nextExtractor = e.clone().setJitter(0.01);
        if(setup.includeWires) base.addParts(createWire(pipeEndpoints[i].position, nextExtractor.pipePos, "^U_PIPELINE"));
        
        if(prevExtractor && i){
            if(setup.includeWires) base.addParts(createWire(nextExtractor.powerPos, prevExtractor.powerPos, "^U_POWERLINE"));
        }

        prevExtractor = nextExtractor;

        if(setup.includeExtractors) base.addParts(nextExtractor.clone(false, setup.extractorDensity));
    });

    if(setup.includeWires) base.addParts(createWire(generator.powerPos, extractor.powerPos, "^U_POWERLINE"));

    base.addGenerators(generator, setup.powerHotspotEfficiency);

    let spaceportFloor = depot.clone("^T_FLOOR").translateOnAxis(base.axies.z, depotCount * depot.width).translateOnAxis(base.axies.z, depot.width / -2).scaleTo(12);
    spaceportFloor.translateOnAxis(base.axies.z, spaceportFloor.width / 2);

    if(setup.includeLandingPads) base.addParts(createSpaceport(spaceportFloor, 12, setup.includeWires ? generator : false));

    base.applyUserData(setup.userDataArray);

    base.updateTimestamps();

    let createdBase = JSON.parse(JSON.stringify(setup.base));
    createdBase.Objects = base.Objects;
    
    return createdBase;
}

function getFirstDepot(extractor){
    let depot = extractor.clone("^U_SILO_S");

    depot.translateOnAxis(depot.at, depot.width * 10);
    depot.translateOnAxis(depot.up, depot.height * 5);

    return depot;
}

export { create }

