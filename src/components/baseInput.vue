<script setup>
    import {ref} from "vue";

    const props = defineProps({
        modelValue:{
            default:"100%"
        },
        inputWidth:{}
    })

    const emit = defineEmits(['update:modelValue'])

    const id = ref("input-" + (Math.random()+"").replace(/\./g,"-"));
</script>

<template>
    <div class="input-wrapper">
        <label :for="$attrs.id || id" v-if="$slots.default">
            <slot></slot>
        </label>

        <div class="input-parent" :style="'width:' + inputWidth">
            <textarea v-model="props.modelValue" @input="$emit('update:modelValue', $event.target.value)" :id="$attrs.id || id" type="text" v-bind="$attrs" v-if="$attrs.type == 'textarea'"></textarea>

            <input v-model="props.modelValue" @input="$emit('update:modelValue', $event.target.value)" :id="$attrs.id || id" type="text" v-bind="$attrs" v-else/>
            
            <div class="input-note" v-if="$slots.note">
                <slot name="note"></slot>
            </div>
        </div>
    </div>

</template>

<style scoped>
    .input-wrapper{
        margin:var(--default-gap);
        max-width:650px;
        display:flex;
        overflow:hidden;
        flex-shrink:0;
    }
    .input-wrapper > label{
        width:200px;
        flex-shrink:0;
        padding-right:var(--default-gap);
        padding-top:calc(var(--default-gap) / 2);
    }
    .input-wrapper > .input-parent{
        flex:1;
    }
    .input-wrapper textarea{
        width:100%;
        height:200px;
        font-size:inherit;
    }
    .input-wrapper input{
        width:100%;
        /*padding:calc(var(--default-gap) / 2);
        font-size:inherit;
        display:block;*/
    }
    .input-note{
        font-size:0.8em;
        margin-top:calc(var(--default-gap) / 2);
    }
    .smaller .input-wrapper{
        margin:calc(var(--default-gap) / 2);
    }
    .kids-no-margin > .input-wrapper{
        margin:0;
    }
</style>