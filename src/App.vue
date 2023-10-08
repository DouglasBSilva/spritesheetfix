

<template>
    <div class="body-content">
      <div class="menu">
        <input type="file" id="imageInput" accept="image/*" @input="imageInput">
        <button class="button" :disabled="Object.keys(selectedImages).length === 0" @click="groupSelected">Merge</button>
        <button class="button" :disabled="Object.keys(selectedImages).length === 0" @click="removeSelected">Delete Selected</button>
        <button class="button" :disabled="Object.keys(selectedImages).length === 0" @click="createExportGroup">Create Export Group</button>
        <button class="button" :disabled="Object.keys(selectedImages).length === 0" @click="removeFromExportGroup">Remove From Export Group</button>
        <button class="button" :disabled="!loadedImage" @click="reset">Reset</button>
        <button class="button" :disabled="!pixelGroups.length" @click="selectAll">Select All</button>
        <button class="button" :disabled="!pixelGroups.length" @click="selectedImages = {}">UnSelect All</button>
        <div style="margin-top: 100px;"></div>
        <button class="button" :disabled="!pixelGroups.length || !Object.values(exportGroup).length" @click="exportAll">Export All Groups</button>
      </div>
      <div ref="container" id="container" style="max-height: 100vh; overflow: auto;" @mousedown="startSelection" @mousemove="updateSelection" @mouseup="endSelection">
        <canvas ref="canvas" style="min-width: 100%;"></canvas>
        <ClickableDiv v-for="(group, index) in pixelGroups" :key="group.id"
          :id="group.id"
          :export-group="exportGroup[group.id]"
          v-model:anchor="group.anchors"
          :position="group.size" 
          :size-ratio="canvasSizeVariation"
          :selected="!!selectedImages[group.id]"
          @selected="selectDiv(group, index, $event)"
        />
          
      </div>
          
    </div>
    <div
        v-if="isSelecting"
        class="selection-box"
        :style="selectionBoxStyle"
      ></div>
</template>
<script setup lang="ts">

import { ref, type InputHTMLAttributes, reactive, computed } from 'vue';
import ClickableDiv from '@/components/ClickableDiv.vue';
import type { Anchors, Group, GroupsData, PixelPosition, Size } from '@/types';

const canvas = ref()

const imageData = ref();
const idCounter = ref(1);
const selectedImages = ref<{[key: string]: Group}>({});
const pixelGroups = ref<Group[]>([])
const canvasSizeVariation = computed(() => loadedImage.value ? canvas.value.getBoundingClientRect().width / canvas.value.width : 1);
const loadedImage = ref<HTMLImageElement>();
const container = ref();
const exportGroup = ref<{[key: string|number]: number}>({});
const exportGroupId = ref(1);
const pixelData = ref<Uint32Array>([] as unknown as Uint32Array);
const anchorDefault: Anchors = {
  top: false,
  bottom: true,
  left: false,
  right: false
};

function createExportGroup() {
  let selected = Object.keys(selectedImages.value);

  if(!selected.length) {
    return;
  }

  let id = exportGroupId.value ++;

  selected.forEach((key) => {
    exportGroup.value[key] = id;
  });

  clearSelection();
}

function clearSelection() {
  selectedImages.value = {};
}

function removeSelected() {
  let selected = Object.keys(selectedImages.value);
  pixelGroups.value = pixelGroups.value.filter((group) => !selected.includes(group.id.toString()));
  selectedImages.value = {};
}

function removeFromExportGroup() {
  let selected = Object.keys(selectedImages.value);
  selected.forEach((key) => {
    if(exportGroup.value[key]) {
      delete(exportGroup.value[key]);
    }
  });

  exportGroup.value = {...exportGroup.value};
}

