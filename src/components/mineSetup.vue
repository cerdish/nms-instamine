<script setup>
    import { ref, reactive, computed } from 'vue'
    import * as _ from 'lodash';
    import * as NmsMine from "../js/NmsMineMaxExtraction";
    import baseInput from './baseInput.vue';
    import baseCheckbox from './baseCheckbox.vue';
    import { saveAs } from 'file-saver'

    const setup = reactive({
        base: "",
        warehouseOffset:[0,0,0],
        pipelineCount: 10,
        extractorDensity: 1,
        depotDensity: 1,
        depotsPerRow: 10,
        powerHotspotEfficiency: 100,
        userDataArray: [
            {ObjectID:"", UserData:1},
            {ObjectID:"^BASE_FLAG", UserData:0}
        ],
        includeGenerators: true,
        includeExtractors: true,
        includeDepots: true,
        includeMasterDepots: true,
        includeWires: true,
        includeLandingPads: true,
        includePark: true,
        includeBioDomes: true,
        bioDomes:[
            [
                {ObjectID:"^LUSHPLANT", count:46},
                {ObjectID:"^RADIOPLANT", count:46},
                {ObjectID:"^SNOWPLANT", count:35},
                {ObjectID:"^SCORCHEDPLANT", count:23},
                {ObjectID:"^POOPPLANT", count:12},
                {ObjectID:"^BARRENPLANT", count:6}
            ],
            [
                {ObjectID:"^TOXICPLANT", count:69},
                {ObjectID:"^LUSHPLANT", count:46},
                {ObjectID:"^SCORCHEDPLANT", count:23},
                {ObjectID:"^BARRENPLANT", count:18},
                {ObjectID:"^SNOWPLANT", count:12},
                {ObjectID:"^CREATUREPLANT", count:6}
            ]
        ]
    });

    const state = reactive({
        output: "",
        partCount: 0,
        projectedStorage: 0,
        projectedExtractionRate: 0
    });
    
    const outputEl = ref(null);
    const fileEl = ref(null);

    defineExpose({ outputEl, fileEl });

    if(localStorage.setup){
        let storedSetup = JSON.parse(localStorage.setup);

        Object.assign(setup, storedSetup);
    }

    const createMine = () => {
        let baseSetup = JSON.parse(JSON.stringify(setup));
        baseSetup.base = JSON.parse(baseSetup.base);

        let result = NmsMine.create(baseSetup);

        let extractors = _.filter(result.Objects, {ObjectID: "^U_EXTRACTOR_S"});

        let depots = _.filter(result.Objects, {ObjectID: "^U_SILO_S"});
        
        state.output = JSON.stringify(result, null, 2);
        state.partCount = result.Objects.length;
        state.projectedStorage = (depots.length * 1000) + (extractors.length * 250);
        state.projectedExtractionRate = extractors.length * 625

        localStorage.setup = JSON.stringify(setup);
    }

    const exportMineSetup = () => {
        let json = JSON.stringify(setup, null, 2);

        let blob = new Blob([json], {type: "application/json"});

        let base = JSON.parse(setup.base);

        let filename = base.Name + "_" + Math.round(new Date() / 1000) + "_setup.json"

        saveAs(blob, filename);
    }

    const exportMine = () => {
        let json = state.output;

        let blob = new Blob([json], {type: "application/json"});

        let base = JSON.parse(setup.base);

        let filename = base.Name + "_" + Math.round(new Date() / 1000) + ".json"

        saveAs(blob, filename);
    }

    const importMine = () => {
        const reader = new FileReader()
        reader.onload = () => {
            let loadedSetup = JSON.parse(reader.result);

            Object.assign(setup, loadedSetup);
        }
        reader.readAsBinaryString(fileEl.value.files[0])
    }
</script>

