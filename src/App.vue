<script setup>
    import mineSetup from './components/mineSetup.vue'
</script>

<template>
    <h1>
        Insta-Mine for No Man's Sky

        <div class="smaller">Create mines with the click of a button</div>
    </h1>
    <mine-setup></mine-setup>
</template>

<style>
    #app {
        font-family: Arial, sans-serif;
    }

    label {
        min-width:200px;
        display:inline-block;
    }

    .padding{
        padding:0.5rem;
    }
    .margin{
        margin:0.5rem;
    }
    .right{
        text-align:right;
    }
    .flex{
        display:flex;
    }
    h1{
        font-size: 1.6rem;
    }
    h2{
        font-size:1.4rem;
        margin:0;
    }
    .smaller{
        font-size:0.8em;
    }
</style>
