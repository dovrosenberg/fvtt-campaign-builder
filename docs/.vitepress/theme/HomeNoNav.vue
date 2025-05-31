<template>
  <div class="home-no-nav">
    <!-- Hero Section -->
    <div class="hero" v-if="hero">
      <div class="hero-inner">
        <h1 class="hero-name" v-if="hero.name">{{ hero.name }}</h1>
        <p class="hero-text" v-if="hero.text">{{ hero.text }}</p>
        <p class="hero-tagline" v-if="hero.tagline">{{ hero.tagline }}</p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="content">
      <div class="content-container">
        <div class="todo-warning">
          <div class="todo-warning-content">
            <span class="todo-warning-icon">⚠️</span>
            <div class="todo-warning-text">
              <strong>Work in Progress</strong>
              <p>These documents are in progress and will be released with v1.0 (coming soon!)</p>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { useData } from 'vitepress'
import { computed } from 'vue'

const { page, frontmatter } = useData()

const hero = computed(() => frontmatter.value.hero)

</script>

<style scoped>
.home-no-nav {
  min-height: 100vh;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

/* Hero Section */
.hero {
  padding: 60px 24px;
  text-align: center;
  background: linear-gradient(135deg, var(--vp-c-bg) 0%, var(--vp-c-bg-soft) 100%);
}

.hero-inner {
  max-width: 960px;
  margin: 0 auto;
}

.hero-name {
  font-size: clamp(2.5rem, 8vw, 4rem);
  font-weight: 900;
  line-height: 1.1;
  margin: 0 0 16px;
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-text {
  font-size: clamp(1.2rem, 4vw, 1.8rem);
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--vp-c-text-1);
}

.hero-tagline {
  font-size: clamp(1rem, 3vw, 1.3rem);
  margin: 0 0 32px;
  color: var(--vp-c-text-2);
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.hero-action {
  display: inline-block;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s;
}

/* Content Section */
.content {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px 60px;
}

.content :deep(.vp-doc) {
  padding: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .hero {
    padding: 40px 16px;
  }
  
  .features {
    padding: 40px 16px;
  }
  
  .feature-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .feature-item {
    padding: 24px;
  }
  
  .content {
    padding: 0 16px 40px;
  }
}
</style> 