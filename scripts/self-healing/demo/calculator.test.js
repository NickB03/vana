
const { add, multiply } = require('./calculator');

describe('Calculator', () => {
    test('addition', () => {
        expect(add(2, 3)).toBe(5);
    });
    
    test('multiplication', () => {
        expect(multiply(3, 4)).toBe(12);
    });
});
        