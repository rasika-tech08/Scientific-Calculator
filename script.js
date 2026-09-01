const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const modeBtn = document.getElementById('modeBtn');
const secondBtn = document.getElementById('secondBtn');
const sinBtn = document.getElementById('sinBtn');
const cosBtn = document.getElementById('cosBtn');
const tanBtn = document.getElementById('tanBtn');

let tokens = [];
let openParens = 0;
let justEvaluated = false;
let isDegreeMode = true;
let isSecond = false;
let memory = 0;

const OP_SYMBOLS = { '+': '+', '-': '−', '*': '×', '/': '÷', '^': '^' };
const CONST_SYMBOLS = { pi: 'π', e: 'e' };
const FUNC_LABELS = {
  sin: 'sin', cos: 'cos', tan: 'tan',
  asin: 'asin', acos: 'acos', atan: 'atan',
  ln: 'ln', log: 'log', sqrt: '√'
};
const POSTFIX_SYMBOLS = { fact: '!', sq: '²', inv: '⁻¹', pct: '%' };

function lastToken() {
  return tokens[tokens.length - 1] || null;
}

function needsImplicitMultiply() {
  const last = lastToken();
  if (!last) return false;
  return ['num', 'const', 'rparen'].includes(last.t) ||
    (last.t === 'postfix');
}

function resetIfJustEvaluated() {
  if (justEvaluated) {
    tokens = [];
    openParens = 0;
    justEvaluated = false;
  }
}

function pushDigit(d) {
  resetIfJustEvaluated();
  const last = lastToken();
  if (last && last.t === 'num') {
    last.v += d;
  } else {
    if (needsImplicitMultiply()) tokens.push({ t: 'op', v: '*' });
    tokens.push({ t: 'num', v: d });
  }
  render();
}

function pushDecimal() {
  resetIfJustEvaluated();
  const last = lastToken();
  if (last && last.t === 'num') {
    if (!last.v.includes('.')) last.v += '.';
  } else {
    if (needsImplicitMultiply()) tokens.push({ t: 'op', v: '*' });
    tokens.push({ t: 'num', v: '0.' });
  }
  render();
}

function pushOp(op) {
  resetIfJustEvaluated();
  const last = lastToken();
  if (op === '-' && (!last || ['op', 'lparen', 'func'].includes(last.t))) {
    tokens.push({ t: 'op', v: 'u-' });
  } else if (last && last.t === 'op') {
    last.v = op;
  } else if (!last) {
    return;
  } else {
    tokens.push({ t: 'op', v: op });
  }
  render();
}

function pushFunc(name) {
  resetIfJustEvaluated();
  const actualName = isSecond && ['sin', 'cos', 'tan'].includes(name)
    ? { sin: 'asin', cos: 'acos', tan: 'atan' }[name]
    : name;
  if (needsImplicitMultiply()) tokens.push({ t: 'op', v: '*' });
  tokens.push({ t: 'func', v: actualName });
  tokens.push({ t: 'lparen' });
  openParens++;
  render();
}

function pushConst(name) {
  resetIfJustEvaluated();
  if (needsImplicitMultiply()) tokens.push({ t: 'op', v: '*' });
  tokens.push({ t: 'const', v: name });
  render();
}

function pushParen(p) {
  resetIfJustEvaluated();
  if (p === '(') {
    if (needsImplicitMultiply()) tokens.push({ t: 'op', v: '*' });
    tokens.push({ t: 'lparen' });
    openParens++;
  } else {
    const last = lastToken();
    if (openParens > 0 && last && ['num', 'const', 'rparen', 'postfix'].includes(last.t)) {
      tokens.push({ t: 'rparen' });
      openParens--;
    }
  }
  render();
}

function pushPostfix(kind) {
  resetIfJustEvaluated();
  const last = lastToken();
  if (last && ['num', 'const', 'rparen', 'postfix'].includes(last.t)) {
    tokens.push({ t: 'postfix', v: kind });
    render();
  }
}

function clearAll() {
  tokens = [];
  openParens = 0;
  justEvaluated = false;
  render();
}

