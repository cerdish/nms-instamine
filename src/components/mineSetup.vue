<script setup>
    import { ref, reactive, defineExpose, computed } from 'vue'
    import * as TropicalMine from '../js/TropicalMine';
    import * as _ from 'lodash';
        
    import * as IndustrialMine from "../js/IndustrialMine"

    IndustrialMine.foo();

    window.IndustrialMine = IndustrialMine

    const setup = reactive({
        base: "",
        baseName: "",
        materialHotspotPosition: "0,0,0",
        materialHotspotVector: "0,1,0",
        powerHotspotPosition: "0,0,100",
        depotPosition: "",
        pipelineCount: 10,
        depotDensity: 1,
        extractorDensity: 1,
        powerHotspotEfficiency: 100,
        userData: 0,
        floorObjectID: "^T_FLOOR",
        roofObjectID: "^T_GFLOOR",
        depotScale: 1,
        includeExtractors: true,
        includeDepots: true,
        includeMasterDepots: true,
        includeWires: true,
        includeRoof: false,
        includeWalls: false,
        includeLandingPads: true,
        includePark: true,
        includeFarms: true,
        farms:[
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
        ],
        removeCurrentBaseParts: true
    });

    const setups = reactive({});

    const state = reactive({
        output: "",
        partCount: 0,
        projectedStorage: 0,
        projectedExtractionRate: 0
    });

    const savedSetupOptions = computed(function(){
        return Object.keys(setups)
    });

    const checkboxFields = ['includeRoof','includeWires','includeDepots','removeCurrentBaseParts','includeExtractors','includeMasterDepots','includeWalls','includeLandingPads','includePark','includeFarms'];
    
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
        let result = TropicalMine.createMine(setup);

        localStorage.setup = JSON.stringify(setup);

        state.output = JSON.stringify(result, null, 2);

        let objects = _.isArray(result) ? result : result.Objects

        state.partCount = objects.length;

        let extractors = _.filter(objects, {ObjectID: "^U_EXTRACTOR_S"});

        let depots = _.filter(objects, {ObjectID: "^U_SILO_S"});

        state.projectedStorage = (depots.length * 1000) + (extractors.length * 250);

        state.projectedExtractionRate = extractors.length * 625
    }

    const exctractMineSetup = () => {
        let base = JSON.parse(setup.base);

        let newSetup = TropicalMine.exctractMineSetup(base);

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
                    <div v-for = "option, key in setup" class="margin" :key="key">
                        <label :for="key">
                            {{key}}
                        </label>
                        
                        <template v-if="key=='farms'">
                            <button type="button" @click="setup.farms.push([])">+</button>

                            <table style="padding:0.5rem;" v-for="farm,fIndex in setup.farms">
                                <tr>
                                    <td>
                                        <button type="button" @click="setup.farms.splice(fIndex, 1)">-</button>
                                        ObjectID
                                    </td>
                                    <td>Count</td>
                                    <td>
                                        <button type="button" @click="farm.push({ObjectID:'',count:1})">+</button>
                                    </td>
                                </tr>

                                <tr v-for = "crop,cIndex in farm">
                                    <td>
                                        <input type="text" v-model="crop.ObjectID">
                                    </td>
                                    <td>
                                        <input type="text" v-model="crop.count" style="width:50px;">
                                    </td>
                                    <td>
                                        <button type="button" @click="farm.splice(cIndex, 1)">-</button>
                                    </td>
                                </tr>
                            </table>
                        </template>

                        <template v-else-if="key=='base'">
                            <br>
                            <textarea id="base" v-model="setup[key]"></textarea>
                            <br>
                            <button type="button" @click="exctractMineSetup()">Extract Mine Setup</button>

                            <button type="button" @click = "saveSetup()">Save Setup</button>

                            <select @change = "loadSetup($event)">
                                <option value="">Select an save setup to load it</option>
                                <option v-for = "option in savedSetupOptions" :key="option">{{option}}</option>
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
                        Part Count: {{state.partCount}}
                        <br>
                        Projected Storage: {{state.projectedStorage}}
                        <br>
                        Projected Extraction Rate: {{state.projectedExtractionRate}} (assumes 100% density with zero diminishing returns)
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
                <li>pipelineCount - The number of independent pipelines or modules the mine will contain (to avoid diminishing returns)</li>
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
