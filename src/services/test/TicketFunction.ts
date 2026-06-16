import glpiClient from '@/services/api/glpiClient';
import type { Ticket } from '@/models/Ticket';
import {fetchAllTickets} from '@/services/api/ticketService';

async function getTicketAciens(): Promise<Ticket[]> {
    const tickets: Ticket[] = await fetchAllTickets();
    const Datenow = Date.now();

    const ticketAncien = tickets.filter(ticket => {
        const dateCreation = new Date(ticket.createdAt).getTime();
        const ageInDays = (Datenow - dateCreation) / (1000 * 60 * 60 * 24);
        return ageInDays > 7; // Filtrer les tickets créés il y a plus de 7 jours
    });
    let nbTicketPLus7jours = ticketAncien.length;
    console.log(`Nombre de tickets créés il y a plus de 7 jours : ${nbTicketPLus7jours}`);   
    return ticketAncien;
}

export { getTicketAciens };