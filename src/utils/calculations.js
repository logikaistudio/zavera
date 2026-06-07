// Financial calculations utilities

/**
 * Calculate profit sharing amounts
 * @param {number} totalRevenue - Total revenue amount
 * @param {number} profitSharingPercent - Percentage for SPA (hotel gets the rest)
 * @returns {object} - { spaAmount, hotelAmount }
 */
export const calculateProfitSharing = (totalRevenue, profitSharingPercent) => {
    const spaAmount = (totalRevenue * profitSharingPercent) / 100;
    const hotelAmount = totalRevenue - spaAmount;

    return {
        spaAmount,
        hotelAmount,
        spaPercent: profitSharingPercent,
        hotelPercent: 100 - profitSharingPercent
    };
};

/**
 * Calculate therapist incentive based on service duration
 * @param {number} durationMinutes - Service duration in minutes
 * @param {number} hourlyRate - Therapist hourly incentive rate
 * @returns {number} - Incentive amount
 */
export const calculateTherapistIncentive = (durationMinutes, hourlyRate) => {
    // Deprecated: use inline logic for fixed/percentage
    const hours = durationMinutes / 60;
    return hours * hourlyRate;
};

/**
 * Calculate total revenue from bookings
 * @param {array} bookings - Array of booking objects
 * @param {array} services - Array of service objects
 * @returns {number} - Total revenue
 */
export const calculateTotalRevenue = (bookings, services) => {
    return bookings.reduce((total, booking) => {
        const service = services.find(s => s.id === booking.serviceId);
        return total + (service ? service.price : 0);
    }, 0);
};

/**
 * Calculate total therapist incentives for bookings
 * @param {array} bookings - Array of booking objects
 * @param {array} services - Array of service objects
 * @param {array} therapists - Array of therapist objects
 * @returns {number} - Total incentives
 */
export const calculateTotalIncentives = (bookings, services, therapists) => {
    return bookings.reduce((total, booking) => {
        const service = services.find(s => s.id === booking.serviceId);
        const therapist = therapists.find(t => t.id === booking.therapistId);

        if (service && therapist) {
            let incentive = 0;
            const incType = (service.therapistIncentiveType && service.therapistIncentiveType !== 'default') 
                ? service.therapistIncentiveType 
                : therapist.incentiveType;
            const incVal = (service.therapistIncentiveType && service.therapistIncentiveType !== 'default') 
                ? service.therapistIncentiveValue 
                : therapist.incentiveValue;

            if (incType === 'percentage') {
                incentive = (service.price * (Number(incVal) || 0)) / 100;
            } else {
                incentive = Number(incVal) || 0;
            }
            return total + incentive;
        }

        return total;
    }, 0);
};

/**
 * Group bookings by therapist and calculate their total incentives
 * @param {array} bookings - Array of booking objects
 * @param {array} services - Array of service objects
 * @param {array} therapists - Array of therapist objects
 * @returns {array} - Array of therapist performance objects
 */
