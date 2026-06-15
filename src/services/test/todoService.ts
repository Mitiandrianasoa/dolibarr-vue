import axios from "axios";

export type Todo = {
  id: number;
  title: string;
  completed: boolean;
  time: number;
};

const BASE_URL = "/api/todos";

export async function getTodos(): Promise<Todo[]> {
  const response = await axios.get<Todo[]>(BASE_URL);
  return response.data;
}

export async function createTodo(todo: Omit<Todo, "id">): Promise<Todo> {
  const response = await axios.post<Todo>(BASE_URL, todo);
  return response.data;
}

export async function updateTodo(id: number, todo: Partial<Todo>): Promise<Todo> {
  const response = await axios.put<Todo>(`${BASE_URL}/${id}`, todo);
  return response.data;
}

export async function deleteTodo(id: number): Promise<void> {
  await axios.delete(`${BASE_URL}/${id}`);
}
