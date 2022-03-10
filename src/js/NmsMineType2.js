import * as THREE from 'three';
import * as _ from 'lodash';
import { NmsBase } from "./NmsBase";
import { createPlatforms, extractPart, createPark, createWire, createWalls, createMultiWire, createSpaceport, createBioDomes } from "./NmsBaseUtils";

var depotsPerRow = 10;

var warehouseScale = depotsPerRow + 4;

const platformScale = 12;

const pipeWidth = 0.33333;

function create(setup){
    depotsPerRow = parseInt(setup.depotsPerRow);
    warehouseScale = depotsPerRow + 4;

    let base = new NmsBase();
    let warehousePlatformCount = Math.ceil(setup.pipelineCount / (depotsPerRow * depotsPerRow));

    let generator = extractPart(setup.base, "^U_GENERATOR_S").normalize();
    let extractor = extractPart(setup.base, "^U_EXTRACTOR_S").normalize();

    base.orientFromParts(extractor, generator);

    let warehouseFloor = extractor.clone("^T_FLOOR").scaleTo(warehouseScale);
    warehouseFloor.translateOnAxis(base.axies.y, warehouseFloor.width * 0.7)

    extractor.setPosition(warehouseFloor.position)

    let generatorCount = getGeneratorCount(setup);

    base.addParts(generator.clone().setJitter(0.01).clone(false, generatorCount));

    let extractorScale = 4;
    let extractorScaleStep = (extractorScale - 1) / setup.pipelineCount;

    if(setup.includeWires) base.addParts(createWire(generator.powerPos, extractor.clone().scaleTo(extractorScale).powerPos, "^U_POWERLINE", 400));

    base.addParts(createPlatforms(warehouseFloor, warehouseScale, 1, "^T_FLOOR", "^CUBEFRAME"));
    warehouseFloor.translateOnAxis(base.axies.z, warehouseFloor.width).translateOnAxis(base.axies.x, warehouseFloor.width/2);

    let depot = getFirstDepot(warehouseFloor, base.axies);
    let masterDepot = depot.clone().translateOnAxis(base.axies.z, depotsPerRow * depot.width).translateOnAxis(base.axies.x, depot.width * -1);

    let prevExtractor = false;

    for(let i = 0; i < setup.pipelineCount; i ++){
        let newExtractor = getNextExrtactor(extractor, i, base.axies).scaleTo(extractorScale);

        if(setup.includeExtractors) base.addParts(newExtractor.clone().setJitter(0.01).clone(false, setup.extractorDensity));

        let newDepot = getNextDepot(depot, i, base.axies);
        
        if(setup.includeDepots) base.addParts(newDepot.clone().setJitter(0.01).clone(false, setup.depotDensity));

        if(setup.includeWires){
            let wireRoute = [newDepot.position, getPipeConnectionPos(warehouseFloor, i), newExtractor.pipePos];

            if(setup.includeMasterDepots) wireRoute.unshift(getNextPipePos(masterDepot.position, i, base.axies));

            base.addParts(createMultiWire(wireRoute, "^U_PIPELINE"));
            
            if(prevExtractor){
                base.addParts(createWire(prevExtractor.powerPos, newExtractor.powerPos, "^U_POWERLINE"));
            }
        }

        if(i % (depotsPerRow * depotsPerRow) == 0 && setup.includeMasterDepots){
            base.addParts(masterDepot.clone());
            base.addParts(masterDepot.clone("^U_POWERLINE"));
        }

        if((i + 1) % (depotsPerRow * depotsPerRow) == 0){
            masterDepot.translateOnAxis(base.axies.z, warehouseFloor.width);
        }

        prevExtractor = newExtractor;

        extractorScale -= extractorScaleStep;
    }

    base.addParts(createPlatforms(warehouseFloor, warehouseScale, warehousePlatformCount, "^T_FLOOR", "^CUBEFRAME"));

    base.addParts(warehouseFloor.clone("^T_GFLOOR").translateOnAxis(base.axies.y, depot.height).cloneOnAxis(base.axies.z, warehousePlatformCount, warehouseFloor.width));

    let corner1 = depot.clone("^T_WALL").translateOnAxis(base.axies.z, depot.width * -1.5).translateOnAxis(base.axies.x, depot.width * -1.5);
    let corner2 = corner1.clone().translateOnAxis(base.axies.x, (depot.width * depotsPerRow) + (depot.width * 2)).translateOnAxis(base.axies.z, (warehouseFloor.width * warehousePlatformCount) - ((warehouseScale - depotsPerRow - 2) * depot.width));
    
    let warehouseWalls = createWalls(corner1, corner2, base.axies, 2, "^T_WALL_WIN3", "^T_DOOR");
    base.addParts(warehouseWalls);

    let terminal = _.findLast(warehouseWalls,{ObjectID: "^T_DOOR"}).clone("^BUILDTERMINAL").normalize().invertAt();
    terminal.translateOnAxis(base.axies.z, terminal.depth / -2);

    let baseComputer = terminal.clone("^BASE_FLAG");

    baseComputer.translateOnAxis(base.axies.x, -terminal.width)
    terminal.translateOnAxis(base.axies.x, terminal.width * 1.5);
    
    base.addParts(terminal);
    base.addParts(baseComputer.clone().rotateOnAxis(base.axies.y, 45));
    base.addParts(terminal.clone("^BUILDSAVE").translateOnAxis(base.axies.x, (baseComputer.width / 2) + (terminal.width / 2)));
    
    let platformFloor = warehouseFloor.clone().scaleTo(platformScale);
    platformFloor.translateOnAxis(base.axies.z, (platformFloor.width / 2) + (warehouseFloor.width / 2) + (warehouseFloor.width * (warehousePlatformCount - 1)));
    
    if(setup.includeBioDomes){
        base.addParts(createBioDomes(platformFloor, platformScale, setup.bioDomes, generator, setup.includeWires));
    }    

    if(setup.includePark){
        base.addParts(createPark(platformFloor, platformScale, "^T_FLOOR", "^CUBEFRAME"));

        platformFloor.translateOnAxis(base.axies.z, platformFloor.width);
    }

    if(setup.includeLandingPads){
        base.addParts(createSpaceport(platformFloor, platformScale, setup.includeWires ? generator : false));

        platformFloor.translateOnAxis(base.axies.z, platformFloor.width);
    }

    base.updateTimestamps();
    base.applyUserData(setup.userDataArray);

    let createdBase = JSON.parse(JSON.stringify(setup.base));
    createdBase.Objects = base.Objects;
    
    return createdBase;
}