function backspace() {
  if (justEvaluated) return;
  const last = lastToken();
  if (!last) return;
  if (last.t === 'num' && last.v.length > 1) {
    last.v = last.v.slice(0, -1);
  } else {
    if (last.t === 'lparen') openParens--;
    if (last.t === 'rparen') openParens++;
    tokens.pop();
    if (last.t === 'lparen') {
      const prev = lastToken();
      if (prev && prev.t === 'func') tokens.pop();
    }
  }
  render();
}

function getDisplayString() {
  return tokens.map((tok) => {
    switch (tok.t) {
      case 'num': return tok.v;
      case 'op': return tok.v === 'u-' ? '−' : ` ${OP_SYMBOLS[tok.v]} `;
      case 'lparen': return '(';
      case 'rparen': return ')';
      case 'func': return FUNC_LABELS[tok.v] || tok.v;
      case 'const': return CONST_SYMBOLS[tok.v] || tok.v;
      case 'postfix': return POSTFIX_SYMBOLS[tok.v] || '';
      default: return '';
    }
  }).join('');
}

function render() {
  const str = getDisplayString();
  expressionEl.innerHTML = str.length ? str : '&nbsp;';
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function applyFunc(name, x) {
  const toRad = (v) => (isDegreeMode ? (v * Math.PI) / 180 : v);
  const toDeg = (v) => (isDegreeMode ? (v * 180) / Math.PI : v);
  switch (name) {
    case 'sin': return Math.sin(toRad(x));
    case 'cos': return Math.cos(toRad(x));
    case 'tan': return Math.tan(toRad(x));
    case 'asin': return toDeg(Math.asin(x));
    case 'acos': return toDeg(Math.acos(x));
    case 'atan': return toDeg(Math.atan(x));
    case 'ln': return Math.log(x);
    case 'log': return Math.log10(x);
    case 'sqrt': return Math.sqrt(x);
    default: return NaN;
  }
}

function applyPostfix(kind, x) {
  switch (kind) {
    case 'fact': return factorial(x);
    case 'sq': return x * x;
    case 'inv': return x === 0 ? NaN : 1 / x;
    case 'pct': return x / 100;
    default: return NaN;
  }
}

const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2, 'u-': 3, '^': 4 };
const RIGHT_ASSOC = { '^': true, 'u-': true };

function tokensToRPN(list) {
  const output = [];
  const stack = [];

  list.forEach((tok) => {
    if (tok.t === 'num' || tok.t === 'const') {
      output.push(tok);
    } else if (tok.t === 'postfix') {
      output.push(tok);
    } else if (tok.t === 'func') {
      stack.push(tok);
    } else if (tok.t === 'op') {
      while (
        stack.length &&
        stack[stack.length - 1].t === 'op' &&
        (
          PRECEDENCE[stack[stack.length - 1].v] > PRECEDENCE[tok.v] ||
          (PRECEDENCE[stack[stack.length - 1].v] === PRECEDENCE[tok.v] && !RIGHT_ASSOC[tok.v])
        )
      ) {
        output.push(stack.pop());
      }
      stack.push(tok);
    } else if (tok.t === 'lparen') {
      stack.push(tok);
    } else if (tok.t === 'rparen') {
      while (stack.length && stack[stack.length - 1].t !== 'lparen') {
        output.push(stack.pop());
      }
      stack.pop();
      if (stack.length && stack[stack.length - 1].t === 'func') {
        output.push(stack.pop());
      }
    }
  });

  while (stack.length) output.push(stack.pop());
  return output;
}

function evalRPN(rpn) {
  const stack = [];
  rpn.forEach((tok) => {
    if (tok.t === 'num') {
      stack.push(parseFloat(tok.v));
    } else if (tok.t === 'const') {
      stack.push(tok.v === 'pi' ? Math.PI : Math.E);
    } else if (tok.t === 'postfix') {
      const a = stack.pop();
      stack.push(applyPostfix(tok.v, a));
    } else if (tok.t === 'func') {
      const a = stack.pop();
      stack.push(applyFunc(tok.v, a));
    } else if (tok.t === 'op') {
      if (tok.v === 'u-') {
        stack.push(-stack.pop());
      } else {
        const b = stack.pop();
        const a = stack.pop();
        switch (tok.v) {
          case '+': stack.push(a + b); break;
          case '-': stack.push(a - b); break;
          case '*': stack.push(a * b); break;
          case '/': stack.push(b === 0 ? NaN : a / b); break;
          case '^': stack.push(Math.pow(a, b)); break;
        }
      }
    }
  });
  return stack.pop();
}

