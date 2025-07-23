
import { TributacaoService } from './tributacaoService';

// Test utility function
function testTaxationScenario(name, taxes, productValue, crt) {
    console.log(`\n=== ${name} ===`);
    console.log('Input:', JSON.stringify({ taxes, productValue, crt }, null, 2));
    
    try {
        const result = TributacaoService.processTaxData(taxes, productValue, crt);
        console.log('Output:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.log('Error:', error.message);
        return null;
    }
}

// Test scenarios demonstrating the new flexible taxation system
console.log('🧪 Testing New Flexible Taxation System');

// 1. Automatic mode (no taxes provided)
testTaxationScenario(
    'Automatic Mode - No taxes provided',
    undefined,
    100.00,
    '1' // Simples Nacional
);

// 2. Automatic mode with partial data
testTaxationScenario(
    'Automatic Mode - Partial data provided',
    {
        cstPis: '01',
        pisPercent: '1.65'
    },
    100.00,
    '3' // Regime Normal
);

// 3. Manual mode - Percentage-based taxation
testTaxationScenario(
    'Manual Mode - Percentage-based PIS/COFINS',
    {
        orig: '0',
        CSOSN: '400',
        cstPis: '01',
        pisPercent: '1.65',
        cstCofins: '01',
        cofinsPercent: '7.60'

    },
    100.00
);

// 4. Manual mode - Fixed value taxation
testTaxationScenario(
    'Manual Mode - Fixed value PIS/COFINS',
    {
        orig: '0',
        CSOSN: '400',
        cstPis: '99',
        pisValue: '5.00',
        cstCofins: '99',
        cofinsValue: '15.00'

    },
    100.00
);

// 5. Manual mode - Quantity-based taxation
testTaxationScenario(
    'Manual Mode - Quantity-based taxation',
    {
        orig: '0',
        CSOSN: '400',
        cstPis: '03',
        pisQuantity: '10.0000',
        pisQuantityValue: '0.25',
        cstCofins: '03',
        cofinsQuantity: '10.0000',
        cofinsQuantityValue: '0.75'

    },
    100.00
);

// 6. Tax exemption scenario
testTaxationScenario(
    'Tax Exemption - Zero taxation',
    {
        orig: '0',
        CSOSN: '400',
        cstPis: '07',
        cstCofins: '07'

    },
    100.00
);

// 7. Hybrid scenario - Different taxation for PIS and COFINS
testTaxationScenario(
    'Hybrid Mode - Different PIS and COFINS taxation',
    {
        orig: '0',
        CSOSN: '400',
        cstPis: '01',
        pisPercent: '1.65',
        cstCofins: '99',
        cofinsValue: '20.00'

    },
    100.00
);

// 8. Custom base value
testTaxationScenario(
    'Custom Base Value - Different calculation base',
    {
        orig: '0',
        CSOSN: '400',
        cstPis: '01',
        pisPercent: '1.65',
        cstCofins: '01',
        cofinsPercent: '7.60',
        baseValue: '85.00', // Different from product value

    },
    100.00
);

// 9. Error case - Invalid manual mode
testTaxationScenario(
    'Error Case - Invalid manual mode (missing required fields)',
    {

        // Missing required fields
    },
    100.00
);

// 10. CST validation test
console.log('\n=== CST Validation Tests ===');
const cstCodes = ['01', '07', '49', '99', 'invalid'];
cstCodes.forEach(cst => {
    const validation = TributacaoService.validateCst(cst);
    console.log(`CST ${cst}:`, validation);
});

console.log('\n✅ All tests completed');
console.log('📖 See README.md for complete documentation and examples');
