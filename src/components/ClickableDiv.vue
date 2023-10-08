<template>
    <div :style="customStyle" class="clickableDiv" :class="{ selected: imageSelected }">
        <div style="display: flex; justify-content: space-between; flex-direction: column; height: 100%;">
            <label class="label">{{ exportGroup }}</label>
            <div style="display: flex; justify-content: center; align-items:flex-start; flex-grow: 1"
                @click.self="selectDiv"
            >
                <input type="checkbox" name="top" class="checkbox top" v-model="editableAnchors.top">
            </div>
            <div @click.self="selectDiv" style="display: flex; justify-content: space-between; flex-grow: 1">
                <input type="checkbox" name="left" class="checkbox left" v-model="editableAnchors.left">
                <input type="checkbox" name="right" class="checkbox right" v-model="editableAnchors.right">
            </div>
            <div @click.self="selectDiv" style="display: flex; justify-content: center; flex-grow: 1; align-items:flex-end">
                <input type="checkbox" name="bottom" class="checkbox bottom" v-model="editableAnchors.bottom">
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Anchors, Size } from '@/types'; 

const props = withDefaults(defineProps<{
    position: Size,
    sizeRatio: number,
    anchor: Anchors,
    selected: boolean,
    exportGroup?: number 
}>(), {
    selected: false
});

const emits = defineEmits(['update:anchor', 'selected'])

const imageSelected = ref<boolean>(props.selected);
const editableAnchors = ref(props.anchor);

watch(props.anchor, function(newValue) {
    editableAnchors.value = newValue
});

watch(():boolean => props.selected, function(newValue) {
    imageSelected.value = newValue;
});

watch(editableAnchors, function(newValue) {
    emits('update:anchor', newValue);
    console.log('updated');
});

const selectDiv = function() {
    console.log(props.selected);
    emits('selected', !props.selected)
}

const customStyle = computed(() => {
    let { position, sizeRatio } = props; 
    return {
        top: (position.miny * sizeRatio) + 'px',
        left: (position.minx * sizeRatio) + 'px',
        width: (position.width * sizeRatio) + 'px',
        height: (position.height * sizeRatio) + 'px'
    };
});

</script>

<style scoped>
.clickableDiv {
    position: absolute;
    outline: 1px solid green;
    outline-offset: 1px;
}

.clickableDiv.selected {
    background-color: #00000050;
}

.checkbox {
    background-color: white;
    z-index: 10;
}
.label {
    position: absolute;
    top: 0;
    left: 0;
    font-weight: bolder;
}
</style>