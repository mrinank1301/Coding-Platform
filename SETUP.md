# Quick Setup Guide

## Step 1: Install Dependencies

```bash
cd platform
npm install
```

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the project to be ready (takes ~2 minutes)
4. Go to **SQL Editor** in the left sidebar
5. Copy and paste the entire contents of `database/schema.sql`
6. Click **Run** to execute the SQL
7. Go to **Settings** > **API**
8. Copy your **Project URL** and **anon public** key

## Step 3: Configure Environment Variables

Create a file named `.env.local` in the `platform` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace the values with your actual Supabase credentials.

## Step 4: Create Your Admin Account

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Go to http://localhost:3000
3. Click **Sign Up** and create an account
4. After signing up, go to your Supabase dashboard
5. Navigate to **Database** > **Table Editor** > **profiles**
6. Find your user (by email)
7. Click on the row to edit
8. Change the `role` field from `client` to `admin`
9. Save the changes
   
**OR** run this SQL in Supabase SQL Editor:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Step 5: Test the Platform

1. **As Admin:**
   - Login with your admin account
   - Go to Admin Panel
   - Create a test question with test cases
   - Example test case:
     - Input: `5 10`
     - Expected Output: `15`
     - (For a simple addition problem)

2. **As Client:**
   - Logout and create a new account (or use a different browser)
   - Login with the client account
   - Go to Client Panel
   - Select the question you created
   - Write code and submit

## Step 6: Set Up Code Execution (Optional)

Currently, code execution is a placeholder. To enable real code execution:

1. Sign up for [Judge0 API](https://judge0.com) (free tier available)
2. Get your API key
3. Add to `.env.local`:
   ```
   JUDGE0_API_KEY=your-judge0-api-key
   ```
4. Update `app/api/submit/route.ts` to integrate with Judge0

See `app/api/submit/README.md` for detailed integration instructions.

## Troubleshooting

### "Invalid API key" error
- Make sure your `.env.local` file is in the `platform` directory
- Restart the dev server after creating/updating `.env.local`
- Check that there are no extra spaces in your environment variables

### "Row Level Security" errors
- Make sure you ran the `schema.sql` file completely
- Check that RLS policies were created successfully

### Can't access admin panel
- Verify your user role is set to `admin` in the profiles table
- Try logging out and logging back in

### Monaco Editor not loading
- Clear your browser cache
- Check browser console for errors
- Make sure all dependencies are installed: `npm install`

## Next Steps

- Read the full `README.md` for more details
- Customize the UI and styling
- Add more features like leaderboards, submission history, etc.
- Set up code execution service for production use

