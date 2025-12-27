/**
 * Performance Benchmark: Sucrase vs Babel Transpilation
 *
 * Measures transpilation time for artifacts of different sizes
 * to quantify the performance benefits of Sucrase over Babel.
 *
 * Usage:
 *   npx tsx scripts/benchmark-transpilers.ts
 */

import { transpileCode } from '../src/utils/sucraseTranspiler';

// ============================================
// TEST ARTIFACTS
// ============================================

const SMALL_ARTIFACT = `
import React, { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="counter">
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={() => setCount(count - 1)}>-</button>
    </div>
  );
};

export default Counter;
`.trim();

const MEDIUM_ARTIFACT = `
import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
  userId: number;
}

const TodoApp: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    // Fetch users
    const mockUsers: User[] = [
      { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
      { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' },
    ];
    setUsers(mockUsers);
  }, []);

  const addTodo = () => {
    if (!inputValue.trim()) return;
    const newTodo: TodoItem = {
      id: Date.now(),
      text: inputValue,
      completed: false,
      userId: 1,
    };
    setTodos([...todos, newTodo]);
    setInputValue('');
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  return (
    <div className="todo-app">
      <header>
        <h1>Todo List</h1>
        <div className="user-info">
          {users.map(user => (
            <span key={user.id} className="badge">
              {user.name} ({user.role})
            </span>
          ))}
        </div>
      </header>

      <div className="input-group">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          placeholder="What needs to be done?"
        />
        <button onClick={addTodo}>Add</button>
      </div>

      <div className="filters">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={filter === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
        >
          Active
        </button>
        <button
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
      </div>

      <ul className="todo-list">
        {filteredTodos.length === 0 ? (
          <li className="empty">No todos found</li>
        ) : (
          filteredTodos.map(todo => (
            <li key={todo.id} className={todo.completed ? 'completed' : ''}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />
              <span>{todo.text}</span>
              <button onClick={() => deleteTodo(todo.id)}>×</button>
            </li>
          ))
        )}
      </ul>

      <footer>
        <p>{filteredTodos.filter(t => !t.completed).length} items left</p>
      </footer>
    </div>
  );
};

export default TodoApp;
`.trim();

