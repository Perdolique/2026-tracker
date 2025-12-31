<template>
  <div :class="$style.wizard">
    <!-- Progress indicator -->
    <div :class="$style.stepIndicator">
      <span>{{ currentIndex + 1 }} / {{ taskIds.length }}</span>
    </div>

    <!-- Task card -->
    <article v-if="currentTask" :class="$style.taskCard">
      <Icon :icon="typeIcon" :class="$style.emoji" />
      <h2 :class="$style.title">{{ currentTask.title }}</h2>
      <p v-if="currentTask.description" :class="$style.description">
        {{ currentTask.description }}
      </p>

      <!-- Progress bar -->
      <div :class="$style.progressContainer">
        <div :class="$style.progressBar">
          <div :class="$style.progressFill" :style="{ width: `${progress}%` }" />
        </div>
        <span :class="$style.progressText">{{ progressText }}</span>
      </div>
    </article>

    <!-- Value input for progress tasks -->
    <div v-if="showValueInput && currentTask && isProgressTask(currentTask)" :class="$style.valueInput">
      <label :class="$style.valueLabel">
        {{ $t('checkIn.howMuchToday', { unit: currentTask.unit }) }}
      </label>
      <input
        v-model.number="inputValue"
        :class="$style.input"
        type="number"
        min="0"
        :placeholder="$t('checkIn.enterAmount', { unit: currentTask.unit })"
        :disabled="isProcessing"
        autofocus
      />
      <div :class="$style.valueActions">
        <button :class="$style.skipBtn" :disabled="isProcessing" @click="handleValueSkip">
          {{ $t('common.skip') }}
        </button>
        <button
          :class="$style.confirmBtn"
          :disabled="!inputValue || inputValue <= 0 || isProcessing"
          @click="handleValueSubmit"
        >
          {{ $t('checkIn.record') }}
        </button>
      </div>
    </div>

    <!-- Yes/No buttons -->
    <div v-else :class="$style.actions">
      <p :class="$style.question">{{ $t('checkIn.question') }}</p>
      <div :class="$style.buttons">
        <button :class="$style.noBtn" data-testid="checkin-no" :disabled="isProcessing" @click="handleNo">
          <Icon icon="tabler:x" :class="$style.btnIcon" /> {{ $t('common.no') }}
        </button>
        <button :class="$style.yesBtn" data-testid="checkin-yes" :disabled="isProcessing" @click="handleYes">
          <Icon icon="tabler:check" :class="$style.btnIcon" /> {{ $t('common.yes') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { Icon } from '@iconify/vue'
  import { isDailyTask, isProgressTask, isOneTimeTask, getTaskProgress, type Task } from '@/models/task'

  const { t } = useI18n()

  const props = defineProps<{
    tasks: Task[]
    onCheckIn: (taskId: string, completed: boolean, value?: number) => Promise<void>
  }>()

  const emit = defineEmits<{
    complete: []
  }>()

  // Снапшот ID задач на момент старта wizard'а — не зависит от реактивных изменений
  const taskIds = ref<string[]>([])
  const currentIdIndex = ref(0)
  const inputValue = ref<number | undefined>(undefined)
  const showValueInput = ref(false)
  const isProcessing = ref(false)

  // Инициализация при первом получении задач — фиксируем порядок
  watch(
    () => props.tasks,
    (tasks) => {
      // Снапшотим только если ещё не снапшотили (первый раз)
      if (taskIds.value.length === 0 && tasks.length > 0) {
        taskIds.value = tasks.map(t => t.id)
      }
    },
    { immediate: true }
  )

  // Текущий ID из снапшота
  const currentTaskId = computed(() => taskIds.value[currentIdIndex.value])

  // Ищем задачу по ID в актуальном props.tasks
  const currentTask = computed(() => props.tasks.find(t => t.id === currentTaskId.value))

  // Для индикатора прогресса используем снапшот
  const currentIndex = computed(() => currentIdIndex.value)

  const isLastTask = computed(() => currentIdIndex.value >= taskIds.value.length - 1)

  const progress = computed(() => {
    if (!currentTask.value) {return 0}
    return getTaskProgress(currentTask.value)
  })

  const progressText = computed(() => {
    const task = currentTask.value
    if (!task) {return ''}

    if (isDailyTask(task)) {
      return t('taskCard.daysProgress', { completed: task.completedDates.length, target: task.targetDays })
    }
    if (isProgressTask(task)) {
      return `${task.currentValue.toLocaleString()} / ${task.targetValue.toLocaleString()} ${task.unit}`
    }
    if (isOneTimeTask(task)) {
      return task.completedAt ? t('taskCard.completed') : t('checkIn.waitingForCompletion')
    }
    return ''
  })

  const typeIcon = computed(() => {
    switch (currentTask.value?.type) {
      case 'daily': {
        return 'tabler:calendar-check'
      }
      case 'progress': {
        return 'tabler:chart-line'
      }
      case 'one-time': {
        return 'tabler:circle-check'
      }
      default: {
        return 'tabler:help'
      }
    }
  })

  async function handleYes() {
    if (isProcessing.value) {return}
    const task = currentTask.value
    if (!task) {return}

    // Progress tasks need value input
    if (isProgressTask(task)) {
      showValueInput.value = true
      return
    }

    // Other tasks complete immediately — ждём завершения!
    isProcessing.value = true
    try {
      await props.onCheckIn(task.id, true)
      goNext()
    } finally {
      isProcessing.value = false
    }
  }

  async function handleNo() {
    if (isProcessing.value) {return}
    const task = currentTask.value
    if (!task) {return}

    isProcessing.value = true
    try {
      await props.onCheckIn(task.id, false)
      goNext()
    } finally {
      isProcessing.value = false
    }
  }

  async function handleValueSubmit() {
    if (isProcessing.value) {return}
    const task = currentTask.value
    if (!task || !isProgressTask(task)) {return}

    isProcessing.value = true
    try {
      await props.onCheckIn(task.id, true, inputValue.value)
      showValueInput.value = false
      inputValue.value = undefined
      goNext()
    } catch {
      // Error handling is done by the parent component
    } finally {
      isProcessing.value = false
    }
  }

  async function handleValueSkip() {
    if (isProcessing.value) {return}
    const task = currentTask.value
    if (!task) {return}

    isProcessing.value = true
    try {
      await props.onCheckIn(task.id, false)
      showValueInput.value = false
      inputValue.value = undefined
      goNext()
    } finally {
      isProcessing.value = false
    }
  }

  function goNext() {
    if (isLastTask.value) {
      emit('complete')
    } else {
      currentIdIndex.value += 1
    }
  }
</script>

<style module>
  .wizard {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 400px;
    margin: 0 auto;
  }

  .stepIndicator {
    text-align: center;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .taskCard {
    background: var(--color-surface);
    border-radius: 16px;
    padding: 24px;
    text-align: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .emoji {
    width: 48px;
    height: 48px;
    display: block;
    margin: 0 auto 16px;
    color: var(--color-primary);
  }

  .title {
    margin: 0 0 8px;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .description {
    margin: 0 0 16px;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  .progressContainer {
    margin-top: 16px;
  }

  .progressBar {
    height: 10px;
    background: var(--color-progress-bg);
    border-radius: 5px;
    overflow: hidden;
  }

  .progressFill {
    height: 100%;
    background: var(--color-primary);
    border-radius: 5px;
    transition: width 0.3s ease;
  }

  .progressText {
    display: block;
    margin-top: 8px;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .actions {
    text-align: center;
  }

  .question {
    margin: 0 0 16px;
    font-size: 1.125rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .noBtn,
  .yesBtn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px 24px;
    font-size: 1.125rem;
    font-weight: 600;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.1s, opacity 0.2s;
  }

  .btnIcon {
    width: 20px;
    height: 20px;
  }

  .noBtn:active,
  .yesBtn:active {
    transform: scale(0.98);
  }

  .noBtn {
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }

  .noBtn:hover {
    opacity: 0.9;
  }

  .yesBtn {
    background: var(--color-success);
    color: white;
  }

  .yesBtn:hover {
    opacity: 0.9;
  }

  .valueInput {
    background: var(--color-surface);
    border-radius: 16px;
    padding: 24px;
    text-align: center;
  }

  .valueLabel {
    display: block;
    margin-bottom: 16px;
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .input {
    width: 100%;
    padding: 14px 16px;
    font-size: 1.25rem;
    text-align: center;
    border: 2px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg);
    color: var(--color-text);
  }

  .input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .valueActions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 16px;
  }

  .skipBtn,
  .confirmBtn {
    padding: 14px 20px;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .skipBtn {
    background: var(--color-border);
    color: var(--color-text);
  }

  .confirmBtn {
    background: var(--color-primary);
    color: white;
  }

  .confirmBtn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
