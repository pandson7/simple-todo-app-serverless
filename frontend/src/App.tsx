import React, { useState, useEffect } from 'react';
import './App.css';

interface Todo {
  id: string;
  description: string;
  status: 'pending' | 'completed';
  createdAt: string;
  updatedAt: string;
}

const API_BASE_URL = 'https://5t9czg7yy6.execute-api.us-east-1.amazonaws.com/prod';

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/todos`);
      if (response.ok) {
        const data = await response.json();
        setTodos(data);
      }
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: newTodo.trim() }),
      });

      if (response.ok) {
        const todo = await response.json();
        setTodos([...todos, todo]);
        setNewTodo('');
      }
    } catch (error) {
      console.error('Error creating todo:', error);
    }
  };

  const updateTodoStatus = async (id: string, status: 'pending' | 'completed') => {
    try {
      const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const updatedTodo = await response.json();
        setTodos(todos.map(todo => todo.id === id ? updatedTodo : todo));
      }
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTodos(todos.filter(todo => todo.id !== id));
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Simple TODO App</h1>
        
        <form onSubmit={createTodo} className="todo-form">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Enter a new task..."
            className="todo-input"
          />
          <button type="submit" className="add-button">Add Task</button>
        </form>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="todos-container">
            {todos.length === 0 ? (
              <p className="empty-message">No tasks yet. Add one above!</p>
            ) : (
              <ul className="todos-list">
                {todos.map((todo) => (
                  <li key={todo.id} className={`todo-item ${todo.status}`}>
                    <div className="todo-content">
                      <input
                        type="checkbox"
                        checked={todo.status === 'completed'}
                        onChange={(e) => 
                          updateTodoStatus(todo.id, e.target.checked ? 'completed' : 'pending')
                        }
                        className="todo-checkbox"
                      />
                      <span className="todo-description">{todo.description}</span>
                    </div>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;