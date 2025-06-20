// Tax Calculator Service
class LotteryTaxCalculator {
    constructor() {
        this.currentYear = new Date().getFullYear();
        
        this.federalBrackets = [
            { min: 0, max: 11000, rate: 0.10 },
            { min: 11000, max: 44725, rate: 0.12 },
            { min: 44725, max: 95375, rate: 0.22 },
            { min: 95375, max: 182050, rate: 0.24 },
            { min: 182050, max: 231250, rate: 0.32 },
            { min: 231250, max: 578125, rate: 0.35 },
            { min: 578125, max: Infinity, rate: 0.37 }
        ];
        
        this.stateTaxRates = {
            'AL': 0.05, 'AK': 0.00, 'AZ': 0.045, 'AR': 0.066, 'CA': 0.133,
            'CO': 0.044, 'CT': 0.0699, 'DE': 0.066, 'FL': 0.00, 'GA': 0.0575,
            'HI': 0.11, 'ID': 0.058, 'IL': 0.0495, 'IN': 0.0323, 'IA': 0.0853,
            'KS': 0.057, 'KY': 0.05, 'LA': 0.06, 'ME': 0.0715, 'MD': 0.0575,
            'MA': 0.05, 'MI': 0.0425, 'MN': 0.0985, 'MS': 0.05, 'MO': 0.054,
            'MT': 0.0675, 'NE': 0.0684, 'NV': 0.00, 'NH': 0.05, 'NJ': 0.1075,
            'NM': 0.059, 'NY': 0.1090, 'NC': 0.0499, 'ND': 0.029, 'OH': 0.0399,
            'OK': 0.05, 'OR': 0.099, 'PA': 0.0307, 'RI': 0.0599, 'SC': 0.07,
            'SD': 0.00, 'TN': 0.00, 'TX': 0.00, 'UT': 0.0495, 'VT': 0.0875,
            'VA': 0.0575, 'WA': 0.00, 'WV': 0.065, 'WI': 0.0765, 'WY': 0.00
        };
        
        this.stateNames = {
            'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
            'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
            'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
            'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
            'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
            'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
            'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
            'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
            'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
            'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
        };
    }
    
    calculateFederalTax(income) {
        let tax = 0;
        let taxDetails = [];
        
        for (const bracket of this.federalBrackets) {
            if (income > bracket.min) {
                const taxableInThisBracket = Math.min(income, bracket.max) - bracket.min;
                const taxForBracket = taxableInThisBracket * bracket.rate;
                tax += taxForBracket;
                
                if (taxableInThisBracket > 0) {
                    taxDetails.push({
                        range: `$${bracket.min.toLocaleString()} - $${bracket.max === Infinity ? '∞' : bracket.max.toLocaleString()}`,
                        rate: (bracket.rate * 100).toFixed(1) + '%',
                        taxableAmount: taxableInThisBracket,
                        tax: taxForBracket
                    });
                }
            }
        }
        
        return { total: tax, details: taxDetails };
    }
    
    calculateStateTax(income, state) {
        const rate = this.stateTaxRates[state] || 0;
        return income * rate;
    }
    
    calculateTotalTaxes(grossWinnings, state = 'GA', filingStatus = 'single', hasOtherIncome = 0) {
        const federalWithheld = grossWinnings * 0.24;
        
        const totalIncome = grossWinnings + hasOtherIncome;
        const federalTaxCalc = this.calculateFederalTax(totalIncome);
        const federalTaxOwed = federalTaxCalc.total;
        
        const stateTaxRate = this.stateTaxRates[state] || 0;
        const stateTaxOwed = this.calculateStateTax(grossWinnings, state);
        
        const federalRefundOrOwed = federalWithheld - federalTaxOwed;
        
        const totalTaxOwed = federalTaxOwed + stateTaxOwed;
        const netWinnings = grossWinnings - totalTaxOwed;
        
        return {
            grossWinnings,
            federalWithheld,
            federalTaxOwed,
            federalTaxDetails: federalTaxCalc.details,
            federalRefundOrOwed,
            stateTaxRate: stateTaxRate * 100,
            stateTaxOwed,
            totalTaxOwed,
            netWinnings,
            effectiveTaxRate: (totalTaxOwed / grossWinnings) * 100
        };
    }
    
    calculateAnnuityVsLumpSum(jackpotAmount, state = 'GA') {
        const annualPayment = jackpotAmount / 30;
        const firstYearPayment = annualPayment;
        
        const lumpSum = jackpotAmount * 0.6;
        
        const annuityTaxes = this.calculateTotalTaxes(firstYearPayment, state);
        const lumpSumTaxes = this.calculateTotalTaxes(lumpSum, state);
        
        let totalAnnuityAfterTax = 0;
        let currentPayment = firstYearPayment;
        
        for (let year = 0; year < 30; year++) {
            const yearTaxes = this.calculateTotalTaxes(currentPayment, state);
            totalAnnuityAfterTax += yearTaxes.netWinnings;
            currentPayment *= 1.05;
        }
        
        return {
            annuity: {
                totalJackpot: jackpotAmount,
                firstYearPayment,
                firstYearAfterTax: annuityTaxes.netWinnings,
                estimatedTotalAfterTax: totalAnnuityAfterTax,
                taxesFirstYear: annuityTaxes
            },
            lumpSum: {
                grossAmount: lumpSum,
                afterTax: lumpSumTaxes.netWinnings,
                taxes: lumpSumTaxes
            }
        };
    }
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
    
    formatPercentage(rate) {
        return (rate).toFixed(2) + '%';
    }
}

// Export to global scope
window.LotteryTaxCalculator = LotteryTaxCalculator;