const KULTURKLIK_URL = "https://api.euskadi.eus/culture/events/upcoming";

/**
 * @description Obtiene los próximos eventos culturales de Kulturklik.
 * @returns {Promise<Object>} Datos de los eventos recibidos.
 */

const getUpcomingEvents = async () => {
    try {
        const response = await fetch(KULTURKLIK_URL);

        if (!response.ok) {
            throw new Error(
                `Kulturklik API error: ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();

        return data;

    } catch (error) {
        console.error("Error fetching events from Kulturklik:", error);
        throw error;
    }
};

export { getUpcomingEvents };