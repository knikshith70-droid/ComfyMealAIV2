# ComfyMeal AI

ComfyMeal AI is an AI-powered, pantry-first meal planning app. It helps people decide what to cook by generating personalized recipes and meal plans based on available ingredients, dietary preferences, household needs, budget, and cooking time.

## Features

- Personalized AI recipe generation
- Meal plans from one day up to one month
- Pantry, spices, and condiment inventory
- Grocery receipt scanning with OCR
- Estimated nutrition information and history
- Recipe adjustments and cooking guidance
- Saved recipes and recent recipe history
- Google sign-in and email OTP authentication
- Multilingual interface
- Voice-based ingredient entry

## Tech Stack

- React, TypeScript, and Vite
- Supabase (authentication, PostgreSQL, and Edge Functions)
- Groq API for AI-powered generation
- Tesseract.js for receipt OCR
- Tailwind CSS and Lucide icons

## Getting Started

### Requirements

- Node.js and npm
- A Supabase project
- The API credentials required by the configured Supabase Edge Functions

### Install and run locally

```bash
git clone https://github.com/knikshith70-droid/ComfyMealAIV2.git
cd ComfyMealAIV2
npm install
npm run dev
```

### Environment variables

Create a `.env` file in the project root and configure the Supabase variables used by the app:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Configure any AI-provider and email-service secrets in the appropriate Supabase Edge Function environment settings. **Do not commit real API keys, service-role keys, or other secrets to GitHub.**

### Useful commands

```bash
npm run dev       # Start the development server
npm run build     # Create a production build
npm run preview   # Preview the production build
npm run lint      # Run ESLint
npm run typecheck # Check TypeScript types
```

## Deployment

Deploy the frontend to a Vite-compatible host and configure the required environment variables there. Deploy the Supabase migrations and Edge Functions to your own Supabase project before using the app in production.

## Live Demo

https://comfymeal-ai-meal-pl-5br9.bolt.host/

## License

No license has been specified yet. Contact the project owner before redistributing or reusing the code.
