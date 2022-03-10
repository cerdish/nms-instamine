<script setup>
    import {ref} from "vue";

    const props = defineProps({
        modelValue:{
            default:""
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

        <div class="input-parent" :style="{width: inputWidth}">
            <textarea @input="$emit('update:modelValue', $event.target.value)" :value="modelValue" :id="$attrs.id || id" type="text" v-bind="$attrs" v-if="$attrs.type == 'textarea'"></textarea>

            <input @input="$emit('update:modelValue', $event.target.value)" :value="modelValue" :id="$attrs.id || id" type="text" v-bind="$attrs" v-else/>
            
            <div class="input-note" v-if="$slots.note">
                <slot name="note"></slot>
            </div>
        </div>
    </div>

</template>

<style scoped>
    .input-wrapper{
        display:flex;
        margin:0.5rem;
        max-width:650px;
    }
    .input-wrapper > label{
        flex:0 1 200px;
        padding-right:0.5rem;
        padding-top:0.25rem;
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
        padding:0.25rem;
        font-size:inherit;
    }
    .input-note{
        font-size:0.8em;
        margin-top:0.25rem;
    }
    .smaller .input-wrapper{
        margin:calc(var(--default-gap) / 2);
    }
</style>