import React, { useState, useEffect } from 'react';

// COMPLETE TAX CALCULATOR COMPONENT IMPLEMENTATION
function TaxCalculator() {
    const [jackpotAmount, setJackpotAmount] = useState('');
    const [selectedState, setSelectedState] = useState('GA');
    const [otherIncome, setOtherIncome] = useState('');
    const [calculationResults, setCalculationResults] = useState(null);
    const [calculator] = useState(new window.LotteryTaxCalculator());
    const [activeCalculation, setActiveCalculation] = useState('simple');

    useEffect(() => {
        if (window.currentJackpotData && window.currentJackpotData.amount) {
            setJackpotAmount(window.currentJackpotData.amount.toString());
        }
    }, []);

    const calculateTaxes = () => {
        const grossAmount = parseFloat(jackpotAmount.replace(/[,$]/g, ''));
        const income = parseFloat(otherIncome.replace(/[,$]/g, '')) || 0;
        
        if (!grossAmount || grossAmount <= 0) {
            alert('Please enter a valid jackpot amount');
            return;
        }

        if (activeCalculation === 'simple') {
            const results = calculator.calculateTotalTaxes(grossAmount, selectedState, 'single', income);
            setCalculationResults({ type: 'simple', data: results });
        } else {
            const results = calculator.calculateAnnuityVsLumpSum(grossAmount, selectedState);
            setCalculationResults({ type: 'comparison', data: results });
        }
    };

    const clearCalculation = () => {
        setCalculationResults(null);
        setJackpotAmount('');
        setOtherIncome('');
    };

    const renderSimpleCalculation = (results) => {
        return React.createElement('div', { className: 'space-y-6' },
            React.createElement('div', { className: 'tax-summary-grid' },
                React.createElement('div', { className: 'tax-summary-item' },
                    React.createElement('div', { className: 'text-sm text-gray-600' }, 'Gross Winnings'),
                    React.createElement('div', { className: 'highlight-amount' }, calculator.formatCurrency(results.grossWinnings))
                ),
                React.createElement('div', { className: 'tax-summary-item negative' },
                    React.createElement('div', { className: 'text-sm text-gray-600' }, 'Total Taxes Owed'),
                    React.createElement('div', { className: 'highlight-amount warning-text' }, calculator.formatCurrency(results.totalTaxOwed))
                ),
                React.createElement('div', { className: 'tax-summary-item positive' },
                    React.createElement('div', { className: 'text-sm text-gray-600' }, 'Net After Taxes'),
                    React.createElement('div', { className: 'highlight-amount positive-text' }, calculator.formatCurrency(results.netWinnings))
                ),
                React.createElement('div', { className: 'tax-summary-item' },
                    React.createElement('div', { className: 'text-sm text-gray-600' }, 'Effective Tax Rate'),
                    React.createElement('div', { className: 'highlight-amount' }, calculator.formatPercentage(results.effectiveTaxRate))
                )
            ),

            React.createElement('div', { className: 'card' },
                React.createElement('h4', { className: 'text-lg font-semibold mb-4' }, '💰 Tax Breakdown'),
                
                React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
                    React.createElement('div', null,
                        React.createElement('h5', { className: 'font-semibold mb-3 text-blue-700' }, '🏛️ Federal Taxes'),
                        React.createElement('div', { className: 'space-y-2 text-sm' },
                            React.createElement('div', { className: 'flex justify-between' },
                                React.createElement('span', null, 'Withheld (24%):'),
                                React.createElement('span', { className: 'font-medium' }, calculator.formatCurrency(results.federalWithheld))
                            ),
                            React.createElement('div', { className: 'flex justify-between' },
                                React.createElement('span', null, 'Actually Owed:'),
                                React.createElement('span', { className: 'font-medium' }, calculator.formatCurrency(results.federalTaxOwed))
                            ),
                            React.createElement('div', { className: 'flex justify-between border-t pt-2' },
                                React.createElement('span', { className: 'font-medium' }, 
                                    results.federalRefundOrOwed >= 0 ? 'Refund Expected:' : 'Additional Owed:'
                                ),
                                React.createElement('span', { 
                                    className: `font-bold ${results.federalRefundOrOwed >= 0 ? 'positive-text' : 'warning-text'}`
                                }, calculator.formatCurrency(Math.abs(results.federalRefundOrOwed)))
                            )
                        )
                    ),

                    React.createElement('div', null,
                        React.createElement('h5', { className: 'font-semibold mb-3 text-green-700' }, 
                            `🏛️ ${calculator.stateNames[selectedState]} State Taxes`
                        ),
                        React.createElement('div', { className: 'space-y-2 text-sm' },
                            React.createElement('div', { className: 'flex justify-between' },
                                React.createElement('span', null, 'Tax Rate:'),
                                React.createElement('span', { className: 'font-medium' }, 
                                    calculator.formatPercentage(results.stateTaxRate)
                                )
                            ),
                            React.createElement('div', { className: 'flex justify-between' },
                                React.createElement('span', null, 'State Tax Owed:'),
                                React.createElement('span', { className: 'font-medium' }, 
                                    calculator.formatCurrency(results.stateTaxOwed)
                                )
                            ),
                            results.stateTaxRate === 0 ? React.createElement('div', { className: 'text-green-600 text-xs font-medium' },
                                '✅ No state income tax!'
                            ) : null
                        )
                    )
                )
            )
        );
    };

    const renderComparisonCalculation = (results) => {
        const { annuity, lumpSum } = results;
        
        return React.createElement('div', { className: 'space-y-6' },
            React.createElement('div', { className: 'tax-summary-grid' },
                React.createElement('div', { className: 'tax-summary-item' },
                    React.createElement('div', { className: 'text-sm text-gray-600' }, 'Annuity Net (30 years)'),
                    React.createElement('div', { className: 'highlight-amount positive-text' }, calculator.formatCurrency(annuity.totalAfterTax))
                ),
                React.createElement('div', { className: 'tax-summary-item' },
                    React.createElement('div', { className: 'text-sm text-gray-600' }, 'Lump Sum Net'),
                    React.createElement('div', { className: 'highlight-amount positive-text' }, calculator.formatCurrency(lumpSum.afterTax))
                ),
                React.createElement('div', { className: 'tax-summary-item' },
                    React.createElement('div', { className: 'text-sm text-gray-600' }, 'Difference'),
                    React.createElement('div', { 
                        className: `highlight-amount ${annuity.totalAfterTax > lumpSum.afterTax ? 'positive-text' : 'warning-text'}`
                    }, calculator.formatCurrency(Math.abs(annuity.totalAfterTax - lumpSum.afterTax)))
                ),
                React.createElement('div', { className: 'tax-summary-item' },
                    React.createElement('div', { className: 'text-sm text-gray-600' }, 'Recommended'),
                    React.createElement('div', { className: 'highlight-amount' }, 
                        annuity.totalAfterTax > lumpSum.afterTax ? '📈 Annuity' : '💰 Lump Sum'
                    )
                )
            ),

            React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
                React.createElement('div', { className: 'card' },
                    React.createElement('h4', { className: 'text-lg font-semibold mb-4' }, '📈 Annuity Details'),
                    React.createElement('div', { className: 'space-y-3' },
                        React.createElement('div', { className: 'flex justify-between' },
                            React.createElement('span', null, 'Annual Payment:'),
                            React.createElement('span', { className: 'font-medium' }, calculator.formatCurrency(annuity.annualPayment))
                        ),
                        React.createElement('div', { className: 'flex justify-between' },
                            React.createElement('span', null, 'Annual After Tax:'),
                            React.createElement('span', { className: 'font-medium' }, calculator.formatCurrency(annuity.annualAfterTax))
                        ),
                        React.createElement('div', { className: 'flex justify-between' },
                            React.createElement('span', null, 'Total Over 30 Years:'),
                            React.createElement('span', { className: 'font-medium' }, calculator.formatCurrency(annuity.totalGross))
                        ),
                        React.createElement('div', { className: 'flex justify-between' },
                            React.createElement('span', null, 'Total Taxes (30 years):'),
                            React.createElement('span', { className: 'font-medium text-red-600' }, calculator.formatCurrency(annuity.totalTaxes))
                        ),
                        React.createElement('div', { className: 'border-t pt-3' },
                            React.createElement('div', { className: 'flex justify-between font-bold' },
                                React.createElement('span', null, 'Net After 30 Years:'),
                                React.createElement('span', { className: 'text-green-600' }, calculator.formatCurrency(annuity.totalAfterTax))
                            )
                        ),
                        React.createElement('div', { className: 'text-xs text-gray-600 mt-2' },
                            `Effective tax rate: ${calculator.formatPercentage(annuity.taxes.effectiveTaxRate)}`
                        )
                    )
                ),

                React.createElement('div', { className: 'card' },
                    React.createElement('h4', { className: 'text-lg font-semibold mb-4' }, '💰 Lump Sum Details'),
                    React.createElement('div', { className: 'space-y-3' },
                        React.createElement('div', { className: 'flex justify-between' },
                            React.createElement('span', null, 'Gross Lump Sum:'),
                            React.createElement('span', { className: 'font-medium' }, calculator.formatCurrency(lumpSum.grossAmount))
                        ),
                        React.createElement('div', { className: 'flex justify-between' },
                            React.createElement('span', null, 'Federal Taxes:'),
                            React.createElement('span', { className: 'font-medium text-red-600' }, calculator.formatCurrency(lumpSum.taxes.federalTaxOwed))
                        ),
                        React.createElement('div', { className: 'flex justify-between' },
                            React.createElement('span', null, 'State Taxes:'),
                            React.createElement('span', { className: 'font-medium text-red-600' }, calculator.formatCurrency(lumpSum.taxes.stateTaxOwed))
                        ),
                        React.createElement('div', { className: 'flex justify-between' },
                            React.createElement('span', null, 'Total Taxes:'),
                            React.createElement('span', { className: 'font-medium text-red-600' }, calculator.formatCurrency(lumpSum.taxes.totalTaxOwed))
                        ),
                        React.createElement('div', { className: 'border-t pt-3' },
                            React.createElement('div', { className: 'flex justify-between font-bold' },
                                React.createElement('span', null, 'Net After Taxes:'),
                                React.createElement('span', { className: 'text-green-600' }, calculator.formatCurrency(lumpSum.afterTax))
                            )
                        ),
                        React.createElement('div', { className: 'text-xs text-gray-600 mt-2' },
                            `Effective tax rate: ${calculator.formatPercentage(lumpSum.taxes.effectiveTaxRate)}`
                        )
                    )
                )
            )
        );
    };

    const states = Object.entries(calculator.stateNames).map(([code, name]) => ({ code, name }));

    return React.createElement('div', { className: 'space-y-6' },
        React.createElement('div', { className: 'card' },
            React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, '🧮 Lottery Tax Calculator'),
            
            React.createElement('div', { className: 'mb-4' },
                React.createElement('div', { className: 'flex gap-2 mb-3' },
                    React.createElement('button', {
                        onClick: () => setActiveCalculation('simple'),
                        className: `btn btn-sm ${activeCalculation === 'simple' ? 'btn-primary' : 'btn-secondary'}`
                    }, '📊 Simple Tax Calculation'),
                    React.createElement('button', {
                        onClick: () => setActiveCalculation('comparison'),
                        className: `btn btn-sm ${activeCalculation === 'comparison' ? 'btn-primary' : 'btn-secondary'}`
                    }, '⚖️ Annuity vs Lump Sum')
                )
            ),
            
            React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4' },
                React.createElement('div', { className: 'tax-input-group' },
                    React.createElement('label', null, 
                        activeCalculation === 'simple' ? '💰 Winnings Amount' : '🎰 Total Jackpot'
                    ),
                    React.createElement('input', {
                        type: 'text',
                        value: jackpotAmount,
                        onChange: (e) => setJackpotAmount(e.target.value),
                        placeholder: activeCalculation === 'simple' ? '1,000,000' : '100,000,000',
                    }),
                    window.currentJackpotData ? React.createElement('button', {
                        onClick: () => setJackpotAmount(
                            activeCalculation === 'simple' ? 
                                (window.currentJackpotData.cashValue || window.currentJackpotData.amount * 0.6).toString() :
                                window.currentJackpotData.amount.toString()
                        ),
                        className: 'btn btn-secondary btn-sm text-xs'
                    }, activeCalculation === 'simple' ? 'Use Current Cash' : 'Use Current Jackpot') : null
                ),

                React.createElement('div', { className: 'tax-input-group' },
                    React.createElement('label', null, '🏛️ Your State'),
                    React.createElement('select', {
                        value: selectedState,
                        onChange: (e) => setSelectedState(e.target.value)
                    },
                        states.map(state =>
                            React.createElement('option', { key: state.code, value: state.code },
                                `${state.name} (${calculator.formatPercentage(calculator.stateTaxRates[state.code] * 100)})`
                            )
                        )
                    )
                ),

                activeCalculation === 'simple' ? React.createElement('div', { className: 'tax-input-group' },
                    React.createElement('label', null, '💼 Other Annual Income'),
                    React.createElement('input', {
                        type: 'text',
                        value: otherIncome,
                        onChange: (e) => setOtherIncome(e.target.value),
                        placeholder: '75,000',
                    })
                ) : null,

                React.createElement('div', { className: 'tax-input-group justify-end' },
                    React.createElement('label', { className: 'invisible' }, 'Actions'),
                    React.createElement('div', { className: 'flex gap-2' },
                        React.createElement('button', {
                            onClick: calculateTaxes,
                            className: 'btn btn-primary btn-sm'
                        }, '🧮 Calculate'),
                        React.createElement('button', {
                            onClick: clearCalculation,
                            className: 'btn btn-secondary btn-sm'
                        }, '🗑️ Clear')
                    )
                )
            )
        ),

        calculationResults ? React.createElement('div', null,
            calculationResults.type === 'simple' 
                ? renderSimpleCalculation(calculationResults.data)
                : renderComparisonCalculation(calculationResults.data)
        ) : null
    );
}

export default TaxCalculator;