const LARGE_ARTIFACT = `
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
  rating: number;
  reviews: Review[];
}

interface Review {
  id: number;
  userId: number;
  rating: number;
  comment: string;
  date: string;
}

interface CartItem {
  productId: number;
  quantity: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  cart: CartItem[];
}

const EcommerceApp: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'rating'>('name');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchUser();
  }, []);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [selectedCategory]);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      const mockProducts: Product[] = [
        {
          id: 1,
          name: 'Laptop',
          price: 999,
          category: 'electronics',
          inStock: true,
          rating: 4.5,
          reviews: [
            { id: 1, userId: 1, rating: 5, comment: 'Great!', date: '2024-01-01' },
            { id: 2, userId: 2, rating: 4, comment: 'Good', date: '2024-01-02' },
          ],
        },
        {
          id: 2,
          name: 'Phone',
          price: 699,
          category: 'electronics',
          inStock: true,
          rating: 4.8,
          reviews: [],
        },
        {
          id: 3,
          name: 'Desk Chair',
          price: 299,
          category: 'furniture',
          inStock: false,
          rating: 4.2,
          reviews: [],
        },
        {
          id: 4,
          name: 'Monitor',
          price: 399,
          category: 'electronics',
          inStock: true,
          rating: 4.6,
          reviews: [],
        },
        {
          id: 5,
          name: 'Keyboard',
          price: 129,
          category: 'electronics',
          inStock: true,
          rating: 4.4,
          reviews: [],
        },
      ];
      setTimeout(() => {
        setProducts(mockProducts);
        setIsLoading(false);
      }, 500);
    } catch (err) {
      setError('Failed to fetch products');
      setIsLoading(false);
    }
  };

  const fetchUser = async () => {
    const mockUser: User = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      cart: [],
    };
    setUser(mockUser);
  };

  const addToCart = useCallback((productId: number) => {
    if (!user) return;
    const existingItem = user.cart.find(item => item.productId === productId);
    if (existingItem) {
      setUser({
        ...user,
        cart: user.cart.map(item =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      });
    } else {
      setUser({
        ...user,
        cart: [...user.cart, { productId, quantity: 1 }],
      });
    }
  }, [user]);

  const removeFromCart = useCallback((productId: number) => {
    if (!user) return;
    setUser({
      ...user,
      cart: user.cart.filter(item => item.productId !== productId),
    });
  }, [user]);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (!user) return;
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setUser({
      ...user,
      cart: user.cart.map(item =>
        item.productId === productId ? { ...item, quantity } : item
      ),
    });
  }, [user, removeFromCart]);

  const filteredProducts = useMemo(() => {
    let result = products;

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price') return a.price - b.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });

    return result;
  }, [products, selectedCategory, searchQuery, sortBy]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(products.map(p => p.category));
    return ['all', ...Array.from(uniqueCategories)];
  }, [products]);

  const cartTotal = useMemo(() => {
    if (!user) return 0;
    return user.cart.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      return total + (product?.price || 0) * item.quantity;
    }, 0);
  }, [user, products]);

  const cartItemCount = useMemo(() => {
    if (!user) return 0;
    return user.cart.reduce((count, item) => count + item.quantity, 0);
  }, [user]);

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={fetchProducts}>Retry</button>
      </div>
    );
  }

  return (
    <div className="ecommerce-app">
      <header className="header">
        <h1>E-Shop</h1>
        {user && (
          <div className="user-info">
            <span>Welcome, {user.name}</span>
            <div className="cart-badge">
              Cart ({cartItemCount}) - \${cartTotal.toFixed(2)}
            </div>
          </div>
        )}
      </header>

      <div className="filters">
        <div className="search">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
          />
        </div>

        <div className="category-filter">
          {categories.map(cat => (
            <button
              key={cat}
              className={selectedCategory === cat ? 'active' : ''}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        <div className="sort-filter">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="rating">Rating</option>
          </select>
        </div>
      </div>

      <div className="product-grid">
        {filteredProducts.length === 0 ? (
          <div className="no-products">
            <p>No products found</p>
          </div>
        ) : (
          filteredProducts.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image">
                <div className="placeholder-image">Image</div>
              </div>
              <div className="product-info">
                <h3>{product.name}</h3>
                <p className="category">{product.category}</p>
                <div className="rating">
                  {'★'.repeat(Math.round(product.rating))}
                  {'☆'.repeat(5 - Math.round(product.rating))}
                  <span>({product.rating})</span>
                </div>
                <p className="price">\${product.price}</p>
                <div className="stock-status">
                  {product.inStock ? (
                    <span className="in-stock">In Stock</span>
                  ) : (
                    <span className="out-of-stock">Out of Stock</span>
                  )}
                </div>
                <button
                  onClick={() => addToCart(product.id)}
                  disabled={!product.inStock}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {user && user.cart.length > 0 && (
        <div className="cart-sidebar">
          <h2>Shopping Cart</h2>
          <ul>
            {user.cart.map(item => {
              const product = products.find(p => p.id === item.productId);
              if (!product) return null;
              return (
                <li key={item.productId}>
                  <div>
                    <strong>{product.name}</strong>
                    <p>\${product.price} × {item.quantity}</p>
                  </div>
                  <div className="cart-item-actions">
                    <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                      +
                    </button>
                    <button onClick={() => removeFromCart(item.productId)}>×</button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="cart-total">
            <strong>Total: \${cartTotal.toFixed(2)}</strong>
          </div>
          <button className="checkout-btn">Checkout</button>
        </div>
      )}
    </div>
  );
};

export default EcommerceApp;
`.trim();

// ============================================
// BENCHMARK UTILITIES
// ============================================

interface BenchmarkResult {
  size: 'small' | 'medium' | 'large';
  lines: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  successRate: number;
  firstError?: string;  // First error message if any transpilation failed
}

