<script setup>
    import { ref, reactive, defineExpose, computed } from 'vue'
    import * as builder from '/src/js/baseBuilder.js';
    import * as _ from 'lodash';

    const setup = reactive({
        base: "",
        baseName: "",
        materialHotspotPosition: "0,0,0",
        materialHotspotVector: "0,1,0",
        powerHotspotPosition: "0,0,100",
        depotPosition: "",
        collectionPointCount: 5,
        depotDensity: 1,
        extractorDensity: 1,
        powerHotspotEfficiency: 47,
        userData: 0,
        floorObjectID: "^T_FLOOR",
        roofObjectID: "^F_ROOF6",
        depotScale: 1,
        includeExtractors: true,
        includeDepots: true,
        includeMasterDepots: true,
        includeWires: true,
        includeRoof: false,
        removeCurrentBaseParts: true
    });

    const setups = reactive({});

    const state = reactive({
        output: "",
        partCount: 0,
        projectedStorage: 0
    });

    const savedSetupOptions = computed(function(){
        return Object.keys(setups)
    });

    const checkboxFields = ['includeRoof','includeWires','includeDepots','removeCurrentBaseParts','includeExtractors','includeMasterDepots'];
    
    const outputEl = ref(null);

    defineExpose({ outputEl });

    if(localStorage.setup){
        let storedSetup = JSON.parse(localStorage.setup);

        Object.assign(setup, storedSetup);
    }

    if(localStorage.setups){
        let storedSetups = JSON.parse(localStorage.setups);

        Object.assign(setups, storedSetups);
    }

    const createMine = () => {
        let result = builder.createMine(setup);

        localStorage.setup = JSON.stringify(setup);

        state.output = JSON.stringify(result, null, 2);

        state.partCount = _.isArray(result) ? result.length : result.Objects.length;

        state.projectedStorage = (setup.collectionPointCount * 1000 * setup.depotDensity) + (setup.collectionPointCount * 250 * setup.extractorDensity);
    }

    const exctractMineSetup = () => {
        let base = JSON.parse(setup.base);

        let newSetup = builder.exctractMineSetup(base);

        Object.assign(setup, newSetup);
    }

    const saveSetup = () => {
        let name = prompt("Enter a name for the setup:");

        if(!name) return false;

        setups[name] = setup;

        localStorage.setups = JSON.stringify(setups);

        localStorage.setup = JSON.stringify(setup);

        state.output = JSON.stringify(setup);
    }

    const loadSetup = (e) => {
        let name = e.target.value;

        let storedSetups = JSON.parse(localStorage.setups);

        console.log(storedSetups[name])

        Object.assign(setup, storedSetups[name]);
    }
</script>

<template>
    <div class="flex">
        <form @submit.prevent = "createMine()">
            <div class="flex">
                <div>
                    <div v-for = "option, key in setup" class="margin">
                        <label :for="key">{{key}}</label>
                        
                        <template v-if="key=='base'">
                            <br>
                            <textarea id="base" v-model="setup[key]"></textarea>
                            <br>
                            <button type="button" @click="exctractMineSetup()">Extract Mine Setup</button>

                            <button type="button" @click = "saveSetup()">Save Setup</button>

                            <select @change = "loadSetup($event)">
                                <option value="">Select an save setup to load it</option>
                                <option v-for = "option in savedSetupOptions">{{option}}</option>
                            </select>
                        </template>
                        
                        <template v-else-if="checkboxFields.indexOf(key) > -1">
                            <input :id="key" type="checkbox" v-model="setup[key]">
                        </template>
                        
                        <input type="text" v-else :id="key" v-model="setup[key]">
                    </div>
                </div>
            </div>

            <div>
                <button class="margin">Create Mine</button>
            </div>


            <div class="margin">
                <label>
                    Output
                    <br>
                    <span class="smaller">
                        (Part Count: {{state.partCount}})
                        <br>
                        (Projected Storage: {{state.projectedStorage}})
                    </span>
                </label>
                <br>
                <textarea ref="outputEl" v-model="state.output"></textarea>
            </div>
        </form>

        <div class="margin">
            <h2>How to use:</h2>

            <ol>
                <li>
                    Find a material hotspot and an electromagnetic hotspot
                </li>

                <li>
                    Create a base at the location
                </li>

                <li>
                    Place an extractor on the exact location of the material hotspot
                </li>

                <li>
                    Place a generator on the exact location of the electromagnetic hotspot
                </li>

                <li>
                    Optional: Place a depot on the location you want the script to begin building depots from
                </li>

                <li>
                    Save
                </li>
                
                <li>
                    Load your save in a save editor
                </li>
                
                <li>
                    Paste the JSON of the base you just made in the "base" field
                </li>

                <li>
                    Click "Extract Mine Setup"
                </li>

                <li>
                    Edit the mine setup to the specs you desire
                </li>

                <li>
                    Click "Create Mine"
                </li>

                <li>
                    Copy the output JSON (in the "output" field).
                </li>

                <li>
                    Using the save editor, replace the original base with this new base
                </li>

                <li>
                    Save and load into the game
                </li>
            </ol>

            <br><br>
            <h2>Setup:</h2>
            <ul>
                <li>BaseName - Name given to the base</li>
                <li>materialHotspotPosition - Location in 3D space where the hotspot exists</li>
                <li>materialHotspotVector - Indicates the exact direction the hotspot points (generally not exactly vertical)</li>
                <li>powerHotspotPosition - Location where the power hotspot exists</li>
                <li>depotPosition - Position of the script will place the first depot (if blank the script will automatically place them)</li>
                <li>collectionPointCount - The number of independent pipelines or modules the mine will contain (to avoid diminishing returns)</li>
                <li>depotDensity - The number of depots placed at each collection point (10 depots per point will give 10k material)</li>
                <li>extractorDensity - The number of extractors attached to each independent pipeline (to maximize returns)</li>
                <li>powerHotspotEfficiency - The percent efficiency that the hotspot this mine is attached to (used to calculate the number of generators required)</li>
            </ul>
        </div>
    </div>
</template>

<style scoped>
    textarea{
        height:400px; width:610px;
    }
    input[type=text]{
        width:400px;
    }
    *{
        vertical-align: top;
    }
    li{
        padding:3px;
    }
</style>
