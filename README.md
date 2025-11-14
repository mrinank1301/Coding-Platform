# Coding Platform

A full-stack coding platform built with Next.js, Supabase, and Monaco Editor. Admins can create coding questions, and clients can solve them using an online code editor.

## Features

- **Authentication**: Sign up and login with role-based access (admin/client)
- **Admin Panel**: Create, edit, and delete coding questions with test cases
- **Client Panel**: View questions, code solutions, and submit code
- **Monaco Editor**: Full-featured code editor with syntax highlighting
- **Theme Support**: Light and dark theme for the editor
- **Multiple Languages**: Support for C, C++, Java, and Python
- **Test Case Execution**: Submit code and run against test cases

## Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Supabase** - Backend (Auth + Database)
- **Monaco Editor** - Code editor
- **Tailwind CSS** - Styling

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the SQL from `database/schema.sql`
3. Get your project URL and anon key from Settings > API
4. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Admin User

After creating your account, you need to manually update a user's role to 'admin' in Supabase:

1. Go to Supabase Dashboard > Authentication > Users
2. Find your user
3. Go to Database > Table Editor > profiles
4. Edit your profile and set `role` to `admin`

Alternatively, run this SQL in Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 4. Set Up Code Execution (Optional but Recommended)

The code execution is currently a placeholder. For production use, you need to integrate with a code execution service. See `app/api/submit/README.md` for details.

**Quick Setup with Judge0:**
1. Sign up at [judge0.com](https://judge0.com)
2. Add to `.env.local`:
   ```
   JUDGE0_API_KEY=your_judge0_api_key
   ```
3. Update `app/api/submit/route.ts` to use Judge0 API

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
platform/
├── app/
│   ├── admin/          # Admin panel for managing questions
│   ├── client/         # Client panel for coding
│   ├── login/          # Login page
│   ├── signup/         # Signup page
│   ├── api/
│   │   └── submit/     # API route for code submission
│   └── page.tsx        # Home page
├── components/
│   ├── AuthGuard.tsx   # Authentication wrapper
│   ├── CodeEditor.tsx  # Monaco editor component
│   └── LogoutButton.tsx
├── lib/
│   └── supabase.ts     # Supabase client and types
└── database/
    └── schema.sql      # Database schema
```

## Usage

### As Admin

1. Sign up/login with an admin account
2. Go to Admin Panel
3. Click "Add Question" to create a new coding question
4. Fill in title, description, difficulty, and test cases
5. Test cases should have input and expected output
6. Mark test cases as "hidden" if they shouldn't be visible to users

### As Client

1. Sign up/login with a client account
2. Go to Client Panel
3. Select a question from the sidebar
4. Write your solution in the code editor
5. Choose your programming language (C, C++, Java, Python)
6. Toggle between light/dark theme
7. Click "Submit" to run your code against test cases
8. View submission results

## Database Schema

- **profiles**: User profiles with roles (admin/client)
- **questions**: Coding questions with test cases
- **submissions**: Code submissions with results

See `database/schema.sql` for the complete schema.

## Security Notes

- Row Level Security (RLS) is enabled on all tables
- Users can only view their own submissions
- Only admins can create/edit/delete questions
- Code execution should be done in a sandboxed environment

## Future Enhancements

- [ ] Real code execution integration (Judge0 or custom service)
- [ ] Code syntax validation
- [ ] Submission history view
- [ ] Leaderboard
- [ ] Time limits for questions
- [ ] Code templates per language
- [ ] More programming languages
- [ ] Code formatting/beautification

## License

MIT
