<template>
  <Layout>
    <template #doc-before>
      <div v-if="page.frontmatter?.TODO" class="todo-warning">
        <div class="todo-warning-content">
          <span class="todo-warning-icon">⚠️</span>
          <div class="todo-warning-text">
            <strong>Work in Progress</strong>
            <p>This page is a placeholder - the information may be wrong, incomplete, or completely made up.</p>
          </div>
        </div>
      </div>
    </template>
  </Layout>
</template>

<script setup>
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

const { Layout } = DefaultTheme

const { page } = useData()

</script>

<style scoped>
.todo-warning {
  margin: 16px 0 24px 0;
  padding: 16px;
  background: #fef3cd;
  border: 1px solid #fecf47;
  border-radius: 8px;
  border-left: 4px solid #f59e0b;
}

.todo-warning-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.todo-warning-icon {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
}

.todo-warning-text strong {
  display: block;
  color: #92400e;
  font-weight: 600;
  margin-bottom: 4px;
}

.todo-warning-text p {
  color: #92400e;
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
}

/* Dark mode support */
.dark .todo-warning {
  background: #451a03;
  border-color: #92400e;
  border-left-color: #f59e0b;
}

.dark .todo-warning-text strong,
.dark .todo-warning-text p {
  color: #fbbf24;
}
</style> 