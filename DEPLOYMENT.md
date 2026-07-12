# Deployment guide

## Frontend (Vercel)
1. Import the frontend folder into Vercel.
2. Set the environment variable:
   - VITE_API_BASE_URL=https://your-backend-url.onrender.com
3. Deploy.

## Backend (Render)
1. Create a new Render Web Service from the backend folder.
2. Set these environment variables in the Render dashboard:
   - MONGO_URI
   - JWT_SECRET
   - GEMINI_API_KEY
   - MONGO_DATABASE=mediflow_ai
   - CORS_ORIGINS=https://your-frontend-domain.vercel.app
3. Deploy.

## Demo data
Run:
- python seed_demo_data.py

This seeds admin, doctor, receptionist, patient, and sample department data.
