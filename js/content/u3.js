/* Unit 3: How models learn. */
(function () {
  const D = ML.d;
  ML.units.push({
    id: 'u3', title: 'How models learn', color: '#0e9f9f',
    blurb: 'Loss functions, gradient descent and the sigmoid: the full recipe for training a classifier.',
    lessons: [
      /* ===================================================== L8 */
      {
        id: 'loss', title: 'Loss functions', icon: 'target', minutes: '25-30 min',
        blurb: 'How to turn "this prediction is bad" into one number, for numbers and for categories.',
        theory: [
          D.page('What a loss function has to do',
            D.p('The loss is the **only feedback** the model ever gets. It never sees your intentions, only this number. So the choice of loss defines what "good" means, and a model will optimise exactly what you wrote, including the loopholes.'),
            D.list('It must be a **single number** per batch, so there is one thing to make smaller.', 'It should be **zero for perfect** predictions and grow as predictions get worse.', 'It must be **smooth** (have slopes almost everywhere), because training follows slopes.', 'It should match the real goal: predicting a number, picking a category, ranking items.'),
            D.note('warn', 'Accuracy (percent correct) is a great thing to report but a poor thing to train on: it is flat almost everywhere, so there is no slope to follow. We train on a smooth stand-in, the loss, and report accuracy separately.')),
          D.page('Regression: MSE or MAE',
            D.p('For numbers there are two classic choices. **MAE** (mean absolute error) averages the size of the mistakes. **MSE** (mean squared error) averages the squares. Compare how they grow with the error.'),
            D.plot({ title: 'Penalty as a function of the error e', xr: [-4, 4], yr: [0, 10], fns: [{ f: 'Math.abs(x)', label: 'absolute error |e|' }, { f: 'x*x', label: 'squared error e^2' }] }),
            D.table(['', 'MAE', 'MSE'], [['Formula', 'average of |e|', 'average of e^2'], ['Big mistakes', 'cost grows linearly', 'cost grows quadratically'], ['Outliers', 'robust', 'dominated by them'], ['Slope', 'constant, jumps at 0', 'smooth, fades near 0']]),
            D.p('Example with errors [1, 1, 1, 10]. MAE = (1 + 1 + 1 + 10) / 4 = 3.25. MSE = (1 + 1 + 1 + 100) / 4 = 25.75. The single bad example supplies 97 percent of the MSE, so training with MSE would obsess over it.')),
          D.page('Classification: loss as surprise',
            D.p('A classifier outputs a probability, say "I am 80 percent sure this is a cat". If it was a cat you are mildly pleased, if it was a dog you are surprised. Information theory measures surprise by the **negative logarithm** of the probability that was assigned to what really happened.'),
            D.plot({ title: 'Surprise = -ln(p), where p is the probability given to the true outcome', xr: [0, 1], yr: [0, 5], fns: [{ f: 'x>0?-Math.log(x):NaN', label: '-ln(p)' }] }),
            D.p('Read the curve. Give the truth probability 1 and the loss is 0. Give it 0.5 and the loss is 0.69. Give it 0.01 (confidently wrong) and the loss is 4.6, and it shoots towards infinity as p reaches 0. The model is punished harshly for confident mistakes, which is exactly what we want.')),
          D.page('Binary cross-entropy',
            D.p('For two classes the label y is 1 (positive) or 0 (negative) and the model outputs p, its probability for "positive". The surprise is -ln(p) when the truth is positive and -ln(1 - p) when the truth is negative. One formula covers both cases because y switches terms on and off.'),
            D.formula('L = -[ y @cdot ln(p) + (1 - y) @cdot ln(1 - p) ]', [['y', 'true label, 0 or 1'], ['p', 'predicted probability of class 1'], ['ln', 'natural logarithm']]),
            D.steps(['Case y = 1', 'The second term vanishes: L = -ln(p).'], ['Case y = 0', 'The first term vanishes: L = -ln(1 - p).'], ['Worked: y = 1, p = 0.8', 'L = -ln(0.8) = 0.223.'], ['Worked: y = 0, p = 0.3', 'L = -ln(0.7) = 0.357.'], ['Worked: y = 1, p = 0.01', 'L = -ln(0.01) = 4.605, a huge penalty.']),
            D.p('Over a dataset you average the loss of all examples.')),
          D.page('More than two classes',
            D.p('With K classes the model outputs K probabilities that sum to 1 (you will build that with softmax). The label is one-hot, so only one term survives: the loss is minus the log of the probability assigned to the **correct** class.'),
            D.formula('L = -ln( p_{correct} )', [['p_correct', 'probability the model gave to the true class']]),
            D.p('Example: probabilities [0.7, 0.2, 0.1], true class is the first. L = -ln(0.7) = 0.357. If the truth was the third class: -ln(0.1) = 2.303. The same model is penalised six times more when the truth was a class it considered unlikely.'),
            D.note('tip', 'Language models use exactly this loss: the classes are the words of the vocabulary and the correct class is the real next word.')),
          D.page('Loss functions in code',
            D.cmp('double Bce(int y, double p)\n{\n    const double eps = 1e-12;\n    p = Math.Clamp(p, eps, 1 - eps);\n    return -(y * Math.Log(p) + (1 - y) * Math.Log(1 - p));\n}', 'import math\n\ndef bce(y, p):\n    eps = 1e-12\n    p = min(max(p, eps), 1 - eps)\n    return -(y * math.log(p) + (1 - y) * math.log(1 - p))'),
            D.note('warn', 'Never take the log of exactly 0: it is minus infinity. Clamp the probability slightly away from 0 and 1 (the `eps` above). Libraries do this for you, or compute from raw scores in a numerically safe way.'))
        ],
        practice: [
          D.mc('Which loss is more sensitive to a single huge outlier?', ['MAE', 'MSE', 'Both equally', 'Neither'], 1, 'Squaring makes big errors count far more.'),
          D.num('Errors are [1, -2, 3, -2]. What is the MAE?', [['errors', '1, -2, 3, -2']], 2, ['absolute values: 1, 2, 3, 2', 'sum = 8, divide by 4 = 2'], { verify: '(1+2+3+2)/4' }),
          D.match('Match the loss to the best-fitting task.', [['MSE', 'predict a house price'], ['Binary cross-entropy', 'spam or not spam'], ['Categorical cross-entropy', 'which of 10 digits'], ['MAE', 'regression robust to outliers']]),
          D.order('Order the steps to compute binary cross-entropy for one example.', ['Get the predicted probability p', 'Pick the term that matches the label y', 'Take the negative log of that probability', 'Average over all examples'], 'Only the probability of the true outcome matters.'),
          D.multi('Which statements are true for cross-entropy?', ['Confident wrong predictions are punished very hard', 'p = 1 for the true class gives loss 0', 'It can be negative', 'It is based on the negative log of the true-class probability'], [0, 1, 3], 'Probabilities are at most 1, so -ln is never negative.'),
          D.mc('Why not train a classifier directly on accuracy?', ['It is too hard to compute', 'It is flat almost everywhere, so there is no slope to follow', 'It is always 100 percent', 'It needs labels'], 1, 'Gradients need smooth losses.')
        ],
        code: [
          {
            title: 'Mean absolute error', fn: 'mae',
            task: [D.p('Write `mae(preds, targets)` returning the average of `|pred - target|`. `Math.abs` is your friend.')],
            starter: 'function mae(preds, targets) {\n  \n}\n',
            tests: [{ args: [[3, 5, 8], [2, 5, 10]], expect: 1 }, { args: [[1, 1, 1, 11], [0, 0, 0, 1]], expect: 3.25 }, { args: [[4], [4]], expect: 0 }, { args: [[0, 0], [-2, 2]], expect: 2, hidden: true }],
            hints: ['Loop and add Math.abs(preds[i] - targets[i]).', 'Divide the total by preds.length.'],
            solution: 'function mae(preds, targets) {\n  let total = 0;\n  for (let i = 0; i < preds.length; i++) total += Math.abs(preds[i] - targets[i]);\n  return total / preds.length;\n}\n',
            explain: 'Compare with MSE on the same data and see how differently outliers are treated.'
          },
          {
            title: 'Binary cross-entropy', fn: 'bce',
            task: [D.p('Write `bce(y, p)`: clamp `p` into `[1e-12, 1 - 1e-12]`, then return `-(y * ln(p) + (1 - y) * ln(1 - p))`. JavaScript\'s natural log is `Math.log`.')],
            starter: 'function bce(y, p) {\n  const eps = 1e-12;\n  // clamp p, then compute the loss\n}\n',
            tests: [{ args: [1, 0.8], expect: 0.22314, tol: 0.0001 }, { args: [0, 0.3], expect: 0.35667, tol: 0.0001 }, { args: [1, 0.01], expect: 4.60517, tol: 0.0001 }, { args: [1, 0], expect: 27.631, tol: 0.01, hidden: true }],
            hints: ['Clamp: p = Math.min(Math.max(p, eps), 1 - eps);', 'return -(y * Math.log(p) + (1 - y) * Math.log(1 - p));'],
            solution: 'function bce(y, p) {\n  const eps = 1e-12;\n  p = Math.min(Math.max(p, eps), 1 - eps);\n  return -(y * Math.log(p) + (1 - y) * Math.log(1 - p));\n}\n',
            explain: 'The last hidden test shows why clamping matters: p = 0 for a positive example would be infinite loss without it.'
          },
          {
            title: 'Categorical cross-entropy', fn: 'crossEntropy',
            task: [D.p('Write `crossEntropy(probs, trueIndex)` returning minus the natural log of the probability given to the correct class. `probs` sums to 1.')],
            starter: 'function crossEntropy(probs, trueIndex) {\n  \n}\n',
            tests: [{ args: [[0.7, 0.2, 0.1], 0], expect: 0.35667, tol: 0.0001 }, { args: [[0.7, 0.2, 0.1], 2], expect: 2.30259, tol: 0.0001 }, { args: [[0.25, 0.25, 0.25, 0.25], 3], expect: 1.38629, tol: 0.0001 }, { args: [[1, 0], 0], expect: 0, hidden: true }],
            hints: ['Only one probability matters: probs[trueIndex].', 'return -Math.log(probs[trueIndex]);'],
            solution: 'function crossEntropy(probs, trueIndex) {\n  return -Math.log(probs[trueIndex]);\n}\n',
            explain: 'One line, but this is the loss behind ChatGPT-style models.'
          }
        ],
        quiz: [
          D.num('Errors of a model are [1, -2, 3, -2]. Calculate the MAE.', [['errors', '1, -2, 3, -2']], 2, ['absolute values: 1, 2, 3, 2', 'MAE = 8 / 4 = 2'], { verify: '(1+2+3+2)/4' }),
          D.num('Errors are [1, 1, 1, 10]. Calculate the MSE.', [['errors', '1, 1, 1, 10']], 25.75, ['squares: 1, 1, 1, 100', 'MSE = 103 / 4 = 25.75'], { verify: '(1+1+1+100)/4' }),
          D.num('Binary cross-entropy with y = 1 and predicted p = 0.8. Use the natural logarithm.', [['y', '1'], ['p', '0.8'], ['formula', 'L = -ln(p) when y = 1']], 0.2231, ['L = -ln(0.8)', '= 0.2231'], { verify: '-Math.log(0.8)', dp: 3 }),
          D.num('Binary cross-entropy with y = 0 and predicted p = 0.3 (probability of class 1).', [['y', '0'], ['p', '0.3'], ['formula', 'L = -ln(1 - p) when y = 0']], 0.3567, ['L = -ln(1 - 0.3) = -ln(0.7)', '= 0.3567'], { verify: '-Math.log(0.7)', dp: 3 }),
          D.num('Two examples: (y = 1, p = 0.9) and (y = 0, p = 0.2). Calculate the average binary cross-entropy.', [['example 1 loss', '-ln(0.9)'], ['example 2 loss', '-ln(0.8)']], 0.1642, ['-ln(0.9) = 0.1054', '-ln(0.8) = 0.2231', 'average = (0.1054 + 0.2231) / 2 = 0.1642'], { verify: '(-Math.log(0.9)-Math.log(0.8))/2', dp: 3 }),
          D.num('A 4-class model gives the correct class probability 0.25. What is the categorical cross-entropy loss?', [['p_correct', '0.25']], 1.3863, ['L = -ln(0.25)', '= ln(4) = 1.386'], { verify: '-Math.log(0.25)', dp: 3 }),
          D.mc('A model assigns probability 0.001 to the true class. What happens to the loss?', ['It is tiny', 'It is large', 'It is exactly 0', 'It becomes negative'], 1, '-ln(0.001) = 6.9.'),
          D.mc('Which loss would you pick to predict tomorrow\'s temperature?', ['Binary cross-entropy', 'MSE or MAE', 'Categorical cross-entropy', 'Accuracy'], 1, 'A continuous number calls for a regression loss.')
        ]
      },

      /* ===================================================== L9 */
      {
        id: 'gradient-descent', title: 'Gradient descent', icon: 'down', minutes: '30-35 min',
        blurb: 'The algorithm that trains almost every model: step downhill, repeat.',
        theory: [
          D.page('Walking down a mountain in fog',
            D.p('You are on a mountain in dense fog and want the lowest point. You cannot see the valley, but you can feel the slope under your feet. A sensible strategy: feel which direction goes down most steeply, take a small step that way, and repeat. When the ground feels flat you have reached a low point.'),
            D.p('That is **gradient descent**. The mountain is the loss as a function of the parameters. Your position is the current parameter values. The slope under your feet is the gradient (the previous lesson). The step size is the **learning rate**.'),
            D.note('tip', 'The model never sees the whole landscape. It only ever uses the local slope at its current position. Everything in deep learning is built on that humble idea.')),
          D.page('The update rule',
            D.formula('@theta @leftarrow @theta - @eta @nabla L(@theta)'.replace('@leftarrow', '@to'), [['@theta', 'all parameters (current values)'], ['@eta', 'learning rate, a small positive number like 0.01'], ['@nabla L', 'gradient of the loss with respect to the parameters'], ['@to', 'means "replace the old value with"']]),
            D.p('Read it in words. Take each parameter. Compute how the loss changes when that parameter increases. Move the parameter in the opposite direction, by an amount proportional to the slope and to the learning rate. Steep slope means a big step, flat slope a tiny step, so the steps shrink on their own as you near the bottom.'),
            D.steps(['Start at x = 4 on f(x) = x^2', 'Slope is 2x = 8. Learning rate 0.1.'], ['Step 1', 'x = 4 - 0.1 x 8 = 3.2.'], ['Step 2', 'slope = 2 x 3.2 = 6.4, so x = 3.2 - 0.1 x 6.4 = 2.56.'], ['Step 3', 'slope = 5.12, so x = 2.56 - 0.512 = 2.048.'], ['Keep going', 'x shrinks towards 0, the minimum.'])),
          D.page('The learning rate is a dial you must set',
            D.p('Experiment. The curve is the loss f(x) = x squared, the dashed path is gradient descent starting at x = 4. Try learning rates 0.05 (slow), 0.4 (fast), 1.0 (bounces forever) and 1.05 (explodes).'),
            D.plot({ title: 'Gradient descent on f(x) = x^2', xr: [-6, 6], yr: [-2, 40], fns: [{ f: 'x*x', label: 'loss' }], trail: '(function(){var x=p.x0,t=[[x,x*x]];for(var i=0;i<p.steps;i++){x=x-p.lr*2*x;t.push([x,x*x]);}return t;})()', params: [{ n: 'lr', label: 'learning rate', min: 0.01, max: 1.1, step: 0.01, v: 0.1 }, { n: 'steps', label: 'steps', min: 0, max: 25, step: 1, v: 5, digits: 0 }, { n: 'x0', label: 'start x', min: -5, max: 5, step: 0.5, v: 4 }], readout: [{ label: 'final x', f: 'p.x0*Math.pow(1-2*p.lr,p.steps)', digits: 3 }] }),
            D.table(['Learning rate', 'What happens'], [['too small', 'safe but painfully slow'], ['about right', 'smooth approach to the minimum'], ['too big', 'overshoots the valley, loss bounces or explodes']]),
            D.p('For this particular bowl each step multiplies x by (1 - 2 x lr). If that factor has magnitude below 1 you converge, above 1 you diverge. Real landscapes are messier, but the same trade-off holds.')),
          D.page('Gradient descent on a line (full example)',
            D.p('Apply it to the line from Unit 1. The loss is MSE and the parameters are w and b. Using the chain rule on L = (1/N) sum of (w x + b - y)^2 you get two clean formulas.'),
            D.formula(['@f{@partial L}{@partial w} = @f{2}{N} @sum (@hat{y}_i - y_i) x_i', '@f{@partial L}{@partial b} = @f{2}{N} @sum (@hat{y}_i - y_i)'], [['@hat{y}_i - y_i', 'the residual of example i'], ['x_i', 'multiplies the residual for w, but not for b']]),
            D.p('Worked step. Data: x = [1, 2], y = [2, 4]. Start with w = 0, b = 0, learning rate 0.05.'),
            D.steps(['Predictions', 'y-hat = 0 for both examples.'], ['Residuals', '0 - 2 = -2 and 0 - 4 = -4.'], ['Gradient for w', '(2/2) x [(-2)(1) + (-4)(2)] = -10.'], ['Gradient for b', '(2/2) x [-2 + -4] = -6.'], ['Update', 'w = 0 - 0.05 x (-10) = 0.5 and b = 0 - 0.05 x (-6) = 0.3.']),
            D.p('Both gradients are negative, meaning "increasing w and b lowers the loss", so both increase. The data wants w = 2, b = 0, and the first step already moved towards it.')),
          D.page('Variants and trouble spots',
            D.list('**Batch**: use all examples for each gradient. Exact but slow for big data.', '**Stochastic (SGD)**: one random example per step. Fast and noisy; the noise can even help escape bad spots.', '**Mini-batch**: 32 to 512 examples per step. The practical default, and it maps well onto GPU matrix multiplications.', '**Local minima and saddles**: the loss of a neural network is bumpy. In practice, with many parameters, most trouble comes from flat regions rather than deep traps.', '**Smarter optimisers**: momentum remembers recent directions; Adam adapts the step size per parameter. They are gradient descent with extra memory.'),
            D.note('info', 'One pass through the entire training set is called an **epoch**. Training usually runs for many epochs, watching the validation loss.')),
          D.page('The loop in code',
            D.cmp('double Descend(double x, double lr, int steps)\n{\n    for (int i = 0; i < steps; i++)\n    {\n        double grad = 2 * (x - 3);   // slope of (x-3)^2\n        x -= lr * grad;\n    }\n    return x;\n}', 'def descend(x, lr, steps):\n    for _ in range(steps):\n        grad = 2 * (x - 3)   # slope of (x-3)**2\n        x -= lr * grad\n    return x'),
            D.note('cs', 'The `for _ in range(steps)` idiom is the Python for-loop where the counter is unused. Everything else maps one to one to C#. In PyTorch the `grad` line is replaced by `loss.backward()`, which computes every gradient for you.'))
        ],
        practice: [
          D.mc('The gradient of the loss is positive for some weight. Gradient descent will...', ['increase that weight', 'decrease that weight', 'leave it unchanged', 'set it to zero'], 1, 'Step against the gradient: new = old - eta x gradient.'),
          D.num('x = 5, learning rate 0.1, and the gradient is 2x = 10. What is the new x after one step?', [['x', '5'], ['learning rate', '0.1'], ['gradient', '10']], 4, ['x_new = 5 - 0.1 x 10', '= 5 - 1 = 4'], { verify: '5-0.1*10' }),
          D.match('Match the symptom with its likely cause.', [['Loss explodes to huge values', 'learning rate too high'], ['Loss barely decreases', 'learning rate too small'], ['Loss curve is noisy', 'small batches (stochastic)'], ['Gradient is exactly 0 and loss is high', 'flat region or saddle point']]),
          D.order('Order one lap of gradient descent.', ['Compute predictions and the loss', 'Compute the gradient of the loss', 'Multiply the gradient by the learning rate', 'Subtract it from the parameters'], 'Forward, backward, scale, update.'),
          D.multi('Which statements about the learning rate are true?', ['Too large can make training diverge', 'Too small makes training slow', 'It is learned automatically like the weights', 'It scales the step size'], [0, 1, 3], 'The learning rate is a hyperparameter you set, not a learned parameter.'),
          D.mc('One epoch means...', ['One update step', 'One pass over the whole training set', 'One example', 'One neuron'], 1, 'Many mini-batch steps make up an epoch.')
        ],
        code: [
          {
            title: 'Descend a bowl', fn: 'descend',
            task: [D.p('Minimise `f(x) = (x - 3)^2`, whose gradient is `2 * (x - 3)`. Write `descend(x0, lr, steps)`: start at `x0`, apply the update rule `steps` times, return the final `x`.')],
            starter: 'function descend(x0, lr, steps) {\n  let x = x0;\n  // repeat the update rule\n  return x;\n}\n',
            tests: [{ args: [0, 0.1, 1], expect: 0.6 }, { args: [0, 0.1, 2], expect: 1.08 }, { args: [0, 0.5, 1], expect: 3 }, { args: [10, 0.1, 200], expect: 3, tol: 0.001, hidden: true }],
            hints: ['A for loop that runs `steps` times.', 'x = x - lr * 2 * (x - 3);'],
            solution: 'function descend(x0, lr, steps) {\n  let x = x0;\n  for (let i = 0; i < steps; i++) {\n    x = x - lr * 2 * (x - 3);\n  }\n  return x;\n}\n',
            explain: 'With lr = 0.5 you land exactly on the minimum in one step, because for this bowl the factor (1 - 2 lr) is 0.'
          },
          {
            title: 'Train a line', fn: 'trainLinear',
            task: [D.p('Write `trainLinear(xs, ys, lr, epochs)` that starts at `w = 0, b = 0` and applies full-batch gradient descent for `epochs` rounds, returning `[w, b]`.'), D.steps(['Residuals', 'for each i: r = w * xs[i] + b - ys[i].'], ['Gradients', 'gw = (2/N) sum r * x, gb = (2/N) sum r.'], ['Update', 'w -= lr * gw, b -= lr * gb.'])],
            starter: 'function trainLinear(xs, ys, lr, epochs) {\n  let w = 0, b = 0;\n  const n = xs.length;\n  for (let e = 0; e < epochs; e++) {\n    let gw = 0, gb = 0;\n    // accumulate the gradients over all examples\n    // then update w and b\n  }\n  return [w, b];\n}\n',
            tests: [{ args: [[1, 2], [2, 4], 0.05, 1], expect: [0.5, 0.3] }, { args: [[1, 2, 3], [3, 5, 7], 0.05, 5000], expect: [2, 1], tol: 0.02 }, { args: [[0, 1, 2, 3], [1, 3, 2, 5], 0.05, 5000], expect: [1.1, 1.1], tol: 0.02 }, { args: [[1, 2, 3], [2, 4, 6], 0.05, 3000], expect: [2, 0], tol: 0.02, hidden: true }],
            hints: ['Inside the loop over examples: const r = w * xs[i] + b - ys[i]; gw += 2 * r * xs[i] / n; gb += 2 * r / n;', 'After the inner loop: w -= lr * gw; b -= lr * gb;'],
            solution: 'function trainLinear(xs, ys, lr, epochs) {\n  let w = 0, b = 0;\n  const n = xs.length;\n  for (let e = 0; e < epochs; e++) {\n    let gw = 0, gb = 0;\n    for (let i = 0; i < n; i++) {\n      const r = w * xs[i] + b - ys[i];\n      gw += 2 * r * xs[i] / n;\n      gb += 2 * r / n;\n    }\n    w -= lr * gw;\n    b -= lr * gb;\n  }\n  return [w, b];\n}\n',
            explain: 'You trained a model. The first test is the hand-computed step from the theory: w = 0.5, b = 0.3. The others converge to the same answers as the closed-form fit from lesson 3.'
          }
        ],
        quiz: [
          D.num('Minimise f(x) = x^2 starting at x = 4 with learning rate 0.1. The gradient is 2x. Calculate x after ONE step.', [['x', '4'], ['learning rate', '0.1'], ['gradient', '2x']], 3.2, ['gradient = 2 x 4 = 8', 'x = 4 - 0.1 x 8 = 3.2'], { verify: '4-0.1*8', dp: 1 }),
          D.num('Same problem. Calculate x after TWO steps.', [['after one step', 'x = 3.2'], ['learning rate', '0.1']], 2.56, ['gradient = 2 x 3.2 = 6.4', 'x = 3.2 - 0.1 x 6.4 = 2.56'], { verify: '3.2-0.1*6.4' }),
          D.num('Data x = [1, 2], y = [2, 4], model w = 0, b = 0. Calculate dL/dw for the MSE loss.', [['predictions', '0, 0'], ['residuals', '-2, -4'], ['formula', 'dL/dw = (2/N) sum (residual x x)']], -10, ['(2/2) x [(-2)(1) + (-4)(2)]', '= 1 x (-2 - 8) = -10'], { verify: '(2/2)*((-2)*1+(-4)*2)' }),
          D.num('Same data. Calculate dL/db.', [['residuals', '-2, -4'], ['formula', 'dL/db = (2/N) sum residual']], -6, ['(2/2) x (-2 + -4)', '= -6'], { verify: '(2/2)*(-2+-4)' }),
          D.num('With dL/dw = -10 and learning rate 0.05, what is w after one update starting from w = 0?', [['w', '0'], ['dL/dw', '-10'], ['learning rate', '0.05']], 0.5, ['w = 0 - 0.05 x (-10)', '= 0.5'], { verify: '0-0.05*-10', dp: 1 }),
          D.num('Minimise f(x) = (x - 3)^2 (gradient 2(x - 3)) from x = 0 with learning rate 0.25. Calculate x after one step.', [['x', '0'], ['learning rate', '0.25']], 1.5, ['gradient = 2 x (0 - 3) = -6', 'x = 0 - 0.25 x (-6) = 1.5'], { verify: '0-0.25*(2*(0-3))', dp: 1 }),
          D.mc('On f(x) = x^2 you use a learning rate of 1.05. What happens?', ['Smooth convergence', 'The iterates grow without bound', 'It lands exactly on 0', 'Nothing changes'], 1, 'The factor is 1 - 2 x 1.05 = -1.1, magnitude above 1, so x grows each step.'),
          D.mc('Why is mini-batch gradient descent the practical default?', ['It is exact', 'It balances noisy-but-fast steps with efficient GPU matrix operations', 'It needs no learning rate', 'It never overshoots'], 1, 'Mini-batches fit hardware well and give frequent updates.')
        ]
      },

      /* ===================================================== L10 */
      {
        id: 'sigmoid', title: 'Sigmoid and logistic regression', icon: 'sigma', minutes: '30-35 min',
        blurb: 'Squash any number into a probability, then classify. Your first real classifier.',
        theory: [
          D.page('The problem: a line is not a probability',
            D.p('You want to predict "will this customer buy: yes or no". A linear model w x + b can output -3.7 or 142. Those are not probabilities, which must stay between 0 and 1. You need a smooth **squashing function** that maps any real number to the open interval (0, 1).'),
            D.p('The classic choice is the **sigmoid** (also called the logistic function). Large positive inputs go to nearly 1, large negative inputs to nearly 0, and the middle (input 0) maps to exactly 0.5, the point of maximum uncertainty.')),
          D.page('The sigmoid curve',
            D.formula('@sigma(z) = @f{1}{1 + e^{-z}}', [['z', 'any real number (the "score", also called the logit)'], ['e', 'Euler\'s number, about 2.71828'], ['@sigma(z)', 'output between 0 and 1']]),
            D.plot({ title: 'Sigmoid with adjustable steepness and shift', xr: [-8, 8], yr: [-0.1, 1.1], fns: [{ f: '1/(1+Math.exp(-p.k*(x-p.c)))', label: 'sigmoid(k (z - c))' }, { f: '0.5', dash: true, c: 'var(--muted)' }], params: [{ n: 'k', label: 'steepness k', min: 0.2, max: 4, step: 0.1, v: 1 }, { n: 'c', label: 'shift c', min: -4, max: 4, step: 0.1, v: 0 }], readout: [{ label: 'sigmoid at z = 1', f: '1/(1+Math.exp(-p.k*(1-p.c)))', digits: 3 }, { label: 'midpoint at z', f: 'p.c', digits: 1 }] }),
            D.list('**Steepness** k is what a weight does: larger weights make a sharper switch.', '**Shift** c is what a bias does: it moves the point where the output crosses 0.5.', 'Symmetry: sigmoid(-z) = 1 - sigmoid(z).', 'The slope is sigmoid(z) x (1 - sigmoid(z)), at most 0.25. This tidy formula makes backpropagation cheap.')),
          D.page('Calculating a sigmoid by hand',
            D.p('You only need the exponential key on a calculator. Follow the order of operations strictly.'),
            D.steps(['Negate z', 'For z = 2 we need e^(-2).'], ['Exponentiate', 'e^(-2) = 0.1353.'], ['Add 1', '1 + 0.1353 = 1.1353.'], ['Take the reciprocal', '1 / 1.1353 = 0.8808.']),
            D.p('So sigmoid(2) = 0.881. For z = -2: e^(2) = 7.389, then 1 + 7.389 = 8.389, then 1 / 8.389 = 0.1192. Check the symmetry: 0.8808 + 0.1192 = 1.'),
            D.p('A nice special case: z = ln 3 gives e^(-z) = 1/3, so sigmoid = 1 / (1 + 1/3) = 3/4 = 0.75. In general a score of ln(odds) maps back to probability: odds 3 to 1 means 75 percent.'),
            D.note('warn', 'For very negative z, e^(-z) overflows. Libraries compute the sigmoid in a stable way. For lessons here the plain formula is fine.')),
          D.page('Logistic regression = linear score + sigmoid',
            D.p('Combine the two ideas. Compute the linear score z = w . x + b exactly as before. Pass it through the sigmoid to obtain the probability of the positive class. Predict "positive" when that probability is above 0.5, which happens exactly when z is above 0.'),
            D.formula('p = @sigma(w @cdot x + b)', [['w', 'weights, one per feature'], ['x', 'feature vector'], ['b', 'bias'], ['p', 'probability of class 1']]),
            D.steps(['Dot product', 'z = w1 x1 + w2 x2 + ... + b (a dot product plus the bias).'], ['Squash', 'p = sigmoid(z).'], ['Decide', 'if p > 0.5 answer "yes", else "no".']),
            D.p('The set of points with z = 0 is a straight line (a plane in higher dimensions): the **decision boundary**. Points on one side get p above 0.5, points on the other side below. Try to separate the two groups by moving the boundary.'),
            D.plot({ title: 'Decision boundary: w1 x + w2 y + b = 0', h: 330, xr: [0, 8], yr: [0, 8], points: [[1, 2, 0], [2, 1, 0], [2, 3, 0], [3, 1.5, 0], [1.5, 4, 0], [5, 6, 1], [6, 5, 1], [6.5, 7, 1], [4.5, 5.5, 1], [7, 4, 1]], fns: [{ f: '-(p.w1*x+p.b)/p.w2', label: 'boundary', c: 'var(--ink)' }], params: [{ n: 'w1', label: 'weight w1', min: -3, max: 3, step: 0.1, v: 0.5 }, { n: 'w2', label: 'weight w2', min: 0.2, max: 3, step: 0.1, v: 1 }, { n: 'b', label: 'bias b', min: -20, max: 10, step: 0.5, v: -2 }], readout: [{ label: 'correct', f: 'pts.filter(function(q){return ((p.w1*q[0]+p.w2*q[1]+p.b)>0?1:0)===q[2];}).length+" / "+pts.length' }], caption: 'Blue points are class 0, pink points are class 1. A point is classified as 1 when it lies above the line.' })),
          D.page('Training logistic regression',
            D.p('Use binary cross-entropy from the loss lesson and gradient descent from the previous one. The calculus works out beautifully: the sigmoid and the log cancel, and the gradient looks just like linear regression.'),
            D.formula(['@f{@partial L}{@partial w_j} = (p - y) x_j', '@f{@partial L}{@partial b} = (p - y)'], [['p - y', 'predicted probability minus the true label (0 or 1)'], ['x_j', 'the j-th feature of the example']]),
            D.p('Read it: if the model says p = 0.8 but the true label is y = 1, the residual is -0.2. For a feature value x = 2 the gradient for that weight is -0.4. A negative gradient means "increase this weight", which raises the score, which raises p towards 1. Exactly what you want.'),
            D.steps(['Forward', 'z = w . x + b, p = sigmoid(z).'], ['Residual', 'r = p - y.'], ['Gradients', '$dw_j = r x_j$ and $db = r$ (averaged over a batch).'], ['Update', '$w_j$ decreases by lr x $dw_j$, and b decreases by lr x db.'])),
          D.page('Logistic regression in code',
            D.cmp('double Sigmoid(double z) => 1.0 / (1.0 + Math.Exp(-z));\n\ndouble PredictProb(double[] w, double[] x, double b)\n{\n    double z = b;\n    for (int i = 0; i < w.Length; i++) z += w[i] * x[i];\n    return Sigmoid(z);\n}', 'import math\n\ndef sigmoid(z):\n    return 1.0 / (1.0 + math.exp(-z))\n\ndef predict_prob(w, x, b):\n    z = b + sum(wi * xi for wi, xi in zip(w, x))\n    return sigmoid(z)'),
            D.note('cs', 'Python allows a generator expression inside `sum(...)`, a close cousin of LINQ `Select(...).Sum()`. In the single-neuron model you already built in NumPy, these exact two functions were the whole classifier.'))
        ],
        practice: [
          D.mc('What is the sigmoid of z = 0?', ['0', '0.5', '1', 'undefined'], 1, '1 / (1 + e^0) = 1 / 2.'),
          D.mc('The sigmoid output can never be...', ['0.3', '0.99', '1 exactly', '0.5'], 2, 'It approaches 1 but only reaches it in the limit.'),
          D.num('Compute sigmoid(0) as a number.', [['z', '0'], ['formula', '1 / (1 + e^(-z))']], 0.5, ['e^0 = 1', '1 / (1 + 1) = 0.5'], { verify: '1/(1+Math.exp(0))', dp: 1 }),
          D.order('Order the logistic regression prediction pipeline.', ['Multiply features by weights and sum (dot product)', 'Add the bias to get the score z', 'Apply the sigmoid to get a probability', 'Compare with 0.5 to pick a class'], 'x to dot product to bias to sigmoid to threshold.'),
          D.match('Match each element with its effect.', [['Larger weight', 'sharper transition'], ['Bias', 'shifts where the curve crosses 0.5'], ['Score z = 0', 'probability exactly 0.5'], ['Large positive z', 'probability near 1']]),
          D.multi('Select the true statements about logistic regression.', ['Its decision boundary is a straight line (or plane)', 'It predicts class 1 when w.x + b is above 0', 'It outputs values outside 0 to 1', 'It is trained with cross-entropy loss'], [0, 1, 3], 'The sigmoid keeps outputs inside (0, 1).')
        ],
        code: [
          {
            title: 'Sigmoid', fn: 'sigmoid',
            task: [D.p('Write `sigmoid(z)` returning `1 / (1 + e^(-z))`. In JavaScript the exponential is `Math.exp`.')],
            starter: 'function sigmoid(z) {\n  \n}\n',
            tests: [{ args: [0], expect: 0.5 }, { args: [2], expect: 0.88080, tol: 0.0001 }, { args: [-2], expect: 0.11920, tol: 0.0001 }, { args: [-50], expect: 0, tol: 0.000001, hidden: true }],
            hints: ['The expression has three parts: negate z, exponentiate, add one.', 'return 1 / (1 + Math.exp(-z));'],
            solution: 'function sigmoid(z) {\n  return 1 / (1 + Math.exp(-z));\n}\n',
            explain: 'One line. In C# it is `1.0 / (1.0 + Math.Exp(-z))`: identical.'
          },
          {
            title: 'Classify a point', fn: 'predictProb',
            task: [D.p('Write `predictProb(w, x, b)` returning the probability of class 1: compute the score `z = w . x + b`, then the sigmoid of `z`. A `sigmoid` function is provided for you.')],
            starter: 'function sigmoid(z) {\n  return 1 / (1 + Math.exp(-z));\n}\n\nfunction predictProb(w, x, b) {\n  \n}\n',
            tests: [{ args: [[1.5, -2], [2, 1], 0.5], expect: 0.8176, tol: 0.0001 }, { args: [[1, 1], [0, 0], 0], expect: 0.5 }, { args: [[2], [-3], 1], expect: 0.00669, tol: 0.0001 }, { args: [[0.5, 0.5, 0.5], [2, 2, 2], -3], expect: 0.5, hidden: true }],
            hints: ['Start with let z = b; then add w[i] * x[i] in a loop.', 'return sigmoid(z);'],
            solution: 'function sigmoid(z) {\n  return 1 / (1 + Math.exp(-z));\n}\n\nfunction predictProb(w, x, b) {\n  let z = b;\n  for (let i = 0; i < w.length; i++) z += w[i] * x[i];\n  return sigmoid(z);\n}\n',
            explain: 'This is a complete trained-model forward pass. Training only decides which numbers go into w and b.'
          }
        ],
        quiz: [
          D.num('A logistic model has w = [1.5, -2], bias b = 0.5 and receives x = [2, 1]. Calculate the score z = w . x + b.', [['w', '[1.5, -2]'], ['x', '[2, 1]'], ['b', '0.5']], 1.5, ['1.5 x 2 = 3', '-2 x 1 = -2', 'z = 3 - 2 + 0.5 = 1.5'], { verify: '1.5*2+-2*1+0.5', dp: 1 }),
          D.num('Using the same model (z = 1.5), calculate the probability sigmoid(z).', [['z', '1.5'], ['formula', '1 / (1 + e^(-z))']], 0.8176, ['e^(-1.5) = 0.2231', '1 + 0.2231 = 1.2231', '1 / 1.2231 = 0.8176'], { verify: '1/(1+Math.exp(-1.5))', dp: 3 }),
          D.num('Calculate sigmoid(-2).', [['z', '-2'], ['formula', '1 / (1 + e^(-z))']], 0.1192, ['e^(2) = 7.389', '1 + 7.389 = 8.389', '1 / 8.389 = 0.1192'], { verify: '1/(1+Math.exp(2))', dp: 3 }),
          D.num('Calculate sigmoid(ln 3). Hint: e^(-ln 3) = 1/3.', [['z', 'ln 3 = 1.0986'], ['e^(-z)', '1/3']], 0.75, ['1 + 1/3 = 4/3', '1 / (4/3) = 3/4 = 0.75'], { verify: '1/(1+1/3)' }),
          D.num('A logistic regression sees p = 0.8 for an example with true label y = 1 and feature x = 2. Calculate the gradient (p - y) x for that weight.', [['p', '0.8'], ['y', '1'], ['x', '2']], -0.4, ['(0.8 - 1) x 2', '= -0.2 x 2 = -0.4'], { verify: '(0.8-1)*2', dp: 1 }),
          D.num('The model is 80 percent sure (p = 0.8). Calculate the logit z = ln(p / (1 - p)).', [['p', '0.8'], ['p / (1 - p)', '4']], 1.386, ['p / (1 - p) = 0.8 / 0.2 = 4', 'ln(4) = 1.386'], { verify: 'Math.log(0.8/0.2)', dp: 3 }),
          D.mc('A model outputs z = -0.3. Which class does it predict?', ['Class 1 (probability above 0.5)', 'Class 0 (probability below 0.5)', 'It cannot decide', 'Class 1 with probability 1'], 1, 'Negative score means sigmoid below 0.5.'),
          D.mc('What does the bias do to the sigmoid curve?', ['Makes it steeper', 'Shifts where it crosses 0.5', 'Flips it upside down', 'Removes the squashing'], 1, 'Bias moves the decision boundary, weight steepens it.')
        ]
      }
    ]
  });
})();