function groupSelected() {
  let selected = Object.keys(selectedImages.value);

  if(selected.length == 0) {
    return;
  }


  let id = idCounter.value++;
  let mergedContent = selected.reduce((a: Group, b)=> {
    a.size.minx = Math.min(selectedImages.value[b].size.minx, a.size?.minx ?? Infinity); 
    a.size.miny = Math.min(selectedImages.value[b].size.miny, a.size?.miny ?? Infinity);
    a.size.maxx = Math.max(selectedImages.value[b].size.maxx, a.size?.maxx ?? -Infinity);
    a.size.maxy = Math.max(selectedImages.value[b].size.maxy, a.size?.maxy ?? -Infinity);
    a.size.width = a.size.maxx - a.size.minx;
    a.size.height = a.size.maxy - a.size.miny;
    a.pixels = [...a.pixels, ...selectedImages.value[b].pixels];
    a.anchors = { ...anchorDefault };
    a.id = id;
    return a;
  }, { size: {}, pixels: [], anchors: {}} as unknown as Group);

  pixelGroups.value.push(mergedContent);
  let [intersects, uniqueGroups] = pixelGroups.value.reduce((a, group) => {
    if(
      selected.includes(group.id.toString())
    ) {
      a[0].push(group);
    }else {
      a[1].push(group);
    }
    return a;
  }, [[], []] as [Group[], Group[]]);
        
  pixelGroups.value = uniqueGroups;
  
  selected.forEach((key) => {
    if(exportGroup.value[key]) {
      delete(exportGroup.value[key]);
    }
  });
  exportGroup.value = { ...exportGroup.value };
  selectedImages.value = {};
}

function reset() {

  if(!loadedImage.value) return;

  clearSelection();
  exportGroup.value = {};
  pixelGroups.value = [];
  processImage();
}

function selectAll() {
  selectedImages.value = {};
  pixelGroups.value.forEach((group) => {
    selectedImages.value[group.id] = group;
  });

  selectedImages.value = {...selectedImages.value};
}

function exportAll() {
  let keys = Object.keys(exportGroup.value);
  if(keys.length === 0){
    return;
  }

  let exportContent: {[key: number]: Group[]} = {};
  keys.forEach((key) => {
    if(exportContent[exportGroup.value[key]] == undefined) {
      exportContent[exportGroup.value[key]] = [];
    }

    exportContent[exportGroup.value[key]].push(pixelGroups.value.find(({id}) => id.toString() == key)!);
  })

  generateExportImage(Object.values(exportContent));
}

function generateExportImage(exportGroup: Group[][], sameLine = false) {
    var maxWidth = 0;
    var maxHeight = 0;
    var interval = 0;
    exportGroup.forEach(function (groups) {
      groups.filter((group) => group).forEach(function ({size}) {
        maxWidth = Math.max(maxWidth, size.width);
        maxHeight = Math.max(maxHeight, size.height);
      });
    });

    let maxLines = exportGroup.length;
    let maxColumns = exportGroup.reduce((a, b) => Math.max(a, b.length), 0); 

    var imageCanvas = document.createElement("canvas");
    imageCanvas.height = (maxLines * (maxHeight + interval)) + 1; // Tamanho máximo encontrado + 1
    imageCanvas.width = (maxColumns * (maxWidth + interval)) + 1;

    var imageCtx = imageCanvas.getContext("2d", { willReadFrequently: true })!;
    imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);

    exportGroup.forEach(function (groups, line) {
      groups.filter((group) => group).forEach(function ({pixels, size, anchors}, column) {
        let offsetX = column * (maxWidth + interval);
        let offsetY = line * (maxHeight + interval);
        pixels.forEach(function (pixel) {
            var x = pixel.x;
            var y = pixel.y;
            var pixelColor = pixelData.value[y * canvas.value.width + x]; // Obtenha a cor do pixel original
            let excedenteX = maxWidth - size.width;
            let excedenteY = maxHeight - size.height;
            
            if(anchors.top && anchors.bottom){
              excedenteY /= 2
            }else if(anchors.top){
              excedenteY *= -1
            } else{
              excedenteY
            }

            if(
              (anchors.left && anchors.right) ||
              (!anchors.left && !anchors.right)
            ){
              excedenteX /= 2 
            }else if(anchors.left){
              excedenteX *= 0
            }

            let fillX = (offsetX) + (x - size.minx) + excedenteX;
            let fillY = (offsetY) + (y - size.miny) + excedenteY;
            
            
            // Defina a cor no contexto da imagem
            imageCtx.fillStyle = "rgba(" + (pixelColor & 0xFF) + "," + ((pixelColor >> 8) & 0xFF) + "," + ((pixelColor >> 16) & 0xFF) + "," + ((pixelColor >> 24) & 0xFF) / 255 + ")";
            imageCtx.fillRect(fillX, fillY, 1, 1);
          });
        });
    });

    const downloadLink = document.createElement('a');

    //for some reason the image was setting some pixel with opacity so redraw the image overitself to remove the transparency
    imageCtx.drawImage(imageCanvas, 0, 0);
    imageCtx.drawImage(imageCanvas, 0, 0);
    
    // Set the 'href' attribute of the link to the image source
    downloadLink.href = imageCanvas.toDataURL("image/png");
    
    // Set the 'download' attribute to specify the default download filename (optional)
    downloadLink.setAttribute('download', 'downloaded-image.jpg');

    // Trigger a click event on the link to start the download
    downloadLink.click();
}