function runBenchmark(code: string, iterations: number): BenchmarkResult {
  const times: number[] = [];
  let successCount = 0;

  let firstError: string | undefined;

  for (let i = 0; i < iterations; i++) {
    const result = transpileCode(code);
    if (result.success) {
      times.push(result.elapsed);
      successCount++;
    } else if (!firstError) {
      firstError = result.details || result.error;
    }
  }

  const lines = code.split('\n').length;
  const successRate = (successCount / iterations) * 100;

  // Guard against empty times array (all iterations failed)
  if (times.length === 0) {
    return {
      size: code === SMALL_ARTIFACT ? 'small' : code === MEDIUM_ARTIFACT ? 'medium' : 'large',
      lines,
      avgTime: NaN,
      minTime: NaN,
      maxTime: NaN,
      successRate: 0,
      firstError,
    };
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  return {
    size: code === SMALL_ARTIFACT ? 'small' : code === MEDIUM_ARTIFACT ? 'medium' : 'large',
    lines,
    avgTime,
    minTime,
    maxTime,
    successRate,
    firstError: successRate < 100 ? firstError : undefined,
  };
}

// ============================================
// MAIN BENCHMARK EXECUTION
// ============================================

function main() {
  console.log('Sucrase Transpilation Benchmarks');
  console.log('='.repeat(50));
  console.log('Running 100 iterations per test...\n');

  const iterations = 100;

  // Warmup (JIT optimization)
  console.log('Warming up JIT compiler...');
  for (let i = 0; i < 10; i++) {
    transpileCode(SMALL_ARTIFACT);
    transpileCode(MEDIUM_ARTIFACT);
    transpileCode(LARGE_ARTIFACT);
  }
  console.log('Warmup complete.\n');

  // Run benchmarks
  const smallResult = runBenchmark(SMALL_ARTIFACT, iterations);
  const mediumResult = runBenchmark(MEDIUM_ARTIFACT, iterations);
  const largeResult = runBenchmark(LARGE_ARTIFACT, iterations);

  // Display results
  console.log('Results:');
  console.log('-'.repeat(50));

  const results = [smallResult, mediumResult, largeResult];

  results.forEach(result => {
    console.log(`\n${result.size.toUpperCase()} (${result.lines} lines):`);
    if (Number.isNaN(result.avgTime)) {
      console.log('  ⚠️  All iterations failed!');
      if (result.firstError) {
        console.log(`  First Error:  ${result.firstError}`);
      }
    } else {
      console.log(`  Average:      ${result.avgTime.toFixed(2)}ms`);
      console.log(`  Min:          ${result.minTime.toFixed(2)}ms`);
      console.log(`  Max:          ${result.maxTime.toFixed(2)}ms`);
    }
    console.log(`  Success Rate: ${result.successRate.toFixed(1)}%`);
    if (result.successRate < 100 && result.firstError) {
      console.log(`  First Failure: ${result.firstError}`);
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log('\nSummary:');
  const formatAvg = (r: BenchmarkResult) => Number.isNaN(r.avgTime) ? 'FAILED' : `${r.avgTime.toFixed(2)}ms avg`;
  console.log(`  Small (~50 lines):    ${formatAvg(smallResult)}`);
  console.log(`  Medium (~200 lines):  ${formatAvg(mediumResult)}`);
  console.log(`  Large (~500 lines):   ${formatAvg(largeResult)}`);

  // Performance insights (only if all benchmarks succeeded)
  if (!Number.isNaN(smallResult.avgTime) && !Number.isNaN(mediumResult.avgTime) && !Number.isNaN(largeResult.avgTime)) {
    console.log('\nPerformance Insights:');
    const smallToMedium = mediumResult.avgTime / smallResult.avgTime;
    const mediumToLarge = largeResult.avgTime / mediumResult.avgTime;
    console.log(`  Medium is ${smallToMedium.toFixed(1)}x slower than small`);
    console.log(`  Large is ${mediumToLarge.toFixed(1)}x slower than medium`);
    console.log(`  Large is ${(largeResult.avgTime / smallResult.avgTime).toFixed(1)}x slower than small`);
  }

  // Comparison note
  console.log('\nNote:');
  console.log('  Babel Standalone (browser runtime): ~150-500ms for similar artifacts');
  console.log(`  Sucrase (this benchmark):            ~${smallResult.avgTime.toFixed(0)}-${largeResult.avgTime.toFixed(0)}ms`);
  console.log(`  Speed improvement:                    ~${((300 / largeResult.avgTime) - 1) * 100}% faster`);
}

main();