<template>
    <form @submit.prevent = "createMine()">
        <base-input v-model="setup.base" type="textarea">
            input base
        </base-input>

        <div class="flex margin kids-no-margin">
            <base-input v-model="setup.warehouseOffset[0]" input-width="50px">
                warehouse offset (x,y,z)
            </base-input>

            <base-input v-model="setup.warehouseOffset[1]" input-width="50px"></base-input>

            <base-input v-model="setup.warehouseOffset[2]" input-width="50px"></base-input>
        </div>
        
        <base-input v-model="setup.pipelineCount">
            pipeline count
        </base-input>

        <base-input v-model="setup.extractorDensity">
            extractor density
        </base-input>

        <base-input v-model="setup.depotDensity">
            depot density
        </base-input>

        <base-input v-model="setup.depotsPerRow">
            depots per row
        </base-input>

        <base-input v-model="setup.powerHotspotEfficiency">
            power hotspot efficiency
        </base-input>

        <div class="card">
            UserData

            <button class="bg-color1" type="button" @click="setup.userDataArray.push({ObjectID:'', UserData:0})"><span class="material-icons">add</span></button>
            
            <div v-for="obj,i in setup.userDataArray" :key="i" class="card flex smaller">
                <base-input class="item-grow" v-model="obj.ObjectID"></base-input>

                <base-input input-width="100px" v-model="obj.UserData"></base-input>
                
                <div>
                    <button type="button" class="bg-error" @click="setup.userDataArray.splice(i, 1)"><span class="material-icons">delete</span></button>
                </div>
            </div>
        </div>

        <div>
            <base-checkbox v-model="setup.includeGenerators">
                include generators
            </base-checkbox>

            <base-checkbox v-model="setup.includeExtractors">
                include extractors
            </base-checkbox>

            <base-checkbox v-model="setup.includeDepots">
                include depots
            </base-checkbox>

            <base-checkbox v-model="setup.includeMasterDepots">
                include master depots
            </base-checkbox>

            <base-checkbox v-model="setup.includeWires">
                include wires
            </base-checkbox>

            <base-checkbox v-model="setup.includeLandingPads">
                include landing pads
            </base-checkbox>

            <base-checkbox v-model="setup.includePark">
                include park
            </base-checkbox>

            <base-checkbox v-model="setup.includeBioDomes">
                include bio domes
            </base-checkbox>
        </div>

        <div class="card" v-if="setup.includeBioDomes">
            Bio Domes

            <button class="bg-color1" type="button" @click="setup.bioDomes.push([{ObjectID:'^GRAVPLANT', count:20}])"><span class="material-icons">add</span></button>
            
            
            <div v-for="bioDome,b in setup.bioDomes" :key="b" class="card smaller">
                Bio Dome {{b + 1}} Crops

                <button class="bg-color1" type="button" @click="setup.bioDomes[b].push({ObjectID:'^GRAVPLANT', count:20})"><span class="material-icons">add</span></button>
                
                <button class="bg-error" type="button" @click="setup.bioDomes.splice(b, 1)"><span class="material-icons">delete</span></button>

                <div v-for="crop,c in bioDome" :key="c" class="card flex">
                    <div class="flex item-grow">
                        <base-input class="item-grow" v-model="crop.ObjectID"></base-input>

                        <base-input input-width="50px" v-model="crop.count"></base-input>
                    </div>
                    
                    <div>
                        <button type="button" class="bg-error" @click="setup.bioDomes[b].splice(c, 1)"><span class="material-icons">delete</span></button>
                    </div>
                </div>
            </div>
        </div>

        <div>
            <button>Create Mine</button>
            <button type="button" :disabled="!state.output" @click="exportMine()">
                Export Mine
            </button>
            <button @click="exportMineSetup()" type="button" class="bg-color2">Export Mine Setup</button>
            <button type="button" class="bg-color2" @click="fileEl.click()">Import Mine Setup</button>

            <input type="file" ref="fileEl" @change = "importMine()" style="display:none;">
        </div>
    </form>

    <div>
        <div class="smaller margin">
            Part Count: {{state.partCount}}
            <br>
            Projected Storage: {{state.projectedStorage}}
            <br>
            Projected Extraction Rate: {{state.projectedExtractionRate}} (assumes 100% density with zero diminishing returns)
        </div>

        <base-input v-model="state.output" type="textarea"></base-input>
    </div>
</template>
