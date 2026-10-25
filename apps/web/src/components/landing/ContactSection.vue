<script setup lang="ts">
import { ref } from 'vue'

const name = ref('')
const email = ref('')
const message = ref('')
const sent = ref(false)

function handleSubmit() {
  if (!name.value || !email.value) return
  sent.value = true
  name.value = ''
  email.value = ''
  message.value = ''
}
</script>

<template>
  <section id="contact" class="section">
    <div class="container">
      <div class="badge">Get Early Access</div>
      <h2>Ready to see your system clearly?</h2>
      <p class="desc">Leave your details and we’ll invite you as soon as Structura is ready for your team.</p>

      <form v-if="!sent" class="form" @submit.prevent="handleSubmit">
        <input v-model="name" type="text" placeholder="Your name" required />
        <input v-model="email" type="email" placeholder="Work email" required />
        <textarea v-model="message" placeholder="Tell us about your project (optional)" rows="4"></textarea>
        <button type="submit">Request Access</button>
      </form>

      <div v-else class="success">
        <h3>Thank you!</h3>
        <p>We received your request and will be in touch soon.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section {
  position: relative;
  padding: var(--space-32) var(--space-6) var(--space-36);
}

.container {
  position: relative;
  z-index: 1;
  max-width: var(--content-width-narrow);
  margin: 0 auto;
  text-align: center;
}

.badge {
  display: inline-block;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-accent-primary) var(--alpha-08), transparent);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  color: var(--color-accent-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  margin-bottom: var(--space-4);
}

h2 {
  margin-bottom: var(--space-3);
  font-size: clamp(var(--font-size-4xl), 3vw, var(--font-size-6xl));
  line-height: var(--line-height-display);
  letter-spacing: var(--tracking-tighter);
}

.desc {
  margin-bottom: var(--space-10);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  font-size: var(--font-size-md);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  border-radius: var(--radius-xl);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface) var(--alpha-full), transparent), color-mix(in srgb, var(--color-surface) var(--alpha-90), transparent));
  box-shadow: var(--shadow-md);
}

input,
textarea {
  width: 100%;
  padding: var(--space-4) var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  background: color-mix(in srgb, var(--color-surface) var(--alpha-70), transparent);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color var(--duration-normal) ease, box-shadow var(--duration-normal) ease;
}

[data-theme='light'] .form {
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-highlight) var(--alpha-full), transparent), color-mix(in srgb, var(--color-surface-raised) var(--alpha-90), transparent));
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-16), transparent);
  box-shadow: var(--shadow-accent-glow);
}

[data-theme='light'] input,
[data-theme='light'] textarea {
  background: color-mix(in srgb, var(--color-surface-raised) var(--alpha-90), transparent);
  border-color: color-mix(in srgb, var(--color-surface) var(--alpha-08), transparent);
  color: var(--color-text-primary);
}

[data-theme='light'] .success {
  background: color-mix(in srgb, var(--color-surface-raised) var(--alpha-80), transparent);
  border-color: color-mix(in srgb, var(--color-success) var(--alpha-20), transparent);
}

input::placeholder,
textarea::placeholder {
  color: var(--color-text-secondary);
}

input:focus,
textarea:focus {
  border-color: color-mix(in srgb, var(--color-accent-primary) var(--alpha-40), transparent);
  box-shadow: var(--focus-ring);
}

button {
  padding: var(--space-4) var(--space-4);
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-accent-gradient);
  color: var(--color-text-on-accent);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-extrabold);
  cursor: pointer;
  transition: transform var(--duration-normal) ease, box-shadow var(--duration-normal) ease;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-secondary-glow);
}

.success {
  padding: var(--space-8) var(--space-6);
  border-radius: var(--radius-xl);
  border: 1px solid color-mix(in srgb, var(--color-success) var(--alpha-20), transparent);
  background: color-mix(in srgb, var(--color-surface) var(--alpha-40), transparent);
  box-shadow: var(--shadow-md);
}

.success h3 {
  margin-bottom: var(--space-2);
  font-size: var(--font-size-2xl);
  color: var(--color-success);
}

.success p {
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
}
</style>