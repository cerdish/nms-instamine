<script setup>
    import { ref, reactive } from 'vue'
    import * as builder from '/src/js/baseBuilder.js';

    const setup = reactive({
        materialHotspotPosition: "1.013214111328125,-4.013336181640625,9.170265197753907",
        materialHotspotVector: "0.000037897287256782877,0.9999999403953552,0.00003980840483563952",
        depotPosition: "",
        collectionPointCount: 5,
        powerHotspotPosition: "0,0,0",
        powerHotspotEfficiency: 47,
        base: ""
    });

    if(localStorage.setup){
        let storedSetup = JSON.parse(localStorage.setup);

        Object.assign(setup, storedSetup);
    }

    const state = reactive({
        output: ""
    });

    const createMine = () => {
        let result = builder.createMine(setup);

        localStorage.setup = JSON.stringify(setup);

        state.output = JSON.stringify(result, null, 2);
    }
</script>

<template>
    <form @submit.prevent = "createMine()">
        <div class="flex">
            <div>
                <div v-for = "option, key in setup" class="margin">
                    <label :for="key">{{key}}</label>
                    
                    <template v-if="key=='base'">
                        <br>
                        <textarea id="base" v-model="setup[key]"></textarea>
                    </template>
                    
                    <input type="text" v-else :id="key" v-model="setup[key]">
                </div>
            </div>
        </div>

        <div class="margin">
            <button>Create Mine</button>
        </div>


        <div class="margin">
            <label>Output</label><br>
            <textarea v-model="state.output"></textarea>
        </div>
    </form>
</template>

<style scoped>
    textarea{
        height:400px; width:600px;
    }
    input[type=text]{
        width:400px;
    }
    *{
        vertical-align: top;
    }
</style>
