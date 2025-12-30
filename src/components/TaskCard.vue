<template>
  <article :class="[$style.card, completed && $style.completed]">
    <header :class="$style.header">
      <span :class="$style.type">{{ typeLabel }}</span>
      <div :class="$style.menuWrapper">
        <button
          :class="$style.menuBtn"
          :popovertarget="menuId"
          aria-label="Меню задачи"
        >
          ⋮
        </button>
        <div :id="menuId" popover="auto" :class="$style.dropdown">
          <button :class="$style.dropdownItem" @click="openEditModal">
            ✏️ Редактировать
          </button>
          <button :class="[$style.dropdownItem, $style.dangerItem]" @click="handleDelete">
            🗑️ Удалить
          </button>
        </div>
      </div>
    </header>

    <h3 :class="$style.title">{{ task.title }}</h3>

    <p v-if="task.description" :class="$style.description">
      {{ task.description }}
    </p>

    <div :class="$style.progressContainer">
      <div :class="$style.progressBar">
        <div
          :class="$style.progressFill"
          :style="{ width: `${progress}%` }"
        />
      </div>
      <span :class="$style.progressText">{{ progressText }}</span>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" :class="$style.modal" @click.self="closeEditModal">
      <div :class="$style.modalContent">
        <h3 :class="$style.modalTitle">Редактирование 📝</h3>

        <form :class="$style.modalForm" @submit.prevent="saveChanges">
          <div :class="$style.modalScrollArea">
            <div :class="$style.formGroup">
              <label :class="$style.label">Название</label>
              <input
                v-model="editForm.title"
                :class="$style.input"
                type="text"
                required
              />
            </div>

            <div :class="$style.formGroup">
              <label :class="$style.label">Описание</label>
              <textarea
                v-model="editForm.description"
                :class="$style.textarea"
                rows="3"
              />
            </div>

            <!-- Daily task fields -->
            <template v-if="isDailyTask(task)">
              <div :class="$style.formGroup">
                <label :class="$style.label">Цель (дней)</label>
                <input
                  v-model.number="editForm.targetDays"
                  :class="$style.input"
                  type="number"
                  min="1"
                  required
                />
              </div>

              <div :class="$style.formGroup">
                <label :class="$style.label">Выполненные дни ({{ editForm.completedDates.length }})</label>

                <div :class="$style.addDateRow">
                  <input
                    v-model="editForm.newDate"
                    :class="$style.input"
                    type="date"
                    :max="todayDate"
                  />
                  <button
                    type="button"
                    :class="$style.addDateBtn"
                    :disabled="!canAddDate"
                    @click="addDate"
                  >
                    +
                  </button>
                </div>

                <div v-if="editForm.completedDates.length > 0" :class="$style.dateList">
                  <div
                    v-for="date in sortedCompletedDates"
                    :key="date"
                    :class="$style.dateRow"
                  >
                    <span :class="$style.dateText">{{ formatDate(date) }}</span>
                    <button
                      type="button"
                      :class="$style.dateRemoveBtn"
                      @click="removeDate(date)"
                      aria-label="Удалить дату"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div v-else :class="$style.emptyDates">Нет выполненных дней</div>
              </div>
            </template>

            <!-- Progress task fields -->
            <template v-if="isProgressTask(task)">
              <div :class="$style.formGroup">
                <label :class="$style.label">Текущий прогресс</label>
                <input
                  v-model.number="editForm.currentValue"
                  :class="$style.input"
                  type="number"
                  min="0"
                  required
                />
              </div>
              <div :class="$style.formGroup">
                <label :class="$style.label">Цель</label>
                <input
                  v-model.number="editForm.targetValue"
                  :class="$style.input"
                  type="number"
                  min="1"
                  required
                />
              </div>
              <div :class="$style.formGroup">
                <label :class="$style.label">Единица измерения</label>
                <input
                  v-model="editForm.unit"
                  :class="$style.input"
                  type="text"
                  required
                />
              </div>
            </template>
          </div>

          <div :class="$style.modalActions">
            <button type="button" :class="$style.cancelBtn" @click="closeEditModal">
              Отмена
            </button>
            <button type="submit" :class="$style.saveBtn" :disabled="isSaving">
              {{ isSaving ? 'Сохранение...' : 'Сохранить' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
  import { computed, ref, reactive } from 'vue'
  import type { Task, DailyTask, ProgressTask } from '@/models/task'
  import { getTaskProgress, isDailyTask, isProgressTask, isOneTimeTask } from '@/models/task'
  import { useTaskStore } from '@/stores/task-store'

  const props = defineProps<{
    task: Task
    completed?: boolean
  }>()

  const emit = defineEmits<{
    delete: [taskId: string]
    update: [task: Task]
  }>()

  const store = useTaskStore()

  // Unique ID for popover
  const menuId = computed(() => `menu-${props.task.id}`)

  // Menu state
  const showEditModal = ref(false)
  const isSaving = ref(false)

  // Edit form state
  const editForm = reactive({
    title: '',
    description: '',
    targetDays: 0,
    currentValue: 0,
    targetValue: 0,
    unit: '',
    completedDates: [] as string[],
    newDate: '',
  })

  const progress = computed(() => getTaskProgress(props.task))

  const progressText = computed(() => {
    const task = props.task
    if (isDailyTask(task)) {
      return `${task.completedDates.length} / ${task.targetDays} дней`
    }
    if (isProgressTask(task)) {
      return `${task.currentValue.toLocaleString()} / ${task.targetValue.toLocaleString()} ${task.unit}`
    }
    if (isOneTimeTask(task)) {
      return task.completedAt ? 'Выполнено ✓' : 'Не выполнено'
    }
    return ''
  })

  const typeLabel = computed(() => {
    switch (props.task.type) {
      case 'daily':
        return '📅 Ежедневная'
      case 'progress':
        return '📊 Прогресс'
      case 'one-time':
        return '✅ Разовая'
    }
  })

  // Date management for daily tasks
  const todayDate = computed(() => new Date().toISOString().split('T')[0])

  const sortedCompletedDates = computed(() =>
    [...editForm.completedDates].sort((a, b) => b.localeCompare(a))
  )

  const canAddDate = computed(() => {
    const date = editForm.newDate
    if (!date) return false
    if (date > todayDate.value!) return false
    if (editForm.completedDates.includes(date)) return false
    return true
  })

  function formatDate(isoDate: string): string {
    const [year, month, day] = isoDate.split('-')
    return `${day}.${month}.${year}`
  }

  function addDate() {
    if (!canAddDate.value) return
    editForm.completedDates.push(editForm.newDate)
    editForm.newDate = ''
  }

  function removeDate(date: string) {
    const index = editForm.completedDates.indexOf(date)
    if (index !== -1) {
      editForm.completedDates.splice(index, 1)
    }
  }

  function hideMenu() {
    document.getElementById(menuId.value)?.hidePopover()
  }

  function initEditForm() {
    editForm.title = props.task.title
    editForm.description = props.task.description ?? ''
    editForm.newDate = ''

    if (isDailyTask(props.task)) {
      editForm.targetDays = props.task.targetDays
      editForm.completedDates = [...props.task.completedDates]
    }

    if (isProgressTask(props.task)) {
      editForm.currentValue = props.task.currentValue
      editForm.targetValue = props.task.targetValue
      editForm.unit = props.task.unit
    }
  }

  function openEditModal() {
    hideMenu()
    initEditForm()
    showEditModal.value = true
  }

  function closeEditModal() {
    showEditModal.value = false
  }

  async function saveChanges() {
    if (!editForm.title.trim()) return

    isSaving.value = true

    let updatedTask: Task

    if (isDailyTask(props.task)) {
      updatedTask = {
        ...props.task,
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        targetDays: editForm.targetDays,
        completedDates: editForm.completedDates,
      } satisfies DailyTask
    } else if (isProgressTask(props.task)) {
      updatedTask = {
        ...props.task,
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        currentValue: editForm.currentValue,
        targetValue: editForm.targetValue,
        unit: editForm.unit.trim(),
      } satisfies ProgressTask
    } else {
      updatedTask = {
        ...props.task,
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
      }
    }

    const result = await store.updateTask(updatedTask)

    if (result) {
      emit('update', result)
      closeEditModal()
    }

    isSaving.value = false
  }

  function handleDelete() {
    hideMenu()
    emit('delete', props.task.id)
  }
</script>

<style module>
  .card {
    background: var(--color-surface);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .completed .progressFill {
    background: var(--color-success, #22c55e);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .type {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .menuWrapper {
    position: relative;
  }

  .menuBtn {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    padding: 4px 12px;
    font-size: 1.25rem;
    font-weight: bold;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .menuBtn:hover {
    background: var(--color-hover);
  }

  .dropdown {
    position: absolute;
    inset: unset;
    top: anchor(bottom);
    right: anchor(right);
    margin: 0;
    padding: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    min-width: 160px;
  }

  .dropdown::backdrop {
    background: transparent;
  }

  .dropdownItem {
    display: block;
    width: 100%;
    padding: 12px 16px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    color: var(--color-text);
    font-size: 0.875rem;
    transition: background-color 0.2s;
  }

  .dropdownItem:hover {
    background: var(--color-hover);
  }

  .dangerItem:hover {
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }

  .title {
    margin: 0 0 8px;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .description {
    margin: 0 0 12px;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    line-height: 1.4;
  }

  .progressContainer {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .progressBar {
    height: 8px;
    background: var(--color-progress-bg);
    border-radius: 4px;
    overflow: hidden;
  }

  .progressFill {
    height: 100%;
    background: var(--color-primary);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progressText {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    text-align: right;
  }

  /* Modal styles */
  .modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 16px;
  }

  .modalContent {
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border-radius: 16px;
    padding: 24px;
    width: 100%;
    max-width: 400px;
    max-height: 90vh;
  }

  .modalTitle {
    margin: 0 0 20px;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text);
    flex-shrink: 0;
  }

  .modalForm {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
  }

  .modalScrollArea {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding-right: 8px;
    margin-right: -8px;
  }

  .formGroup {
    margin-bottom: 16px;
  }

  .label {
    display: block;
    margin-bottom: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .input,
  .textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    font-size: 1rem;
    background: var(--color-background);
    color: var(--color-text);
    box-sizing: border-box;
  }

  .input:focus,
  .textarea:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .textarea {
    resize: vertical;
    min-height: 80px;
  }

  .dateList {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 12px;
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 4px;
  }

  .dateRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--color-hover);
    border-radius: 6px;
  }

  .dateText {
    font-size: 0.875rem;
    color: var(--color-text);
  }

  .dateRemoveBtn {
    background: none;
    border: none;
    padding: 4px 8px;
    font-size: 1.25rem;
    line-height: 1;
    color: var(--color-text-secondary);
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.2s, color 0.2s;
  }

  .dateRemoveBtn:hover {
    color: var(--color-danger);
    background: var(--color-danger-bg);
  }

  .emptyDates {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    margin-bottom: 12px;
  }

  .addDateRow {
    display: flex;
    gap: 8px;
  }

  .addDateRow .input {
    flex: 1;
  }

  .addDateBtn {
    width: 44px;
    padding: 12px;
    border: none;
    border-radius: 8px;
    background: var(--color-primary);
    color: white;
    font-size: 1.25rem;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .addDateBtn:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .addDateBtn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modalActions {
    display: flex;
    gap: 12px;
    padding-top: 24px;
    flex-shrink: 0;
    border-top: 1px solid var(--color-border);
    margin-top: 16px;
  }

  .cancelBtn,
  .saveBtn {
    flex: 1;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .cancelBtn {
    background: var(--color-hover);
    border: none;
    color: var(--color-text);
  }

  .cancelBtn:hover {
    background: var(--color-border);
  }

  .saveBtn {
    background: var(--color-primary);
    border: none;
    color: white;
  }

  .saveBtn:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .saveBtn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
