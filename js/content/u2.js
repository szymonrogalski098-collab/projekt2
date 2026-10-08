/* Unit 2: The math toolkit. */
(function () {
  const D = ML.d;
  ML.units.push({
    id: 'u2', title: 'The math toolkit', color: '#8b5cf6',
    blurb: 'Vectors, matrices, derivatives and probability: only the parts that machine learning really uses.',
    lessons: [
      /* ===================================================== L4 */
      {
        id: 'vectors', title: 'Vectors and the dot product', icon: 'vector', minutes: '25-30 min',
        blurb: 'The single operation behind every neuron: multiply pairwise and add.',
        theory: [
          D.page('A vector is an arrow, and a list of numbers',
            D.p('A **vector** is an ordered list of numbers, like [3, 2]. You can read it two ways. As a **point** in space: 3 steps right, 2 steps up. Or as an **arrow** from the origin to that point. Both views are useful: the list view is how code stores it, the arrow view is how you build intuition.'),
            D.p('In ML a vector is usually a bundle of features: [size, rooms, age] is a vector with three components, so it lives in 3-dimensional space. A word embedding with 768 numbers lives in 768 dimensions. You cannot draw that, but every rule you learn here in 2D works unchanged in 768D.'),
            D.plot({ title: 'Two arrows. Move them and watch the numbers.', h: 380, xr: [-6, 6], yr: [-4, 4], arrows: [{ to: '[p.ax,p.ay]', label: 'a' }, { to: '[p.bx,p.by]', label: 'b', c: 'var(--pink)' }], params: [{ n: 'ax', label: 'a, x part', min: -5, max: 5, step: 0.5, v: 3 }, { n: 'ay', label: 'a, y part', min: -3, max: 3, step: 0.5, v: 2 }, { n: 'bx', label: 'b, x part', min: -5, max: 5, step: 0.5, v: 1 }, { n: 'by', label: 'b, y part', min: -3, max: 3, step: 0.5, v: 3 }], readout: [{ label: 'dot a.b', f: 'p.ax*p.bx+p.ay*p.by', digits: 2 }, { label: 'length |a|', f: 'Math.hypot(p.ax,p.ay)', digits: 2 }, { label: 'length |b|', f: 'Math.hypot(p.bx,p.by)', digits: 2 }] })),
          D.page('What you can do with vectors',
            D.p('Three operations cover almost everything. All of them work component by component.'),
            D.steps(['Add', 'a + b: add matching components. [1, 2] + [3, 4] = [4, 6]. Geometrically: walk along a, then along b.'], ['Scale', 'c x a: multiply every component. 3 x [2, -1] = [6, -3]. The arrow gets longer (or flips if c is negative) but keeps its line.'], ['Length', 'The length (norm) of a is the Pythagorean theorem in many dimensions.']),
            D.formula('|a| = @sqrt{a_1^2 + a_2^2 + ... + a_n^2}', [['|a|', 'length of the vector, written norm of a'], ['a_k', 'the k-th component']]),
            D.p('Example: a = [2, 3, 6]. Squares: 4, 9, 36. Sum 49. Square root: 7. So |a| = 7.')),
          D.page('The dot product: a weighted sum',
            D.p('Here is the operation you will meet in every neuron. Take two vectors of the **same length**. Multiply them **position by position**, then **add up all the products**. The result is a single number, not a vector.'),
            D.steps(['Line them up', 'a = [2, 3] and b = [4, -1].'], ['Multiply pairwise', '2 x 4 = 8 and 3 x (-1) = -3.'], ['Add', '8 + (-3) = 5. So a . b = 5.']),
            D.formula('a @cdot b = a_1 b_1 + a_2 b_2 + ... + a_n b_n = @sum_{k=1}^{n} a_k b_k', [['a @cdot b', 'dot product, always a single number']]),
            D.p('Read it as a **scoring rule**. Let a hold the weights (how much you care about each feature) and b hold the feature values. The dot product is the total score. A weight of 0 means "ignore this feature", a negative weight means "this feature counts against".'),
            D.note('tip', 'House score = [0.5, -1, 2] . [size, age, rooms]. The model is literally a dot product with a bias added.')),
          D.page('The dot product measures agreement',
            D.p('There is a second reading, geometric, and it explains why dot products power similarity search and attention. It equals the product of the lengths times the cosine of the angle between the arrows.'),
            D.formula('a @cdot b = |a| |b| cos(@theta)', [['@theta', 'the angle between a and b']]),
            D.table(['Angle between arrows', 'cos', 'Dot product'], [['0 degrees (same direction)', '1', 'large positive'], ['90 degrees (perpendicular)', '0', 'exactly 0'], ['180 degrees (opposite)', '-1', 'large negative']]),
            D.p('So: positive dot product means "pointing roughly the same way", zero means "unrelated (orthogonal)", negative means "pointing against each other". Drag the arrows in the first widget again and watch the dot product change sign.')),
          D.page('Dot product in code',
            D.p('Now that you know what it computes, the code is a loop. Here is the same function in C# and in Python, plus the one-liner the ML world uses.'),
            D.cmp('double Dot(double[] a, double[] b)\n{\n    double sum = 0;\n    for (int i = 0; i < a.Length; i++)\n        sum += a[i] * b[i];\n    return sum;\n}', 'def dot(a, b):\n    total = 0\n    for i in range(len(a)):\n        total += a[i] * b[i]\n    return total\n\n# in practice:\n# import numpy as np\n# np.dot(a, b)'),
            D.note('cs', 'In C# the closest tool is `a.Zip(b, (x, y) => x * y).Sum()`. NumPy does it in optimised native code, thousands of times faster than a Python loop, which is why ML code avoids explicit loops.'),
            D.note('warn', 'The vectors must have the same length. A dot product of a 3-vector with a 4-vector is undefined. Shape mismatches are the most common error message you will ever see in ML code.'))
        ],
        practice: [
          D.mc('What kind of object does the dot product of two vectors return?', ['A vector', 'A single number', 'A matrix', 'A list of angles'], 1, 'Multiply pairwise and add: the result collapses to one number.'),
          D.num('Compute the dot product of a = [2, 3] and b = [4, -1].', [['a', '[2, 3]'], ['b', '[4, -1]']], 5, ['2 x 4 = 8', '3 x (-1) = -3', '8 + (-3) = 5'], { verify: '2*4+3*-1' }),
          D.match('Match the operation with its result.', [['[1, 2] + [3, 4]', '[4, 6]'], ['3 x [2, -1]', '[6, -3]'], ['length of [3, 4]', '5'], ['[1, 0] . [0, 1]', '0']]),
          D.order('Order the steps of a dot product.', ['Check both vectors have the same length', 'Multiply the matching components', 'Add up all the products', 'Read the single number result'], 'Check shapes first, multiply, then sum.'),
          D.multi('Which statements are true?', ['a . b equals b . a', 'The two vectors must have the same length', 'The dot product of perpendicular vectors is 0', 'The dot product is always positive'], [0, 1, 2], 'Dot products can be negative when the vectors point against each other.'),
          D.mc('a . b is strongly negative. What does that suggest?', ['The vectors point roughly the same way', 'The vectors are perpendicular', 'The vectors point roughly in opposite directions', 'One vector is zero'], 2, 'cos(angle) is near -1, so the angle is near 180 degrees.')
        ],
        code: [
          {
            title: 'Dot product', fn: 'dot',
            task: [D.p('Write `dot(a, b)` returning the dot product of two equal-length arrays.')],
            starter: 'function dot(a, b) {\n  let sum = 0;\n  // add a[i] * b[i] for every position\n  return sum;\n}\n',
            tests: [{ args: [[2, 3], [4, -1]], expect: 5 }, { args: [[1, 2, 3], [4, -5, 6]], expect: 12 }, { args: [[0, 0], [9, 9]], expect: 0 }, { args: [[0.5, -1, 2], [4, 2, 1]], expect: 2, hidden: true }],
            hints: ['A for loop from i = 0 while i < a.length.', 'sum += a[i] * b[i];'],
            solution: 'function dot(a, b) {\n  let sum = 0;\n  for (let i = 0; i < a.length; i++) {\n    sum += a[i] * b[i];\n  }\n  return sum;\n}\n',
            explain: 'This function will reappear inside every neuron you build from here on.'
          },
          {
            title: 'Vector length', fn: 'norm',
            task: [D.p('Write `norm(a)`: the length of a vector, the square root of the sum of squared components.'), D.note('tip', 'Notice that the sum of squares is the vector dotted with itself.')],
            starter: 'function norm(a) {\n  \n}\n',
            tests: [{ args: [[3, 4]], expect: 5 }, { args: [[2, 3, 6]], expect: 7 }, { args: [[0, 0, 0]], expect: 0 }, { args: [[1, 1]], expect: 1.41421, tol: 0.0001, hidden: true }],
            hints: ['Math.sqrt gives the square root.', 'let s = 0; for (const x of a) s += x * x; return Math.sqrt(s);'],
            solution: 'function norm(a) {\n  let s = 0;\n  for (const x of a) s += x * x;\n  return Math.sqrt(s);\n}\n',
            explain: '`for (const x of a)` is the JavaScript foreach. Length is sqrt(a . a).'
          }
        ],
        quiz: [
          D.num('Compute the dot product of a = [1, 2, 3] and b = [4, -5, 6].', [['a', '[1, 2, 3]'], ['b', '[4, -5, 6]']], 12, ['1 x 4 = 4', '2 x (-5) = -10', '3 x 6 = 18', 'sum: 4 - 10 + 18 = 12'], { verify: '1*4+2*-5+3*6' }),
          D.num('Calculate the length of the vector [2, 3, 6].', [['formula', '|a| = sqrt(a1^2 + a2^2 + a3^2)']], 7, ['4 + 9 + 36 = 49', 'sqrt(49) = 7'], { verify: 'Math.sqrt(2*2+3*3+6*6)' }),
          D.num('A neuron has weights w = [0.5, -1, 2], bias b = 0.5 and receives x = [4, 2, 1]. Calculate z = w . x + b.', [['weights w', '[0.5, -1, 2]'], ['inputs x', '[4, 2, 1]'], ['bias b', '0.5']], 2.5, ['0.5 x 4 = 2', '-1 x 2 = -2', '2 x 1 = 2', 'w . x = 2 - 2 + 2 = 2', 'z = 2 + 0.5 = 2.5'], { verify: '0.5*4+-1*2+2*1+0.5', dp: 1 }),
          D.num('Compute 3 x [2, -1] + [1, 5] and enter the SECOND component of the result.', [['scale', '3 x [2, -1] = [6, -3]'], ['add', '[1, 5]']], 2, ['3 x [2, -1] = [6, -3]', '[6, -3] + [1, 5] = [7, 2]', 'second component = 2'], { verify: '3*-1+5' }),
          D.mc('What is [2, 1] . [-1, 2]?', ['0, so they are perpendicular', '4', '-4', '5'], 0, '2 x (-1) + 1 x 2 = -2 + 2 = 0. A zero dot product means the vectors are orthogonal.'),
          D.mc('Why do ML libraries avoid explicit Python for-loops for dot products?', ['Loops are not allowed', 'Vectorised native code is far faster', 'Loops give different answers', 'Dot products need GPUs'], 1, 'NumPy executes the same arithmetic in optimised compiled code.'),
          D.multi('A weight vector is [2, 0, -3]. Select the true statements.', ['The second feature is ignored', 'The third feature counts against the score', 'The first feature has the smallest influence', 'Scores can be negative'], [0, 1, 3], 'Weight 2 has a larger magnitude than 0, so the first feature matters more than the second.'),
          D.mc('Which expression is the length of vector a written with a dot product?', ['a . a', 'sqrt(a . a)', 'a . b', '2 x a'], 1, 'The sum of squares is a . a. Take the square root for length.')
        ]
      },

      /* ===================================================== L5 */
      {
        id: 'matrices', title: 'Matrices and shapes', icon: 'grid', minutes: '25-30 min',
        blurb: 'A whole layer of neurons is one matrix multiplication. Learn to read shapes and you can debug most ML code.',
        theory: [
          D.page('A matrix is a stack of vectors',
            D.p('A **matrix** is a rectangular grid of numbers. Its **shape** is written rows x columns. The matrix with rows [1, 2, 3] and [4, 5, 6] has shape 2 x 3. You can see it as 2 row-vectors stacked on top of each other, or 3 column-vectors side by side.'),
            D.p('In ML a matrix usually means one of two things. A **dataset**: every row is an example, every column a feature (shape N x d). Or a **layer of weights**: every row holds the weights of one neuron.'),
            D.note('cs', 'Think `double[,]` or `double[][]` in C#. Shape (2, 3) means 2 rows of 3 numbers. Indexing is M[i][j]: row i, column j, counting from 0.')),
          D.page('Matrix times vector = many dot products at once',
            D.p('Suppose a layer has 3 neurons and each looks at 2 inputs. Each neuron has its own weight vector. Stack the three weight vectors as rows and you get a 3 x 2 matrix W. Feeding the input vector x through all neurons at once is **W times x**.'),
            D.steps(['Take row 1 of W', 'Dot it with x. That is the output of neuron 1.'], ['Take row 2 of W', 'Dot it with x. Output of neuron 2.'], ['Take row 3 of W', 'Dot it with x. Output of neuron 3.'], ['Collect', 'The three numbers form the result vector (length 3).']),
            D.p('Example: W = [[2, 0, 1], [1, 3, -1]] (shape 2 x 3) and x = [1, 2, 3] (length 3). Row 1: 2 x 1 + 0 x 2 + 1 x 3 = 5. Row 2: 1 x 1 + 3 x 2 + (-1) x 3 = 4. Result: [5, 4], a vector of length 2.'),
            D.note('tip', 'A matrix of shape (out x in) maps vectors of length in to vectors of length out. Matrices are functions that change the size of a vector.')),
          D.page('Matrix times matrix',
            D.p('Multiplying two matrices is the same trick repeated: the entry in row i and column j of the result is the **dot product of row i of the left matrix with column j of the right matrix**.'),
            D.formula('C_{ij} = @sum_{k} A_{ik} B_{kj}', [['A', 'left matrix, shape m x n'], ['B', 'right matrix, shape n x p'], ['C', 'result, shape m x p']]),
            D.p('Worked example. A = [[1, 2], [3, 4]], B = [[5, 6], [7, 8]]. Entry C[0][0] = row 0 of A . column 0 of B = 1 x 5 + 2 x 7 = 19. Entry C[0][1] = 1 x 6 + 2 x 8 = 22. Entry C[1][0] = 3 x 5 + 4 x 7 = 43. Entry C[1][1] = 3 x 6 + 4 x 8 = 50.'),
            D.p('Full result: [[19, 22], [43, 50]].')),
          D.page('The shape rule that catches most bugs',
            D.p('To multiply, the **inner dimensions must match**, and the result takes the outer ones.'),
            D.formula('(m @times n) @cdot (n @times p) = (m @times p)', [['n', 'must be equal on both sides']]),
            D.table(['Left', 'Right', 'Valid?', 'Result shape'], [['(4 x 3)', '(3 x 5)', 'yes', '(4 x 5)'], ['(2 x 3)', '(2 x 3)', 'no (3 vs 2)', 'error'], ['(1 x 4)', '(4 x 1)', 'yes', '(1 x 1) a single number']]),
            D.p('The **transpose** M^T flips rows and columns: a (2 x 3) matrix becomes (3 x 2). It is the usual cure for a shape mismatch.'),
            D.note('warn', 'Matrix multiplication is not commutative: A x B is generally not B x A, and one of them may not even exist.')),
          D.page('Why matrices: batches and layers',
            D.p('A layer with d inputs and h neurons has a weight matrix W of shape (d x h) plus a bias vector of length h. Feed N examples at once as a matrix X of shape (N x d): then X times W has shape (N x h), one output row per example. GPUs are built to do exactly this operation extremely fast.'),
            D.formula('Y = X W + b', [['X', 'batch of inputs, shape N x d'], ['W', 'weights, shape d x h'], ['b', 'bias, length h, added to every row'], ['Y', 'outputs, shape N x h']]),
            D.p('Count the work: N x h entries, each a dot product of length d, so N x h x d multiplications. For N = 32, d = 10, h = 5 that is 1600.'),
            D.p('Parameter count of the layer is d x h + h. With 3 inputs and 4 neurons: 3 x 4 + 4 = 16.')),
          D.page('Matrix multiplication in code',
            D.cmp('double[,] MatMul(double[,] A, double[,] B)\n{\n    int m = A.GetLength(0), n = A.GetLength(1), p = B.GetLength(1);\n    var C = new double[m, p];\n    for (int i = 0; i < m; i++)\n        for (int j = 0; j < p; j++)\n            for (int k = 0; k < n; k++)\n                C[i, j] += A[i, k] * B[k, j];\n    return C;\n}', 'def matmul(A, B):\n    m, n, p = len(A), len(B), len(B[0])\n    C = [[0] * p for _ in range(m)]\n    for i in range(m):\n        for j in range(p):\n            for k in range(n):\n                C[i][j] += A[i][k] * B[k][j]\n    return C\n\n# in practice: A @ B  (NumPy)'),
            D.note('cs', 'Three nested loops. In NumPy the operator `@` replaces all of this, and `A.shape` tells you the shape. Printing `.shape` is the first debugging move in any ML code.'))
        ],
        practice: [
          D.mc('A matrix has 4 rows and 3 columns. What is its shape?', ['3 x 4', '4 x 3', '12', '7'], 1, 'Shape is always rows x columns.'),
          D.mc('Which product is valid?', ['(2 x 3) times (2 x 3)', '(2 x 3) times (3 x 4)', '(4 x 1) times (2 x 4)', '(5 x 2) times (3 x 5)'], 1, 'Inner dimensions must match: 3 and 3.'),
          D.num('A = [[1, 2], [3, 4]] and B = [[5, 6], [7, 8]]. What is the entry C[0][1] of C = A x B?', [['row 0 of A', '[1, 2]'], ['column 1 of B', '[6, 8]']], 22, ['dot([1, 2], [6, 8]) = 1 x 6 + 2 x 8', '= 6 + 16 = 22'], { verify: '1*6+2*8' }),
          D.order('Order the steps for computing W times x.', ['Check the number of columns of W equals the length of x', 'Take the next row of W', 'Dot it with x to get one output number', 'Repeat for every row and collect the numbers'], 'Each row of W is one neuron.'),
          D.match('Match each shape product with its result shape.', [['(4 x 3) times (3 x 5)', '(4 x 5)'], ['(1 x 4) times (4 x 1)', '(1 x 1)'], ['(10 x 2) times (2 x 2)', '(10 x 2)'], ['(3 x 1) times (1 x 3)', '(3 x 3)']]),
          D.multi('Which statements are true?', ['A x B can differ from B x A', 'The transpose swaps rows and columns', 'A (2 x 3) matrix can multiply a (2 x 3) matrix', 'One row of a weight matrix can represent one neuron'], [0, 1, 3], 'A (2 x 3) times (2 x 3) fails because 3 does not match 2.')
        ],
        code: [
          {
            title: 'Matrix times vector', fn: 'matVec',
            task: [D.p('Write `matVec(M, v)`: `M` is an array of rows. Return an array with one number per row, the dot product of that row with `v`.'), D.note('tip', 'You already wrote the dot product. Here it is used once per row.')],
            starter: 'function matVec(M, v) {\n  const out = [];\n  // for each row, push its dot product with v\n  return out;\n}\n',
            tests: [{ args: [[[1, 2], [3, 4]], [1, 1]], expect: [3, 7] }, { args: [[[2, 0, 1], [1, 3, -1]], [1, 2, 3]], expect: [5, 4] }, { args: [[[1, 0], [0, 1]], [7, 9]], expect: [7, 9] }, { args: [[[0.5, 0.5, 0.5]], [2, 4, 6]], expect: [6], hidden: true }],
            hints: ['Loop over rows: for (const row of M) { ... }', 'let s = 0; for (let j = 0; j < v.length; j++) s += row[j] * v[j]; out.push(s);'],
            solution: 'function matVec(M, v) {\n  const out = [];\n  for (const row of M) {\n    let s = 0;\n    for (let j = 0; j < v.length; j++) s += row[j] * v[j];\n    out.push(s);\n  }\n  return out;\n}\n',
            explain: 'That is a complete layer of linear neurons. Add a bias and an activation and you have a neural network layer.'
          },
          {
            title: 'Matrix times matrix', fn: 'matMul',
            task: [D.p('Write `matMul(A, B)` for arrays of rows. Entry `[i][j]` of the result is the sum over `k` of `A[i][k] * B[k][j]`.')],
            starter: 'function matMul(A, B) {\n  const m = A.length, n = B.length, p = B[0].length;\n  const C = Array.from({ length: m }, () => Array(p).fill(0));\n  // three nested loops: i, j, k\n  return C;\n}\n',
            tests: [{ args: [[[1, 2], [3, 4]], [[5, 6], [7, 8]]], expect: [[19, 22], [43, 50]] }, { args: [[[1, 2, 3]], [[1], [2], [3]]], expect: [[14]] }, { args: [[[1, 0], [0, 1]], [[9, 8], [7, 6]]], expect: [[9, 8], [7, 6]] }, { args: [[[2], [3]], [[4, 5]]], expect: [[8, 10], [12, 15]], hidden: true }],
            hints: ['for i in 0..m-1, for j in 0..p-1, for k in 0..n-1.', 'C[i][j] += A[i][k] * B[k][j];'],
            solution: 'function matMul(A, B) {\n  const m = A.length, n = B.length, p = B[0].length;\n  const C = Array.from({ length: m }, () => Array(p).fill(0));\n  for (let i = 0; i < m; i++)\n    for (let j = 0; j < p; j++)\n      for (let k = 0; k < n; k++)\n        C[i][j] += A[i][k] * B[k][j];\n  return C;\n}\n',
            explain: 'Identical to the C# version in the theory. This triple loop is what a GPU does for millions of entries in parallel.'
          }
        ],
        quiz: [
          D.num('A = [[1, 2], [3, 4]] and B = [[5, 6], [7, 8]]. Find entry C[1][0] of C = A x B.', [['row 1 of A', '[3, 4]'], ['column 0 of B', '[5, 7]']], 43, ['3 x 5 + 4 x 7', '= 15 + 28 = 43'], { verify: '3*5+4*7' }),
          D.num('W = [[2, 0, 1], [1, 3, -1]] and x = [1, 2, 3]. Compute W x and enter the SECOND component.', [['W', '[[2, 0, 1], [1, 3, -1]]'], ['x', '[1, 2, 3]']], 4, ['row 2: 1 x 1 + 3 x 2 + (-1) x 3', '= 1 + 6 - 3 = 4'], { verify: '1*1+3*2+-1*3' }),
          D.num('A has shape (4 x 3) and B has shape (3 x 5). How many entries does A x B have in total?', [['shape of A', '4 x 3'], ['shape of B', '3 x 5']], 20, ['result shape is (4 x 5)', '4 x 5 = 20 entries'], { verify: '4*5' }),
          D.num('A layer has 3 inputs and 4 neurons, with one bias per neuron. How many parameters does it have?', [['weights', '3 x 4'], ['biases', '4']], 16, ['weights: 3 x 4 = 12', 'biases: 4', 'total 16'], { verify: '3*4+4' }),
          D.num('A batch X has shape (32 x 10) and W has shape (10 x 5). How many scalar multiplications does X x W need?', [['X', '32 x 10'], ['W', '10 x 5'], ['hint', 'each output entry is a dot product of length 10']], 1600, ['output has 32 x 5 = 160 entries', 'each needs 10 multiplications', '160 x 10 = 1600'], { verify: '32*5*10' }),
          D.mc('A (3 x 2) matrix is multiplied by a vector. What length must the vector have?', ['3', '2', '6', 'any length'], 1, 'The matrix has 2 columns, so the vector needs 2 components.'),
          D.mc('You get a shape error multiplying (5 x 3) by (5 x 2). What fixes it?', ['Transpose the first: (3 x 5) times (5 x 2)', 'Add a bias', 'Square both matrices', 'Use more data'], 0, 'The inner dimensions must match. Transposing the left gives 5 and 5.'),
          D.mc('What does each row of a weight matrix W (neurons x inputs) hold?', ['One input example', 'The weights of one neuron', 'One label', 'The loss'], 1, 'Row i dotted with the input gives the output of neuron i.')
        ]
      },

      /* ===================================================== L6 */
      {
        id: 'derivatives', title: 'Derivatives and gradients', icon: 'slope', minutes: '25-30 min',
        blurb: 'Slopes tell the model which way is downhill. This is the engine of all training.',
        theory: [
          D.page('A derivative is a slope',
            D.p('You are standing on a hill described by a function. A **derivative** answers one question: if I take a tiny step to the right, how much does my height change per unit step? That ratio is the **slope** at that exact point.'),
            D.p('Positive slope: going right takes you up. Negative: going right takes you down. Zero: you are on a flat spot, at the top, the bottom, or a plateau. Training wants to reach the bottom of the loss, so the sign of the slope tells it which way to move.'),
            D.plot({ title: 'f(x) = x squared with its tangent line', xr: [-4, 4], yr: [-2, 16], fns: [{ f: 'x*x', label: 'f(x) = x^2' }, { f: 'p.x0*p.x0+2*p.x0*(x-p.x0)', label: 'tangent at x0', c: 'var(--pink)' }], trail: '[[p.x0,p.x0*p.x0]]', params: [{ n: 'x0', label: 'point x0', min: -3.5, max: 3.5, step: 0.1, v: 1.5 }], readout: [{ label: 'slope at x0', f: '2*p.x0', digits: 2 }] })),
          D.page('Computing a slope step by step',
            D.p('Without any calculus: pick a point x and a tiny step h. Measure how much f changed, divide by the step. That is the **rise over run** of a very short segment.'),
            D.formula('f\'(x) @approx @f{f(x + h) - f(x)}{h}', [['h', 'a very small number such as 0.00001'], ['f\'(x)', 'the derivative of f at x']]),
            D.steps(['Evaluate f at x', 'For f(x) = x^2 at x = 3: f(3) = 9.'], ['Evaluate at x + h', 'With h = 0.1: f(3.1) = 9.61.'], ['Subtract', '9.61 - 9 = 0.61.'], ['Divide by h', '0.61 / 0.1 = 6.1.']),
            D.p('The exact slope is 6 (the formula 2x at x = 3). With smaller h the estimate gets closer. This **numerical derivative** is slow but great for checking your formulas.')),
          D.page('Rules you need to know',
            D.p('Mathematicians derived formulas so you do not have to measure every time. These few cover nearly everything in this app.'),
            D.table(['Function', 'Derivative', 'Example'], [['constant c', '0', 'f = 7 gives 0'], ['x^n', 'n x^(n-1)', 'x^3 gives 3x^2; at x = 2: 12'], ['c x f(x)', 'c x f\'(x)', '5x^2 gives 10x; at x = 3: 30'], ['f + g', 'f\' + g\'', '3x^2 + 2x gives 6x + 2; at x = 4: 26']]),
            D.note('info', 'You will use `e^x` and `ln x` later: the derivative of e^x is e^x itself, and of ln x it is 1/x.')),
          D.page('Several knobs: partial derivatives and the gradient',
            D.p('A real loss depends on many parameters, say L(w1, w2). A **partial derivative** asks the slope question for one parameter while pretending all the others are constants. Collect all partial derivatives into a vector and you get the **gradient**.'),
            D.formula('@nabla L = ( @f{@partial L}{@partial w_1}, @f{@partial L}{@partial w_2}, ..., @f{@partial L}{@partial w_n} )', [['@nabla L', 'the gradient: one slope per parameter'], ['@partial', 'curly d, "partial": the other variables are held fixed']]),
            D.p('Example: f(w1, w2) = w1^2 + w1 w2. For the partial with respect to w1, treat w2 as a constant: 2 w1 + w2. With respect to w2, treat w1 as constant: w1. At the point (2, 3) the gradient is (2 x 2 + 3, 2) = (7, 2).'),
            D.note('tip', 'The gradient points in the direction of steepest ascent (uphill). To reduce the loss you walk in the opposite direction. That single sentence is gradient descent, coming up in Unit 3.')),
          D.page('The chain rule',
            D.p('Neural networks are functions inside functions inside functions. The **chain rule** tells you how to get the slope of such a stack: multiply the slopes of the links.'),
            D.formula('@f{d f}{d x} = @f{d f}{d u} @cdot @f{d u}{d x}', [['u', 'the inner function value, with f = g(u) and u = h(x)']]),
            D.p('Example: f = (3x + 1)^2. Let u = 3x + 1, so f = u^2. Outer slope: 2u. Inner slope: 3. Product: 2u x 3 = 6u. At x = 1: u = 4, so the slope is 24.'),
            D.p('Intuition: if turning knob A by 1 turns knob B by 3, and turning B by 1 turns the output by 8, then turning A by 1 turns the output by 3 x 8 = 24. Backpropagation is just this, applied layer after layer.')),
          D.page('Derivatives in code',
            D.cmp('double Slope(Func<double, double> f, double x, double h = 1e-5)\n{\n    return (f(x + h) - f(x - h)) / (2 * h);\n}', 'def slope(f, x, h=1e-5):\n    return (f(x + h) - f(x - h)) / (2 * h)'),
            D.note('cs', 'Passing a function as a parameter is `Func<double,double>` in C# and just a normal argument in Python. The version above uses a **central difference** (step both ways), which is more accurate than stepping only forward.'),
            D.p('Frameworks like PyTorch compute exact gradients automatically (autograd) by applying the chain rule to every operation you wrote. You will see how in the Backpropagation lesson.'))
        ],
        practice: [
          D.mc('At a point the slope of the loss is +3. To lower the loss you should move the parameter...', ['to the right (increase it)', 'to the left (decrease it)', 'it does not matter', 'you cannot tell'], 1, 'Positive slope means going right increases the loss, so go left.'),
          D.num('Find the derivative of f(x) = 5x^2 at x = 3.', [['rule', 'd/dx (c x^n) = c n x^(n-1)']], 30, ['f\'(x) = 5 x 2 x = 10x', 'at x = 3: 10 x 3 = 30'], { verify: '10*3' }),
          D.match('Match each function with its derivative.', [['x^3', '3x^2'], ['7', '0'], ['4x', '4'], ['x^2 + x', '2x + 1']]),
          D.order('Order the steps of a numerical derivative.', ['Pick a point x and a tiny step h', 'Evaluate f(x) and f(x + h)', 'Subtract the two values', 'Divide by h'], 'It is rise over run on a very short segment.'),
          D.multi('Which statements about the gradient are true?', ['It has one component per parameter', 'It points uphill', 'Negative gradient points downhill', 'It is a single number'], [0, 1, 2], 'The gradient is a vector, not a single number.'),
          D.mc('f has slope 0 at some point. What can that point be?', ['Only the minimum', 'A minimum, a maximum or a flat spot', 'Only the origin', 'Impossible'], 1, 'Zero slope marks a stationary point, not necessarily a minimum.')
        ],
        code: [
          {
            title: 'Numerical slope', fn: 'slope',
            task: [D.p('Write `slope(x, h)` that estimates the derivative of `f(x) = x * x` with the **central difference** `(f(x + h) - f(x - h)) / (2h)`.')],
            starter: 'function f(x) {\n  return x * x;\n}\n\nfunction slope(x, h) {\n  \n}\n',
            tests: [{ args: [3, 0.0001], expect: 6, tol: 0.001 }, { args: [-2, 0.0001], expect: -4, tol: 0.001 }, { args: [0, 0.001], expect: 0, tol: 0.001 }, { args: [10, 0.0001], expect: 20, tol: 0.001, hidden: true }],
            hints: ['Call f twice: f(x + h) and f(x - h).', 'return (f(x + h) - f(x - h)) / (2 * h);'],
            solution: 'function f(x) {\n  return x * x;\n}\n\nfunction slope(x, h) {\n  return (f(x + h) - f(x - h)) / (2 * h);\n}\n',
            explain: 'For x*x the central difference is exact up to rounding. Try smaller and bigger h on your own to see rounding errors appear.'
          },
          {
            title: 'Gradient of two variables', fn: 'numGrad',
            task: [D.p('Let `f(w1, w2) = w1 * w1 + w1 * w2`. Write `numGrad(w1, w2)` returning `[df/dw1, df/dw2]` using central differences with `h = 1e-5`.'), D.p('Perturb one variable at a time and keep the other fixed.')],
            starter: 'function f(w1, w2) {\n  return w1 * w1 + w1 * w2;\n}\n\nfunction numGrad(w1, w2) {\n  const h = 1e-5;\n  const d1 = 0; // replace\n  const d2 = 0; // replace\n  return [d1, d2];\n}\n',
            tests: [{ args: [2, 3], expect: [7, 2], tol: 0.001 }, { args: [0, 5], expect: [5, 0], tol: 0.001 }, { args: [-1, 4], expect: [2, -1], tol: 0.001 }, { args: [3, -6], expect: [0, 3], tol: 0.001, hidden: true }],
            hints: ['d1 changes w1 only: (f(w1 + h, w2) - f(w1 - h, w2)) / (2 * h).', 'd2 changes w2 only: (f(w1, w2 + h) - f(w1, w2 - h)) / (2 * h).'],
            solution: 'function f(w1, w2) {\n  return w1 * w1 + w1 * w2;\n}\n\nfunction numGrad(w1, w2) {\n  const h = 1e-5;\n  const d1 = (f(w1 + h, w2) - f(w1 - h, w2)) / (2 * h);\n  const d2 = (f(w1, w2 + h) - f(w1, w2 - h)) / (2 * h);\n  return [d1, d2];\n}\n',
            explain: 'This "gradient check" is a standard way to verify a hand-derived backprop implementation.'
          }
        ],
        quiz: [
          D.num('Find the derivative of f(x) = x^3 at x = 2.', [['rule', 'd/dx x^n = n x^(n-1)']], 12, ['f\'(x) = 3x^2', 'at x = 2: 3 x 4 = 12'], { verify: '3*2**2' }),
          D.num('Find the derivative of f(x) = 3x^2 + 2x at x = 4.', [['f', '3x^2 + 2x']], 26, ['f\'(x) = 6x + 2', 'at x = 4: 24 + 2 = 26'], { verify: '6*4+2' }),
          D.num('Estimate the derivative of f(x) = x^2 at x = 3 with step h = 0.1 using the forward difference (f(x + h) - f(x)) / h.', [['x', '3'], ['h', '0.1'], ['f(3) = 9', 'f(3.1) = 9.61']], 6.1, ['(9.61 - 9) / 0.1', '= 0.61 / 0.1 = 6.1'], { verify: '((3.1)**2-9)/0.1', dp: 1 }),
          D.num('f(w1, w2) = w1^2 + w1 w2. Calculate the partial derivative with respect to w1 at (w1, w2) = (2, 3).', [['f', 'w1^2 + w1 w2'], ['point', '(2, 3)']], 7, ['treat w2 as constant', 'df/dw1 = 2 w1 + w2', '= 4 + 3 = 7'], { verify: '2*2+3' }),
          D.num('f(x) = (3x + 1)^2. Use the chain rule to find f\'(1).', [['inner', 'u = 3x + 1'], ['outer', 'f = u^2']], 24, ['df/du = 2u, du/dx = 3', 'f\'(x) = 2u x 3 = 6(3x + 1)', 'at x = 1: 6 x 4 = 24'], { verify: '6*(3*1+1)' }),
          D.mc('The gradient of the loss at the current weights is (4, -2). Which is the gradient-descent direction?', ['(4, -2)', '(-4, 2)', '(2, -4)', '(0, 0)'], 1, 'Walk against the gradient: negate every component.'),
          D.mc('Why use a central difference rather than a forward difference?', ['It is more accurate for the same h', 'It needs no function calls', 'It avoids derivatives entirely', 'It only works for lines'], 0, 'Errors from both sides cancel to higher order.'),
          D.multi('Select the correct derivatives.', ['d/dx x^2 = 2x', 'd/dx 9 = 9', 'd/dx 5x = 5', 'd/dx x^4 = 4x^3'], [0, 2, 3], 'The derivative of a constant is 0.')
        ]
      },

      /* ===================================================== L7 */
      {
        id: 'probability', title: 'Probability essentials', icon: 'dice', minutes: '25-30 min',
        blurb: 'Models output probabilities, and training is about making real data likely. This lesson gives you the language.',
        theory: [
          D.page('Probability as a number between 0 and 1',
            D.p('A **probability** measures how likely an event is. 0 means impossible, 1 means certain, 0.5 means a fair coin. It can be read as a long-run frequency (out of 1000 flips about 500 are heads) or as a degree of belief (I am 80 percent sure it will rain). ML mixes both readings.'),
            D.p('Two rules carry most of the weight. The probabilities of all possible outcomes add up to exactly **1**. And the probability that an event does *not* happen is **1 minus** its probability.'),
            D.formula(['P(not A) = 1 - P(A)', '@sum_{outcomes} P = 1'], [['P(A)', 'probability that event A happens']]),
            D.p('For one die each face has probability 1/6. The chance of an even number is 3 faces out of 6: 1/2. The chance of getting at least one head in 3 flips is 1 minus the chance of three tails: 1 - (1/2)^3 = 0.875.')),
          D.page('Random variables and expected value',
            D.p('A **random variable** is a number produced by a random process, like the value of a die roll. Its **distribution** lists how likely each value is. The **expected value** (mean) is the average you would see over very many repetitions: each value weighted by its probability.'),
            D.formula('E[X] = @sum_{k} x_k P(x_k)', [['x_k', 'a possible value'], ['P(x_k)', 'its probability']]),
            D.steps(['List values and probabilities', 'Values 1, 2, 3 with probabilities 0.2, 0.5, 0.3.'], ['Multiply each pair', '1 x 0.2 = 0.2, 2 x 0.5 = 1.0, 3 x 0.3 = 0.9.'], ['Add', 'E[X] = 0.2 + 1.0 + 0.9 = 2.1.']),
            D.note('tip', 'The loss over a dataset is an expected value too: the average error over examples drawn from the data distribution.')),
          D.page('Independence and conditional probability',
            D.p('Two events are **independent** if knowing one tells you nothing about the other. Then the chance that both happen is the product: P(A and B) = P(A) x P(B). Two coin flips are independent: 0.5 x 0.5 = 0.25 for two heads.'),
            D.p('Often events are linked. **Conditional probability** P(B given A) is the chance of B once you know A happened. Restrict attention to the world where A is true and ask how often B occurs there.'),
            D.formula('P(B | A) = @f{P(A and B)}{P(A)}', [['P(B | A)', 'probability of B given A']]),
            D.p('Example: P(A) = 0.3 and P(A and B) = 0.12. Then P(B | A) = 0.12 / 0.3 = 0.4.')),
          D.page('Bayes: updating beliefs with evidence',
            D.p('A medical test is 90 percent sensitive (sick people test positive 90 percent of the time) and gives false alarms to 5 percent of healthy people. Only 1 percent of people are sick. You test positive. How worried should you be? Most people guess about 90 percent. The right answer is much lower, and **Bayes\' rule** shows why.'),
            D.formula('P(D | +) = @f{P(+ | D) P(D)}{P(+ | D) P(D) + P(+ | not D) P(not D)}', [['D', 'the person is sick'], ['+', 'the test is positive']]),
            D.steps(['True positives', 'P(+ and sick) = 0.9 x 0.01 = 0.009.'], ['False positives', 'P(+ and healthy) = 0.05 x 0.99 = 0.0495.'], ['Total positives', '0.009 + 0.0495 = 0.0585.'], ['Share that are truly sick', '0.009 / 0.0585 = 0.154, about 15 percent.']),
            D.note('info', 'Because the disease is rare, healthy people (many) produce more positives than sick people (few). Prior probabilities matter. The same logic powers spam filters and many classifiers.')),
          D.page('The normal distribution',
            D.p('Many measurements cluster around an average with a symmetric spread: heights, noise, errors. The bell-shaped **normal (Gaussian) distribution** describes this with two numbers: the mean (the centre) and the standard deviation (the width). Play with them.'),
            D.plot({ title: 'Normal distribution', xr: [-6, 6], yr: [0, 1], fns: [{ f: 'Math.exp(-0.5*((x-p.mu)/p.sd)**2)/(p.sd*Math.sqrt(2*Math.PI))', label: 'density' }], params: [{ n: 'mu', label: 'mean', min: -3, max: 3, step: 0.1, v: 0 }, { n: 'sd', label: 'std dev', min: 0.4, max: 3, step: 0.1, v: 1 }], readout: [{ label: 'peak height', f: '1/(p.sd*Math.sqrt(2*Math.PI))', digits: 3 }] }),
            D.p('About 68 percent of values fall within one standard deviation of the mean, 95 percent within two. The area under the whole curve is 1, so a narrow curve must be tall.')),
          D.page('Why ML is built on probability',
            D.list('**Classifiers output probabilities**: 0.93 for "cat" is more useful than a bare yes/no.', '**Training = making data likely**: choose parameters under which the observed labels have high probability. Taking the negative log gives the cross-entropy loss (Unit 3).', '**Language models are probability machines**: they output a distribution over the next word and sample from it.', '**Randomness is a tool**: random initial weights, shuffled batches, dropout.'),
            D.cmp('double ExpectedValue(double[] v, double[] p)\n{\n    double e = 0;\n    for (int i = 0; i < v.Length; i++)\n        e += v[i] * p[i];\n    return e;\n}', 'def expected_value(v, p):\n    return sum(x * q for x, q in zip(v, p))'),
            D.note('cs', 'Python\'s `zip` pairs elements like LINQ `Zip`. The expected value is a dot product of values with probabilities, again.'))
        ],
        practice: [
          D.mc('Probabilities of all possible outcomes of an experiment add up to...', ['0', '0.5', '1', '100'], 2, 'Something must happen, so the total is 1.'),
          D.num('A fair six-sided die is rolled. What is the probability of an even number?', [['even faces', '2, 4, 6'], ['all faces', '6']], 0.5, ['3 favourable faces out of 6', '3 / 6 = 0.5'], { verify: '3/6' }),
          D.match('Match each concept with its meaning.', [['Independent events', 'knowing one tells nothing about the other'], ['Expected value', 'probability-weighted average'], ['Conditional probability', 'chance of B once A is known'], ['Standard deviation', 'width of the spread']]),
          D.order('Order the steps for computing an expected value.', ['List all possible values', 'Write each value\'s probability', 'Multiply every value by its probability', 'Add the products'], 'It is a weighted sum.'),
          D.multi('Which are true for two independent events A and B?', ['P(A and B) = P(A) x P(B)', 'Knowing A changes the chance of B', 'P(B given A) = P(B)', 'They can never both happen'], [0, 2], 'Independence means conditioning on A does not change B.'),
          D.mc('A rare disease has a 1 percent prior and a decent test. Why can a positive result still mean a low chance of disease?', ['Tests are always wrong', 'Healthy people are many, so false positives can outnumber true positives', 'Probabilities do not apply to tests', 'The prior is ignored'], 1, 'The prior probability dominates the answer in Bayes\' rule.')
        ],
        code: [
          {
            title: 'Expected value', fn: 'expectedValue',
            task: [D.p('Write `expectedValue(values, probs)`: the sum of `values[i] * probs[i]`.')],
            starter: 'function expectedValue(values, probs) {\n  \n}\n',
            tests: [{ args: [[1, 2, 3], [0.2, 0.5, 0.3]], expect: 2.1 }, { args: [[1, 2, 3, 4, 5, 6], [0.1667, 0.1667, 0.1667, 0.1667, 0.1667, 0.1665]], expect: 3.5, tol: 0.01 }, { args: [[0, 10], [0.9, 0.1]], expect: 1 }, { args: [[5], [1]], expect: 5, hidden: true }],
            hints: ['It is the same as a dot product.', 'let e = 0; for (let i = 0; i < values.length; i++) e += values[i] * probs[i]; return e;'],
            solution: 'function expectedValue(values, probs) {\n  let e = 0;\n  for (let i = 0; i < values.length; i++) e += values[i] * probs[i];\n  return e;\n}\n',
            explain: 'Expected value is a dot product, so your earlier work already covers it.'
          },
          {
            title: "Bayes' rule", fn: 'bayes',
            task: [D.p('Write `bayes(prior, sensitivity, falsePositiveRate)` returning P(sick given positive).'), D.steps(['Numerator', 'sensitivity x prior.'], ['Denominator', 'sensitivity x prior + falsePositiveRate x (1 - prior).'], ['Answer', 'numerator / denominator.'])],
            starter: 'function bayes(prior, sensitivity, falsePositiveRate) {\n  \n}\n',
            tests: [{ args: [0.01, 0.9, 0.05], expect: 0.15385, tol: 0.0005 }, { args: [0.5, 0.9, 0.1], expect: 0.9, tol: 0.0005 }, { args: [0.1, 1, 0], expect: 1 }, { args: [0.2, 0.8, 0.2], expect: 0.5, tol: 0.0005, hidden: true }],
            hints: ['Compute truePos = sensitivity * prior and falsePos = falsePositiveRate * (1 - prior).', 'return truePos / (truePos + falsePos);'],
            solution: 'function bayes(prior, sensitivity, falsePositiveRate) {\n  const truePos = sensitivity * prior;\n  const falsePos = falsePositiveRate * (1 - prior);\n  return truePos / (truePos + falsePos);\n}\n',
            explain: 'With a 1 percent prior and a 90 percent sensitive test you get about 15 percent. Evidence updates belief but does not replace the prior.'
          }
        ],
        quiz: [
          D.num('X takes the values 1, 2, 3 with probabilities 0.2, 0.5, 0.3. Calculate E[X].', [['values', '1, 2, 3'], ['probabilities', '0.2, 0.5, 0.3']], 2.1, ['1 x 0.2 = 0.2', '2 x 0.5 = 1.0', '3 x 0.3 = 0.9', 'sum = 2.1'], { verify: '1*0.2+2*0.5+3*0.3', dp: 1 }),
          D.num('Two independent events have P(A) = 0.3 and P(B) = 0.4. What is P(A and B)?', [['P(A)', '0.3'], ['P(B)', '0.4']], 0.12, ['independent: multiply', '0.3 x 0.4 = 0.12'], { verify: '0.3*0.4' }),
          D.num('P(A) = 0.3 and P(A and B) = 0.12. Calculate P(B given A).', [['P(A)', '0.3'], ['P(A and B)', '0.12']], 0.4, ['P(B | A) = P(A and B) / P(A)', '= 0.12 / 0.3 = 0.4'], { verify: '0.12/0.3', dp: 1 }),
          D.num('A disease has prior 0.01. The test has sensitivity 0.9 and false-positive rate 0.05. Calculate P(sick given positive).', [['prior P(D)', '0.01'], ['P(+ given D)', '0.9'], ['P(+ given not D)', '0.05']], 0.154, ['true positives: 0.9 x 0.01 = 0.009', 'false positives: 0.05 x 0.99 = 0.0495', 'P = 0.009 / (0.009 + 0.0495) = 0.154'], { verify: '0.009/(0.009+0.0495)', dp: 3 }),
          D.num('A fair coin is flipped 3 times. What is the probability of at least one head?', [['hint', 'P(at least one head) = 1 - P(all tails)']], 0.875, ['P(all tails) = 0.5^3 = 0.125', '1 - 0.125 = 0.875'], { verify: '1-0.5**3', dp: 3 }),
          D.mc('A normal distribution has mean 0 and a tiny standard deviation. What does the curve look like?', ['Wide and flat', 'Narrow and tall', 'Two peaks', 'A straight line'], 1, 'The area stays 1, so a narrow curve must be tall.'),
          D.mc('Which is a valid probability distribution over three outcomes?', ['0.5, 0.3, 0.3', '0.2, 0.5, 0.3', '0.7, 0.7, -0.4', '1, 1, 1'], 1, 'Values must be non-negative and sum to 1.'),
          D.multi('Why does ML care about probability?', ['Classifiers output probabilities', 'Training can be framed as making observed data likely', 'It makes models run faster', 'Language models sample from a distribution over next words'], [0, 1, 3], 'Probability is the language of prediction, not a speed trick.')
        ]
      }
    ]
  });
})();
