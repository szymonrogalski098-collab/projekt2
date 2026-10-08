/* Unit 4: Neural networks. */
(function () {
  const D = ML.d;
  ML.units.push({
    id: 'u4', title: 'Neural networks', color: '#e0457b',
    blurb: 'Neurons, layers, softmax, backpropagation and how to stop a network from memorising.',
    lessons: [
      /* ===================================================== L11 */
      {
        id: 'neuron', title: 'The neuron and activations', icon: 'neuron', minutes: '25-30 min',
        blurb: 'One neuron is a weighted sum plus a bend. Stack bends and you can approximate almost anything.',
        theory: [
          D.page('One neuron, three moves',
            D.p('An artificial neuron is the logistic regression you already know, with the final squashing function made interchangeable. It does three things in a fixed order: weigh the inputs, add a bias, then pass the result through a non-linear **activation function**.'),
            D.diagram('neuron', 'Inputs are multiplied by weights, summed with a bias to give z, then bent by the activation f.'),
            D.steps(['Weighted sum', 'z = w1 x1 + w2 x2 + w3 x3 (a dot product).'], ['Add the bias', 'z = z + b. The bias is a threshold you can learn.'], ['Activate', 'a = f(z). This is the neuron\'s output and the input to the next layer.']),
            D.formula('a = f(w @cdot x + b)', [['w', 'weights (learned)'], ['b', 'bias (learned)'], ['f', 'activation function (chosen by you)'], ['a', 'output of the neuron, called its activation']]),
            D.note('info', 'The word "neuron" is a loose historical inspiration from brain cells. Do not read biology into the maths: it is a small function with numbers inside.')),
          D.page('Why the bend is essential',
            D.p('Suppose you stack two layers with no activation. Layer 1 multiplies by 2, layer 2 multiplies by 3. Together: multiply by 6. Two layers of weighted sums collapse into a single weighted sum. That is true for any number of layers, so a "deep" purely linear network is no more expressive than one line.'),
            D.p('The activation breaks this. The **ReLU** activation, f(z) = max(0, z), is flat then rises. Add several shifted ReLUs together and the sum bends at each kink. With enough ReLUs you can trace nearly any curve out of straight pieces. Try it: this curve is relu(x) plus a second relu, shifted by c and scaled by a.'),
            D.plot({ title: 'Two ReLUs make a bent line', xr: [-4, 6], yr: [-4, 8], fns: [{ f: 'Math.max(0,x)+p.a*Math.max(0,x-p.c)', label: 'relu(x) + a relu(x - c)' }], params: [{ n: 'a', label: 'extra slope a', min: -3, max: 3, step: 0.1, v: -1.5 }, { n: 'c', label: 'bend position c', min: 0, max: 5, step: 0.1, v: 2 }] }),
            D.note('tip', 'Each hidden neuron contributes one bend. A layer of 100 neurons can place 100 bends wherever training wants them. That is how a pile of weighted sums becomes a flexible curve.')),
          D.page('The activation zoo',
            D.p('Four activations cover most of what you will meet.'),
            D.plot({ title: 'Common activation functions', xr: [-4, 4], yr: [-1.5, 3], fns: [{ f: 'Math.max(0,x)', label: 'ReLU' }, { f: '1/(1+Math.exp(-x))', label: 'sigmoid' }, { f: 'Math.tanh(x)', label: 'tanh' }, { f: 'x>0?x:0.1*x', label: 'leaky ReLU (0.1)' }] }),
            D.table(['Function', 'Formula', 'Output range', 'Typical use'], [['ReLU', 'max(0, z)', '0 to infinity', 'default for hidden layers'], ['Leaky ReLU', 'z if z>0 else 0.1 z', 'all reals', 'avoids dead neurons'], ['Sigmoid', '1/(1+e^-z)', '0 to 1', 'binary output probability'], ['tanh', '(e^z - e^-z)/(e^z + e^-z)', '-1 to 1', 'older nets, recurrent cells']])),
          D.page('A worked example',
            D.p('One neuron with inputs x = [2, -1], weights w = [1, 3], bias b = 0.5. Same z, different activations.'),
            D.steps(['Weighted sum', '1 x 2 + 3 x (-1) = 2 - 3 = -1.'], ['Add the bias', 'z = -1 + 0.5 = -0.5.'], ['ReLU', 'max(0, -0.5) = 0. The neuron is silent.'], ['Sigmoid', '1 / (1 + e^0.5) = 0.378.'], ['tanh', 'tanh(-0.5) = -0.462.'], ['Leaky ReLU 0.1', '0.1 x (-0.5) = -0.05.']),
            D.p('Same input, four different outputs. The activation is a design choice with consequences for gradients and for what range the next layer sees.')),
          D.page('Which activation where',
            D.list('**Hidden layers**: ReLU or a relative (leaky ReLU, GELU). Cheap to compute, gradients do not fade for positive inputs.', '**Output, two classes**: sigmoid, to get a probability.', '**Output, many classes**: softmax (next lesson), to get probabilities that sum to 1.', '**Output, regression**: no activation at all (identity), so the value can be any number.'),
            D.note('warn', 'A ReLU neuron whose z is negative for every example outputs 0 and also passes back a gradient of 0, so it can never recover. This "dying ReLU" problem is why leaky variants exist.')),
          D.page('A neuron in code',
            D.cmp('double Relu(double z) => Math.Max(0, z);\ndouble Leaky(double z, double a = 0.1) => z > 0 ? z : a * z;\n\ndouble Neuron(double[] w, double[] x, double b, Func<double, double> f)\n{\n    double z = b;\n    for (int i = 0; i < w.Length; i++) z += w[i] * x[i];\n    return f(z);\n}', 'def relu(z):\n    return max(0.0, z)\n\ndef leaky(z, a=0.1):\n    return z if z > 0 else a * z\n\ndef neuron(w, x, b, f):\n    z = b + sum(wi * xi for wi, xi in zip(w, x))\n    return f(z)'),
            D.note('cs', 'In C#, `Func<double,double>` is the type of the activation parameter. In Python you pass any callable. Also: `max(0.0, z)` is the built-in; no `Math.` prefix.'))
        ],
        practice: [
          D.mc('What does ReLU(-3) equal?', ['-3', '0', '3', '-0.3'], 1, 'ReLU(z) = max(0, z).'),
          D.mc('Why can a stack of purely linear layers not model a curve?', ['It is too slow', 'Composed linear maps are still one linear map', 'Weights cannot be negative', 'There is no bias'], 1, 'Layer 1 times layer 2 equals a single linear layer.'),
          D.match('Match the activation with its output range.', [['ReLU', '0 to infinity'], ['Sigmoid', '0 to 1'], ['tanh', '-1 to 1'], ['Identity', 'any real number']]),
          D.order('Order the work of a single neuron.', ['Multiply each input by its weight', 'Add the products together', 'Add the bias', 'Apply the activation function'], 'Weighted sum, bias, activation.'),
          D.num('Weights w = [1, 3], inputs x = [2, -1], bias 0.5. What is the pre-activation z?', [['w', '[1, 3]'], ['x', '[2, -1]'], ['b', '0.5']], -0.5, ['1 x 2 + 3 x (-1) = -1', '-1 + 0.5 = -0.5'], { verify: '1*2+3*-1+0.5', dp: 1 }),
          D.multi('Which activations are common choices for hidden layers?', ['ReLU', 'Leaky ReLU', 'Softmax over the whole network output only', 'Identity everywhere'], [0, 1], 'Identity everywhere gives a linear network.')
        ],
        code: [
          {
            title: 'Three activations', fn: 'activate',
            task: [D.p('Write `activate(name, z)` where `name` is `"relu"`, `"leaky"` (slope 0.1 for negative z), `"sigmoid"` or `"tanh"`. Return the activation of `z`.'), D.note('tip', 'JavaScript has `Math.tanh` built in. A `switch` statement works exactly like in C#.')],
            starter: 'function activate(name, z) {\n  switch (name) {\n    case "relu":\n      // ...\n    case "leaky":\n      // ...\n    case "sigmoid":\n      // ...\n    case "tanh":\n      // ...\n  }\n}\n',
            tests: [{ args: ['relu', -2.5], expect: 0 }, { args: ['relu', 1.5], expect: 1.5 }, { args: ['leaky', -4], expect: -0.4 }, { args: ['sigmoid', -0.5], expect: 0.37754, tol: 0.0001 }, { args: ['tanh', 0.5], expect: 0.46212, tol: 0.0001, hidden: true }],
            hints: ['relu: return Math.max(0, z);', 'leaky: return z > 0 ? z : 0.1 * z; sigmoid: return 1 / (1 + Math.exp(-z)); tanh: return Math.tanh(z);'],
            solution: 'function activate(name, z) {\n  switch (name) {\n    case "relu": return Math.max(0, z);\n    case "leaky": return z > 0 ? z : 0.1 * z;\n    case "sigmoid": return 1 / (1 + Math.exp(-z));\n    case "tanh": return Math.tanh(z);\n  }\n}\n',
            explain: 'Four lines of maths define most of the non-linearity in modern deep learning.'
          },
          {
            title: 'A full neuron', fn: 'neuron',
            task: [D.p('Write `neuron(w, x, b, name)` returning the neuron output. An `activate` function is provided.')],
            starter: 'function activate(name, z) {\n  if (name === "relu") return Math.max(0, z);\n  if (name === "sigmoid") return 1 / (1 + Math.exp(-z));\n  return Math.tanh(z);\n}\n\nfunction neuron(w, x, b, name) {\n  \n}\n',
            tests: [{ args: [[1, 3], [2, -1], 0.5, 'relu'], expect: 0 }, { args: [[1, 3], [2, -1], 0.5, 'sigmoid'], expect: 0.37754, tol: 0.0001 }, { args: [[1, 3], [2, -1], 0.5, 'tanh'], expect: -0.46212, tol: 0.0001 }, { args: [[2, 2], [1, 1], -1, 'relu'], expect: 3, hidden: true }],
            hints: ['Compute z the same way as in the dot product lesson, starting from b.', 'let z = b; for (...) z += w[i] * x[i]; return activate(name, z);'],
            solution: 'function activate(name, z) {\n  if (name === "relu") return Math.max(0, z);\n  if (name === "sigmoid") return 1 / (1 + Math.exp(-z));\n  return Math.tanh(z);\n}\n\nfunction neuron(w, x, b, name) {\n  let z = b;\n  for (let i = 0; i < w.length; i++) z += w[i] * x[i];\n  return activate(name, z);\n}\n',
            explain: 'This function is a node of every neural network. Layers are just many of these sharing the same inputs.'
          }
        ],
        quiz: [
          D.num('Calculate ReLU(-2.5).', [['formula', 'ReLU(z) = max(0, z)']], 0, ['max(0, -2.5) = 0'], { verify: 'Math.max(0,-2.5)' }),
          D.num('Leaky ReLU with slope 0.1: calculate f(-4).', [['formula', 'f(z) = z if z > 0 else 0.1 z'], ['z', '-4']], -0.4, ['z is negative, so f = 0.1 x (-4) = -0.4'], { verify: '0.1*-4', dp: 1 }),
          D.num('Calculate tanh(0.5). Use e^0.5 = 1.6487 and e^-0.5 = 0.6065.', [['formula', '(e^z - e^-z) / (e^z + e^-z)']], 0.4621, ['numerator: 1.6487 - 0.6065 = 1.0422', 'denominator: 1.6487 + 0.6065 = 2.2552', 'ratio = 0.4621'], { verify: 'Math.tanh(0.5)', dp: 3 }),
          D.num('A neuron has weights [1, 3], bias 0.5 and inputs [2, -1], with a sigmoid activation. Calculate its output.', [['w', '[1, 3]'], ['x', '[2, -1]'], ['b', '0.5'], ['f', 'sigmoid']], 0.3775, ['z = 1 x 2 + 3 x (-1) + 0.5 = -0.5', 'sigmoid(-0.5) = 1 / (1 + e^0.5) = 1 / 2.6487 = 0.3775'], { verify: '1/(1+Math.exp(0.5))', dp: 2 }),
          D.num('Layer 1 multiplies its input by 2, layer 2 multiplies by 3, and there is no activation between them. What does the whole network output for input 5?', [['layer 1', 'x times 2'], ['layer 2', 'x times 3'], ['input', '5']], 30, ['layer 1: 5 x 2 = 10', 'layer 2: 10 x 3 = 30', 'equivalent to one layer that multiplies by 6'], { verify: '5*2*3' }),
          D.mc('Which activation is the best default for hidden layers in a modern deep network?', ['Sigmoid', 'ReLU or a close relative', 'Identity', 'Softmax'], 1, 'ReLU variants are cheap and keep gradients alive.'),
          D.mc('A regression network predicts house prices. What should the output layer use?', ['Sigmoid', 'ReLU', 'No activation (identity)', 'Softmax'], 2, 'The price can be any positive or negative number, so do not squash it.'),
          D.multi('What can go wrong with ReLU?', ['A neuron may output 0 for every example and stop learning', 'It cannot output negative numbers', 'It saturates at both ends', 'It is expensive to compute'], [0, 1], 'ReLU is very cheap and does not saturate for positive inputs.')
        ]
      },

      /* ===================================================== L12 */
      {
        id: 'forward', title: 'Layers, softmax and the forward pass', icon: 'layers', minutes: '30-35 min',
        blurb: 'Run an input through a whole network by hand, and turn raw scores into class probabilities.',
        theory: [
          D.page('Layers: many neurons side by side',
            D.p('A **layer** is a group of neurons that all look at the same input. A **network** chains layers: the output of one is the input of the next. Layers between the input and the output are called **hidden** because you never see them directly.'),
            D.diagram('network', 'A network with 3 inputs, two hidden layers of 4 neurons, and 2 outputs. Every line is a weight.'),
            D.p('Shapes drive everything. A layer with d inputs and h neurons has a weight matrix of shape (h x d) and a bias vector of length h. The layer maps a vector of length d to a vector of length h.'),
            D.formula('@vec{a} = f(W x + b)'.replace('@vec{a}', 'a'), [['x', 'input vector, length d'], ['W', 'weights, shape h x d'], ['b', 'biases, length h'], ['f', 'activation, applied to every entry'], ['a', 'layer output, length h']])),
          D.page('The forward pass step by step',
            D.p('The forward pass pushes one input through the network to get a prediction. Take a network with 2 inputs, a hidden layer of 3 ReLU neurons, and 2 output scores.'),
            D.p('Input x = [1, 2]. Hidden layer: W1 = [[1, 0], [-1, -1], [0.5, 0.5]], b1 = [0, 0, -1]. Output layer: W2 = [[2, 1, 0], [-1, 0, 4]], b2 = [0, 0].'),
            D.steps(['Hidden pre-activation: W1 x', 'Row 1: 1 + 0 = 1. Row 2: -1 - 2 = -3. Row 3: 0.5 + 1 = 1.5. So [1, -3, 1.5].'], ['Add b1', '[1, -3, 1.5] + [0, 0, -1] = [1, -3, 0.5].'], ['Apply ReLU', 'negative entry becomes 0: h = [1, 0, 0.5].'], ['Output scores: W2 h', 'Row 1: 2 x 1 + 1 x 0 + 0 x 0.5 = 2. Row 2: -1 x 1 + 0 + 4 x 0.5 = 1. So [2, 1].'], ['Add b2', 'y = [2, 1]. These raw scores are called logits.']),
            D.note('tip', 'Every step is either a matrix multiplication, an addition or an element-wise function. That is why networks run well on GPUs.')),
          D.page('Softmax: scores to probabilities',
            D.p('The output scores [2, 1] are not probabilities: they can be negative and do not sum to 1. **Softmax** converts any list of scores into a probability distribution. It exponentiates each score (making everything positive and favouring the big ones), then divides by the total so the sum is exactly 1.'),
            D.formula('softmax(z)_i = @f{e^{z_i}}{@sum_{j} e^{z_j}}', [['z_i', 'the score of class i'], ['@sum_j e^{z_j}', 'sum over all classes, the normaliser']]),
            D.steps(['Exponentiate', 'scores [2, 1, 0] give [e^2, e^1, e^0] = [7.389, 2.718, 1].'], ['Sum', '7.389 + 2.718 + 1 = 11.107.'], ['Divide', '[7.389, 2.718, 1] / 11.107 = [0.665, 0.245, 0.090].']),
            D.p('Check: 0.665 + 0.245 + 0.090 = 1. The largest score gets the largest probability, and the ranking is preserved. For our network: softmax([2, 1]) = [0.731, 0.269]. Notice that is exactly sigmoid(2 - 1): sigmoid is softmax for two classes.')),
          D.page('Temperature and numerical safety',
            D.p('Dividing the scores by a **temperature** T before the softmax controls how decisive the distribution is. T below 1 sharpens it (the top class takes almost everything), T above 1 flattens it (more random). Language models expose this as a creativity dial.'),
            D.formula('softmax(z / T)', [['T', 'temperature, positive']]),
            D.table(['Scores [2, 1]', 'P(class 1)', 'P(class 2)'], [['T = 0.5', '0.881', '0.119'], ['T = 1', '0.731', '0.269'], ['T = 2', '0.622', '0.378'], ['T = 10', '0.525', '0.475']]),
            D.note('warn', 'e^1000 overflows. The standard fix: subtract the largest score from every score before exponentiating. The result is identical (the factor cancels) but the numbers stay small.')),
          D.page('Counting parameters',
            D.p('A layer from d inputs to h neurons has d x h weights and h biases. For a digit recogniser on 28 x 28 images: the input has 784 numbers. Hidden layer of 128 neurons: 784 x 128 + 128 = 100,480 parameters. Output layer of 10 classes: 128 x 10 + 10 = 1,290. Total: 101,770 numbers to learn, from a tiny network.'),
            D.formula('params(d @to h) = d h + h', [['d h', 'weights'], ['h', 'biases']]),
            D.p('Modern language models have billions of parameters, all following the same arithmetic. The principle you can compute by hand here is the principle at scale.')),
          D.page('Forward pass in code',
            D.cmp('double[] Dense(double[][] W, double[] b, double[] x)\n{\n    var y = new double[W.Length];\n    for (int i = 0; i < W.Length; i++)\n    {\n        double s = b[i];\n        for (int j = 0; j < x.Length; j++) s += W[i][j] * x[j];\n        y[i] = s;\n    }\n    return y;\n}\n\ndouble[] Softmax(double[] z)\n{\n    double m = z.Max();\n    var e = z.Select(v => Math.Exp(v - m)).ToArray();\n    double sum = e.Sum();\n    return e.Select(v => v / sum).ToArray();\n}', 'import math\n\ndef dense(W, b, x):\n    return [bi + sum(wij * xj for wij, xj in zip(row, x))\n            for row, bi in zip(W, b)]\n\ndef softmax(z):\n    m = max(z)\n    e = [math.exp(v - m) for v in z]\n    s = sum(e)\n    return [v / s for v in e]'),
            D.note('cs', 'The Python list comprehension `[... for ... in ...]` is C#\'s `Select(...).ToList()` in compact form. With NumPy, `dense` becomes `W @ x + b` and softmax becomes two lines.'))
        ],
        practice: [
          D.mc('A layer has 5 inputs and 3 neurons. What is the shape of its weight matrix (neurons x inputs)?', ['5 x 3', '3 x 5', '15', '8'], 1, 'One row per neuron, one column per input.'),
          D.num('How many parameters (weights plus biases) does a layer with 5 inputs and 3 neurons have?', [['weights', '5 x 3'], ['biases', '3']], 18, ['weights: 15', 'biases: 3', 'total 18'], { verify: '5*3+3' }),
          D.order('Order the forward pass of one hidden layer.', ['Multiply the weight matrix by the input vector', 'Add the bias vector', 'Apply the activation to every entry', 'Pass the result to the next layer'], 'Linear map, bias, non-linearity, repeat.'),
          D.match('Match the term with its meaning.', [['Logits', 'raw scores before softmax'], ['Softmax', 'turns scores into probabilities'], ['Hidden layer', 'a layer between input and output'], ['Temperature', 'controls how sharp the distribution is']]),
          D.num('Softmax of the scores [0, 0, 0]: what is each probability?', [['scores', '0, 0, 0'], ['e^0', '1']], 0.3333, ['each exponential is 1', 'sum is 3', 'each probability = 1/3'], { verify: '1/3' }),
          D.multi('Which statements about softmax are true?', ['Outputs are all positive', 'Outputs sum to 1', 'It changes the ranking of the scores', 'A higher temperature makes the output flatter'], [0, 1, 3], 'Softmax preserves the ranking because exp is increasing.')
        ],
        code: [
          {
            title: 'Softmax', fn: 'softmax',
            task: [D.p('Write `softmax(z)` for an array of scores. Subtract the maximum first for numerical safety, exponentiate, then divide by the sum.')],
            starter: 'function softmax(z) {\n  const m = Math.max(...z);\n  // e = exp(z_i - m), then divide by the sum\n}\n',
            tests: [{ args: [[2, 1, 0]], expect: [0.66524, 0.24473, 0.09003], tol: 0.0001 }, { args: [[0, 0, 0]], expect: [0.33333, 0.33333, 0.33333], tol: 0.0001 }, { args: [[1000, 1000]], expect: [0.5, 0.5], tol: 0.0001 }, { args: [[2, 1]], expect: [0.73106, 0.26894], tol: 0.0001, hidden: true }],
            hints: ['const e = z.map(v => Math.exp(v - m));', 'const s = e.reduce((a, c) => a + c, 0); return e.map(v => v / s);'],
            solution: 'function softmax(z) {\n  const m = Math.max(...z);\n  const e = z.map(v => Math.exp(v - m));\n  const s = e.reduce((a, c) => a + c, 0);\n  return e.map(v => v / s);\n}\n',
            explain: 'The test with [1000, 1000] would give NaN without the max subtraction. Libraries do the same trick.'
          },
          {
            title: 'Two-layer forward pass', fn: 'forward',
            task: [D.p('Write `forward(x, W1, b1, W2, b2)`: hidden layer `h = ReLU(W1 x + b1)`, output `y = W2 h + b2`. The helper `dense(W, b, x)` is provided. Return `y` (the raw scores).')],
            starter: 'function dense(W, b, x) {\n  return W.map((row, i) => row.reduce((s, w, j) => s + w * x[j], b[i]));\n}\n\nfunction forward(x, W1, b1, W2, b2) {\n  \n}\n',
            tests: [{ args: [[1, 2], [[1, 0], [-1, -1], [0.5, 0.5]], [0, 0, -1], [[2, 1, 0], [-1, 0, 4]], [0, 0]], expect: [2, 1] }, { args: [[0, 0], [[1, 1]], [1], [[3]], [0.5]], expect: [3.5] }, { args: [[-1], [[1], [-1]], [0, 0], [[1, 1]], [0]], expect: [1] }, { args: [[2], [[1]], [-5], [[1]], [7]], expect: [7], hidden: true }],
            hints: ['First compute the hidden pre-activations with dense, then apply Math.max(0, v) to each.', 'const h = dense(W1, b1, x).map(v => Math.max(0, v)); return dense(W2, b2, h);'],
            solution: 'function dense(W, b, x) {\n  return W.map((row, i) => row.reduce((s, w, j) => s + w * x[j], b[i]));\n}\n\nfunction forward(x, W1, b1, W2, b2) {\n  const h = dense(W1, b1, x).map(v => Math.max(0, v));\n  return dense(W2, b2, h);\n}\n',
            explain: 'The first test is exactly the hand calculation from the theory page. Add softmax at the end and you have a classifier.'
          }
        ],
        quiz: [
          D.num('Softmax of the scores [2, 1, 0]. Calculate the probability of the FIRST class.', [['scores', '2, 1, 0'], ['e^2 = 7.389', 'e^1 = 2.718, e^0 = 1']], 0.6652, ['sum = 7.389 + 2.718 + 1 = 11.107', 'p1 = 7.389 / 11.107 = 0.665'], { verify: 'Math.exp(2)/(Math.exp(2)+Math.exp(1)+1)', dp: 3 }),
          D.num('Softmax of [2, 1]. Calculate the probability of the SECOND class.', [['e^2', '7.389'], ['e^1', '2.718']], 0.2689, ['sum = 10.107', 'p2 = 2.718 / 10.107 = 0.269'], { verify: 'Math.exp(1)/(Math.exp(2)+Math.exp(1))', dp: 3 }),
          D.num('Softmax with temperature T = 2 on the scores [2, 1]: divide the scores by T first. Calculate the probability of the first class.', [['scores / T', '[1, 0.5]'], ['e^1 = 2.718', 'e^0.5 = 1.649']], 0.6225, ['sum = 2.718 + 1.649 = 4.367', 'p1 = 2.718 / 4.367 = 0.622'], { verify: 'Math.exp(1)/(Math.exp(1)+Math.exp(0.5))', dp: 2 }),
          D.num('A network has layers 784 to 128 to 10 (each layer has biases). How many parameters in total?', [['layer 1', '784 x 128 + 128'], ['layer 2', '128 x 10 + 10']], 101770, ['layer 1: 100352 + 128 = 100480', 'layer 2: 1280 + 10 = 1290', 'total = 101770'], { verify: '784*128+128+128*10+10' }),
          D.num('Hidden layer: W = [[1, 0], [-1, -1], [0.5, 0.5]], b = [0, 0, -1], input x = [1, 2], ReLU activation. Enter the THIRD hidden activation.', [['row 3', '[0.5, 0.5]'], ['bias 3', '-1']], 0.5, ['0.5 x 1 + 0.5 x 2 = 1.5', '1.5 - 1 = 0.5', 'ReLU(0.5) = 0.5'], { verify: 'Math.max(0,0.5*1+0.5*2-1)', dp: 1 }),
          D.mc('Why subtract the maximum score before the exponential in softmax?', ['It changes the answer to be more accurate', 'It avoids overflow without changing the result', 'It makes the probabilities sum to 2', 'It is required by the definition'], 1, 'The common factor cancels in the ratio.'),
          D.mc('What activation belongs on the output layer of a 10-class classifier?', ['ReLU', 'Softmax', 'tanh', 'None'], 1, 'Softmax gives 10 probabilities that sum to 1.'),
          D.mc('Raising the temperature in softmax will...', ['make the distribution flatter (more random)', 'make it sharper', 'not change anything', 'make all outputs negative'], 0, 'Scores get divided by a larger T, so differences shrink.')
        ]
      },

      /* ===================================================== L13 */
      {
        id: 'backprop', title: 'Backpropagation', icon: 'backprop', minutes: '30-35 min',
        blurb: 'The chain rule applied backwards through a network: how every weight learns its share of the blame.',
        theory: [
          D.page('The credit assignment problem',
            D.p('After a forward pass the loss says "the network was wrong by this much". But the network has thousands or billions of weights. Which ones are to blame, and in which direction should each change? You need the gradient of the loss with respect to **every** weight.'),
            D.p('A naive approach nudges each weight separately and re-runs the network, which costs one forward pass per weight: impossible for a million weights. **Backpropagation** gets all gradients in a single backward sweep that costs about as much as one forward pass. It is the chain rule from the derivatives lesson, organised cleverly.')),
          D.page('A tiny network with real numbers',
            D.p('One neuron with a ReLU, then squared error: z = w x + b, a = ReLU(z), L = (a - y)^2. Take x = 2, w = 1.5, b = 0.5 and target y = 5.'),
            D.steps(['Forward: z', 'z = 1.5 x 2 + 0.5 = 3.5.'], ['Forward: a', 'a = ReLU(3.5) = 3.5.'], ['Forward: loss', 'L = (3.5 - 5)^2 = 2.25.']),
            D.p('Every intermediate value is stored during the forward pass. The backward pass needs them.')),
          D.page('The backward sweep',
            D.p('Walk from the loss back to the parameters. At each node multiply the incoming gradient by the node\'s **local derivative**, a slope that is easy to compute because it involves just that one operation.'),
            D.steps(['Start at the loss', 'dL/dL = 1.'], ['Through the square', 'dL/da = 2(a - y) = 2(3.5 - 5) = -3.'], ['Through the ReLU', 'da/dz = 1 because z > 0, so dL/dz = -3 x 1 = -3.'], ['Into the weight', 'dz/dw = x = 2, so dL/dw = -3 x 2 = -6.'], ['Into the bias', 'dz/db = 1, so dL/db = -3.']),
            D.formula('@f{@partial L}{@partial w} = @f{@partial L}{@partial a} @cdot @f{@partial a}{@partial z} @cdot @f{@partial z}{@partial w}', [['@partial L/@partial a', 'how the loss reacts to the output'], ['@partial a/@partial z', 'local slope of the activation'], ['@partial z/@partial w', 'local slope of the weighted sum, equal to the input x']]),
            D.p('Now update with learning rate 0.1. w = 1.5 - 0.1 x (-6) = 2.1. b = 0.5 - 0.1 x (-3) = 0.8. New z = 2.1 x 2 + 0.8 = 5.0, so the prediction is 5 and the loss is exactly 0. One step solved this toy problem.')),
          D.page('Through a sigmoid',
            D.p('Same pattern with a different activation: only the local derivative changes. For the sigmoid it is sigma(z) x (1 - sigma(z)).'),
            D.p('Example: z = 0, so a = 0.5. Target y = 1, loss L = (a - y)^2 = 0.25.'),
            D.steps(['Loss to output', 'dL/da = 2(a - y) = 2(0.5 - 1) = -1.'], ['Through the sigmoid', 'da/dz = 0.5 x 0.5 = 0.25, so dL/dz = -1 x 0.25 = -0.25.'], ['Into the weight', 'dL/dw = -0.25 x x.']),
            D.note('tip', 'This is why frameworks only need each operation to know its own local derivative. Backprop stitches them together automatically.')),
          D.page('Many layers and fading gradients',
            D.p('In a deep network the gradient for an early layer is a product of many local derivatives, one per layer it passed through. If those factors are small, the product shrinks towards zero (**vanishing gradients**). If they are large it blows up (**exploding gradients**).'),
            D.p('The sigmoid\'s slope is at most 0.25, so a gradient passing through 10 sigmoid layers is multiplied by at most 0.25^10, about 0.000001. Early layers barely learn. This is a main reason ReLU (slope 1 for positive inputs), careful weight initialisation, and **residual connections** (an addition that gives the gradient a shortcut) became standard.'),
            D.table(['Local slope per layer', 'After 10 layers', 'Result'], [['0.25', '0.00000095', 'vanishes'], ['1', '1', 'healthy'], ['2', '1024', 'explodes']])),
          D.page('Backprop in code, and what frameworks do',
            D.p('Here is the tiny neuron\'s backward pass as code. Real libraries (PyTorch, JAX) record the operations of the forward pass in a graph, then replay them backwards with each operation\'s local derivative. That feature is called **automatic differentiation**.'),
            D.cmp('(double dw, double db) Backward(double x, double w, double b, double y)\n{\n    double z = w * x + b;\n    double a = Math.Max(0, z);\n    double dA = 2 * (a - y);\n    double dZ = z > 0 ? dA : 0;\n    return (dZ * x, dZ);\n}', 'def backward(x, w, b, y):\n    z = w * x + b\n    a = max(0.0, z)\n    d_a = 2 * (a - y)\n    d_z = d_a if z > 0 else 0.0\n    return d_z * x, d_z'),
            D.code('py', '# the same thing in PyTorch: you only write the forward pass\nz = w * x + b\nloss = (torch.relu(z) - y) ** 2\nloss.backward()     # computes every gradient\nw.grad, b.grad       # ready to use'),
            D.note('cs', 'C# can return a tuple `(double dw, double db)` and Python returns several values the same way. There is no PyTorch in this app, but your hand-written version computes exactly what `loss.backward()` does.'))
        ],
        practice: [
          D.mc('What does backpropagation compute?', ['The forward predictions', 'The gradient of the loss with respect to every parameter', 'The best learning rate', 'The test accuracy'], 1, 'It delivers all gradients in one backward sweep.'),
          D.num('A neuron computes a = ReLU(w x + b) with x = 2, w = 1.5, b = 0.5. What is a?', [['x', '2'], ['w', '1.5'], ['b', '0.5']], 3.5, ['z = 1.5 x 2 + 0.5 = 3.5', 'ReLU(3.5) = 3.5'], { verify: 'Math.max(0,1.5*2+0.5)', dp: 1 }),
          D.order('Order the backward pass of the example network.', ['Start with dL/dL = 1', 'Multiply by the local derivative of the squared error', 'Multiply by the local derivative of the ReLU', 'Multiply by the input x to reach the weight gradient'], 'The gradient flows from the loss back to the weights.'),
          D.match('Match each local derivative.', [['z = w x + b, with respect to w', 'the input x'], ['z = w x + b, with respect to b', '1 (constant)'], ['ReLU slope when z > 0', 'slope 1, gradient passes'], ['ReLU slope when z < 0', 'slope 0, gradient blocked']]),
          D.multi('Which are remedies for vanishing gradients?', ['Use ReLU instead of sigmoid in hidden layers', 'Residual connections', 'Making the network deeper with sigmoids', 'Good weight initialisation'], [0, 1, 3], 'More sigmoid layers make it worse.'),
          D.mc('Why must the forward pass store intermediate values?', ['To print them', 'The backward pass needs them for local derivatives', 'To save memory', 'Backprop does not need them'], 1, 'Local derivatives depend on values such as z and x.')
        ],
        code: [
          {
            title: 'Backward pass of one neuron', fn: 'backward',
            task: [D.p('For `z = w * x + b`, `a = max(0, z)`, `L = (a - y)^2` write `backward(x, w, b, y)` returning `[dL/dw, dL/db]`.'), D.steps(['Forward', 'z, then a.'], ['dL/da', '2 * (a - y).'], ['dL/dz', 'dL/da if z > 0, else 0.'], ['Parameters', 'dL/dw = dL/dz * x, dL/db = dL/dz.'])],
            starter: 'function backward(x, w, b, y) {\n  const z = w * x + b;\n  const a = Math.max(0, z);\n  // compute dA, dZ, then return [dw, db]\n}\n',
            tests: [{ args: [2, 1.5, 0.5, 5], expect: [-6, -3] }, { args: [1, -1, 0, 2], expect: [0, 0] }, { args: [1, 0.5, 0, 1.5], expect: [-2, -2] }, { args: [3, 2, 1, 4], expect: [18, 6], hidden: true }],
            hints: ['dA = 2 * (a - y); dZ = z > 0 ? dA : 0;', 'return [dZ * x, dZ];'],
            solution: 'function backward(x, w, b, y) {\n  const z = w * x + b;\n  const a = Math.max(0, z);\n  const dA = 2 * (a - y);\n  const dZ = z > 0 ? dA : 0;\n  return [dZ * x, dZ];\n}\n',
            explain: 'The second test is a "dead" ReLU: z is negative so no gradient flows, and the neuron cannot learn from that example.'
          },
          {
            title: 'One full training step', fn: 'trainStep',
            task: [D.p('Write `trainStep(x, w, b, y, lr)` returning the new `[w, b]` after one gradient descent step. A `backward` function is provided.')],
            starter: 'function backward(x, w, b, y) {\n  const z = w * x + b;\n  const a = Math.max(0, z);\n  const dZ = z > 0 ? 2 * (a - y) : 0;\n  return [dZ * x, dZ];\n}\n\nfunction trainStep(x, w, b, y, lr) {\n  \n}\n',
            tests: [{ args: [2, 1.5, 0.5, 5, 0.1], expect: [2.1, 0.8] }, { args: [1, 0.5, 0, 1.5, 0.1], expect: [0.7, 0.2] }, { args: [1, -1, 0, 2, 0.1], expect: [-1, 0] }, { args: [2, 2.1, 0.8, 5, 0.1], expect: [2.1, 0.8], hidden: true }],
            hints: ['Get the gradients: const [dw, db] = backward(x, w, b, y);', 'return [w - lr * dw, b - lr * db];'],
            solution: 'function backward(x, w, b, y) {\n  const z = w * x + b;\n  const a = Math.max(0, z);\n  const dZ = z > 0 ? 2 * (a - y) : 0;\n  return [dZ * x, dZ];\n}\n\nfunction trainStep(x, w, b, y, lr) {\n  const [dw, db] = backward(x, w, b, y);\n  return [w - lr * dw, b - lr * db];\n}\n',
            explain: 'Forward, backward, update: the complete loop. The hidden test shows a solved problem stays put, because the gradient is zero.'
          }
        ],
        quiz: [
          D.num('x = 2, w = 1.5, b = 0.5, ReLU neuron, target y = 5, loss L = (a - y)^2. Calculate the loss.', [['x', '2'], ['w', '1.5'], ['b', '0.5'], ['y', '5']], 2.25, ['z = 1.5 x 2 + 0.5 = 3.5', 'a = 3.5', 'L = (3.5 - 5)^2 = 2.25'], { verify: '(Math.max(0,1.5*2+0.5)-5)**2' }),
          D.num('Same network. Calculate dL/da = 2(a - y).', [['a', '3.5'], ['y', '5']], -3, ['2 x (3.5 - 5) = 2 x (-1.5) = -3'], { verify: '2*(3.5-5)' }),
          D.num('Same network, z = 3.5 > 0 so the ReLU slope is 1. Calculate dL/dw.', [['dL/da', '-3'], ['da/dz', '1'], ['dz/dw = x', '2']], -6, ['dL/dw = (-3)(1)(2) = -6'], { verify: '-3*1*2' }),
          D.num('Same network. Calculate dL/db.', [['dL/da', '-3'], ['da/dz', '1'], ['dz/db', '1']], -3, ['dL/db = (-3)(1)(1) = -3'], { verify: '-3*1*1' }),
          D.num('With dL/dw = -6 and learning rate 0.1, what is the new w (old w = 1.5)?', [['w', '1.5'], ['dL/dw', '-6'], ['learning rate', '0.1']], 2.1, ['w_new = 1.5 - 0.1 x (-6)', '= 1.5 + 0.6 = 2.1'], { verify: '1.5-0.1*-6', dp: 1 }),
          D.num('A sigmoid neuron has z = 0, a = 0.5, target y = 1 and loss (a - y)^2. Calculate dL/dz. Use da/dz = a(1 - a).', [['a', '0.5'], ['y', '1'], ['dL/da', '2(a - y)'], ['da/dz', 'a(1 - a)']], -0.25, ['dL/da = 2(0.5 - 1) = -1', 'da/dz = 0.5 x 0.5 = 0.25', 'dL/dz = -1 x 0.25 = -0.25'], { verify: '2*(0.5-1)*0.5*0.5' }),
          D.num('A gradient passes through 3 sigmoid layers, each with a local slope of 0.25. By what factor is it multiplied?', [['local slope', '0.25'], ['layers', '3']], 0.0156, ['0.25 x 0.25 x 0.25 = 0.015625'], { verify: '0.25**3', dp: 4 }),
          D.mc('A ReLU neuron has z < 0 for an example. What gradient flows through it?', ['The full gradient', 'Zero', 'A negative gradient', 'Infinity'], 1, 'Its local slope is 0.')
        ]
      },

      /* ===================================================== L14 */
      {
        id: 'overfit', title: 'Overfitting and regularisation', icon: 'shield', minutes: '25-30 min',
        blurb: 'Why a model can be perfect on training data and useless in the real world, and the standard cures.',
        theory: [
          D.page('Memorising versus understanding',
            D.p('Picture two students before an exam. One memorises the exact answers of the practice questions. The other learns the method. On the practice set the memoriser scores 100 percent. On the real exam, with new questions, they fail. A model can behave like the memoriser: it learns the quirks and noise of the training examples instead of the general pattern. This is **overfitting**.'),
            D.p('The opposite failure is **underfitting**: the model is too simple (or trained too briefly) to capture the pattern, so it is poor on both training and new data.'),
            D.table(['Situation', 'Train error', 'Validation error', 'Diagnosis'], [['Both high', 'high', 'high', 'underfitting'], ['Train low, validation high', 'low', 'high', 'overfitting'], ['Both low and close', 'low', 'low (similar)', 'good fit']])),
          D.page('Reading the learning curves',
            D.p('You watch the loss on the training set and on the validation set after every epoch. Training loss almost always keeps falling. Validation loss falls at first, bottoms out, then **rises** once the model starts memorising. The gap that opens up is the overfitting.'),
            D.plot({ title: 'Loss per epoch', xr: [0, 40], yr: [0, 2.5], fns: [{ f: '2*Math.exp(-0.25*x)+0.05', label: 'training loss' }, { f: '2*Math.exp(-0.25*x)+0.25+0.0009*x*x', label: 'validation loss' }], caption: 'Validation loss is lowest near epoch 12. After that, more training makes the model worse on new data.' }),
            D.note('tip', 'This is why you keep a validation set. The training loss alone would tell you everything is wonderful.')),
          D.page('Why it happens',
            D.list('**Too much capacity for the data**: millions of parameters and a few hundred examples, so the model can fit the noise.', '**Noisy or unrepresentative data**: the model faithfully learns accidental patterns.', '**Training too long** without checking validation.', '**Duplicated or leaked examples**: the model has really seen the test data.'),
            D.p('A rule of thumb: if you can reach zero training loss easily, you are probably memorising. Real data has noise, so a healthy model is not perfect on training data either.')),
          D.page('Cures that do not change the model',
            D.steps(['Get more data', 'The most reliable cure. More examples make memorising harder than learning the rule.'], ['Data augmentation', 'Create variations: flip, crop and rotate images, add noise, paraphrase text. The model sees more variety for free.'], ['A simpler model', 'Fewer layers or neurons means less capacity to memorise.'], ['Early stopping', 'Stop training when validation loss has not improved for a number of epochs called the **patience**, and keep the best weights.']),
            D.p('Example of early stopping with patience 2. Validation losses by epoch: 0.90, 0.70, 0.60, 0.55, 0.56, 0.58, 0.60. The best is epoch 4 (0.55). Epochs 5 and 6 are worse, so patience 2 runs out at epoch 6: stop, and restore the weights from epoch 4.')),
          D.page('Regularisation: penalise big weights, drop neurons',
            D.p('**L2 regularisation** (weight decay) adds a penalty for large weights to the loss. Wild, spiky functions need big weights, so punishing them favours smoother ones. The strength is set by lambda.'),
            D.formula('L_{total} = L_{data} + @lambda @sum_{j} w_j^2', [['@lambda', 'regularisation strength (a hyperparameter)'], ['w_j', 'every weight (usually not the biases)']]),
            D.p('Example: weights [3, -2, 1], lambda = 0.1. The sum of squares is 9 + 4 + 1 = 14, so the penalty is 0.1 x 14 = 1.4. In the gradient, the penalty adds 2 x lambda x w to each weight\'s slope, so every update pulls each weight a little towards zero: it "decays".'),
            D.p('**Dropout** randomly switches off a fraction of neurons during each training step (for example each neuron is kept with probability 0.8). The network cannot rely on any single neuron, which forces redundancy and general features. At test time everything is on. With 50 neurons and keep probability 0.8, about 40 are active in a training step.')),
          D.page('Regularisation in code',
            D.cmp('double L2Penalty(double[] w, double lambda)\n{\n    double s = 0;\n    foreach (var x in w) s += x * x;\n    return lambda * s;\n}', 'def l2_penalty(w, lam):\n    return lam * sum(x * x for x in w)'),
            D.note('cs', '`lambda` is a reserved word in Python, so the variable is called `lam` or `lambda_`. In PyTorch you rarely write this yourself: `torch.optim.AdamW(params, weight_decay=0.01)` does it.'))
        ],
        practice: [
          D.mc('Training loss is very low, validation loss is high. What is this?', ['Underfitting', 'Overfitting', 'A perfect model', 'A data error'], 1, 'The model memorised the training set.'),
          D.match('Match the remedy with the idea behind it.', [['Early stopping', 'stop before validation loss rises'], ['Data augmentation', 'create more varied examples'], ['L2 regularisation', 'penalise large weights'], ['Dropout', 'randomly disable neurons while training']]),
          D.num('Weights [3, -2, 1], lambda = 0.1. What is the L2 penalty lambda x sum of squares?', [['weights', '3, -2, 1'], ['lambda', '0.1']], 1.4, ['squares: 9 + 4 + 1 = 14', '0.1 x 14 = 1.4'], { verify: '0.1*(9+4+1)', dp: 1 }),
          D.order('Order the early-stopping procedure.', ['Train for one epoch', 'Measure the validation loss', 'Save the weights if it is the best so far', 'Stop when no improvement for "patience" epochs'], 'Train, evaluate, remember the best, stop on stagnation.'),
          D.multi('Which of these reduce overfitting?', ['More training data', 'Weight decay', 'Training much longer without checking validation', 'Dropout'], [0, 1, 3], 'Training longer unchecked often makes it worse.'),
          D.mc('Training and validation loss are both high and close together. What is likely?', ['Overfitting', 'Underfitting', 'Data leakage', 'A perfect fit'], 1, 'The model is too weak or undertrained.')
        ],
        code: [
          {
            title: 'L2 penalty', fn: 'l2Penalty',
            task: [D.p('Write `l2Penalty(weights, lambda)` returning `lambda` times the sum of the squared weights.')],
            starter: 'function l2Penalty(weights, lambda) {\n  \n}\n',
            tests: [{ args: [[3, -2, 1], 0.1], expect: 1.4 }, { args: [[0, 0], 5], expect: 0 }, { args: [[1, 1, 1, 1], 0.5], expect: 2 }, { args: [[2], 0.25], expect: 1, hidden: true }],
            hints: ['Sum the squares in a loop or with reduce.', 'return lambda * weights.reduce((s, w) => s + w * w, 0);'],
            solution: 'function l2Penalty(weights, lambda) {\n  return lambda * weights.reduce((s, w) => s + w * w, 0);\n}\n',
            explain: 'Add this to the data loss and the optimiser will trade accuracy against weight size.'
          },
          {
            title: 'Early stopping', fn: 'earlyStop',
            task: [D.p('Write `earlyStop(valLosses, patience)`. Walk through the validation losses epoch by epoch, keeping track of the best (lowest) loss and the epoch it happened (1-based). Stop when `patience` epochs in a row fail to improve. Return the best epoch number.')],
            starter: 'function earlyStop(valLosses, patience) {\n  let best = Infinity, bestEpoch = 0, wait = 0;\n  for (let i = 0; i < valLosses.length; i++) {\n    // update best / wait, stop when wait reaches patience\n  }\n  return bestEpoch;\n}\n',
            tests: [{ args: [[0.9, 0.7, 0.6, 0.55, 0.56, 0.58, 0.6], 2], expect: 4 }, { args: [[1, 0.5, 0.4, 0.3], 3], expect: 4 }, { args: [[0.5, 0.6, 0.7, 0.4], 2], expect: 1 }, { args: [[0.5, 0.6, 0.45, 0.46, 0.47], 2], expect: 3, hidden: true }],
            hints: ['If valLosses[i] < best: best = valLosses[i]; bestEpoch = i + 1; wait = 0; else wait++.', 'After updating, if (wait >= patience) break;'],
            solution: 'function earlyStop(valLosses, patience) {\n  let best = Infinity, bestEpoch = 0, wait = 0;\n  for (let i = 0; i < valLosses.length; i++) {\n    if (valLosses[i] < best) {\n      best = valLosses[i];\n      bestEpoch = i + 1;\n      wait = 0;\n    } else {\n      wait++;\n      if (wait >= patience) break;\n    }\n  }\n  return bestEpoch;\n}\n',
            explain: 'The third test shows why patience matters: training stopped before the late dip at epoch 4. Larger patience tolerates noisy validation curves at the cost of more training.'
          }
        ],
        quiz: [
          D.num('Weights [3, -2, 1], lambda = 0.1. Calculate the L2 penalty.', [['weights', '3, -2, 1'], ['lambda', '0.1']], 1.4, ['sum of squares = 9 + 4 + 1 = 14', 'penalty = 0.1 x 14 = 1.4'], { verify: '0.1*14', dp: 1 }),
          D.num('The data loss is 0.35. Weights [2, -3, 4], lambda = 0.01. Calculate the total loss = data loss + lambda x sum of squares.', [['data loss', '0.35'], ['weights', '2, -3, 4'], ['lambda', '0.01']], 0.64, ['sum of squares = 4 + 9 + 16 = 29', 'penalty = 0.01 x 29 = 0.29', 'total = 0.35 + 0.29 = 0.64'], { verify: '0.35+0.01*29' }),
          D.num('The L2 penalty adds 2 x lambda x w to the gradient of weight w. For w = 3 and lambda = 0.1, what is this extra gradient term?', [['w', '3'], ['lambda', '0.1']], 0.6, ['2 x 0.1 x 3 = 0.6'], { verify: '2*0.1*3', dp: 1 }),
          D.num('A dropout layer keeps each of 50 neurons with probability 0.8. On average, how many neurons are active in a training step?', [['neurons', '50'], ['keep probability', '0.8']], 40, ['50 x 0.8 = 40'], { verify: '50*0.8' }),
          D.num('Validation losses by epoch: 0.90, 0.70, 0.60, 0.55, 0.56, 0.58, 0.60. Which epoch (counting from 1) holds the best weights?', [['losses', '0.90, 0.70, 0.60, 0.55, 0.56, 0.58, 0.60']], 4, ['the lowest loss is 0.55', 'it is the 4th value, so epoch 4'], { verify: '[0.9,0.7,0.6,0.55,0.56,0.58,0.6].indexOf(0.55)+1' }),
          D.num('Training accuracy is 99 percent and validation accuracy is 82 percent. How many percentage points is the generalisation gap?', [['train', '99'], ['validation', '82']], 17, ['99 - 82 = 17'], { verify: '99-82' }),
          D.mc('Which change is most likely to reduce overfitting if you can do only one?', ['Collect more varied training data', 'Add more layers', 'Train for more epochs', 'Remove the validation set'], 0, 'More data makes memorising harder than generalising.'),
          D.mc('Why is dropout switched off at test time?', ['It is too slow', 'We want the full network\'s deterministic prediction', 'It makes the loss negative', 'Dropout only works on images'], 1, 'Randomly missing neurons would add noise to predictions.')
        ]
      }
    ]
  });
})();