const imageInput = function (e: Event) {
  var input = e.target as HTMLInputElement;
  var file = input?.files?.item(0);

  if (file) {
    pixelGroups.value = [];
    var reader: FileReader = new FileReader();
    reader.onload = function (e) {
      var img: HTMLImageElement = new Image();
      img.src = e.target?.result as string;
      img.onload = function () {
        loadedImage.value = img;
        var ctx = canvas.value.getContext("2d", { willReadFrequently: true });
        canvas.value.width = img.width;
        canvas.value.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        imageData.value = ctx.getImageData(0, 0, canvas.value.width, canvas.value.height);
        processImage();
      };
    };
    reader.readAsDataURL(file);
  }
}
function processImage() {
  var separationPixel = [0, 0, 0, 0]; // RGBA values for "pixel invisível"
  pixelData.value = new Uint32Array(imageData.value.data.buffer); // Usar Uint32Array para processamento mais rápido
  var processedPixels = new Set(); // Armazena pixels já processados

  for (var y = 0; y < canvas.value.height; y++) {
    for (var x = 0; x < canvas.value.width; x++) {
      var pixelIndex = y * canvas.value.width + x;

      // Verifique se o pixel atual não é um "pixel invisível" e não foi processado
      if (
        pixelData.value[pixelIndex] !== 0 && // Verifica se o pixel não é totalmente transparente
        !processedPixels.has(pixelIndex)
      ) {
        var currentGroup: PixelPosition[] = [{ x: x, y: y }];
        expandPixelGroup(currentGroup, canvas.value.width, canvas.value.height, pixelData.value, separationPixel, processedPixels);
        let maxx = currentGroup.reduce((a, b) => Math.max(a, b.x), -Infinity);
        let maxy = currentGroup.reduce((a, b) => Math.max(a, b.y), -Infinity);
        let minx = currentGroup.reduce((a, b) => Math.min(a, b.x), Infinity);
        let miny = currentGroup.reduce((a, b) => Math.min(a, b.y), Infinity);

        let size: Size = {
          minx,
          maxx,
          miny,
          maxy,
          width: maxx - minx,
          height: maxy - miny
        }
         
        let currentPixelGroup: Group = { id: idCounter.value++, pixels: currentGroup, size, anchors: {...anchorDefault}};

        // uniqueGroups.push(currentPixelGroup);
        pixelGroups.value.push(currentPixelGroup);
        // pixelGroups.value = uniqueGroups;
      }
    }
  }

  // Agora você tem uma lista de grupos de pixels separados
  // Você pode criar imagens com esses grupos
  // createImagesFromPixelGroups(pixelGroups, canvas.value.width, canvas.value.height, pixelData);
}

function expandPixelGroup(group: PixelPosition[], width: number, height: number, pixelData: Uint32Array, separationPixel: number[], processedPixels: Set<unknown>) {
  var stack = [{ x: group[0].x, y: group[0].y }];

  while (stack.length > 0) {
    var pixel = stack.pop();
    var x = pixel!.x;
    var y = pixel!.y;

    var neighbors = [
      { x: x - 1, y: y },
      { x: x + 1, y: y },
      { x: x, y: y - 1 },
      { x: x, y: y + 1 }
    ];

    for (var i = 0; i < neighbors.length; i++) {
      var nx = neighbors[i].x;
      var ny = neighbors[i].y;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        var pixelIndex = ny * width + nx;

        // Verifique se o pixel atual não é um "pixel invisível" e não foi processado
        if (
          pixelData[pixelIndex] !== 0 && // Verifica se o pixel não é totalmente transparente
          !processedPixels.has(pixelIndex)
        ) {
          group.push({ x: nx, y: ny });
          processedPixels.add(pixelIndex); // Marque o pixel como processado
          stack.push({ x: nx, y: ny });
        }
      }
    }
  }
}

