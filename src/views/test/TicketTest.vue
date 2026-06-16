<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getTicketAciens } from '@/services/test/TicketFunction';

const tickets = ref([]);
const priority: Record<number, { label: string; color: string }> = 
{ 1: { label: 'Très basse', color: 'blue' },
  2: { label: 'Basse', color: 'green' },
  3: { label: 'Moyenne', color: 'yellow' },
  4: { label: 'Haute', color: 'orange' },
  5: { label: 'Très haute', color: 'red' },
  6: { label: 'Majeure', color: 'purple' }
};

function calculerEnjours(dateString: string): number {
    const date = new Date(dateString);
    const maintenant = new Date();
    const differenceTemps = maintenant.getTime() - date.getTime();
    const differenceJours = Math.floor(differenceTemps / (1000 * 3600 * 24));
    return differenceJours;
}
function getLabelStatus(status: number): string {
    switch (status) {
        case 1:
            return 'Très basse';
        case 2:
            return 'Basse';
        case 3:
            return 'Moyenne';
        case 4:
            return 'Haute';
        case 5:
            return 'Très haute';
        case 6:
            return 'Majeure';
        default:
            return status;
    }
}

onMounted(async () => {
    tickets.value = await getTicketAciens();
});
</script>

<template>
    <div>
        <h1>Tickets Anciens</h1>
        <div>
            <p>Nombre de tickets créés il y a plus de 7 jours : {{ tickets.length }}</p>
        </div>
        <ul>
            <li v-for="ticket in tickets" :key="ticket.id">
                {{ ticket.title }} - {{ ticket.description }}
                <p>le  {{ ticket.createdAt }}</p>
                <p :style="{ color: priority[ticket.priority].color }">{{ priority[ticket.priority].label }}</p>
                <p>Créé il y a {{ calculerEnjours(ticket.createdAt) }} jours</p>
            </li>
        </ul>
    </div>
</template>