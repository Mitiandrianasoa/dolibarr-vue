<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getTodos, createTodo, deleteTodo, updateTodo, type Todo } from '@/services/test/todoService'

const todos = ref<Todo[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const newTodoText = ref('');
const newTodoTime = ref(0);

// Charger les todos au démarrage
onMounted(async () => {
  await loadTodos();
});

async function loadTodos() {
  loading.value = true;
  error.value = null;
  try {
    // Correction 1 : getTodos retourne directement les données
    todos.value = await getTodos();
  } catch (err) {
    console.error(err);
    error.value = 'Failed to load todos';
  } finally {
    loading.value = false;
  }
}

// Ajouter un todo
async function addTodo() {
  const text = newTodoText.value.trim();
  if (!text) return;
  
  try {
    // Correction 2 : attendre la création et récupérer le todo créé
    const newTodo = await createTodo({
      title: text,
      time: newTodoTime.value,
      completed: false
    });
    
    // Ajouter au tableau local
    todos.value.push(newTodo);
    
    // Vider le formulaire
    newTodoText.value = '';
    newTodoTime.value = 0;
  } catch (err) {
    console.error(err);
    error.value = 'Failed to add todo';
  }
}
//TEST LIGNE DE COMMANDES
// Basculer l'état complété
async function toggleComplete(todo: Todo) {
  try {
    const updated = await updateTodo(todo.id, {
      completed: !todo.completed
    });
    // Mettre à jour localement
    todo.completed = updated.completed;
  } catch (err) {
    console.error(err);
    error.value = 'Failed to update todo';
  }
}

// void Helllo() {
//   try {
//    console.log("test get child");
//   } catch (err) {
//     console.error(err);
//     error.value = 'Failed to update todo';
//   }
// }

// Supprimer un todo
async function removeTodo(id: number) {
  try {
    // Correction 3 : attendre la suppression
    await deleteTodo(id);
    // Supprimer localement
    todos.value = todos.value.filter(todo => todo.id !== id);
  } catch (err) {
    console.error(err);
    error.value = 'Failed to delete todo';
  }
}


function tempsRestant(todo: Todo): number {
    let reste = 0;
    for (const t of todos.value) {
        if (!t.completed) {
            reste += t.time;
            break;
        }
    }
    return reste;
}


// // Pourcentage de complétion (propriété calculée)
const percentageCompleted = computed(() => {
  if (todos.value.length === 0) return 0;
  const completedCount = todos.value.filter(todo => todo.completed).length;
  return (completedCount / todos.value.length) * 100;
});
</script>

<template>
  <div>
    <h1>To-Do List</h1>
    
    <!-- Affichage des erreurs -->
    <div v-if="error" class="error">{{ error }}</div>
    <!-- <p>{{Helllo()}}</p> -->
    <!-- Chargement -->
    <div v-if="loading" class="loading">Chargement...</div>
    
    <!-- Contenu -->
    <div v-else>
      <p>Total To-Dos: {{ todos.length }}</p>
      <p>Completed: {{ percentageCompleted.toFixed(2) }}%</p>
      <p>Remaining time: {{ tempsRestant(todos.value)}} min</p>
      <ul>
        <li v-for="todo in todos" :key="todo.id">
          <span :style="{
            color: todo.time < 10 ? 'green' : todo.time <30 ? 'orange' : 'red'
          }">{{ todo.title }}</span>
          <span v-if="todo.time > 0"> - {{ todo.time }} min</span>
          <!-- <span v-if="todo.time>30"> - Long task</span> -->
          <span v-if="todo.completed"> ✓</span>
          <button @click="toggleComplete(todo)">
            {{ todo.completed ? 'Undo' : 'Complete' }}
          </button>
          <button @click="removeTodo(todo.id)">Remove</button>
        </li>
      </ul>
      
      <input 
        v-model="newTodoText" 
        type="text" 
        placeholder="Add a new to-do"
        @keyup.enter="addTodo"
      />
      <input 
        type="number" 
        v-model.number="newTodoTime" 
        placeholder="Time (optional)"
      />
      <button @click="addTodo">Add</button>
    </div>
  </div>
</template>

<style scoped>
.error {
  background: #fee2e2;
  color: #dc2626;
  padding: 0.5rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}
.loading {
  text-align: center;
  padding: 1rem;
  color: #666;
}
</style>