/* Unit 5: Modern AI. */
(function () {
  const D = ML.d;
  ML.units.push({
    id: 'u5', title: 'Modern AI', color: '#c2640a',
    blurb: 'Embeddings, attention and language models: how the ideas so far add up to systems like ChatGPT and Claude.',
    lessons: [
      /* ===================================================== L15 */
      {
        id: 'embeddings', title: 'Embeddings and similarity', icon: 'embed', minutes: '25-30 min',
        blurb: 'Represent words, images and sentences as points in space, so that similar things are close together.',
        theory: [
          D.page('Meaning as a position',
            D.p('A neural network can only compute with numbers, yet we want it to handle words. An **embedding** is a vector assigned to a thing (a word, a sentence, an image, a user) so that **similar things get nearby vectors**. Meaning becomes geometry.'),
            D.p('Think of a map of cities. Paris and Lyon are close because they are similar in some measurable way. A word map does the same for meaning, only with hundreds of dimensions instead of two. Here is a toy two-dimensional version with features "size" and "danger".'),
            D.table(['Animal', 'size', 'danger'], [['mouse', '0.1', '0.1'], ['cat', '0.2', '0.2'], ['dog', '0.4', '0.3'], ['tiger', '0.8', '0.9'], ['lion', '0.9', '0.9']]),
            D.p('Cat and dog are close, tiger and lion are close, and the two groups are far apart. Nobody wrote down "tigers are dangerous" as a rule: in real embeddings such axes emerge from training and are rarely this clean.')),
          D.page('Where embeddings come from',
            D.p('Embeddings are **learned**, like any other weights. A model is trained on a task such as "predict the missing word from its neighbours". To do well it must give words that appear in similar contexts similar vectors: "cat" and "dog" both appear near "pet", "feed", "vet".'),
            D.p('Technically the embedding layer is a table: a matrix E of shape (vocabulary size x embedding dimension). Row i is the vector for token i. Looking a token up equals multiplying its one-hot vector by E, which just selects the row.'),
            D.formula('E @in @mathbb{R}^{V @times d}'.replace('@mathbb{R}', 'R'), [['V', 'number of tokens in the vocabulary'], ['d', 'embedding dimension (for example 768)']]),
            D.p('Size check: a vocabulary of 50,000 tokens with d = 768 gives 50,000 x 768 = 38,400,000 numbers in the embedding table alone.'),
            D.note('cs', 'Think of a `Dictionary<int, double[]>` or simply `double[][] E` indexed by token id. The "learning" part is that gradient descent adjusts those rows.')),
          D.page('Measuring similarity: distance and cosine',
            D.p('Two vectors are similar if they are close. You can measure that in two ways. **Euclidean distance** is the straight-line length of a - b. **Cosine similarity** ignores the lengths and measures only the **angle** between the vectors, which is usually what you want for meaning, since length often reflects things like word frequency.'),
            D.formula('cos(a, b) = @f{a @cdot b}{|a| |b|}', [['a @cdot b', 'dot product'], ['|a|, |b|', 'lengths of the vectors'], ['cos', '1 = same direction, 0 = unrelated, -1 = opposite']]),
            D.steps(['Dot product', 'a = [3, 4], b = [4, 3]: 12 + 12 = 24.'], ['Lengths', '|a| = 5 and |b| = 5.'], ['Divide', '24 / (5 x 5) = 0.96, almost the same direction.']),
            D.p('Another: a = [1, 0] and b = [1, 1]. Dot = 1, |a| = 1, |b| = 1.414, so cos = 0.707 (a 45 degree angle). Play with the arrows and read the cosine.'),
            D.plot({ title: 'Cosine similarity of two directions', h: 380, xr: [-6, 6], yr: [-4, 4], arrows: [{ to: '[3,0]', label: 'a' }, { to: '[3*Math.cos(p.t),3*Math.sin(p.t)]', label: 'b', c: 'var(--pink)' }], params: [{ n: 't', label: 'angle of b (radians)', min: -3.14, max: 3.14, step: 0.05, v: 0.8 }], readout: [{ label: 'cosine', f: 'Math.cos(p.t)', digits: 3 }, { label: 'angle in degrees', f: 'Math.abs(p.t)*180/Math.PI', digits: 0 }] })),
          D.page('Vector arithmetic captures relationships',
            D.p('Famous result: in good word embeddings, directions encode relations. The step from "man" to "king" is roughly the same as from "woman" to "queen". So king - man + woman lands near queen.'),
            D.p('Toy example in two dimensions (first axis "royalty", second axis "female"): man = [1, 0], woman = [1, 1], king = [3, 0]. Compute king - man + woman: [3-1+1, 0-0+1] = [3, 1]. In this toy space the queen is exactly [3, 1].'),
            D.note('warn', 'Real embeddings are noisy and the analogy trick works only approximately. It is a nice demonstration that geometry holds structure, not a guaranteed feature to rely on.')),
          D.page('What embeddings are used for',
            D.list('**Semantic search**: embed documents and the query, return the documents with the highest cosine similarity. It finds "automobile repair" for the query "fix my car".', '**Recommendations**: users and items in the same space; recommend nearby items.', '**Retrieval for language models (RAG)**: fetch relevant passages by embedding similarity, then give them to the model.', '**Clustering and deduplication**: group or merge close vectors.', '**Inside every Transformer**: the first layer turns tokens into embeddings, the rest of the network transforms them.'),
            D.steps(['Nearest-neighbour search', 'Embed the query.'], ['Score every candidate', 'Compute cosine similarity with the query.'], ['Pick the best', 'Return the index with the highest score (or the top k).'])),
          D.page('Similarity in code',
            D.cmp('double Cosine(double[] a, double[] b)\n{\n    double dot = 0, na = 0, nb = 0;\n    for (int i = 0; i < a.Length; i++)\n    {\n        dot += a[i] * b[i];\n        na += a[i] * a[i];\n        nb += b[i] * b[i];\n    }\n    return dot / (Math.Sqrt(na) * Math.Sqrt(nb));\n}', 'import math\n\ndef cosine(a, b):\n    dot = sum(x * y for x, y in zip(a, b))\n    na = math.sqrt(sum(x * x for x in a))\n    nb = math.sqrt(sum(y * y for y in b))\n    return dot / (na * nb)'),
            D.note('tip', 'With normalised vectors (length 1) cosine similarity is just the dot product, which is why vector databases normalise once and then run fast dot products.'))
        ],
        practice: [
          D.mc('What is the goal of an embedding?', ['To compress files', 'To place similar things at nearby vectors', 'To encrypt text', 'To count words'], 1, 'Geometry stands in for meaning.'),
          D.num('Euclidean distance between a = [1, 2] and b = [4, 6].', [['difference', '[3, 4]'], ['formula', 'sqrt(3^2 + 4^2)']], 5, ['differences: 3 and 4', 'sqrt(9 + 16) = sqrt(25) = 5'], { verify: 'Math.hypot(3,4)' }),
          D.match('Match the cosine value with its meaning.', [['1', 'same direction'], ['0', 'perpendicular, unrelated'], ['-1', 'opposite directions'], ['0.96', 'almost the same direction']]),
          D.order('Order a semantic search.', ['Embed all the documents once', 'Embed the user query', 'Compute cosine similarity of the query with each document', 'Return the highest-scoring documents'], 'Embeddings first, similarity next, ranking last.'),
          D.num('Cosine similarity of a = [3, 4] and b = [4, 3].', [['dot', '24'], ['lengths', '5 and 5']], 0.96, ['24 / (5 x 5)', '= 0.96'], { verify: '24/25' }),
          D.multi('Which statements about cosine similarity are true?', ['It depends on the angle between vectors', 'It ignores vector length', 'Its range is -1 to 1', 'It is always positive'], [0, 1, 2], 'Opposite directions give negative values.')
        ],
        code: [
          {
            title: 'Cosine similarity', fn: 'cosine',
            task: [D.p('Write `cosine(a, b)`: the dot product divided by the product of the two lengths.')],
            starter: 'function cosine(a, b) {\n  let dot = 0, na = 0, nb = 0;\n  // accumulate dot product and squared norms\n  \n}\n',
            tests: [{ args: [[1, 0], [1, 1]], expect: 0.70711, tol: 0.0001 }, { args: [[3, 4], [4, 3]], expect: 0.96 }, { args: [[2, 0], [-4, 0]], expect: -1 }, { args: [[1, 0], [0, 5]], expect: 0, hidden: true }],
            hints: ['One loop can fill dot, na and nb together.', 'return dot / (Math.sqrt(na) * Math.sqrt(nb));'],
            solution: 'function cosine(a, b) {\n  let dot = 0, na = 0, nb = 0;\n  for (let i = 0; i < a.length; i++) {\n    dot += a[i] * b[i];\n    na += a[i] * a[i];\n    nb += b[i] * b[i];\n  }\n  return dot / (Math.sqrt(na) * Math.sqrt(nb));\n}\n',
            explain: 'This function powers search engines, recommendation systems and retrieval for language models.'
          },
          {
            title: 'Nearest neighbour', fn: 'nearest',
            task: [D.p('Write `nearest(query, vectors)` returning the **index** of the vector with the highest cosine similarity to `query`. A `cosine` function is provided.')],
            starter: 'function cosine(a, b) {\n  let dot = 0, na = 0, nb = 0;\n  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }\n  return dot / (Math.sqrt(na) * Math.sqrt(nb));\n}\n\nfunction nearest(query, vectors) {\n  \n}\n',
            tests: [{ args: [[1, 0], [[0, 1], [1, 1], [2, 0.1]]], expect: 2 }, { args: [[0, 1], [[1, 0], [0.2, 0.9]]], expect: 1 }, { args: [[1, 1], [[-1, -1], [5, 5], [0, 1]]], expect: 1 }, { args: [[3, 4], [[4, 3], [3, 4.2], [0, 1]]], expect: 1, hidden: true }],
            hints: ['Keep track of the best score and its index while looping.', 'if (s > bestScore) { bestScore = s; bestIndex = i; }'],
            solution: 'function cosine(a, b) {\n  let dot = 0, na = 0, nb = 0;\n  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }\n  return dot / (Math.sqrt(na) * Math.sqrt(nb));\n}\n\nfunction nearest(query, vectors) {\n  let bestScore = -Infinity, bestIndex = -1;\n  for (let i = 0; i < vectors.length; i++) {\n    const s = cosine(query, vectors[i]);\n    if (s > bestScore) { bestScore = s; bestIndex = i; }\n  }\n  return bestIndex;\n}\n',
            explain: 'A real vector database does the same thing with clever indexes so it does not compare against every vector.'
          }
        ],
        quiz: [
          D.num('Calculate cosine similarity of a = [1, 0] and b = [1, 1].', [['a . b', '1'], ['|a|', '1'], ['|b|', '1.4142']], 0.7071, ['1 / (1 x 1.4142)', '= 0.7071'], { verify: '1/Math.sqrt(2)', dp: 3 }),
          D.num('Calculate cosine similarity of a = [3, 4] and b = [4, 3].', [['a . b', '24'], ['|a|, |b|', '5, 5']], 0.96, ['24 / 25 = 0.96'], { verify: '24/25' }),
          D.num('Euclidean distance between [1, 2] and [4, 6].', [['formula', 'sqrt of sum of squared differences']], 5, ['3^2 + 4^2 = 25', 'sqrt(25) = 5'], { verify: 'Math.hypot(3,4)' }),
          D.num('A vocabulary of 50,000 tokens uses embeddings of dimension 768. How many numbers are in the embedding table?', [['V', '50000'], ['d', '768']], 38400000, ['50000 x 768 = 38,400,000'], { verify: '50000*768' }),
          D.num('Toy embeddings: king = [3, 0], man = [1, 0], woman = [1, 1]. Calculate king - man + woman and enter the SECOND component.', [['king', '[3, 0]'], ['man', '[1, 0]'], ['woman', '[1, 1]']], 1, ['first: 3 - 1 + 1 = 3', 'second: 0 - 0 + 1 = 1'], { verify: '0-0+1' }),
          D.num('Cosine similarity of a = [2, 0] and b = [-4, 0].', [['directions', 'opposite']], -1, ['dot = -8, |a| = 2, |b| = 4', '-8 / 8 = -1'], { verify: '-8/8' }),
          D.mc('Why is cosine often preferred over Euclidean distance for text embeddings?', ['It is cheaper to print', 'It compares direction, not vector length', 'It always gives positive numbers', 'It needs no dot product'], 1, 'Length can reflect frequency rather than meaning.'),
          D.mc('Where do the values of an embedding table come from?', ['They are typed by hand', 'They are learned during training', 'They are random and fixed', 'They come from a dictionary'], 1, 'Gradient descent updates them like any other weights.')
        ]
      },

      /* ===================================================== L16 */
      {
        id: 'attention', title: 'Attention', icon: 'focus', minutes: '30-35 min',
        blurb: 'The mechanism that lets each word look at the other words and decide which ones matter.',
        theory: [
          D.page('Meaning depends on context',
            D.p('Consider "She sat on the river bank" and "She went to the bank to deposit money". The word is identical, the meaning is not. An embedding table gives "bank" one fixed vector, so something must adjust it using the **surrounding words**.'),
            D.p('Attention is that something. For each word it asks: which other words in this sentence are relevant to me, and how much? It then builds a new vector for the word as a **weighted mix of information from all words**, with weights that sum to 1. "Bank" next to "river" mixes in water-related information; next to "deposit" it mixes in money.')),
          D.page('Query, key, value',
            D.p('Think of a library. You have a **question** (query). Every book has a **label** on its spine (key) that you compare with your question to decide how relevant the book is. The relevant books then contribute their **contents** (value) to your answer, in proportion to relevance.'),
            D.diagram('attention', 'A query is compared with all keys; the scores become weights; the weights blend the values.'),
            D.list('**Query (q)**: what this word is looking for.', '**Key (k)**: what each word advertises about itself.', '**Value (v)**: the information each word hands over if selected.'),
            D.p('All three are vectors computed from the word\'s embedding by multiplying with learned matrices W_q, W_k, W_v. The model learns what to ask, advertise and share.')),
          D.page('The computation, step by step',
            D.steps(['Score', 'Dot product of the query with every key: how well does each key match?'], ['Scale', 'Divide each score by the square root of the key dimension d.'], ['Softmax', 'Turn the scores into weights that are positive and sum to 1.'], ['Mix', 'Output = sum of (weight x value) over all positions.']),
            D.formula('Attention(q, K, V) = softmax( @f{q K^T}{@sqrt{d}} ) V', [['q K^T', 'dot product of the query with each key'], ['d', 'dimension of the key vectors'], ['softmax', 'scores to weights'], ['V', 'the value vectors']]),
            D.p('Worked example, d = 2. Query q = [1, 0]. Keys k1 = [1, 0], k2 = [0, 1], k3 = [1, 1]. Values v1 = [2, 0], v2 = [0, 4], v3 = [1, 1].'),
            D.steps(['Scores q . k', '[1, 0, 1].'], ['Scale by sqrt(2) = 1.414', '[0.707, 0, 0.707].'], ['Softmax', 'e^0.707 = 2.028, e^0 = 1: sum 5.056, weights [0.401, 0.198, 0.401].'], ['Mix the values', '0.401 x [2, 0] + 0.198 x [0, 4] + 0.401 x [1, 1] = [1.203, 1.192].']),
            D.p('Keys 1 and 3 match the query equally well, so they share most of the weight. Key 2 is orthogonal to the query and gets less.')),
          D.page('Why divide by the square root of d',
            D.p('A dot product adds up d products. With bigger d the typical size of the sum grows (its standard deviation grows like the square root of d). Large scores push the softmax into a regime where one weight is almost 1 and the rest almost 0. There the gradients are tiny and learning stalls. Dividing by the square root of d keeps the scores at a stable scale.'),
            D.table(['Key dimension d', 'Scale factor sqrt(d)'], [['4', '2'], ['16', '4'], ['64', '8'], ['128', '11.3']]),
            D.note('tip', 'Compare the softmax of [2, 0] (weights 0.88 and 0.12) with [20, 0] (weights almost exactly 1 and 0). The second has nearly no gradient. The scaling prevents that.')),
          D.page('Self-attention, masks and heads',
            D.p('In **self-attention** every word of a sequence plays all three roles at once: each position produces its own query, key and value and attends to all positions of the same sequence. For a sequence of length n there are n x n scores.'),
            D.list('**Causal mask**: a language model that predicts the next word must not peek at future words. Scores for future positions are set to minus infinity before the softmax, giving them weight 0.', '**Multi-head attention**: run several attentions in parallel with different learned matrices. Different heads can specialise (for example one tracks grammar, another tracks which noun a pronoun refers to). Their outputs are concatenated.', '**Cost**: n x n scores means long contexts get expensive, which is why context length is a major engineering topic.'),
            D.p('A full Transformer layer is attention followed by a small feed-forward network, each wrapped with a residual connection and normalisation. You already know every other ingredient.')),
          D.page('Attention in code',
            D.cmp('double[] Attend(double[] q, double[][] K, double[][] V)\n{\n    int n = K.Length, d = q.Length;\n    var s = new double[n];\n    for (int i = 0; i < n; i++)\n    {\n        for (int j = 0; j < d; j++) s[i] += q[j] * K[i][j];\n        s[i] /= Math.Sqrt(d);\n    }\n    var w = Softmax(s);\n    var o = new double[V[0].Length];\n    for (int i = 0; i < n; i++)\n        for (int j = 0; j < o.Length; j++) o[j] += w[i] * V[i][j];\n    return o;\n}', 'import math\n\ndef attend(q, K, V):\n    d = len(q)\n    s = [sum(qj * kj for qj, kj in zip(q, k)) / math.sqrt(d) for k in K]\n    w = softmax(s)\n    return [sum(w[i] * V[i][j] for i in range(len(V)))\n            for j in range(len(V[0]))]'),
            D.note('cs', 'This is the whole mechanism for one query. A real implementation computes all queries at once as matrix products (Q K^T) and runs on a GPU, but the arithmetic is exactly what you just read.'))
        ],
        practice: [
          D.match('Match each role in attention.', [['Query', 'what a word is looking for'], ['Key', 'what a word advertises'], ['Value', 'the information passed on if selected'], ['Softmax', 'turns scores into weights summing to 1']]),
          D.order('Order the steps of attention for one query.', ['Dot the query with every key', 'Divide the scores by sqrt(d)', 'Apply softmax to get weights', 'Add up the values weighted by those weights'], 'Score, scale, normalise, mix.'),
          D.num('q = [1, 2, 0, 1] and k = [2, 1, 3, 1]. What is the raw score q . k?', [['q', '[1, 2, 0, 1]'], ['k', '[2, 1, 3, 1]']], 5, ['1x2 + 2x1 + 0x3 + 1x1', '= 2 + 2 + 0 + 1 = 5'], { verify: '1*2+2*1+0*3+1*1' }),
          D.mc('Why is a causal mask used in language models?', ['To save memory', 'So a position cannot see future words it must predict', 'To remove punctuation', 'To increase d'], 1, 'Otherwise the model could simply copy the answer.'),
          D.multi('Which statements about self-attention are true?', ['Each position produces a query, a key and a value', 'Each position can attend to the other positions', 'The weights for one query sum to 1', 'It has no learned parameters'], [0, 1, 2], 'W_q, W_k and W_v are learned.'),
          D.num('Weights [0.75, 0.25] and scalar values [4, 8]. What is the attention output?', [['weights', '0.75, 0.25'], ['values', '4, 8']], 5, ['0.75 x 4 = 3', '0.25 x 8 = 2', '3 + 2 = 5'], { verify: '0.75*4+0.25*8' })
        ],
        code: [
          {
            title: 'Masked softmax', fn: 'maskedSoftmax',
            task: [D.p('Write `maskedSoftmax(scores, n)`: only the first `n` positions are visible. Apply softmax over those `n` scores; every later position gets weight `0`. This is the causal mask in miniature.')],
            starter: 'function maskedSoftmax(scores, n) {\n  const out = scores.map(() => 0);\n  // softmax over scores[0..n-1], leave the rest at 0\n  return out;\n}\n',
            tests: [{ args: [[1, 2, 3], 2], expect: [0.26894, 0.73106, 0], tol: 0.0001 }, { args: [[5, 1, 1], 1], expect: [1, 0, 0] }, { args: [[0, 0, 0, 0], 4], expect: [0.25, 0.25, 0.25, 0.25], tol: 0.0001 }, { args: [[2, 0, 9], 2], expect: [0.88080, 0.11920, 0], tol: 0.0001, hidden: true }],
            hints: ['Subtract the max of the visible scores, exponentiate, sum only the first n.', 'for (let i = 0; i < n; i++) out[i] = e[i] / sum;'],
            solution: 'function maskedSoftmax(scores, n) {\n  const out = scores.map(() => 0);\n  const vis = scores.slice(0, n);\n  const m = Math.max(...vis);\n  const e = vis.map(v => Math.exp(v - m));\n  const s = e.reduce((a, c) => a + c, 0);\n  for (let i = 0; i < n; i++) out[i] = e[i] / s;\n  return out;\n}\n',
            explain: 'Position i of a language model uses n = i + 1 and sees only the past and itself.'
          },
          {
            title: 'Attention for one query', fn: 'attend',
            task: [D.p('Write `attend(q, K, V)` returning the output vector. `softmax` is provided.'), D.steps(['Scores', 's[i] = (q . K[i]) / sqrt(d), with d = q.length.'], ['Weights', 'w = softmax(s).'], ['Output', 'sum over i of w[i] * V[i], component by component.'])],
            starter: 'function softmax(z) {\n  const m = Math.max(...z);\n  const e = z.map(v => Math.exp(v - m));\n  const s = e.reduce((a, c) => a + c, 0);\n  return e.map(v => v / s);\n}\n\nfunction attend(q, K, V) {\n  const d = q.length;\n  \n}\n',
            tests: [{ args: [[1, 0], [[1, 0], [0, 1], [1, 1]], [[2, 0], [0, 4], [1, 1]]], expect: [1.2033, 1.1923], tol: 0.001 }, { args: [[1, 1], [[1, 1], [1, 1]], [[2, 4], [4, 8]]], expect: [3, 6], tol: 0.001 }, { args: [[10, 0], [[10, 0], [0, 10]], [[1, 0], [0, 1]]], expect: [1, 0], tol: 0.01 }, { args: [[0, 0], [[1, 2], [3, 4]], [[5, 5], [7, 9]]], expect: [6, 7], tol: 0.001, hidden: true }],
            hints: ['const s = K.map(k => k.reduce((a, kj, j) => a + kj * q[j], 0) / Math.sqrt(d));', 'const w = softmax(s); then build the output with V[0].map((_, j) => V.reduce((a, v, i) => a + w[i] * v[j], 0)).'],
            solution: 'function softmax(z) {\n  const m = Math.max(...z);\n  const e = z.map(v => Math.exp(v - m));\n  const s = e.reduce((a, c) => a + c, 0);\n  return e.map(v => v / s);\n}\n\nfunction attend(q, K, V) {\n  const d = q.length;\n  const s = K.map(k => k.reduce((a, kj, j) => a + kj * q[j], 0) / Math.sqrt(d));\n  const w = softmax(s);\n  return V[0].map((_, j) => V.reduce((a, v, i) => a + w[i] * v[j], 0));\n}\n',
            explain: 'The first test is the hand-worked example from the theory. When all keys are identical, attention reduces to a plain average of the values.'
          }
        ],
        quiz: [
          D.num('q = [1, 2, 0, 1] and k = [2, 1, 3, 1]. Calculate the SCALED score (q . k) / sqrt(d).', [['q', '[1, 2, 0, 1]'], ['k', '[2, 1, 3, 1]'], ['d', '4 (so sqrt(d) = 2)']], 2.5, ['q . k = 2 + 2 + 0 + 1 = 5', '5 / 2 = 2.5'], { verify: '5/Math.sqrt(4)', dp: 1 }),
          D.num('Two scores are [2, 0]. Apply softmax and enter the weight of the FIRST position.', [['scores', '2, 0'], ['e^2', '7.389'], ['e^0', '1']], 0.8808, ['7.389 / (7.389 + 1) = 0.881'], { verify: 'Math.exp(2)/(Math.exp(2)+1)', dp: 3 }),
          D.num('Weights [0.75, 0.25] and scalar values [4, 8]. Calculate the attention output.', [['weights', '0.75, 0.25'], ['values', '4, 8']], 5, ['0.75 x 4 + 0.25 x 8 = 3 + 2 = 5'], { verify: '0.75*4+0.25*8' }),
          D.num('In the worked example the scaled scores are [0.707, 0, 0.707]. Calculate the weight of the FIRST position after softmax.', [['e^0.707', '2.028'], ['e^0', '1'], ['sum', '2.028 + 1 + 2.028 = 5.056']], 0.4011, ['2.028 / 5.056 = 0.401'], { verify: 'Math.exp(0.70711)/(2*Math.exp(0.70711)+1)', dp: 3 }),
          D.num('A sequence has 6 tokens. How many attention scores does self-attention compute (one per query-key pair)?', [['tokens', '6']], 36, ['each of 6 queries scores 6 keys', '6 x 6 = 36'], { verify: '6*6' }),
          D.num('Keys have dimension d = 64. By what number are the scores divided?', [['d', '64']], 8, ['sqrt(64) = 8'], { verify: 'Math.sqrt(64)' }),
          D.mc('Why does the scaling by sqrt(d) help?', ['It makes the output integers', 'It keeps scores moderate so the softmax does not saturate', 'It removes the need for keys', 'It speeds up the GPU'], 1, 'Saturated softmax gives tiny gradients.'),
          D.mc('What is multi-head attention?', ['One attention with a huge d', 'Several attentions with different learned projections run in parallel', 'Attention over images only', 'A loss function'], 1, 'Each head can specialise in a different pattern.')
        ]
      },

      /* ===================================================== L17 */
      {
        id: 'llm', title: 'Language models and tokens', icon: 'chat', minutes: '30-35 min',
        blurb: 'How a stack of the pieces you already know learns to write: tokens, next-word prediction, sampling and perplexity.',
        theory: [
          D.page('From text to tokens',
            D.p('A language model does not read letters or whole words. It reads **tokens**: chunks of text from a fixed vocabulary of typically 30,000 to 200,000 pieces. Frequent words are single tokens ("the"), rare words are split into reusable parts ("un" + "believ" + "able"), and any text can be encoded because single characters are always in the vocabulary.'),
            D.p('Why subwords? Whole-word vocabularies would be enormous and fail on new words. Character-level models face sequences that are far too long. Subwords are the compromise. Each token has an integer id, which indexes the embedding table from the previous lessons.'),
            D.steps(['Split', 'Text is cut into tokens by a tokeniser trained on a text corpus.'], ['Map to ids', '"hello world" might become [15496, 995].'], ['Embed', 'Each id selects a row of the embedding table.']),
            D.note('info', 'Roughly 1 token is 0.75 English words, so 3,000 words are about 4,000 tokens. Context-window sizes are measured in tokens.')),
          D.page('The one task: predict the next token',
            D.p('A language model is trained on a single, very simple task. Given the tokens so far, output a **probability for every token in the vocabulary** being the next one. For "The cat sat on the" the model may say: "mat" 0.40, "floor" 0.20, "sofa" 0.10, and tiny values for the other 50,000 tokens.'),
            D.p('Where do the labels come from? From the text itself. Every position in every document is a training example whose label is simply the token that actually came next. No human labelling needed, which is why enormous datasets are possible.'),
            D.formula('L = -@f{1}{n} @sum_{t=1}^{n} ln P(token_t | token_1 ... token_{t-1})', [['P(token_t | ...)', 'probability the model gave to the actual next token'], ['n', 'number of positions']]),
            D.p('This is exactly the categorical cross-entropy from the loss lesson, averaged over positions. To lower it the model must learn grammar, facts, style, even some reasoning, because all of those help predict the next token.')),
          D.page('Inside a Transformer language model',
            D.p('You now know every ingredient. The model is a repeated stack.'),
            D.steps(['Embed', 'Token ids become vectors, plus a position signal so order is known.'], ['Attention block (x N layers)', 'Causal self-attention lets each position gather information from earlier positions.'], ['Feed-forward block', 'A small two-layer network with a ReLU-like activation processes each position separately.'], ['Residual connections and normalisation', 'Each block adds its output to its input, which keeps gradients healthy.'], ['Output layer', 'A matrix maps the final vector to one score per vocabulary token (the logits).'], ['Softmax', 'Scores become the next-token probability distribution.']),
            D.p('Training is the loop from Unit 1 run on trillions of tokens: forward pass, cross-entropy, backpropagation, an Adam-style gradient step. Model size is just how many layers, how wide, and how large the vocabulary: billions of parameters, same arithmetic.')),
          D.page('Generating text',
            D.p('Generation is a loop that feeds the model its own output. This is called **autoregressive** generation.'),
            D.steps(['Encode the prompt', 'Turn the prompt into token ids.'], ['Forward pass', 'Get the probability distribution for the next token.'], ['Choose a token', 'Pick one using a sampling rule (below).'], ['Append', 'Add the chosen token to the sequence.'], ['Repeat', 'Until an end token or a length limit.']),
            D.table(['Sampling rule', 'How it chooses', 'Effect'], [['Greedy', 'always the most likely token', 'repetitive but safe'], ['Temperature T', 'softmax(logits / T), then sample', 'T low: focused. T high: adventurous'], ['Top-k', 'keep the k most likely, renormalise, sample', 'cuts off the unlikely tail'], ['Top-p', 'keep the smallest set with total probability p', 'adaptive cutoff']]),
            D.p('How to sample: draw a random number r in [0, 1). Walk through the tokens adding up probabilities; the first token where the running total passes r is your pick. With probabilities [0.5, 0.3, 0.2] and r = 0.7 the running totals are 0.5, 0.8: the second token wins.')),
          D.page('Perplexity: how surprised is the model',
            D.p('To compare language models you need a single number. Take the average loss per token (the cross-entropy) and exponentiate it. The result is the **perplexity**.'),
            D.formula('perplexity = e^{L}', [['L', 'average cross-entropy per token']]),
            D.p('Intuition: a perplexity of 7.4 means the model is, on average, as uncertain as if it had to choose uniformly among about 7.4 equally likely tokens. Lower is better. A model that spreads probability evenly over 4 options at every step has loss ln 4 = 1.386 and perplexity exactly 4. The example loss 2.0 gives e^2 = 7.39.'),
            D.note('tip', 'Perplexity is a training-time measure of next-token prediction quality. It does not tell you whether answers are true or helpful, which needs separate evaluation.')),
          D.page('What to remember, and where to go next',
            D.list('**A language model is a probability distribution over the next token.** Everything else (chat, code, translation) is built on that.', '**Fluency is not truth.** The model is trained to produce plausible continuations, so it can state falsehoods confidently ("hallucination"). Retrieval and careful evaluation help.', '**After pre-training** models are usually fine-tuned on curated examples and on human or AI feedback so they follow instructions and behave safely.', '**Limits to know**: finite context window, sensitivity to prompt wording, no memory between conversations unless a system provides it.'),
            D.p('You have walked from a line with two knobs to the structure of a modern language model. Natural next steps: implement these pieces in Python with NumPy, then PyTorch; train a tiny character-level model on a text file; read the original Transformer paper again, this time with every symbol familiar.'),
            D.cmp('double Perplexity(double[] pCorrect)\n{\n    double loss = 0;\n    foreach (var p in pCorrect) loss += -Math.Log(p);\n    return Math.Exp(loss / pCorrect.Length);\n}', 'import math\n\ndef perplexity(p_correct):\n    loss = sum(-math.log(p) for p in p_correct)\n    return math.exp(loss / len(p_correct))'),
            D.note('cs', 'Same calculation in both languages. Natural log in C# is `Math.Log`, in Python `math.log`.'))
        ],
        practice: [
          D.mc('What does a language model output at each step?', ['One word', 'A probability for every token in the vocabulary', 'A full sentence', 'A single yes or no'], 1, 'Generation picks from this distribution.'),
          D.order('Order the generation loop.', ['Encode the prompt into tokens', 'Run a forward pass to get next-token probabilities', 'Sample one token', 'Append it and repeat'], 'The model feeds on its own output.'),
          D.match('Match each sampling rule with its behaviour.', [['Greedy', 'always picks the most likely token'], ['Low temperature', 'sharper, more focused distribution'], ['High temperature', 'flatter, more random distribution'], ['Top-k', 'keeps only the k most likely tokens']]),
          D.mc('Where do the training labels of a language model come from?', ['Human annotators for every sentence', 'The text itself: the next token is the label', 'A separate dictionary', 'Random numbers'], 1, 'That is why huge unlabelled corpora are usable.'),
          D.num('The model gave the correct next token probability 0.5. What is the cross-entropy loss for that position?', [['p', '0.5'], ['formula', '-ln(p)']], 0.6931, ['-ln(0.5) = ln(2) = 0.693'], { verify: '-Math.log(0.5)', dp: 3 }),
          D.multi('Which statements are true about language models?', ['They are trained with cross-entropy on next-token prediction', 'They can state false things fluently', 'Perplexity measures factual accuracy', 'Tokens are often pieces of words'], [0, 1, 3], 'Perplexity measures next-token uncertainty, not truth.')
        ],
        code: [
          {
            title: 'Softmax with temperature', fn: 'softmaxT',
            task: [D.p('Write `softmaxT(logits, T)`: divide the logits by `T`, then apply a numerically safe softmax (subtract the max).')],
            starter: 'function softmaxT(logits, T) {\n  \n}\n',
            tests: [{ args: [[2, 1], 1], expect: [0.73106, 0.26894], tol: 0.0001 }, { args: [[2, 1], 2], expect: [0.62246, 0.37754], tol: 0.0001 }, { args: [[2, 1], 0.5], expect: [0.88080, 0.11920], tol: 0.0001 }, { args: [[0, 0, 0], 3], expect: [0.33333, 0.33333, 0.33333], tol: 0.0001, hidden: true }],
            hints: ['First scale: const z = logits.map(v => v / T);', 'Then the same softmax you wrote earlier: subtract max, exp, divide by the sum.'],
            solution: 'function softmaxT(logits, T) {\n  const z = logits.map(v => v / T);\n  const m = Math.max(...z);\n  const e = z.map(v => Math.exp(v - m));\n  const s = e.reduce((a, c) => a + c, 0);\n  return e.map(v => v / s);\n}\n',
            explain: 'This single parameter is the "creativity" slider in many chat applications.'
          },
          {
            title: 'Sample a token', fn: 'sampleIndex',
            task: [D.p('Write `sampleIndex(probs, r)` that returns the index chosen by walking the cumulative sum of `probs` until it exceeds `r` (a number in `[0, 1)`).')],
            starter: 'function sampleIndex(probs, r) {\n  let total = 0;\n  // add probabilities until the running total passes r\n  return probs.length - 1;\n}\n',
            tests: [{ args: [[0.5, 0.3, 0.2], 0.7], expect: 1 }, { args: [[0.5, 0.3, 0.2], 0.1], expect: 0 }, { args: [[0.5, 0.3, 0.2], 0.95], expect: 2 }, { args: [[0.1, 0.1, 0.8], 0.15], expect: 1, hidden: true }],
            hints: ['Loop over i, do total += probs[i].', 'if (r < total) return i;'],
            solution: 'function sampleIndex(probs, r) {\n  let total = 0;\n  for (let i = 0; i < probs.length; i++) {\n    total += probs[i];\n    if (r < total) return i;\n  }\n  return probs.length - 1;\n}\n',
            explain: 'In production r comes from a random number generator. Passing it in makes the function testable.'
          },
          {
            title: 'Perplexity', fn: 'perplexity',
            task: [D.p('Write `perplexity(pCorrect)`: the probabilities the model gave to the correct tokens. Average the values `-ln(p)` to get the loss, return `e^loss`.')],
            starter: 'function perplexity(pCorrect) {\n  \n}\n',
            tests: [{ args: [[0.25, 0.25, 0.25]], expect: 4, tol: 0.0001 }, { args: [[1, 1]], expect: 1, tol: 0.0001 }, { args: [[0.5, 0.125]], expect: 4, tol: 0.0001 }, { args: [[0.1]], expect: 10, tol: 0.0001, hidden: true }],
            hints: ['Sum -Math.log(p) in a loop and divide by the length.', 'return Math.exp(loss / pCorrect.length);'],
            solution: 'function perplexity(pCorrect) {\n  let loss = 0;\n  for (const p of pCorrect) loss += -Math.log(p);\n  return Math.exp(loss / pCorrect.length);\n}\n',
            explain: 'The third test: probabilities 0.5 and 0.125 give an average of 2 bits of surprise, which means perplexity 4.'
          }
        ],
        quiz: [
          D.num('The model gave the correct token probability 0.5. Calculate the loss -ln(p).', [['p', '0.5']], 0.6931, ['-ln(0.5) = 0.693'], { verify: '-Math.log(0.5)', dp: 3 }),
          D.num('The average cross-entropy of a model is 2.0 nats per token. Calculate the perplexity e^L.', [['L', '2.0'], ['e', '2.71828']], 7.39, ['e^2 = 7.389'], { verify: 'Math.exp(2)', dp: 2 }),
          D.num('A model spreads probability evenly over 4 options at every step. What is its perplexity?', [['probability of the correct token', '0.25 at every step']], 4, ['loss = -ln(0.25) = ln 4', 'perplexity = e^(ln 4) = 4'], { verify: 'Math.exp(-Math.log(0.25))' }),
          D.num('Logits are [2, 1]. Apply temperature T = 0.5 (divide the logits by T, then softmax). Calculate the probability of the first token.', [['logits / T', '[4, 2]'], ['e^4', '54.60'], ['e^2', '7.389']], 0.8808, ['54.60 / (54.60 + 7.389) = 0.881'], { verify: 'Math.exp(4)/(Math.exp(4)+Math.exp(2))', dp: 3 }),
          D.num('Probabilities are [0.5, 0.3, 0.2] and the random number is r = 0.7. Which index (counting from 0) is sampled?', [['probabilities', '0.5, 0.3, 0.2'], ['r', '0.7'], ['rule', 'first index where the running total exceeds r']], 1, ['running totals: 0.5, 0.8, 1.0', '0.7 < 0.8 first happens at index 1'], { verify: '1' }),
          D.num('Top-k sampling with k = 2 on probabilities [0.5, 0.3, 0.1, 0.05, 0.05]. After keeping the top 2 and renormalising, what is the probability of the first token?', [['kept', '0.5 and 0.3'], ['sum', '0.8']], 0.625, ['0.5 / (0.5 + 0.3) = 0.625'], { verify: '0.5/0.8', dp: 3 }),
          D.num('A prompt is 3,000 words long. At about 0.75 words per token, how many tokens is that?', [['words', '3000'], ['words per token', '0.75']], 4000, ['3000 / 0.75 = 4000'], { verify: '3000/0.75' }),
          D.mc('A model produces a confident but false statement. What best explains this?', ['It was trained to produce plausible continuations, not verified facts', 'Its perplexity was zero', 'The temperature was exactly 1', 'Tokens cannot represent facts'], 0, 'Fluency and truth are different objectives.')
        ]
      }
    ]
  });
})();