export const calculateTherapistPerformance = (bookings, services, therapists) => {
    const performance = {};

    bookings.forEach(booking => {
        const service = services.find(s => s.id === booking.serviceId);
        const therapist = therapists.find(t => t.id === booking.therapistId);

        if (service && therapist) {
            if (!performance[therapist.id]) {
                const totalBonus = (therapist.bonusItems || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                const totalDeduction = (therapist.deductionItems || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

                performance[therapist.id] = {
                    therapist,
                    bookingCount: 0,
                    totalMinutes: 0,
                    serviceIncentives: 0,
                    wage: Number(therapist.wage) || 0,
                    totalBonus,
                    totalDeduction,
                    netEarnings: 0,
                    serviceDetails: {}
                };
            }

            let incentive = 0;
            const incType = (service.therapistIncentiveType && service.therapistIncentiveType !== 'default') 
                ? service.therapistIncentiveType 
                : therapist.incentiveType;
            const incVal = (service.therapistIncentiveType && service.therapistIncentiveType !== 'default') 
                ? service.therapistIncentiveValue 
                : therapist.incentiveValue;

            if (incType === 'percentage') {
                incentive = (service.price * (Number(incVal) || 0)) / 100;
            } else {
                incentive = Number(incVal) || 0;
            }

            performance[therapist.id].bookingCount += 1;
            performance[therapist.id].totalMinutes += service.durationMinutes;
            performance[therapist.id].serviceIncentives += incentive;

            if (!performance[therapist.id].serviceDetails[service.id]) {
                performance[therapist.id].serviceDetails[service.id] = {
                    serviceName: service.name,
                    count: 0,
                    totalMinutes: 0,
                    totalRevenue: 0,
                    totalIncentive: 0
                };
            }
            performance[therapist.id].serviceDetails[service.id].count += 1;
            performance[therapist.id].serviceDetails[service.id].totalMinutes += service.durationMinutes;
            performance[therapist.id].serviceDetails[service.id].totalRevenue += service.price;
            performance[therapist.id].serviceDetails[service.id].totalIncentive += incentive;
        }
    });

    return Object.values(performance).map(perf => {
        perf.netEarnings = perf.wage + perf.serviceIncentives + perf.totalBonus - perf.totalDeduction;
        perf.serviceDetailsArray = Object.values(perf.serviceDetails);
        return perf;
    });
};

/**
 * Calculate net profit (revenue - therapist incentives)
 * @param {number} revenue - Total revenue
 * @param {number} incentives - Total therapist incentives
 * @returns {number} - Net profit
 */
export const calculateNetProfit = (revenue, incentives) => {
    return revenue - incentives;
};

/**
 * Calculate detailed income for a single therapist (for slips)
 * @param {object} therapist - Therapist object
 * @param {array} bookings - Array of all bookings
 * @param {array} services - Array of all services
 * @returns {object} - Detailed income object with serviceDetails
 */
export const calculateTherapistIncome = (therapist, bookings, services) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const completedServices = (bookings || []).filter(b => 
        b.therapistId === therapist.id && 
        b.status === 'completed' &&
        new Date(b.date).getMonth() === currentMonth &&
        new Date(b.date).getFullYear() === currentYear
    );

    let totalIncentive = 0;
    const serviceDetailsMap = {};

    completedServices.forEach(booking => {
        const service = (services || []).find(s => s.id === booking.serviceId);
        if (service) {
            const incType = (service.therapistIncentiveType && service.therapistIncentiveType !== 'default') 
                ? service.therapistIncentiveType 
                : therapist.incentiveType;
            const incVal = (service.therapistIncentiveType && service.therapistIncentiveType !== 'default') 
                ? service.therapistIncentiveValue 
                : therapist.incentiveValue;

            let incentive = 0;
            if (incType === 'percentage') {
                incentive = (service.price * (Number(incVal) || 0)) / 100;
            } else {
                incentive = Number(incVal) || 0;
            }
            
            totalIncentive += incentive;

            if (!serviceDetailsMap[service.id]) {
                serviceDetailsMap[service.id] = {
                    serviceName: service.name,
                    count: 0,
                    singleIncentive: incentive,
                    totalIncentive: 0
                };
            }
            serviceDetailsMap[service.id].count += 1;
            serviceDetailsMap[service.id].totalIncentive += incentive;
        }
    });

    const totalBonus = (therapist.bonusItems || []).reduce((sum, item) => sum + Number(item.amount), 0);
    const totalDeduction = (therapist.deductionItems || []).reduce((sum, item) => sum + Number(item.amount), 0);
    const wage = Number(therapist.wage || 0);

    return {
        wage,
        totalIncentive,
        totalBonus,
        totalDeduction,
        netTotal: wage + totalIncentive + totalBonus - totalDeduction,
        serviceDetails: Object.values(serviceDetailsMap)
    };
};
