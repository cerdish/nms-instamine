<script setup>
    import {ref} from "vue";

    const props = defineProps({
        modelValue: {}
    });

    const id = ref("input-" + (Math.random()+"").replace(/\./g,"-"));
</script>

<template>
    <div class="checkbox-wrapper">
        <div class="checkbox-parent">
            <input type="checkbox" :id="$attrs.id || id" v-model="props.modelValue" v-bind="$attrs" />
        </div>

        <label :for="$attrs.id || id">
            <slot></slot>
        </label>
    </div>
</template>

<style scoped>
    .checkbox-wrapper{
        display:inline-flex;
        margin:0 0 0.5rem 0.5rem;
        border:1px solid #ddd;
    }
    .checkbox-wrapper > label{
        flex:0 1 200px;
        padding:0.25rem;
        white-space: nowrap;
    }
    .checkbox-wrapper > .checkbox-parent{
        flex:0 1 20px;
    }
    .checkbox-wrapper input{
        width:20px;
        padding:0.25rem;
    }
    .checkbox-wrapper > .checkbox-parent{
        align-self: center;
    }
</style>