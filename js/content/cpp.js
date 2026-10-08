/* C++ versions of the coding tasks. The browser runs them with JSCPP (a C++ interpreter), which has
   no <vector> or <string>, so every task uses plain arrays (a pointer plus a length, as in classic C++).
   Fields:
     args  kinds of the JS test arguments: d double, i int, c char (first letter of a string), v array, m matrix (row-major)
     pass  C++ call arguments. Names: x<i> scalar, a<i> array, n<i> array length, r<i>/c<i> matrix rows/cols
     ret   d double, i int, v array or m matrix (the function then fills a trailing `double out[]`) */
(function () {
  const ML = window.ML;
  ML.cpp = ML.cpp || {};
  const C = (key, spec) => { ML.cpp[key] = spec; };

  C('what-is-ml/predict', {
    sig: 'double predict(double w, double b, double x)', args: 'ddd', pass: 'x0, x1, x2', ret: 'd',
    starter: `double predict(double w, double b, double x) {
    // return the model output
}
`,
    hints: ['One line starting with return.', 'return w * x + b;'],
    solution: `double predict(double w, double b, double x) {
    return w * x + b;
}
`
  });

  C('what-is-ml/mse', {
    sig: 'double mse(double preds[], double targets[], int n)', args: 'vv', pass: 'a0, a1, n0', ret: 'd',
    starter: `double mse(double preds[], double targets[], int n) {
    double total = 0;
    // loop over the n examples and add squared errors
    return total / n;
}
`,
    hints: ['A for loop: for (int i = 0; i < n; i++).', 'Inside: double e = preds[i] - targets[i]; total += e * e;'],
    solution: `double mse(double preds[], double targets[], int n) {
    double total = 0;
    for (int i = 0; i < n; i++) {
        double e = preds[i] - targets[i];
        total += e * e;
    }
    return total / n;
}
`
  });

  C('data/minMaxScale', {
    sig: 'void minMaxScale(double values[], int n, double out[])', args: 'v', pass: 'a0, n0', ret: 'v',
    starter: `// Write the scaled values into out[0..n-1]. The function returns nothing.
void minMaxScale(double values[], int n, double out[]) {
    // 1. find the minimum and the maximum
    // 2. out[i] = (values[i] - min) / (max - min)
}
`,
    hints: ['Start with min = values[0] and max = values[0], then loop over the rest.', 'if (values[i] < mn) mn = values[i]; if (values[i] > mx) mx = values[i];'],
    solution: `void minMaxScale(double values[], int n, double out[]) {
    double mn = values[0], mx = values[0];
    for (int i = 1; i < n; i++) {
        if (values[i] < mn) mn = values[i];
        if (values[i] > mx) mx = values[i];
    }
    for (int i = 0; i < n; i++) out[i] = (values[i] - mn) / (mx - mn);
}
`
  });

  C('data/oneHot', {
    sig: 'void oneHot(int index, int size, double out[])', args: 'ii', pass: 'x0, x1', ret: 'v',
    starter: `// Fill out[0..size-1]: zeros everywhere, 1 at position index.
void oneHot(int index, int size, double out[]) {

}
`,
    hints: ['Set every slot to 0 first with a loop.', 'for (int i = 0; i < size; i++) out[i] = 0; out[index] = 1;'],
    solution: `void oneHot(int index, int size, double out[]) {
    for (int i = 0; i < size; i++) out[i] = 0;
    out[index] = 1;
}
`
  });

  C('linreg/lineMse', {
    sig: 'double lineMse(double w, double b, double xs[], double ys[], int n)', args: 'ddvv', pass: 'x0, x1, a2, a3, n2', ret: 'd',
    starter: `double lineMse(double w, double b, double xs[], double ys[], int n) {
    double total = 0;
    // for every example: prediction = w * xs[i] + b, add the squared error
    return total / n;
}
`,
    hints: ['The prediction for example i is w * xs[i] + b.', 'double e = w * xs[i] + b - ys[i]; total += e * e;'],
    solution: `double lineMse(double w, double b, double xs[], double ys[], int n) {
    double total = 0;
    for (int i = 0; i < n; i++) {
        double e = w * xs[i] + b - ys[i];
        total += e * e;
    }
    return total / n;
}
`
  });

  C('linreg/fitLine', {
    sig: 'void fitLine(double xs[], double ys[], int n, double out[])', args: 'vv', pass: 'a0, a1, n0', ret: 'v',
    starter: `// Store the slope in out[0] and the intercept in out[1].
void fitLine(double xs[], double ys[], int n, double out[]) {
    // 1. means xBar and yBar
    // 2. sxy = sum of (x - xBar)(y - yBar), sxx = sum of (x - xBar)^2
    // 3. w = sxy / sxx, b = yBar - w * xBar
}
`,
    hints: ['Compute both means with one loop before the main loop.', 'w = sxy / sxx; b = yBar - w * xBar; out[0] = w; out[1] = b;'],
    solution: `void fitLine(double xs[], double ys[], int n, double out[]) {
    double xBar = 0, yBar = 0;
    for (int i = 0; i < n; i++) { xBar += xs[i]; yBar += ys[i]; }
    xBar /= n; yBar /= n;
    double sxy = 0, sxx = 0;
    for (int i = 0; i < n; i++) {
        double dx = xs[i] - xBar, dy = ys[i] - yBar;
        sxy += dx * dy;
        sxx += dx * dx;
    }
    double w = sxy / sxx;
    out[0] = w;
    out[1] = yBar - w * xBar;
}
`
  });

  C('vectors/dot', {
    sig: 'double dot(double a[], double b[], int n)', args: 'vv', pass: 'a0, a1, n0', ret: 'd',
    starter: `double dot(double a[], double b[], int n) {
    double sum = 0;
    // multiply matching entries and add them up
    return sum;
}
`,
    hints: ['One loop over i from 0 to n - 1.', 'sum += a[i] * b[i];'],
    solution: `double dot(double a[], double b[], int n) {
    double sum = 0;
    for (int i = 0; i < n; i++) sum += a[i] * b[i];
    return sum;
}
`
  });

  C('vectors/norm', {
    sig: 'double norm(double a[], int n)', args: 'v', pass: 'a0, n0', ret: 'd',
    starter: `double norm(double a[], int n) {
    // length of the vector: square root of the sum of squares
}
`,
    hints: ['The norm is the dot product of a with itself, then a square root.', 'sqrt(s) comes from <cmath>, which is already included.'],
    solution: `double norm(double a[], int n) {
    double s = 0;
    for (int i = 0; i < n; i++) s += a[i] * a[i];
    return sqrt(s);
}
`
  });

  C('matrices/matVec', {
    sig: 'void matVec(double M[], int rows, int cols, double v[], double out[])', args: 'mv', pass: 'a0, r0, c0, a1', ret: 'v',
    starter: `// M is stored row by row: entry (i, j) is M[i * cols + j].
void matVec(double M[], int rows, int cols, double v[], double out[]) {
    // out[i] = dot product of row i with v
}
`,
    hints: ['Outer loop over rows, inner loop over columns.', 'M[i * cols + j] is the entry in row i, column j.'],
    solution: `void matVec(double M[], int rows, int cols, double v[], double out[]) {
    for (int i = 0; i < rows; i++) {
        double s = 0;
        for (int j = 0; j < cols; j++) s += M[i * cols + j] * v[j];
        out[i] = s;
    }
}
`
  });

  C('matrices/matMul', {
    sig: 'void matMul(double A[], double B[], int m, int n, int p, double out[])', args: 'mm', pass: 'a0, a1, r0, c0, c1', ret: 'm',
    starter: `// A is m x n, B is n x p, both row-major. Fill out (m x p, row-major).
void matMul(double A[], double B[], int m, int n, int p, double out[]) {

}
`,
    hints: ['Three nested loops: i over m, j over p, k over n.', 'out[i * p + j] += A[i * n + k] * B[k * p + j]; (start out[i * p + j] at 0)'],
    solution: `void matMul(double A[], double B[], int m, int n, int p, double out[]) {
    for (int i = 0; i < m; i++)
        for (int j = 0; j < p; j++) {
            double s = 0;
            for (int k = 0; k < n; k++) s += A[i * n + k] * B[k * p + j];
            out[i * p + j] = s;
        }
}
`
  });

  C('derivatives/slope', {
    sig: 'double slope(double x, double h)', args: 'dd', pass: 'x0, x1', ret: 'd',
    starter: `double f(double x) {
    return x * x;
}

double slope(double x, double h) {
    // central difference of f at x
}
`,
    hints: ['Look to the left and to the right of x by h.', 'return (f(x + h) - f(x - h)) / (2 * h);'],
    solution: `double f(double x) {
    return x * x;
}

double slope(double x, double h) {
    return (f(x + h) - f(x - h)) / (2 * h);
}
`
  });

  C('derivatives/numGrad', {
    sig: 'void numGrad(double w1, double w2, double out[])', args: 'dd', pass: 'x0, x1', ret: 'v',
    starter: `double f(double w1, double w2) {
    return w1 * w1 + w1 * w2;
}

// out[0] = df/dw1, out[1] = df/dw2
void numGrad(double w1, double w2, double out[]) {
    double h = 1e-5;
}
`,
    hints: ['Nudge only one variable at a time and keep the other fixed.', 'out[0] = (f(w1 + h, w2) - f(w1 - h, w2)) / (2 * h);'],
    solution: `double f(double w1, double w2) {
    return w1 * w1 + w1 * w2;
}

void numGrad(double w1, double w2, double out[]) {
    double h = 1e-5;
    out[0] = (f(w1 + h, w2) - f(w1 - h, w2)) / (2 * h);
    out[1] = (f(w1, w2 + h) - f(w1, w2 - h)) / (2 * h);
}
`
  });

  C('probability/expectedValue', {
    sig: 'double expectedValue(double values[], double probs[], int n)', args: 'vv', pass: 'a0, a1, n0', ret: 'd',
    starter: `double expectedValue(double values[], double probs[], int n) {

}
`,
    hints: ['Each value counts as much as its probability.', 'e += values[i] * probs[i];'],
    solution: `double expectedValue(double values[], double probs[], int n) {
    double e = 0;
    for (int i = 0; i < n; i++) e += values[i] * probs[i];
    return e;
}
`
  });

  C('probability/bayes', {
    sig: 'double bayes(double prior, double sensitivity, double falsePositiveRate)', args: 'ddd', pass: 'x0, x1, x2', ret: 'd',
    starter: `double bayes(double prior, double sensitivity, double falsePositiveRate) {
    // P(sick | positive test)
}
`,
    hints: ['Two ways to test positive: truly sick, or healthy with a false alarm.', 'truePos = sensitivity * prior; falsePos = falsePositiveRate * (1 - prior);'],
    solution: `double bayes(double prior, double sensitivity, double falsePositiveRate) {
    double truePos = sensitivity * prior;
    double falsePos = falsePositiveRate * (1 - prior);
    return truePos / (truePos + falsePos);
}
`
  });

  C('loss/mae', {
    sig: 'double mae(double preds[], double targets[], int n)', args: 'vv', pass: 'a0, a1, n0', ret: 'd',
    starter: `double mae(double preds[], double targets[], int n) {
    // mean absolute error. fabs(x) gives |x| for doubles.
}
`,
    hints: ['Like MSE, but with fabs instead of squaring.', 'total += fabs(preds[i] - targets[i]);'],
    solution: `double mae(double preds[], double targets[], int n) {
    double total = 0;
    for (int i = 0; i < n; i++) total += fabs(preds[i] - targets[i]);
    return total / n;
}
`
  });

  C('loss/bce', {
    sig: 'double bce(double y, double p)', args: 'dd', pass: 'x0, x1', ret: 'd',
    starter: `double bce(double y, double p) {
    double eps = 1e-12;
    // clip p into [eps, 1 - eps] so log never sees 0, then apply the formula
}
`,
    hints: ['Clip with two if statements.', 'return -(y * log(p) + (1 - y) * log(1 - p));'],
    solution: `double bce(double y, double p) {
    double eps = 1e-12;
    if (p < eps) p = eps;
    if (p > 1 - eps) p = 1 - eps;
    return -(y * log(p) + (1 - y) * log(1 - p));
}
`
  });

  C('loss/crossEntropy', {
    sig: 'double crossEntropy(double probs[], int n, int trueIndex)', args: 'vi', pass: 'a0, n0, x1', ret: 'd',
    starter: `double crossEntropy(double probs[], int n, int trueIndex) {

}
`,
    hints: ['Only the probability of the true class matters.', 'return -log(probs[trueIndex]);'],
    solution: `double crossEntropy(double probs[], int n, int trueIndex) {
    return -log(probs[trueIndex]);
}
`
  });

  C('gradient-descent/descend', {
    sig: 'double descend(double x0, double lr, int steps)', args: 'ddi', pass: 'x0, x1, x2', ret: 'd',
    starter: `// Minimise f(x) = (x - 3)^2 whose derivative is 2 * (x - 3).
double descend(double x0, double lr, int steps) {
    double x = x0;
    // repeat: x = x - lr * gradient
    return x;
}
`,
    hints: ['One update per step, so a loop that runs steps times.', 'x = x - lr * 2 * (x - 3);'],
    solution: `double descend(double x0, double lr, int steps) {
    double x = x0;
    for (int i = 0; i < steps; i++) {
        x = x - lr * 2 * (x - 3);
    }
    return x;
}
`
  });

  C('gradient-descent/trainLinear', {
    note: 'In C++ the long runs use learning rate 0.1 and at most 800 epochs, so the interpreter stays quick. The results are the same.',
    adapt: (t) => (t.args[3] > 1 ? { ...t, args: [t.args[0], t.args[1], 0.1, Math.min(t.args[3], 800)] } : t),
    sig: 'void trainLinear(double xs[], double ys[], int n, double lr, int epochs, double out[])', args: 'vvdi', pass: 'a0, a1, n0, x2, x3', ret: 'v',
    starter: `// Start from w = 0, b = 0. Store the final w in out[0] and b in out[1].
void trainLinear(double xs[], double ys[], int n, double lr, int epochs, double out[]) {
    double w = 0, b = 0;
    // for each epoch: accumulate gradients over all examples, then update w and b once
    out[0] = w;
    out[1] = b;
}
`,
    hints: ['Per example: r = w * xs[i] + b - ys[i]; dMSE/dw gets 2 * r * xs[i] / n, dMSE/db gets 2 * r / n.', 'After the inner loop: w -= lr * gw; b -= lr * gb;'],
    solution: `void trainLinear(double xs[], double ys[], int n, double lr, int epochs, double out[]) {
    double w = 0, b = 0;
    for (int e = 0; e < epochs; e++) {
        double gw = 0, gb = 0;
        for (int i = 0; i < n; i++) {
            double r = w * xs[i] + b - ys[i];
            gw += 2 * r * xs[i] / n;
            gb += 2 * r / n;
        }
        w -= lr * gw;
        b -= lr * gb;
    }
    out[0] = w;
    out[1] = b;
}
`
  });

  C('sigmoid/sigmoid', {
    sig: 'double sigmoid(double z)', args: 'd', pass: 'x0', ret: 'd',
    starter: `double sigmoid(double z) {

}
`,
    hints: ['The formula is 1 / (1 + e^(-z)).', 'return 1 / (1 + exp(-z));'],
    solution: `double sigmoid(double z) {
    return 1 / (1 + exp(-z));
}
`
  });

  C('sigmoid/predictProb', {
    sig: 'double predictProb(double w[], double x[], int n, double b)', args: 'vvd', pass: 'a0, a1, n0, x2', ret: 'd',
    starter: `double sigmoid(double z) {
    return 1 / (1 + exp(-z));
}

double predictProb(double w[], double x[], int n, double b) {
    // z = b + sum of w[i] * x[i], then squash with sigmoid
}
`,
    hints: ['Start z at b and add each w[i] * x[i].', 'return sigmoid(z);'],
    solution: `double sigmoid(double z) {
    return 1 / (1 + exp(-z));
}

double predictProb(double w[], double x[], int n, double b) {
    double z = b;
    for (int i = 0; i < n; i++) z += w[i] * x[i];
    return sigmoid(z);
}
`
  });

  C('neuron/activate', {
    note: "The name is passed as one letter: 'r' relu, 'l' leaky, 's' sigmoid, 't' tanh.",
    sig: 'double activate(char name, double z)', args: 'cd', pass: 'x0, x1', ret: 'd',
    starter: `// name is one letter: 'r' relu, 'l' leaky (slope 0.1), 's' sigmoid, 't' tanh
double activate(char name, double z) {
    switch (name) {
        case 'r':
            // ...
        case 'l':
            // ...
        case 's':
            // ...
        case 't':
            // ...
    }
    return 0;
}
`,
    hints: ['A switch on a char works exactly like in C#. Use return in each case.', "case 'r': return z > 0 ? z : 0;"],
    solution: `double activate(char name, double z) {
    switch (name) {
        case 'r': return z > 0 ? z : 0;
        case 'l': return z > 0 ? z : 0.1 * z;
        case 's': return 1 / (1 + exp(-z));
        case 't': return tanh(z);
    }
    return 0;
}
`
  });

  C('neuron/neuron', {
    note: "The name is passed as one letter: 'r' relu, 's' sigmoid, 't' tanh.",
    sig: 'double neuron(double w[], double x[], int n, double b, char name)', args: 'vvdc', pass: 'a0, a1, n0, x2, x3', ret: 'd',
    starter: `double activate(char name, double z) {
    if (name == 'r') return z > 0 ? z : 0;
    if (name == 's') return 1 / (1 + exp(-z));
    return tanh(z);
}

double neuron(double w[], double x[], int n, double b, char name) {

}
`,
    hints: ['Compute z the same way as in the dot product task, starting from b.', 'double z = b; for (...) z += w[i] * x[i]; return activate(name, z);'],
    solution: `double activate(char name, double z) {
    if (name == 'r') return z > 0 ? z : 0;
    if (name == 's') return 1 / (1 + exp(-z));
    return tanh(z);
}

double neuron(double w[], double x[], int n, double b, char name) {
    double z = b;
    for (int i = 0; i < n; i++) z += w[i] * x[i];
    return activate(name, z);
}
`
  });

  C('forward/softmax', {
    sig: 'void softmax(double z[], int n, double out[])', args: 'v', pass: 'a0, n0', ret: 'v',
    starter: `void softmax(double z[], int n, double out[]) {
    // 1. m = largest z (subtract it for stability)
    // 2. out[i] = exp(z[i] - m)
    // 3. divide every out[i] by the sum
}
`,
    hints: ['Find the max first, so exp never overflows (the test with 1000 needs it).', 'sum += out[i] after filling out[i] = exp(z[i] - m); then out[i] /= sum;'],
    solution: `void softmax(double z[], int n, double out[]) {
    double m = z[0];
    for (int i = 1; i < n; i++) if (z[i] > m) m = z[i];
    double sum = 0;
    for (int i = 0; i < n; i++) {
        out[i] = exp(z[i] - m);
        sum += out[i];
    }
    for (int i = 0; i < n; i++) out[i] /= sum;
}
`
  });

  C('forward/forward', {
    sig: 'void forward(double x[], int nIn, double W1[], double b1[], int nHid, double W2[], double b2[], int nOut, double out[])', args: 'vmvmv', pass: 'a0, n0, a1, a2, r1, a3, a4, r3', ret: 'v',
    starter: `// W1 is nHid x nIn, W2 is nOut x nHid (row-major). Hidden layer uses ReLU, output layer is linear.
void forward(double x[], int nIn, double W1[], double b1[], int nHid, double W2[], double b2[], int nOut, double out[]) {
    double h[16];
    // hidden: h[i] = max(0, b1[i] + sum_j W1[i * nIn + j] * x[j])
    // output: out[k] = b2[k] + sum_i W2[k * nHid + i] * h[i]
}
`,
    hints: ['Two loops of the same shape: one producing h, one producing out.', 'double z = b1[i]; for (int j = 0; j < nIn; j++) z += W1[i * nIn + j] * x[j]; h[i] = z > 0 ? z : 0;'],
    solution: `void forward(double x[], int nIn, double W1[], double b1[], int nHid, double W2[], double b2[], int nOut, double out[]) {
    double h[16];
    for (int i = 0; i < nHid; i++) {
        double z = b1[i];
        for (int j = 0; j < nIn; j++) z += W1[i * nIn + j] * x[j];
        h[i] = z > 0 ? z : 0;
    }
    for (int k = 0; k < nOut; k++) {
        double z = b2[k];
        for (int i = 0; i < nHid; i++) z += W2[k * nHid + i] * h[i];
        out[k] = z;
    }
}
`
  });

  C('backprop/backward', {
    sig: 'void backward(double x, double w, double b, double y, double out[])', args: 'dddd', pass: 'x0, x1, x2, x3', ret: 'v',
    starter: `// One neuron: z = w * x + b, a = relu(z), loss = (a - y)^2.
// Store dLoss/dw in out[0] and dLoss/db in out[1].
void backward(double x, double w, double b, double y, double out[]) {

}
`,
    hints: ['Chain rule from the loss backwards: dA = 2 * (a - y), then dZ = dA if z > 0 else 0.', 'out[0] = dZ * x; out[1] = dZ;'],
    solution: `void backward(double x, double w, double b, double y, double out[]) {
    double z = w * x + b;
    double a = z > 0 ? z : 0;
    double dA = 2 * (a - y);
    double dZ = z > 0 ? dA : 0;
    out[0] = dZ * x;
    out[1] = dZ;
}
`
  });

  C('backprop/trainStep', {
    sig: 'void trainStep(double x, double w, double b, double y, double lr, double out[])', args: 'ddddd', pass: 'x0, x1, x2, x3, x4', ret: 'v',
    starter: `void backward(double x, double w, double b, double y, double g[]) {
    double z = w * x + b;
    double a = z > 0 ? z : 0;
    double dZ = z > 0 ? 2 * (a - y) : 0;
    g[0] = dZ * x;
    g[1] = dZ;
}

// Store the updated w in out[0] and the updated b in out[1].
void trainStep(double x, double w, double b, double y, double lr, double out[]) {
    double g[2];
    backward(x, w, b, y, g);
}
`,
    hints: ['Gradient descent: new = old - lr * gradient, for each parameter.', 'out[0] = w - lr * g[0]; out[1] = b - lr * g[1];'],
    solution: `void backward(double x, double w, double b, double y, double g[]) {
    double z = w * x + b;
    double a = z > 0 ? z : 0;
    double dZ = z > 0 ? 2 * (a - y) : 0;
    g[0] = dZ * x;
    g[1] = dZ;
}

void trainStep(double x, double w, double b, double y, double lr, double out[]) {
    double g[2];
    backward(x, w, b, y, g);
    out[0] = w - lr * g[0];
    out[1] = b - lr * g[1];
}
`
  });

  C('overfit/l2Penalty', {
    sig: 'double l2Penalty(double weights[], int n, double lambda)', args: 'vd', pass: 'a0, n0, x1', ret: 'd',
    starter: `double l2Penalty(double weights[], int n, double lambda) {
    // lambda times the sum of squared weights
}
`,
    hints: ['Sum w * w first, multiply by lambda at the end.', 'return lambda * s;'],
    solution: `double l2Penalty(double weights[], int n, double lambda) {
    double s = 0;
    for (int i = 0; i < n; i++) s += weights[i] * weights[i];
    return lambda * s;
}
`
  });

  C('overfit/earlyStop', {
    sig: 'int earlyStop(double valLosses[], int n, int patience)', args: 'vi', pass: 'a0, n0, x1', ret: 'i',
    starter: `// Return the epoch (counting from 1) with the lowest validation loss,
// stopping once the loss failed to improve for "patience" epochs in a row.
int earlyStop(double valLosses[], int n, int patience) {
    double best = 1e30;
    int bestEpoch = 0, wait = 0;
    // loop over epochs
    return bestEpoch;
}
`,
    hints: ['If the loss is a new best: remember it, remember the epoch, reset wait to 0. Otherwise wait++.', 'When wait >= patience, break out of the loop.'],
    solution: `int earlyStop(double valLosses[], int n, int patience) {
    double best = 1e30;
    int bestEpoch = 0, wait = 0;
    for (int i = 0; i < n; i++) {
        if (valLosses[i] < best) {
            best = valLosses[i];
            bestEpoch = i + 1;
            wait = 0;
        } else {
            wait++;
            if (wait >= patience) break;
        }
    }
    return bestEpoch;
}
`
  });

  C('embeddings/cosine', {
    sig: 'double cosine(double a[], double b[], int n)', args: 'vv', pass: 'a0, a1, n0', ret: 'd',
    starter: `double cosine(double a[], double b[], int n) {
    // dot(a, b) / (|a| * |b|)
}
`,
    hints: ['Accumulate three sums in one loop: dot, squares of a, squares of b.', 'return dot / (sqrt(na) * sqrt(nb));'],
    solution: `double cosine(double a[], double b[], int n) {
    double dot = 0, na = 0, nb = 0;
    for (int i = 0; i < n; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    return dot / (sqrt(na) * sqrt(nb));
}
`
  });

  C('embeddings/nearest', {
    sig: 'int nearest(double query[], int d, double vectors[], int count)', args: 'vm', pass: 'a0, n0, a1, r1', ret: 'i',
    starter: `double cosine(double a[], double b[], int n) {
    double dot = 0, na = 0, nb = 0;
    for (int i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return dot / (sqrt(na) * sqrt(nb));
}

// vectors holds count vectors of length d, one after another. Return the index of the most similar one.
int nearest(double query[], int d, double vectors[], int count) {
    int bestIndex = -1;
    double bestScore = -1e30;
    return bestIndex;
}
`,
    hints: ['Vector number i starts at vectors[i * d]. In C++ you can pass vectors + i * d as an array.', 'double s = cosine(query, vectors + i * d, d); if (s > bestScore) { bestScore = s; bestIndex = i; }'],
    solution: `double cosine(double a[], double b[], int n) {
    double dot = 0, na = 0, nb = 0;
    for (int i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return dot / (sqrt(na) * sqrt(nb));
}

int nearest(double query[], int d, double vectors[], int count) {
    int bestIndex = -1;
    double bestScore = -1e30;
    for (int i = 0; i < count; i++) {
        double s = cosine(query, vectors + i * d, d);
        if (s > bestScore) { bestScore = s; bestIndex = i; }
    }
    return bestIndex;
}
`
  });

  C('attention/maskedSoftmax', {
    sig: 'void maskedSoftmax(double scores[], int len, int n, double out[])', args: 'vi', pass: 'a0, n0, x1', ret: 'v',
    starter: `// Softmax over the first n scores only. Positions n..len-1 get weight 0.
void maskedSoftmax(double scores[], int len, int n, double out[]) {

}
`,
    hints: ['Set all of out to 0 first, then run a normal stable softmax over indices 0..n-1.', 'Max over the first n scores, out[i] = exp(scores[i] - m), divide by the sum.'],
    solution: `void maskedSoftmax(double scores[], int len, int n, double out[]) {
    for (int i = 0; i < len; i++) out[i] = 0;
    double m = scores[0];
    for (int i = 1; i < n; i++) if (scores[i] > m) m = scores[i];
    double sum = 0;
    for (int i = 0; i < n; i++) {
        out[i] = exp(scores[i] - m);
        sum += out[i];
    }
    for (int i = 0; i < n; i++) out[i] /= sum;
}
`
  });

  C('attention/attend', {
    sig: 'void attend(double q[], int d, double K[], double V[], int count, int dv, double out[])', args: 'vmm', pass: 'a0, n0, a1, a2, r1, c2', ret: 'v',
    starter: `// K is count x d, V is count x dv (row-major). out has dv entries.
void attend(double q[], int d, double K[], double V[], int count, int dv, double out[]) {
    double w[16];
    // 1. w[i] = dot(q, K row i) / sqrt(d)
    // 2. softmax over w
    // 3. out[j] = sum_i w[i] * V[i * dv + j]
}
`,
    hints: ['Scores first, then the softmax in place (subtract the max for stability), then the weighted sum.', 'out[j] = 0; for (int i = 0; i < count; i++) out[j] += w[i] * V[i * dv + j];'],
    solution: `void attend(double q[], int d, double K[], double V[], int count, int dv, double out[]) {
    double w[16];
    for (int i = 0; i < count; i++) {
        double s = 0;
        for (int j = 0; j < d; j++) s += q[j] * K[i * d + j];
        w[i] = s / sqrt((double)d);
    }
    double m = w[0];
    for (int i = 1; i < count; i++) if (w[i] > m) m = w[i];
    double sum = 0;
    for (int i = 0; i < count; i++) { w[i] = exp(w[i] - m); sum += w[i]; }
    for (int i = 0; i < count; i++) w[i] /= sum;
    for (int j = 0; j < dv; j++) {
        out[j] = 0;
        for (int i = 0; i < count; i++) out[j] += w[i] * V[i * dv + j];
    }
}
`
  });

  C('llm/softmaxT', {
    sig: 'void softmaxT(double logits[], int n, double T, double out[])', args: 'vd', pass: 'a0, n0, x1', ret: 'v',
    starter: `void softmaxT(double logits[], int n, double T, double out[]) {
    // softmax of logits / T
}
`,
    hints: ['Divide every logit by T first, then do the usual stable softmax.', 'out[i] = exp(logits[i] / T - m) where m is the largest logits[i] / T.'],
    solution: `void softmaxT(double logits[], int n, double T, double out[]) {
    double m = logits[0] / T;
    for (int i = 1; i < n; i++) if (logits[i] / T > m) m = logits[i] / T;
    double sum = 0;
    for (int i = 0; i < n; i++) {
        out[i] = exp(logits[i] / T - m);
        sum += out[i];
    }
    for (int i = 0; i < n; i++) out[i] /= sum;
}
`
  });

  C('llm/sampleIndex', {
    sig: 'int sampleIndex(double probs[], int n, double r)', args: 'vd', pass: 'a0, n0, x1', ret: 'i',
    starter: `// r is a random number in [0, 1). Return the first index where the running total exceeds r.
int sampleIndex(double probs[], int n, double r) {

}
`,
    hints: ['Keep a running total of the probabilities.', 'total += probs[i]; if (r < total) return i; and return n - 1 after the loop.'],
    solution: `int sampleIndex(double probs[], int n, double r) {
    double total = 0;
    for (int i = 0; i < n; i++) {
        total += probs[i];
        if (r < total) return i;
    }
    return n - 1;
}
`
  });

  C('llm/perplexity', {
    sig: 'double perplexity(double p[], int n)', args: 'v', pass: 'a0, n0', ret: 'd',
    starter: `// p[i] is the probability the model gave to the correct token i.
double perplexity(double p[], int n) {

}
`,
    hints: ['Average the negative logs, then exponentiate.', 'loss += -log(p[i]); return exp(loss / n);'],
    solution: `double perplexity(double p[], int n) {
    double loss = 0;
    for (int i = 0; i < n; i++) loss += -log(p[i]);
    return exp(loss / n);
}
`
  });
})();
