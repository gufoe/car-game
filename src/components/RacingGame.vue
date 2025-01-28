<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Game } from '../game/Game'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let game: Game | null = null

onMounted(() => {
  if (canvasRef.value) {
    game = new Game(canvasRef.value)
    game.start()
  }
})

onUnmounted(() => {
  if (game) {
    game.stop()
  }
})
</script>

<template>
  <canvas ref="canvasRef" class="racing-game"></canvas>
</template>

<style scoped>
.racing-game {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #2c3e50;
}
</style>
