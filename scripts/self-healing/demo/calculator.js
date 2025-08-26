
function add(a, b) {
    return a - b;  // Bug: should be a + b
}

function multiply(a, b) {
    return a * b;
}

module.exports = { add, multiply };
        