function closeOpenParens(list) {
  const result = [...list];
  for (let i = 0; i < openParens; i++) result.push({ t: 'rparen' });
  return result;
}

function formatResult(value) {
  if (value === undefined || Number.isNaN(value)) return 'Error';
  if (!Number.isFinite(value)) return 'Error';
  const rounded = Math.round(value * 1e10) / 1e10;
  return String(rounded);
}

function evaluateCurrentValue() {
  if (!tokens.length) return 0;
  const closed = closeOpenParens(tokens);
  const rpn = tokensToRPN(closed);
  const value = evalRPN(rpn);
  return Number.isNaN(value) ? 0 : value;
}

function evaluate() {
  if (!tokens.length) return;
  const closed = closeOpenParens(tokens);
  const rpn = tokensToRPN(closed);
  const value = evalRPN(rpn);
  resultEl.textContent = formatResult(value);
  tokens = closed;
  render();
  tokens = [{ t: 'num', v: formatResult(value) }];
  openParens = 0;
  justEvaluated = true;
}

function updateResultLive() {
  if (justEvaluated) return;
  if (!tokens.length) {
    resultEl.textContent = '0';
    return;
  }
  try {
    const value = evaluateCurrentValue();
    resultEl.textContent = formatResult(value);
  } catch (e) {
    resultEl.textContent = '0';
  }
}

function toggleMode() {
  isDegreeMode = !isDegreeMode;
  modeBtn.textContent = isDegreeMode ? 'DEG' : 'RAD';
}

function toggleSecond() {
  isSecond = !isSecond;
  secondBtn.classList.toggle('is-active', isSecond);
  sinBtn.textContent = isSecond ? 'asin' : 'sin';
  cosBtn.textContent = isSecond ? 'acos' : 'cos';
  tanBtn.textContent = isSecond ? 'atan' : 'tan';
}

function handleMemory(action) {
  const current = evaluateCurrentValue();
  switch (action) {
    case 'mc': memory = 0; break;
    case 'mr':
      resetIfJustEvaluated();
      if (needsImplicitMultiply()) tokens.push({ t: 'op', v: '*' });
      tokens.push({ t: 'num', v: String(memory) });
      render();
      updateResultLive();
      break;
    case 'mplus': memory += current; break;
    case 'mminus': memory -= current; break;
  }
}

document.querySelectorAll('.key').forEach((button) => {
  button.addEventListener('click', () => {
    const { num, action, op, func, const: constName, paren, postfix, mem, toggle } = button.dataset;

    if (num !== undefined) pushDigit(num);
    else if (op !== undefined) pushOp(op);
    else if (func !== undefined) pushFunc(func);
    else if (constName !== undefined) pushConst(constName);
    else if (paren !== undefined) pushParen(paren);
    else if (postfix !== undefined) pushPostfix(postfix);
    else if (mem !== undefined) handleMemory(mem);
    else if (toggle === 'mode') toggleMode();
    else if (toggle === 'second') toggleSecond();
    else if (action === 'clear') clearAll();
    else if (action === 'backspace') backspace();
    else if (action === 'decimal') pushDecimal();
    else if (action === 'equals') evaluate();

    if (!['equals'].includes(action)) updateResultLive();
  });
});

window.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') pushDigit(e.key);
  else if (e.key === '.') pushDecimal();
  else if (e.key === '+') pushOp('+');
  else if (e.key === '-') pushOp('-');
  else if (e.key === '*') pushOp('*');
  else if (e.key === '/') { e.preventDefault(); pushOp('/'); }
  else if (e.key === '^') pushOp('^');
  else if (e.key === '(') pushParen('(');
  else if (e.key === ')') pushParen(')');
  else if (e.key === 'Enter' || e.key === '=') evaluate();
  else if (e.key === 'Backspace') backspace();
  else if (e.key === 'Escape') clearAll();
  else return;
  updateResultLive();
});

render();
resultEl.textContent = '0';