function getFirstDepot(warehouseFloor, axies){
    let depot = warehouseFloor.clone("^U_SILO_S").normalize();

    let offset = ((depotsPerRow * depot.width) / 2) - (depot.width / 2);
    
    depot.translateOnAxis(axies.z, -offset).translateOnAxis(axies.x, -offset);

    return depot;
}

function getNextExrtactor(extractor, index, axies){
    return extractor.clone().translateOnAxis(axies.y, (extractor.width + 0.5) * index);
}

function getNextDepot(depot, index, axies){
    let rowIndex = Math.floor(index / depotsPerRow);
    let columnIndex = index - (depotsPerRow * rowIndex);
    let spaceCount = Math.floor(index / (depotsPerRow * depotsPerRow));

    return depot.clone().translateOnAxis(axies.x, depot.width * columnIndex).translateOnAxis(axies.z, (depot.width * rowIndex) + (spaceCount * depot.width * (warehouseScale - depotsPerRow)));
}

function getNextPipePos(position, index, axies){
    let rowNum = 0;
    let colNum = 0;

    if(index){
        rowNum = Math.floor(index / depotsPerRow);
        colNum = index - (rowNum * depotsPerRow);

        rowNum = rowNum - (Math.floor(index / (depotsPerRow * depotsPerRow)) * depotsPerRow);
    }

    let obj = new THREE.Object3D();

    obj.position.fromArray(position.toArray())

    obj.translateOnAxis(axies.x, 4.5 * pipeWidth * -1);
    obj.translateOnAxis(axies.z, 4.5 * pipeWidth * -1);

    obj.translateOnAxis(axies.z, rowNum * pipeWidth);
    obj.translateOnAxis(axies.x, colNum * pipeWidth);

    return obj.position;
}

function getPipeConnectionPos(floor, index){
    let cursor = floor.clone().normalize();

    let axies = cursor.getAxies();

    //cursor.translateOnAxis(axies.z, ((warehouseScale - (warehouseScale - depotsPerRow)) / 2) * -cursor.width)//.translateOnAxis(axies.x, floor.width / 2);
    //cursor.translateOnAxis(axies.z, (cursor.width / depotsPerRow * index) + (Math.floor(index / (depotsPerRow * depotsPerRow)) * ((warehouseScale - depotsPerRow) * cursor.width)));
    cursor.translateOnAxis(axies.x, floor.width / 2)
    cursor.translateOnAxis(axies.z, ((warehouseScale - (warehouseScale - depotsPerRow)) / 2) * -cursor.width)//.translateOnAxis(axies.x, floor.width / 2);

    cursor.translateOnAxis(axies.z, (cursor.width / depotsPerRow * index) + (Math.floor(index / (depotsPerRow * depotsPerRow)) * ((warehouseScale - depotsPerRow) * cursor.width)));

    if(index % 2 == 0){
        //cursor.translateOnAxis(axies.x, floor.width * -1);
    }

    //cursor.translateOnAxis(axies.y, -cursor.width );

    return cursor.position;
}

function getGeneratorCount(setup){
    //calculate generators needed to power the tower
    let powerPerGenerator = 299 * (setup.powerHotspotEfficiency / 100);

    let powerUsage = 50 * setup.pipelineCount * setup.extractorDensity
    //add 20 for the teleporter and 50 per farm
    if(setup.includeLandingPads) powerUsage += 20;
    if(setup.includeBioDomes) powerUsage += 50 * setup.bioDomes.length;

    let generatorCount = Math.ceil(powerUsage / powerPerGenerator);

    return generatorCount;
}

export { create };