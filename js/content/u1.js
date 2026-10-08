/* Unit 1: The big picture. Math commands use @ (e.g. @f{a}{b}, @hat{y}, @theta). */
(function () {
  const D = ML.d;
  ML.units.push({
    id: 'u1', title: 'The big picture', color: '#2f5bff',
    blurb: 'What machine learning actually is, what data looks like, and your first trainable model.',
    lessons: [
      /* ===================================================== L1 */
      {
        id: 'what-is-ml', title: 'What is machine learning?', icon: 'nodes', minutes: '20-25 min',
        blurb: 'The shift from writing rules to learning them from examples, and the vocabulary you will use in every other lesson.',
        theory: [
          D.page('Rules versus examples',
            D.p('Imagine you must build a spam filter. The classic way is to **write the rules yourself**: if the subject contains "FREE MONEY" then spam; if the sender is in the contacts then not spam. It works for a week. Then spammers change their wording and your rules rot.'),
            D.p('Machine learning flips the job. Instead of writing the rules, you collect **thousands of emails that people already labelled** as spam or not spam, and you let a program discover which patterns separate the two groups. The rules are not typed by you, they are *fitted* to the data.'),
            D.table(['', 'Classic programming', 'Machine learning'], [['You provide', 'input + rules', 'inputs + correct outputs'], ['You get', 'outputs', 'rules (the "model")'], ['Changes when', 'a human edits code', 'new data arrives']]),
            D.note('cs', 'In C# you would write `if (subject.Contains("FREE"))`. In ML you write one generic training program, and the "if" conditions become numbers (weights) that training finds for you.')),
          D.page('A model is a function with knobs',
            D.p('Strip away the hype and a model is just a **function**: it takes an input and returns a prediction. What makes it special is that the function has **adjustable numbers inside it**, called **parameters** (or weights). Turning those knobs changes what the function does.'),
            D.p('Think of a very simple house price model: price = w x size + b. The input is the size of the house. The two knobs are w (how many extra currency units each square metre adds) and b (a base price). With w = 3 and b = 20 a 50 m2 house is predicted at 3 x 50 + 20 = 170. With different knobs, the same formula gives different predictions.'),
            D.formula('@hat{y} = f(x; @theta)', [['x', 'the input (for example the house size)'], ['@theta', 'all parameters of the model (weights and biases)'], ['@hat{y}', 'the prediction, read "y hat"'], ['f', 'the model: the fixed shape of the function']]),
            D.note('tip', 'The *shape* of the function (a line, a curve, a deep network) is chosen by you. The *numbers* inside it are chosen by training.')),
          D.page('How wrong is the model? The loss',
            D.p('To turn knobs in a sensible direction, the computer needs a single number that says **how bad the current predictions are**. That number is the **loss** (also called cost or error). Small loss means good model, zero means perfect.'),
            D.p('The most common recipe for a single prediction is the squared error. Take the prediction, subtract the true answer (the **label** y), and square the result. Squaring does two useful things: it removes the sign (being 5 too high is as bad as 5 too low) and it punishes big mistakes much more than small ones (an error of 10 costs 100, an error of 1 costs 1).'),
            D.steps(['Predict', 'Run the input through the model to get @hat{y}.'], ['Compare', 'Subtract the true label: error = @hat{y} - y.'], ['Square', 'loss = (@hat{y} - y)^2, always zero or positive.'], ['Average', 'Over a whole dataset, average the losses of all examples.']),
            D.formula('L = @f{1}{N} @sum_{i=1}^{N} (@hat{y}_i - y_i)^2', [['N', 'number of training examples'], ['@hat{y}_i', 'prediction for example i'], ['y_i', 'true label of example i']])),
          D.page('The training loop',
            D.p('Training is a loop that repeats thousands or millions of times. Each lap makes the model a tiny bit less wrong. You do not need the mathematics of step 3 yet, it is the topic of the Gradient descent lesson. For now, keep the shape of the loop in your head, because every model in this app, from a line to a Transformer, trains this way.'),
            D.diagram('loop', 'Every training lap: predict, measure, find a direction, nudge the weights.'),
            D.steps(['Start with random knobs', 'The first predictions are nonsense, and that is fine.'], ['Predict', 'Feed a batch of examples through the model.'], ['Measure the loss', 'Compare predictions with the labels and average the error.'], ['Find the direction', 'Work out how each knob would change the loss (the gradient).'], ['Nudge the knobs', 'Move every parameter a small step in the direction that lowers the loss.'], ['Repeat', 'Until the loss stops improving.'])),
          D.page('Three families of learning',
            D.p('Not every problem comes with labels. The type of data you have decides the family of method.'),
            D.table(['Family', 'What you have', 'Example task'], [['Supervised', 'inputs with correct labels', 'photo to "cat" or "dog"; house size to price'], ['Unsupervised', 'inputs only, no labels', 'group customers with similar behaviour'], ['Reinforcement', 'an agent acting, with rewards', 'a program learning to play a game']]),
            D.p('Supervised learning splits further. **Regression** predicts a number (a price, a temperature). **Classification** predicts a category (spam or not, which digit). Large language models are trained with a trick: the "label" is simply the next word of the text, so the data labels itself.'),
            D.note('warn', 'ML does not understand things the way you do. It finds statistical patterns in the data it was shown. If the data is biased or too small, so is the model.')),
          D.page('Everything so far in code',
            D.p('Only now the code, because you already know what each line means. A model with two knobs and a loss function, side by side in C# and Python.'),
            D.cmp(
              'double Predict(double w, double b, double x)\n{\n    return w * x + b;\n}\n\ndouble SquaredError(double pred, double y)\n{\n    double e = pred - y;\n    return e * e;\n}',
              'def predict(w, b, x):\n    return w * x + b\n\ndef squared_error(pred, y):\n    e = pred - y\n    return e * e'),
            D.note('cs', 'Nothing exotic. Python drops braces, semicolons and type declarations, but a function is still a function. The ML libraries (NumPy, PyTorch) add speed by doing this on whole arrays at once.'))
        ],
        practice: [
          D.mc('In classic programming you write the rules. What do you provide in machine learning?', ['Only the input data', 'Inputs together with their correct outputs', 'A list of if/else statements', 'The final predictions'], 1, 'ML takes examples of inputs and correct outputs and produces the rules (the model).'),
          D.match('Match each term with its meaning.', [['Parameter', 'a number inside the model that training adjusts'], ['Label', 'the correct answer for an example'], ['Loss', 'one number measuring how wrong predictions are'], ['Prediction', 'what the model outputs for an input']]),
          D.order('Put one lap of the training loop in order.', ['Predict with the current weights', 'Measure the loss', 'Find which direction lowers the loss', 'Nudge the weights a small step'], 'Predict, measure, find direction, update. Then repeat.'),
          D.mc('Fill the gap: the numbers that training adjusts are called ___.', ['labels', 'parameters', 'losses', 'features'], 1, 'Parameters (weights and biases) are the knobs. Labels are the correct answers.'),
          D.multi('Which of these are supervised learning tasks?', ['Predicting house prices from past sales with prices', 'Grouping news articles by topic with no topic labels', 'Classifying emails as spam using labelled examples', 'Learning to play a game purely from rewards'], [0, 2], 'Supervised needs labelled examples. Grouping without labels is unsupervised, and rewards-only is reinforcement learning.'),
          D.num('A model predicts 7 for an example whose true label is 10. What is the squared error?', [['prediction', '7'], ['label', '10']], 9, ['error = prediction - label = 7 - 10 = -3', 'squared error = (-3)^2 = 9'], { verify: '(7-10)**2' })
        ],
        code: [
          {
            title: 'Write predict', fn: 'predict',
            task: [D.p('Implement the model from the lesson. `predict(w, b, x)` must return `w * x + b`.'), D.note('cs', 'Same as the C# method `double Predict(double w, double b, double x)`. In JavaScript a function is `function name(args) { ... }` and there are no type declarations.')],
            starter: 'function predict(w, b, x) {\n  // return the model output\n}\n',
            tests: [{ args: [2, 1, 4], expect: 9 }, { args: [0.5, 0, 10], expect: 5 }, { args: [-1, 3, 2], expect: 1 }, { args: [3, 20, 50], expect: 170, hidden: true }],
            hints: ['The whole body is one line starting with return.', 'return w * x + b;'],
            solution: 'function predict(w, b, x) {\n  return w * x + b;\n}\n',
            explain: 'That is the entire model. Training will only ever change w and b.'
          },
          {
            title: 'Mean squared error', fn: 'mse',
            task: [D.p('Write `mse(preds, targets)`. It takes two arrays of equal length and returns the average of `(pred - target)^2`.'), D.p('Plan in words first: go through the examples one by one, add up the squared errors, divide by how many there are.')],
            starter: 'function mse(preds, targets) {\n  let total = 0;\n  // loop over the examples and add squared errors\n  return total / preds.length;\n}\n',
            tests: [{ args: [[3, 5, 8], [2, 5, 10]], expect: 1.6667 , tol: 0.001 }, { args: [[1, 2], [1, 2]], expect: 0 }, { args: [[0, 0, 0, 0], [1, 1, 1, 1]], expect: 1 }, { args: [[10], [7]], expect: 9, hidden: true }],
            hints: ['Use a for loop over i from 0 to preds.length - 1.', 'Inside the loop: const e = preds[i] - targets[i]; total += e * e;'],
            solution: 'function mse(preds, targets) {\n  let total = 0;\n  for (let i = 0; i < preds.length; i++) {\n    const e = preds[i] - targets[i];\n    total += e * e;\n  }\n  return total / preds.length;\n}\n',
            explain: 'This single number is what the training loop tries to push towards zero.'
          }
        ],
        quiz: [
          D.mc('Why do we square the error instead of just using prediction - label?', ['To make training slower', 'So errors of opposite sign do not cancel and big errors weigh more', 'Because computers cannot subtract', 'To keep the labels positive'], 1, 'Without squaring, +5 and -5 would cancel to 0 and the model would look perfect when it is not.'),
          D.mc('What does the training loop change?', ['The input data', 'The parameters of the model', 'The loss function every lap', 'The labels'], 1, 'Only the parameters are updated. Data and loss function stay fixed.'),
          D.num('A model is y-hat = 2x + 1. For x = 4 the true label is 7. Compute the squared error.', [['model', 'y-hat = 2x + 1'], ['x', '4'], ['label y', '7']], 4, ['prediction = 2 x 4 + 1 = 9', 'error = 9 - 7 = 2', 'squared error = 2^2 = 4'], { verify: '(2*4+1-7)**2' }),
          D.multi('Select the true statements about a model.', ['It is a function with adjustable parameters', 'Its parameters are fixed by the programmer by hand', 'Training searches for parameters that give a low loss', 'A loss of 0 on the training data always means the model is perfect everywhere'], [0, 2], 'Parameters are learned. Zero training loss only says the model fits the training set, not new data (you will meet this as overfitting).'),
          D.num('Three predictions are [3, 5, 8] and the true labels are [2, 5, 10]. Calculate the mean squared error.', [['predictions', '3, 5, 8'], ['labels', '2, 5, 10'], ['formula', 'MSE = average of (pred - label)^2']], 1.6667, ['errors: 3-2 = 1, 5-5 = 0, 8-10 = -2', 'squares: 1, 0, 4', 'mean = (1 + 0 + 4) / 3 = 1.67'], { verify: '((3-2)**2+(5-5)**2+(8-10)**2)/3' }),
          D.mc('Predicting tomorrow\'s temperature in degrees is which task?', ['Classification', 'Regression', 'Clustering', 'Reinforcement'], 1, 'The output is a number on a continuous scale, so it is regression.'),
          D.num('A model is y-hat = w1*x1 + w2*x2 + w3*x3 + b. How many parameters does it have?', [['weights', 'w1, w2, w3'], ['bias', 'b']], 4, ['three weights + one bias = 4 parameters'], { verify: '3+1' }),
          D.mc('Which is the best description of "training"?', ['Writing better if/else rules', 'Repeatedly adjusting parameters to reduce the loss', 'Copying the labels into the model', 'Deleting wrong data'], 1, 'Training is loss-driven parameter adjustment.')
        ]
      },

      /* ===================================================== L2 */
      {
        id: 'data', title: 'Data: features, labels, splits', icon: 'chart', minutes: '20-25 min',
        blurb: 'How raw information becomes numbers a model can use, how to scale it, and why you must never test on training data.',
        theory: [
          D.page('A dataset is a table of numbers',
            D.p('A model never sees "a house". It sees a **row of numbers** that describe the house. Each row is one **example** (also called a sample). Each column is a **feature**: one measurable property. One special column, the **label**, is the answer you want to predict.'),
            D.table(['size (m2)', 'rooms', 'age (years)', 'price (label)'], [['50', '2', '30', '170'], ['80', '3', '12', '290'], ['120', '4', '5', '450']]),
            D.p('Mathematically the features of one example form a **vector** x = (size, rooms, age), and the label is a number y. The whole dataset is a list of pairs (x, y).'),
            D.formula('@{D} = {(x_1, y_1), (x_2, y_2), ..., (x_N, y_N)}'.replace('@{D}', 'D'), [['x_i', 'feature vector of example i'], ['y_i', 'label of example i'], ['N', 'number of examples']]),
            D.note('cs', 'In C# think `List<(double[] x, double y)>`. A matrix of features is just `double[N][d]`: N rows, d columns.')),
          D.page('Turning the world into numbers',
            D.p('Models only multiply and add, so everything must become a number. The conversion is called **encoding** and it is half of practical ML.'),
            D.table(['Raw data', 'Typical encoding', 'Example'], [['A number', 'use as it is', 'size = 80'], ['A category', 'one-hot vector', 'red, green, blue becomes [1,0,0], [0,1,0], [0,0,1]'], ['Text', 'tokens turned into ids, then vectors', '"hello world" becomes [15496, 995]'], ['An image', 'grid of pixel brightness values', '28 x 28 pixels becomes 784 numbers'], ['A yes/no', '0 or 1', 'has_garage = 1']]),
            D.p('Why **one-hot** and not red = 1, green = 2, blue = 3? Because the model would think blue is "three times" red and that green sits between them. One-hot gives every category its own independent column, with no fake ordering.'),
            D.steps(['One-hot recipe', 'Count the categories, call it K.'], ['Make a vector of K zeros', 'One slot per category.'], ['Put a 1 in the slot of the category', 'Everything else stays 0.'])),
          D.page('Scaling features',
            D.p('Look at the table again. Size is around 100, rooms around 3. A model that adds up weighted features will be dominated by the big numbers, and training becomes slow and unstable, because one learning rate must suit both scales. The fix is to **put features on a comparable scale**.'),
            D.p('Two standard methods. **Min-max scaling** squeezes a feature into the range 0 to 1. **Standardisation** (z-score) shifts the mean to 0 and the spread to 1, so values say "how many standard deviations from average".'),
            D.formula('x_{minmax} = @f{x - x_{min}}{x_{max} - x_{min}}', [['x_min, x_max', 'smallest and largest value of this feature in the training data']]),
            D.formula('z = @f{x - @mu}{@sigma}', [['@mu', 'mean of the feature'], ['@sigma', 'standard deviation of the feature']]),
            D.p('Worked example for min-max. Sizes are 50 to 120 and we scale x = 80: (80 - 50) / (120 - 50) = 30 / 70 = 0.43. For the z-score of x = 80 with mean 83.3 and std 28.6: (80 - 83.3) / 28.6 = -0.12.'),
            D.note('warn', 'Compute min, max, mean and std from the **training** set only, then reuse those same numbers for validation and test data. Otherwise information from the future leaks into training.')),
          D.page('Train, validation and test',
            D.p('Here is the most important rule in ML evaluation. If you grade a student on the exact questions they practised, a high score proves memory, not understanding. The same holds for models. So we **split** the data before training.'),
            D.diagram('split', 'A common split. Shuffle first, then cut.'),
            D.list('**Train**: the model learns its parameters from these examples.', '**Validation**: you check progress and tune choices (like learning rate) on these. The model never learns directly from them.', '**Test**: touched once at the very end, to report the honest final score.'),
            D.p('If the model scores well on train but badly on validation, it has **overfitted**: it memorised. You will fix that in a later lesson.')),
          D.page('Traps that quietly ruin results',
            D.list('**Data leakage**: a feature that secretly contains the answer, or statistics computed on all data before splitting. Scores look amazing and collapse in real use.', '**Unshuffled data**: if the file is sorted by date or class, a split without shuffling gives validation data that looks nothing like training.', '**Imbalanced classes**: 99 percent non-spam. A model that always says "not spam" scores 99 percent accuracy and is useless. Look at the class counts first.', '**Too little data**: a model with many parameters and few examples will memorise.'),
            D.note('tip', 'Before any modelling, print the first rows, the shape, the ranges and the class counts. Most ML bugs are data bugs.'))
        ],
        practice: [
          D.mc('In a table of houses, which column is the label if we want to predict price?', ['size', 'rooms', 'price', 'age'], 2, 'The label is the quantity you want to predict.'),
          D.match('Match each raw data type with a common encoding.', [['Category (red/green/blue)', 'one-hot vector'], ['Grayscale image', 'grid of pixel values'], ['Yes/no flag', '0 or 1'], ['Number', 'use directly or scale it']]),
          D.order('Order a sensible data preparation workflow.', ['Inspect the data (shape, ranges, class counts)', 'Shuffle and split into train, validation, test', 'Compute scaling statistics on the training set', 'Apply the same scaling to all three splits'], 'Split first, then compute statistics on train only, then apply everywhere.'),
          D.multi('Which of these are examples of data leakage?', ['Scaling with the mean of the entire dataset before splitting', 'A feature "refund issued" when predicting if an order will be returned', 'Using a shuffled train/test split', 'Standardising with training-set statistics only'], [0, 1], 'Leakage means information from outside the training data (or from the answer) sneaks in.'),
          D.num('Min-max scale x = 30 when the training minimum is 10 and the maximum is 50.', [['x', '30'], ['min', '10'], ['max', '50']], 0.5, ['(x - min) / (max - min) = (30 - 10) / (50 - 10)', '= 20 / 40 = 0.5'], { verify: '(30-10)/(50-10)' }),
          D.mc('Why is "red = 1, green = 2, blue = 3" a bad encoding for a linear model?', ['It uses too much memory', 'It invents an order and distances between categories', 'Numbers cannot represent colours', 'It makes labels negative'], 1, 'One-hot avoids fake ordering.')
        ],
        code: [
          {
            title: 'Min-max scaling', fn: 'minMaxScale',
            task: [D.p('Write `minMaxScale(values)` that returns a new array where each value is scaled to the range 0 to 1 with `(x - min) / (max - min)`.'), D.p('Assume the array has at least two different values.')],
            starter: 'function minMaxScale(values) {\n  const min = Math.min(...values);\n  const max = Math.max(...values);\n  // return a new array of scaled values\n}\n',
            tests: [{ args: [[10, 20, 30]], expect: [0, 0.5, 1] }, { args: [[5, 15]], expect: [0, 1] }, { args: [[50, 80, 120]], expect: [0, 0.4286, 1], tol: 0.001 }, { args: [[-1, 0, 1]], expect: [0, 0.5, 1], hidden: true }],
            hints: ['Array.map turns every element into a new one, like LINQ Select in C#.', 'return values.map(x => (x - min) / (max - min));'],
            solution: 'function minMaxScale(values) {\n  const min = Math.min(...values);\n  const max = Math.max(...values);\n  return values.map(x => (x - min) / (max - min));\n}\n',
            explain: 'values.map(...) is the JavaScript twin of LINQ\'s Select. Remember: in real projects min and max come from the training split only.'
          },
          {
            title: 'One-hot encoding', fn: 'oneHot',
            task: [D.p('Write `oneHot(index, size)` returning an array of `size` zeros with a 1 at position `index`.')],
            starter: 'function oneHot(index, size) {\n  \n}\n',
            tests: [{ args: [0, 3], expect: [1, 0, 0] }, { args: [2, 4], expect: [0, 0, 1, 0] }, { args: [1, 2], expect: [0, 1] }, { args: [4, 5], expect: [0, 0, 0, 0, 1], hidden: true }],
            hints: ['Array(size).fill(0) creates the zeros.', 'const v = Array(size).fill(0); v[index] = 1; return v;'],
            solution: 'function oneHot(index, size) {\n  const v = Array(size).fill(0);\n  v[index] = 1;\n  return v;\n}\n',
            explain: 'Exactly the three-step recipe from the theory.'
          }
        ],
        quiz: [
          D.mc('Which split should be used only once, at the very end?', ['Train', 'Validation', 'Test', 'All of them'], 2, 'The test set gives the honest final estimate. Using it repeatedly to tune decisions would leak information.'),
          D.num('Standardise x = 70 using mean 60 and standard deviation 5. Calculate the z-score.', [['x', '70'], ['mean', '60'], ['std', '5']], 2, ['z = (x - mean) / std', 'z = (70 - 60) / 5 = 2'], { verify: '(70-60)/5' }),
          D.num('Min-max scale x = 11 when the training minimum is 4 and the maximum is 25.', [['x', '11'], ['min', '4'], ['max', '25']], 0.3333, ['(11 - 4) / (25 - 4)', '= 7 / 21 = 0.33'], { verify: '(11-4)/(25-4)' }),
          D.num('The training values are [4, 8, 6, 10]. Calculate the (population) standard deviation.', [['values', '4, 8, 6, 10'], ['formula', 'std = sqrt( average of (x - mean)^2 )']], 2.2361, ['mean = (4 + 8 + 6 + 10) / 4 = 7', 'deviations: -3, 1, -1, 3', 'squares: 9, 1, 1, 9, average = 20 / 4 = 5', 'std = sqrt(5) = 2.24'], { verify: 'Math.sqrt(((4-7)**2+(8-7)**2+(6-7)**2+(10-7)**2)/4)' }),
          D.num('You have 1000 examples and split them 70 / 15 / 15. How many examples go into the validation set?', [['total', '1000'], ['validation share', '15 percent']], 150, ['1000 x 0.15 = 150'], { verify: '1000*0.15' }),
          D.mc('A fraud dataset has 99.5 percent normal transactions. A model that always predicts "normal" gets what accuracy?', ['About 50 percent', 'About 99.5 percent', 'About 0.5 percent', 'It cannot be computed'], 1, 'Accuracy hides imbalance. That is why you inspect class counts and use other metrics.'),
          D.multi('Select the good practices.', ['Shuffle before splitting (unless time order matters)', 'Fit the scaler on train, apply to val and test', 'Tune hyperparameters on the test set', 'Inspect class counts before training'], [0, 1, 3], 'Tuning on the test set turns it into a second validation set and the final score becomes optimistic.'),
          D.mc('Which one-hot vector encodes the 3rd of 4 categories?', ['[0, 0, 1, 0]', '[0, 1, 0, 0]', '[0, 0, 0, 1]', '[3, 0, 0, 0]'], 0, 'Position 3 (counting from 1) holds the 1.', { noShuffle: false })
        ]
      },

      /* ===================================================== L3 */
      {
        id: 'linreg', title: 'Your first model: a line', icon: 'slope', minutes: '25-30 min',
        blurb: 'Fit a straight line to data, measure it with MSE, and compute the best line by hand.',
        theory: [
          D.page('Draw the best line through the dots',
            D.p('You have measurements of house size and price. They are not perfectly on a line, but they clearly trend upward. **Linear regression** asks: which straight line passes closest to all the points?'),
            D.p('Try it. Drag the sliders to move the line. The red dashed segments are the **errors** (residuals) between the line and each point. The readout shows the mean squared error. Your goal is to make it as small as you can, which is exactly what training automates.'),
            D.plot({ title: 'Move the line, watch the error', xr: [0, 6], yr: [0, 12], points: [[1, 2.3], [2, 3.1], [3, 5.2], [4, 6.8], [5, 8.1]], residuals: true, fns: [{ f: 'p.w*x+p.b', label: 'prediction line' }], params: [{ n: 'w', label: 'slope w', min: -1, max: 3, step: 0.05, v: 0.5 }, { n: 'b', label: 'intercept b', min: -3, max: 6, step: 0.05, v: 4 }], readout: [{ label: 'MSE', f: 'pts.reduce((s,q)=>s+(p.w*q[0]+p.b-q[1])**2,0)/pts.length', digits: 3 }] }),
            D.note('tip', 'You will find a slope near 1.5 and an intercept near 0.6 that makes the error tiny. A computer finds that by method instead of by eye.')),
          D.page('The line has two meaningful knobs',
            D.formula('@hat{y} = w x + b', [['w', 'slope: how much the prediction grows when x grows by 1'], ['b', 'intercept (bias): the prediction when x = 0'], ['x', 'input feature'], ['@hat{y}', 'predicted output']]),
            D.p('If w = 1.5 and b = 0.6 then a house of size 4 is predicted at 1.5 x 4 + 0.6 = 6.6. A positive w means "bigger input, bigger output", a negative w means the opposite, and w = 0 means the input does not matter and the model always answers b.'),
            D.p('The bias exists so the line does not have to pass through the origin. Without it a house of size 0 would be forced to cost 0.')),
          D.page('Scoring a line: residuals and MSE',
            D.p('For each point, the **residual** is prediction minus truth. The loss from lesson 1 averages their squares. Follow the recipe on a small example: model y-hat = 2x, points (1, 3), (2, 3), (3, 8).'),
            D.steps(['Predictions', 'x = 1, 2, 3 gives y-hat = 2, 4, 6.'], ['Residuals', '2 - 3 = -1, 4 - 3 = 1, 6 - 8 = -2.'], ['Squares', '1, 1, 4.'], ['Mean', '(1 + 1 + 4) / 3 = 2.'] ),
            D.formula('MSE(w, b) = @f{1}{N} @sum_{i=1}^{N} (w x_i + b - y_i)^2', [['w, b', 'the only unknowns; the data (x_i, y_i) is fixed']]),
            D.p('Notice: once the data is fixed, MSE is a function of just **two numbers**, w and b. Finding the best line means finding the (w, b) with the smallest MSE.')),
          D.page('More features: a weighted sum',
            D.p('Real problems have many inputs. Price depends on size, rooms and age. The idea stays the same, each feature gets its own weight and we add everything up plus the bias.'),
            D.formula('@hat{y} = w_1 x_1 + w_2 x_2 + ... + w_d x_d + b = w @cdot x + b', [['w', 'vector of weights, one per feature'], ['w @cdot x', 'dot product: multiply pairwise, then add (next unit)']]),
            D.p('Each weight is readable: it says how much one extra unit of that feature changes the prediction while the others stay the same. That interpretability is why linear models are still widely used.')),
          D.page('Computing the best line directly',
            D.p('For one feature there is a formula that gives the line with minimal MSE in one shot. It comes from asking where the error surface stops sloping (derivative equals zero, you will see why in the Derivatives lesson). The recipe has an intuitive reading: the slope is **how x and y move together, divided by how much x moves by itself**.'),
            D.steps(['Means', 'Compute $@bar{x}$ (average of x) and $@bar{y}$ (average of y).'], ['Co-movement', '$S_{xy}$ = sum of (x - $@bar{x}$)(y - $@bar{y}$).'], ['Spread of x', '$S_{xx}$ = sum of (x - $@bar{x}$)^2.'], ['Slope', 'w = $S_{xy}$ / $S_{xx}$.'], ['Intercept', 'b = $@bar{y}$ - w x $@bar{x}$ (so the line passes through the mean point).']),
            D.formula(['w = @f{@sum (x_i - @bar{x})(y_i - @bar{y})}{@sum (x_i - @bar{x})^2}', 'b = @bar{y} - w @bar{x}'], [['@bar{x}, @bar{y}', 'averages of x and y']]),
            D.p('Example with x = [0, 1, 2, 3] and y = [1, 3, 2, 5]. Means: 1.5 and 2.75. $S_{xy}$ = (-1.5)(-1.75) + (-0.5)(0.25) + (0.5)(-0.75) + (1.5)(2.25) = 5.5. $S_{xx}$ = 2.25 + 0.25 + 0.25 + 2.25 = 5. So w = 1.1 and b = 2.75 - 1.1 x 1.5 = 1.1.')),
          D.page('Where a line fails',
            D.list('**Curved data**: a line cannot bend. A parabola of points will always have a large error. Fix: add features like x squared, or use a neural network.', '**Outliers**: because errors are squared, a single wild point drags the line towards itself.', '**Many features**: the direct formula needs matrix algebra and gets expensive. Large models are trained by gradient descent instead, the method you meet in Unit 3.'),
            D.note('info', 'Even a giant neural network is, at its core, many weighted sums stacked with simple non-linear steps in between. The line is the atom of deep learning.'))
        ],
        practice: [
          D.mc('In y-hat = w x + b, what does the bias b represent?', ['The slope', 'The prediction when x = 0', 'The error', 'The number of examples'], 1, 'At x = 0 the first term vanishes and only b remains.'),
          D.num('A trained model is y-hat = 3x + 2. What does it predict for x = 5?', [['w', '3'], ['b', '2'], ['x', '5']], 17, ['y-hat = 3 x 5 + 2', '= 15 + 2 = 17'], { verify: '3*5+2' }),
          D.mc('A fitted line has w = -0.8. What does that tell you?', ['The model is broken', 'Larger x tends to give smaller predictions', 'The data has no pattern', 'The bias is negative'], 1, 'The sign of w gives the direction of the relationship.'),
          D.order('Order the steps for the direct best-line formula.', ['Compute the means of x and y', 'Compute $S_{xy}$ and $S_{xx}$', 'Slope w = $S_{xy}$ / $S_{xx}$', 'Intercept b = $@bar{y}$ - w $@bar{x}$'], 'The intercept needs w, so it comes last.'),
          D.multi('Which statements about MSE are true?', ['It is always zero or positive', 'It treats a +2 and a -2 error the same', 'One huge outlier can dominate it', 'It is minimised by making w as large as possible'], [0, 1, 2], 'MSE is minimised at the best fit, not by making w large.'),
          D.mc('Why is a straight line a poor model for points on a U-shaped curve?', ['Lines cannot have a bias', 'A line cannot bend to follow the curve', 'MSE cannot be computed', 'The data is not numeric'], 1, 'Model shape limits what can be fitted.')
        ],
        code: [
          {
            title: 'Mean squared error of a line', fn: 'lineMse',
            task: [D.p('Write `lineMse(w, b, xs, ys)`. For every point compute the prediction `w * x + b`, take the squared difference with `y`, and return the average over all points.')],
            starter: 'function lineMse(w, b, xs, ys) {\n  \n}\n',
            tests: [{ args: [2, 0, [1, 2, 3], [3, 3, 8]], expect: 2 }, { args: [1, 0, [1, 2], [1, 2]], expect: 0 }, { args: [0, 1, [0, 5], [1, 3]], expect: 2 }, { args: [1.5, 0.6, [1, 2, 3, 4, 5], [2.3, 3.1, 5.2, 6.8, 8.1]], expect: 0.068, tol: 0.001, hidden: true }],
            hints: ['Loop over i, compute const pred = w * xs[i] + b;', 'Accumulate (pred - ys[i]) * (pred - ys[i]) and divide by xs.length at the end.'],
            solution: 'function lineMse(w, b, xs, ys) {\n  let total = 0;\n  for (let i = 0; i < xs.length; i++) {\n    const e = w * xs[i] + b - ys[i];\n    total += e * e;\n  }\n  return total / xs.length;\n}\n',
            explain: 'This is the function the sliders in the widget evaluated. Gradient descent will walk w and b downhill on it.'
          },
          {
            title: 'Fit the best line', fn: 'fitLine',
            task: [D.p('Implement the direct formula. `fitLine(xs, ys)` returns `[w, b]`.'), D.steps(['Means', 'xBar and yBar.'], ['Sums', 'sxy = sum (x - xBar)(y - yBar), sxx = sum (x - xBar)^2.'], ['Result', 'w = sxy / sxx, b = yBar - w * xBar.'])],
            starter: 'function fitLine(xs, ys) {\n  const n = xs.length;\n  const xBar = xs.reduce((a, c) => a + c, 0) / n;\n  const yBar = ys.reduce((a, c) => a + c, 0) / n;\n  let sxy = 0, sxx = 0;\n  // fill sxy and sxx\n  const w = 0; // replace\n  const b = 0; // replace\n  return [w, b];\n}\n',
            tests: [{ args: [[1, 2, 3], [2, 4, 6]], expect: [2, 0] }, { args: [[1, 2, 3, 4], [3, 5, 7, 9]], expect: [2, 1] }, { args: [[0, 1, 2, 3], [1, 3, 2, 5]], expect: [1.1, 1.1] }, { args: [[1, 2, 3], [2, 4, 5]], expect: [1.5, 0.6667], tol: 0.001, hidden: true }],
            hints: ['Loop with for (let i = 0; i < n; i++) and use dx = xs[i] - xBar, dy = ys[i] - yBar.', 'sxy += dx * dy; sxx += dx * dx; then w = sxy / sxx; b = yBar - w * xBar.'],
            solution: 'function fitLine(xs, ys) {\n  const n = xs.length;\n  const xBar = xs.reduce((a, c) => a + c, 0) / n;\n  const yBar = ys.reduce((a, c) => a + c, 0) / n;\n  let sxy = 0, sxx = 0;\n  for (let i = 0; i < n; i++) {\n    const dx = xs[i] - xBar, dy = ys[i] - yBar;\n    sxy += dx * dy;\n    sxx += dx * dx;\n  }\n  const w = sxy / sxx;\n  const b = yBar - w * xBar;\n  return [w, b];\n}\n',
            explain: 'You just wrote the oldest machine learning algorithm from scratch. The ML lessons that follow replace this closed form with iterative learning that scales to millions of parameters.'
          }
        ],
        quiz: [
          D.mc('A model has the weights w = [2, -1] and bias 3. It sees x = [1, 4]. Which expression gives the output?', ['2 x 1 + (-1) x 4 + 3', '2 + 1 + (-1) + 4 + 3', '(2 x 1) x (-1 x 4) x 3', '2 x 4 + (-1) x 1 + 3'], 0, 'Multiply feature by its own weight, add everything, add the bias.'),
          D.num('The model is y-hat = 3x + 2. Predict the output for x = 5.', [['w', '3'], ['b', '2'], ['x', '5']], 17, ['3 x 5 = 15', '15 + 2 = 17'], { verify: '3*5+2' }),
          D.num('The model is y-hat = 2x. Data: (1, 3), (2, 3), (3, 8). Calculate the MSE.', [['model', 'y-hat = 2x'], ['points', '(1, 3), (2, 3), (3, 8)']], 2, ['predictions: 2, 4, 6', 'residuals: -1, 1, -2', 'squares: 1, 1, 4', 'MSE = 6 / 3 = 2'], { verify: '((2-3)**2+(4-3)**2+(6-8)**2)/3' }),
          D.num('Points: (1, 2), (2, 4), (3, 5). Using the direct formula, calculate the slope w.', [['$@bar{x}$', '2'], ['$@bar{y}$', '11/3 = 3.667'], ['formula', 'w = $S_{xy}$ / $S_{xx}$']], 1.5, ['$S_{xy}$ = (-1)(2 - 3.667) + 0 + (1)(5 - 3.667) = 1.667 + 1.333 = 3', '$S_{xx}$ = 1 + 0 + 1 = 2', 'w = 3 / 2 = 1.5'], { verify: '(( -1)*(2-11/3)+0*(4-11/3)+(1)*(5-11/3))/2' }),
          D.num('Same points: (1, 2), (2, 4), (3, 5), with w = 1.5. Calculate the intercept b.', [['w', '1.5'], ['$@bar{x}$', '2'], ['$@bar{y}$', '3.6667']], 0.6667, ['b = $@bar{y}$ - w x $@bar{x}$', 'b = 3.667 - 1.5 x 2 = 0.667'], { verify: '11/3-1.5*2' }),
          D.mc('One extreme outlier is added to the data. What happens to the least-squares line?', ['Nothing', 'It is pulled towards the outlier', 'It becomes vertical always', 'MSE becomes negative'], 1, 'Squared errors give large residuals a huge weight.'),
          D.multi('Which changes can make a linear model fit curved data better?', ['Add a feature x squared', 'Use a model with non-linear layers', 'Lower the number of data points', 'Remove all features'], [0, 1], 'Adding non-linear features or non-linear layers is how models bend.'),
          D.mc('For a line, which pair of numbers is the entire set of parameters?', ['x and y', 'w and b', 'MSE and N', '$@bar{x}$ and $@bar{y}$'], 1, 'The data is fixed, the knobs are w and b.')
        ]
      }
    ]
  });
})();
