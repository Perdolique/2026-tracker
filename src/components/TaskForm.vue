<template>
  <form :class="$style.form" @submit.prevent="handleSubmit">
    <div :class="$style.field">
      <label :class="$style.label" for="title">{{ $t('taskForm.titleLabel') }}</label>
      <input
        id="title"
        v-model="title"
        :class="$style.input"
        type="text"
        :placeholder="$t('taskForm.titlePlaceholder')"
        required
      />
    </div>

    <div :class="$style.field">
      <label :class="$style.label" for="description">{{ $t('taskForm.descriptionLabel') }}</label>
      <textarea
        id="description"
        v-model="description"
        :class="$style.textarea"
        :placeholder="$t('taskForm.descriptionPlaceholder')"
        rows="2"
      />
    </div>

    <div :class="$style.field">
      <label :class="$style.label">{{ $t('taskForm.typeLabel') }}</label>
      <div :class="$style.typeSelector">
        <label :class="[$style.typeOption, taskType === 'daily' && $style.typeOptionActive]">
          <input
            v-model="taskType"
            type="radio"
            value="daily"
            :class="$style.radioHidden"
          />
          <span :class="$style.typeIcon">📅</span>
          <span>{{ $t('taskForm.typeDaily') }}</span>
        </label>
        <label :class="[$style.typeOption, taskType === 'progress' && $style.typeOptionActive]">
          <input
            v-model="taskType"
            type="radio"
            value="progress"
            :class="$style.radioHidden"
          />
          <span :class="$style.typeIcon">📊</span>
          <span>{{ $t('taskForm.typeProgress') }}</span>
        </label>
        <label :class="[$style.typeOption, taskType === 'one-time' && $style.typeOptionActive]">
          <input
            v-model="taskType"
            type="radio"
            value="one-time"
            :class="$style.radioHidden"
          />
          <span :class="$style.typeIcon">✅</span>
          <span>{{ $t('taskForm.typeOneTime') }}</span>
        </label>
      </div>
    </div>

    <!-- Daily task options -->
    <div v-if="taskType === 'daily'" :class="$style.field">
      <label :class="$style.label" for="targetDays">{{ $t('taskForm.targetDays') }}</label>
      <input
        id="targetDays"
        v-model.number="targetDays"
        :class="$style.input"
        type="number"
        min="1"
        max="9999"
      />
    </div>

    <!-- Progress task options -->
    <template v-if="taskType === 'progress'">
      <div :class="$style.field">
        <label :class="$style.label" for="targetValue">{{ $t('taskForm.targetValue') }}</label>
        <input
          id="targetValue"
          v-model.number="targetValue"
          :class="$style.input"
          type="number"
          min="1"
        />
      </div>
      <div :class="$style.field">
        <label :class="$style.label" for="unit">{{ $t('taskForm.unit') }}</label>
        <input
          id="unit"
          v-model="unit"
          :class="$style.input"
          type="text"
          :placeholder="$t('taskForm.unitPlaceholder')"
          required
        />
      </div>
    </template>

    <div :class="$style.checkInField">
      <label :class="$style.checkboxLabel">
        <input
          v-model="checkInEnabled"
          type="checkbox"
          :class="$style.checkbox"
        />
        <span :class="$style.checkboxText">{{ $t('taskForm.checkInEnabled') }}</span>
      </label>
      <span :class="$style.checkInHint">{{ $t('taskForm.checkInEnabledHint') }}</span>
    </div>

    <div :class="$style.actions">
      <button
        type="button"
        :class="$style.cancelBtn"
        @click="handleCancel"
      >
        {{ $t('common.cancel') }}
      </button>
      <button
        type="submit"
        :class="$style.submitBtn"
        :disabled="!isValid"
      >
        {{ $t('common.create') }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import type { CreateTaskData, TaskType } from '@/models/task'

  const emit = defineEmits<{
    submit: [data: CreateTaskData]
    cancel: []
  }>()

  const title = ref('')
  const description = ref('')
  const taskType = ref<TaskType>('daily')
  const targetDays = ref(30)
  const targetValue = ref(1000)
  const unit = ref('')
  const checkInEnabled = ref(false)

  const isValid = computed(() => {
    if (!title.value.trim()) {return false}
    if (taskType.value === 'daily' && targetDays.value < 1) {return false}
    if (taskType.value === 'progress' && (targetValue.value < 1 || !unit.value.trim())) {return false}
    return true
  })

  function handleSubmit() {
    if (!isValid.value) {return}

    const data: CreateTaskData = {
      title: title.value.trim(),
      description: description.value.trim() || undefined,
      type: taskType.value,
      checkInEnabled: checkInEnabled.value,
    }

    if (taskType.value === 'daily') {
      data.targetDays = targetDays.value
    } else if (taskType.value === 'progress') {
      data.targetValue = targetValue.value
      data.unit = unit.value.trim()
    }

    emit('submit', data)
  }

  function handleCancel() {
    emit('cancel')
  }
</script>

<style module>
  .form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .input,
  .textarea {
    padding: 12px 16px;
    font-size: 1rem;
    border: 2px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface);
    color: var(--color-text);
    transition: border-color 0.2s;
  }

  .input:focus,
  .textarea:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .textarea {
    resize: vertical;
    min-height: 60px;
  }

  .typeSelector {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .typeOption {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    border: 2px solid var(--color-border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
    text-align: center;
  }

  .typeOption:hover {
    border-color: var(--color-primary);
  }

  .typeOptionActive {
    border-color: var(--color-primary);
    background: var(--color-primary-bg);
  }

  .typeIcon {
    font-size: 1.5rem;
  }

  .radioHidden {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .actions {
    display: flex;
    gap: 12px;
    margin-top: 8px;
  }

  .cancelBtn,
  .submitBtn {
    flex: 1;
    padding: 14px 20px;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancelBtn {
    background: var(--color-surface);
    color: var(--color-text);
    border: 2px solid var(--color-border);
  }

  .cancelBtn:hover {
    background: var(--color-border);
  }

  .submitBtn {
    background: var(--color-primary);
    color: white;
  }

  .submitBtn:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .submitBtn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .checkInField {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 16px;
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: 8px;
  }

  .checkboxLabel {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }

  .checkbox {
    width: 20px;
    height: 20px;
    accent-color: var(--color-primary);
    cursor: pointer;
  }

  .checkboxText {
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .checkInHint {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    padding-left: 30px;
  }
</style>
