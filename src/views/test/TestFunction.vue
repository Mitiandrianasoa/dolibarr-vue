<script lang="ts">

function compterVoyelles(phrase: string): number{
    const voyelles = ['a', 'e', 'i', 'o', 'u', 'y'];
    let count = 0;
    for (const char of phrase.toLowerCase()) {
        if (voyelles.includes(char)) {
            count++;
        }
    }
    return count;
}



</script>
<template>
    <div>
        <h1>Compteur de voyelles</h1>
        <input v-model="phrase" placeholder="Entrez une phrase" />
        <p>Nombre de voyelles: {{ nombreVoyelles }}</p>
    </div>
</template>