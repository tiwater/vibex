import { NextApiRequest, NextApiResponse } from 'next';

interface User {
  id: number;
  name: string;
  email: string;
}

// Mock database
const users: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // TODO: Add pagination
    res.status(200).json(users);
  } else if (req.method === 'POST') {
    const { name, email } = req.body;

    // TODO: Add validation
    const newUser: User = {
      id: users.length + 1,
      name,
      email,
    };

    users.push(newUser);
    res.status(201).json(newUser);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