function selectDiv(imageData: Group, index: number, selected: boolean ) {
  if(selected) {
    selectedImages.value[imageData.id] = imageData;
  }else {
    delete(selectedImages.value[imageData.id])
  }
};

const isSelecting = ref(false);
const selectionBoxStartX = ref(0);
const selectionBoxStartY = ref(0);
const selectionBoxEndX = ref(0);
const selectionBoxEndY = ref(0);

const selectionBoxStyle = computed(() => ({
  left: `${Math.min(selectionBoxStartX.value, selectionBoxEndX.value)}px`,
  top: `${Math.min(selectionBoxStartY.value, selectionBoxEndY.value)}px`,
  width: `${Math.abs(selectionBoxEndX.value - selectionBoxStartX.value)}px`,
  height: `${Math.abs(selectionBoxEndY.value - selectionBoxStartY.value)}px`,
}));

const startSelection = (event: MouseEvent) => {
  isSelecting.value = true;
  selectionBoxStartX.value = event.clientX + window.pageXOffset;
  selectionBoxStartY.value = event.clientY;
  selectionBoxEndX.value = event.clientX;
  selectionBoxEndY.value = event.clientY;
};

const updateSelection = (event: MouseEvent) => {
  if (isSelecting.value) {
    selectionBoxEndX.value = event.clientX;
    selectionBoxEndY.value = event.clientY;
    updateItemSelection();
  }
};

const endSelection = () => {
  isSelecting.value = false;
};

const updateItemSelection = () => {
  
  const offsetX = container.value.getBoundingClientRect().x;
  const offsetY = container.value.getBoundingClientRect().y;
  const scrollTop = container.value.scrollTop;
  const scrollLeft = container.value.scrollLeft; 
  const minX = (Math.min(selectionBoxStartX.value, selectionBoxEndX.value) - offsetX) + scrollLeft;
  const minY = (Math.min(selectionBoxStartY.value, selectionBoxEndY.value) - offsetY) + scrollTop;
  const maxX = (Math.max(selectionBoxStartX.value, selectionBoxEndX.value) - offsetX) + scrollLeft;
  const maxY = (Math.max(selectionBoxStartY.value, selectionBoxEndY.value) - offsetY) + scrollTop;

  if((maxX - minX < 10) && (maxY - minY < 10)) {
    return;
  }
  
  pixelGroups.value.forEach((item) => {
    if (
      !(
        (item.size.maxx * canvasSizeVariation.value) < minX ||
        (item.size.minx * canvasSizeVariation.value) > maxX
      ) &&
      !(
        (item.size.maxy * canvasSizeVariation.value) < minY ||
        (item.size.miny * canvasSizeVariation.value) > maxY
      )
    ) {
      selectedImages.value[item.id] = item
    }else {
      delete(selectedImages.value[item.id])
      selectedImages.value = {...selectedImages.value};
    }
  });
};
</script>
<style scoped>

#container {
  position: relative;
  width: 100%;
}

.clickable-div {
  position: absolute;
  cursor: pointer;
}

.menu {
  background: gray;
  height: 100vh;
  position: sticky;
}

.body-content {
  display: flex;
}

.button {
  display: block;
  width: 100%;
  padding: 8px;
  font-size: 15px;
  font-weight: bold;
  background-color: yellow;
  border: 1px solid grey;
  margin-top: 10px;
}

.button:hover {
  filter: brightness(85%);
}

.button:disabled {
  pointer-events: none;
  opacity: 0.5; 
}

.selection-box {
  position: absolute;
  border: 2px dashed blue;
  background-color: rgba(0, 0, 255, 0.1);
  pointer-events: none;
}
.selected {
  background-color: lightblue;
}


.selection-box {
  position: absolute;
  border: 2px dashed blue;
  background-color: rgba(0, 0, 255, 0.1);
  pointer-events: none;
}
.selected {
  background-color: lightblue;
}

</style>
